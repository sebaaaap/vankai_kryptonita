from sqlalchemy.orm import Session
from app.models.base import Product, Purchase, PurchaseItem, PurchaseState, MovementType, InventoryMovement, InventoryMovementItem
from app.schemas.purchases import PurchaseCreate, PurchaseUpdate
from app.schemas.inventory import InventoryMovementCreate, InventoryMovementItemCreate
from app.services.inventory_service import InventoryService
from fastapi import HTTPException

class PurchaseService:
    def __init__(self, db: Session):
        self.db = db
        self.inventory_service = InventoryService(db)

    def create_purchase(self, data: PurchaseCreate) -> Purchase:
        """
        Crea una compra en estado BORRADOR (similar a Odoo).
        No afecta el stock hasta que se confirme.
        """
        # Validar que haya items
        if not data.items or len(data.items) == 0:
            raise HTTPException(status_code=400, detail="La compra debe tener al menos un producto")
        
        # Validar proveedor si viene
        if data.supplier_id:
            from app.models.base import Supplier
            supplier = self.db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
            if not supplier:
                raise HTTPException(status_code=404, detail=f"Proveedor {data.supplier_id} no encontrado")
        
        # Crear registro de compra en BORRADOR
        purchase = Purchase(
            supplier_id=data.supplier_id,
            invoice_number=data.invoice_number,
            notes=data.notes,
            subtotal_net=0,
            tax_amount=0,
            total_cost=0,
            state=PurchaseState.DRAFT
        )
        self.db.add(purchase)
        self.db.flush()

        calculated_net = 0.0

        # Crear items de compra
        for item in data.items:
            # Validar producto
            product = self.db.query(Product).filter(Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
            
            # Validar cantidad
            if item.quantity <= 0:
                raise HTTPException(status_code=400, detail=f"La cantidad debe ser mayor a 0")
            
            # Validar costo
            if item.unit_cost < 0:
                raise HTTPException(status_code=400, detail=f"El costo unitario no puede ser negativo")

            subtotal = item.quantity * item.unit_cost
            
            purchase_item = PurchaseItem(
                purchase_id=purchase.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_cost=item.unit_cost
            )
            self.db.add(purchase_item)
            calculated_net += subtotal

        purchase.subtotal_net = calculated_net
        purchase.tax_amount = calculated_net * 0.19 # IVA 19% Chile
        purchase.total_cost = purchase.subtotal_net + purchase.tax_amount
        
        try:
            self.db.commit()
            self.db.refresh(purchase)
            return purchase
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al crear la compra: {str(e)}")

    def confirm_purchase(self, purchase_id: int) -> Purchase:
        """
        Confirma una compra (similar a Odoo):
        1. Cambia el estado a CONFIRMADO
        2. Actualiza el costo de los productos
        3. Genera movimiento de inventario (entrada)
        4. Incrementa el stock
        """
        purchase = self.db.query(Purchase).filter(Purchase.id == purchase_id).first()
        if not purchase:
            raise HTTPException(status_code=404, detail="Compra no encontrada")
        
        if purchase.state != PurchaseState.DRAFT:
            raise HTTPException(
                status_code=400, 
                detail=f"Solo se pueden confirmar compras en estado borrador. Estado actual: {purchase.state.value}"
            )
        
        # Preparar items para movimiento de inventario
        inventory_items = []
        
        for item in purchase.items:
            product = self.db.query(Product).filter(Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
            
            # Actualizar costo del producto (último costo de compra)
            product.cost = item.unit_cost
            
            # Preparar item para movimiento de inventario
            inventory_items.append(InventoryMovementItemCreate(
                product_id=product.id,
                quantity=item.quantity
            ))
        
        # Cambiar estado a CONFIRMADO
        purchase.state = PurchaseState.CONFIRMED
        
        try:
            # Generar movimiento de inventario (IN_PURCHASE) directamente aquí para mantener la transacción
            mov_type = MovementType.IN_PURCHASE
            movement = InventoryMovement(
                type=mov_type,
                reason=f"Compra #{purchase.id}" + (f" - Factura: {purchase.invoice_number}" if purchase.invoice_number else "")
            )
            self.db.add(movement)
            self.db.flush()

            for item in purchase.items:
                product = self.db.query(Product).filter(Product.id == item.product_id).first()
                if product:
                    # Capturar stock antes para trazabilidad
                    stock_before = product.stock_quantity
                    
                    # Incrementar stock
                    product.stock_quantity += item.quantity
                    # Actualizar costo (último costo de adquisición)
                    product.cost = item.unit_cost
                    
                    # Registrar item de movimiento
                    inv_item = InventoryMovementItem(
                        movement_id=movement.id,
                        product_id=product.id,
                        quantity=item.quantity,
                        stock_before=stock_before,
                        stock_after=product.stock_quantity
                    )
                    self.db.add(inv_item)

            self.db.commit()
            self.db.refresh(purchase)
            return purchase
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al confirmar la compra: {str(e)}")

    def cancel_purchase(self, purchase_id: int) -> Purchase:
        """
        Cancela una compra (solo si está en borrador)
        """
        purchase = self.db.query(Purchase).filter(Purchase.id == purchase_id).first()
        if not purchase:
            raise HTTPException(status_code=404, detail="Compra no encontrada")
        
        if purchase.state == PurchaseState.CONFIRMED:
            raise HTTPException(
                status_code=400, 
                detail="No se puede cancelar una compra confirmada. Debe crear una devolución."
            )
        
        if purchase.state == PurchaseState.CANCELLED:
            raise HTTPException(status_code=400, detail="La compra ya está cancelada")
        
        purchase.state = PurchaseState.CANCELLED
        
        try:
            self.db.commit()
            self.db.refresh(purchase)
            return purchase
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al cancelar la compra: {str(e)}")

    def get_purchase(self, purchase_id: int) -> Purchase:
        """
        Obtiene una compra por ID con todos sus detalles
        """
        purchase = self.db.query(Purchase).filter(Purchase.id == purchase_id).first()
        if not purchase:
            raise HTTPException(status_code=404, detail="Compra no encontrada")
        return purchase

    def list_purchases(self, state: str = None) -> list[Purchase]:
        """
        Lista todas las compras, opcionalmente filtradas por estado
        """
        query = self.db.query(Purchase)
        
        if state:
            try:
                state_enum = PurchaseState[state.upper()]
                query = query.filter(Purchase.state == state_enum)
            except KeyError:
                raise HTTPException(status_code=400, detail=f"Estado inválido: {state}")
        
        return query.order_by(Purchase.date_created.desc()).all()

    def update_purchase(self, purchase_id: int, data: PurchaseUpdate) -> Purchase:
        """
        Actualiza una compra (solo si está en borrador)
        """
        purchase = self.db.query(Purchase).filter(Purchase.id == purchase_id).first()
        if not purchase:
            raise HTTPException(status_code=404, detail="Compra no encontrada")
        
        if purchase.state != PurchaseState.DRAFT:
            raise HTTPException(
                status_code=400, 
                detail="Solo se pueden editar compras en estado borrador"
            )
        
        # Actualizar campos
        if data.supplier_id is not None:
            if data.supplier_id:
                from app.models.base import Supplier
                supplier = self.db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
                if not supplier:
                    raise HTTPException(status_code=404, detail=f"Proveedor {data.supplier_id} no encontrado")
            purchase.supplier_id = data.supplier_id
        
        if data.invoice_number is not None:
            purchase.invoice_number = data.invoice_number
        
        if data.notes is not None:
            purchase.notes = data.notes
        
        try:
            self.db.commit()
            self.db.refresh(purchase)
            return purchase
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al actualizar la compra: {str(e)}")
