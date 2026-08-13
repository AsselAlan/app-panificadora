import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useStore } from '../../store/useStore'

/**
 * DebtHistorySection
 * Muestra las compras adeudadas no pagadas que conforman la deuda actual del cliente.
 * Combina ventas locales y de Supabase para soportar modo Offline-First.
 */
export const DebtHistorySection: React.FC<{ clientId: string; totalDebt: number }> = ({ clientId, totalDebt }) => {
  const { products } = useStore()
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState<any[]>([])
  const [itemsByTicket, setItemsByTicket] = useState<Record<string, any[]>>({})

  useEffect(() => {
    if (!expanded) return
    fetchDebtHistory()
  }, [expanded, clientId, totalDebt])

  const fetchDebtHistory = async () => {
    setLoading(true)
    try {
      const targetDebt = Math.abs(totalDebt || 0)

      const isDebtSale = (s: any) => {
        if (s.status === 'cancelled') return false
        const subtotal = Number(s.subtotal_sales || s.final_total || 0)
        const cash = Number(s.payment_cash || 0)
        const transfer = Number(s.payment_transfer || 0)
        const account = Number(s.payment_account || 0)
        const returns = Number(s.total_returns || 0)
        return account > 0 || (subtotal - returns - cash - transfer) > 0
      }

      // 1. Obtener ventas locales del store
      const storeSales = useStore.getState().sales || []
      const localDebtSales = storeSales.filter((s: any) => s.client_id === clientId && isDebtSale(s))

      // 2. Traer ventas de Supabase si hay conexión
      let remoteDebtSales: any[] = []
      try {
        const { data: sales } = await supabase
          .from('sales')
          .select('*')
          .eq('client_id', clientId)
          .order('transaction_date', { ascending: false })

        if (sales) {
          remoteDebtSales = sales.filter((s: any) => isDebtSale(s))
        }
      } catch (err) {
        console.warn('Error al consultar ventas remotas para historial de deuda:', err)
      }

      // 3. Fusionar ventas sin duplicar
      const salesMap = new Map<string, any>()
      remoteDebtSales.forEach(s => salesMap.set(s.id, s))
      localDebtSales.forEach(s => salesMap.set(s.id, s))

      // Ordenar de más reciente a más antigua
      const allDebtSalesDesc = Array.from(salesMap.values()).sort(
        (a: any, b: any) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      )

      // Seleccionar únicamente los tickets más recientes que componen la deuda actual
      const selectedUnpaidTickets: any[] = []
      let accum = 0

      for (const s of allDebtSalesDesc) {
        if (accum >= targetDebt && targetDebt > 0) break
        const account = Number(s.payment_account || 0)
        const fiadoAmount = account > 0 ? account : Math.max(0, Number(s.subtotal_sales || s.final_total || 0) - Number(s.total_returns || 0) - Number(s.payment_cash || 0) - Number(s.payment_transfer || 0))
        if (fiadoAmount > 0) {
          selectedUnpaidTickets.push(s)
          accum += fiadoAmount
        }
      }

      // Ordenar cronológicamente (antiguo -> nuevo) para renderizado
      const finalUnpaidTickets = selectedUnpaidTickets.sort(
        (a: any, b: any) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      )

      setTickets(finalUnpaidTickets)

      // 4. Cargar ítems
      const grouped: Record<string, any[]> = {}
      const missingSaleIds: string[] = []

      finalUnpaidTickets.forEach((s: any) => {
        if (Array.isArray(s.items) && s.items.length > 0) {
          grouped[s.id] = s.items.filter((i: any) => !i.operation_type || i.operation_type === 'sale')
        } else {
          missingSaleIds.push(s.id)
        }
      })

      if (missingSaleIds.length > 0) {
        try {
          const { data: items } = await supabase
            .from('sale_items')
            .select('sale_id, product_id, quantity, unit_price, operation_type')
            .in('sale_id', missingSaleIds)

          if (items) {
            for (const item of items) {
              if (!item.operation_type || item.operation_type === 'sale') {
                if (!grouped[item.sale_id]) grouped[item.sale_id] = []
                grouped[item.sale_id].push(item)
              }
            }
          }
        } catch (err) {
          console.warn('Error consultando sale_items:', err)
        }
      }

      setItemsByTicket(grouped)
    } catch (err) {
      console.error('Error al cargar historial de deuda:', err)
    } finally {
      setLoading(false)
    }
  }

  const getProductName = (item: any) => {
    if (item.name) return item.name
    const p = products.find((pr: any) => pr.id === item.product_id)
    return p ? p.name : 'Producto'
  }

  let runningTotal = 0
  const sumTicketFiado = tickets.reduce((acc, t) => {
    const account = Number(t.payment_account || 0)
    const fiado = account > 0 ? account : Math.max(0, Number(t.subtotal_sales || t.final_total || 0) - Number(t.total_returns || 0) - Number(t.payment_cash || 0) - Number(t.payment_transfer || 0))
    return acc + fiado
  }, 0)
  const legacyBalance = Math.max(0, Math.abs(totalDebt || 0) - sumTicketFiado)

  return (
    <div className="border border-orange-200 rounded-2xl overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-orange-700">
          <FileText size={15} />
          Ver detalle de compras adeudadas
        </span>
        {expanded ? <ChevronUp size={16} className="text-orange-500" /> : <ChevronDown size={16} className="text-orange-500" />}
      </button>

      {expanded && (
        <div className="bg-white px-4 pb-4 pt-2 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 size={24} className="animate-spin text-orange-400" />
            </div>
          ) : tickets.length === 0 && legacyBalance === 0 ? (
            <p className="text-xs text-brand-muted text-center py-4">
              No se encontraron compras con deuda registrada
            </p>
          ) : (
            <div className="space-y-3 mt-1">
              {/* Compras registradas */}
              {tickets.map((ticket, idx) => {
                const account = Number(ticket.payment_account || 0)
                const fiadoAmount = account > 0 ? account : Math.max(0, Number(ticket.subtotal_sales || ticket.final_total || 0) - Number(ticket.total_returns || 0) - Number(ticket.payment_cash || 0) - Number(ticket.payment_transfer || 0))
                runningTotal += fiadoAmount
                const items = itemsByTicket[ticket.id] || []
                const date = new Date(ticket.transaction_date)

                return (
                  <div key={ticket.id} className="border border-orange-100 rounded-xl p-3 bg-orange-50/50">
                    {/* Encabezado del ticket */}
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                          Compra #{idx + 1} — {date.toLocaleDateString('es-AR')}
                        </span>
                        <p className="text-[10px] text-brand-muted">{date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-red-500 block">+${fiadoAmount.toLocaleString('es-AR')}</span>
                        <span className="text-[10px] text-brand-muted">fiado</span>
                      </div>
                    </div>

                    {/* Items del ticket */}
                    {items.length > 0 ? (
                      <div className="space-y-1 mb-2">
                        {items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-[10px] text-brand-deep/80">
                            <span>{item.quantity} × {getProductName(item)}</span>
                            <span className="font-semibold">${(item.quantity * item.unit_price).toLocaleString('es-AR')}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-brand-muted/70 italic mb-2">Sin detalle de productos</p>
                    )}

                    {/* Footer del ticket */}
                    <div className="border-t border-orange-100 pt-1.5 flex justify-between items-center">
                      <span className="text-[10px] text-brand-muted">
                        Pagó: ${((ticket.payment_cash || 0) + (ticket.payment_transfer || 0)).toLocaleString('es-AR')} |
                        Total: ${(ticket.subtotal_sales || 0).toLocaleString('es-AR')}
                      </span>
                      <span className="text-[10px] font-bold text-orange-600">
                        Acum: ${runningTotal.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* Saldo anterior legacy */}
              {legacyBalance > 0 && (
                <div className="border border-orange-100 rounded-xl p-3 bg-orange-50/50 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">
                      Saldo Cta. Cte. Anterior / Inicial
                    </span>
                    <span className="text-[10px] text-brand-muted">Cargado manualmente en apertura</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-red-500 block">+${legacyBalance.toLocaleString('es-AR')}</span>
                    <span className="text-[10px] font-bold text-orange-600">Total: ${(runningTotal + legacyBalance).toLocaleString('es-AR')}</span>
                  </div>
                </div>
              )}

              {/* Resumen total */}
              <div className="pt-2 border-t border-orange-200 flex justify-between items-center">
                <span className="text-xs font-bold text-orange-800 uppercase">Deuda Total Acumulada</span>
                <span className="text-sm font-black text-red-600">${Math.abs(totalDebt || 0).toLocaleString('es-AR')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
