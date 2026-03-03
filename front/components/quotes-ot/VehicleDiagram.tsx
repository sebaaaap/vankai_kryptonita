"use client";

import React, { useRef } from "react";
import { MapPin, X } from "lucide-react";

export interface DamageMarker {
    id: string;
    zone: string;
    note: string;
    photo_url?: string;
    coords: { x: number; y: number };
    view: "top" | "front" | "side";
}

interface VehicleDiagramProps {
    markers: DamageMarker[];
    onAddMarker: (coords: { x: number; y: number }, view: "top" | "front" | "side") => void;
    onClickMarker: (marker: DamageMarker) => void;
}

export function VehicleDiagram({ markers, onAddMarker, onClickMarker }: VehicleDiagramProps) {
    const topRef = useRef<SVGSVGElement>(null);
    const frontRef = useRef<SVGSVGElement>(null);
    const sideRef = useRef<SVGSVGElement>(null);

    const handleSvgClick = (
        e: React.MouseEvent<SVGSVGElement>,
        ref: React.RefObject<SVGSVGElement | null>,
        view: "top" | "front" | "side"
    ) => {
        if ((e.target as SVGElement).closest(".marker-pin")) return;
        const svg = ref.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        onAddMarker({ x: Math.round(x), y: Math.round(y) }, view);
    };

    const viewMarkers = (view: "top" | "front" | "side") =>
        markers.filter((m) => m.view === view);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* TOP VIEW */}
            <DiagramPanel title="Vista Superior" view="top" svgRef={topRef} markers={viewMarkers("top")} onSvgClick={handleSvgClick} onClickMarker={onClickMarker}>
                <TopViewSVG />
            </DiagramPanel>

            {/* FRONT VIEW */}
            <DiagramPanel title="Vista Frontal" view="front" svgRef={frontRef} markers={viewMarkers("front")} onSvgClick={handleSvgClick} onClickMarker={onClickMarker}>
                <FrontViewSVG />
            </DiagramPanel>

            {/* SIDE VIEW */}
            <DiagramPanel title="Vista Lateral" view="side" svgRef={sideRef} markers={viewMarkers("side")} onSvgClick={handleSvgClick} onClickMarker={onClickMarker}>
                <SideViewSVG />
            </DiagramPanel>
        </div>
    );
}

