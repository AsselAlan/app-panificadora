import React from 'react'
import { RefreshCw, Send, CheckCircle, Clock, MessageCircle, ArrowLeft } from 'lucide-react'
import { useStore, type SyncItem } from '../store/useStore'
import Swal from 'sweetalert2'

interface DriverSyncQueueProps {
  onBack: () => void;
  driverId: string;
}

export const DriverSyncQueue: React.FC<DriverSyncQueueProps> = ({ onBack }) => {
  const { syncQueue, isSyncing, processSyncQueue, isOffline } = useStore()
  
  const handleSync = async () => {
    if (isOffline) {
      Swal.fire('Sin conexión', 'Debes recuperar la señal de internet (4G/WiFi) antes de sincronizar.', 'warning')
      return
    }
    await processSyncQueue()
    Swal.fire('¡Listo!', 'Se ha intentado sincronizar la información.', 'info')
  }

  const buildWhatsAppText = (sale: any) => {
    const total = sale.final_total?.toFixed(2) || '0.00'
    const date = new Date(sale.transaction_date).toLocaleString('es-AR')
    return `*Panificadora - Comprobante de Venta*\nFecha: ${date}\nTotal: $${total}\n\n*Muchas gracias por su compra!*`
  }

  const handleWhatsApp = (sale: any) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppText(sale))}`, '_blank')
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white shadow-sm p-4 sticky top-0 z-20 flex justify-between items-center rounded-t-3xl sm:rounded-t-none">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-brand-muted hover:bg-slate-100 active:scale-95 transition-all">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-black text-brand-navy">Lista de Espera</h2>
            <p className="text-sm text-brand-muted">Operaciones sin internet</p>
          </div>
        </div>
        <button 

          onClick={handleSync}
          disabled={isSyncing || syncQueue.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-sm transition-all ${
            isOffline ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-brand-primary text-white active:scale-95'
          }`}
        >
          {isSyncing ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {syncQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-brand-muted opacity-60">
            <CheckCircle size={64} className="mb-4 text-green-400" />
            <h3 className="text-lg font-bold">Todo está al día</h3>
            <p className="text-sm text-center">No hay operaciones pendientes de envío.</p>
          </div>
        ) : (
          syncQueue.map((item: SyncItem, index) => {
            const isSale = item.type === 'sale'
            const isExpense = item.type === 'expense'
            const isEndRoute = item.type === 'end_route'

            return (
              <div key={item.id + index} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-orange-500" />
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Pendiente de envío</span>
                  </div>
                  {isSale && (
                    <span className="text-xs font-bold bg-brand-primary/10 text-brand-primary px-2 py-1 rounded-full">VENTA</span>
                  )}
                  {isExpense && (
                    <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full">GASTO</span>
                  )}
                  {isEndRoute && (
                    <span className="text-xs font-bold bg-brand-navy/10 text-brand-navy px-2 py-1 rounded-full">FIN RUTA</span>
                  )}
                </div>

                <div className="mt-2">
                  {isSale && (
                    <>
                      <h4 className="font-bold text-brand-navy">{item.payload.client_name || 'Cliente Desconocido'}</h4>
                      <p className="text-xl font-black text-brand-primary">${item.payload.final_total?.toFixed(2)}</p>
                      <button 
                        onClick={() => handleWhatsApp(item.payload)}
                        className="mt-3 flex items-center justify-center gap-2 w-full bg-[#25D366]/10 text-[#25D366] font-bold py-2 rounded-xl active:scale-95 transition-all text-sm"
                      >
                        <MessageCircle size={16} /> Enviar Comprobante (WhatsApp)
                      </button>
                    </>
                  )}
                  {isExpense && (
                    <>
                      <h4 className="font-bold text-slate-700">Gasto: {item.payload.category}</h4>
                      <p className="text-xl font-black text-red-500">-${item.payload.amount?.toFixed(2)}</p>
                      <p className="text-sm text-brand-muted truncate">{item.payload.description}</p>
                    </>
                  )}
                  {isEndRoute && (
                    <>
                      <h4 className="font-bold text-brand-navy">Cierre de Recorrido</h4>
                      <p className="text-sm text-brand-muted">Devolución de stock y rendición de caja pendientes.</p>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
