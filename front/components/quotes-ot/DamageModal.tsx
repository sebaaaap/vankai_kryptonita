"use client";

import React, { useState, useRef } from "react";
import { X, Camera, Upload, Trash2, AlertTriangle } from "lucide-react";
import { DamageMarker } from "./VehicleDiagram";
import { apiService } from "@/services/apiService";

interface DamageModalProps {
    marker: DamageMarker | null;
    tempCoords: { x: number; y: number; view: "top" | "front" | "side" } | null;
    onSave: (data: { note: string; photo_url?: string; zone: string }, markerId?: string) => void;
    onDelete: (markerId: string) => void;
    onClose: () => void;
    otId: string;
}

const ZONE_LABELS: Record<string, string> = {
    top: "Vista Superior",
    front: "Vista Frontal",
    side: "Vista Lateral",
};

export function DamageModal({ marker, tempCoords, onSave, onDelete, onClose, otId }: DamageModalProps) {
    const [note, setNote] = useState(marker?.note || "");
    const [zone, setZone] = useState(marker?.zone || "");
    const [preview, setPreview] = useState<string | null>(marker?.photo_url || null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const view = marker?.view || tempCoords?.view || "top";

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Local preview
        const url = URL.createObjectURL(file);
        setPreview(url);
        setUploading(true);

        try {
            const data = await apiService.uploadDamagePhoto(otId, file);
            if (data.url) {
                setPreview(data.url);
            }
        } catch (error) {
            console.error("Photo upload error:", error);
            // Keep local preview if upload fails (offline/LAN mode)
            console.warn("Upload failed, using local preview");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = () => {
        if (!note.trim()) return;
        onSave({ note: note.trim(), photo_url: preview || undefined, zone: zone || `zona_${view}` }, marker?.id);
        onClose();
    };

    const isNew = !marker;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-red-50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                            <AlertTriangle size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-foreground text-sm">
                                {isNew ? "Registrar Daño" : "Editar Daño"}
                            </h3>
                            <p className="text-xs text-muted-foreground">{ZONE_LABELS[view]}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* Zone selector */}
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                            Zona del daño
                        </label>
                        <select
                            value={zone}
                            onChange={(e) => setZone(e.target.value)}
                            className="w-full form-input text-sm"
                        >
                            <option value="">Seleccionar zona...</option>
                            <optgroup label="Carrocería">
                                <option value="parachoques_frontal">Parachoques Frontal</option>
                                <option value="parachoques_trasero">Parachoques Trasero</option>
                                <option value="capot">Capot / Hood</option>
                                <option value="techo">Techo</option>
                                <option value="maletero">Maletero / Baúl</option>
                            </optgroup>
                            <optgroup label="Laterales">
                                <option value="aleta_delantera_izq">Aleta Delantera Izq.</option>
                                <option value="aleta_delantera_der">Aleta Delantera Der.</option>
                                <option value="puerta_delantera_izq">Puerta Delantera Izq.</option>
                                <option value="puerta_delantera_der">Puerta Delantera Der.</option>
                                <option value="puerta_trasera_izq">Puerta Trasera Izq.</option>
                                <option value="puerta_trasera_der">Puerta Trasera Der.</option>
                                <option value="aleta_trasera_izq">Aleta Trasera Izq.</option>
                                <option value="aleta_trasera_der">Aleta Trasera Der.</option>
                            </optgroup>
                            <optgroup label="Vidrios">
                                <option value="parabrisas">Parabrisas</option>
                                <option value="luneta">Luneta Trasera</option>
                                <option value="vidrio_lat_izq">Vidrio Lateral Izq.</option>
                                <option value="vidrio_lat_der">Vidrio Lateral Der.</option>
                            </optgroup>
                            <optgroup label="Ruedas">
                                <option value="llanta_del_izq">Llanta Del. Izq.</option>
                                <option value="llanta_del_der">Llanta Del. Der.</option>
                                <option value="llanta_tra_izq">Llanta Tra. Izq.</option>
                                <option value="llanta_tra_der">Llanta Tra. Der.</option>
                            </optgroup>
                        </select>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                            Descripción del daño *
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ej: Raspón profundo en la puerta, abolladura pequeña..."
                            rows={3}
                            className="w-full form-input text-sm resize-none"
                            autoFocus
                        />
                    </div>

                    {/* Photo */}
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                            Evidencia Fotográfica
                        </label>

                        {preview ? (
                            <div className="relative rounded-xl overflow-hidden border border-border">
                                <img src={preview} alt="Evidencia" className="w-full h-40 object-cover" />
                                <button
                                    onClick={() => setPreview(null)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow"
                                >
                                    <Trash2 size={14} />
                                </button>
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <span className="text-white text-sm font-bold animate-pulse">Subiendo...</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors"
                                >
                                    <Upload size={20} className="text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground">Subir Archivo</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (fileRef.current) {
                                            fileRef.current.accept = "image/*";
                                            fileRef.current.capture = "environment";
                                            fileRef.current.click();
                                        }
                                    }}
                                    className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-secondary rounded-xl hover:bg-secondary/5 transition-colors"
                                >
                                    <Camera size={20} className="text-secondary" />
                                    <span className="text-xs font-semibold text-secondary">Capturar Foto</span>
                                </button>
                            </div>
                        )}

                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 flex items-center gap-3">
                    {!isNew && (
                        <button
                            onClick={() => { onDelete(marker!.id); onClose(); }}
                            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                        >
                            <Trash2 size={15} />
                            Eliminar
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="ml-auto px-4 py-2.5 text-sm font-bold text-muted-foreground bg-muted rounded-xl hover:bg-muted/80 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!note.trim()}
                        className="px-5 py-2.5 text-sm font-bold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                    >
                        {isNew ? "Guardar Daño" : "Actualizar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
