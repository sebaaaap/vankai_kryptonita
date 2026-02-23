import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Boolean, Enum, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import sqlalchemy.orm as sqlalchemy_orm

Base = declarative_base()

class BaseModel(Base):
    __abstract__ = True

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class MovementType(enum.Enum):
    IN_PURCHASE = "entrada_compra"
    IN_RETURN = "entrada_devolucion"
    IN_ADJUSTMENT = "entrada_ajuste"
    OUT_SALE = "salida_venta"
    OUT_WASTE = "salida_merma"
    OUT_ADJUSTMENT = "salida_ajuste"
    INTERNAL_TRANSFER = "traslado_interno"

class ProductType(enum.Enum):
    STORABLE = "STORABLE"
    SERVICE = "SERVICE"
    CONSUMABLE = "CONSUMABLE"

class PurchaseState(enum.Enum):
    DRAFT = "borrador"
    CONFIRMED = "confirmado"
    CANCELLED = "cancelado"

class SaleState(enum.Enum):
    DRAFT = "borrador"
    VALIDATED = "validado"
    PAID = "pagado"
    REFUNDED = "reembolsado"
    CANCELLED = "cancelado"

class PaymentMethod(enum.Enum):
    CASH = "efectivo"
    CARD = "tarjeta"
    TRANSFER = "transferencia"
    MIXED = "mixto"

class RefundReason(enum.Enum):
    RETURN_TO_STOCK = "devolucion_stock"
    DAMAGED = "producto_danado"
    CUSTOMER_ERROR = "error_cliente"
    SYSTEM_ERROR = "error_sistema"

class StorageLocation(BaseModel):
    __tablename__ = "storage_locations"

    name = Column(String, nullable=False)
    zone = Column(String, nullable=True)
    side = Column(String, nullable=True)
    column = Column(Integer, nullable=True)
    level = Column(Integer, nullable=True)
    
    parent_id = Column(UUID(as_uuid=True), ForeignKey("storage_locations.id"), nullable=True)
    path = Column(String, index=True)
    allows_multiple_products = Column(Boolean, default=True, nullable=False)
    
    children = relationship("StorageLocation", backref=sqlalchemy_orm.backref("parent", remote_side="StorageLocation.id"))
    products = relationship("Product", back_populates="location")

class ProductCategory(BaseModel):
    __tablename__ = "product_categories"
    
    name = Column(String, unique=True, nullable=False)
    color = Column(String, nullable=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("product_categories.id"), nullable=True)
    
    products = relationship("Product", back_populates="category_rel")

class Product(BaseModel):
    __tablename__ = "products"

    name = Column(String, index=True, nullable=False)
    internal_reference = Column(String, index=True, nullable=True) # sku
    barcode = Column(String, index=True, nullable=False) # codigo_barra
    price = Column(Numeric(12, 2), nullable=False) 
    cost = Column(Numeric(12, 2), nullable=False)  
    
    uom = Column(String, default="unidades")
    
    product_type = Column(Enum(ProductType), default=ProductType.STORABLE)
    location_id = Column(UUID(as_uuid=True), ForeignKey("storage_locations.id"), nullable=True)
    
    category_id = Column(UUID(as_uuid=True), ForeignKey("product_categories.id"), nullable=True)
    category = Column(String, index=True, nullable=True)
    
    stock_quantity = Column(Numeric(12, 2), default=0, nullable=False) 
    min_stock = Column(Numeric(12, 2), default=5, nullable=False)
    image_path = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    location = relationship("StorageLocation", back_populates="products")
    category_rel = relationship("ProductCategory", back_populates="products")
    movement_items = relationship("InventoryMovementItem", back_populates="product")
    sale_items = relationship("SaleItem", back_populates="product")
    purchase_items = relationship("PurchaseItem", back_populates="product")

class CashSession(BaseModel):
    __tablename__ = "cash_sessions"
    
    name = Column(String, nullable=False)
    start_time = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    
    initial_cash = Column(Numeric(12, 2), default=0.0, nullable=False)
    final_cash = Column(Numeric(12, 2), nullable=True)
    expected_cash = Column(Numeric(12, 2), default=0.0)
    
    total_sales_cash = Column(Numeric(12, 2), default=0.0)
    total_sales_card = Column(Numeric(12, 2), default=0.0)
    total_sales_transfer = Column(Numeric(12, 2), default=0.0)
    difference = Column(Numeric(12, 2), default=0.0)
    
    user_id = Column(String, nullable=True)
    is_open = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)
    
    tickets = relationship("Ticket", back_populates="session")

class VehicleType(enum.Enum):
    automovil = "automovil"
    motocicleta = "motocicleta"
    camion = "camion"
    furgon = "furgon"
    camioneta = "camioneta"
    otro = "otro"

class Customer(BaseModel):
    __tablename__ = "customers"
    
    name = Column(String, index=True, nullable=False)
    rut = Column(String, unique=True, index=True, nullable=False) # rut_cliente
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="customer")

