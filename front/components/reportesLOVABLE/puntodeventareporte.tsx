"use client";

import React, { useState, useEffect } from "react";
import {
    DollarSign, Receipt, CreditCard, Banknote, AlertTriangle, RotateCcw,
    Wallet, Smartphone, BadgeDollarSign, TrendingUp, Percent, Award, Download
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ChartContainer, ChartTooltip, ChartTooltipContent
} from "@/components/ui/chart";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from "recharts";
import useSWR from "swr";
import { apiService } from "@/services/apiService";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

// ── Helpers ────────────────────────────────────────────

const fmt = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

// ── KPI Card ───────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent = "default" }: {
    icon: React.ElementType;
    label: string;
    value: string;
    sub?: string;
    accent?: "default" | "success" | "destructive";
}) {
    const accentMap = {
        default: "text-foreground",
        success: "text-[hsl(var(--success))]",
        destructive: "text-destructive",
    };
    return (
        <Card className="p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                <Icon size={14} />
                {label}
            </div>
            <span className={`text-2xl font-bold tabular-nums ${accentMap[accent]}`}>{value}</span>
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        </Card>
    );
}

// ── Skeleton Blocks ────────────────────────────────────

function KpiSkeleton() {
    return (
        <Card className="p-5 flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
        </Card>
    );
}

