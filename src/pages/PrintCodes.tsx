import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { productDb } from '@/services/database/db';
import { Product } from '@/types';
import { generateQRCodePDF } from '@/services/pdf/qrCodePdf';
import toast from 'react-hot-toast';

export default function PrintCodes() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [layout, setLayout] = useState<'sticker' | 'a4'>('a4');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const allProducts = await productDb.getAll();
      setProducts(allProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts =
    selectedCategory === 'all'
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const productsToPrint =
    selectedProducts.size > 0
      ? filteredProducts.filter((p) => selectedProducts.has(p.id))
      : filteredProducts;

  const handleToggleProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const handleGeneratePDF = async () => {
    if (productsToPrint.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    try {
      await generateQRCodePDF({
        layout,
        products: productsToPrint,
        title: `QR Codes - ${selectedCategory === 'all' ? 'All Products' : selectedCategory}`,
      });
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="min-h-screen p-3 sm:p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold">Print QR Codes</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-lg font-semibold mb-2">
                Filter by Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedProducts(new Set());
                }}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-lg font-semibold mb-2">
                Layout
              </label>
              <div className="flex gap-4">
                <Button
                  onClick={() => setLayout('a4')}
                  variant={layout === 'a4' ? 'primary' : 'outline'}
                  fullWidth
                >
                  A4 Sheet
                </Button>
                <Button
                  onClick={() => setLayout('sticker')}
                  variant={layout === 'sticker' ? 'primary' : 'outline'}
                  fullWidth
                >
                  Sticker Mode
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-lg">
                {productsToPrint.length} product(s) selected
              </p>
              <Button onClick={handleSelectAll} variant="outline" size="md">
                {selectedProducts.size === filteredProducts.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
            </div>

            <Button onClick={handleGeneratePDF} fullWidth size="lg">
              <Download className="w-5 h-5 mr-2" />
              Generate PDF
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-xl">Loading...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">No products found</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                onClick={() => handleToggleProduct(product.id)}
                className={selectedProducts.has(product.id) ? 'border-blue-600 border-4' : ''}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => handleToggleProduct(product.id)}
                    className="w-6 h-6 mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-600">
                      {product.itemCode}
                    </p>
                    <h3 className="text-xl font-bold">{product.name}</h3>
                    <p className="text-lg text-gray-600">{product.category}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

