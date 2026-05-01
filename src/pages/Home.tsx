import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Package, Search, FileText, Scan, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { usePWA } from '@/hooks/usePWA';
import { QRScanner } from '@/components/scanner/QRScanner';
import { Chatbot } from '@/components/assistant/Chatbot';

export default function Home() {
  const { isInstallable, install } = usePWA();
  const navigate = useNavigate();
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleQRScan = useCallback((qrCode: string) => {
    if (!qrCode || !qrCode.trim()) {
      return;
    }
    navigate(`/product/${qrCode.trim()}`);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-y-auto">
      <div className="p-3 sm:p-4 max-w-4xl mx-auto">
        <header className="text-center mb-6 sm:mb-8 pt-2 sm:pt-4">
          <div className="flex justify-center mb-4">
            <img src="/initr.png" alt="Initra Logo" className="h-24 sm:h-32 object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
            Initra – Home Inventory Management App
            <br />
            <span className="text-xl sm:text-2xl md:text-3xl">by Issac</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-700 font-semibold px-2">
            Manage your products and warranty cards
          </p>
        </header>

        {isInstallable && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 border border-white/20 rounded-2xl p-5 mb-6 shadow-lg shadow-blue-900/10">
            <p className="text-lg sm:text-xl font-bold text-white mb-3">Install this app for quicker access from your home screen</p>
            <Button onClick={install} size="md" className="bg-white text-blue-700 hover:bg-blue-50 shadow-sm">
              Install App
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Link
            to="/warranty"
            className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            aria-label="Get warranty card"
          >
            <div className="bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl shadow-lg p-6 sm:p-8 border border-white/25 hover:shadow-xl hover:scale-[1.02] motion-safe:transition-all motion-safe:duration-300 h-full flex flex-col">
              <div className="flex items-center justify-center mb-3 sm:mb-4">
                <div className="bg-white/95 rounded-full p-3 sm:p-4 shadow-inner">
                  <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-red-600" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3 text-center">Get Warranty</h2>
              <p className="text-base sm:text-lg text-white/95 text-center font-medium grow">
                Find and download warranty card
              </p>
              <div className="mt-4 flex items-center justify-center gap-1 text-white font-semibold text-sm">
                Open <ChevronRight className="w-4 h-4" aria-hidden />
              </div>
            </div>
          </Link>

          <Link
            to="/add"
            className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            aria-label="Add new product"
          >
            <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-lg p-6 sm:p-8 border border-white/25 hover:shadow-xl hover:scale-[1.02] motion-safe:transition-all motion-safe:duration-300 h-full flex flex-col">
              <div className="flex items-center justify-center mb-3 sm:mb-4">
                <div className="bg-white/95 rounded-full p-3 sm:p-4 shadow-inner">
                  <Plus className="w-12 h-12 sm:w-16 sm:h-16 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3 text-center">Add Product</h2>
              <p className="text-base sm:text-lg text-white/95 text-center font-medium grow">
                Scan barcode to add a new product
              </p>
              <div className="mt-4 flex items-center justify-center gap-1 text-white font-semibold text-sm">
                Open <ChevronRight className="w-4 h-4" aria-hidden />
              </div>
            </div>
          </Link>

          <Link
            to="/inventory"
            className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
            aria-label="View my products"
          >
            <div className="bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl shadow-lg p-6 sm:p-8 border border-white/25 hover:shadow-xl hover:scale-[1.02] motion-safe:transition-all motion-safe:duration-300 h-full flex flex-col">
              <div className="flex items-center justify-center mb-3 sm:mb-4">
                <div className="bg-white/95 rounded-full p-3 sm:p-4 shadow-inner">
                  <Package className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3 text-center">My Products</h2>
              <p className="text-base sm:text-lg text-white/95 text-center font-medium grow">
                View all your products
              </p>
              <div className="mt-4 flex items-center justify-center gap-1 text-white font-semibold text-sm">
                Open <ChevronRight className="w-4 h-4" aria-hidden />
              </div>
            </div>
          </Link>

          <Link
            to="/audit"
            className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
            aria-label="Inventory audit"
          >
            <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl shadow-lg p-6 sm:p-8 border border-white/25 hover:shadow-xl hover:scale-[1.02] motion-safe:transition-all motion-safe:duration-300 h-full flex flex-col">
              <div className="flex items-center justify-center mb-3 sm:mb-4">
                <div className="bg-white/95 rounded-full p-3 sm:p-4 shadow-inner">
                  <Search className="w-12 h-12 sm:w-16 sm:h-16 text-purple-600" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3 text-center">Audit</h2>
              <p className="text-base sm:text-lg text-white/95 text-center font-medium grow">
                Check your inventory
              </p>
              <div className="mt-4 flex items-center justify-center gap-1 text-white font-semibold text-sm">
                Open <ChevronRight className="w-4 h-4" aria-hidden />
              </div>
            </div>
          </Link>

          <Link
            to="/print"
            className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            aria-label="Print QR codes"
          >
            <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg p-6 sm:p-8 border border-white/25 hover:shadow-xl hover:scale-[1.02] motion-safe:transition-all motion-safe:duration-300 h-full flex flex-col">
              <div className="flex items-center justify-center mb-3 sm:mb-4">
                <div className="bg-white/95 rounded-full p-3 sm:p-4 shadow-inner">
                  <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-orange-600" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3 text-center">Print QR Codes</h2>
              <p className="text-base sm:text-lg text-white/95 text-center font-medium grow">
                Generate printable QR codes
              </p>
              <div className="mt-4 flex items-center justify-center gap-1 text-white font-semibold text-sm">
                Open <ChevronRight className="w-4 h-4" aria-hidden />
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border border-white/20">
          <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
            <div className="bg-white rounded-full p-2 sm:p-3">
              <Scan className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Quick Scan</h2>
          </div>
          <p className="text-base sm:text-lg md:text-xl text-white mb-4 sm:mb-6 font-semibold">
            Scan a QR code from your printed sticker to view product details
          </p>
          <Button 
            onClick={() => setShowQRScanner(true)} 
            fullWidth 
            size="lg"
            className="bg-white text-indigo-600 hover:bg-indigo-50 text-lg sm:text-xl md:text-2xl font-bold py-4 sm:py-5 md:py-6"
          >
            <Scan className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
            Scan QR Code
          </Button>
        </div>
      </div>

      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      <Chatbot />
    </div>
  );
}

