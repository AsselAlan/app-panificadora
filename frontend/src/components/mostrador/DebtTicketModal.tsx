import React, { useState, useEffect } from 'react'
import { MessageCircle, Printer } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../supabaseClient'

/**
 * DebtTicketModal compartido
 * Muestra el comprobante de cobro de deuda con historial de tickets adeudados.
 * Imprime optimizado para impresora termica 80mm.
 * Requiere: data.client_id para cargar historial.
 */
export const DebtTicketModal: React.FC<{ data: any; onClose: () => void }> = ({ data, onClose }) => {
  const { products } = useStore()
  const [tickets, setTickets] = useState<any[]>([])
  const [itemsByTicket, setItemsByTicket] = useState<Record<string, any[]>>({})
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    if (!data.client_id) { setLoadingHistory(false); return }
    const fetchHistory = async () => {
      try {
        const { data: sales } = await supabase
          .from('sales')
          .select('id, transaction_date, subtotal_sales, payment_cash, payment_transfer, payment_account')
          .eq('client_id', data.client_id)
          .gt('payment_account', 0)
          .order('transaction_date', { ascending: true })
        if (!sales || sales.length === 0) { setTickets([]); return }
        setTickets(sales)
        const { data: items } = await supabase
          .from('sale_items')
          .select('sale_id, product_id, quantity, unit_price, operation_type')
          .in('sale_id', sales.map((s: any) => s.id))
          .eq('operation_type', 'sale')
        const grouped: Record<string, any[]> = {}
        for (const item of (items || [])) {
          if (!grouped[item.sale_id]) grouped[item.sale_id] = []
          grouped[item.sale_id].push(item)
        }
        setItemsByTicket(grouped)
      } catch (e) { console.error(e) }
      finally { setLoadingHistory(false) }
    }
    fetchHistory()
  }, [data.client_id])

  const getProductName = (productId: string) => {
    const p = products.find((pr: any) => pr.id === productId)
    return p ? p.name : 'Producto'
  }

  // CSS optimizado para impresora termica 80mm
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
    let text = 'PANIFICADORA\nRECIBO DE PAGO\nTicket #' + data.id +
      '\nCliente: ' + data.client_name +
      '\nFecha: ' + new Date(data.date).toLocaleString('es-AR') + '\n'
    text += '--------------------------------\nMonto Abonado: $' + data.amount.toLocaleString() +
      '\nMetodo: ' + data.method.toUpperCase() + '\n'
    if (tickets.length > 0) {
      text += '--------------------------------\nDETALLE DEUDA ACUMULADA\n'
      let acum = 0
      tickets.forEach((t: any, i: number) => {
        acum += t.payment_account
        const tItems = itemsByTicket[t.id] || []
        text += '\n#' + (i + 1) + ' ' + new Date(t.transaction_date).toLocaleDateString('es-AR') +
          ' - Fiado: $' + t.payment_account.toLocaleString() + '\n'
        tItems.forEach((item: any) => {
          text += '  ' + item.quantity + 'x ' + getProductName(item.product_id) +
            ' $' + (item.quantity * item.unit_price).toLocaleString() + '\n'
        })
        text += '  Acumulado: $' + acum.toLocaleString() + '\n'
      })
      text += '--------------------------------\nDeuda Total: $' + Math.abs(data.old_balance).toLocaleString() + '\n'
    } else if (data.old_balance < 0) {
      text += '--------------------------------\nDETALLE DEUDA ACUMULADA\n'
      text += 'Saldo cargado manualmente o inicial.\nSin detalle de productos.\n'
    }
    text += '--------------------------------\nSaldo Anterior: -$' + Math.abs(data.old_balance).toLocaleString() +
      '\nNuevo Saldo: $' + Math.abs(data.new_balance).toLocaleString() +
      (data.new_balance < 0 ? ' (Deuda)' : '') + '\n\nGracias por su pago!'
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
              <p className="title">PANIFICADORA</p>
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
              <span>ABONO:</span><span>${(data.amount as number).toLocaleString()}</span>
            </div>
            <div className="row-sm">
              <span>METODO:</span>
              <span style={{ textTransform: 'uppercase' }}>{data.method}</span>
            </div>

            {/* Historial de tickets que generaron la deuda */}
            {!loadingHistory && (
              <>
                {tickets.length > 0 ? (
                  <>
                    <hr className="divider" style={{ marginTop: '6px' }} />
                    <p className="section-title">Detalle Deuda Acumulada</p>

                    {tickets.map((ticket: any, idx: number) => {
                      runningTotal += ticket.payment_account
                      const tItems = itemsByTicket[ticket.id] || []
                      const tDate = new Date(ticket.transaction_date)
                      return (
                        <div key={ticket.id} className="ticket-block">
                          <div className="row">
                            <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
                              #{idx + 1} {tDate.toLocaleDateString('es-AR')}
                            </span>
                            <span style={{ fontWeight: 'bold', fontSize: '8pt' }}>
                              +${ticket.payment_account.toLocaleString()}
                            </span>
                          </div>
                          {tItems.map((item: any, i: number) => (
                            <div key={i} className="item-row">
                              <span>{item.quantity}x {getProductName(item.product_id)}</span>
                              <span>${(item.quantity * item.unit_price).toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="acum">
                            Acum: <strong>${runningTotal.toLocaleString()}</strong>
                          </div>
                        </div>
                      )
                    })}

                    <hr className="divider" />
                    <div className="total-deuda">
                      <span>DEUDA TOTAL:</span>
                      <span>${Math.abs(data.old_balance).toLocaleString()}</span>
                    </div>
                  </>
                ) : data.old_balance < 0 ? (
                  <>
                    <hr className="divider" style={{ marginTop: '6px' }} />
                    <p className="section-title">Detalle Deuda Acumulada</p>
                    <div className="ticket-block center" style={{ fontSize: '7.5pt', color: '#555', padding: '6px 0' }}>
                      Saldo inicial o cargado manualmente.<br />Sin detalle de productos.
                    </div>
                    <hr className="divider" />
                    <div className="total-deuda">
                      <span>DEUDA TOTAL:</span>
                      <span>${Math.abs(data.old_balance).toLocaleString()}</span>
                    </div>
                  </>
                ) : null}
              </>
            )}

            {/* Saldos finales */}
            <hr className="divider" />
            <div className="row-sm">
              <span>Saldo Anterior:</span>
              <span>-${Math.abs(data.old_balance).toLocaleString()}</span>
            </div>
            <div className="row bold">
              <span>Nuevo Saldo:</span>
              <span>${Math.abs(data.new_balance).toLocaleString()} {data.new_balance < 0 ? '(Deuda)' : ''}</span>
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
