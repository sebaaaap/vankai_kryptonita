from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
from enum import Enum

# --- Enums ---
class SaleStateEnum(str, Enum):
    DRAFT = "borrador"
    VALIDATED = "validado"
    PAID = "pagado"
    REFUNDED = "reembolsado"
    CANCELLED = "cancelado"

class PaymentMethodEnum(str, Enum):
    CASH = "efectivo"
    CARD = "tarjeta"
    TRANSFER = "transferencia"
    MIXED = "mixto"

class RefundReasonEnum(str, Enum):
    RETURN_TO_STOCK = "devolucion_stock"
    DAMAGED = "producto_danado"
    CUSTOMER_ERROR = "error_cliente"
    SYSTEM_ERROR = "error_sistema"

# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str
    barcode: str
    price: float = Field(ge=0, description="Precio debe ser mayor o igual a 0")
    cost: float = Field(ge=0, description="Costo debe ser mayor o igual a 0")
    category: Optional[str] = None
    category_id: Optional[int] = None
    image_path: Optional[str] = None
    internal_reference: Optional[str] = None
    uom: str = "unidades"

class ProductResponse(ProductBase):
    id: int
    stock_quantity: float
    is_active: bool

    class Config:
        from_attributes = True

# --- Payment Schemas ---
class PaymentCreate(BaseModel):
    """Schema para crear un pago individual"""
    payment_method: PaymentMethodEnum
    amount: float = Field(gt=0, description="Monto debe ser mayor a 0")
    reference: Optional[str] = None  # Número de voucher, transacción, etc.

class PaymentResponse(PaymentCreate):
    id: int
    date_created: datetime
    
    class Config:
        from_attributes = True

# --- Sale Item Schemas ---
class SaleItemCreate(BaseModel):
    """Schema para crear un item de venta"""
    product_id: int
    quantity: float = Field(gt=0, description="Cantidad debe ser mayor a 0")
    price: float = Field(ge=0, description="Precio debe ser mayor o igual a 0")
    discount_percent: float = Field(ge=0, le=100, default=0.0)

class SaleItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: float
    price: float = Field(validation_alias="unit_price")
    discount_percent: float
    subtotal: float

    class Config:
        from_attributes = True

# --- Sale/Ticket Schemas ---
class SaleCreate(BaseModel):
    """
    Schema para crear una venta
    Soporta pagos divididos (split payments)
    """
    items: List[SaleItemCreate] = Field(min_items=1, description="Debe haber al menos 1 item")
    payments: List[PaymentCreate] = Field(min_items=1, description="Debe haber al menos 1 pago")
    session_id: int = Field(..., description="Toda venta debe estar vinculada a una sesión")
    
    @validator('payments')
    def validate_payments(cls, v, values):
        """Valida que la suma de pagos sea coherente"""
        if not v:
            raise ValueError("Debe haber al menos un método de pago")
        return v

class SaleValidate(BaseModel):
    """Schema para validar una venta (confirmar y ajustar inventario)"""
    ticket_id: int

class SaleResponse(BaseModel):
    """Response completo de una venta"""
    id: int
    ticket_number: str
    date_created: datetime
    date_validated: Optional[datetime]
    state: SaleStateEnum
    subtotal: float
    tax_amount: float
    total_amount: float
    payment_method: str
    session_id: Optional[int]
    return_to_stock: bool = True
    original_ticket_id: Optional[int] = None
    items: List[SaleItemResponse]
    payments: List[PaymentResponse]
    
    class Config:
        from_attributes = True

# --- Refund Schemas ---
class RefundCreate(BaseModel):
    """
    Schema para crear una nota de crédito (reembolso)
    No borra la venta original, crea una venta negativa vinculada
    """
    original_ticket_id: int
    items: List[SaleItemCreate]  # Items a reembolsar (pueden ser parciales)
    refund_reason: RefundReasonEnum
    return_to_stock: bool = Field(
        default=True, 
        description="Si True, el producto regresa al inventario. Si False, se marca como merma."
    )

class RefundResponse(BaseModel):
    """Response de un reembolso"""
    credit_note: SaleResponse
    original_ticket: SaleResponse
    
    class Config:
        from_attributes = True

# --- Quick Sale Schema (Backward Compatibility) ---
class QuickSaleCreate(BaseModel):
    """
    Schema simplificado para ventas rápidas (un solo método de pago)
    Para compatibilidad con el frontend actual
    """
    items: List[SaleItemCreate]
    payment_method: PaymentMethodEnum = PaymentMethodEnum.CASH
    total_amount: float
    session_id: int = Field(..., description="Toda venta rápida debe estar vinculada a una sesión")
