from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Enum, Text
from sqlalchemy.orm import relationship, declarative_base
import sqlalchemy.orm as sqlalchemy_orm
from datetime import datetime
import enum

Base = declarative_base()

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
    """Estado de la venta siguiendo el flujo de Odoo"""
    DRAFT = "borrador"           # Carrito activo, no validado
    VALIDATED = "validado"       # Venta confirmada, inventario ajustado
    PAID = "pagado"             # Totalmente pagada
    REFUNDED = "reembolsado"    # Reembolsada (nota de crédito)
    CANCELLED = "cancelado"     # Cancelada sin afectar inventario

class PaymentMethod(enum.Enum):
    CASH = "efectivo"
    CARD = "tarjeta"
    TRANSFER = "transferencia"
    MIXED = "mixto"

class RefundReason(enum.Enum):
    """Razón del reembolso para trazabilidad"""
    RETURN_TO_STOCK = "devolucion_stock"      # Producto regresa al inventario
    DAMAGED = "producto_danado"                # Producto dañado (merma)
    CUSTOMER_ERROR = "error_cliente"           # Error del cliente
    SYSTEM_ERROR = "error_sistema"             # Error del sistema

class StorageLocation(Base):
    __tablename__ = "storage_locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # Ej: A-01-L1
    
    # Atributos de Matriz de Coordenadas
    zone = Column(String, nullable=True)     # Ej: Pasillo A
    side = Column(String, nullable=True)     # L (Left/Izquierdo) o R (Right/Derecho)
    column = Column(Integer, nullable=True)  # Número de estante
    level = Column(Integer, nullable=True)   # Nivel 1-7
    
    parent_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    path = Column(String, index=True) # "Pasillo A/01/L1"
    allows_multiple_products = Column(Boolean, default=True, nullable=False) # Flag para permitir múltiples SKU o no
    
    # Relación recursiva
    children = relationship("StorageLocation", backref=sqlalchemy_orm.backref("parent", remote_side=[id]))
    products = relationship("Product", back_populates="location")

class ProductCategory(Base):
    __tablename__ = "product_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, nullable=True) # Código Hexadecimal para la UI
    parent_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)
    
    products = relationship("Product", back_populates="category_rel")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    internal_reference = Column(String, index=True, nullable=True) # Referencia interna técnica
    barcode = Column(String, index=True, nullable=False)
    price = Column(Float, nullable=False) # Precio Venta
    cost = Column(Float, nullable=False)  # Costo
    
    # Unidad de Medida (UoM)
    uom = Column(String, default="unidades") # unidades, kg, L, etc.
    
    product_type = Column(Enum(ProductType), default=ProductType.STORABLE)
    location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)
    category = Column(String, index=True, nullable=True) # Mantenemos por compatibilidad o lo migramos
    
    stock_quantity = Column(Float, default=0, nullable=False) # Cambiamos a Float para Kg/L
    min_stock = Column(Float, default=5, nullable=False)
    image_path = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    location = relationship("StorageLocation", back_populates="products")
    category_rel = relationship("ProductCategory", back_populates="products")
    
    movement_items = relationship("InventoryMovementItem", back_populates="product")
    sale_items = relationship("SaleItem", back_populates="product")
    purchase_items = relationship("PurchaseItem", back_populates="product")

class CashSession(Base):
    """
    Sesión de Caja - Concepto clave de Odoo
    Los movimientos de inventario NO son definitivos hasta que la venta se valida
    """
    __tablename__ = "cash_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Ej: "Sesión 2026-02-07 - Cajero Juan"
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True)
    
    # Control de efectivo
    initial_cash = Column(Float, default=0.0, nullable=False)
    final_cash = Column(Float, nullable=True)  # Lo que cuenta el cajero al cerrar
    expected_cash = Column(Float, default=0.0)  # Lo que debería haber según el sistema
    
    # Totales por método de pago
    total_sales_cash = Column(Float, default=0.0)
    total_sales_card = Column(Float, default=0.0)
    total_sales_transfer = Column(Float, default=0.0)
    
    # Diferencia (discrepancia)
    difference = Column(Float, default=0.0)  # final_cash - expected_cash
    
    user_id = Column(String, nullable=True)
    is_open = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)  # Observaciones del cierre
    
    # Relaciones
    tickets = relationship("Ticket", back_populates="session")

class VehicleType(enum.Enum):
    automovil = "automovil"
    motocicleta = "motocicleta"
    camion = "camion"
    furgon = "furgon"
    camioneta = "camioneta"
    otro = "otro"

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    rut = Column(String, unique=True, index=True, nullable=False) # Rol Único Tributario (Chile)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="customer")

class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True, index=True)
    license_plate = Column(String, unique=True, index=True, nullable=False) # Patente
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    vehicle_type = Column(Enum(VehicleType), default=VehicleType.automovil)
    color = Column(String, nullable=True)
    vin = Column(String, nullable=True) # Vehicle Identification Number
    
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    owner = relationship("Customer", back_populates="vehicles")
    tickets = relationship("Ticket", back_populates="vehicle")

