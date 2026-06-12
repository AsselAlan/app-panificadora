import { useState, useEffect } from 'react'
import { Store, ShoppingCart, Plus, Minus, Trash2, Tag, Loader2, Package } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import type { Product } from '../../store/useStore'
import { PaymentModal } from './PaymentModal'
import Swal from 'sweetalert2'

type CartItem = Product & { quantity: number }

export const POSLayout = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPayment, setShowPayment] = useState(false)

  // Cliente Consumidor Final predeterminado en BDD
  const CONSUMIDOR_FINAL_ID = '00a12345-6789-abcd-ef01-23456789abcd'

  useEffect(() => {
    fetchProducts()
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
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id)
      if (existing) {
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
        const newQ = p.quantity + delta
        return newQ > 0 ? { ...p, quantity: newQ } : p
      }
      return p
    }))
  }

  const total = cart.reduce((sum, item) => sum + (item.price_a * item.quantity), 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handleProcessSale = async (paymentCash: number, paymentTransfer: number) => {
    setShowPayment(false)
    setIsProcessing(true)

    try {
      // Formatear payload para process_mostrador_sale
      const payload = {
        id: crypto.randomUUID(),
        client_id: CONSUMIDOR_FINAL_ID,
        transaction_date: new Date().toISOString(),
        subtotal_sales: total,
        total_returns: 0,
        applied_debt: 0,
        final_total: total,
        payment_cash: paymentCash,
        payment_transfer: paymentTransfer,
        payment_account: 0,
        items: cart.map(item => ({
          product_id: item.id,
          operation_type: 'sale',
          quantity: item.quantity,
          unit_price: item.price_a
        }))
      }

      const { error } = await supabase.rpc('process_mostrador_sale', { payload })

      if (error) throw error

      Swal.fire({
        title: '¡Venta Registrada!',
        text: 'La venta se completó y el stock fue actualizado.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })

      // Limpiar carrito y recargar stock
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-72px)] gap-4 md:gap-6 p-4 md:p-6 overflow-hidden">
      
      {/* SECCIÓN IZQUIERDA: PRODUCTOS */}
      <div className="flex-1 lg:flex-[2] bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 flex flex-col min-h-0">
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="text-orange-500" /> Catálogo
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">Toca un producto para añadirlo</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-orange-500 hover:shadow-md transition-all group flex flex-col items-center text-center active:scale-95"
              >
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Store className="text-orange-600" size={28} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">{product.name}</h3>
                <p className="text-xs font-semibold text-slate-400 mb-2">{product.unit_type}</p>
                
                <div className="mt-auto w-full flex justify-between items-center border-t border-slate-100 pt-3">
                  <span className="font-black text-orange-600">${product.price_a}</span>
                  <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">
                    Stock: {product.bakery_stock}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECCIÓN DERECHA: TICKET / CARRITO */}
      <div className="flex-1 lg:flex-none lg:w-96 bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 flex flex-col min-h-0 shrink-0">
        <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-800 text-white shrink-0">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="text-orange-400" /> Ticket
          </h2>
          <p className="text-slate-300 text-xs md:text-sm mt-1">{totalItems} productos en el carrito</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart size={48} className="mb-4 opacity-50" />
              <p>El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                    <p className="text-xs font-bold text-orange-600">${item.price_a} c/u</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600">
                      <Minus size={14} />
                    </button>
                    <span className="font-black w-6 text-center text-slate-800">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600">
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-black text-slate-800 text-lg">
                    ${(item.price_a * item.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <span className="text-base md:text-lg font-bold text-slate-600">TOTAL</span>
            <span className="text-3xl md:text-4xl font-black text-slate-800">${total.toLocaleString()}</span>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0 || isProcessing}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-sm
              ${cart.length === 0 || isProcessing 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
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
    </div>
  )
}
