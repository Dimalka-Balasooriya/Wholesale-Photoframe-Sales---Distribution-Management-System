import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { PaginationControls } from '../../components/PaginationControls';
import { PageToolbar } from '../../components/PageToolbar';
import { StatusBadge } from '../../components/StatusBadge';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { api, ApiError } from '../../services/api';
import type { Paginated, Product } from '../../types/catalog';

const initialProduct = {
  name: '',
  category: '',
  description: '',
  imageUrl: '',
  status: 'ACTIVE'
};

const initialVariant = {
  productId: '',
  size: '',
  sku: '',
  costPrice: '0',
  wholesalePrice: '0',
  minimumWholesaleQuantity: '1',
  lowStockLevel: '0',
  status: 'ACTIVE'
};

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Paginated<Product>['pagination']>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [productForm, setProductForm] = useState(initialProduct);
  const [variantForm, setVariantForm] = useState(initialVariant);

  const productOptions = useMemo(() => products.filter((product) => product.status === 'ACTIVE'), [products]);

  const loadProducts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get<Paginated<Product>>('/products', {
        page,
        pageSize: 10,
        search
      });
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, [page, search]);

  const submitProduct = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.post('/products', productForm);
      setProductForm(initialProduct);
      setMessage('Product created.');
      await loadProducts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create product');
    }
  };

  const submitVariant = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.post('/products/variants', {
        ...variantForm,
        productId: Number(variantForm.productId),
        costPrice: Number(variantForm.costPrice),
        wholesalePrice: Number(variantForm.wholesalePrice),
        minimumWholesaleQuantity: Number(variantForm.minimumWholesaleQuantity),
        lowStockLevel: Number(variantForm.lowStockLevel)
      });
      setVariantForm(initialVariant);
      setMessage('Variant created. Add opening stock from Inventory.');
      await loadProducts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create variant');
    }
  };

  return (
    <DashboardLayout
      title="Products"
      subtitle="Manage photoframe products, categories, images, and sellable variants."
    >
      <div className="space-y-5">
        <PageToolbar
          onSearchChange={(value) => {
            setPage(1);
            setSearch(value);
          }}
          placeholder="Search products or categories"
          search={search}
        >
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={() => void loadProducts()}
            type="button"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </PageToolbar>

        {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitProduct}>
            <h3 className="text-base font-bold text-ink">Add Product</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Product name" required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Category" required value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" placeholder="Image URL" value={productForm.imageUrl} onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })} />
              <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" placeholder="Description" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
            </div>
            <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white" type="submit">
              <Plus size={16} />
              Add Product
            </button>
          </form>

          <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitVariant}>
            <h3 className="text-base font-bold text-ink">Add Variant</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <select className="rounded-md border border-slate-300 px-3 py-2 text-sm lg:col-span-2" required value={variantForm.productId} onChange={(e) => setVariantForm({ ...variantForm, productId: e.target.value })}>
                <option value="">Select product</option>
                {productOptions.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Size, e.g. 8x12" required value={variantForm.size} onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="SKU" required value={variantForm.sku} onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" min="0" placeholder="Cost price" type="number" value={variantForm.costPrice} onChange={(e) => setVariantForm({ ...variantForm, costPrice: e.target.value })} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" min="0" placeholder="Wholesale price" required type="number" value={variantForm.wholesalePrice} onChange={(e) => setVariantForm({ ...variantForm, wholesalePrice: e.target.value })} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" min="1" placeholder="Min qty" type="number" value={variantForm.minimumWholesaleQuantity} onChange={(e) => setVariantForm({ ...variantForm, minimumWholesaleQuantity: e.target.value })} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" min="0" placeholder="Low stock level" type="number" value={variantForm.lowStockLevel} onChange={(e) => setVariantForm({ ...variantForm, lowStockLevel: e.target.value })} />
            </div>
            <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-bold text-white" type="submit">
              <Plus size={16} />
              Add Variant
            </button>
          </form>
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Variants</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Low Stock</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>Loading products...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No products found.</td></tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink">{product.name}</p>
                        <p className="mt-1 max-w-md text-xs text-slate-500">{product.description}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{product.category}</td>
                      <td className="px-4 py-3 font-semibold">{product.variant_count}</td>
                      <td className="px-4 py-3 font-semibold">{product.total_stock}</td>
                      <td className="px-4 py-3 font-semibold text-amber-700">{product.low_stock_variants}</td>
                      <td className="px-4 py-3"><StatusBadge status={product.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        <PaginationControls pagination={pagination} onPageChange={setPage} />
      </div>
    </DashboardLayout>
  );
}
