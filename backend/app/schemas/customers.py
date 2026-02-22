from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class VehicleType(str, Enum):
    automovil = "automovil"
    motocicleta = "motocicleta"
    camion = "camion"
    furgon = "furgon"
    camioneta = "camioneta"
    otro = "otro"

class VehicleBase(BaseModel):
    license_plate: str
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: VehicleType = VehicleType.automovil
    color: Optional[str] = None
    vin: Optional[str] = None

class VehicleCreate(VehicleBase):
    customer_id: Optional[int] = None

class VehicleUpdate(BaseModel):
    license_plate: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: Optional[VehicleType] = None
    color: Optional[str] = None
    vin: Optional[str] = None

class VehicleResponse(VehicleBase):
    id: int
    customer_id: int
    
    class Config:
        from_attributes = True

class CustomerBase(BaseModel):
    name: str
    rut: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    rut: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: int
    vehicles: List[VehicleResponse] = []
    
    class Config:
        from_attributes = True

class CustomerSalesHistory(BaseModel):
    id: int
    name: str
    rut: str
    total_spent: float
    tickets_count: int
    last_sale_date: Optional[datetime]
    
    class Config:
        from_attributes = True
