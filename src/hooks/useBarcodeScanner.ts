import { useState, useCallback, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export function useBarcodeScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = useRef(`barcode-scanner-container-${Date.now()}`);

  const startScanning = useCallback(async (
    onScanSuccess: (decodedText: string) => void,
    onScanError?: (error: string) => void
  ) => {
    try {
      setError(null);
      setIsScanning(false); // Start as false, will be true when camera starts

      // Clear any existing scanner
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          await scannerRef.current.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      // Wait for DOM to be ready and find the container
      let container = document.getElementById(containerId.current);
      let attempts = 0;
      const maxAttempts = 20;
      
      while (!container && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50));
        container = document.getElementById(containerId.current);
        attempts++;
      }
      
      if (!container) {
        const parent = document.querySelector('.barcode-scanner-parent');
        if (!parent) {
          throw new Error('Scanner container parent not found. Please refresh the page.');
        }
        container = document.createElement('div');
        container.id = containerId.current;
        parent.appendChild(container);
      }

      // Ensure container is visible and has dimensions
      if (container) {
        container.style.display = 'block';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.minHeight = '300px';
        container.style.position = 'relative';
        container.style.backgroundColor = '#000';
      }

      // Small delay to ensure container is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify container still exists
      const finalContainer = document.getElementById(containerId.current);
      if (!finalContainer) {
        throw new Error('Scanner container not found after initialization. Please try again.');
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
          fps: 10, // Lower FPS for better mobile performance
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // For barcodes, use a wider scanning area (barcodes are horizontal)
            // Use 90% width and 50% height for better barcode detection
            const widthPercentage = 0.9;
            const heightPercentage = 0.5;
            return {
              width: Math.floor(viewfinderWidth * widthPercentage),
              height: Math.floor(viewfinderHeight * heightPercentage)
            };
          },
          aspectRatio: 1.777778, // 16:9 aspect ratio for better barcode scanning
          disableFlip: false, // Allow rotation for better scanning
          // Simplified video constraints for better mobile compatibility
          videoConstraints: {
            facingMode: { ideal: 'environment' }, // Use back camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          // html5-qrcode supports both QR codes and barcodes by default
          // No need to specify formats - it will detect automatically
        },
        (decodedText) => {
          // Don't stop immediately - let the callback handle it
          if (decodedText) {
            onScanSuccess(decodedText);
          }
        },
        (errorMessage) => {
          // Ignore continuous scan errors (not found, etc.)
          // Only show actual errors
          if (errorMessage && !errorMessage.includes('NotFoundException')) {
            console.debug('Scan error:', errorMessage);
          }
        }
      );
      
      // Camera started successfully
      setIsScanning(true);
    } catch (err: any) {
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
      setIsScanning(false);
      
      // Clean up on error
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
          scannerRef.current.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
        scannerRef.current = null;
      }
    }
  }, []);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return {
    isScanning,
    error,
    startScanning,
    stopScanning,
    containerId: containerId.current,
  };
}

