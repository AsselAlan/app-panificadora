import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useStore } from '../../store/useStore'

/**
 * DebtHistorySection
 * Muestra los tickets que acumularon la deuda actual del cliente.
 * Solo incluye sales donde payment_account > 0 (fiado), en orden cronológico.
 */
export const DebtHistorySection: React.FC<{ clientId: string; totalDebt: number }> = ({ clientId, totalDebt }) => {
  const { products } = useStore()
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState<any[]>([])
  const [itemsByTicket, setItemsByTicket] = useState<Record<string, any[]>>({})

  useEffect(() => {
    if (!expanded || tickets.length > 0) return
    fetchDebtHistory()
  }, [expanded])

  const fetchDebtHistory = async () => {
    setLoading(true)
    try {
      // 1. Traer ventas donde se generó deuda (fiado)
      const { data: sales, error: salesErr } = await supabase
        .from('sales')
        .select('id, transaction_date, subtotal_sales, final_total, payment_cash, payment_transfer, payment_account')
        .eq('client_id', clientId)
        .gt('payment_account', 0)          // solo tickets con deuda generada
        .order('transaction_date', { ascending: true })

      if (salesErr) throw salesErr
      if (!sales || sales.length === 0) {
        setTickets([])
        setLoading(false)
        return
      }

      setTickets(sales)

      // 2. Traer items de esas ventas
      const saleIds = sales.map((s: any) => s.id)
      const { data: items, error: itemsErr } = await supabase
        .from('sale_items')
        .select('sale_id, product_id, quantity, unit_price, operation_type')
        .in('sale_id', saleIds)
        .eq('operation_type', 'sale')

      if (itemsErr) throw itemsErr

      // Agrupar por sale_id
      const grouped: Record<string, any[]> = {}
      for (const item of (items || [])) {
        if (!grouped[item.sale_id]) grouped[item.sale_id] = []
        grouped[item.sale_id].push(item)
      }
      setItemsByTicket(grouped)
    } catch (err) {
      console.error('Error al cargar historial de deuda:', err)
    } finally {
      setLoading(false)
    }
  }

  const getProductName = (productId: string) => {
    const p = products.find((pr: any) => pr.id === productId)
    return p ? p.name : 'Producto'
  }

  // Acumulador visual
  let runningTotal = 0

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
          Ver detalle de tickets adeudados
        </span>
        {expanded ? <ChevronUp size={16} className="text-orange-500" /> : <ChevronDown size={16} className="text-orange-500" />}
      </button>

      {expanded && (
        <div className="bg-white px-4 pb-4 pt-2 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 size={24} className="animate-spin text-orange-400" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-xs text-brand-muted text-center py-4">
              No se encontraron tickets con deuda registrada
            </p>
          ) : (
            <div className="space-y-3 mt-1">
              {tickets.map((ticket, idx) => {
                runningTotal += ticket.payment_account
                const items = itemsByTicket[ticket.id] || []
                const date = new Date(ticket.transaction_date)

                return (
                  <div key={ticket.id} className="border border-orange-100 rounded-xl p-3 bg-orange-50/50">
                    {/* Encabezado del ticket */}
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                          Ticket #{idx + 1} — {date.toLocaleDateString('es-AR')}
                        </span>
                        <p className="text-[10px] text-brand-muted">{date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-red-500 block">+${ticket.payment_account.toLocaleString()}</span>
                        <span className="text-[10px] text-brand-muted">fiado</span>
                      </div>
                    </div>

                    {/* Items del ticket */}
                    {items.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-[10px] text-brand-deep/80">
                            <span>{item.quantity} × {getProductName(item.product_id)}</span>
                            <span className="font-semibold">${(item.quantity * item.unit_price).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer del ticket */}
                    <div className="border-t border-orange-100 pt-1.5 flex justify-between items-center">
                      <span className="text-[10px] text-brand-muted">
                        Pagó: ${(ticket.payment_cash + ticket.payment_transfer).toLocaleString()} |
                        Vendido: ${ticket.subtotal_sales.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-orange-600">
                        Acum: ${runningTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* Total acumulado final */}
              <div className="flex justify-between items-center border-t-2 border-orange-300 pt-2 mt-2">
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Deuda Total Acumulada</span>
                <span className="text-sm font-black text-red-600">${totalDebt.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
