import React, { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../supabaseClient'

interface DebtHistoryPrintBlockProps {
  clientId: string
  currentSaleId?: string
  appliedDebt: number
  onHistoryLoaded?: (text: string) => void
}

/**
 * Componente imprimible que renderiza el desglose de compras adeudadas anteriores.
 * Se adjunta abajo del ticket de venta cuando el chofer/usuario marca "Incluir Deuda Previa".
 */
export const DebtHistoryPrintBlock: React.FC<DebtHistoryPrintBlockProps> = ({
  clientId,
  currentSaleId,
  appliedDebt,
  onHistoryLoaded
}) => {
  const { products } = useStore()
  const [tickets, setTickets] = useState<any[]>([])
  const [itemsByTicket, setItemsByTicket] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) { setLoading(false); return }

    const fetchHistory = async () => {
      setLoading(true)
      try {
        const targetDebt = Math.abs(appliedDebt || 0)

        const isDebtSale = (s: any) => {
          if (s.id === currentSaleId || s.status === 'cancelled') return false
          const subtotal = Number(s.subtotal_sales || s.final_total || 0)
          const cash = Number(s.payment_cash || 0)
          const transfer = Number(s.payment_transfer || 0)
          const account = Number(s.payment_account || 0)
          const returns = Number(s.total_returns || 0)
          return account > 0 || (subtotal - returns - cash - transfer) > 0
        }

        // 1. Obtener ventas locales
        const storeSales = useStore.getState().sales || []
        const localDebtSales = storeSales.filter((s: any) => s.client_id === clientId && isDebtSale(s))

        // 2. Obtener ventas remotas
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
          console.warn('Error cargando ventas para DebtHistoryPrintBlock:', err)
        }

        // 3. Fusionar
        const salesMap = new Map<string, any>()
        remoteDebtSales.forEach(s => salesMap.set(s.id, s))
        localDebtSales.forEach(s => salesMap.set(s.id, s))

        // Ordenar de más reciente a más antigua
        const allDebtSalesDesc = Array.from(salesMap.values()).sort(
          (a: any, b: any) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        )

        // Seleccionar los tickets más recientes que componen la deuda total anterior real
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
            console.warn('Error consultando sale_items para DebtHistoryPrintBlock:', err)
          }
        }

        setItemsByTicket(grouped)

        // Generar texto para WhatsApp si se requiere
        if (onHistoryLoaded) {
          let text = '\n--------------------------------\n' +
            '*DETALLE COMPRAS QUE GENERARON DEUDA:*\n'

          let acum = 0
          finalUnpaidTickets.forEach((t: any, i: number) => {
            const account = Number(t.payment_account || 0)
            const fiadoAmount = account > 0 ? account : Math.max(0, Number(t.subtotal_sales || t.final_total || 0) - Number(t.total_returns || 0) - Number(t.payment_cash || 0) - Number(t.payment_transfer || 0))
            acum += fiadoAmount
            const tItems = grouped[t.id] || []
            const tDate = new Date(t.transaction_date).toLocaleDateString('es-AR')
            text += `\n*Compra #${i + 1} (${tDate}) — Fiado: $${fiadoAmount.toLocaleString('es-AR')}*\n`
            tItems.forEach((item: any) => {
              const pName = item.name || products.find((pr: any) => pr.id === item.product_id)?.name || 'Producto'
              const subtotal = item.quantity * item.unit_price
              text += `  • ${item.quantity}x ${pName} ($${subtotal.toLocaleString('es-AR')})\n`
            })
            text += `  Acumulado: $${acum.toLocaleString('es-AR')}\n`
          })

          const sumTicketFiado = finalUnpaidTickets.reduce((sum: number, t: any) => {
            const account = Number(t.payment_account || 0)
            const fiado = account > 0 ? account : Math.max(0, Number(t.subtotal_sales || t.final_total || 0) - Number(t.total_returns || 0) - Number(t.payment_cash || 0) - Number(t.payment_transfer || 0))
            return sum + fiado
          }, 0)

          const legacyBalance = Math.max(0, appliedDebt - sumTicketFiado)
          if (legacyBalance > 0) {
            text += `\n*Saldo Cta. Cte. Anterior / Inicial: $${legacyBalance.toLocaleString('es-AR')}*\n`
          }

          text += `*DEUDA PREVIA INCLUIDA / COBRADA: $${appliedDebt.toLocaleString('es-AR')}*\n`
          onHistoryLoaded(text)
        }
      } catch (err) {
        console.error('Error en DebtHistoryPrintBlock:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [clientId, currentSaleId, appliedDebt])

  if (loading || appliedDebt <= 0) return null

  const getProductName = (item: any) => {
    if (item.name) return item.name
    const p = products.find((pr: any) => pr.id === item.product_id)
    return p ? p.name : 'Producto'
  }

  const sumTicketFiado = tickets.reduce((acc, t) => {
    const account = Number(t.payment_account || 0)
    const fiado = account > 0 ? account : Math.max(0, Number(t.subtotal_sales || t.final_total || 0) - Number(t.total_returns || 0) - Number(t.payment_cash || 0) - Number(t.payment_transfer || 0))
    return acc + fiado
  }, 0)

  const legacyBalance = Math.max(0, appliedDebt - sumTicketFiado)
  let runningTotal = 0

  return (
    <div style={{ marginTop: '8px' }}>
      <hr className="divider" style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
      <p className="section-title" style={{ fontSize: '8pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', margin: '5px 0 2px' }}>
        Detalle Compras que Generaron Deuda
      </p>

      {tickets.length > 0 ? (
        <>
          {tickets.map((ticket: any, idx: number) => {
            const account = Number(ticket.payment_account || 0)
            const fiadoAmount = account > 0 ? account : Math.max(0, Number(ticket.subtotal_sales || ticket.final_total || 0) - Number(ticket.total_returns || 0) - Number(ticket.payment_cash || 0) - Number(ticket.payment_transfer || 0))
            runningTotal += fiadoAmount
            const tItems = itemsByTicket[ticket.id] || []
            const tDate = new Date(ticket.transaction_date)
            return (
              <div key={ticket.id} className="ticket-block" style={{ borderTop: '1px dotted #bbb', paddingTop: '3px', marginTop: '3px' }}>
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
                    #{idx + 1} {tDate.toLocaleDateString('es-AR')}
                  </span>
                  <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
                    +${fiadoAmount.toLocaleString('es-AR')}
                  </span>
                </div>
                {tItems.length > 0 ? (
                  tItems.map((item: any, i: number) => (
                    <div key={i} className="item-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7.5pt', margin: '1px 0 1px 8px' }}>
                      <span>{item.quantity}x {getProductName(item)}</span>
                      <span>${(item.quantity * item.unit_price).toLocaleString('es-AR')}</span>
                    </div>
                  ))
                ) : (
                  <div className="item-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7.5pt', margin: '1px 0 1px 8px', fontStyle: 'italic', color: '#666' }}>
                    <span>Sin detalle de productos</span>
                  </div>
                )}
                <div className="acum" style={{ fontSize: '7.5pt', textAlign: 'right', borderTop: '1px dotted #ccc', marginTop: '2px', paddingTop: '1px' }}>
                  Acum: <strong>${runningTotal.toLocaleString('es-AR')}</strong>
                </div>
              </div>
            )
          })}

          {legacyBalance > 0 && (
            <div className="ticket-block" style={{ borderTop: '1px dotted #bbb', paddingTop: '3px', marginTop: '3px' }}>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
                  Saldo Cta. Cte. Anterior / Inicial
                </span>
                <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
                  +${legacyBalance.toLocaleString('es-AR')}
                </span>
              </div>
              <div className="item-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7.5pt', margin: '1px 0 1px 8px', fontStyle: 'italic', color: '#666' }}>
                <span>Saldo de apertura previo</span>
              </div>
              <div className="acum" style={{ fontSize: '7.5pt', textAlign: 'right', borderTop: '1px dotted #ccc', marginTop: '2px', paddingTop: '1px' }}>
                Acum Total: <strong>${(runningTotal + legacyBalance).toLocaleString('es-AR')}</strong>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="ticket-block" style={{ borderTop: '1px dotted #bbb', paddingTop: '3px', marginTop: '3px' }}>
          <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
              Saldo Cta. Cte. Anterior / Inicial
            </span>
            <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
              +${appliedDebt.toLocaleString('es-AR')}
            </span>
          </div>
          <div className="item-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7.5pt', margin: '1px 0 1px 8px', fontStyle: 'italic', color: '#666' }}>
            <span>Saldo de apertura / cargado previamente</span>
          </div>
        </div>
      )}

      <hr className="divider" style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
      <div className="row bold" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '8.5pt', margin: '3px 0' }}>
        <span>DEUDA PREVIA INCLUIDA:</span>
        <span>${appliedDebt.toLocaleString('es-AR')}</span>
      </div>
    </div>
  )
}
