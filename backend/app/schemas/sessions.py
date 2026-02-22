from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class CashSessionCreate(BaseModel):
    """Schema para abrir una sesión de caja"""
    initial_cash: float = Field(ge=0, description="Efectivo inicial debe ser mayor o igual a 0")
    user_id: Optional[str] = "admin"
    name: Optional[str] = None  # Si no se provee, se genera automáticamente
    notes: Optional[str] = None # Observaciones iniciales

class CashSessionClose(BaseModel):
    """
    Schema para cerrar una sesión de caja
    El sistema calcula automáticamente el expected_cash y la diferencia
    """
    final_cash: float = Field(ge=0, description="Efectivo final contado por el cajero")
    notes: Optional[str] = None  # Observaciones del cierre

class CashSessionResponse(BaseModel):
    """Response completo de una sesión"""
    id: int
    name: str
    start_time: datetime
    end_time: Optional[datetime]
    initial_cash: float
    final_cash: Optional[float]
    expected_cash: float
    difference: float
    total_sales_cash: float
    total_sales_card: float
    total_sales_transfer: float
    is_open: bool
    user_id: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True

class CashSessionSummary(BaseModel):
    """Resumen de sesión para reportes"""
    id: int
    name: str
    start_time: datetime
    end_time: Optional[datetime]
    total_sales: float
    total_transactions: int
    difference: float
    is_open: bool