function ChartSkeleton() {
    return (
        <Card className="p-5">
            <Skeleton className="h-4 w-40 mb-4" />
            <Skeleton className="h-[260px] w-full rounded-xl" />
        </Card>
    );
}

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <Card className="overflow-hidden">
            <div className="p-5 pb-3"><Skeleton className="h-4 w-44" /></div>
            <Table>
                <TableHeader>
                    <TableRow>
                        {Array.from({ length: cols }).map((_, i) => (
                            <TableHead key={i}><Skeleton className="h-3 w-20" /></TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <TableRow key={r}>
                            {Array.from({ length: cols }).map((_, c) => (
                                <TableCell key={c}><Skeleton className="h-3 w-full" /></TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}

// ── Sales Report ───────────────────────────────────────

function SalesReport() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const startDate = searchParams.get("from") || "";
    const endDate = searchParams.get("to") || "";

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value);
        else params.delete(key);
        router.push(`?${params.toString()}`);
    };

    const { data, isLoading } = useSWR(
        [`/reports/sales`, startDate, endDate],
        () => apiService.getReportSales(startDate, endDate)
    );

    if (isLoading || !data) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1, 2, 3].map(i => <KpiSkeleton key={i} />)}</div>
                <ChartSkeleton />
                <TableSkeleton rows={6} cols={5} />
            </div>
        );
    }

    const { kpis, chart_data, recent_transactions } = data;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h3 className="text-lg font-semibold tracking-tight">Resumen de Ventas</h3>
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        value={startDate || ""}
                        onChange={(e) => handleFilterChange("from", e.target.value)}
                        className="w-[140px]"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                        type="date"
                        value={endDate || ""}
                        onChange={(e) => handleFilterChange("to", e.target.value)}
                        className="w-[140px]"
                    />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard icon={DollarSign} label="Venta Bruta Total" value={fmt(kpis.gross_sales)} sub={`Periodo seleccionado`} accent="success" />
                <KpiCard icon={Receipt} label="Ticket Promedio" value={fmt(kpis.avg_ticket)} sub={`${kpis.total_tickets} transacciones`} />
                <KpiCard icon={CreditCard} label="Pagos Digitales" value={fmt(kpis.digital_sales)} sub="Tarjeta / Transferencia" />
            </div>

            {/* Area Chart */}
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Flujo de Ventas por Hora</h3>
                <ChartContainer config={{ ventas: { label: "Ventas", color: "hsl(var(--success))" } }} className="h-[260px] w-full">
                    <AreaChart data={chart_data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="hour" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `$${(v).toFixed(0)}`} />
                        <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                        <Area type="monotone" dataKey="ventas" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#salesGrad)" />
                    </AreaChart>
                </ChartContainer>
            </Card>

            {/* Transactions Table */}
            <Card className="overflow-hidden">
                <div className="p-5 pb-3">
                    <h3 className="text-sm font-semibold text-foreground">Últimas Transacciones</h3>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="table-header">ID Venta</TableHead>
                            <TableHead className="table-header">Cajero</TableHead>
                            <TableHead className="table-header">Método de Pago</TableHead>
                            <TableHead className="table-header text-right">Total</TableHead>
                            <TableHead className="table-header text-center">Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recent_transactions.map((t: any) => (
                            <TableRow key={t.id}>
                                <TableCell className="font-mono text-xs">{t.id}</TableCell>
                                <TableCell className="text-sm">{t.cajero}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-sm">
                                        {/* Icon mapping simple fallback */}
                                        {t.metodo === "efectivo" ? <Wallet size={14} /> :
                                            t.metodo === "tarjeta" ? <CreditCard size={14} /> : <Smartphone size={14} />}
                                        {t.metodo}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold text-sm">{fmt(t.total)}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={t.estado === "validado" || t.estado === "Completada" ? "default" : "destructive"}
                                        className={t.estado === "validado" || t.estado === "Completada" ? "bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))]" : ""}>
                                        {t.estado}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

// ── Cash Report ────────────────────────────────────────

// ── Cash Report ────────────────────────────────────────

function CashReport() {
    const { data, isLoading } = useSWR("/reports/sales/cash_reports", apiService.getReportCash);

    if (isLoading || !data) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1, 2, 3].map(i => <KpiSkeleton key={i} />)}</div>
                <ChartSkeleton />
                <TableSkeleton rows={5} cols={5} />
            </div>
        );
    }

    const { kpis, sessions } = data;
    const { cash_in_hand, total_difference } = kpis;

    // Compute Cash by Teller for chart
    // Group sessions by user
    const tellerStats: Record<string, { expected: number, real: number }> = {};
    sessions.forEach((s: any) => {
        const u = s.usuario;
        if (!tellerStats[u]) tellerStats[u] = { expected: 0, real: 0 };
        // Expected = Cierre - Diferencia? Or Initial + Sales? 
        // Backend sessions has initial, final, diff. 
        // Expected = Final - Diff. (Since Diff = Final - Expected => Expected = Final - Diff)
        const expected = (s.cierreMonto || 0) - (s.diferencia || 0);
        tellerStats[u].expected += expected;
        tellerStats[u].real += (s.cierreMonto || 0);
    });

    const cashByTeller = Object.keys(tellerStats).map(u => ({
        cajero: u,
        esperado: tellerStats[u].expected,
        real: tellerStats[u].real
    }));

    // Mock returns
    const totalDevoluciones = 0; // Backend doesn't send this yet in cash_reports, can be added or derived

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard icon={Banknote} label="Efectivo Neto en Caja" value={fmt(cash_in_hand)} sub="Cierre del día / Actual" />
                <KpiCard
                    icon={AlertTriangle}
                    label="Diferencias Detectadas"
                    value={fmt(total_difference)}
                    sub={total_difference < 0 ? "Faltante" : total_difference > 0 ? "Sobrante" : "Sin diferencia"}
                    accent={total_difference < 0 ? "destructive" : total_difference > 0 ? "success" : "default"}
                />
                <KpiCard icon={RotateCcw} label="Total Devoluciones" value={fmt(totalDevoluciones)} sub="N/A" />
            </div>

            {/* Bar Chart */}
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Efectivo Esperado vs Real por Cajero (Acumulado)</h3>
                <ChartContainer
                    config={{
                        esperado: { label: "Esperado", color: "hsl(var(--primary))" },
                        real: { label: "Real", color: "hsl(var(--success))" },
                    }}
                    className="h-[260px] w-full"
                >
                    <BarChart data={cashByTeller} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="cajero" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `$${(v).toFixed(0)}`} />
                        <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                        <Bar dataKey="esperado" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={28} />
                        <Bar dataKey="real" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} barSize={28} />
                    </BarChart>
                </ChartContainer>
            </Card>

            {/* Sessions Table */}
            <Card className="overflow-hidden">
                <div className="p-5 pb-3">
                    <h3 className="text-sm font-semibold text-foreground">Sesiones de Caja Recientes</h3>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="table-header">Usuario / Caja</TableHead>
                            <TableHead className="table-header">Apertura</TableHead>
                            <TableHead className="table-header">Cierre</TableHead>
                            <TableHead className="table-header text-right">Diferencia</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sessions.map((s: any, i: number) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <div className="text-sm font-medium">{s.usuario}</div>
                                    <div className="text-xs text-muted-foreground">{s.caja}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-mono text-sm">{fmt(s.aperturaMonto)}</div>
                                    <div className="text-xs text-muted-foreground">{s.aperturaHora}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-mono text-sm">{fmt(s.cierreMonto)}</div>
                                    <div className="text-xs text-muted-foreground">{s.cierreHora}</div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className={`font-mono font-semibold text-sm ${s.diferencia < 0 ? "text-destructive" : s.diferencia > 0 ? "text-[hsl(var(--success))]" : "text-muted-foreground"
                                        }`}>
                                        {s.diferencia > 0 ? "+" : ""}{fmt(s.diferencia)}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

// ── Profitability Mock Data ─────────────────────────────

const categoryMargins = [
    { categoria: "Aceites", costo: 180, venta: 320 },
    { categoria: "Filtros", costo: 95, venta: 185 },
    { categoria: "Frenos", costo: 420, venta: 680 },
    { categoria: "Neumáticos", costo: 1200, venta: 1850 },
    { categoria: "Mano de Obra", costo: 0, venta: 450 },
];

const productMargins = [
    { descripcion: "Aceite Sintético 5W30", categoria: "Insumo", costo: 185, venta: 340, unidades: 42 },
    { descripcion: "Filtro de Aceite Universal", categoria: "Insumo", costo: 65, venta: 145, unidades: 38 },
    { descripcion: "Pastillas de Freno Cerámicas", categoria: "Insumo", costo: 380, venta: 650, unidades: 15 },
    { descripcion: "Alineación y Balanceo", categoria: "Servicio", costo: 0, venta: 450, unidades: 22 },
    { descripcion: "Llanta 205/55 R16", categoria: "Insumo", costo: 1250, venta: 1890, unidades: 8 },
    { descripcion: "Cambio de Aceite Completo", categoria: "Servicio", costo: 0, venta: 350, unidades: 35 },
    { descripcion: "Filtro de Aire Motor", categoria: "Insumo", costo: 120, venta: 210, unidades: 28 },
    { descripcion: "Disco de Freno Ventilado", categoria: "Insumo", costo: 480, venta: 750, unidades: 10 },
];

// ── Profitability Report ──────────────────────────────

function ProfitabilityReport() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const startDate = searchParams.get("from") || "";
    const endDate = searchParams.get("to") || "";

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value);
        else params.delete(key);
        router.push(`?${params.toString()}`);
    };

    const { data, isLoading } = useSWR(
        [`/reports/sales/profitability`, startDate, endDate],
        () => apiService.getReportProfitability(startDate, endDate)
    );

    if (isLoading || !data) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1, 2, 3].map(i => <KpiSkeleton key={i} />)}</div>
                <ChartSkeleton />
                <TableSkeleton rows={8} cols={6} />
            </div>
        );
    }

    const { kpis, chart_data, table_data } = data;
    const { total_margin, global_margin_pct, best_product, best_product_margin } = kpis;

    // Compute contribution for table
    const productsWithContribution = table_data.map((p: any) => ({
        ...p,
        contribucion: total_margin > 0 ? (p.margen / total_margin) * 100 : 0,
    }));

    const handleExport = () => {
        toast({ title: "Próximamente", description: "La exportación a Excel estará disponible en una futura actualización." });
    };

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h3 className="text-lg font-semibold tracking-tight">Rentabilidad</h3>
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        value={startDate || ""}
                        onChange={(e) => handleFilterChange("from", e.target.value)}
                        className="w-[140px]"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                        type="date"
                        value={endDate || ""}
                        onChange={(e) => handleFilterChange("to", e.target.value)}
                        className="w-[140px]"
                    />
                </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-end hidden">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
                    <Download size={14} />
                    Exportar
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard icon={TrendingUp} label="Utilidad Total del Mes" value={fmt(total_margin)} sub="Margen neto acumulado" accent="success" />
                <KpiCard icon={Percent} label="% Margen Global" value={`${global_margin_pct.toFixed(1)}%`} sub="Sobre precio de venta" />
                <KpiCard icon={Award} label="Producto con Mejor Margen" value={best_product} sub={`${best_product_margin.toFixed(1)}% de margen`} accent="success" />
            </div>

            {/* Double Bar Chart */}
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Costo de Compra vs Precio de Venta por Categoría (Totales)</h3>
                <ChartContainer
                    config={{
                        costo: { label: "Costo Total", color: "hsl(var(--primary))" },
                        venta: { label: "Venta Total", color: "hsl(var(--success))" },
                    }}
                    className="h-[280px] w-full"
                >
                    <BarChart data={chart_data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="categoria" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `$${(v).toFixed(0)}`} />
                        <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                        <Bar dataKey="costo" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={28} />
                        <Bar dataKey="venta" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} barSize={28} />
                    </BarChart>
                </ChartContainer>
            </Card>

            {/* Margin Analysis Table */}
            <Card className="overflow-hidden">
                <div className="p-5 pb-3">
                    <h3 className="text-sm font-semibold text-foreground">Análisis de Márgenes por Producto</h3>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="table-header">Descripción</TableHead>
                            <TableHead className="table-header">Categoría</TableHead>
                            <TableHead className="table-header text-right">Costo Prom.</TableHead>
                            <TableHead className="table-header text-right">Precio Venta Prom.</TableHead>
                            <TableHead className="table-header text-right">Margen Real ($)</TableHead>
                            <TableHead className="table-header">Contribución al Negocio</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {productsWithContribution.map((p: any, i: number) => (
                            <TableRow key={i}>
                                <TableCell className="text-sm font-medium">{p.descripcion}</TableCell>
                                <TableCell>
                                    <Badge variant={p.categoria === "Servicio" ? "secondary" : "outline"} className="text-xs">
                                        {p.categoria}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">{fmt(p.costo)}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{fmt(p.venta)}</TableCell>
                                <TableCell className="text-right font-mono font-semibold text-sm text-[hsl(var(--success))]">
                                    {fmt(p.margen)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Progress value={p.contribucion} className="h-2 w-20" />
                                        <span className="font-mono text-xs text-muted-foreground">{p.contribucion.toFixed(1)}%</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────

export default function PosReports() {
    return (
        <Tabs defaultValue="sales" className="space-y-6">
            <TabsList className="bg-muted border border-border">
                <TabsTrigger value="sales" className="gap-2 data-[state=active]:shadow-sm">
                    <BadgeDollarSign size={14} />
                    <span>Ventas</span>
                </TabsTrigger>
                <TabsTrigger value="cash" className="gap-2 data-[state=active]:shadow-sm">
                    <Banknote size={14} />
                    <span>Caja (Arqueo)</span>
                </TabsTrigger>
                <TabsTrigger value="profitability" className="gap-2 data-[state=active]:shadow-sm">
                    <TrendingUp size={14} />
                    <span>Rentabilidad</span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="sales">
                <SalesReport />
            </TabsContent>
            <TabsContent value="cash">
                <CashReport />
            </TabsContent>
            <TabsContent value="profitability">
                <ProfitabilityReport />
            </TabsContent>
        </Tabs>
    );
}
