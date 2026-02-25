from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime
from fastapi import HTTPException
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from app.models.base import (
    Quote, QuoteItem, WorkOrder, WorkOrderItem, WorkOrderPayment,
    QuoteState, WorkOrderState, PaymentMethod, CashSession, Product,
    InventoryMovement, InventoryMovementItem, MovementType, StorageLocation,
    Ticket, SaleItem, SaleState
)
from app.schemas.quotes import QuoteCreate, QuoteUpdateState
from app.schemas.work_orders import WorkOrderCreate, WorkOrderPaymentCreate
from app.services.pos_service import POSService

class QuoteWorkOrderService:

    @staticmethod
    def create_quote(db: Session, quote_data: QuoteCreate) -> Quote:
        total = Decimal('0')
        
        quote = Quote(
            customer_id=quote_data.customer_id,
            vehicle_id=quote_data.vehicle_id,
            mileage=quote_data.mileage,
            state=QuoteState.DRAFT
        )
        db.add(quote)
        db.flush()

        for item in quote_data.items:
            subtotal = round(item.quantity * item.unit_price, 2)
            total += subtotal
            
            qi = QuoteItem(
                quote_id=quote.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=subtotal
            )
            db.add(qi)
            
        quote.total = total
        db.commit()
        db.refresh(quote)
        return quote

    @staticmethod
    def get_quotes(db: Session) -> List[Quote]:
        return db.query(Quote).order_by(Quote.created_at.desc()).all()

    @staticmethod
    def reject_quote(db: Session, quote_id: UUID) -> Quote:
        quote = db.query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        if quote.state != QuoteState.DRAFT:
            raise HTTPException(status_code=400, detail="Solo se pueden rechazar cotizaciones en estado borrador")
            
        quote.state = QuoteState.REJECTED
        db.commit()
        db.refresh(quote)
        return quote

    @staticmethod
    def approve_quote(db: Session, quote_id: UUID) -> tuple[Quote, WorkOrder]:
        quote = db.query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
            
        if quote.state != QuoteState.DRAFT:
            raise HTTPException(status_code=400, detail="Solo se pueden aprobar cotizaciones en estado borrador")
            
        try:
            with db.begin_nested():
                quote.state = QuoteState.APPROVED
                
                # Create WorkOrder
                work_order = WorkOrder(
                    quote_id=quote.id,
                    customer_id=quote.customer_id,
                    vehicle_id=quote.vehicle_id,
                    mileage=quote.mileage,
                    state=WorkOrderState.OPEN
                )
                db.add(work_order)
                db.flush()
                
                movement = InventoryMovement(
                    type=MovementType.OUT_SALE,
                    reason=f"Reserva para OT base cotización {quote.id}"
                )
                db.add(movement)
                db.flush()

                # Add items and discount stock atomically
                for qi in quote.items:
                    wo_item = WorkOrderItem(
                        work_order_id=work_order.id,
                        product_id=qi.product_id,
                        quantity=qi.quantity,
                        unit_price=qi.unit_price,
                        subtotal=qi.subtotal
                    )
                    db.add(wo_item)

                    # Deduct stock
                    original_product = db.query(Product).filter(Product.id == qi.product_id).first()
                    if not original_product:
                        raise HTTPException(status_code=404, detail=f"Producto {qi.product_id} no encontrado")

                    candidates = db.query(Product).outerjoin(Product.location).filter(
                        Product.barcode == original_product.barcode,
                        Product.stock_quantity > 0,
                        or_(StorageLocation.id == None, StorageLocation.name != "Pasillo Mermas")
                    ).with_for_update(of=Product).order_by(Product.stock_quantity.desc()).all()

                    total_available = sum(p.stock_quantity for p in candidates)

                    if total_available < qi.quantity:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Stock insuficiente para {original_product.name}. Disponible: {total_available}"
                        )

                    qty_remaining = qi.quantity

                    for candidate in candidates:
                        if qty_remaining <= 0:
                            break

                        take = min(Decimal(str(candidate.stock_quantity)), Decimal(str(qty_remaining)))
                        
                        stock_before = candidate.stock_quantity
                        candidate.stock_quantity -= take
                        stock_after = candidate.stock_quantity

                        mov_item = InventoryMovementItem(
                            movement_id=movement.id,
                            product_id=candidate.id,
                            quantity=-take,
                            stock_before=stock_before,
                            stock_after=stock_after
                        )
                        db.add(mov_item)

                        qty_remaining -= take
                        
            db.commit()
            db.refresh(quote)
            db.refresh(work_order)
            return quote, work_order
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail="Error al aprobar cotización y generar OT")

    @staticmethod
    def get_active_work_orders(db: Session):
        return db.query(WorkOrder).filter(
            WorkOrder.state.in_([WorkOrderState.OPEN, WorkOrderState.IN_PROGRESS, WorkOrderState.READY])
        ).all()

    @staticmethod
    def add_payment(db: Session, wo_id: UUID, payment_data: WorkOrderPaymentCreate, session_id: UUID) -> tuple[WorkOrderPayment, Decimal]:
        with db.begin_nested():
            wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).with_for_update().first()
            if not wo:
                raise HTTPException(status_code=404, detail="Orden de trabajo no encontrada")
                
            cash_session = db.query(CashSession).filter(CashSession.id == session_id).first()
            if not cash_session or cash_session.status != "open":
                raise HTTPException(status_code=400, detail="La sesión de caja no está abierta o es inválida")
                
            total_items = sum(item.subtotal for item in wo.items)
            total_payments = sum(p.amount for p in wo.payments)
            balance = total_items - total_payments
            
            if payment_data.amount > balance:
                raise HTTPException(status_code=400, detail=f"El monto a pagar ({payment_data.amount}) supera el saldo pendiente ({balance})")

            pm_enum = PaymentMethod[payment_data.payment_method.upper()]

            payment = WorkOrderPayment(
                work_order_id=wo.id,
                session_id=session_id,
                amount=payment_data.amount,
                payment_method=pm_enum
            )
            db.add(payment)
            db.flush()
            
            new_balance = balance - payment_data.amount
            
            # Update session totals
            if pm_enum == PaymentMethod.CASH:
                cash_session.total_sales_cash += payment_data.amount
            elif pm_enum == PaymentMethod.CARD:
                cash_session.total_sales_card += payment_data.amount
            elif pm_enum == PaymentMethod.TRANSFER:
                cash_session.total_sales_transfer += payment_data.amount
            elif pm_enum == PaymentMethod.MIXED:
                cash_session.total_sales_cash += payment_data.amount
                
            # If paid off completely, finish WO and generate Ticket
            if new_balance == Decimal('0'):
                wo.state = WorkOrderState.COMPLETED
                
                subtotal = sum(item.subtotal for item in wo.items)
                
                # Approximate backward tax extraction mapping like POSService
                tax_amount = subtotal * Decimal('0.19') # Note: this logic depends on if unit_price in WO was with or without TAX. Let's assume inclusive.
                total = subtotal
                tax_amount = round(total * Decimal('0.19'), 2)
                subtotal_net = round(total - tax_amount, 2)
                
                ticket = Ticket(
                    ticket_number=POSService.generate_ticket_number(db),
                    state=SaleState.VALIDATED, # Assuming finished WO makes sale practically done
                    subtotal=subtotal_net,
                    tax_amount=tax_amount,
                    total_amount=total,
                    payment_method=payment_data.payment_method,
                    session_id=session_id,
                    customer_id=wo.customer_id,
                    vehicle_id=wo.vehicle_id
                )
                db.add(ticket)
                db.flush()
                
                for item in wo.items:
                    sale_item = SaleItem(
                        ticket_id=ticket.id,
                        product_id=item.product_id,
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                        subtotal=item.subtotal
                    )
                    db.add(sale_item)

        db.commit()
        db.refresh(payment)
        return payment, new_balance

    @staticmethod
    def get_wo_balance(db: Session, wo_id: UUID):
        wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
        if not wo:
            raise HTTPException(status_code=404, detail="Orden de trabajo no encontrada")
            
        total_items = sum(item.subtotal for item in wo.items)
        total_payments = sum(p.amount for p in wo.payments)
        balance = total_items - total_payments
        
        return {
            "work_order_id": wo.id,
            "total_items": total_items,
            "total_payments": total_payments,
            "balance": balance
        }
