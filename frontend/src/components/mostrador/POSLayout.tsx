import { useState, useEffect } from 'react'
import { Store, ShoppingCart, Plus, Minus, Trash2, Tag, Loader2, Package, Printer, Share2, CheckCircle } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { PaymentModal } from './PaymentModal'
import Swal from 'sweetalert2'
import { useStore } from '../../store/useStore'
import type { Product } from '../../store/useStore'

type CartItem = Product & { quantity: number }

const TicketModal = ({ sale, onClose }: { sale: any, onClose: () => void }) => {
  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    let text = `*Panificadora System - Ticket*\n`
    text += `Cliente: ${sale.clientName}\n`
    text += `Fecha: ${sale.date.toLocaleString()}\n\n`
    sale.items.forEach((i: any) => {
      text += `${i.quantity}x ${i.name} - $${(i.unit_price * i.quantity).toLocaleString()}\n`
    })
    text += `\n*Total: $${sale.total.toLocaleString()}*`
    
    if (navigator.share) {
      navigator.share({
        title: 'Ticket de Compra',
        text: text
      }).catch(console.error)
    } else {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`
      window.open(url, '_blank')
    }
  }

  return (
    <div className="absolute inset-0 bg-bg-app/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-ticket, #printable-ticket * { visibility: visible; }
          #printable-ticket { position: absolute; left: 0; top: 0; width: 100%; max-width: 80mm; margin: 0; padding: 5mm; background: white; color: black; box-shadow: none; border: none; }
        }
      `}</style>
      <div className="bg-bg-surface shadow-2xl border border-brand-muted/20 rounded-3xl w-full max-w-sm flex flex-col overflow-hidden relative max-h-[90vh]">
        {/* Ticket Header */}
        <div className="p-6 text-center bg-brand-navy text-white relative shrink-0">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-black">¡Venta Exitosa!</h2>
          <p className="text-white/70 text-sm mt-1">El ticket ha sido generado</p>
        </div>
        
        {/* Printable Area */}
        <div id="printable-ticket" className="p-6 bg-white text-black text-sm font-mono flex-1 overflow-y-auto">
          <div className="text-center mb-4 border-b border-dashed border-gray-300 pb-4">
            <h3 className="font-bold text-lg uppercase tracking-widest mb-1">PANIFICADORA</h3>
            <p className="text-xs text-gray-500">{sale.date.toLocaleString()}</p>
            <p className="text-xs font-bold mt-1">Cliente: {sale.clientName}</p>
          </div>
          
          <table className="w-full text-left text-xs mb-4">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-1">Cant.</th>
                <th className="py-1">Producto</th>
                <th className="py-1 text-right">Sub.</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((i: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-1 border-b border-gray-100">{i.quantity}</td>
                  <td className="py-1 border-b border-gray-100 truncate max-w-[120px]">{i.name}</td>
                  <td className="py-1 border-b border-gray-100 text-right">${(i.unit_price * i.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="flex justify-between items-center border-t border-gray-300 pt-3 font-black text-lg">
            <span>TOTAL</span>
            <span>${sale.total.toLocaleString()}</span>
          </div>
        </div>

        {/* Action Buttons (Not printed) */}
        <div className="p-4 bg-bg-app border-t border-brand-muted/20 flex flex-col gap-3 shrink-0">
          <div className="flex gap-3">
            <button onClick={handlePrint} className="flex-1 bg-brand-navy hover:bg-brand-navy/90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-colors">
              <Printer size={18} /> Imprimir
            </button>
            <button onClick={handleShare} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-colors">
              <Share2 size={18} /> Compartir
            </button>
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-brand-muted hover:bg-brand-muted/10 transition-colors">
            Nueva Venta
          </button>
        </div>
      </div>
    </div>
  )
}

export const POSLayout = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [completedSale, setCompletedSale] = useState<any>(null)
  const { clients, fetchInitialData } = useStore()

  // Cliente Consumidor Final predeterminado en BDD
  const CONSUMIDOR_FINAL_ID = '00a12345-6789-abcd-ef01-23456789abcd'
  const [selectedClientId, setSelectedClientId] = useState(CONSUMIDOR_FINAL_ID)

  useEffect(() => {
    fetchProducts()
    fetchInitialData() // Asegura que los clientes estén cargados
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_deleted', false)
        .order('name')
      
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product: Product) => {
    if (product.bakery_stock <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id)
      if (existing) {
        if (existing.quantity >= product.bakery_stock) return prev;
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p)
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(p => p.id !== id))
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.id === id) {
        const currentQ = p.quantity || 0
        const newQ = currentQ + delta
        if (newQ > p.bakery_stock) return p;
        return newQ >= 1 ? { ...p, quantity: newQ } : p
      }
      return p
    }))
  }

  const handleManualQuantity = (id: string, val: string) => {
    const newQ = parseInt(val)
    setCart(prev => prev.map(p => {
      if (p.id === id) {
        const parsed = isNaN(newQ) ? 0 : Math.max(0, newQ);
        return { ...p, quantity: Math.min(parsed, p.bakery_stock) }
      }
      return p
    }))
  }

  // Precio efectivo según categoría del cliente
  const getItemPrice = (item: Product) => {
    const activeClient = clients.find(c => c.id === selectedClientId)
    if (!activeClient) return item.price_a;
    return activeClient.price_category === 'B' ? item.price_b : item.price_a;
  }

  const total = cart.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handleProcessSale = async (paymentCash: number, paymentTransfer: number) => {
    setShowPayment(false)
    setIsProcessing(true)

    try {
      // Buscar el conductor "Mostrador" vinculado a este sistema
      const { drivers } = useStore.getState()
      const mostradorDriver = drivers.find(d => d.full_name.toLowerCase().includes('mostrador'))

      if (!mostradorDriver) {
        Swal.fire('Error de configuración', 'No se encontró el conductor "Mostrador" en la base de datos. Contacte al administrador.', 'error')
        return
      }

      // Formatear payload para process_offline_sale
      const payload = {
        id: crypto.randomUUID(),
        client_id: selectedClientId,
        driver_id: mostradorDriver.id, // ← conductor Mostrador
        transaction_date: new Date().toISOString(),
        subtotal_sales: total,
        total_returns: 0,
        applied_debt: 0,
        final_total: total,
        payment_cash: paymentCash,
        payment_transfer: paymentTransfer,
        payment_account: 0,
        items: cart.filter(i => i.quantity > 0).map(item => ({
          product_id: item.id,
          operation_type: 'sale',
          quantity: item.quantity,
          unit_price: getItemPrice(item)
        }))
      }

      const { error } = await supabase.rpc('process_offline_sale', { payload })

      if (error) throw error

      // Descontar stock de panadería (bakery_stock) para cada producto vendido
      for (const item of cart.filter(i => i.quantity > 0)) {
        await supabase
          .from('products')
          .update({ bakery_stock: Math.max(0, item.bakery_stock - item.quantity) })
          .eq('id', item.id)
      }

      Swal.fire({
        toast: true,
        position: 'top-end',
        title: '¡Venta Registrada!',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })

      // Guardar ticket y mostrar modal de éxito
      const saleData = {
        items: [...cart.filter(i => i.quantity > 0)].map(item => ({
          ...item,
          unit_price: getItemPrice(item) // precio efectivo cobrado
        })),
        total,
        paymentCash,
        paymentTransfer,
        date: new Date(),
        clientName: clients.find(c => c.id === selectedClientId)?.business_name || 'Consumidor Final',
      }
      setCompletedSale(saleData)
      setCart([])
      fetchProducts()
    } catch (error: any) {
      console.error('Error procesando venta:', error)
      Swal.fire('Error', error.message || 'Error al procesar la venta', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-72px)] lg:h-[calc(100vh-72px)] gap-4 md:gap-6 p-4 md:p-6 lg:overflow-hidden">
      
      {/* SECCIÓN IZQUIERDA: PRODUCTOS */}
      <div className="flex-1 lg:flex-[2] bg-bg-surface rounded-2xl md:rounded-3xl shadow-sm border border-brand-muted/20 flex flex-col min-h-[500px] lg:min-h-0">
        <div className="p-4 md:p-6 border-b border-brand-muted/10 flex justify-between items-center bg-bg-app shrink-0 rounded-t-2xl md:rounded-t-3xl">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-brand-deep flex items-center gap-2">
              <Package className="text-orange-500" /> Catálogo
            </h2>
            <p className="text-xs md:text-sm text-brand-muted mt-1">Toca un producto para añadirlo</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-bg-app/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.bakery_stock <= 0}
                className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all group ${
                  product.bakery_stock <= 0 
                    ? 'bg-bg-app border-brand-muted/10 opacity-50 cursor-not-allowed' 
                    : 'bg-bg-surface border-brand-muted/20 hover:border-orange-500 hover:shadow-md active:scale-95'
                }`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-transform ${product.bakery_stock <= 0 ? 'bg-brand-muted/10' : 'bg-orange-500/10 group-hover:scale-110'}`}>
                  <Store className={product.bakery_stock <= 0 ? 'text-brand-muted' : 'text-orange-600'} size={28} />
                </div>
                <h3 className="font-bold text-brand-deep text-sm leading-tight mb-1">{product.name}</h3>
                <p className="text-xs font-semibold text-brand-muted mb-2">{product.unit_type}</p>
                
                <div className="mt-auto w-full flex justify-between items-center border-t border-brand-muted/10 pt-3">
                  <span className={`font-black ${product.bakery_stock <= 0 ? 'text-brand-muted' : 'text-orange-600'}`}>${getItemPrice(product)}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${product.bakery_stock <= 0 ? 'bg-red-500/10 text-red-500' : 'bg-bg-app text-brand-muted'}`}>
                    Stock: {product.bakery_stock}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECCIÓN DERECHA: TICKET / CARRITO */}
      <div className="flex-1 lg:flex-none lg:w-96 bg-bg-surface rounded-2xl md:rounded-3xl shadow-sm border border-brand-muted/20 flex flex-col min-h-[350px] lg:min-h-0 shrink-0">
        <div className="p-4 md:p-6 border-b border-white/10 bg-brand-navy text-white shrink-0 rounded-t-2xl md:rounded-t-3xl">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="text-orange-400" /> Ticket
              </h2>
              <p className="text-white/70 text-xs md:text-sm mt-1">{totalItems} productos en el carrito</p>
            </div>
          </div>
          
          <select 
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full bg-black/20 border border-white/20 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-orange"
          >
            <option value={CONSUMIDOR_FINAL_ID} className="text-black">Consumidor Final</option>
            {clients.filter(c => c.id !== CONSUMIDOR_FINAL_ID).map(c => (
              <option key={c.id} value={c.id} className="text-black">{c.business_name || c.legal_name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-brand-muted/60">
              <ShoppingCart size={48} className="mb-4 opacity-50" />
              <p>El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-bg-app border border-brand-muted/10 p-3 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold text-brand-deep text-sm">{item.name}</h4>
                    <p className="text-xs font-bold text-orange-600">${getItemPrice(item)} c/u</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 bg-bg-surface border border-brand-muted/20 rounded-xl p-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-app text-brand-muted shrink-0">
                      <Minus size={14} />
                    </button>
                    <input 
                      type="number" 
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => handleManualQuantity(item.id, e.target.value)}
                      className="font-black w-10 text-center text-brand-deep bg-transparent outline-none hide-arrows"
                    />
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-app text-brand-muted shrink-0">
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-black text-brand-deep text-lg">
                    ${(getItemPrice(item) * item.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 md:p-6 bg-bg-app border-t border-brand-muted/20 shrink-0 rounded-b-2xl md:rounded-b-3xl">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <span className="text-base md:text-lg font-bold text-brand-muted">TOTAL</span>
            <span className="text-3xl md:text-4xl font-black text-brand-deep">${total.toLocaleString()}</span>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0 || isProcessing}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-sm
              ${cart.length === 0 || isProcessing 
                ? 'bg-brand-muted/20 text-brand-muted cursor-not-allowed' 
                : 'bg-orange-500 hover:bg-orange-600 text-white hover:shadow-md hover:shadow-orange-500/20 active:scale-95'}
            `}
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <Tag size={20} />}
            {isProcessing ? 'Procesando...' : 'Cobrar Venta'}
          </button>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          total={total}
          onClose={() => setShowPayment(false)}
          onConfirm={handleProcessSale}
        />
      )}

      {completedSale && (
        <TicketModal 
          sale={completedSale} 
          onClose={() => setCompletedSale(null)} 
        />
      )}
    </div>
  )
}
