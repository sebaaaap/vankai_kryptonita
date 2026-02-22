import api from "@/lib/api";
import {
    Product,
    SaleCreate,
    SaleResponse,
    CashSessionResponse,
    CategoryResponse
} from "@/types/api";

export const apiService = {
    // Products
    async getProducts(): Promise<Product[]> {
        const response = await api.get("/products/");
        return response.data;
    },

    async getProductByBarcode(barcode: string): Promise<Product> {
        const response = await api.get(`/pos/products/barcode/${barcode}`);
        return response.data;
    },

    // Categories
    async getCategories(): Promise<CategoryResponse[]> {
        const response = await api.get("/categories/");
        return response.data;
    },

    // Sales
    async createSale(saleData: SaleCreate): Promise<SaleResponse> {
        const response = await api.post("/pos/sales", saleData);
        return response.data;
    },

    async validateSale(ticketId: number): Promise<SaleResponse> {
        const response = await api.post(`/pos/sales/${ticketId}/validate`);
        return response.data;
    },

    async getSalesBySession(sessionId: number): Promise<SaleResponse[]> {
        const response = await api.get(`/pos/sales/session/${sessionId}`);
        return response.data;
    },

    async getSalesHistory(): Promise<SaleResponse[]> {
        const response = await api.get("/pos/sales");
        return response.data;
    },

    // Sessions
    async getActiveSession(): Promise<CashSessionResponse | null> {
        try {
            const response = await api.get("/sessions/active");
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) return null;
            throw error;
        }
    },

    async openSession(initial_cash: number, notes?: string): Promise<CashSessionResponse> {
        const response = await api.post("/sessions/open", { initial_cash, notes });
        return response.data;
    },

    async closeSession(sessionId: number, finalCash: number, notes?: string): Promise<CashSessionResponse> {
        const response = await api.post(`/sessions/${sessionId}/validate_and_close`, {
            final_cash: finalCash,
            notes
        });
        return response.data;
    },

    async createRefund(refundData: any): Promise<{ credit_note: SaleResponse, original_ticket: SaleResponse }> {
        const response = await api.post("/pos/refunds", refundData);
        return response.data;
    },

    // Reports
    async getReportSales(startDate?: string, endDate?: string): Promise<any> {
        const params: any = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        const response = await api.get("/reports/sales/summary", { params });
        return response.data;
    },

    async getReportProfitability(startDate?: string, endDate?: string): Promise<any> {
        const params: any = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        const response = await api.get("/reports/sales/profitability", { params });
        return response.data;
    },

    async getReportCash(): Promise<any> {
        const response = await api.get("/reports/sales/cash_reports");
        return response.data;
    },

    async getReportInventory(category?: string, aisle?: string): Promise<any> {
        const params: any = {};
        if (category && category !== "all") params.category = category;
        if (aisle && aisle !== "all") params.aisle = aisle;
        const response = await api.get("/reports/inventory/summary", { params });
        return response.data;
    },

    async getReportPurchases(startDate?: string, endDate?: string): Promise<any> {
        const params: any = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        const response = await api.get("/reports/purchases/summary", { params });
        return response.data;
    },

    // Customers
    async getCustomers(q?: string): Promise<any[]> {
        const params: any = {};
        if (q) params.q = q;
        const response = await api.get("/customers/", { params });
        return response.data;
    },

    async createCustomer(data: any): Promise<any> {
        const response = await api.post("/customers/", data);
        return response.data;
    },

    async updateCustomer(id: number, data: any): Promise<any> {
        const response = await api.put(`/customers/${id}`, data);
        return response.data;
    },

    async getCustomerHistory(id: number): Promise<any> {
        const response = await api.get(`/customers/${id}/history`);
        return response.data;
    },

    // Vehicles
    async addVehicle(customerId: number, data: any): Promise<any> {
        const response = await api.post(`/customers/${customerId}/vehicles`, data);
        return response.data;
    },

    async updateVehicle(id: number, data: any): Promise<any> {
        const response = await api.put(`/customers/vehicles/${id}`, data);
        return response.data;
    }
};
