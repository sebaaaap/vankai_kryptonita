from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import List, Optional
from app.models.base import MovementType

class InventoryMovementItemCreate(BaseModel):
    product_id: int
    quantity: float

class InventoryMovementCreate(BaseModel):
    items: List[InventoryMovementItemCreate]
    type: str # ENUM como string: "IN_PURCHASE", etc
    reason: Optional[str] = None
    to_location_id: Optional[int] = None

class InventoryMovementItemDetail(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: float

    class Config:
        from_attributes = True

class InventoryMovementResponse(BaseModel):
    id: int
    date: datetime
    type: str # O MovementType si queremos el enum
    reason: Optional[str]
    items: List[InventoryMovementItemDetail] = []

    @field_validator('type', mode='before')
    @classmethod
    def enum_to_string(cls, v):
        if isinstance(v, MovementType):
            return v.name
        return v

    class Config:
        from_attributes = True