class Vehicle(BaseModel):
    __tablename__ = "vehicles"
    
    license_plate = Column(String, unique=True, index=True, nullable=False)
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    vehicle_type = Column(Enum(VehicleType), default=VehicleType.automovil)
    color = Column(String, nullable=True)
    vin = Column(String, nullable=True)
    
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    owner = relationship("Customer", back_populates="vehicles")
    tickets = relationship("Ticket", back_populates="vehicle")

class Ticket(BaseModel):
    __tablename__ = "tickets"
    
    ticket_number = Column(String, unique=True, index=True, nullable=False)
    date_created = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True) # fecha_venta
    date_validated = Column(DateTime(timezone=True), nullable=True)
    
    state = Column(Enum(SaleState), default=SaleState.DRAFT, nullable=False)
    
    subtotal = Column(Numeric(12, 2), default=0.0)
    tax_amount = Column(Numeric(12, 2), default=0.0)
    total_amount = Column(Numeric(12, 2), default=0.0)
    
    payment_method = Column(String, default="CASH")
    
    session_id = Column(UUID(as_uuid=True), ForeignKey("cash_sessions.id"), nullable=True, index=True)
    session = relationship("CashSession", back_populates="tickets")
    
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True, index=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True, index=True)
    
    customer = relationship("Customer", back_populates="tickets")
    vehicle = relationship("Vehicle", back_populates="tickets")
    
    is_refunded = Column(Boolean, default=False)
    refund_ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=True)
    original_ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=True)
    refund_reason = Column(Enum(RefundReason), nullable=True)
    return_to_stock = Column(Boolean, default=True)
    
    items = relationship("SaleItem", back_populates="ticket", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="ticket", cascade="all, delete-orphan")

class SaleItem(BaseModel):
    __tablename__ = "sale_items"
    
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    
    quantity = Column(Numeric(12, 2), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    discount_percent = Column(Numeric(12, 2), default=0.0)
    subtotal = Column(Numeric(12, 2), nullable=False)
    
    ticket = relationship("Ticket", back_populates="items")
    product = relationship("Product", back_populates="sale_items")

    @property
    def price(self):
        return self.unit_price

class Payment(BaseModel):
    __tablename__ = "payments"
    
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    
    reference = Column(String, nullable=True)
    date_created = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    
    ticket = relationship("Ticket", back_populates="payments")

class Supplier(BaseModel):
    __tablename__ = "suppliers"
    
    name = Column(String, index=True, nullable=False)
    tax_id = Column(String, index=True, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    purchases = relationship("Purchase", back_populates="supplier")

class Purchase(BaseModel):
    __tablename__ = "purchases"
    
    date_created = Column(DateTime(timezone=True), default=func.now())
    
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=True)
    supplier = relationship("Supplier", back_populates="purchases")
    
    state = Column(Enum(PurchaseState), default=PurchaseState.DRAFT, nullable=False)
    
    invoice_number = Column(String, nullable=True)
    subtotal_net = Column(Numeric(12, 2), default=0.0)
    tax_amount = Column(Numeric(12, 2), default=0.0)
    total_cost = Column(Numeric(12, 2), default=0.0)
    notes = Column(String, nullable=True)
    items = relationship("PurchaseItem", back_populates="purchase")

class PurchaseItem(BaseModel):
    __tablename__ = "purchase_items"
    
    purchase_id = Column(UUID(as_uuid=True), ForeignKey("purchases.id"))
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    quantity = Column(Numeric(12, 2), nullable=False)
    unit_cost = Column(Numeric(12, 2), nullable=False)
    
    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product", back_populates="purchase_items")

class InventoryMovement(BaseModel):
    __tablename__ = "inventory_movements"
    
    date = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    type = Column(Enum(MovementType), nullable=False)
    reason = Column(String, nullable=True)
    
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=True)
    purchase_id = Column(UUID(as_uuid=True), ForeignKey("purchases.id"), nullable=True)
    
    user_id = Column(String, nullable=True)
    
    items = relationship("InventoryMovementItem", back_populates="movement", cascade="all, delete-orphan")

class InventoryMovementItem(BaseModel):
    __tablename__ = "inventory_movement_items"
    
    movement_id = Column(UUID(as_uuid=True), ForeignKey("inventory_movements.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    
    quantity = Column(Numeric(12, 2), nullable=False)
    stock_before = Column(Numeric(12, 2), nullable=False)
    stock_after = Column(Numeric(12, 2), nullable=False)
    
    movement = relationship("InventoryMovement", back_populates="items")
    product = relationship("Product", back_populates="movement_items")

    @property
    def product_name(self):
        return self.product.name if self.product else "N/A"

class UserRole(enum.Enum):
    admin = "admin"
    vendedor = "vendedor"
    inventario = "inventario"

class User(BaseModel):
    __tablename__ = "users"
    
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.vendedor, nullable=False)
    is_active = Column(Boolean, default=True)
