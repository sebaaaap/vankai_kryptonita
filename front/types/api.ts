export enum SaleState {
    DRAFT = "borrador",
    VALIDATED = "validado",
    PAID = "pagado",
    REFUNDED = "reembolsado",
    CANCELLED = "cancelado",
}

export enum PaymentMethod {
    CASH = "efectivo",
    CARD = "tarjeta",
    TRANSFER = "transferencia",
    MIXED = "mixto",
}

export interface Product {
    id: number;
    name: string;
    barcode: string;
    price: number;
    cost: number;
    category?: string;
    category_id?: number;
    image_path?: string;
    internal_reference?: string;
    uom: string;
    stock_quantity: number;
    is_active: boolean;
}

export interface SaleItemCreate {
    product_id: number;
    quantity: number;
    price: number;
    discount_percent: number;
}

export interface PaymentCreate {
    payment_method: PaymentMethod;
    amount: number;
    reference?: string;
}

export interface SaleCreate {
    items: SaleItemCreate[];
    payments: PaymentCreate[];
    session_id?: number;
}

export interface SaleItemResponse {
    id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    subtotal: number;
}

export interface SaleResponse {
    id: number;
    ticket_number: string;
    date_created: string;
    date_validated?: string;
    state: SaleState;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    payment_method: string;
    session_id?: number;
    return_to_stock: boolean;
    original_ticket_id?: number;
    items: SaleItemResponse[];
    payments: any[];
}

export interface CashSessionResponse {
    id: number;
    name: string;
    start_time: string;
    end_time?: string;
    initial_cash: number;
    final_cash?: number;
    expected_cash: number;
    difference: number;
    total_sales_cash: number;
    total_sales_card: number;
    total_sales_transfer: number;
    is_open: boolean;
    user_id?: string;
    notes?: string;
}

export interface CategoryResponse {
    id: number;
    name: string;
    code?: string;
    color?: string;
}
