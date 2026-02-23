"""
Servicio de POS - Lógica de Negocio
Implementa el flujo de Odoo: DRAFT -> VALIDATED -> PAID
Con transacciones atómicas para integridad de datos
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from typing import List, Optional, Union
from fastapi import HTTPException
from decimal import Decimal
from app.core.utils import round_decimal

from app.models.base import (
    Ticket, SaleItem, Payment, Product, CashSession, 
    InventoryMovement, InventoryMovementItem,
    SaleState, PaymentMethod, MovementType, RefundReason, StorageLocation
)
from app.schemas.pos import (
    SaleCreate, SaleResponse, SaleItemCreate, PaymentCreate,
    RefundCreate, RefundResponse, QuickSaleCreate
)

class POSService:
    """Servicio de Punto de Venta con lógica transaccional"""
    
    @staticmethod
    def generate_ticket_number(db: Session, prefix: str = "T") -> str:
        """Genera número de ticket único: T-2026-0001 o NC-2026-0001"""
        year = datetime.now().year
        last_ticket = db.query(Ticket).filter(
            Ticket.ticket_number.like(f"{prefix}-{year}-%")
        ).order_by(Ticket.ticket_number.desc()).first()
        
        if last_ticket:
            try:
                last_num = int(last_ticket.ticket_number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1
            
        return f"{prefix}-{year}-{new_num:04d}"
    
    @staticmethod
    def calculate_totals(items: List[SaleItemCreate]) -> tuple[Decimal, Decimal, Decimal]:
        """
        Calcula subtotal, IVA y total usando Decimal para precisión
        Returns: (subtotal, tax_amount, total)
        """
        subtotal = Decimal('0.00')
        for item in items:
            item_qty = Decimal(str(item.quantity))
            item_price = Decimal(str(item.price))
            item_disc = Decimal(str(item.discount_percent))
            
            item_subtotal = item_qty * item_price
            if item_disc > 0:
                item_subtotal *= (Decimal('1') - (item_disc / Decimal('100')))
            subtotal += item_subtotal
        
        # Redondear subtotal
        subtotal = round_decimal(subtotal)
        
        # IVA 19% adicional al precio (Neto + IVA)
        tax_amount = round_decimal(subtotal * Decimal('0.19'))
        total = round_decimal(subtotal + tax_amount)
        
        return (subtotal, tax_amount, total)
    
    @staticmethod
    def create_sale_draft(
        db: Session, 
        sale_data: Union[SaleCreate, QuickSaleCreate]
    ) -> Ticket:
        """
        Crea una venta en estado DRAFT
        NO afecta el inventario hasta que se valide
        Realiza asignación inteligente de stock entre ubicaciones.
        """
        # Convertir QuickSaleCreate a SaleCreate si es necesario
        if isinstance(sale_data, QuickSaleCreate):
            payments = [PaymentCreate(
                payment_method=sale_data.payment_method,
                amount=sale_data.total_amount
            )]
            sale_data = SaleCreate(
                items=sale_data.items,
                payments=payments,
                session_id=sale_data.session_id
            )
        
        # --- Lógica de Asignación de Stock (Smart Deduction) ---
        final_items_to_create = [] # Lista de (product_id, quantity, price, discount)
        
        for item in sale_data.items:
            # Buscar producto original para obtener barcode
            original_product = db.query(Product).filter(Product.id == item.product_id).first()
            if not original_product:
                raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
            
            # Buscar todas las instancias del producto (mismo barcode) con stock > 0
            # EXCLUYENDO la ubicación de "Pasillo Mermas" para que no sea vendible
            # Usamos outerjoin porque location_id puede ser NULL
            from sqlalchemy import or_
            candidates = db.query(Product).outerjoin(Product.location).filter(
                Product.barcode == original_product.barcode,
                Product.stock_quantity > 0,
                or_(StorageLocation.id == None, StorageLocation.name != "Pasillo Mermas")
            ).order_by(Product.stock_quantity.desc()).all()
            
            total_available = sum(p.stock_quantity for p in candidates)
            
            if total_available < item.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Stock insuficiente para {original_product.name}. Total disponible: {total_available}"
                )
            
            # Algoritmo de distribución (Greedy / Best Fit simplificado)
            qty_remaining = item.quantity
            
            for candidate in candidates:
                if qty_remaining <= 0:
                    break
                
                # Cuánto tomamos de este candidato
                take = min(candidate.stock_quantity, qty_remaining)
                
                final_items_to_create.append({
                    "product_id": candidate.id,
                    "quantity": take,
                    "price": item.price,
                    "discount_percent": item.discount_percent
                })
                
                qty_remaining -= take
            
            if qty_remaining > 0:
                 # Esto no debería pasar si validamos total_available antes, 
                 # a menos que haya condiciones de carrera muy agresivas, 
                 # pero asumimos transacción serializable o bloqueo no explícito aquí.
                 pass

        # Calcular totales (basado en items originales para mantener coherencia visual inicial, 
        # pero matemáticamente es igual a la suma de los desglosados)
        subtotal, tax_amount, total = POSService.calculate_totals(sale_data.items)
        
        # Validar que la suma de pagos sea coherente con el total
        total_payments = sum(p.amount for p in sale_data.payments)
        
        # Si hay una diferencia sospechosa (ej. el IVA), avisar
        if abs(total_payments - total) > Decimal('1.00'):
             print(f"ALERTA: Diferencia de montos. Recibido={total_payments}, Calculado={total}")
             # Si el total recibido es MENOR que el calculado, podría ser que el frontend mandó precios netos
             # Si el total recibido es IGUAL al calculado sin el tax_amount adicional, 
             # entonces el frontend ya mandó precios con IVA.
             # En ese caso, ajustamos el total para que la venta no falle.
             if abs(total_payments - subtotal) < Decimal('0.10'):
                  total = subtotal
                  tax_amount = Decimal('0.00') # Los precios ya traen el IVA
        
        if abs(total_payments - total) > Decimal('1.00'):
            raise HTTPException(
                status_code=400,
                detail=f"La suma de pagos ({total_payments}) no coincide con el total esperado ({total})"
            )
        
        # Crear ticket en DRAFT
        ticket = Ticket(
            ticket_number=POSService.generate_ticket_number(db),
            state=SaleState.DRAFT,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total,
            payment_method="MIXED" if len(sale_data.payments) > 1 else sale_data.payments[0].payment_method.value,
            session_id=sale_data.session_id
        )
        db.add(ticket)
        db.flush()  # Para obtener el ID
        
        # Crear items (Usando la lista desglozada)
        for item_data in final_items_to_create:
            item_subtotal = item_data["quantity"] * item_data["price"]
            if item_data["discount_percent"] > 0:
                item_subtotal *= (1 - item_data["discount_percent"] / 100)
            
            sale_item = SaleItem(
                ticket_id=ticket.id,
                product_id=item_data["product_id"], # ID de la ubicación específica
                quantity=item_data["quantity"],
                unit_price=item_data["price"],
                discount_percent=item_data["discount_percent"],
                subtotal=item_subtotal
            )
            db.add(sale_item)
        
        # Crear pagos
        for payment_data in sale_data.payments:
            # Mapeo seguro de método de pago
            try:
                pm_enum = PaymentMethod[payment_data.payment_method.name]
            except (KeyError, AttributeError):
                # Fallback por valor si el nombre falla
                pm_val = payment_data.payment_method.value
                pm_enum = next((m for m in PaymentMethod if m.value == pm_val), PaymentMethod.CASH)

            payment = Payment(
                ticket_id=ticket.id,
                payment_method=pm_enum,
                amount=payment_data.amount,
                reference=payment_data.reference
            )
            db.add(payment)
        
        db.commit()
        db.refresh(ticket)
        return ticket
    
    @staticmethod
    def validate_sale(db: Session, ticket_id: int) -> Ticket:
        """
        Valida una venta: DRAFT -> VALIDATED
        En el modelo Odoo/Snapshot, esto NO resta stock de inmediato.
        Solo actualiza estado y totales de sesión.
        El descuento de inventario se realiza al CERRAR la sesión (SessionService.close_session).
        """
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
        if ticket.state != SaleState.DRAFT:
            return ticket
        
        # Actualizar estado del ticket
        ticket.state = SaleState.VALIDATED
        ticket.date_validated = datetime.utcnow()
        
        # Actualizar totales de la sesión si existe
        if ticket.session_id:
            session = db.query(CashSession).filter(CashSession.id == ticket.session_id).first()
            if session:
                for payment in ticket.payments:
                    pm_name = payment.payment_method.name if hasattr(payment.payment_method, "name") else str(payment.payment_method)
                    
                    if "CASH" in pm_name:
                        session.total_sales_cash += payment.amount
                    elif "CARD" in pm_name:
                        session.total_sales_card += payment.amount
                    elif "TRANSFER" in pm_name:
                        session.total_sales_transfer += payment.amount
        
        db.commit()
        db.refresh(ticket)
        return ticket
    
    @staticmethod
    def mark_as_paid(db: Session, ticket_id: int) -> Ticket:
        """
        Marca una venta como pagada: VALIDATED -> PAID
        """
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
        if ticket.state != SaleState.VALIDATED:
            raise HTTPException(status_code=400, detail="El ticket debe estar validado primero")
        
        ticket.state = SaleState.PAID
        db.commit()
        db.refresh(ticket)
        return ticket
    
    @staticmethod
    def create_refund(db: Session, refund_data: RefundCreate) -> tuple[Ticket, Ticket]:
        """
        Crea una nota de crédito (venta negativa)
        NO borra la venta original
        Opcionalmente regresa el producto al inventario o lo marca como merma
        """
        # Obtener venta original
        original_ticket = db.query(Ticket).filter(
            Ticket.id == refund_data.original_ticket_id
        ).first()
        
        if not original_ticket:
            raise HTTPException(status_code=404, detail="Ticket original no encontrado")
        
        if original_ticket.is_refunded:
            raise HTTPException(status_code=400, detail="Este ticket ya fue reembolsado")
        
        # Crear nota de crédito (venta negativa)
        credit_note = Ticket(
            ticket_number=POSService.generate_ticket_number(db, prefix="NC"),
            state=SaleState.REFUNDED,
            subtotal=-sum(item.quantity * item.price for item in refund_data.items),
            tax_amount=0,  # Se calcula después
            total_amount=0,  # Se calcula después
            payment_method=original_ticket.payment_method,
            session_id=original_ticket.session_id,
            original_ticket_id=original_ticket.id,
            refund_reason=RefundReason(refund_data.refund_reason.value),
            return_to_stock=refund_data.return_to_stock,
            date_validated=datetime.utcnow()
        )
        
        # Recalcular totales
        subtotal, tax_amount, total = POSService.calculate_totals(refund_data.items)
        credit_note.subtotal = -subtotal
        credit_note.tax_amount = -tax_amount
        credit_note.total_amount = -total
        
        db.add(credit_note)
        db.flush()
        
        # Crear items de la nota de crédito
        for item_data in refund_data.items:
            sale_item = SaleItem(
                ticket_id=credit_note.id,
                product_id=item_data.product_id,
                quantity=-item_data.quantity,  # Negativo
                unit_price=item_data.price,
                discount_percent=item_data.discount_percent,
                subtotal=-(item_data.quantity * item_data.price)
            )
            db.add(sale_item)
        
        # Crear movimiento de inventario (LOG para trazabilidad)
        movement_type = MovementType.IN_RETURN if refund_data.return_to_stock else MovementType.OUT_WASTE
        movement = InventoryMovement(
            type=movement_type,
            reason=f"Reembolso {credit_note.ticket_number} - {refund_data.refund_reason.value}",
            ticket_id=credit_note.id
        )
        db.add(movement)
        db.flush()
        
        # Registrar items del movimiento para trazabilidad (sin actualizar stock_quantity aún)
        for item in refund_data.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                # La cantidad en el movimiento es positiva si regresa, negativa si es merma/pérdida
                quantity_for_mov = item.quantity if refund_data.return_to_stock else -item.quantity
                
                movement_item = InventoryMovementItem(
                    movement_id=movement.id,
                    product_id=product.id,
                    quantity=quantity_for_mov,
                    stock_before=product.stock_quantity,
                    stock_after=product.stock_quantity  # No cambia el stock real en DB hasta cierre
                )
                db.add(movement_item)
        
        # Marcar ticket original como reembolsado
        original_ticket.is_refunded = True
        original_ticket.refund_ticket_id = credit_note.id
        
        # --- NUEVO: Actualizar totales de la sesión para el reembolso ---
        # Restamos el total reembolsado de los totales de la sesión
        if original_ticket.session_id:
            session = db.query(CashSession).filter(CashSession.id == original_ticket.session_id).first()
            if session:
                # Como es una nota de crédito, total_amount ya es negativo. 
                # Simplemente lo sumamos (lo cual restará del acumulado positivo).
                # Nota: Si era mixto, aquí simplificamos usando el método principal 
                # o prorrateando. Por ahora usamos el proporcional si es un solo método.
                main_method = original_ticket.payment_method
                if main_method == "efectivo":
                    session.total_sales_cash += credit_note.total_amount
                elif main_method == "tarjeta":
                    session.total_sales_card += credit_note.total_amount
                elif main_method == "transferencia":
                    session.total_sales_transfer += credit_note.total_amount
                else:
                    # Si es MIXTO, restamos del proporcional (simplificado al efectivo por ahora)
                    session.total_sales_cash += credit_note.total_amount

        db.commit()
        db.refresh(credit_note)
        db.refresh(original_ticket)
        
        return (credit_note, original_ticket)
    
    @staticmethod
    def get_sale_by_id(db: Session, ticket_id: int) -> Optional[Ticket]:
        """Obtiene una venta por ID"""
        return db.query(Ticket).filter(Ticket.id == ticket_id).first()
    
    @staticmethod
    def get_sales_by_session(db: Session, session_id: int) -> List[Ticket]:
        """Obtiene todas las ventas de una sesión"""
        return db.query(Ticket).filter(Ticket.session_id == session_id).order_by(Ticket.created_at.desc()).all()
