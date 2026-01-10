import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Calendar, Package, Trash2, Scan } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { QRCodeGenerator } from '@/components/qrcode/QRCodeGenerator';
import { QRScanner } from '@/components/scanner/QRScanner';
import { productDb, warrantyDb } from '@/services/database/localDb';
import { Product, WarrantyDocument } from '@/types';
import { formatDate, getWarrantyStatus } from '@/utils/warrantyCalculator';
import { formatDate as formatDateUtil } from '@/utils/dateUtils';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { playBeep } from '@/utils/sounds';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { itemCode } = useParams<{ itemCode: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [warrantyDoc, setWarrantyDoc] = useState<WarrantyDocument | null>(null);
  const [warrantyImageUrl, setWarrantyImageUrl] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [itemCode]);

  const loadProduct = async () => {
    if (!itemCode) return;

    setLoading(true);
    try {
      const foundProduct = await productDb.getByItemCode(itemCode);
      if (foundProduct) {
        setProduct(foundProduct);

        // Load warranty document
        const doc = await warrantyDb.getByProductId(foundProduct.id);
        if (doc) {
          setWarrantyDoc(doc);
          const imageUrl = URL.createObjectURL(doc.imageBlob);
          setWarrantyImageUrl(imageUrl);
        }
      } else {
        toast.error('Product not found');
        navigate('/inventory');
      }
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;

    try {
      await productDb.delete(product.id);
      playBeep('success');
      toast.success('Product deleted');
      navigate('/inventory');
    } catch (error) {
      console.error('Error deleting product:', error);
      playBeep('error');
      toast.error('Failed to delete product');
    }
  };

  const handleQRScan = useCallback((qrCode: string) => {
    if (!qrCode || !qrCode.trim()) {
      toast.error('Invalid QR code scanned');
      return;
    }
    playBeep('scan');
    navigate(`/product/${qrCode.trim()}`);
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen p-3 sm:p-4 max-w-2xl mx-auto flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const warrantyStatus = getWarrantyStatus(product.warrantyEnd);

  return (
    <div className="min-h-screen p-3 sm:p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold">Product Details</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-gray-600" />
                <span className="text-lg font-semibold text-gray-600">Item Code</span>
              </div>
              <p className="text-2xl font-bold">{product.itemCode}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-gray-600" />
                <span className="text-lg font-semibold text-gray-600">Product Name</span>
              </div>
              <p className="text-xl">{product.name}</p>
            </div>

            <div>
              <span className="text-lg font-semibold text-gray-600">Category</span>
              <p className="text-xl">{product.category}</p>
            </div>

            {product.barcode && (
              <div>
                <span className="text-lg font-semibold text-gray-600">Barcode</span>
                <p className="text-xl font-mono">{product.barcode}</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <QrCode className="w-6 h-6" />
              QR Code
            </h2>
            <div className="flex justify-center">
              <QRCodeGenerator value={product.qrValue} size={200} />
            </div>
            <p className="text-center text-lg text-gray-600 mb-4">
              Scan this code to view product details
            </p>
            <Button
              onClick={() => setShowQRScanner(true)}
              variant="outline"
              fullWidth
              aria-label="Scan another QR code"
            >
              <Scan className="w-5 h-5 mr-2" />
              Scan Another QR Code
            </Button>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Warranty Information
            </h2>

            {warrantyStatus === 'none' ? (
              <p className="text-lg text-gray-600">No warranty information available</p>
            ) : (
              <div className="space-y-2">
                <div>
                  <span className="text-lg font-semibold text-gray-600">Status: </span>
                  <span
                    className={`text-xl font-bold ${
                      warrantyStatus === 'valid'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {warrantyStatus === 'valid' ? 'Valid' : 'Expired'}
                  </span>
                </div>

                {product.warrantyStart && (
                  <div>
                    <span className="text-lg font-semibold text-gray-600">Start Date: </span>
                    <span className="text-xl">{formatDateUtil(product.warrantyStart)}</span>
                  </div>
                )}

                {product.warrantyEnd && (
                  <div>
                    <span className="text-lg font-semibold text-gray-600">End Date: </span>
                    <span className="text-xl">{formatDateUtil(product.warrantyEnd)}</span>
                  </div>
                )}

                {warrantyImageUrl && (
                  <div className="mt-4">
                    <p className="text-lg font-semibold mb-2">Warranty Card</p>
                    <img
                      src={warrantyImageUrl}
                      alt="Warranty card"
                      className="w-full rounded-lg border-2 border-gray-300 max-h-96 object-contain"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="flex gap-4">
          <Button
            onClick={() => setShowDeleteConfirm(true)}
            variant="danger"
            fullWidth
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Delete Product
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
}

