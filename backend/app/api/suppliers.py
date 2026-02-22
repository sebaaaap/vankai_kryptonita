from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.base import Supplier
from app.schemas.suppliers import SupplierCreate, SupplierResponse
from typing import List

router = APIRouter()

@router.post("/", response_model=SupplierResponse)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    db_obj = Supplier(**data.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/", response_model=List[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).all()

@router.get("/{id}", response_model=SupplierResponse)
def get_supplier(id: int, db: Session = Depends(get_db)):
    obj = db.query(Supplier).filter(Supplier.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return obj
