"use client"

import React, { useState } from "react"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Car, CreditCard, Banknote, Landmark } from "lucide-react"

export interface OtPaymentModalProps {
    open: boolean
    onClose: () => void
    onConfirm: (amount: number, method: string) => void
}

// Datos falsos para demostración
const mockOts = {
    "KXPS-22": { total: 45000, abonos: 0, cliente: "Juan Pérez", id: "OT-1001" },
    "BJFH-11": { total: 120000, abonos: 60000, cliente: "María Gomez", id: "OT-1002" },
}

export function PdvOtPaymentModal({ open, onClose, onConfirm }: OtPaymentModalProps) {
    const [patente, setPatente] = useState("")
    const [otData, setOtData] = useState<{ total: number, abonos: number, cliente: string, id: string } | null>(null)

    const [payAmount, setPayAmount] = useState("")
    const [paymentMethod, setPaymentMethod] = useState("cash")

    const handleSearch = () => {
        const data = (mockOts as any)[patente.toUpperCase()]
        if (data) {
            setOtData(data)
            setPayAmount((data.total - data.abonos).toString())
        } else {
            alert("No se encontró OT con esa patente.")
            setOtData(null)
        }
    }

    const handleConfirm = () => {
        if (!otData) return
        const amount = Number(payAmount)
        if (amount <= 0 || amount > (otData.total - otData.abonos)) {
            alert("Monto inválido.")
            return
        }
        onConfirm(amount, paymentMethod)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-xl sm:rounded-3xl p-0 overflow-hidden bg-white">
                <DialogHeader className="p-6 bg-slate-900 text-white rounded-t-3xl">
                    <DialogTitle className="text-2xl font-black flex items-center gap-2 tracking-tight">
                        <Car className="w-6 h-6 text-blue-400" />
                        Cargar Orden de Trabajo (OT)
                    </DialogTitle>
                    <p className="text-slate-400 text-sm font-medium">Búsqueda y Abono/Pago Final de Servicios</p>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Búsqueda */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <Input
                                placeholder="Ingresar Patente (Ej. KXPS-22)..."
                                value={patente}
                                onChange={e => setPatente(e.target.value)}
                                className="pl-10 h-14 bg-slate-50 font-bold uppercase tracking-widest text-lg"
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            />
                        </div>
                        <Button onClick={handleSearch} className="h-14 px-8 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white">
                            Buscar
                        </Button>
                    </div>

                    {/* Resultado/Resumen */}
                    {otData && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">{patente.toUpperCase()}</h3>
                                        <p className="text-sm font-bold text-slate-500 line-clamp-1">{otData.cliente}</p>
                                    </div>
                                    <div className="bg-white px-3 py-1 rounded-lg border font-bold text-slate-600 text-sm">
                                        {otData.id}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-semibold text-slate-600">
                                        <span>Total OT</span>
                                        <span>${otData.total.toLocaleString("es-CL")}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-semibold text-green-600">
                                        <span>Pagado (Abonos)</span>
                                        <span>- ${otData.abonos.toLocaleString("es-CL")}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-200 border-dashed">
                                        <span>Saldo Pendiente</span>
                                        <span>${(otData.total - otData.abonos).toLocaleString("es-CL")}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Input y Metodos de Pago */}
                            {(otData.total - otData.abonos) > 0 ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-bold text-slate-700 mb-2 block">Monto a Pagar (Abono o Total)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xl">$</span>
                                            <Input
                                                type="number"
                                                className="pl-9 h-16 text-3xl font-black text-slate-900 bg-white"
                                                value={payAmount}
                                                onChange={e => setPayAmount(e.target.value)}
                                                max={otData.total - otData.abonos}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold text-slate-700 mb-2 block">Método de Pago</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            <Button
                                                variant={paymentMethod === "cash" ? "default" : "outline"}
                                                className={`h-16 flex flex-col items-center justify-center gap-1 border-2 ${paymentMethod === 'cash' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white'}`}
                                                onClick={() => setPaymentMethod("cash")}
                                            >
                                                <Banknote className="w-5 h-5" />
                                                <span className="text-xs font-bold">Efectivo</span>
                                            </Button>
                                            <Button
                                                variant={paymentMethod === "card" ? "default" : "outline"}
                                                className={`h-16 flex flex-col items-center justify-center gap-1 border-2 ${paymentMethod === 'card' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white'}`}
                                                onClick={() => setPaymentMethod("card")}
                                            >
                                                <CreditCard className="w-5 h-5" />
                                                <span className="text-xs font-bold">Tarjeta</span>
                                            </Button>
                                            <Button
                                                variant={paymentMethod === "transfer" ? "default" : "outline"}
                                                className={`h-16 flex flex-col items-center justify-center gap-1 border-2 ${paymentMethod === 'transfer' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white'}`}
                                                onClick={() => setPaymentMethod("transfer")}
                                            >
                                                <Landmark className="w-5 h-5" />
                                                <span className="text-xs font-bold">Transferencia</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-green-50 p-6 rounded-2xl flex flex-col items-center text-green-700 font-bold">
                                    <span className="text-4xl mb-2">🎉</span>
                                    OT Pagada en su Totalidad
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {otData && (otData.total - otData.abonos) > 0 && (
                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200">
                        <Button variant="ghost" className="h-14 font-bold px-6 text-slate-500" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleConfirm} className="h-14 font-black px-8 text-lg bg-emerald-500 hover:bg-emerald-600 text-white flex-1 md:flex-none">
                            Confirmar Pago de ${Number(payAmount).toLocaleString("es-CL")}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
