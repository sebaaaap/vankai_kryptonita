from pydantic import BaseModel
from typing import List, Optional

class LocationBase(BaseModel):
    name: str
    zone: Optional[str] = None
    side: Optional[str] = None
    column: Optional[int] = None
    level: Optional[int] = None
    parent_id: Optional[int] = None
    path: Optional[str] = None
    allows_multiple_products: bool = True

class LocationCreate(LocationBase):
    pass

class AisleGenerate(BaseModel):
    zone_prefix: str    # Ej: "A"
    num_columns: int   # Ej: 10
    num_levels: int    # Ej: 7
    allows_multiple_products: bool = False # Por defecto pasillos son estrictos según requerimiento típico

class LocationResponse(LocationBase):
    id: int
    children: List['LocationResponse'] = [] # Nested response

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    internal_reference: Optional[str] = None
    barcode: str
    price: float
    cost: float
    uom: str = "unidades" 
    stock_quantity: float = 0
    min_stock: float = 5
    product_type: str = "STORABLE"
    location_id: Optional[int] = None
    category_id: Optional[int] = None

class ProductCreateWithLocation(ProductBase):
    pass

class ProductResponseWithLocation(ProductBase):
    id: int
    location: Optional[LocationBase]
    
    class Config:
        from_attributes = True
