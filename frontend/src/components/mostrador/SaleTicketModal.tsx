import React from 'react'
import { Printer, MessageCircle } from 'lucide-react'

interface SaleTicketData {
  id?: string;
  client_name: string;
  date: string;
  items: {
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
  subtotal_sales: number;
  payment_cash: number;
  payment_transfer: number;
  payment_account: number; // deuda (falta pagar) o a favor
}

export const SaleTicketModal: React.FC<{ data: SaleTicketData; onClose: () => void }> = ({ data, onClose }) => {
  const TICKET_CSS = `
    @page { size: 80mm auto; margin: 3mm 4mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 9pt; color: #000; background: #fff; width: 72mm; margin: 0 auto; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .title { font-size: 12pt; font-weight: bold; text-align: center; letter-spacing: 2px; margin-bottom: 2px; }
    .subtitle { font-size: 8pt; text-align: center; }
    .divider { border: none; border-top: 1px dashed #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .row-sm { display: flex; justify-content: space-between; margin: 1px 0; font-size: 8pt; }
    .section-title { font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 5px 0 2px; }
    .item-row { display: flex; justify-content: space-between; font-size: 8pt; margin: 2px 0; }
    .item-desc { text-align: left; margin-bottom: 1px; }
    .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 10pt; margin: 4px 0; }
    .footer { font-size: 7.5pt; text-align: center; margin-top: 6px; }
  `

  const buildWhatsAppText = () => {
    let text = `🍞 *PANIFICADORA*\n🧾 *TICKET DE COMPRA*\n👤 Cliente: ${data.client_name}\n📅 Fecha: ${new Date(data.date).toLocaleString('es-AR')}\n--------------------------------\n`
    data.items.forEach(item => {
      text += `• ${item.quantity}x ${item.name} ($${item.unit_price}) = $${item.subtotal.toLocaleString()}\n`
    })
    text += `--------------------------------\n💰 *TOTAL:* $${data.subtotal_sales.toLocaleString()}\n`
    
    if (data.payment_cash > 0) text += `💵 Efectivo: $${data.payment_cash.toLocaleString()}\n`
    if (data.payment_transfer > 0) text += `📱 Transf.: $${data.payment_transfer.toLocaleString()}\n`
    if (data.payment_account > 0) text += `📒 A Cta. Cte.: $${data.payment_account.toLocaleString()}\n`
    if (data.payment_account < 0) text += `💳 Vuelto / A favor: $${Math.abs(data.payment_account).toLocaleString()}\n`
    
    text += `\n¡Gracias por su compra!`
    return text
  }

  const handlePrint = () => {
    const printContent = document.getElementById('sale-ticket-print')?.innerHTML
    if (!printContent) return
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(`<html><head><title>Ticket de Venta</title><style>${TICKET_CSS}</style></head><body>${printContent}</body></html>`)
      w.document.close()
      w.focus()
      setTimeout(() => { w.print(); w.close() }, 600)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
      <div className="bg-bg-app rounded-3xl w-full max-w-sm shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center">
          {/* Ticket imprimible */}
          <div className="bg-white p-4 shadow-sm rounded-xl w-full font-mono text-xs text-black mb-4" id="sale-ticket-print">
            {/* Cabecera */}
            <div className="center mb-3">
              <p className="title">PANIFICADORA</p>
              <p className="subtitle">Ticket de Venta</p>
            </div>
            <hr className="divider" />
            
            {/* Datos */}
            <div style={{ marginBottom: '4px' }}>
              <div className="row-sm"><span>Fecha:</span><span>{new Date(data.date).toLocaleDateString('es-AR')}</span></div>
              <div className="row-sm"><span>Hora:</span><span>{new Date(data.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span></div>
              <div className="row-sm"><span>Cliente:</span><span className="bold">{data.client_name}</span></div>
            </div>
            <hr className="divider" />
            
            {/* Items */}
            <p className="section-title">Detalle</p>
            {data.items.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '4px' }}>
                <div className="item-desc">{item.name}</div>
                <div className="item-row">
                  <span>{item.quantity} x ${item.unit_price}</span>
                  <span className="bold">${item.subtotal.toLocaleString()}</span>
                </div>
              </div>
            ))}
            
            <hr className="divider" />
            
            {/* Totales */}
            <div className="total-row">
              <span>TOTAL:</span>
              <span>${data.subtotal_sales.toLocaleString()}</span>
            </div>
            
            <div style={{ marginTop: '6px' }}>
              {data.payment_cash > 0 && (
                <div className="row-sm"><span>Efectivo:</span><span>${data.payment_cash.toLocaleString()}</span></div>
              )}
              {data.payment_transfer > 0 && (
                <div className="row-sm"><span>Transferencia:</span><span>${data.payment_transfer.toLocaleString()}</span></div>
              )}
              {data.payment_account > 0 && (
                <div className="row-sm"><span>A Cta. Cte.:</span><span>${data.payment_account.toLocaleString()}</span></div>
              )}
              {data.payment_account < 0 && (
                <div className="row-sm"><span>Vuelto / A favor:</span><span>${Math.abs(data.payment_account).toLocaleString()}</span></div>
              )}
            </div>
            
            <hr className="divider" />
            <div className="footer">
              <p>*** DOC. NO VALIDO COMO FACTURA ***</p>
              <p className="bold" style={{ marginTop: '4px' }}>¡Gracias por su compra!</p>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="p-4 bg-bg-surface border-t border-brand-muted/10 rounded-b-3xl grid grid-cols-2 gap-2">
          <button
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppText())}`, '_blank')}
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
            Nueva Venta
          </button>
        </div>
      </div>
    </div>
  )
}
