"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Banknote, Play, Loader2 } from "lucide-react"

interface PdvOpenSessionProps {
    open: boolean
    onConfirm: (initialCash: number, notes: string) => Promise<void>
}

export function PdvOpenSession({ open, onConfirm }: PdvOpenSessionProps) {
    const [initialCash, setInitialCash] = useState<string>("0")
    const [notes, setNotes] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleConfirm = async () => {
        setIsLoading(true)
        try {
            await onConfirm(parseFloat(initialCash) || 0, notes)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open}>
            <DialogContent className="sm:max-w-[425px] overflow-hidden border-none shadow-2xl p-0 bg-transparent">
                <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-white relative overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl" />

                    <DialogHeader className="relative z-10 flex flex-col items-center text-center gap-4">
                        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                            <Play className="h-8 w-8 fill-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold tracking-tight text-white">Nueva Sesión de Caja</DialogTitle>
                            <DialogDescription className="text-white/70 text-sm mt-1">Configura los valores iniciales para comenzar el día</DialogDescription>
                        </div>
                    </DialogHeader>
                </div>

                <div className="bg-card p-6 gap-6 flex flex-col pt-8 rounded-b-xl border border-border/50">
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="initial-cash" className="text-sm font-semibold flex items-center gap-2">
                                <Banknote className="h-4 w-4 text-primary" />
                                Efectivo de Apertura
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                                <Input
                                    id="initial-cash"
                                    type="number"
                                    placeholder="0.00"
                                    value={initialCash}
                                    onChange={(e) => setInitialCash(e.target.value)}
                                    className="pl-8 text-lg font-bold bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes" className="text-sm font-semibold">Notas u Observaciones</Label>
                            <Textarea
                                id="notes"
                                placeholder="Escribe algún detalle relevante para la apertura..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="resize-none h-24 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold text-base rounded-xl shadow-lg shadow-primary/20 group transition-all"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <Play className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform fill-white" />
                                    Abrir Sesión Ahora
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}
