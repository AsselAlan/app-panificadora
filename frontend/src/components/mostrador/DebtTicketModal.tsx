import React, { useState, useEffect } from 'react'
import { MessageCircle, Printer } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../supabaseClient'

/**
 * DebtTicketModal compartido
 * Muestra e imprime el comprobante de cobro de deuda con historial completo de compras adeudadas y productos.
 * Imprime optimizado para impresora térmica 80mm y genera texto formateado para WhatsApp.
 */
export const DebtTicketModal: React.FC<{ data: any; onClose: () => void }> = ({ data, onClose }) => {
  const { products } = useStore()
  const [tickets, setTickets] = useState<any[]>([])
  const [itemsByTicket, setItemsByTicket] = useState<Record<string, any[]>>({})
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    const clientId = data.client_id || data.clientId || data.client?.id
    if (!clientId) { setLoadingHistory(false); return }

    const fetchHistory = async () => {
      setLoadingHistory(true)
      try {
        const targetDebt = Math.abs(data.old_balance || data.totalDebt || 0)

        if (targetDebt <= 0) {
          setTickets([])
          setItemsByTicket({})
          setLoadingHistory(false)
          return
        }

        // Función aux para detectar si una venta dejó saldo a cuenta / fiado
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
          console.warn('Error al consultar ventas remotas para comprobante:', err)
        }

        // 3. Fusionar ventas sin duplicar
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

        // 4. Cargar ítems (de propiedad local o de la tabla sale_items)
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
      } catch (e) {
        console.error('Error al cargar historial para ticket:', e)
      } finally {
        setLoadingHistory(false)
      }
    }
    fetchHistory()
  }, [data.client_id, data.clientId, data.client, data.old_balance])

  const getProductName = (item: any) => {
    if (item.name) return item.name
    const p = products.find((pr: any) => pr.id === item.product_id)
    return p ? p.name : 'Producto'
  }

  // Cálculos de saldo anterior y saldo inicial legacy
  const totalOldDebt = Math.abs(data.old_balance || 0)
  const sumTicketFiado = tickets.reduce((acc, t) => {
    const account = Number(t.payment_account || 0)
    const fiado = account > 0 ? account : Math.max(0, Number(t.subtotal_sales || t.final_total || 0) - Number(t.total_returns || 0) - Number(t.payment_cash || 0) - Number(t.payment_transfer || 0))
    return acc + fiado
  }, 0)
  const legacyBalance = Math.max(0, totalOldDebt - sumTicketFiado)

  // CSS optimizado para impresora térmica 80mm
  const TICKET_CSS = [
    '@page { size: 80mm auto; margin: 3mm 4mm; }',
    '* { box-sizing: border-box; }',
    "body { font-family: 'Courier New', monospace; font-size: 9pt; color: #000; background: #fff; width: 72mm; margin: 0 auto; }",
    '.center { text-align: center; }',
    '.bold { font-weight: bold; }',
    '.title { font-size: 12pt; font-weight: bold; text-align: center; letter-spacing: 2px; margin-bottom: 2px; }',
    '.subtitle { font-size: 8pt; text-align: center; }',
    '.divider { border: none; border-top: 1px dashed #000; margin: 4px 0; }',
    '.row { display: flex; justify-content: space-between; margin: 2px 0; }',
    '.row-sm { display: flex; justify-content: space-between; margin: 1px 0; font-size: 8pt; }',
    '.section-title { font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 5px 0 2px; }',
    '.ticket-block { border-top: 1px dotted #bbb; padding-top: 3px; margin-top: 3px; }',
    '.item-row { display: flex; justify-content: space-between; font-size: 7.5pt; margin: 1px 0 1px 8px; }',
    '.acum { font-size: 7.5pt; text-align: right; border-top: 1px dotted #ccc; margin-top: 2px; padding-top: 1px; }',
    '.total-deuda { display: flex; justify-content: space-between; font-weight: bold; font-size: 9pt; margin: 3px 0; }',
    '.footer { font-size: 7.5pt; text-align: center; margin-top: 6px; }',
  ].join('\n')

  const buildWhatsAppText = () => {
    let text = 'PANIFICADORA FENIX\nCOMPROBANTE DE PAGO\nTicket #' + data.id +
      '\nCliente: ' + data.client_name +
      '\nFecha: ' + new Date(data.date).toLocaleString('es-AR') + '\n' +
      '--------------------------------\n' +
      '*ABONO REALIZADO: $' + Number(data.amount).toLocaleString('es-AR') + '*\n' +
      'Método de Pago: ' + String(data.method).toUpperCase() + '\n' +
      '--------------------------------\n' +
      'DETALLE COMPRAS QUE GENERARON DEUDA:\n'

    let acum = 0
    if (tickets.length > 0) {
      tickets.forEach((t: any, i: number) => {
        const account = Number(t.payment_account || 0)
        const fiadoAmount = account > 0 ? account : Math.max(0, Number(t.subtotal_sales || t.final_total || 0) - Number(t.total_returns || 0) - Number(t.payment_cash || 0) - Number(t.payment_transfer || 0))
        acum += fiadoAmount
        const tItems = itemsByTicket[t.id] || []
        const tDate = new Date(t.transaction_date).toLocaleDateString('es-AR')
        text += `\n*Compra #${i + 1} (${tDate}) — Fiado: $${fiadoAmount.toLocaleString('es-AR')}*\n`
        tItems.forEach((item: any) => {
          const pName = getProductName(item)
          const subtotal = item.quantity * item.unit_price
          text += `  • ${item.quantity}x ${pName} ($${subtotal.toLocaleString('es-AR')})\n`
        })
        text += `  Acumulado: $${acum.toLocaleString('es-AR')}\n`
      })

      if (legacyBalance > 0) {
        acum += legacyBalance
        text += `\n*Saldo Cta. Cte. Anterior / Inicial: $${legacyBalance.toLocaleString('es-AR')}*\n`
        text += `  Acumulado Total: $${acum.toLocaleString('es-AR')}\n`
      }
    } else if (totalOldDebt > 0) {
      text += `\n*Saldo Cta. Cte. Anterior / Inicial: $${totalOldDebt.toLocaleString('es-AR')}*\n`
    }

    text += '--------------------------------\n' +
      'Deuda Total Anterior: -$' + totalOldDebt.toLocaleString('es-AR') + '\n' +
      '*Nuevo Saldo Restante: $' + Math.abs(data.new_balance).toLocaleString('es-AR') + (data.new_balance < 0 ? ' (Deuda)' : '') + '*\n\n' +
      '¡Gracias por su pago!'

    return text
  }

  const handlePrint = () => {
    const printContent = document.getElementById('debt-ticket-shared')?.innerHTML
    if (!printContent) return
    const w = window.open('', '_blank')
    if (w) {
      w.document.write('<html><head><title>Recibo</title><style>' + TICKET_CSS + '</style></head><body>' + printContent + '</body></html>')
      w.document.close()
      w.focus()
      setTimeout(() => { w.print(); w.close() }, 600)
    }
  }

  let runningTotal = 0

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
      <div className="bg-bg-app rounded-3xl w-full max-w-sm shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center">

          {/* Ticket imprimible — optimizado 80mm */}
          <div className="bg-white p-4 shadow-sm rounded-xl w-full font-mono text-xs text-black mb-4" id="debt-ticket-shared">

            {/* Cabecera */}
            <div className="center mb-3">
              <p className="title">PANIFICADORA FENIX</p>
              <p className="subtitle">Comprobante de Pago a Cta. Cte.</p>
              <p className="subtitle" style={{ marginTop: '2px' }}>N {data.id}</p>
            </div>
            <hr className="divider" />

            {/* Datos del cobro */}
            <div style={{ marginBottom: '4px' }}>
              <div className="row-sm"><span>Fecha:</span><span>{new Date(data.date).toLocaleDateString('es-AR')}</span></div>
              <div className="row-sm"><span>Hora:</span><span>{new Date(data.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span></div>
              <div className="row-sm"><span>Cliente:</span><span className="bold">{data.client_name}</span></div>
            </div>
            <hr className="divider" />
            <div className="row bold" style={{ fontSize: '11pt', margin: '4px 0' }}>
              <span>ABONO:</span><span>${(data.amount as number).toLocaleString('es-AR')}</span>
            </div>
            <div className="row-sm">
              <span>METODO:</span>
              <span style={{ textTransform: 'uppercase' }}>{data.method}</span>
            </div>

            {/* Historial de tickets que generaron la deuda */}
            {!loadingHistory && (
              <>
                <hr className="divider" style={{ marginTop: '6px' }} />
                <p className="section-title">Detalle Compras que Generaron Deuda</p>

                {tickets.length > 0 ? (
                  <>
                    {tickets.map((ticket: any, idx: number) => {
                      const account = Number(ticket.payment_account || 0)
                      const fiadoAmount = account > 0 ? account : Math.max(0, Number(ticket.subtotal_sales || ticket.final_total || 0) - Number(ticket.total_returns || 0) - Number(ticket.payment_cash || 0) - Number(ticket.payment_transfer || 0))
                      runningTotal += fiadoAmount
                      const tItems = itemsByTicket[ticket.id] || []
                      const tDate = new Date(ticket.transaction_date)
                      return (
                        <div key={ticket.id} className="ticket-block">
                          <div className="row">
                            <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
                              #{idx + 1} {tDate.toLocaleDateString('es-AR')}
                            </span>
                            <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
                              +${fiadoAmount.toLocaleString('es-AR')}
                            </span>
                          </div>
                          {tItems.length > 0 ? (
                            tItems.map((item: any, i: number) => (
                              <div key={i} className="item-row">
                                <span>{item.quantity}x {getProductName(item)}</span>
                                <span>${(item.quantity * item.unit_price).toLocaleString('es-AR')}</span>
                              </div>
                            ))
                          ) : (
                            <div className="item-row" style={{ fontStyle: 'italic', color: '#666' }}>
                              <span>Sin detalle de productos</span>
                            </div>
                          )}
                          <div className="acum">
                            Acum: <strong>${runningTotal.toLocaleString('es-AR')}</strong>
                          </div>
                        </div>
                      )
                    })}

                    {legacyBalance > 0 && (
                      <div className="ticket-block">
                        <div className="row">
                          <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
                            Saldo Cta. Cte. Anterior / Inicial
                          </span>
                          <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
                            +${legacyBalance.toLocaleString('es-AR')}
                          </span>
                        </div>
                        <div className="item-row" style={{ fontStyle: 'italic', color: '#666' }}>
                          <span>Saldo de apertura previo</span>
                        </div>
                        <div className="acum">
                          Acum Total: <strong>${(runningTotal + legacyBalance).toLocaleString('es-AR')}</strong>
                        </div>
                      </div>
                    )}

                    <hr className="divider" />
                    <div className="total-deuda">
                      <span>DEUDA TOTAL ANTERIOR:</span>
                      <span>${totalOldDebt.toLocaleString('es-AR')}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ticket-block">
                      <div className="row">
                        <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
                          Saldo Cta. Cte. Anterior / Inicial
                        </span>
                        <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
                          +${totalOldDebt.toLocaleString('es-AR')}
                        </span>
                      </div>
                      <div className="item-row" style={{ fontStyle: 'italic', color: '#666' }}>
                        <span>Saldo de apertura / cargado previamente</span>
                      </div>
                    </div>
                    <hr className="divider" />
                    <div className="total-deuda">
                      <span>DEUDA TOTAL ANTERIOR:</span>
                      <span>${totalOldDebt.toLocaleString('es-AR')}</span>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Saldos finales */}
            <hr className="divider" />
            <div className="row-sm">
              <span>Saldo Anterior:</span>
              <span>-${totalOldDebt.toLocaleString('es-AR')}</span>
            </div>
            <div className="row bold">
              <span>Nuevo Saldo:</span>
              <span>${Math.abs(data.new_balance).toLocaleString('es-AR')} {data.new_balance < 0 ? '(Deuda)' : ''}</span>
            </div>
            <hr className="divider" />
            <div className="footer">
              <p>*** DOC. NO VALIDO COMO FACTURA ***</p>
              <p className="bold" style={{ marginTop: '4px' }}>Gracias por su pago!</p>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="p-4 bg-bg-surface border-t border-brand-muted/10 rounded-b-3xl grid grid-cols-2 gap-2">
          <button
            onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(buildWhatsAppText()), '_blank')}
            className="bg-[#25D366] hover:bg-green-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors text-sm"
          >
            <MessageCircle size={16} /> Enviar
          </button>
          <button
            onClick={handlePrint}
            className="bg-brand-navy hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors text-sm"
          >
            <Printer size={16} /> Imprimir
          </button>
          <button
            onClick={onClose}
            className="col-span-2 mt-2 bg-brand-muted/10 hover:bg-brand-muted/20 text-brand-deep font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors text-sm"
          >
            Cerrar Recibo
          </button>
        </div>
      </div>
    </div>
  )
}
