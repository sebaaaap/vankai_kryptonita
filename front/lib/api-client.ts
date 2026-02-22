import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

export async function apiRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T | null> {
    const { params, ...customOptions } = options;

    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }

    const headers = {
        "Content-Type": "application/json",
        ...customOptions.headers,
    };

    try {
        const response = await fetch(url, {
            ...customOptions,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.detail || `Error: ${response.statusText}`;
            toast.error(message);
            return null;
        }

        if (response.status === 204) {
            return {} as T;
        }

        return await response.json();
    } catch (error) {
        toast.error("Error de conexión con el servidor");
        console.error("API Request Error:", error);
        return null;
    }
}

export const api = {
    get: <T>(endpoint: string, params?: Record<string, string>) =>
        apiRequest<T>(endpoint, { method: "GET", params }),

    post: <T>(endpoint: string, body: any) =>
        apiRequest<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),

    put: <T>(endpoint: string, body: any) =>
        apiRequest<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),

    delete: <T>(endpoint: string) =>
        apiRequest<T>(endpoint, { method: "DELETE" }),

    patch: <T>(endpoint: string, body: any) =>
        apiRequest<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
};
