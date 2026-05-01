import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Upload, Keyboard } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { lookupProductByBarcode } from '@/services/barcode/productLookup';
import { generateItemCode } from '@/utils/itemCodeGenerator';
import { generateQRCodeUrl } from '@/utils/qrCodeUrl';
import { productDb, warrantyDb } from '@/services/database/db';
import { useProductStore } from '@/stores/productStore';
import { validateProduct } from '@/utils/validation';
import { handleError } from '@/utils/errorHandler';
import { Product, WarrantyDocument } from '@/types';
import { generateUUID } from '@/utils/uuid';
import { playBeep } from '@/utils/sounds';
import toast from 'react-hot-toast';
import { WarrantyUpload } from '@/components/warranty/WarrantyUpload';

export default function AddProduct() {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [showWarrantyUpload, setShowWarrantyUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [product, setProduct] = useState<Partial<Product>>({
    name: '',
    category: '',
    barcode: '',
    location: '',
    notes: '',
    currency: undefined,
    purchasePrice: undefined,
  });

  const handleBarcodeLookup = async (barcode: string) => {
    if (!barcode.trim()) {
      toast.error('Please enter a barcode');
      return;
    }

    playBeep('scan'); // Beep when barcode is entered
    setLoading(true);
    
    // Show searching message
    const searchToast = toast.loading('🔍 Searching worldwide product databases...', {
      duration: 10000,
    });
    
    try {
      const lookupResult = await lookupProductByBarcode(barcode.trim());
      
      toast.dismiss(searchToast);
      
      if (lookupResult) {
        setProduct({
          name: lookupResult.name || '',
          category: lookupResult.category || 'Other',
          barcode: barcode.trim(),
        });
        playBeep('success'); // Beep when product is fetched
        toast.success('✅ Product found in database!', {
          duration: 3000,
        });
        setShowManualInput(false);
        setManualBarcode('');
      } else {
        setProduct({
          name: '',
          category: 'Other',
          barcode: barcode.trim(),
        });
        playBeep('error');
        toast('ℹ️ Product not found. You can still add it manually by entering the details below.', {
          duration: 6000,
          icon: '📝',
        });
        setShowManualInput(false);
        setManualBarcode('');
      }
    } catch (error) {
      toast.dismiss(searchToast);
      playBeep('error');
      toast.error('Failed to lookup product. Please try again or enter manually.');
    } finally {
      setLoading(false);
      setShowScanner(false);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    await handleBarcodeLookup(barcode);
  };

  const handleManualBarcodeSubmit = useCallback(async () => {
    await handleBarcodeLookup(manualBarcode);
  }, [manualBarcode, handleBarcodeLookup]);

  const { addProduct } = useProductStore();

  const handleSave = useCallback(async () => {
    // Validate product data
    const validation = validateProduct({
      ...product,
      purchasePrice:
        product.purchasePrice == null || Number.isNaN(Number(product.purchasePrice))
          ? undefined
          : Number(product.purchasePrice),
      currency: product.currency?.trim() ? product.currency.trim() : undefined,
    });
    if (!validation.success) {
      const errors = validation.errors?.errors.map(e => e.message).join(', ') || 'Invalid product data';
      toast.error(errors);
      return;
    }

    if (!validation.data) {
      toast.error('Please enter product name and category');
      return;
    }

    setLoading(true);
    try {
      // Generate item code
      const itemCode = await generateItemCode(validation.data.category);
      
      // Generate QR code URL
      const qrValue = generateQRCodeUrl(itemCode);

      const newProduct: Product = {
        id: generateUUID(),
        itemCode,
        name: validation.data.name,
        category: validation.data.category,
        barcode: validation.data.barcode,
        location: validation.data.location?.trim() || undefined,
        notes: validation.data.notes?.trim() || undefined,
        purchasePrice: validation.data.purchasePrice,
        currency: validation.data.currency,
        qrValue,
        warrantyStart: validation.data.warrantyStart,
        warrantyEnd: validation.data.warrantyEnd,
        warrantyDuration: validation.data.warrantyDuration,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addProduct(newProduct);
      playBeep('success');
      toast.success('Product added successfully!');
      navigate(`/product/${itemCode}`);
    } catch (error) {
      const appError = handleError(error, 'Save product');
      toast.error(appError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [product, addProduct, navigate]);

  const handleWarrantySave = async (imageBlob: Blob, warrantyStart?: Date, warrantyEnd?: Date) => {
    setLoading(true);
    try {
      // First save the product if not saved yet
      let savedProduct: Product | undefined;
      
      if (!product.itemCode) {
        // Save product first
        if (!product.name || !product.category) {
          toast.error('Please enter product name and category first');
          setLoading(false);
          return;
        }

        const itemCode = await generateItemCode(product.category);
        savedProduct = {
          id: generateUUID(),
          itemCode,
          name: product.name,
          category: product.category,
          barcode: product.barcode,
          location: product.location?.trim() || undefined,
          notes: product.notes?.trim() || undefined,
          purchasePrice:
            product.purchasePrice == null || Number.isNaN(Number(product.purchasePrice))
              ? undefined
              : Number(product.purchasePrice),
          currency: product.currency?.trim() ? product.currency.trim().toUpperCase() : undefined,
          qrValue: generateQRCodeUrl(itemCode),
          warrantyStart,
          warrantyEnd,
          warrantyDuration: warrantyStart && warrantyEnd 
            ? Math.round((warrantyEnd.getTime() - warrantyStart.getTime()) / (1000 * 60 * 60 * 24 * 30))
            : undefined,
          createdAt: new Date(),
        };

        await productDb.add(savedProduct);
      } else {
        // Product already saved, get it
        savedProduct = await productDb.getByItemCode(product.itemCode);
      }

      if (!savedProduct) {
        toast.error('Failed to save product');
        setLoading(false);
        return;
      }

      // Save warranty document
      const warrantyDoc: WarrantyDocument = {
        id: generateUUID(),
        productId: savedProduct.id,
        imageBlob,
        createdAt: new Date(),
      };

      await warrantyDb.add(warrantyDoc);

      // Update product with warranty dates if not already set
      if (warrantyStart || warrantyEnd) {
        await productDb.update(savedProduct.id, {
          warrantyStart,
          warrantyEnd,
        });
      }

      toast.success('Product and warranty card saved!');
      setShowWarrantyUpload(false);
      navigate(`/product/${savedProduct.itemCode}`);
    } catch (error) {
      console.error('Error saving warranty:', error);
      toast.error('Failed to save warranty');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-3 sm:p-4 max-w-2xl mx-auto overflow-y-auto">
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold">Add Product</h1>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showWarrantyUpload && (
        <WarrantyUpload
          onSave={handleWarrantySave}
          onClose={() => setShowWarrantyUpload(false)}
        />
      )}

      <div className="space-y-6">
        {/* Step 1: Barcode */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">1</div>
              <label className="text-xl font-bold text-gray-800">
                Scan or Enter Barcode
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => {
                  setShowScanner(true);
                  setShowManualInput(false);
                }}
                fullWidth
                size="lg"
                className="text-lg sm:text-xl py-4 sm:py-6"
              >
                <Camera className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                Scan Barcode
              </Button>
              <Button
                onClick={() => {
                  setShowManualInput(!showManualInput);
                  setShowScanner(false);
                }}
                fullWidth
                variant="outline"
                size="lg"
                className="text-lg sm:text-xl py-4 sm:py-6"
              >
                <Keyboard className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                Type Barcode
              </Button>
            </div>

            {showManualInput && (
              <div className="space-y-2 bg-white p-4 rounded-lg">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleManualBarcodeSubmit();
                    }
                  }}
                  className="w-full px-3 sm:px-4 py-3 sm:py-4 text-lg sm:text-xl border-2 border-blue-600 rounded-lg focus:border-blue-700 focus:outline-none"
                  placeholder="Enter barcode number"
                  autoFocus
                />
                <Button
                  onClick={handleManualBarcodeSubmit}
                  fullWidth
                  size="lg"
                  disabled={loading || !manualBarcode.trim()}
                  className="text-lg sm:text-xl py-3 sm:py-4"
                >
                  {loading ? '🔍 Searching...' : '🔍 Search Product'}
                </Button>
              </div>
            )}

            {product.barcode && (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-600 mb-1">Barcode Found:</p>
                <p className="text-xl font-mono font-bold text-green-700">{product.barcode}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Step 2: Product Details */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg">2</div>
              <label className="text-xl font-bold text-gray-800">
                Product Details
              </label>
            </div>

            <div>
              <label className="block text-lg font-semibold mb-2 text-gray-700">
                Product Name *
              </label>
              <input
                type="text"
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 text-lg sm:text-xl border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none"
                placeholder="e.g., Samsung 55 inch Smart TV"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-base sm:text-lg font-semibold mb-2 text-gray-700">
                Category *
              </label>
              <select
                value={product.category}
                onChange={(e) => setProduct({ ...product, category: e.target.value })}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 text-lg sm:text-xl border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none bg-white"
              >
                <option value="">Select category</option>
                <option value="Television">📺 Television</option>
                <option value="Refrigerator">❄️ Refrigerator</option>
                <option value="Washing Machine">🌀 Washing Machine</option>
                <option value="Air Conditioner">❄️ Air Conditioner</option>
                <option value="Laptop">💻 Laptop</option>
                <option value="Mobile">📱 Mobile</option>
                <option value="Tablet">📱 Tablet</option>
                <option value="Microwave">🔥 Microwave</option>
                <option value="Oven">🔥 Oven</option>
                <option value="Fan">🌀 Fan</option>
                <option value="Mixer">🔧 Mixer</option>
                <option value="Iron">🔧 Iron</option>
                <option value="Other">📦 Other</option>
              </select>
            </div>

            <div>
              <label className="block text-base sm:text-lg font-semibold mb-2 text-gray-700">
                Room / location (optional)
              </label>
              <input
                type="text"
                value={product.location ?? ''}
                onChange={(e) => setProduct({ ...product, location: e.target.value })}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 text-lg sm:text-xl border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none"
                placeholder="e.g., Kitchen, Garage"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-base sm:text-lg font-semibold mb-2 text-gray-700">
                Notes (optional)
              </label>
              <textarea
                value={product.notes ?? ''}
                onChange={(e) => setProduct({ ...product, notes: e.target.value })}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 text-lg sm:text-xl border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none min-h-[100px]"
                placeholder="Serial number, store, or other reminders"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-base sm:text-lg font-semibold mb-2 text-gray-700">
                  Purchase price (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={product.purchasePrice ?? ''}
                  onChange={(e) =>
                    setProduct({
                      ...product,
                      purchasePrice: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className="w-full px-3 sm:px-4 py-3 sm:py-4 text-lg sm:text-xl border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none"
                  placeholder="e.g. 45999"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-base sm:text-lg font-semibold mb-2 text-gray-700">
                  Currency (optional)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={product.currency ?? ''}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
                    setProduct({ ...product, currency: v || undefined });
                  }}
                  className="w-full px-3 sm:px-4 py-3 sm:py-4 text-lg sm:text-xl border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none uppercase"
                  placeholder="INR"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Step 3: Warranty */}
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-lg">3</div>
              <label className="text-xl font-bold text-gray-800">
                Warranty Card (Optional)
              </label>
            </div>
            <p className="text-lg text-gray-600">
              Take a photo of your warranty card for easy access later
            </p>
            <Button
              onClick={() => setShowWarrantyUpload(true)}
              variant="outline"
              fullWidth
              size="lg"
              className="text-xl py-6 border-2"
            >
              <Upload className="w-6 h-6 mr-2" />
              📷 Upload Warranty Card
            </Button>
          </div>
        </Card>

        {/* Save Button */}
        <div className="sticky bottom-2 sm:bottom-4 bg-white rounded-lg shadow-2xl p-3 sm:p-4 border-4 border-blue-500">
          <Button
            onClick={handleSave}
            fullWidth
            size="lg"
            disabled={loading || !product.name || !product.category}
            className="text-xl sm:text-2xl font-bold py-4 sm:py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? '💾 Saving...' : '✅ Save Product'}
          </Button>
        </div>
      </div>
    </div>
  );
}

