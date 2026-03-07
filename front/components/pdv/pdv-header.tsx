"use client"

import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Customer, Order } from "./pdv-types"
import { customers } from "./pdv-data"
import {
  User,
  ChevronDown,
  ShoppingCart,
  Plus,
  Clock,
  LogOut,
  Settings,
  Wrench,
  LayoutDashboard,
  Car,
  Search,
  UserPlus,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { PdvQuickCustomer } from "./pdv-quick-customer"
import { useState, useMemo } from "react"

interface PdvHeaderProps {
  currentOrder: Order
  orders: Order[]
  selectedCustomer: Customer | null
  onSelectCustomer: (customer: Customer) => void
  onNewOrder: () => void
  onSelectOrder: (order: Order) => void
  onOpenHistory: () => void
  onGoToBackend: () => void
  onOpenCloseSession: () => void // New prop to trigger the modal
  activeSessionName?: string
  customersList?: any[]
  onCustomerCreated?: () => void
  onOpenOtPayment?: () => void
  userName?: string
}

export function PdvHeader({
  currentOrder,
  orders,
  selectedCustomer,
  onSelectCustomer,
  onNewOrder,
  onSelectOrder,
  onOpenHistory,
  onGoToBackend,
  onOpenCloseSession,
  activeSessionName = "Caja Principal",
  customersList,
  onCustomerCreated,
  onOpenOtPayment,
  userName,
}: PdvHeaderProps) {
  const draftOrders = orders.filter((o) => o.status === "draft")
  const [searchTerm, setSearchTerm] = useState("")
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false)

  // Fetch active OTs to show indicators (only those with pending balance)
  const { data: activeOts } = useSWR("/pos/active-orders?pos_only=true", async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/pos/active-orders?pos_only=true`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      return response.json();
    } catch (e) { return [] }
  });

  const customerOts = useMemo(() => {
    if (!selectedCustomer || !activeOts) return [];
    return activeOts.filter((ot: any) =>
      String(ot.customer_id) === selectedCustomer.id ||
      ot.customer?.rut === selectedCustomer.rut
    );
  }, [selectedCustomer, activeOts]);

  const filteredCustomers = useMemo(() => {
    const list = customersList || customers
    if (!searchTerm) return list
    const term = searchTerm.toLowerCase()
    return list.filter(c =>
      c.name?.toLowerCase().includes(term) ||
      c.rut?.toLowerCase().includes(term) ||
      (c.vehicles && c.vehicles.some((v: any) => v.license_plate?.toLowerCase().includes(term)))
    )
  }, [customersList, customers, searchTerm])

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
      {/* Left: Logo + Session */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Wrench className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-black text-foreground leading-none uppercase tracking-tight">Punto de Venta</h1>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              {userName || 'Usuario'} • {activeSessionName}
            </p>
          </div>
        </div>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Customer Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 rounded-lg text-xs bg-transparent">
              <User className="h-3.5 w-3.5" />
              <span className="max-w-[140px] truncate">
                {selectedCustomer?.name ?? "Publico en General"}
              </span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80 flex flex-col p-0 overflow-hidden">
            <div className="p-2 border-b border-border bg-muted/30 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por RUT o nombre..."
                  className="h-8 pl-8 text-xs bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsQuickCreateOpen(true)
                }}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[300px] overflow-auto py-1">
              {filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground italic">
                  No se encontraron resultados
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <DropdownMenuItem
                    key={customer.id}
                    onClick={() => onSelectCustomer(customer)}
                    className="flex flex-col items-start gap-0.5 py-2 px-3 mx-1 rounded-md"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-sm">{customer.name}</span>
                      {customer.rut && <Badge variant="outline" className="text-[10px] font-mono border-muted-foreground/30">{customer.rut}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      {customer.vehicles && customer.vehicles.length > 0 && (
                        <span className="flex items-center gap-1 font-medium">
                          <Car className="h-3 w-3" />
                          {customer.vehicles[0].license_plate}
                        </span>
                      )}
                      {customer.rfc && <span>RFC: {customer.rfc}</span>}
                      {customer.vehicle && !customer.vehicles && (
                        <span className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          {customer.vehicle}
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* OT Indicator for selected customer */}
        {selectedCustomer && customerOts.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenOtPayment}
            className="flex items-center gap-1.5 px-2 h-9 rounded-lg border-2 border-orange-500/50 bg-orange-50 text-orange-700 hover:bg-orange-100 animate-pulse transition-all ml-2"
          >
            <Wrench className="h-4 w-4" />
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] font-black uppercase tracking-tighter">OT Disponible</span>
              <span className="text-[11px] font-bold">{customerOts.length} {customerOts.length === 1 ? 'pendiente' : 'pendientes'}</span>
            </div>
          </Button>
        )}

        <PdvQuickCustomer
          open={isQuickCreateOpen}
          onOpenChange={setIsQuickCreateOpen}
          onSuccess={(customer) => {
            onSelectCustomer(customer);
            if (onCustomerCreated) onCustomerCreated();
            setSearchTerm("");
          }}
        />
      </div>

      {/* Center: Order Tabs */}
      <div className="flex items-center gap-1.5">
        {draftOrders.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => onSelectOrder(order)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${currentOrder.id === order.id
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>Orden {order.id.slice(-3)}</span>
            {order.lines.length > 0 && (
              <Badge
                variant="secondary"
                className="h-5 min-w-[20px] justify-center rounded-full px-1.5 text-[10px]"
              >
                {order.lines.length}
              </Badge>
            )}
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewOrder}
          className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-primary"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenHistory}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ordenes</span>
        </Button>

        <div className="h-6 w-px bg-border" />

        {/* Cerrar Sesion Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCloseSession}
          className="gap-1.5 text-xs rounded-lg border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all font-semibold"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar Caja
        </Button>

        <div className="h-6 w-px bg-border" />

        {/* Backend Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onGoToBackend}
          className="gap-1.5 text-xs rounded-lg bg-transparent font-semibold"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Backend
        </Button>
      </div>
    </header>
  )
}
