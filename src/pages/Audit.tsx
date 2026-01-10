import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { QRScanner } from '@/components/scanner/QRScanner';
import { BulkImport } from '@/components/bulk/BulkImport';
import { productDb } from '@/services/database/db';
import { Product } from '@/types';
import { playBeep } from '@/utils/sounds';
import { extractItemCodeFromQR } from '@/utils/qrCodeUrl';
import toast from 'react-hot-toast';

// Audit page for inventory management

export default function Audit() {
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [foundItems, setFoundItems] = useState<Set<string>>(new Set());
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const products = await productDb.getAll();
      setAllProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = useCallback((qrCode: string) => {
    if (!qrCode || !qrCode.trim()) {
      toast.error('Invalid QR code scanned');
      return;
    }

    playBeep('scan');
    // Extract itemCode from QR code (handles both URL and plain itemCode)
    const itemCode = extractItemCodeFromQR(qrCode);
    const product = allProducts.find((p) => p.itemCode === itemCode);
    if (product) {
      setFoundItems((prev) => {
        const newSet = new Set(prev);
        newSet.add(product.id);
        return newSet;
      });
      playBeep('success');
      toast.success(`✅ Found: ${product.name} (${product.itemCode})`);
    } else {
      playBeep('error');
      toast.error(`Product with code "${qrCode}" not found in inventory`);
    }
  }, [allProducts]);

  const handleExport = () => {
    const found = allProducts.filter((p) => foundItems.has(p.id));
    const missing = allProducts.filter((p) => !foundItems.has(p.id));

    const report = {
      auditDate: new Date().toISOString(),
      totalProducts: allProducts.length,
      found: found.length,
      missing: missing.length,
      foundItems: found.map((p) => ({
        itemCode: p.itemCode,
        name: p.name,
        category: p.category,
      })),
      missingItems: missing.map((p) => ({
        itemCode: p.itemCode,
        name: p.name,
        category: p.category,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit report downloaded');
  };

  const foundProducts = allProducts.filter((p) => foundItems.has(p.id));
  const missingProducts = allProducts.filter((p) => !foundItems.has(p.id));

  return (
    <div className="min-h-screen p-3 sm:p-4 max-w-4xl mx-auto pt-16">
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold">Inventory Audit</h1>
      </div>

      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {showBulkImport && (
        <BulkImport
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onImportComplete={loadProducts}
        />
      )}

      <div className="space-y-6">
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Audit Summary</h2>
              <Button onClick={handleExport} variant="outline">
                <Download className="w-5 h-5 mr-2" />
                Export Report
              </Button>
            </div>
            
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-base font-semibold text-blue-800 mb-2">
                📱 How Audit Works:
              </p>
              <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                <li>Click "Scan QR Code" button below</li>
                <li>Point your camera at the QR code sticker on each product</li>
                <li>When scanned, the product moves from "Missing" to "Found"</li>
                <li>Keep scanning until all products are found</li>
                <li>Export the report to see the complete audit results</li>
              </ol>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <p className="text-3xl font-bold text-blue-600">
                  {allProducts.length}
                </p>
                <p className="text-lg text-gray-600 font-semibold">Total Products</p>
                <p className="text-xs text-gray-500 mt-1">In your inventory</p>
              </div>
              <div className="text-center bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <p className="text-3xl font-bold text-green-600">
                  {foundProducts.length}
                </p>
                <p className="text-lg text-gray-600 font-semibold">Found ✅</p>
                <p className="text-xs text-gray-500 mt-1">Scanned & verified</p>
              </div>
              <div className="text-center bg-red-50 rounded-lg p-4 border-2 border-red-200">
                <p className="text-3xl font-bold text-red-600">
                  {missingProducts.length}
                </p>
                <p className="text-lg text-gray-600 font-semibold">Missing ⚠️</p>
                <p className="text-xs text-gray-500 mt-1">Not scanned yet</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => setShowQRScanner(true)}
                fullWidth
                size="lg"
              >
                Scan QR Code
              </Button>
              <Button
                onClick={() => setShowBulkImport(true)}
                variant="outline"
                fullWidth
                size="lg"
              >
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                Bulk Import Products
              </Button>
            </div>
          </div>
        </Card>

        {foundProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Found Items ({foundProducts.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {foundProducts.map((product) => (
                <Card key={product.id}>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-gray-600">
                      {product.itemCode}
                    </p>
                    <h3 className="text-xl font-bold">{product.name}</h3>
                    <p className="text-lg text-gray-600">{product.category}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {missingProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-600" />
              Missing Items ({missingProducts.length})
            </h2>
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-lg font-semibold text-yellow-800 mb-2">
                📋 What are "Missing Items"?
              </p>
              <p className="text-base text-yellow-700">
                These are products in your inventory that you haven't scanned yet during this audit. 
                They might be:
              </p>
              <ul className="list-disc list-inside text-base text-yellow-700 mt-2 space-y-1">
                <li>Not yet scanned (keep scanning QR codes to find them)</li>
                <li>Physically missing from your home</li>
                <li>Moved to a different location</li>
                <li>QR code sticker not found or damaged</li>
              </ul>
              <p className="text-sm text-yellow-600 mt-3">
                💡 <strong>Tip:</strong> Scan QR codes from your printed stickers to mark items as "Found". 
                Items that remain un-scanned will stay in the "Missing" list.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missingProducts.map((product) => (
                <Card key={product.id} className="border-2 border-red-200 bg-red-50">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-gray-600">
                          {product.itemCode}
                        </p>
                        <h3 className="text-xl font-bold">{product.name}</h3>
                        <p className="text-lg text-gray-600">{product.category}</p>
                      </div>
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    </div>
                    <p className="text-sm text-red-600 font-semibold">
                      ⚠️ Not scanned yet
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {allProducts.length === 0 && !loading && (
          <Card>
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">
                No products to audit. Add products first.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

