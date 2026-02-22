"use client";

import React, { useState } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiService } from "@/services/apiService";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";

interface PdvQuickCustomerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (customer: any) => void;
}

export function PdvQuickCustomer({ open, onOpenChange, onSuccess }: PdvQuickCustomerProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        rut: "",
        phone: "",
        email: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.rut) {
            toast.error("Nombre y RUT son obligatorios");
            return;
        }

        setLoading(true);
        try {
            const customer = await apiService.createCustomer(formData);
            toast.success("Cliente creado correctamente");
            onSuccess(customer);
            onOpenChange(false);
            setFormData({ name: "", rut: "", phone: "", email: "" });
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al crear cliente");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" />
                        Creación Rápida de Cliente
                    </DialogTitle>
                    <DialogDescription>
                        Ingresa los datos básicos para registrar al cliente en caja.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre Completo</Label>
                        <Input
                            id="name"
                            placeholder="Juan Pérez"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="rut">RUT</Label>
                        <Input
                            id="rut"
                            placeholder="12.345.678-9"
                            value={formData.rut}
                            onChange={(e) => setFormData({ ...formData, rut: e.target.value.toUpperCase() })}
                            required
                            className="font-mono uppercase"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input
                                id="phone"
                                placeholder="+569..."
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="juan@gmail.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Crear y Seleccionar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
