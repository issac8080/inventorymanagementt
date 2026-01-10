import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/common/Button';
import { X } from 'lucide-react';
import { playBeep } from '@/utils/sounds';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = useRef(`qr-scanner-container-${Date.now()}`);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  // Keep refs updated
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        // Clear any existing scanner
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
            await scannerRef.current.clear();
          } catch (e) {
            // Ignore cleanup errors
          }
          scannerRef.current = null;
        }

        // Create unique container element if it doesn't exist
        let container = document.getElementById(containerId.current);
        if (!container) {
          container = document.createElement('div');
          container.id = containerId.current;
          container.className = 'w-full h-full';
          const parent = document.querySelector('.qr-scanner-parent');
          if (parent) {
            parent.appendChild(container);
          }
        }

        const scanner = new Html5Qrcode(containerId.current);
        scannerRef.current = scanner;

        // Try to get available cameras
        const cameras = await Html5Qrcode.getCameras();
        
        if (cameras.length === 0) {
          throw new Error('No camera found. Please check camera permissions.');
        }

        // Prefer back camera, fallback to first available
        const cameraId = cameras.find(cam => 
          cam.label.toLowerCase().includes('back') || 
          cam.label.toLowerCase().includes('rear') ||
          cam.label.toLowerCase().includes('environment')
        )?.id || cameras[0].id;

        await scanner.start(
          cameraId,
          {
            fps: 30,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdgePercentage = 0.7;
              const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
              return {
                width: qrboxSize,
                height: qrboxSize
              };
            },
            aspectRatio: 1.0,
            disableFlip: false,
            videoConstraints: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          (decodedText) => {
            if (isMounted && decodedText) {
              playBeep('scan');
              // Stop scanner before calling callbacks
              scanner.stop().then(() => {
                scanner.clear();
                if (isMounted) {
                  onScanRef.current(decodedText);
                  onCloseRef.current();
                }
              }).catch(() => {
                // Even if stop fails, process the scan
                if (isMounted) {
                  onScanRef.current(decodedText);
                  onCloseRef.current();
                }
              });
            }
          },
          (errorMessage) => {
            // Ignore continuous scan errors (not found, etc.)
            if (errorMessage && !errorMessage.includes('NotFoundException') && isMounted) {
              console.debug('Scan error:', errorMessage);
            }
          }
        );
      } catch (err: any) {
        if (isMounted) {
          console.error('Scanner error:', err);
          let errorMessage = 'Failed to start camera';
          
          if (err.message) {
            if (err.message.includes('Permission') || err.message.includes('permission')) {
              errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
            } else if (err.message.includes('No camera') || err.message.includes('not found')) {
              errorMessage = 'No camera found. Please check your device has a camera.';
            } else if (err.message.includes('NotAllowedError')) {
              errorMessage = 'Camera access denied. Please allow camera permission and try again.';
            } else if (err.message.includes('NotFoundError')) {
              errorMessage = 'No camera found on this device.';
            } else {
              errorMessage = err.message;
            }
          }
          
          setError(errorMessage);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
    >
      <div className="flex justify-between items-center p-4 bg-black bg-opacity-75 text-white">
        <h2 className="text-xl font-bold">Scan QR Code</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex-1 relative qr-scanner-parent">
        <div id={containerId.current} className="w-full h-full" />
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-20">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <p className="text-lg text-red-600 mb-4 font-semibold">{error}</p>
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Tips to fix:</strong>
                  <br />• Check browser settings and allow camera permission
                  <br />• Make sure no other app is using the camera
                  <br />• Refresh the page and try again
                  <br />• Ensure good lighting
                  <br />• Hold the QR code steady
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      setError(null);
                      window.location.reload();
                    }} 
                    variant="outline" 
                    className="flex-1"
                  >
                    Reload Page
                  </Button>
                  <Button onClick={onClose} className="flex-1">Close</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-black bg-opacity-75 text-white text-center z-10">
        <p className="text-lg font-semibold">Point camera at QR code</p>
        <p className="text-sm text-gray-300 mt-1">Ensure good lighting and hold steady</p>
      </div>

      {!error && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="border-4 border-green-400 rounded-lg w-64 h-64 animate-pulse"></div>
          </div>
        </div>
      )}
    </div>
  );
}

