"use client";

import React, { useState, useCallback } from "react";
import { CheckCircle, XCircle, Minus, Save, FileDown, RotateCcw, ClipboardList } from "lucide-react";
import { VehicleDiagram, DamageMarker } from "./VehicleDiagram";
import { FuelGauge } from "./FuelGauge";
import { DamageModal } from "./DamageModal";
import { toast } from "sonner";
import { apiService } from "@/services/apiService";

// ─── Types ─────────────────────────────────────────────────────────────────────

type CheckStatus = "good" | "bad" | "na" | null;

interface ChecklistItem {
    id: string;
    label: string;
    status: CheckStatus;
}

interface ChecklistGroup {
    title: string;
    items: ChecklistItem[];
}

export interface ReceptionFormData {
    // Cabecera
    marca: string;
    color: string;
    modelo: string;
    tipo: string;
    placa: string;
    anio: string;
    km_entrega: string;
    km_devolucion: string;
    fecha_entrega: string;
    fecha_devolucion: string;
    funcionario_entrega: string;
    funcionario_recibe: string;
    licencia_entrega: string;
    licencia_recibe: string;
    // Daños
    markers: DamageMarker[];
    // Checklist
    checklist: ChecklistGroup[];
    // Combustible
    fuel_level: number;
    // Observaciones
    observaciones: string;
}

// ─── Initial Checklist Data ──────────────────────────────────────────────────

const INITIAL_CHECKLIST: ChecklistGroup[] = [
    {
        title: "Exteriores",
        items: [
            { id: "luces_principales", label: "Luces principales", status: null },
            { id: "luz_media", label: "Luz media", status: null },
            { id: "luz_stop_guiadores", label: "Luz stop – guiadores", status: null },
            { id: "antena_radio", label: "Antena de radio", status: null },
            { id: "limpiaparabrisas", label: "Un par de limpia parabrisas", status: null },
            { id: "espejo_lateral_izq", label: "Espejo lateral izquierdo", status: null },
            { id: "espejo_lateral_der", label: "Espejo lateral derecho", status: null },
            { id: "vidrios_laterales", label: "Vidrios laterales", status: null },
            { id: "parabrisas_ventana_trasera", label: "Parabrisas y ventana trasera", status: null },
            { id: "tapones_llanta", label: "4 tapones de llanta", status: null },
            { id: "tapon_gasolina", label: "Tapón de gasolina", status: null },
            { id: "carroceria_delantero", label: "Carrocería delantero", status: null },
            { id: "carroceria_trasero", label: "Carrocería trasero", status: null },
            { id: "placas_delantera_trasera", label: "Placas delantera y trasera", status: null },
        ],
    },
    {
        title: "Interiores",
        items: [
            { id: "calefaccion", label: "Calefacción", status: null },
            { id: "radio_cd", label: "Radio-CD", status: null },
            { id: "bocinas", label: "Bocinas", status: null },
            { id: "encendedor", label: "Encendedor", status: null },
            { id: "espejo_retrovisor", label: "Espejo retrovisor", status: null },
            { id: "ceniceros", label: "Ceniceros", status: null },
            { id: "cinturones", label: "Cinturones", status: null },
            { id: "manijas_vidrios", label: "Manijas de vidrios", status: null },
            { id: "pisos_goma", label: "Pisos de goma", status: null },
            { id: "tapetes", label: "Tapetes", status: null },
            { id: "funda_asientos", label: "Funda de asientos", status: null },
            { id: "jalador_puertas", label: "Jalador de puertas", status: null },
            { id: "sujetador_manos", label: "Sujetador de manos", status: null },
        ],
    },
    {
        title: "Accesorios",
        items: [
            { id: "gata", label: "Gata", status: null },
            { id: "estuche_llaves", label: "Estuche de llaves", status: null },
            { id: "triangulo", label: "Triángulo", status: null },
            { id: "llanta_auxilio", label: "Llanta de auxilio", status: null },
            { id: "extintor", label: "Extintor", status: null },
            { id: "botiquin", label: "Botiquín", status: null },
        ],
    },
    {
        title: "Otros",
        items: [
            { id: "soat", label: "SOAT", status: null },
            { id: "inspeccion_tecnica", label: "Inspección técnica", status: null },
        ],
    },
];

