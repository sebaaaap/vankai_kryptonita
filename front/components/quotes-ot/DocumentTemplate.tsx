"use client"

import React from "react"
import { QuoteOtItem } from "./quotes-ot-manager"
import { Wrench, Phone, Mail, MapPin, Globe, CheckSquare, Square } from "lucide-react"

interface DocumentTemplateProps {
    data: QuoteOtItem
    type: "quote" | "ot"
}

export function DocumentTemplate({ data, type }: DocumentTemplateProps) {
    const isOT = type === "ot" || data.type === "ot"
    const title = isOT ? "ORDEN DE TRABAJO" : "COTIZACIÓN"
    const nroStr = isOT ? "OT" : "QT"

    return (
        <div id="document-to-print" className="bg-white text-slate-900 p-0 max-w-[800px] mx-auto font-sans leading-tight">
            {/* Header Section */}
            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 text-white p-3 rounded-xl">
                            <Wrench size={32} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">VANKAI</h1>
                            <p className="text-[10px] font-bold text-slate-500 tracking-[0.3em] uppercase">Kryptonita Vulcanización</p>
                        </div>
                    </div>
                    <div className="text-[10px] space-y-1 font-bold text-slate-600">
                        <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-slate-400" />
                            <span>AV. CENTRAL 1234, SANTIAGO, CHILE</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone size={12} className="text-slate-400" />
                            <span>+56 9 1234 5678</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail size={12} className="text-slate-400" />
                            <span>CONTACTO@VANKAI.CL</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe size={12} className="text-slate-400" />
                            <span>WWW.VANKAI.CL</span>
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl inline-block shadow-lg">
                        <p className="text-[10px] font-black tracking-widest opacity-70 mb-1">{title}</p>
                        <h2 className="text-3xl font-black tracking-tight">{nroStr}-{data.id.slice(0, 6).toUpperCase()}</h2>
                    </div>
                    <div className="mt-4 space-y-1">
                        <p className="text-xs font-bold text-slate-400">FECHA EMISIÓN</p>
                        <p className="text-sm font-black text-slate-900">{data.date_created}</p>
                    </div>
                </div>
            </div>

            {/* Client & Vehicle Grid */}
            <div className="grid grid-cols-2 gap-8 mb-6">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" /> INFORMACIÓN DEL CLIENTE
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">NOMBRE O RAZÓN SOCIAL</p>
                            <p className="text-md font-black text-slate-900">{data.customer_name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">RUT</p>
                                <p className="text-sm font-bold text-slate-900">{data.customer_rut || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">TELÉFONO</p>
                                <p className="text-sm font-bold text-slate-900">{data.customer_phone || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" /> DATOS DEL VEHÍCULO
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">PATENTE</p>
                                    <p className="text-xl font-black text-slate-900 tracking-wider">
                                        {data.vehicle_plate.slice(0, 2)}-{data.vehicle_plate.slice(2, 4)}-{data.vehicle_plate.slice(4)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">KILOMETRAJE</p>
                                    <p className="text-md font-black text-orange-600 italic">
                                        {data.mileage?.toLocaleString("es-CL") || "---"} KM
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">MARCA / MODELO / AÑO</p>
                                <p className="text-sm font-bold text-slate-900 uppercase">
                                    {data.vehicle_brand || "S/M"} {data.vehicle_model} {data.vehicle_year ? `(${data.vehicle_year})` : ""}
                                </p>
                            </div>
                        </div>
                    </div>
                    {data.created_by_name && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ENCARGADO / ATENDIDO POR</p>
                            <p className="text-xs font-black text-slate-700 uppercase">{data.created_by_name}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Items Table */}
            <div className="mb-10 overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-900 text-white">
                            <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest">PRODUCTO / SERVICIO</th>
                            <th className="px-2 py-4 text-[9px] font-black uppercase tracking-widest text-center">CANTIDAD</th>
                            <th className="px-3 py-4 text-[9px] font-black uppercase tracking-widest text-right">PRECIO NETO</th>
                            <th className="px-3 py-4 text-[9px] font-black uppercase tracking-widest text-right">IVA (19%)</th>
                            <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-right">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.items.map((item, idx) => {
                            const totalRow = item.price * item.quantity;
                            const netoTotal = totalRow / 1.19;
                            const ivaTotal = totalRow - netoTotal;

                            return (
                                <tr key={idx} className={isOT && item.done ? "bg-emerald-50/30" : ""}>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            {isOT && (
                                                <div className={item.done ? "text-emerald-500" : "text-slate-200"}>
                                                    {item.done ? <CheckSquare size={14} /> : <Square size={14} />}
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-sm tracking-wider ${item.product_type === "SERVICIO"
                                                            ? "bg-slate-100 text-slate-500 border border-slate-200"
                                                            : "bg-blue-50 text-blue-500 border border-blue-100"
                                                        }`}>
                                                        {item.product_type}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-black text-slate-900 uppercase leading-snug tracking-tight">
                                                    {item.product_name}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-4 text-center text-xs font-bold text-slate-600">{item.quantity}</td>
                                    <td className="px-3 py-4 text-right text-xs font-bold text-slate-600">${netoTotal.toLocaleString("es-CL", { maximumFractionDigits: 0 })}</td>
                                    <td className="px-3 py-4 text-right text-xs font-bold text-slate-400">${ivaTotal.toLocaleString("es-CL", { maximumFractionDigits: 0 })}</td>
                                    <td className="px-4 py-4 text-right text-xs font-black text-slate-900">${totalRow.toLocaleString("es-CL")}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer Summary & Sig */}
            <div className="flex justify-between items-start gap-12">
                <div className="flex-1 space-y-6">
                    {data.notes && (
                        <div className="p-4 bg-slate-50 border-l-4 border-slate-300 rounded-r-xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">OBSERVACIONES</p>
                            <p className="text-xs text-slate-600 italic">"{data.notes}"</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-8 mt-12 pb-8">
                        <div className="border-t border-slate-300 pt-4 text-center">
                            <div className="h-16 mb-2"></div> {/* Signature space */}
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider">FIRMA RECEPCIÓN</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{data.customer_name}</p>
                        </div>
                        <div className="border-t border-slate-300 pt-4 text-center">
                            <div className="h-16 mb-2"></div> {/* Signature space */}
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider">FIRMA TALLER</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-loose">VANKAI VULCANIZACIÓN</p>
                        </div>
                    </div>
                </div>

                <div className="w-64">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-3 shadow-xl">
                        <div className="flex justify-between items-center opacity-60">
                            <span className="text-[10px] font-black uppercase">SUBTOTAL NETO</span>
                            <span className="text-sm font-bold">${(data.total / 1.19).toLocaleString("es-CL", { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between items-center opacity-60">
                            <span className="text-[10px] font-black uppercase">IVA (19%)</span>
                            <span className="text-sm font-bold">${(data.total - (data.total / 1.19)).toLocaleString("es-CL", { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="h-px bg-white/10 my-1" />
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase tracking-tighter">TOTAL A PAGAR</span>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-black tracking-tight">${data.total.toLocaleString("es-CL")}</p>
                            <p className="text-[9px] font-bold opacity-50 mt-1 uppercase tracking-widest">Pesos Chilenos</p>
                        </div>
                    </div>
                    <p className="text-[8px] text-center text-slate-400 mt-6 font-bold uppercase tracking-wider leading-relaxed">
                        COTIZACIÓN VÁLIDA POR 5 DÍAS HÁBILES. <br />
                        PRECIOS SUJETOS A CAMBIOS SEGÚN STOCK.
                    </p>
                </div>
            </div>

            <style jsx>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body { margin: 1cm; }
                    #document-to-print { padding: 0; box-shadow: none; width: 100%; max-width: 100%; }
                }
            `}</style>
        </div>
    )
}
