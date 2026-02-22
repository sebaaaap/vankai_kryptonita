"use client"

import type { Product } from "./pdv-types"
import { Search, Package, AlertTriangle, Wrench } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface PdvProductGridProps {
  products: Product[]
  selectedCategoryId: string
  onAddProduct: (product: Product) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function PdvProductGrid({
  products,
  selectedCategoryId,
  onAddProduct,
  searchQuery,
  onSearchChange,
}: PdvProductGridProps) {
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategoryId === "all" || product.categoryId === selectedCategoryId
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.includes(searchQuery)
    return matchesCategory && matchesSearch
  })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search Bar */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar producto o escanear codigo de barras..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="form-input pl-10"
          />
        </div>
      </div>

      {/* Product Grid */}
      <ScrollArea className="flex-1 px-4">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package className="mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm font-medium">No se encontraron productos</p>
            <p className="text-xs">Intenta con otra busqueda o categoria</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => {
              const isService = product.categoryId === "servicios" || String(product.categoryId).toLowerCase().includes("serv")
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onAddProduct(product)}
                  disabled={product.stock <= 0}
                  className={`group relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all hover:brightness-95 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed`}
                  style={{
                    backgroundColor: `${product.color}15`,
                    borderColor: `${product.color}30`
                  }}
                >
                  {/* Stock Warning */}
                  {product.stock <= 5 && product.stock > 0 && !isService && (
                    <div className="absolute right-2 top-2">
                      <AlertTriangle className="h-3.5 w-3.5" style={{ color: product.color }} />
                    </div>
                  )}

                  {/* Product Icon Area */}
                  <div
                    className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-white/60 shadow-sm`}
                  >
                    {isService ? (
                      <Wrench className="h-5 w-5" style={{ color: product.color }} />
                    ) : (
                      <Package className="h-5 w-5" style={{ color: product.color }} />
                    )}
                  </div>

                  {/* Product Info */}
                  <span className="mb-1 line-clamp-2 text-xs font-semibold leading-tight text-foreground">
                    {product.name}
                  </span>

                  <div className="mt-auto flex w-full items-end justify-between">
                    <span className="text-base font-bold text-primary">
                      ${product.price ? product.price.toFixed(2) : "0.00"}
                    </span>
                    {product.unit && (
                      <Badge
                        variant="outline"
                        className="h-5 rounded-md px-1.5 text-[9px] font-medium"
                      >
                        {product.unit}
                      </Badge>
                    )}
                  </div>

                  {/* Stock Info */}
                  <span className="mt-1.5 text-[10px] text-muted-foreground">
                    {isService
                      ? "Servicio"
                      : product.stock > 99
                        ? "99+ en stock"
                        : `${product.stock} en stock`}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea >
    </div >
  )
}
