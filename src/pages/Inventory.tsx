import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, QrCode, FileSpreadsheet, Package } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useProductStore } from '@/stores/productStore';
import { Product } from '@/types';
import { getWarrantyStatus } from '@/utils/warrantyCalculator';
import { QRScanner } from '@/components/scanner/QRScanner';
import { Chatbot } from '@/components/assistant/Chatbot';
import { BulkImport } from '@/components/bulk/BulkImport';
import { playBeep } from '@/utils/sounds';

export default function Inventory() {
  const navigate = useNavigate();
  const { products, loading, loadProducts, searchProducts } = useProductStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Debounced search function
  const debouncedSearch = useDebouncedCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchProducts(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    300
  );

  // Update search when query changes
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Compute filtered products
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return products;
    }
    return searchResults;
  }, [products, searchQuery, searchResults]);

  const handleSearch = useCallback(() => {
    // Search is handled automatically by debouncedSearch
  }, []);

  const handleQRScan = useCallback(
    (qrCode: string) => {
      playBeep('scan');
      navigate(`/product/${qrCode}`);
    },
    [navigate]
  );

  return (
    <div className="min-h-screen p-3 sm:p-4 max-w-4xl mx-auto pt-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">My Products</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setShowBulkImport(true)}
            variant="outline"
            className="w-full sm:w-auto"
            size="md"
          >
            <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="text-sm sm:text-base">Bulk Import</span>
          </Button>
          <Link to="/add" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" size="md">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm sm:text-base">Add Product</span>
            </Button>
          </Link>
        </div>
      </div>

      {showQRScanner && (
        <QRScanner onScan={handleQRScan} onClose={() => setShowQRScanner(false)} />
      )}

      {showBulkImport && (
        <BulkImport
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onImportComplete={loadProducts}
        />
      )}

      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search products..."
            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-base sm:text-lg border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
          />
          <Button onClick={handleSearch} size="md">
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>

        <Button onClick={() => setShowQRScanner(true)} variant="outline" fullWidth>
          <QrCode className="w-5 h-5 mr-2" />
          Scan QR Code
        </Button>
      </div>

      {loading || isSearching ? (
        <LoadingSpinner
          text={loading ? 'Loading products...' : 'Searching...'}
          fullScreen={false}
        />
      ) : filteredProducts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="w-16 h-16" />}
            title={searchQuery ? 'No products found' : 'No products yet'}
            description={
              searchQuery
                ? `No products match "${searchQuery}". Try a different search term.`
                : 'Start by adding your first product to track warranties and manage your inventory.'
            }
            action={
              <Link to="/add">
                <Button size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your First Product
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.map((product) => {
            const warrantyStatus = getWarrantyStatus(product.warrantyEnd);
            return (
              <Link key={product.id} to={`/product/${product.itemCode}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-gray-600">
                          {product.itemCode}
                        </p>
                        <h3 className="text-xl font-bold">{product.name}</h3>
                        <p className="text-lg text-gray-600">{product.category}</p>
                      </div>
                      {warrantyStatus !== 'none' && (
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            warrantyStatus === 'valid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {warrantyStatus === 'valid' ? 'Valid' : 'Expired'}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Chatbot />
    </div>
  );
}
