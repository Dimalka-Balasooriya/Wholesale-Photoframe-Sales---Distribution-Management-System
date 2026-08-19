import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { PageToolbar } from '../../components/PageToolbar';
import { useCart } from '../../hooks/useCart';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { Paginated, Product, Variant } from '../../types/catalog';

export function CustomerShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { addItem } = useCart();

  useEffect(() => {
    Promise.all([
      api.get<Paginated<Product>>('/products', { page: 1, pageSize: 50, search, status: 'ACTIVE' }),
      api.get<Paginated<Variant>>('/products/variants/list', { page: 1, pageSize: 100, search })
    ])
      .then(([productResponse, variantResponse]) => {
        setProducts(productResponse.data.filter((product) => product.variant_count > 0));
        setVariants(variantResponse.data.filter((variant) => variant.status === 'ACTIVE'));
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Unable to load catalog');
      });
  }, [search]);

  return (
    <DashboardLayout
      title="Shop"
      subtitle="Browse active wholesale photoframe products and available sizes."
    >
      <div className="space-y-5">
        <PageToolbar onSearchChange={setSearch} placeholder="Search products, sizes, or SKU" search={search}>
          <div className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            <Search size={16} />
            Catalog
          </div>
        </PageToolbar>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const productVariants = variants.filter((variant) => variant.product_id === product.id);
            return (
              <article key={product.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {product.image_url ? (
                  <img alt={product.name} className="h-44 w-full object-cover" src={product.image_url} />
                ) : (
                  <div className="grid h-44 place-items-center bg-slate-100 text-sm text-slate-500">No image</div>
                )}
                <div className="p-5">
                  <p className="text-xs font-bold uppercase text-brand">{product.category}</p>
                  <h3 className="mt-1 text-lg font-bold text-ink">{product.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{product.description}</p>
                  <div className="mt-4 space-y-2">
                    {productVariants.length === 0 ? (
                      <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                        Sizes are not available for this product yet.
                      </p>
                    ) : (
                      productVariants.map((variant) => (
                        <div key={variant.id} className="grid gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                          <span className="font-semibold">{variant.size}</span>
                          <span>Rs. {Number(variant.wholesale_price).toLocaleString()}</span>
                          <span className={variant.current_stock_quantity > 0 ? 'text-emerald-700' : 'text-red-600'}>
                            {variant.current_stock_quantity > 0 ? 'In stock' : 'Out'}
                          </span>
                          <button
                            className="rounded-md bg-brand px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                            disabled={variant.current_stock_quantity <= 0}
                            onClick={() => {
                              addItem('customer', {
                                variantId: variant.id,
                                productName: variant.product_name,
                                size: variant.size,
                                sku: variant.sku,
                                unitPrice: Number(variant.wholesale_price),
                                quantity: 1,
                                availableStock: variant.current_stock_quantity
                              });
                              setMessage(`${variant.product_name} ${variant.size} added to cart.`);
                            }}
                            type="button"
                          >
                            Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
