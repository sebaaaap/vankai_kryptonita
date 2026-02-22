"""
Servicio de Sesiones de Caja
Maneja apertura, cierre y arqueo de caja
"""
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException

from app.models.base import CashSession, Ticket, Payment, PaymentMethod
from app.schemas.sessions import CashSessionCreate, CashSessionClose, CashSessionResponse

class SessionService:
    """Servicio de gestión de sesiones de caja"""
    
    @staticmethod
    def generate_session_name(db: Session, user_id: str) -> str:
        """Genera nombre de sesión: Sesión 2026-02-07 - Cajero Juan"""
        date_str = datetime.now().strftime("%Y-%m-%d")
        return f"Sesión {date_str} - Cajero {user_id}"
    
    @staticmethod
    def open_session(db: Session, session_data: CashSessionCreate) -> CashSession:
        """
        Abre una nueva sesión de caja
        Solo puede haber una sesión abierta por usuario
        """
        # Verificar que no haya sesiones abiertas para este usuario
        existing_open = db.query(CashSession).filter(
            CashSession.user_id == session_data.user_id,
            CashSession.is_open == True
        ).first()
        
        if existing_open:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe una sesión abierta para el usuario {session_data.user_id}"
            )
        
        # Generar nombre si no se provee
        name = session_data.name or SessionService.generate_session_name(db, session_data.user_id)
        
        # Crear sesión
        session = CashSession(
            name=name,
            initial_cash=session_data.initial_cash,
            expected_cash=session_data.initial_cash,  # Inicialmente igual al inicial
            user_id=session_data.user_id,
            is_open=True,
            notes=session_data.notes
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    
    @staticmethod
    def close_session(db: Session, session_id: int, close_data: CashSessionClose) -> CashSession:
        """
        Cierra una sesión de caja (Lógica Odoo Senior)
        1. Valida/Paga tickets que quedaron pendientes.
        2. Agrupa todos los productos vendidos en la sesión.
        3. Realiza UNA sola transacción atómica para descontar stock.
        4. Crea los logs de inventario correspondientes.
        """
        from app.models.base import (
            Ticket, SaleItem, CashSession, SaleState, Product, 
            InventoryMovement, InventoryMovementItem, MovementType
        )
        from app.services.pos_service import POSService
        
        session = db.query(CashSession).filter(CashSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        if not session.is_open:
            raise HTTPException(status_code=400, detail="La sesión ya está cerrada")
        
        # --- 1. Sincronizar estados de tickets ---
        # Aseguramos que todo lo vendido en la sesión esté validado/pagado
        draft_tickets = db.query(Ticket).filter(
            Ticket.session_id == session_id,
            Ticket.state == SaleState.DRAFT
        ).all()
        
        for ticket in draft_tickets:
            POSService.validate_sale(db, ticket.id)
            POSService.mark_as_paid(db, ticket.id)

        # --- 2. Sincronizar Totales de Sesión (Integridad) ---
        # Recalculamos los totales para asegurar que coincidan exactamente con los tickets
        session.total_sales_cash = 0.0
        session.total_sales_card = 0.0
        session.total_sales_transfer = 0.0
        
        session_tickets = db.query(Ticket).filter(
            Ticket.session_id == session_id,
            Ticket.state.in_([SaleState.VALIDATED, SaleState.PAID, SaleState.REFUNDED])
        ).all()
        
        for t in session_tickets:
            # Sumar de los pagos registrados
            for p in t.payments:
                pm_name = p.payment_method.name if hasattr(p.payment_method, "name") else str(p.payment_method)
                if "CASH" in pm_name:
                    session.total_sales_cash += p.amount
                elif "CARD" in pm_name:
                    session.total_sales_card += p.amount
                elif "TRANSFER" in pm_name:
                    session.total_sales_transfer += p.amount
            
            # Caso especial: Reembolsos sin registros de pago aún registrados por tipo
            if t.state == SaleState.REFUNDED and not t.payments:
                if t.payment_method == "efectivo":
                    session.total_sales_cash += t.total_amount
                elif t.payment_method == "tarjeta":
                    session.total_sales_card += t.total_amount
                elif t.payment_method == "transferencia":
                    session.total_sales_transfer += t.total_amount
                else:
                    session.total_sales_cash += t.total_amount

        # --- 3. Agrupar consumos de stock ---
        # Buscamos todos los items de tickets validados o pagados de esta sesión
        session_items = db.query(SaleItem).join(Ticket).filter(
            Ticket.session_id == session_id,
            Ticket.state.in_([SaleState.VALIDATED, SaleState.PAID, SaleState.REFUNDED])
        ).all()

        stock_updates = {} # product_id -> total_quantity
        for item in session_items:
            # Las notas de crédito (reembolsos) tienen item.quantity negativo
            # Solo afectamos el stock si el producto efectivamente regresa al inventario
            if item.quantity < 0:
                if item.ticket.return_to_stock:
                    stock_updates[item.product_id] = stock_updates.get(item.product_id, 0) + item.quantity
                # Si no regresa a stock (merma/dañado), ignoramos la cantidad negativa
                # para que el descuento de la venta original permanezca intacto.
            else:
                # Ventas normales (cantidad positiva)
                stock_updates[item.product_id] = stock_updates.get(item.product_id, 0) + item.quantity

        # --- 3. Transacción Atómica de Inventario ---
        if stock_updates:
            movement = InventoryMovement(
                type=MovementType.OUT_SALE,
                reason=f"Cierre de Sesión POS: {session.name} (Resumen)",
            )
            db.add(movement)
            db.flush()

            for product_id, total_qty in stock_updates.items():
                if total_qty == 0: continue # Sin cambio neto

                product = db.query(Product).filter(Product.id == product_id).with_for_update().first()
                if not product: continue

                stock_before = product.stock_quantity
                # total_qty es positivo para ventas netas, negativo para devoluciones netas
                product.stock_quantity -= total_qty
                stock_after = product.stock_quantity

                movement_item = InventoryMovementItem(
                    movement_id=movement.id,
                    product_id=product.id,
                    quantity=-total_qty, # Refleja cambio en stock: -5 para venta, +2 para reembolso
                    stock_before=stock_before,
                    stock_after=stock_after
                )
                db.add(movement_item)

        # --- 4. Finalizar Sesión ---
        expected_cash = session.initial_cash + session.total_sales_cash
        difference = close_data.final_cash - expected_cash
        
        session.end_time = datetime.utcnow()
        session.final_cash = close_data.final_cash
        session.expected_cash = expected_cash
        session.difference = difference
        session.is_open = False
        session.notes = close_data.notes
        
        db.commit()
        db.refresh(session)
        return session
    
    @staticmethod
    def get_open_session(db: Session, user_id: Optional[str] = None) -> Optional[CashSession]:
        """Obtiene la sesión abierta actual (opcionalmente por usuario)"""
        query = db.query(CashSession).filter(CashSession.is_open == True)
        
        if user_id:
            query = query.filter(CashSession.user_id == user_id)
        
        return query.first()
    
    @staticmethod
    def get_session_by_id(db: Session, session_id: int) -> Optional[CashSession]:
        """Obtiene una sesión por ID"""
        return db.query(CashSession).filter(CashSession.id == session_id).first()
    
    @staticmethod
    def get_all_sessions(db: Session, skip: int = 0, limit: int = 100) -> List[CashSession]:
        """Obtiene todas las sesiones (paginado)"""
        return db.query(CashSession).order_by(CashSession.start_time.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_session_summary(db: Session, session_id: int) -> dict:
        """
        Genera un resumen detallado de la sesión
        Incluye totales por método de pago, número de transacciones, etc.
        """
        session = SessionService.get_session_by_id(db, session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        
        # Obtener tickets de la sesión
        tickets = db.query(Ticket).filter(Ticket.session_id == session_id).all()
        
        # Calcular estadísticas
        total_transactions = len(tickets)
        total_sales = sum(t.total_amount for t in tickets if t.state != "cancelado")
        
        # Desglose por método de pago
        cash_total = session.total_sales_cash
        card_total = session.total_sales_card
        transfer_total = session.total_sales_transfer
        
        return {
            "session": session,
            "total_transactions": total_transactions,
            "total_sales": total_sales,
            "payment_breakdown": {
                "cash": cash_total,
                "card": card_total,
                "transfer": transfer_total
            },
            "cash_control": {
                "initial": session.initial_cash,
                "expected": session.expected_cash,
                "counted": session.final_cash,
                "difference": session.difference
            },
            "tickets": tickets
        }
