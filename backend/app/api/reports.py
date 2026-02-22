from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc, extract
from typing import List, Optional
from datetime import datetime, timedelta
from app.db.session import get_db
from app.models.base import (
    Product, ProductCategory, StorageLocation, 
    Ticket, SaleItem, SaleState, Payment, PaymentMethod,
    Purchase, PurchaseItem, Supplier, PurchaseState,
    CashSession, InventoryMovement, MovementType
)

router = APIRouter()

# ── SALES REPORTS ─────────────────────────────────────────────────────────────

@router.get("/sales/summary")
def get_sales_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    if not start_date:
        start_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    if not end_date:
        end_date = datetime.utcnow()

    # Base query for VALIDATED tickets
    query = db.query(Ticket).filter(
        Ticket.date_created >= start_date,
        Ticket.date_created <= end_date,
        Ticket.state == SaleState.VALIDATED
    )

    # 1. Gross Sales
    gross_sales = query.with_entities(func.sum(Ticket.total_amount)).scalar() or 0.0

    # 2. Avg Ticket
    total_tickets = query.count()
    avg_ticket = gross_sales / total_tickets if total_tickets > 0 else 0.0

    # 3. Digital Payments (Card + Transfer)
    digital_sales = db.query(func.sum(Payment.amount)).join(Ticket).filter(
        Ticket.date_created >= start_date,
        Ticket.date_created <= end_date,
        Ticket.state == SaleState.VALIDATED,
        Payment.payment_method.in_([PaymentMethod.CARD, PaymentMethod.TRANSFER])
    ).scalar() or 0.0

    # 4. Sales by Hour
    # Extract hour from date_created
    # SQLite uses strftime, Postgres uses extract. Assuming SQLite based on context but let's try to be generic or catch.
    # User mentioned SQLite/Postgres hybrid. Let's use Python processing for simple grouping if volume isn't huge, 
    # or minimal SQL. Grouping by hour in SQL is DB-specific.
    # For now, let's fetch essential data and process in Python for "Sales by Hour" to be safe across DBs.
    hourly_data_raw = query.with_entities(Ticket.date_created, Ticket.total_amount).all()
    
    sales_by_hour = {}
    for t in hourly_data_raw:
        hour = t.date_created.hour
        hour_label = f"{hour:02d}:00"
        sales_by_hour[hour_label] = sales_by_hour.get(hour_label, 0) + t.total_amount
    
    # Fill missing hours
    chart_data = []
    # Range 8 to 22
    for h in range(8, 23):
        label = f"{h:02d}:00"
        chart_data.append({"hour": label, "ventas": sales_by_hour.get(label, 0)})

    # 5. Recent Transactions
    transactions = query.order_by(desc(Ticket.date_created)).limit(10).all()
    trans_list = []
    for t in transactions:
        # Determine main method
        method = "Mixto"
        if len(t.payments) == 1:
            method = t.payments[0].payment_method.value
        
        # Cajero logic: mock or from session
        cajero = "S/A"
        if t.session and t.session.user_id:
            cajero = t.session.user_id
        
        trans_list.append({
            "id": t.ticket_number,
            "cajero": cajero,
            "metodo": method,
            "total": t.total_amount,
            "estado": t.state.value,
            "date": t.date_created.isoformat()
        })

    return {
        "kpis": {
            "gross_sales": gross_sales,
            "avg_ticket": avg_ticket,
            "digital_sales": digital_sales,
            "total_tickets": total_tickets
        },
        "chart_data": chart_data,
        "recent_transactions": trans_list
    }

