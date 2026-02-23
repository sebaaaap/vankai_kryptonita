from uuid import UUID
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db_session
from app.services.image_service import ImageService
from app.models.base import Product, StorageLocation
from app.schemas.locations import ProductResponseWithLocation
from pydantic import BaseModel
from typing import List, Optional
from app.api.deps import check_roles

router = APIRouter()

# Schema simple para creación de producto (MVP)
class ProductCreate(BaseModel):
    name: str
    internal_reference: Optional[str] = None
    barcode: str
    price: float
    cost: float
    uom: str = "unidades"
    stock_quantity: float = 0
    min_stock: float = 5
    image_path: Optional[str] = None
    category_id: Optional[UUID] = None
    product_type: str = "STORABLE"
    location_id: Optional[UUID] = None

@router.post("/upload-image")
def upload_product_image(
    file: UploadFile = File(...),
    current_user = Depends(check_roles(["admin"]))
):
    url = ImageService.save_image(file)
    return {"url": url}

@router.post("/", response_model=ProductResponseWithLocation)
def create_product(
    product: ProductCreate, 
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin"]))
):
    # Validar location si viene
    if product.location_id:
        loc = db.query(StorageLocation).filter(StorageLocation.id == product.location_id).first()
        if not loc:
            raise HTTPException(status_code=400, detail="Ubicación no válida")
        
        # Verificar si la ubicación está ocupada (Considerando la nueva flag)
        if not loc.allows_multiple_products:
            # Si es estricta, buscamos si hay CUALQUIER otro producto con barcode distinto
            occupant = db.query(Product).filter(
                Product.location_id == product.location_id,
                Product.barcode != product.barcode,
                Product.is_active == True,
                Product.stock_quantity > 0
            ).first()
            if occupant:
                raise HTTPException(
                    status_code=400, 
                    detail=f"La ubicación '{loc.name}' es de producto único y ya está ocupada por: {occupant.name}"
                )

    db_product = Product(**product.model_dump())
    try:
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

from sqlalchemy.orm import joinedload
from collections import defaultdict

class ProductLocationDetail(BaseModel):
    id: UUID # ID del registro específico (para operaciones puntuales)
    location_id: UUID
    location_path: str
    stock: float

class ProductAggregatedResponse(BaseModel):
    id: UUID # ID representativo (el primero encontrado)
    name: str
    barcode: str
    price: float
    cost: float
    total_stock: float
    category_id: Optional[UUID]
    product_type: str
    uom: str
    internal_reference: Optional[str]
    locations: List[ProductLocationDetail]
    location_id: Optional[UUID] = None # ID de la ubicación principal (primera encontrada)
    image_path: Optional[str] = None

@router.get("/", response_model=List[ProductAggregatedResponse])
def list_products(
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin", "inventario", "vendedor"]))
):
    """
    Lista productos agrupados por código de barras con stock total y detalle de ubicaciones.
    """
    # Solo listamos productos activos
    products = db.query(Product).filter(Product.is_active == True).options(joinedload(Product.location)).all()
    
    grouped = defaultdict(list)
    for p in products:
        grouped[p.barcode].append(p)
        
    results = []
    for barcode, items in grouped.items():
        primary = items[0] # Usamos el primero como referencia para datos maestros
        
        # Calcular stock total SOLO de ubicaciones vendibles (excluir Pasillo Mermas)
        # Si location es None, asumimos vendible (stock general sin asignar)
        total_stock = sum(
            i.stock_quantity for i in items 
            if i.location is None or i.location.name != "Pasillo Mermas"
        )
        
        locs = []
        for i in items:
            if i.location:
                locs.append(ProductLocationDetail(
                    id=i.id,
                    location_id=i.location.id,
                    location_path=i.location.path,
                    stock=i.stock_quantity
                ))
        
        # Manejo seguro del Enum product_type
        p_type = primary.product_type
        if hasattr(p_type, "name"):
            p_type = p_type.name
        elif hasattr(p_type, "value"): # Fallback
            p_type = p_type.value
            
        results.append(ProductAggregatedResponse(
            id=primary.id,
            name=primary.name,
            barcode=primary.barcode,
            price=primary.price,
            cost=primary.cost,
            total_stock=total_stock,
            category_id=primary.category_id,
            product_type=str(p_type),
            uom=primary.uom,
            internal_reference=primary.internal_reference,
            locations=locs,
            location_id=primary.location_id,
            image_path=primary.image_path
        ))
    
    return results

