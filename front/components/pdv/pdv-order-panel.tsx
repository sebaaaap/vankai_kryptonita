"use client"

import type { OrderLine, NumpadMode } from "./pdv-types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { toNum } from "@/lib/utils-numbers"
import {
  Trash2,
  ShoppingBag,
  Minus,
  Plus,
} from "lucide-react"

interface PdvOrderPanelProps {
  lines: OrderLine[]
  subtotal: number
  tax: number
  total: number
  selectedLineId: string | null
  onSelectLine: (lineId: string | null) => void
  onUpdateQuantity: (lineId: string, delta: number) => void
  onRemoveLine: (lineId: string) => void
  onPay: () => void
  numpadMode: NumpadMode
  onNumpadModeChange: (mode: NumpadMode) => void
  onNumpadInput: (value: string) => void
}

export function PdvOrderPanel({
  lines,
  subtotal,
  tax,
  total,
  selectedLineId,
  onSelectLine,
  onUpdateQuantity,
  onRemoveLine,
  onPay,
  numpadMode,
  onNumpadModeChange,
  onNumpadInput,
}: PdvOrderPanelProps) {
  return (
    <div className="flex h-full w-[440px] flex-col border-l border-border bg-card">
      {/* Order Lines */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Orden Actual</h2>
        </div>
        <Badge variant="secondary" className="rounded-full text-[10px]">
          {lines.length} {lines.length === 1 ? "articulo" : "articulos"}
        </Badge>
      </div>

      {/* Lines List */}
      <ScrollArea className="flex-1 custom-scrollbar">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShoppingBag className="mb-3 h-10 w-10 opacity-20" />
            <p className="text-xs font-medium">Orden vacia</p>
            <p className="text-[11px]">Agrega productos para empezar</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {lines.map((line) => (
              <div
                key={line.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectLine(selectedLineId === line.id ? null : line.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectLine(selectedLineId === line.id ? null : line.id)
                  }
                }}
                className={`group relative flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors ${line.error
                  ? "bg-destructive/10 border-l-2 border-l-destructive"
                  : selectedLineId === line.id
                    ? "bg-primary/5 border-l-2 border-l-primary"
                    : "hover:bg-muted/50"
                  }`}
              >
                {/* Quantity Controls */}
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateQuantity(line.id, 1)
                    }}
                    className={`flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors ${line.error ? "bg-destructive/20 hover:bg-destructive hover:text-white" : "bg-muted hover:bg-primary hover:text-primary-foreground"
                      }`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <span className={`text-sm font-bold min-w-[24px] text-center ${line.error ? "text-destructive" : "text-foreground"}`}>
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateQuantity(line.id, -1)
                    }}
                    className={`flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors ${line.error ? "bg-destructive/20 hover:bg-destructive hover:text-white" : "bg-muted hover:bg-destructive hover:text-destructive-foreground"
                      }`}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold leading-tight truncate ${line.error ? "text-destructive" : "text-foreground"}`}>
                    {line.product.name}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>${toNum(line.unitPrice).toFixed(2)} c/u</span>
                    {line.discount > 0 && (
                      <Badge variant="destructive" className="h-4 rounded px-1 text-[9px]">
                        -{line.discount}%
                      </Badge>
                    )}
                  </div>
                  {line.error && (
                    <p className="mt-1 text-[10px] font-bold text-destructive animate-pulse">
                      {line.error}
                    </p>
                  )}
                </div>

                {/* Price + Delete */}
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-foreground">
                    ${toNum(line.subtotal).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveLine(line.id)
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Numpad */}
      <div className="border-t border-border px-3 py-3">
        {/* Mode Selector */}
        <div className="mb-2 flex gap-1">
          {(["quantity", "discount", "price"] as NumpadMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onNumpadModeChange(mode)}
              className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-all ${numpadMode === mode
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
            >
              {mode === "quantity" ? "Cant" : mode === "discount" ? "Desc %" : "Precio"}
            </button>
          ))}
        </div>

        {/* Numpad Grid */}
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "CE"].map(
            (key) => (
              <button
                key={key}
                type="button"
                onClick={() => onNumpadInput(key)}
                className={`flex h-12 items-center justify-center rounded-xl text-base font-bold transition-all active:scale-95 ${key === "CE"
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "bg-muted text-foreground hover:bg-muted-foreground/10 border border-border/50"
                  }`}
              >
                {key === "CE" ? "←" : key}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Totals & Pay */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>IVA</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-dashed border-border pt-2">
            <span className="text-base font-bold text-foreground">Total</span>
            <span className="text-xl font-black text-primary">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>

        <Button
          onClick={onPay}
          disabled={lines.length === 0}
          className="w-full rounded-xl py-6 text-sm font-bold shadow-lg shadow-primary/25"
          size="lg"
        >
          Pagar ${total.toFixed(2)}
        </Button>
      </div>
    </div>
  )
}