@router.get("/sales/profitability")
def get_profitability(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    # Calculates margin based on Product Cost vs Sale Price at the moment of sale
    # Ideally TicketItem has cost snapshot. If not, we use current product cost (less accurate but acceptable for simple POS)
    # Check SaleItem model... only unit_price. 
    # Valid approximation: use current product cost.
    
    if not start_date:
        start_date = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if not end_date:
        end_date = datetime.utcnow()

    items = db.query(SaleItem).join(Ticket).filter(
        Ticket.date_created >= start_date,
        Ticket.date_created <= end_date,
        Ticket.state == SaleState.VALIDATED
    ).all()

    total_sales = 0
    total_cost = 0
    
    product_stats = {} # product_id -> {sales, cost, qty, name, category}

    for item in items:
        # Cost lookup
        product = item.product
        cost = product.cost * item.quantity
        sale = item.subtotal
        
        total_sales += sale
        total_cost += cost
        
        if product.id not in product_stats:
            product_stats[product.id] = {
                "name": product.name,
                "category": product.category_rel.name if product.category_rel else "Sin Categoría",
                "sales": 0,
                "cost": 0,
                "qty": 0,
                "avg_price": 0
            }
        
        product_stats[product.id]["sales"] += sale
        product_stats[product.id]["cost"] += cost
        product_stats[product.id]["qty"] += item.quantity

    total_margin = total_sales - total_cost
    global_margin_pct = (total_margin / total_sales * 100) if total_sales > 0 else 0

    # Best Product
    best_product = None
    max_margin = -1

    detailed_products = []
    for pid, stats in product_stats.items():
        margin = stats["sales"] - stats["cost"]
        if margin > max_margin:
            max_margin = margin
            best_product = stats
        
        avg_price = stats["sales"] / stats["qty"] if stats["qty"] > 0 else 0
        avg_cost = stats["cost"] / stats["qty"] if stats["qty"] > 0 else 0
        
        detailed_products.append({
            "descripcion": stats["name"],
            "categoria": stats["category"],
            "costo": avg_cost,
            "venta": avg_price,
            "margen": margin,
            "unidades": stats["qty"]
        })

    # Sort detailed items by margin contribution
    detailed_products.sort(key=lambda x: x["margen"], reverse=True)

    # Category margins for chart
    cat_stats = {}
    for p in detailed_products:
        cat = p["categoria"]
        if cat not in cat_stats:
            cat_stats[cat] = {"sales": 0, "cost": 0}
        cat_stats[cat]["sales"] += p["venta"] # This logic in chart was 'Avg Price' vs 'Avg Cost'? Or Total Volume?
        # The mock chart showed comparison of Unit Cost vs Unit Price per category? Or Aggregated?
        # Let's do Aggregated totals for bar chart to show volume + margin
        # Or better: Average Cost vs Average Price per Category
        cat_stats[cat]["sales"] += (p["venta"] * p["unidades"])
        cat_stats[cat]["cost"] += (p["cost"] * p["unidades"])

    chart_data = []
    for cat, data in cat_stats.items():
        # To get "Avg" we assume total units. 
        # But for the chart "Costo de Compra vs Precio de Venta" usually implies per unit or normalized.
        # Let's send totals and Frontend can label "Total Cost vs Total Sales" or we normalize.
        # Let's normalize by just comparing the totals to see "Structure".
        chart_data.append({
            "categoria": cat,
            "costo": data["cost"],
            "venta": data["sales"]
        })

    return {
        "kpis": {
            "total_margin": total_margin,
            "global_margin_pct": global_margin_pct,
            "best_product": best_product["name"] if best_product else "N/A",
            "best_product_margin": ((best_product["sales"] - best_product["cost"])/best_product["sales"]*100) if best_product and best_product["sales"] > 0 else 0
        },
        "chart_data": chart_data,
        "table_data": detailed_products
    }

@router.get("/sales/cash_reports")
def get_cash_reports(db: Session = Depends(get_db)):
    # Summary of recent cash sessions
    sessions_db = db.query(CashSession).order_by(desc(CashSession.start_time)).limit(10).all()
    
    data = []
    total_diff = 0
    cash_in_hand = 0
    
    for s in sessions_db:
        diff = s.difference or 0
        total_diff += diff
        # If open, cash is what we have so far (expected) or initial?
        # Let's assume passed closed sessions mainly.
        cash_in_hand += (s.final_cash or 0)
        
        data.append({
            "usuario": s.user_id or "Anónimo",
            "caja": s.name,
            "aperturaHora": s.start_time.strftime("%H:%M"),
            "aperturaMonto": s.initial_cash,
            "cierreHora": s.end_time.strftime("%H:%M") if s.end_time else "En curso",
            "cierreMonto": s.final_cash or 0,
            "diferencia": diff
        })
        
    return {
        "kpis": {
            "cash_in_hand": cash_in_hand, # This logic might need refinement for "Currently open" vs "Closed history"
            "total_difference": total_diff
        },
        "sessions": data
    }


# ── INVENTORY REPORTS ─────────────────────────────────────────────────────────

@router.get("/inventory/summary")
def get_inventory_summary(
    aisle: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # Query Products
    q = db.query(Product).filter(Product.is_active == True)
    
    if category and category != "all":
        q = q.join(ProductCategory).filter(ProductCategory.name == category)
    
    # Filter by aisle (Location.zone or path?)
    # Model: StorageLocation has zone, path. 
    # Aisle usually is zone or part of path.
    if aisle and aisle != "all":
        q = q.join(StorageLocation).filter(StorageLocation.path.contains(aisle))

    products = q.all()
    
    total_valuation = 0
    low_stock_count = 0
    occupied_locs = set()
    
    # Audit Table Data & Chart Data
    audit_list = []
    cat_distribution = {}
    
    for p in products:
        val = p.stock_quantity * p.cost
        total_valuation += val
        
        if p.stock_quantity <= p.min_stock:
            low_stock_count += 1
            
        if p.location:
            occupied_locs.add(p.location.id)
            coord = p.location.name # e.g. "A-01-L1"
        else:
            coord = "Sin Ubicación"
            
        cat_name = p.category_rel.name if p.category_rel else "Sin Categoría"
        cat_color = p.category_rel.color if p.category_rel else "#ccc"
        
        cat_distribution.setdefault(cat_name, {"val": 0, "color": cat_color})
        cat_distribution[cat_name]["val"] += p.stock_quantity
        
        audit_list.append({
            "name": p.name,
            "category": cat_name,
            "coord": coord,
            "stock": p.stock_quantity,
            "minStock": p.min_stock,
            "aisle": "N/A" # Extract if needed
        })
        
    donut_data = [
        {"name": k, "value": v["val"], "fill": v["color"]} 
        for k, v in cat_distribution.items()
    ]
    
    return {
        "kpis": {
            "total_valuation": total_valuation,
            "low_stock": low_stock_count,
            "occupied_locations": len(occupied_locs)
        },
        "donut_data": donut_data,
        "audit_table": audit_list
    }

# ── PURCHASES REPORTS ─────────────────────────────────────────────────────────

@router.get("/purchases/summary")
def get_purchases_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    if not start_date:
        start_date = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if not end_date:
        end_date = datetime.utcnow()
    
    purchases_q = db.query(Purchase).filter(
        Purchase.state == PurchaseState.CONFIRMED,
        Purchase.date_created >= start_date,
        Purchase.date_created <= end_date
    )
    
    # Calculate total cost from items (since Purchase might not sum it up in a column? Purchase has total_cost)
    total_invested = sum(p.total_cost for p in purchases_q.all())
    
    # Pending
    pending_count = db.query(Purchase).filter(Purchase.state == PurchaseState.DRAFT).count()
    
    # Top Supplier
    # Group by supplier
    suppliers_vol = {}
    all_confirmed = db.query(Purchase).filter(Purchase.state == PurchaseState.CONFIRMED).all()
    for p in all_confirmed:
        s_name = p.supplier.name if p.supplier else "Desconocido"
        suppliers_vol[s_name] = suppliers_vol.get(s_name, 0) + p.total_cost
        
    sorted_suppliers = sorted(suppliers_vol.items(), key=lambda x: x[1], reverse=True)
    top_supplier = {"name": "N/A", "volume": 0}
    if sorted_suppliers:
        top_supplier = {"name": sorted_suppliers[0][0], "volume": sorted_suppliers[0][1]}
        
    # Chart Data (Top 5)
    chart_data = [{"name": s[0], "volume": s[1]} for s in sorted_suppliers[:5]]
    
    # Recent Movements (Items received)
    # Join PurchaseItem -> Purchase -> Supplier
    recent_items = db.query(PurchaseItem).join(Purchase).order_by(desc(Purchase.date_created)).limit(20).all()
    movements = []
    for item in recent_items:
        movements.append({
            "fecha": item.purchase.date_created.strftime("%Y-%m-%d"),
            "proveedor": item.purchase.supplier.name if item.purchase.supplier else "?",
            "producto": item.product.name if item.product else "?",
            "cantidad": item.quantity,
            "costoUnit": item.unit_cost
        })
        
    return {
        "kpis": {
            "total_invested": total_invested,
            "pending_orders": pending_count,
            "top_supplier": top_supplier
        },
        "chart_data": chart_data,
        "movements": movements
    }
