from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db_session
from app.models.base import Customer, Vehicle, Ticket, SaleState
from app.schemas.customers import CustomerCreate, CustomerUpdate, CustomerResponse, VehicleCreate, VehicleUpdate, VehicleResponse
from sqlalchemy import func
from app.api.deps import check_roles

router = APIRouter()

@router.get("/", response_model=List[CustomerResponse])
def get_customers(
    skip: int = 0, 
    limit: int = 100, 
    q: Optional[str] = None,
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin", "vendedor"]))
):
    query = db.query(Customer)
    if q:
        query = query.filter(
            (Customer.name.ilike(f"%{q}%")) | 
            (Customer.rut.ilike(f"%{q}%"))
        )
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=CustomerResponse)
def create_customer(
    customer: CustomerCreate, 
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin", "vendedor"]))
):
    # Check if RUT already exists
    existing = db.query(Customer).filter(Customer.rut == customer.rut).first()
    if existing:
        raise HTTPException(status_code=400, detail="El RUT ya está registrado")
    
    db_customer = Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: UUID, db: Session = Depends(get_db_session)):
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return db_customer

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: UUID, customer: CustomerUpdate, db: Session = Depends(get_db_session)):
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    update_data = customer.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_customer, key, value)
    
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.delete("/{customer_id}")
def delete_customer(customer_id: UUID, db: Session = Depends(get_db_session)):
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    db.delete(db_customer)
    db.commit()
    return {"status": "ok"}

# --- Vehicles ---

@router.post("/{customer_id}/vehicles", response_model=VehicleResponse)
def add_vehicle(customer_id: UUID, vehicle: VehicleCreate, db: Session = Depends(get_db_session)):
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Check if plate already exists
    existing = db.query(Vehicle).filter(Vehicle.license_plate == vehicle.license_plate).first()
    if existing:
        raise HTTPException(status_code=400, detail="La patente ya está registrada")
    
    db_vehicle = Vehicle(**vehicle.dict(exclude={"customer_id"}), customer_id=customer_id)
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@router.get("/vehicles/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(vehicle_id: UUID, db: Session = Depends(get_db_session)):
    db_vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return db_vehicle

@router.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(vehicle_id: UUID, vehicle: VehicleUpdate, db: Session = Depends(get_db_session)):
    db_vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    update_data = vehicle.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_vehicle, key, value)
    
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@router.delete("/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: UUID, db: Session = Depends(get_db_session)):
    db_vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    db.delete(db_vehicle)
    db.commit()
    return {"status": "ok"}

# --- Stats / History ---

@router.get("/{customer_id}/history")
def get_customer_history(customer_id: UUID, db: Session = Depends(get_db_session)):
    # Get all tickets for this customer
    tickets = db.query(Ticket).filter(
        Ticket.customer_id == customer_id,
        Ticket.state == SaleState.VALIDATED # Only validated sales
    ).order_by(Ticket.created_at.desc()).all()
    
    history = []
    for t in tickets:
        history.append({
            "id": t.id,
            "ticket_number": t.ticket_number,
            "date": t.date_created,
            "total": t.total_amount,
            "vehicle": t.vehicle.license_plate if t.vehicle else "N/A",
            "state": t.state
        })
    
    # Simple KPIs
    stats = db.query(
        func.count(Ticket.id),
        func.sum(Ticket.total_amount)
    ).filter(
        Ticket.customer_id == customer_id,
        Ticket.state == SaleState.VALIDATED
    ).first()
    
    return {
        "summary": {
            "total_count": stats[0] or 0,
            "total_amount": stats[1] or 0.0
        },
        "sales": history
    }