function DiagramPanel({
    title, view, svgRef, markers, onSvgClick, onClickMarker, children
}: {
    title: string;
    view: "top" | "front" | "side";
    svgRef: React.RefObject<SVGSVGElement | null>;
    markers: DamageMarker[];
    onSvgClick: (e: React.MouseEvent<SVGSVGElement>, ref: React.RefObject<SVGSVGElement | null>, view: "top" | "front" | "side") => void;
    onClickMarker: (m: DamageMarker) => void;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
                {title}
            </div>
            <div className="relative p-3">
                <svg
                    ref={svgRef}
                    viewBox="0 0 200 160"
                    className="w-full cursor-crosshair"
                    onClick={(e) => onSvgClick(e, svgRef, view)}
                    style={{ userSelect: "none" }}
                >
                    {children}
                    {markers.map((m) => (
                        <g
                            key={m.id}
                            className="marker-pin"
                            transform={`translate(${(m.coords.x / 100) * 200}, ${(m.coords.y / 100) * 160})`}
                            onClick={(e) => { e.stopPropagation(); onClickMarker(m); }}
                            style={{ cursor: "pointer" }}
                        >
                            <circle r="8" fill="hsl(0, 84%, 55%)" opacity="0.85" />
                            <text x="0" y="4" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">!</text>
                        </g>
                    ))}
                </svg>
                <p className="text-center text-[10px] text-muted-foreground mt-1">
                    Toca el diagrama para marcar un daño
                </p>
                {markers.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {markers.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => onClickMarker(m)}
                                className="w-full flex items-center gap-2 px-2 py-1 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 hover:bg-red-100 transition-colors text-left"
                            >
                                <MapPin size={10} className="shrink-0 text-red-500" />
                                <span className="truncate font-medium">{m.note || m.zone || "Sin nota"}</span>
                                {m.photo_url && <span className="ml-auto text-[9px] bg-red-100 px-1 rounded">📷</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function TopViewSVG() {
    return (
        <g>
            {/* Car body top view */}
            <rect x="70" y="10" width="60" height="140" rx="20" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            {/* Windshield */}
            <rect x="78" y="25" width="44" height="25" rx="4" fill="#bfdbfe" stroke="#94a3b8" strokeWidth="1" />
            {/* Rear window */}
            <rect x="78" y="110" width="44" height="20" rx="4" fill="#bfdbfe" stroke="#94a3b8" strokeWidth="1" />
            {/* Left side mirror */}
            <rect x="58" y="48" width="12" height="6" rx="2" fill="#94a3b8" />
            {/* Right side mirror */}
            <rect x="130" y="48" width="12" height="6" rx="2" fill="#94a3b8" />
            {/* Wheels */}
            <rect x="57" y="28" width="16" height="28" rx="3" fill="#475569" />
            <rect x="127" y="28" width="16" height="28" rx="3" fill="#475569" />
            <rect x="57" y="104" width="16" height="28" rx="3" fill="#475569" />
            <rect x="127" y="104" width="16" height="28" rx="3" fill="#475569" />
            {/* Door lines */}
            <line x1="70" y1="75" x2="130" y2="75" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3,2" />
            {/* Labels */}
            <text x="100" y="7" textAnchor="middle" fontSize="6" fill="#64748b">FRENTE</text>
            <text x="100" y="157" textAnchor="middle" fontSize="6" fill="#64748b">ATRÁS</text>
        </g>
    );
}

function FrontViewSVG() {
    return (
        <g>
            {/* Hood */}
            <rect x="40" y="70" width="120" height="55" rx="5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            {/* Windshield */}
            <rect x="55" y="35" width="90" height="40" rx="6" fill="#bfdbfe" stroke="#94a3b8" strokeWidth="1" />
            {/* Roof */}
            <path d="M55 35 Q100 15 145 35" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
            {/* Bumper */}
            <rect x="38" y="122" width="124" height="18" rx="4" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
            {/* Headlights */}
            <rect x="42" y="75" width="28" height="18" rx="3" fill="#fef08a" stroke="#94a3b8" strokeWidth="1" />
            <rect x="130" y="75" width="28" height="18" rx="3" fill="#fef08a" stroke="#94a3b8" strokeWidth="1" />
            {/* Grille */}
            <rect x="78" y="95" width="44" height="22" rx="3" fill="#64748b" stroke="#475569" strokeWidth="1" />
            {/* Wheels */}
            <ellipse cx="55" cy="140" rx="18" ry="10" fill="#475569" />
            <ellipse cx="145" cy="140" rx="18" ry="10" fill="#475569" />
            {/* Labels */}
            <text x="100" y="10" textAnchor="middle" fontSize="7" fill="#64748b" fontWeight="bold">FRENTE</text>
        </g>
    );
}

function SideViewSVG() {
    return (
        <g>
            {/* Main body */}
            <rect x="20" y="70" width="162" height="50" rx="5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            {/* Cabin */}
            <path d="M55 70 Q65 35 95 30 L145 30 Q165 35 165 70 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
            {/* Windshield */}
            <path d="M63 70 Q70 42 92 35 L115 35 L115 70 Z" fill="#bfdbfe" stroke="#94a3b8" strokeWidth="1" />
            {/* Rear window */}
            <path d="M120 70 L120 35 L145 35 Q162 42 163 70 Z" fill="#bfdbfe" stroke="#94a3b8" strokeWidth="1" />
            {/* Door */}
            <rect x="68" y="70" width="50" height="50" rx="2" fill="none" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3,2" />
            {/* Door handle */}
            <rect x="115" y="88" width="8" height="3" rx="1" fill="#64748b" />
            {/* Bumpers */}
            <rect x="14" y="95" width="12" height="22" rx="3" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
            <rect x="176" y="95" width="12" height="22" rx="3" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
            {/* Wheels */}
            <circle cx="52" cy="128" r="20" fill="#475569" />
            <circle cx="52" cy="128" r="12" fill="#94a3b8" />
            <circle cx="148" cy="128" r="20" fill="#475569" />
            <circle cx="148" cy="128" r="12" fill="#94a3b8" />
            {/* Labels */}
            <text x="100" y="10" textAnchor="middle" fontSize="7" fill="#64748b" fontWeight="bold">LATERAL</text>
            <text x="16" y="88" textAnchor="middle" fontSize="5" fill="#64748b">←</text>
            <text x="185" y="88" textAnchor="middle" fontSize="5" fill="#64748b">→</text>
        </g>
    );
}
