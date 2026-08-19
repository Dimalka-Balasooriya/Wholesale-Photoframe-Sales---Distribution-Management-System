import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { PageToolbar } from '../../components/PageToolbar';
import { useCart } from '../../hooks/useCart';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { Paginated, Product, Variant } from '../../types/catalog';

export function SalesNewOrderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { addItem, salesCart } = useCart();

  useEffect(() => {
    Promise.all([
      api.get<Paginated<Product>>('/products', { page: 1, pageSize: 50, search, status: 'ACTIVE' }),
      api.get<Paginated<Variant>>('/products/variants/list', { page: 1, pageSize: 100, search })
    ])
      .then(([productResponse, variantResponse]) => {
        setProducts(productResponse.data);
        setVariants(variantResponse.data.filter((variant) => variant.status === 'ACTIVE'));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load products'));
  }, [search]);

  return (
    <DashboardLayout
      title="New Order"
      subtitle="Browse available products, add variants to cart, then choose a customer at checkout."
    >
      <div className="space-y-5">
        <PageToolbar onSearchChange={setSearch} placeholder="Search products, sizes, or SKU" search={search}>
          <a className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-bold text-white" href="/sales/cart">
            <ShoppingCart size={16} />
            Cart ({salesCart.length})
          </a>
        </PageToolbar>
        {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const productVariants = variants.filter((variant) => variant.product_id === product.id);
            return (
              <article key={product.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-brand">{product.category}</p>
                <h3 className="mt-1 text-lg font-bold text-ink">{product.name}</h3>
                <div className="mt-4 space-y-2">
                  {productVariants.map((variant) => (
                    <div key={variant.id} className="grid gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <span className="font-semibold">{variant.size} · {variant.sku}</span>
                      <span>Rs. {Number(variant.wholesale_price).toLocaleString()}</span>
                      <button
                        className="rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-300"
                        disabled={variant.current_stock_quantity <= 0}
                        onClick={() => {
                          addItem('sales', {
                            variantId: variant.id,
                            productName: variant.product_name,
                            size: variant.size,
                            sku: variant.sku,
                            unitPrice: Number(variant.wholesale_price),
                            quantity: 1,
                            availableStock: variant.current_stock_quantity
                          });
                          setMessage(`${variant.product_name} ${variant.size} added.`);
                        }}
                        type="button"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
