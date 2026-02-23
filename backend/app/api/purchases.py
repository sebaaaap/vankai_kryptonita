from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db_session
from app.schemas.purchases import PurchaseCreate, PurchaseResponse, PurchaseUpdate, PurchaseItemResponse
from app.services.purchase_service import PurchaseService
from app.api.deps import check_roles
from typing import List, Optional

router = APIRouter()

@router.post("/", response_model=PurchaseResponse)
def create_purchase(
    data: PurchaseCreate, 
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin", "inventario"]))
):
    """
    Crea una nueva compra en estado BORRADOR.
    No afecta el stock hasta que se confirme.
    """
    service = PurchaseService(db)
    purchase = service.create_purchase(data)
    
    # Calcular subtotales para la respuesta
    items_response = []
    for item in purchase.items:
        items_response.append(PurchaseItemResponse(
            id=item.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            subtotal=item.quantity * item.unit_cost
        ))
    
    return PurchaseResponse(
        id=purchase.id,
        date_created=purchase.date_created,
        supplier_id=purchase.supplier_id,
        invoice_number=purchase.invoice_number,
        subtotal_net=purchase.subtotal_net,
        tax_amount=purchase.tax_amount,
        total_cost=purchase.total_cost,
        state=purchase.state.name,
        notes=purchase.notes,
        items=items_response
    )

@router.get("/", response_model=List[PurchaseResponse])
def list_purchases(
    state: Optional[str] = Query(None, description="Filtrar por estado: DRAFT, CONFIRMED, CANCELLED"),
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin", "inventario"]))
):
    """
    Lista todas las compras, opcionalmente filtradas por estado.
    """
    service = PurchaseService(db)
    purchases = service.list_purchases(state=state)
    
    result = []
    for purchase in purchases:
        items_response = []
        for item in purchase.items:
            items_response.append(PurchaseItemResponse(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                subtotal=item.quantity * item.unit_cost
            ))
        
        result.append(PurchaseResponse(
            id=purchase.id,
            date_created=purchase.date_created,
            supplier_id=purchase.supplier_id,
            invoice_number=purchase.invoice_number,
            subtotal_net=purchase.subtotal_net,
            tax_amount=purchase.tax_amount,
            total_cost=purchase.total_cost,
            state=purchase.state.name,
            notes=purchase.notes,
            items=items_response
        ))
    
    return result

@router.get("/{purchase_id}", response_model=PurchaseResponse)
def get_purchase(
    purchase_id: UUID, 
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin", "inventario"]))
):
    """
    Obtiene los detalles de una compra específica.
    """
    service = PurchaseService(db)
    purchase = service.get_purchase(purchase_id)
    
    items_response = []
    for item in purchase.items:
        items_response.append(PurchaseItemResponse(
            id=item.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            subtotal=item.quantity * item.unit_cost
        ))
    
    return PurchaseResponse(
        id=purchase.id,
        date_created=purchase.date_created,
        supplier_id=purchase.supplier_id,
        invoice_number=purchase.invoice_number,
        subtotal_net=purchase.subtotal_net,
        tax_amount=purchase.tax_amount,
        total_cost=purchase.total_cost,
        state=purchase.state.name,
        notes=purchase.notes,
        items=items_response
    )

@router.post("/{purchase_id}/confirm", response_model=PurchaseResponse)
def confirm_purchase(
    purchase_id: UUID, 
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin"]))
):
    """
    Confirma una compra:
    - Cambia el estado a CONFIRMADO
    - Actualiza el costo de los productos
    - Genera movimiento de inventario
    - Incrementa el stock
    """
    service = PurchaseService(db)
    purchase = service.confirm_purchase(purchase_id)
    
    items_response = []
    for item in purchase.items:
        items_response.append(PurchaseItemResponse(
            id=item.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            subtotal=item.quantity * item.unit_cost
        ))
    
    return PurchaseResponse(
        id=purchase.id,
        date_created=purchase.date_created,
        supplier_id=purchase.supplier_id,
        invoice_number=purchase.invoice_number,
        subtotal_net=purchase.subtotal_net,
        tax_amount=purchase.tax_amount,
        total_cost=purchase.total_cost,
        state=purchase.state.name,
        notes=purchase.notes,
        items=items_response
    )

@router.post("/{purchase_id}/cancel", response_model=PurchaseResponse)
def cancel_purchase(
    purchase_id: UUID, 
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin"]))
):
    """
    Cancela una compra (solo si está en borrador).
    """
    service = PurchaseService(db)
    purchase = service.cancel_purchase(purchase_id)
    
    items_response = []
    for item in purchase.items:
        items_response.append(PurchaseItemResponse(
            id=item.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            subtotal=item.quantity * item.unit_cost
        ))
    
    return PurchaseResponse(
        id=purchase.id,
        date_created=purchase.date_created,
        supplier_id=purchase.supplier_id,
        invoice_number=purchase.invoice_number,
        subtotal_net=purchase.subtotal_net,
        tax_amount=purchase.tax_amount,
        total_cost=purchase.total_cost,
        state=purchase.state.name,
        notes=purchase.notes,
        items=items_response
    )

@router.patch("/{purchase_id}", response_model=PurchaseResponse)
def update_purchase(
    purchase_id: UUID, 
    data: PurchaseUpdate, 
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin", "inventario"]))
):
    """
    Actualiza una compra (solo si está en borrador).
    """
    service = PurchaseService(db)
    purchase = service.update_purchase(purchase_id, data)
    
    items_response = []
    for item in purchase.items:
        items_response.append(PurchaseItemResponse(
            id=item.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            subtotal=item.quantity * item.unit_cost
        ))
    
    return PurchaseResponse(
        id=purchase.id,
        date_created=purchase.date_created,
        supplier_id=purchase.supplier_id,
        invoice_number=purchase.invoice_number,
        subtotal_net=purchase.subtotal_net,
        tax_amount=purchase.tax_amount,
        total_cost=purchase.total_cost,
        state=purchase.state.name,
        notes=purchase.notes,
        items=items_response
    )
