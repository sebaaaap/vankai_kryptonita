"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    Users, Search, Plus, Car, Bike, Truck,
    Bus, History, ChevronRight, Phone, Mail,
    MapPin, Fingerprint, Calendar, DollarSign,
    MoreVertical, Edit, Trash2, X, Check, ArrowLeft
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { apiService } from "@/services/apiService";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

const vehicleIcons = {
    automovil: Car,
    motocicleta: Bike,
    camion: Truck,
    furgon: Bus,
    camioneta: Truck,
    otro: MoreVertical
};

interface CustomersModuleProps {
    onBack?: () => void;
}

export default function CustomersModule({ onBack }: CustomersModuleProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const { data: customers, error, isLoading } = useSWR(
        searchTerm ? `/api/customers?q=${searchTerm}` : "/api/customers",
        () => apiService.getCustomers(searchTerm)
    );

    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
    const [history, setHistory] = useState<any>(null);

    // Form states
    const [newCustomer, setNewCustomer] = useState({
        name: "",
        rut: "",
        phone: "",
        email: "",
        address: ""
    });

    const [newVehicle, setNewVehicle] = useState({
        license_plate: "",
        brand: "",
        model: "",
        year: new Date().getFullYear(),
        vehicle_type: "automovil",
        color: ""
    });

    // Fetch history when a customer is selected
    useEffect(() => {
        if (selectedCustomer) {
            apiService.getCustomerHistory(selectedCustomer.id).then(setHistory);
        } else {
            setHistory(null);
        }
    }, [selectedCustomer]);

    const handleCreateCustomer = async () => {
        try {
            if (!newCustomer.name || !newCustomer.rut) {
                toast.error("Nombre y RUT son obligatorios");
                return;
            }
            await apiService.createCustomer(newCustomer);
            toast.success("Cliente creado correctamente");
            setIsCreateModalOpen(false);
            setNewCustomer({ name: "", rut: "", phone: "", email: "", address: "" });
            mutate(searchTerm ? `/api/customers?q=${searchTerm}` : "/api/customers");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al crear cliente");
        }
    };

    const handleAddVehicle = async () => {
        try {
            if (!newVehicle.license_plate) {
                toast.error("La patente es obligatoria");
                return;
            }
            await apiService.addVehicle(selectedCustomer.id, newVehicle);
            toast.success("Vehículo agregado correctamente");
            setIsAddVehicleModalOpen(false);
            setNewVehicle({
                license_plate: "",
                brand: "",
                model: "",
                year: new Date().getFullYear(),
                vehicle_type: "automovil",
                color: ""
            });
            // Update selected customer to show new vehicle
            const updated = await apiService.getCustomers(selectedCustomer.rut);
            if (updated.length > 0) setSelectedCustomer(updated[0]);
            mutate(searchTerm ? `/api/customers?q=${searchTerm}` : "/api/customers");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al agregar vehículo");
        }
    };

    return (
        <div className="flex h-screen gap-6 p-6 overflow-hidden bg-background">
            {/* Left: Customer List */}
            <div className="flex flex-col w-1/3 min-w-[350px] gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {onBack ? (
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-muted rounded-full transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        ) : (
                            <Link href="/dashboard" className="p-2 hover:bg-muted rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                        )}
                        <h2 className="text-2xl font-bold">Clientes</h2>
                    </div>
                    <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo
                    </Button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o RUT..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Card className="flex-1 overflow-auto border-border">
                    <div className="divide-y divide-border">
                        {isLoading ? (
                            <div className="p-8 text-center text-muted-foreground italic">Cargando clientes...</div>
                        ) : customers?.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground italic">No se encontraron clientes</div>
                        ) : (
                            customers?.map((customer: any) => (
                                <div
                                    key={customer.id}
                                    onClick={() => setSelectedCustomer(customer)}
                                    className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${selectedCustomer?.id === customer.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                                >
                                    <div className="flex items-center justify-between font-semibold">
                                        <span>{customer.name}</span>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                                        <Fingerprint className="w-3 h-3" />
                                        {customer.rut}
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {customer.vehicles?.slice(0, 3).map((v: any, i: number) => (
                                            <Badge key={i} variant="secondary" className="text-[10px] py-0 px-1.5 h-5 font-bold">
                                                {v.license_plate}
                                            </Badge>
                                        ))}
                                        {customer.vehicles?.length > 3 && (
                                            <span className="text-[10px] text-muted-foreground">+{customer.vehicles.length - 3}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Right: Customer Detail */}
            <div className="flex-1 overflow-auto">
                {selectedCustomer ? (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold">{selectedCustomer.name}</h1>
                                <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Fingerprint className="w-4 h-4" />
                                        <span className="font-mono uppercase">{selectedCustomer.rut}</span>
                                    </div>
                                    {selectedCustomer.phone && (
                                        <div className="flex items-center gap-1">
                                            <Phone className="w-4 h-4" />
                                            <span>{selectedCustomer.phone}</span>
                                        </div>
                                    )}
                                    {selectedCustomer.email && (
                                        <div className="flex items-center gap-1">
                                            <Mail className="w-4 h-4" />
                                            <span>{selectedCustomer.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4 mr-2" />
                                Editar Perfil
                            </Button>
                        </div>

                        <Tabs defaultValue="overview" className="space-y-6">
                            <TabsList className="bg-muted border border-border">
                                <TabsTrigger value="overview">Resumen</TabsTrigger>
                                <TabsTrigger value="vehicles">Vehículos ({selectedCustomer.vehicles?.length})</TabsTrigger>
                                <TabsTrigger value="history">Historial de Ventas</TabsTrigger>
                            </TabsList>

                            {/* Overview Tab */}
                            <TabsContent value="overview" className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <Card className="p-4 bg-primary/5 border-primary/20">
                                        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Total Invertido</div>
                                        <div className="text-2xl font-bold">${history?.summary?.total_amount?.toLocaleString() || '0'}</div>
                                    </Card>
                                    <Card className="p-4 bg-amber-500/5 border-amber-500/20">
                                        <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Visitas Realizadas</div>
                                        <div className="text-2xl font-bold">{history?.summary?.total_count || '0'}</div>
                                    </Card>
                                    <Card className="p-4 bg-emerald-500/5 border-emerald-500/20">
                                        <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Última Visita</div>
                                        <div className="text-2xl font-bold">
                                            {history?.sales?.[0] ? new Date(history.sales[0].date).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </Card>
                                </div>

                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Car className="w-5 h-5 text-primary" />
                                            Vehículos Registrados
                                        </h3>
                                        <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/5" onClick={() => setIsAddVehicleModalOpen(true)}>
                                            <Plus className="w-4 h-4 mr-1" /> Agregar Vehículo
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedCustomer.vehicles?.length === 0 ? (
                                            <div className="col-span-2 text-center py-8 text-muted-foreground italic">No hay vehículos registrados</div>
                                        ) : (
                                            selectedCustomer.vehicles.map((v: any) => (
                                                <div key={v.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                                        {React.createElement(vehicleIcons[v.vehicle_type as keyof typeof vehicleIcons] || Car, { className: "w-6 h-6 text-primary" })}
                                                    </div>
                                                    <div>
                                                        <div className="text-lg font-black font-mono tracking-tighter uppercase">{v.license_plate}</div>
                                                        <div className="text-xs text-muted-foreground uppercase">{v.brand} {v.model} {v.year}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* Vehicles Tab */}
                            <TabsContent value="vehicles">
                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold">Administrar Vehículos</h3>
                                        <Button size="sm" onClick={() => setIsAddVehicleModalOpen(true)}>
                                            <Plus className="w-4 h-4 mr-2" /> Agregar Vehículo
                                        </Button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-muted-foreground uppercase border-b">
                                                <tr>
                                                    <th className="px-4 py-3">Tipo</th>
                                                    <th className="px-4 py-3">Patente</th>
                                                    <th className="px-4 py-3">Marca/Modelo</th>
                                                    <th className="px-4 py-3">Color/Año</th>
                                                    <th className="px-4 py-3 text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {selectedCustomer.vehicles?.map((v: any) => (
                                                    <tr key={v.id} className="hover:bg-muted/30">
                                                        <td className="px-4 py-3 capitalize">
                                                            <div className="flex items-center gap-2">
                                                                {React.createElement(vehicleIcons[v.vehicle_type as keyof typeof vehicleIcons] || Car, { className: "w-4 h-4" })}
                                                                {v.vehicle_type}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 font-mono font-bold uppercase">{v.license_plate}</td>
                                                        <td className="px-4 py-3 uppercase">{v.brand} {v.model}</td>
                                                        <td className="px-4 py-3">{v.color || '-'} / {v.year}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* History Tab */}
                            <TabsContent value="history">
                                <Card className="p-6">
                                    <h3 className="text-xl font-bold mb-6">Historial de Ventas Estilo Odoo</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-muted-foreground uppercase border-b bg-muted/20">
                                                <tr>
                                                    <th className="px-4 py-3">ID Venta</th>
                                                    <th className="px-4 py-3">Fecha</th>
                                                    <th className="px-4 py-3">Vehículo</th>
                                                    <th className="px-4 py-3">Estado</th>
                                                    <th className="px-4 py-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {history?.sales?.length === 0 ? (
                                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground italic">No hay ventas registradas</td></tr>
                                                ) : (
                                                    history?.sales?.map((sale: any) => (
                                                        <tr key={sale.id} className="hover:bg-muted/30">
                                                            <td className="px-4 py-3 font-semibold">{sale.ticket_number}</td>
                                                            <td className="px-4 py-3">{new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                            <td className="px-4 py-3 font-mono font-bold uppercase">{sale.vehicle}</td>
                                                            <td className="px-4 py-3 text-xs capitalize italic text-muted-foreground">{sale.state}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-lg">${sale.total.toLocaleString()}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Users className="w-16 h-16 opacity-10 mb-4" />
                        <p className="text-lg font-medium">Selecciona un cliente para ver su detalle</p>
                        <p className="text-sm">Puedes buscar clientes por nombre o RUT en el panel izquierdo</p>
                    </div>
                )}
            </div>

            {/* Modal: Create Customer */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
                        <DialogDescription>
                            Ingresa los datos del cliente para comenzar su historial de servicio.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Nombre</label>
                            <Input
                                className="col-span-3"
                                value={newCustomer.name}
                                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">RUT</label>
                            <Input
                                className="col-span-3 font-mono"
                                value={newCustomer.rut}
                                onChange={(e) => setNewCustomer({ ...newCustomer, rut: e.target.value.toUpperCase() })}
                                placeholder="Ej: 12.345.678-9"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Teléfono</label>
                            <Input
                                className="col-span-3"
                                value={newCustomer.phone}
                                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                placeholder="+56 9 ..."
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Email</label>
                            <Input
                                className="col-span-3"
                                value={newCustomer.email}
                                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                placeholder="ejemplo@email.com"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Dirección</label>
                            <Input
                                className="col-span-3"
                                value={newCustomer.address}
                                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                placeholder="Av. Los Carrera #123"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateCustomer}>Crear Cliente</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Add Vehicle */}
            <Dialog open={isAddVehicleModalOpen} onOpenChange={setIsAddVehicleModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Agregar Vehículo a {selectedCustomer?.name}</DialogTitle>
                        <DialogDescription>
                            Registra un nuevo vehículo para llevar su trazabilidad de servicio.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Patente</label>
                            <Input
                                className="col-span-3 font-mono font-bold uppercase text-lg"
                                value={newVehicle.license_plate}
                                onChange={(e) => setNewVehicle({ ...newVehicle, license_plate: e.target.value.toUpperCase() })}
                                placeholder="ABCD12 o AB1234"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Tipo</label>
                            <div className="col-span-3">
                                <Select
                                    value={newVehicle.vehicle_type}
                                    onValueChange={(v) => setNewVehicle({ ...newVehicle, vehicle_type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="automovil">Automóvil</SelectItem>
                                        <SelectItem value="motocicleta">Motocicleta</SelectItem>
                                        <SelectItem value="camion">Camión</SelectItem>
                                        <SelectItem value="furgon">Furgón / Bus</SelectItem>
                                        <SelectItem value="camioneta">Camioneta (Pickup)</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Marca</label>
                            <Input
                                className="col-span-3"
                                value={newVehicle.brand}
                                onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                                placeholder="Ej: Toyota"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Modelo</label>
                            <Input
                                className="col-span-3"
                                value={newVehicle.model}
                                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                                placeholder="Ej: Corolla"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Año</label>
                            <Input
                                type="number"
                                className="col-span-3"
                                value={newVehicle.year}
                                onChange={(e) => setNewVehicle({ ...newVehicle, year: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Color</label>
                            <Input
                                className="col-span-3"
                                value={newVehicle.color}
                                onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                                placeholder="Ej: Gris Metálico"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddVehicleModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddVehicle}>Confirmar Registro</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