// ─── CheckButton Component ────────────────────────────────────────────────────

function CheckButton({
    status,
    onSetStatus,
}: {
    status: CheckStatus;
    onSetStatus: (s: CheckStatus) => void;
}) {
    return (
        <div className="flex gap-1.5">
            <button
                onClick={() => onSetStatus(status === "good" ? null : "good")}
                title="Bueno"
                className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all font-bold text-sm border-2 ${status === "good"
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200"
                    : "bg-card border-border text-muted-foreground hover:border-emerald-300 hover:text-emerald-500"
                    }`}
            >
                <CheckCircle size={16} />
            </button>
            <button
                onClick={() => onSetStatus(status === "bad" ? null : "bad")}
                title="Malo"
                className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all font-bold text-sm border-2 ${status === "bad"
                    ? "bg-red-500 border-red-500 text-white shadow-md shadow-red-200"
                    : "bg-card border-border text-muted-foreground hover:border-red-300 hover:text-red-500"
                    }`}
            >
                <XCircle size={16} />
            </button>
            <button
                onClick={() => onSetStatus(status === "na" ? null : "na")}
                title="No aplica"
                className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all font-bold text-sm border-2 ${status === "na"
                    ? "bg-slate-400 border-slate-400 text-white shadow-md"
                    : "bg-card border-border text-muted-foreground hover:border-slate-400 hover:text-slate-500"
                    }`}
            >
                <Minus size={16} />
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface VehicleReceptionCardProps {
    otId: string;
    initialData?: Partial<ReceptionFormData>;
    onSave?: (data: ReceptionFormData) => Promise<void>;
}

export function VehicleReceptionCard({ otId, initialData, onSave }: VehicleReceptionCardProps) {
    const [form, setForm] = useState<ReceptionFormData>({
        marca: "",
        color: "",
        modelo: "",
        tipo: "",
        placa: "",
        anio: "",
        km_entrega: "",
        km_devolucion: "",
        fecha_entrega: new Date().toISOString().split("T")[0],
        fecha_devolucion: "",
        funcionario_entrega: "",
        funcionario_recibe: "",
        licencia_entrega: "",
        licencia_recibe: "",
        markers: [],
        checklist: INITIAL_CHECKLIST,
        fuel_level: 0,
        observaciones: "",
        ...initialData,
    });

    const [saving, setSaving] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    // Damage modal state
    const [damageModal, setDamageModal] = useState<{
        marker: DamageMarker | null;
        tempCoords: { x: number; y: number; view: "top" | "front" | "side" } | null;
    } | null>(null);

    // ── Field updater ────────────────────────────────────
    const setField = <K extends keyof ReceptionFormData>(key: K, value: ReceptionFormData[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    // ── Checklist updater ────────────────────────────────
    const updateCheckStatus = useCallback(
        (groupIdx: number, itemId: string, status: CheckStatus) => {
            setForm((prev) => {
                const checklist = prev.checklist.map((grp, gi) =>
                    gi !== groupIdx
                        ? grp
                        : {
                            ...grp,
                            items: grp.items.map((item) =>
                                item.id === itemId ? { ...item, status } : item
                            ),
                        }
                );
                return { ...prev, checklist };
            });
        },
        []
    );

    // ── Damage markers ───────────────────────────────────
    const handleAddMarker = useCallback(
        (coords: { x: number; y: number }, view: "top" | "front" | "side") => {
            setDamageModal({ marker: null, tempCoords: { ...coords, view } });
        },
        []
    );

    const handleClickMarker = useCallback((marker: DamageMarker) => {
        setDamageModal({ marker, tempCoords: null });
    }, []);

    const handleSaveDamage = useCallback(
        (data: { note: string; photo_url?: string; zone: string }, markerId?: string) => {
            setForm((prev) => {
                if (markerId) {
                    // Update existing
                    return {
                        ...prev,
                        markers: prev.markers.map((m) =>
                            m.id === markerId ? { ...m, ...data } : m
                        ),
                    };
                } else {
                    // New marker
                    const coords = damageModal?.tempCoords || { x: 50, y: 50 };
                    const view = damageModal?.tempCoords?.view || "top";
                    const newMarker: DamageMarker = {
                        id: `dmg_${Date.now()}`,
                        zone: data.zone,
                        note: data.note,
                        photo_url: data.photo_url,
                        coords: { x: coords.x, y: coords.y },
                        view,
                    };
                    return { ...prev, markers: [...prev.markers, newMarker] };
                }
            });
        },
        [damageModal]
    );

    const handleDeleteMarker = useCallback((markerId: string) => {
        setForm((prev) => ({
            ...prev,
            markers: prev.markers.filter((m) => m.id !== markerId),
        }));
        toast.success("Marcador eliminado");
    }, []);

    // ── Save ─────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        const savePromise = onSave ? onSave(form) : apiService.saveReception(otId, form);

        toast.promise(savePromise, {
            loading: 'Guardando ficha de recepción...',
            success: 'Ficha guardada correctamente',
            error: (err) => `Error al guardar: ${err.message || 'Intente nuevamente'}`
        });

        try {
            await savePromise;
        } catch (error) {
            console.error("Save error:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleExportPDF = async () => {
        setExportingPdf(true);
        try {
            const blob = await apiService.exportReceptionPdf(otId, form);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ficha_recepcion_OT${otId}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("PDF generado correctamente");
        } catch (error) {
            console.error("PDF error:", error);
            toast.error("Error al generar PDF");
            window.print();
        } finally {
            setExportingPdf(false);
        }
    };

    // ── Stats ────────────────────────────────────────────
    const totalItems = form.checklist.flatMap((g) => g.items).length;
    const checkedItems = form.checklist.flatMap((g) => g.items).filter((i) => i.status !== null).length;
    const goodCount = form.checklist.flatMap((g) => g.items).filter((i) => i.status === "good").length;
    const badCount = form.checklist.flatMap((g) => g.items).filter((i) => i.status === "bad").length;
    const progress = Math.round((checkedItems / totalItems) * 100);

    return (
        <div className="space-y-6 pb-8">
            {/* ── Header bar ── */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <ClipboardList size={22} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="font-black text-foreground text-base">Ficha de Recepción del Vehículo</h2>
                        <p className="text-xs text-muted-foreground">OT-{otId} — Registro de Entrega y Estado</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setForm({ ...form, checklist: INITIAL_CHECKLIST, markers: [] })}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-muted-foreground bg-muted rounded-xl hover:bg-muted/80 border border-border transition-colors"
                    >
                        <RotateCcw size={15} />
                        Limpiar
                    </button>
                    <button
                        onClick={handleExportPDF}
                        disabled={exportingPdf}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-secondary-foreground bg-secondary rounded-xl hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20 disabled:opacity-50"
                    >
                        <FileDown size={15} />
                        {exportingPdf ? "Exportando..." : "Exportar PDF"}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        <Save size={15} />
                        {saving ? "Guardando..." : "Guardar Ficha"}
                    </button>
                </div>
            </div>

            {/* ── SECTION 1: Cabecera ── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <SectionHeader number="1" title="Características Generales y Datos del Vehículo" />
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Col 1: Characteristics */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider pb-2 border-b border-border">
                                Características Generales
                            </h4>
                            {[
                                { key: "marca", label: "Marca" },
                                { key: "color", label: "Color" },
                                { key: "modelo", label: "Modelo" },
                                { key: "anio", label: "Año" },
                                { key: "tipo", label: "Tipo" },
                                { key: "placa", label: "Placa / Patente" },
                            ].map(({ key, label }) => (
                                <FormField
                                    key={key}
                                    label={label}
                                    value={(form as any)[key]}
                                    onChange={(v) => setField(key as keyof ReceptionFormData, v as any)}
                                    placeholder={`Ingrese ${label.toLowerCase()}...`}
                                    uppercase={key === "placa"}
                                />
                            ))}
                        </div>

                        {/* Col 2: Kilometraje */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider pb-2 border-b border-border">
                                Kilometraje y Fecha
                            </h4>
                            <FormField
                                label="De recepción"
                                value={form.km_entrega}
                                onChange={(v) => setField("km_entrega", v)}
                                type="number"
                                placeholder="0"
                                suffix="km"
                            />
                            <FormField
                                label="Fecha de recepción"
                                value={form.fecha_entrega}
                                onChange={(v) => setField("fecha_entrega", v)}
                                type="date"
                            />
                            <FormField
                                label="De devolución"
                                value={form.km_devolucion}
                                onChange={(v) => setField("km_devolucion", v)}
                                type="number"
                                placeholder="0"
                                suffix="km"
                            />
                            <FormField
                                label="Fecha de devolución"
                                value={form.fecha_devolucion}
                                onChange={(v) => setField("fecha_devolucion", v)}
                                type="date"
                            />
                        </div>

                        {/* Col 3: Funcionarios */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider pb-2 border-b border-border">
                                Funcionarios Responsables
                            </h4>
                            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                                <p className="text-[10px] font-black text-primary uppercase mb-2">Recepción del Vehículo</p>
                                <FormField
                                    label="Funcionario que recibe"
                                    value={form.funcionario_recibe}
                                    onChange={(v) => setField("funcionario_recibe", v)}
                                    placeholder="Nombre completo..."
                                />
                                <FormField
                                    label="Lic. N°"
                                    value={form.licencia_recibe}
                                    onChange={(v) => setField("licencia_recibe", v)}
                                    placeholder="N° licencia..."
                                />
                            </div>

                            <div className="p-3 bg-muted/50 rounded-xl border border-border">
                                <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Entrega al Cliente (Devolución)</p>
                                <FormField
                                    label="Funcionario que entrega"
                                    value={form.funcionario_entrega}
                                    onChange={(v) => setField("funcionario_entrega", v)}
                                    placeholder="Nombre completo..."
                                />
                                <FormField
                                    label="Lic. N°"
                                    value={form.licencia_entrega}
                                    onChange={(v) => setField("licencia_entrega", v)}
                                    placeholder="N° licencia..."
                                />
                            </div>

                            {/* Progress card */}
                            <div className="mt-6 p-4 bg-muted/50 rounded-xl border border-border">
                                <p className="text-xs font-bold text-muted-foreground mb-3">Progreso del Checklist</p>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-xs font-bold">
                                    <span className="text-muted-foreground">{checkedItems}/{totalItems} ítems</span>
                                    <span className="text-primary">{progress}%</span>
                                </div>
                                <div className="flex gap-3 mt-3">
                                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                        {goodCount} Buenos
                                    </span>
                                    <span className="flex items-center gap-1 text-[11px] text-red-600 font-bold">
                                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                                        {badCount} Malos
                                    </span>
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-bold">
                                        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                                        {form.markers.length} Daños
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SECTION 2: Checklist ── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <SectionHeader number="2" title="Inventario y Control de Condiciones Generales del Vehículo" />
                <div className="p-6">
                    {/* Legend */}
                    <div className="flex items-center gap-4 mb-5 p-3 bg-muted/50 rounded-xl border border-border">
                        <span className="text-xs font-bold text-muted-foreground">Leyenda:</span>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                            <CheckCircle size={14} /> Bueno
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                            <XCircle size={14} /> Malo
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <Minus size={14} /> No Aplica
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {form.checklist.map((group, gi) => (
                            <div key={group.title}>
                                <h4 className="text-xs font-black text-primary uppercase tracking-wider pb-2 mb-3 border-b-2 border-primary/20">
                                    {group.title}
                                </h4>
                                <div className="space-y-2">
                                    {group.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${item.status === "good"
                                                ? "bg-emerald-50 border-emerald-200"
                                                : item.status === "bad"
                                                    ? "bg-red-50 border-red-200"
                                                    : item.status === "na"
                                                        ? "bg-slate-50 border-slate-200"
                                                        : "bg-card border-border hover:border-border/80"
                                                }`}
                                        >
                                            <span className={`text-xs font-semibold flex-1 leading-tight ${item.status === "good" ? "text-emerald-800" :
                                                item.status === "bad" ? "text-red-800" :
                                                    item.status === "na" ? "text-slate-500 line-through" :
                                                        "text-foreground"
                                                }`}>
                                                {item.label}
                                            </span>
                                            <CheckButton
                                                status={item.status}
                                                onSetStatus={(s) => updateCheckStatus(gi, item.id, s)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── SECTION 3: Diagrama + Combustible ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Vehicle Diagram */}
                <div className="xl:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <SectionHeader number="3" title="Observaciones de Orden General y Estado" />
                    <div className="p-6">
                        <VehicleDiagram
                            markers={form.markers}
                            onAddMarker={handleAddMarker}
                            onClickMarker={handleClickMarker}
                        />
                        {form.markers.length === 0 && (
                            <p className="text-center text-xs text-muted-foreground mt-4 italic">
                                Haz clic en cualquier punto del diagrama para marcar un daño o rasguño.
                            </p>
                        )}
                    </div>
                </div>

                {/* Fuel Gauge */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <SectionHeader number="4" title="Nivel de Combustible" />
                    <div className="p-6 flex flex-col items-center justify-center h-[calc(100%-4rem)]">
                        <FuelGauge
                            value={form.fuel_level}
                            onChange={(v) => setField("fuel_level", v)}
                        />
                    </div>
                </div>
            </div>

            {/* ── SECTION 4: Observaciones ── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <SectionHeader number="5" title="Observaciones Generales" />
                <div className="p-6">
                    <textarea
                        value={form.observaciones}
                        onChange={(e) => setField("observaciones", e.target.value)}
                        placeholder="Ingrese observaciones adicionales sobre el estado general del vehículo..."
                        rows={4}
                        className="w-full form-input text-sm resize-none"
                    />
                </div>
            </div>

            {/* ── Damage Modal ── */}
            {damageModal !== null && (
                <DamageModal
                    marker={damageModal.marker}
                    tempCoords={damageModal.tempCoords}
                    onSave={handleSaveDamage}
                    onDelete={handleDeleteMarker}
                    onClose={() => setDamageModal(null)}
                    otId={otId}
                />
            )}
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ number, title }: { number: string; title: string }) {
    return (
        <div className="flex items-center gap-3 px-6 py-4 bg-muted/30 border-b border-border">
            <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shrink-0">
                {number}
            </span>
            <h3 className="text-sm font-black text-foreground uppercase tracking-wide">{title}</h3>
        </div>
    );
}

function FormField({
    label,
    value,
    onChange,
    type = "text",
    placeholder = "",
    suffix,
    uppercase,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    suffix?: string;
    uppercase?: boolean;
}) {
    return (
        <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">{label}</label>
            <div className="relative">
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
                    placeholder={placeholder}
                    className={`form-input text-sm pr-${suffix ? "12" : "4"}`}
                    style={uppercase ? { textTransform: "uppercase" } : undefined}
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        {suffix}
                    </span>
                )}
            </div>
        </div>
    );
}
