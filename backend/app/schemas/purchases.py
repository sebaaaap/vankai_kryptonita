from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_cost: float

class PurchaseItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_cost: float
    subtotal: float
    
    class Config:
        from_attributes = True

class PurchaseCreate(BaseModel):
    supplier_id: Optional[int] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None
    items: List[PurchaseItemCreate]

class PurchaseUpdate(BaseModel):
    supplier_id: Optional[int] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None

class PurchaseResponse(BaseModel):
    id: int
    date_created: datetime
    supplier_id: Optional[int]
    invoice_number: Optional[str]
    subtotal_net: float
    tax_amount: float
    total_cost: float
    state: str
    notes: Optional[str]
    items: List[PurchaseItemResponse] = []
    
    class Config:
        from_attributes = True

