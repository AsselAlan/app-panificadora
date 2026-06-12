import React, { useState } from 'react'
import { X, CreditCard, Banknote, FileText } from 'lucide-react'

type PaymentModalProps = {
  total: number
  onConfirm: (paymentCash: number, paymentTransfer: number) => void
  onClose: () => void
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ total, onConfirm, onClose }) => {
  const [cash, setCash] = useState<number | ''>('')
  const [transfer, setTransfer] = useState<number | ''>('')

  const numCash = Number(cash) || 0
  const numTransfer = Number(transfer) || 0
  const currentTotal = numCash + numTransfer
  const remaining = total - currentTotal
  const change = currentTotal > total ? currentTotal - total : 0

  const handleExactCash = () => {
    setCash(total)
    setTransfer('')
  }

  const handleExactTransfer = () => {
    setTransfer(total)
    setCash('')
  }

  const handleConfirm = () => {
    if (currentTotal >= total) {
      // Si paga de más con efectivo, el vuelto se descuenta del monto de efectivo real que ingresa a la caja
      const finalCash = numCash - change
      onConfirm(Math.max(0, finalCash), numTransfer)
    } else {
      // En mostrador no se fía en esta versión básica, exigir pago completo
      alert('El pago no cubre el total de la venta.')
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Banknote className="text-emerald-500" /> Confirmar Pago
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Resumen */}
        <div className="p-6">
          <div className="bg-slate-100 rounded-xl p-6 text-center mb-6">
            <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Total a Pagar</p>
            <p className="text-4xl font-black text-slate-800">${total.toLocaleString()}</p>
          </div>

          <div className="space-y-4">
            {/* Efectivo */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-bold text-slate-700">Efectivo</label>
                <button onClick={handleExactCash} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">Exacto</button>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  value={cash}
                  onChange={(e) => setCash(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Transferencia */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-bold text-slate-700">Transferencia</label>
                <button onClick={handleExactTransfer} className="text-xs font-bold text-blue-600 hover:text-blue-700">Exacto</button>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  value={transfer}
                  onChange={(e) => setTransfer(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Vuelto / Restante */}
          <div className={`mt-6 p-4 rounded-xl flex justify-between items-center ${currentTotal >= total ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
            <span className={`font-bold ${currentTotal >= total ? 'text-emerald-700' : 'text-red-700'}`}>
              {currentTotal >= total ? 'Vuelto:' : 'Falta:'}
            </span>
            <span className={`text-xl font-black ${currentTotal >= total ? 'text-emerald-700' : 'text-red-700'}`}>
              ${Math.abs(remaining).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            disabled={currentTotal < total}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all transform active:scale-95 flex items-center justify-center gap-2
              ${currentTotal >= total ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20' : 'bg-slate-300 cursor-not-allowed'}
            `}
          >
            <FileText size={18} /> Procesar Venta
          </button>
        </div>
      </div>
    </div>
  )
}
