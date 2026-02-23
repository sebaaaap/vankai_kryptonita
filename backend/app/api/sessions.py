from uuid import UUID
"""
API Endpoints para Sesiones de Caja
Maneja apertura, cierre y consulta de sesiones
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db_session
from app.schemas.sessions import CashSessionCreate, CashSessionClose, CashSessionResponse
from app.services.session_service import SessionService

router = APIRouter()

@router.post("/open", response_model=CashSessionResponse, status_code=201)
def open_session(data: CashSessionCreate, db: Session = Depends(get_db_session)):
    """
    Abre una nueva sesión de caja
    Solo puede haber una sesión abierta por usuario
    
    Ejemplo de payload:
    {
        "initial_cash": 50000,
        "user_id": "admin"
    }
    """
    return SessionService.open_session(db, data)

@router.post("/{session_id}/close", response_model=CashSessionResponse)
@router.post("/{session_id}/validate_and_close", response_model=CashSessionResponse)
def close_session(session_id: UUID, data: CashSessionClose, db: Session = Depends(get_db_session)):
    """
    Cierra una sesión de caja
    Calcula el expected_cash y la diferencia (discrepancia)
    
    EJECUTA LA LÓGICA TIPO ODOO: Agrupa ventas y descuenta stock al cerrar.
    """
    return SessionService.close_session(db, session_id, data)

@router.get("/active", response_model=CashSessionResponse)
def get_active_session(
    user_id: Optional[str] = Query(None, description="Filtrar por usuario"),
    db: Session = Depends(get_db_session)
):
    """
    Obtiene la sesión abierta actual
    Opcionalmente filtra por usuario
    """
    session = SessionService.get_open_session(db, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="No hay sesión activa")
    return session

@router.get("/{session_id}", response_model=CashSessionResponse)
def get_session(session_id: UUID, db: Session = Depends(get_db_session)):
    """Obtiene una sesión por ID"""
    session = SessionService.get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return session

@router.get("/", response_model=List[CashSessionResponse])
def get_all_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db_session)
):
    """Obtiene todas las sesiones (paginado)"""
    return SessionService.get_all_sessions(db, skip, limit)

@router.get("/{session_id}/summary")
def get_session_summary(session_id: UUID, db: Session = Depends(get_db_session)):
    """
    Genera un resumen detallado de la sesión
    Incluye totales por método de pago, número de transacciones, etc.
    """
    return SessionService.get_session_summary(db, session_id)