class Ticket(Base):
    """
    Ticket/Venta - Representa una transacción de venta
    Sigue el flujo: DRAFT -> VALIDATED -> PAID
    """
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String, unique=True, index=True, nullable=False)  # Ej: "T-2026-0001"
    date_created = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_validated = Column(DateTime, nullable=True)  # Cuando se confirma la venta
    
    # Estado de la venta
    state = Column(Enum(SaleState), default=SaleState.DRAFT, nullable=False)
    
    # Totales
    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)  # IVA 19%
    total_amount = Column(Float, default=0.0)
    
    # Método de pago principal (para compatibilidad)
    payment_method = Column(String, default="CASH")
    
    # Relación con sesión
    session_id = Column(Integer, ForeignKey("cash_sessions.id"), nullable=True, index=True)
    session = relationship("CashSession", back_populates="tickets")
    
    # Relación con cliente y vehículo
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True, index=True)
    
    customer = relationship("Customer", back_populates="tickets")
    vehicle = relationship("Vehicle", back_populates="tickets")
    
    # Reembolsos
    is_refunded = Column(Boolean, default=False)
    refund_ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)  # Nota de crédito vinculada
    original_ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)  # Venta original
    refund_reason = Column(Enum(RefundReason), nullable=True)
    return_to_stock = Column(Boolean, default=True)
    
    # Relaciones
    items = relationship("SaleItem", back_populates="ticket", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="ticket", cascade="all, delete-orphan")

class SaleItem(Base):
    """Item de venta - Línea de producto en un ticket"""
    __tablename__ = "sale_items"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    
    quantity = Column(Float, nullable=False)  # Float para soportar kg, litros
    unit_price = Column(Float, nullable=False)
    discount_percent = Column(Float, default=0.0)  # Descuento en %
    subtotal = Column(Float, nullable=False)
    
    # Relaciones
    ticket = relationship("Ticket", back_populates="items")
    product = relationship("Product", back_populates="sale_items")

class Payment(Base):
    """
    Pagos - Soporta pagos divididos (Split Payments)
    Una venta puede tener múltiples pagos
    """
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    amount = Column(Float, nullable=False)
    
    # Información adicional
    reference = Column(String, nullable=True)  # Número de transacción, voucher, etc.
    date_created = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relaciones
    ticket = relationship("Ticket", back_populates="payments")

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    tax_id = Column(String, index=True, nullable=True) # RUT/NIT
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    purchases = relationship("Purchase", back_populates="supplier")

class Purchase(Base):
    __tablename__ = "purchases"
    id = Column(Integer, primary_key=True, index=True)
    date_created = Column(DateTime, default=datetime.utcnow)
    
    # Relación con proveedor
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    supplier = relationship("Supplier", back_populates="purchases")
    
    # Estado de la compra (similar a Odoo)
    state = Column(Enum(PurchaseState), default=PurchaseState.DRAFT, nullable=False)
    
    invoice_number = Column(String, nullable=True)
    subtotal_net = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0) # IVA 19%
    total_cost = Column(Float, default=0.0)
    notes = Column(String, nullable=True)  # Observaciones
    items = relationship("PurchaseItem", back_populates="purchase")

class PurchaseItem(Base):
    __tablename__ = "purchase_items"
    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Float, nullable=False)
    unit_cost = Column(Float, nullable=False)
    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product", back_populates="purchase_items")

class InventoryMovement(Base):
    """
    Movimientos de Inventario - Trazabilidad total (Inventory Logs)
    Cada movimiento queda registrado para auditoría
    """
    __tablename__ = "inventory_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    type = Column(Enum(MovementType), nullable=False)
    reason = Column(String, nullable=True)
    
    # Referencia al documento origen
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"), nullable=True)
    
    user_id = Column(String, nullable=True)
    
    items = relationship("InventoryMovementItem", back_populates="movement", cascade="all, delete-orphan")

class InventoryMovementItem(Base):
    """Item de movimiento de inventario"""
    __tablename__ = "inventory_movement_items"
    
    id = Column(Integer, primary_key=True, index=True)
    movement_id = Column(Integer, ForeignKey("inventory_movements.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    
    quantity = Column(Float, nullable=False)  # Positivo para entrada, negativo para salida
    stock_before = Column(Float, nullable=False)  # Stock antes del movimiento
    stock_after = Column(Float, nullable=False)   # Stock después del movimiento
    
    movement = relationship("InventoryMovement", back_populates="items")
    product = relationship("Product", back_populates="movement_items")

    @property
    def product_name(self):
        return self.product.name if self.product else "N/A"

class UserRole(enum.Enum):
    admin = "admin"
    vendedor = "vendedor"
    inventario = "inventario"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.vendedor, nullable=False)
    is_active = Column(Boolean, default=True)

import sqlalchemy.orm