@router.put("/{product_id}", response_model=ProductResponseWithLocation)
def update_product(
    product_id: UUID, 
    product_data: ProductCreate, 
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin"]))
):
    """
    Actualiza un producto.
    Si hay múltiples ubicaciones (mismo barcode), sincroniza los campos comunes (precio, nombre, etc.)
    La ubicación y stock se actualizan solo para el ID específico si se proporcionan.
    """
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Obtener todos los productos con el mismo barcode para mantener coherencia
    siblings = db.query(Product).filter(Product.barcode == db_product.barcode).all()
    
    update_data = product_data.model_dump(exclude_unset=True)
    
    # Campos que se deben sincronizar en todas las instancias
    shared_fields = {
        'name', 'price', 'cost', 'category_id', 'product_type', 
        'uom', 'internal_reference', 'image_path', 'min_stock', 'barcode'
    }

    try:
        # 1. Actualizar campos compartidos en TODOS los hermanos
        for sibling in siblings:
            for key, value in update_data.items():
                if key in shared_fields:
                    setattr(sibling, key, value)
        
        # 2. Actualizar campos específicos SOLO en el target (si vienen en el payload)
        # Nota: El modal actual manda todo, así que update_data tendrá location_id y stock.
        # Asumimos que si se edita desde el modal, se está editando la instancia "principal" o seleccionada.
        if 'location_id' in update_data:
             # Validar ubicación
             loc = db.query(StorageLocation).filter(StorageLocation.id == update_data['location_id']).first()
             if not loc:
                 raise HTTPException(status_code=400, detail="Ubicación no válida")
             
             # VALIDACIÓN: Si es una ubicación de SKU Único, no permitir si ya hay OTRO producto ocupándola
             if not loc.allows_multiple_products:
                 occupant = db.query(Product).filter(
                     Product.location_id == loc.id,
                     Product.barcode != db_product.barcode,  # Diferente SKU
                     Product.is_active == True,
                     Product.stock_quantity > 0
                 ).first()
                 
                 if occupant:
                     raise HTTPException(
                         status_code=400, 
                         detail=f"La ubicación '{loc.name}' es de producto único y ya está ocupada por '{occupant.name}'. No se puede mover este producto aquí."
                     )
             
             db_product.location_id = update_data['location_id']
             
        if 'stock_quantity' in update_data:
             db_product.stock_quantity = update_data['stock_quantity']

        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{product_id}")
def delete_product(
    product_id: UUID, 
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin"]))
):
    """
    Realiza un borrado lógico (is_active=False) del producto y sus ubicaciones.
    Esto permite mantener el historial de ventas y movimientos sin errores de integridad.
    """
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Encontrar todos los productos con el mismo barcode (todas las ubicaciones)
    siblings = db.query(Product).filter(Product.barcode == db_product.barcode).all()
    
    # Validar que el stock total sea cero antes de permitir la desactivación
    total_stock = sum(s.stock_quantity for s in siblings)
    if total_stock > 0.0001: # Usamos un umbral pequeño para evitar problemas de precisión con floats
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar el producto '{db_product.name}' porque aún tiene {total_stock} unidades en stock. "
                   f"Debe rebajar el stock a cero (por ejemplo, enviándolo a mermas y eliminándolo desde allí) antes de desactivarlo."
        )
    
    try:
        for sibling in siblings:
            sibling.is_active = False
            # Opcional: Podríamos liberar la ubicación si quisiéramos que quede vacía
            # sibling.location_id = None 
        db.commit()
        return {"detail": f"Producto '{db_product.name}' desactivado correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"No se puede desactivar el producto: {str(e)}")
