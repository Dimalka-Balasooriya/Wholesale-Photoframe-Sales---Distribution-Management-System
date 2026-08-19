import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { CartItem, Customer, Paginated, PaymentMethod } from '../../types/catalog';

interface CartCheckoutPageProps {
  mode: 'customer' | 'sales';
}

export function CartCheckoutPage({ mode }: CartCheckoutPageProps) {
  const { customerCart, salesCart, updateQuantity, removeItem, clearCart } = useCart();
  const cart = mode === 'customer' ? customerCart : salesCart;
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [deliveryCharge, setDeliveryCharge] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CREDIT');
  const [notes, setNotes] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (mode === 'sales') {
      api.get<Paginated<Customer>>('/customers', { page: 1, pageSize: 100 }).then((response) => {
        setCustomers(response.data);
      }).catch(() => setCustomers([]));
    }
  }, [mode]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discount = subtotal * (Number(discountPercentage || 0) / 100);
    const grandTotal = Math.max(0, subtotal - discount + Number(deliveryCharge || 0));
    return { subtotal, discount, grandTotal };
  }, [cart, deliveryCharge, discountPercentage]);

  const submitOrder = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await api.post<{ orderId: number }>('/orders', {
        ...(mode === 'sales' ? { customerId: Number(customerId) } : {}),
        items: cart.map((item) => ({ variantId: item.variantId, quantity: item.quantity, discount: 0 })),
        discountPercentage: Number(discountPercentage),
        deliveryCharge: Number(deliveryCharge),
        paymentMethod,
        notes
      });
      clearCart(mode);
      navigate(mode === 'sales' ? '/sales/orders' : '/customer/orders', {
        replace: true,
        state: { createdOrderId: response.orderId }
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title={mode === 'sales' ? 'New Order' : 'Cart'}
      subtitle={mode === 'sales' ? 'Create an order for an assigned wholesale customer.' : 'Review selected wholesale items and submit your order.'}
    >
      <form className="grid gap-5 xl:grid-cols-[1fr_360px]" onSubmit={submitOrder}>
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="font-bold text-ink">Cart Items</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {cart.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No items in cart.</p>
            ) : (
              cart.map((item: CartItem) => (
                <div key={item.variantId} className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                  <div>
                    <p className="font-bold text-ink">{item.productName}</p>
                    <p className="text-sm text-slate-500">{item.size} · {item.sku} · Rs. {item.unitPrice.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="grid h-8 w-8 place-items-center rounded-md border border-slate-300" onClick={() => updateQuantity(mode, item.variantId, item.quantity - 1)} type="button"><Minus size={14} /></button>
                    <input className="h-8 w-16 rounded-md border border-slate-300 text-center text-sm" min="1" max={item.availableStock} type="number" value={item.quantity} onChange={(e) => updateQuantity(mode, item.variantId, Number(e.target.value))} />
                    <button className="grid h-8 w-8 place-items-center rounded-md border border-slate-300" onClick={() => updateQuantity(mode, item.variantId, item.quantity + 1)} type="button"><Plus size={14} /></button>
                  </div>
                  <p className="font-bold">Rs. {(item.unitPrice * item.quantity).toLocaleString()}</p>
                  <button className="grid h-8 w-8 place-items-center rounded-md text-red-600 hover:bg-red-50" onClick={() => removeItem(mode, item.variantId)} type="button"><Trash2 size={16} /></button>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-ink">Order Summary</h3>
          {mode === 'sales' ? (
            <select className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.business_name}</option>)}
            </select>
          ) : null}
          <div className="mt-4 grid gap-3">
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" min="0" max="100" placeholder="Discount %" type="number" value={discountPercentage} onChange={(e) => setDiscountPercentage(e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" min="0" placeholder="Delivery charge" type="number" value={deliveryCharge} onChange={(e) => setDeliveryCharge(e.target.value)} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              <option value="CREDIT">Credit</option>
              <option value="COD">COD</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="CARD">Card</option>
            </select>
            <textarea className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Order notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>Rs. {totals.subtotal.toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt>Discount</dt><dd>Rs. {totals.discount.toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>Rs. {Number(deliveryCharge || 0).toLocaleString()}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold"><dt>Grand Total</dt><dd>Rs. {totals.grandTotal.toLocaleString()}</dd></div>
          </dl>
          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
          <button className="mt-5 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:bg-slate-300" disabled={cart.length === 0 || isSubmitting} type="submit">
            {isSubmitting ? 'Submitting...' : 'Submit Order'}
          </button>
        </aside>
      </form>
    </DashboardLayout>
  );
}
