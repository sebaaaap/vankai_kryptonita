"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    Users, Search, Plus, Car, Bike, Truck,
    Bus, History, ChevronRight, Phone, Mail,
    MapPin, Fingerprint, Calendar, DollarSign,
    MoreVertical, Edit, Trash2, X, Check, ArrowLeft,
    Receipt, ClipboardList, Printer, Clock, Banknote, CreditCard, ArrowLeftRight, Wrench
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from "@/components/ui/sheet";
import { DigitalServiceCard } from "./digital-service-card";
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
    const { data: customers, error, isLoading, mutate } = useSWR(
        searchTerm ? `/api/customers?q=${searchTerm}` : "/api/customers",
        () => apiService.getCustomers(searchTerm)
    );

    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
    const [history, setHistory] = useState<any>(null);
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [selectedOt, setSelectedOt] = useState<any>(null);
    const [selectedVehicleForSticker, setSelectedVehicleForSticker] = useState<any>(null);

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
            mutate();
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
            mutate();
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
                                <TabsTrigger value="ots">Historial OT</TabsTrigger>
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
                                                <div
                                                    key={v.id}
                                                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all cursor-pointer group"
                                                    onClick={() => setSelectedVehicleForSticker(v)}
                                                >
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary group-hover:text-white transition-colors">
                                                        {React.createElement(vehicleIcons[v.vehicle_type as keyof typeof vehicleIcons] || Car, { className: "w-6 h-6 text-primary group-hover:text-white" })}
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
                                <Card className="p-6 border-none shadow-sm bg-card/50">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold font-display">Historial de Ventas</h3>
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                                {history?.sales?.length || 0} Ventas Totales
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-border">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-[10px] text-muted-foreground uppercase border-b bg-muted/30 font-bold tracking-widest">
                                                <tr>
                                                    <th className="px-6 py-4">Documento</th>
                                                    <th className="px-6 py-4">Fecha / Hora</th>
                                                    <th className="px-6 py-4">Vehículo</th>
                                                    <th className="px-6 py-4">Pago</th>
                                                    <th className="px-6 py-4">Estado</th>
                                                    <th className="px-6 py-4 text-right">Monto</th>
                                                    <th className="px-6 py-4 text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {history?.sales?.length === 0 ? (
                                                    <tr><td colSpan={7} className="p-12 text-center text-muted-foreground italic">No hay ventas registradas</td></tr>
                                                ) : (
                                                    history?.sales?.map((sale: any) => (
                                                        <tr key={sale.id} className="hover:bg-muted/30 transition-colors group">
                                                            <td className="px-6 py-4 font-bold text-primary">{sale.ticket_number}</td>
                                                            <td className="px-6 py-4 text-xs">
                                                                <div className="font-medium">{new Date(sale.date).toLocaleDateString()}</div>
                                                                <div className="text-muted-foreground">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <Badge variant="outline" className="font-mono bg-white uppercase text-[10px] tracking-tight">{sale.vehicle}</Badge>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                                                    {sale.payment_method === 'efectivo' ? <Banknote className="w-3.5 h-3.5" /> :
                                                                        sale.payment_method === 'tarjeta' ? <CreditCard className="w-3.5 h-3.5" /> :
                                                                            <ArrowLeftRight className="w-3.5 h-3.5" />}
                                                                    <span className="capitalize">{sale.payment_method}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <Badge
                                                                    variant={sale.state === 'pagado' ? 'default' : sale.state === 'reembolsado' ? 'destructive' : 'secondary'}
                                                                    className={`text-[9px] uppercase font-black px-1.5 h-4.5 ${sale.state === 'pagado' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                                                                >
                                                                    {sale.state}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-slate-900">${sale.total?.toLocaleString()}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-full hover:bg-primary hover:text-white"
                                                                    onClick={() => setSelectedSale(sale)}
                                                                >
                                                                    <ChevronRight className="w-4 h-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* Work Orders Tab */}
                            <TabsContent value="ots">
                                <Card className="p-6 border-none shadow-sm bg-card/50">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold font-display">Historial de Ordenes de Trabajo (OT)</h3>
                                        <Badge variant="outline" className="bg-blue-500/5 text-blue-600 border-blue-500/20">
                                            {history?.work_orders?.length || 0} OTs Registradas
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {history?.work_orders?.length === 0 ? (
                                            <div className="col-span-2 p-12 text-center text-muted-foreground italic">No hay órdenes de trabajo registradas</div>
                                        ) : (
                                            history?.work_orders?.map((ot: any) => (
                                                <div
                                                    key={ot.id}
                                                    className="p-5 rounded-2xl border border-border bg-white hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group"
                                                    onClick={() => setSelectedOt(ot)}
                                                >
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black text-slate-500">OT-{String(ot.id).slice(0, 6).toUpperCase()}</div>
                                                        <Badge
                                                            variant={ot.state === 'finalizada' ? 'default' : 'secondary'}
                                                            className={`text-[9px] uppercase font-black ${ot.state === 'finalizada' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                                                        >
                                                            {ot.state}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                                            <Car className="w-5 h-5 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <div className="text-lg font-black font-mono tracking-tighter uppercase">{ot.vehicle}</div>
                                                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{new Date(ot.date).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div>
                                                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-1">
                                                                <span>Pago</span>
                                                                <span>{Math.round(ot.financial_progress)}%</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${ot.financial_progress}%` }} />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-1">
                                                                <span>Trabajo</span>
                                                                <span>{Math.round(ot.operational_progress)}%</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500 transition-all" style={{ width: `${ot.operational_progress}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-500">Monto Total</span>
                                                        <span className="text-base font-black text-slate-900">${ot.total?.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
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

            {/* Modal: Detalle de Venta */}
            <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white rounded-3xl">
                    {selectedSale && (
                        <>
                            <DialogHeader className="p-8 bg-slate-900 text-white border-b border-slate-800">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Receipt className="w-5 h-5 text-blue-400" />
                                            <DialogTitle className="text-2xl font-black tracking-tight">{selectedSale.ticket_number}</DialogTitle>
                                        </div>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{new Date(selectedSale.date).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' })}</p>
                                    </div>
                                    <Badge className={`${selectedSale.state === 'pagado' ? 'bg-emerald-500' : 'bg-amber-500'} text-xs font-black uppercase`}>
                                        {selectedSale.state}
                                    </Badge>
                                </div>
                            </DialogHeader>

                            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                                {/* Info Cliente / Vehículo */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cliente / RUT</label>
                                        <p className="font-bold text-slate-900">{selectedCustomer.name}</p>
                                        <p className="font-mono text-sm text-slate-500 font-medium">{selectedCustomer.rut}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Vehículo Relacionado</label>
                                        <p className="font-black text-lg text-slate-900 font-mono italic">{selectedSale.vehicle}</p>
                                    </div>
                                </div>

                                {/* Tabla de Items */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase text-slate-900 border-b pb-2">Detalle de Productos y Servicios</h4>
                                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 border-b">
                                                <tr className="text-[10px] font-black uppercase text-slate-500">
                                                    <th className="px-4 py-3 text-left">Producto / Servicio</th>
                                                    <th className="px-4 py-3 text-center">Cant.</th>
                                                    <th className="px-4 py-3 text-right">Unitario</th>
                                                    <th className="px-4 py-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedSale.items?.map((item: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3">
                                                            <div className="font-bold text-slate-900">{item.product_name}</div>
                                                            {item.discount > 0 && <span className="text-[10px] font-bold text-emerald-600">Desc. {item.discount}%</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-slate-600">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-right font-medium text-slate-600">${item.unit_price?.toLocaleString()}</td>
                                                        <td className="px-6 py-3 text-right font-black text-slate-900">${item.subtotal?.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Totales Finales */}
                                <div className="bg-slate-50 p-6 rounded-2xl space-y-3 border border-slate-200">
                                    <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                                        <span>Subtotal</span>
                                        <span>${selectedSale.subtotal?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                                        <span>IVA (19%)</span>
                                        <span>${selectedSale.tax?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xl font-black text-slate-900">
                                        <span>TOTAL PAGADO</span>
                                        <span className="text-2xl text-primary">${selectedSale.total?.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        {selectedSale.payment_method === 'efectivo' ? <Banknote className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-wider opacity-60">Medio de Pago</div>
                                        <div className="text-sm font-bold capitalize">{selectedSale.payment_method}</div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="p-6 bg-slate-50 border-t gap-2">
                                <Button variant="ghost" className="font-bold" onClick={() => setSelectedSale(null)}>Cerrar</Button>
                                <Button className="font-black bg-slate-900 hover:bg-slate-800 text-white gap-2">
                                    <Printer className="w-4 h-4" /> Reimprimir Comprobante
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal: Detalle de OT */}
            <Dialog open={!!selectedOt} onOpenChange={() => setSelectedOt(null)}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white rounded-3xl">
                    {selectedOt && (
                        <>
                            <DialogHeader className="p-8 bg-blue-900 text-white border-b border-blue-800">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Wrench className="w-5 h-5 text-blue-300" />
                                            <DialogTitle className="text-2xl font-black tracking-tight uppercase">Orden de Trabajo #{String(selectedOt.id).slice(0, 6)}</DialogTitle>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest">{new Date(selectedOt.date).toLocaleDateString('es-CL', { dateStyle: 'long' })}</p>
                                            <span className="h-1 w-1 bg-blue-400 rounded-full" />
                                            <p className="text-blue-200 text-[11px] font-bold font-mono">{selectedOt.vehicle}</p>
                                        </div>
                                    </div>
                                    <Badge className={`${selectedOt.state === 'finalizada' ? 'bg-emerald-500' : 'bg-amber-500'} text-xs font-black uppercase`}>
                                        {selectedOt.state}
                                    </Badge>
                                </div>
                            </DialogHeader>

                            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                                {/* Progresos */}
                                <div className="grid grid-cols-2 gap-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                            <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Progreso Técnico</span>
                                            <span>{Math.round(selectedOt.operational_progress)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${selectedOt.operational_progress}%` }} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Progreso de Pago</span>
                                            <span>{Math.round(selectedOt.financial_progress)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${selectedOt.financial_progress}%` }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Tabla de Items de la OT */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase text-slate-900 border-b pb-2 flex items-center gap-2">
                                        <ClipboardList className="w-4 h-4 text-slate-400" />
                                        Servicios y Repuestos de esta OT
                                    </h4>
                                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 border-b">
                                                <tr className="text-[10px] font-black uppercase text-slate-500">
                                                    <th className="px-4 py-3 text-left">Descripción</th>
                                                    <th className="px-4 py-3 text-center">Estado</th>
                                                    <th className="px-4 py-3 text-center">Pago</th>
                                                    <th className="px-4 py-3 text-right">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedOt.items?.map((item: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-4">
                                                            <div className="font-bold text-slate-900">{item.product_name}</div>
                                                            <div className="text-[10px] text-slate-500 font-medium">Cant: {item.quantity} x ${item.unit_price?.toLocaleString()}</div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            {item.done ?
                                                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-bold px-2 py-0">Listo</Badge> :
                                                                <Badge variant="outline" className="text-[10px] font-bold text-slate-400 px-2 py-0">Pendiente</Badge>
                                                            }
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            {item.is_paid ?
                                                                <span className="text-emerald-600 font-black text-[9px] uppercase tracking-wider">Pagado</span> :
                                                                <span className="text-slate-300 font-bold text-[9px] uppercase tracking-wider">Sin Pago</span>
                                                            }
                                                        </td>
                                                        <td className="px-4 py-4 text-right font-black text-slate-900">${item.subtotal?.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Gran Total OT */}
                                <div className="flex justify-between items-center p-6 bg-slate-900 text-white rounded-3xl shadow-xl">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.2em] mb-1">Inversión Final de la OT</p>
                                        <h5 className="text-xl font-medium text-slate-400">Total de Orden</h5>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-4xl font-black text-white">${selectedOt.total?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="p-6 bg-slate-50 border-t">
                                <Button variant="outline" className="font-bold border-2 rounded-xl h-12" onClick={() => setSelectedOt(null)}>Cerrar Detalle</Button>
                                <Button className="font-black bg-blue-600 hover:bg-blue-700 text-white h-12 px-8 rounded-xl shadow-lg shadow-blue-500/20 gap-2">
                                    <Printer className="w-4 h-4" /> Ver Comprobante OT
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

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

            {/* Sticker de Lubricentro (Drawer/Sheet) */}
            <Sheet open={!!selectedVehicleForSticker} onOpenChange={() => setSelectedVehicleForSticker(null)}>
                <SheetContent side="right" className="p-0 sm:max-w-md border-l-0 bg-transparent shadow-none">
                    <SheetTitle className="sr-only">Sticker de Lubricentro</SheetTitle>
                    <div className="h-full p-4">
                        {selectedVehicleForSticker && (
                            <DigitalServiceCard
                                key={selectedVehicleForSticker.id}
                                vehicle={selectedVehicleForSticker}
                                readOnly={true}
                                onSave={async (data) => {
                                    await apiService.updateVehicle(selectedVehicleForSticker.id, { service_info: data });
                                    toast.success("Información de servicio actualizada con éxito");
                                    mutate(); // Actualiza la lista de clientes SWR
                                }}
                                onClose={() => setSelectedVehicleForSticker(null)}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};
