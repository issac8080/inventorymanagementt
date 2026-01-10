import { useEffect, useState, useRef, useCallback } from 'react';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { Button } from '@/components/common/Button';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const { isScanning, error, startScanning, stopScanning, containerId } = useBarcodeScanner();
  const [localError, setLocalError] = useState<string | null>(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  // Keep refs updated
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  useEffect(() => {
    setLocalError(null);
    let isMounted = true;

    const handleScan = (barcode: string) => {
      if (isMounted) {
        onScanRef.current(barcode);
        stopScanning();
        onCloseRef.current();
      }
    };

    const handleError = (errorMsg: string) => {
      if (isMounted && errorMsg && !errorMsg.includes('NotFoundException')) {
        setLocalError(errorMsg);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (isMounted) {
        startScanning(handleScan, handleError);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanning();
    };
  }, [startScanning, stopScanning]);

  const displayError = error || localError;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-title"
    >
      <div className="flex justify-between items-center p-4 bg-black bg-opacity-75 text-white z-10">
        <h2 id="scanner-title" className="text-xl font-bold">Scan Barcode</h2>
        <button
          onClick={() => {
            stopScanning();
            onClose();
          }}
          className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
          aria-label="Close scanner"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex-1 relative overflow-hidden barcode-scanner-parent" style={{ minHeight: '400px', backgroundColor: '#000' }}>
        <div id={containerId} className="w-full h-full" style={{ width: '100%', height: '100%', minHeight: '400px', backgroundColor: '#000' }} />
        
        {!displayError && !isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-20">
            <div className="text-white text-center">
              <p className="text-lg font-semibold mb-2">Initializing camera...</p>
              <p className="text-sm text-gray-300">Please wait</p>
            </div>
          </div>
        )}
        
        {displayError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-20">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <p className="text-lg text-red-600 mb-4 font-semibold">{displayError}</p>
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-4">
                  Tips:
                  <br />• Make sure camera permission is granted
                  <br />• Ensure good lighting
                  <br />• Hold the barcode steady
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    setLocalError(null);
                    startScanning(
                      (barcode) => {
                        onScanRef.current(barcode);
                        stopScanning();
                        onCloseRef.current();
                      },
                      (errorMsg) => {
                        if (errorMsg && !errorMsg.includes('NotFoundException')) {
                          setLocalError(errorMsg);
                        }
                      }
                    );
                  }} variant="outline" className="flex-1">
                    Try Again
                  </Button>
                  <Button onClick={() => {
                    stopScanning();
                    onClose();
                  }} className="flex-1">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!displayError && isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="border-4 border-green-400 rounded-lg w-64 h-64 animate-pulse"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-black bg-opacity-75 text-white text-center z-10">
        <p className="text-lg font-semibold">Point camera at barcode</p>
        <p className="text-sm text-gray-300 mt-1">
          Ensure good lighting, hold steady, and align barcode horizontally
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Tip: Keep barcode flat and well-lit for best results
        </p>
      </div>
    </div>
  );
}

