import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { extractTextFromImage } from '@/services/ocr/tesseractService';
import { parseWarrantyDate, parseWarrantyDuration, calculateWarrantyEnd } from '@/utils/warrantyCalculator';
import { validateFile } from '@/utils/validation';
import { handleError } from '@/utils/errorHandler';
import { generateUUID } from '@/utils/uuid';
import toast from 'react-hot-toast';

interface WarrantyUploadProps {
  onSave: (imageBlob: Blob, warrantyStart?: Date, warrantyEnd?: Date) => void;
  onClose: () => void;
}

export function WarrantyUpload({ onSave, onClose }: WarrantyUploadProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [warrantyStart, setWarrantyStart] = useState<string>('');
  const [warrantyDuration, setWarrantyDuration] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file
    const validation = validateFile(file, {
      maxSizeMB: 5,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.onerror = () => {
      const error = handleError(new Error('Failed to read file'), 'File read');
      toast.error(error.userMessage);
    };
    reader.readAsDataURL(file);
    setImageBlob(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleOCR = async () => {
    if (!imageBlob) return;

    setProcessing(true);
    try {
      const text = await extractTextFromImage(imageBlob);
      
      // Try to extract warranty date
      const extractedDate = parseWarrantyDate(text);
      if (extractedDate) {
        setWarrantyStart(formatDateInput(extractedDate));
        toast.success('Warranty date found!');
      }

      // Try to extract warranty duration
      const extractedDuration = parseWarrantyDuration(text);
      if (extractedDuration) {
        setWarrantyDuration(extractedDuration.toString());
        toast.success('Warranty duration found!');
      }

      if (!extractedDate && !extractedDuration) {
        toast('Could not automatically extract warranty details. Please enter manually.');
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast.error('Failed to process image');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = () => {
    if (!imageBlob) {
      toast.error('Please select an image');
      return;
    }

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (warrantyStart) {
      startDate = new Date(warrantyStart);
    }

    if (warrantyDuration && startDate) {
      const duration = parseInt(warrantyDuration, 10);
      endDate = calculateWarrantyEnd(startDate, duration);
    } else if (warrantyStart && !warrantyDuration) {
      // If only start date is provided, assume 1 year warranty
      endDate = calculateWarrantyEnd(startDate, 12);
    }

    onSave(imageBlob, startDate, endDate);
  };

  const formatDateInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="📷 Upload Warranty Card" size="lg">
      <div className="space-y-6">
        {!imagePreview ? (
          <div className="space-y-4">
            <p className="text-lg text-gray-600 text-center mb-4">
              Take a clear photo of your warranty card or choose from gallery
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => cameraInputRef.current?.click()}
                variant="primary"
                fullWidth
                size="lg"
                className="text-xl py-8 bg-gradient-to-r from-blue-600 to-blue-700"
              >
                <Camera className="w-8 h-8 mr-2" />
                📷 Take Photo
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                fullWidth
                size="lg"
                className="text-xl py-8 border-2"
              >
                <Upload className="w-8 h-8 mr-2" />
                📁 Choose File
              </Button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={imagePreview}
                alt="Warranty card"
                className="w-full rounded-lg border-2 border-gray-300"
              />
              <button
                onClick={() => {
                  setImagePreview(null);
                  setImageBlob(null);
                }}
                className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <Button
                onClick={handleOCR}
                variant="outline"
                fullWidth
                disabled={processing}
                size="lg"
                className="text-lg py-4 border-2 border-blue-600"
              >
                {processing ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    🔍 Extracting details from image...
                  </>
                ) : (
                  <>
                    🔍 Auto-Extract Warranty Details
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-600 mt-2 text-center">
                (Optional) Click to automatically read dates from the warranty card
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-lg font-semibold mb-2 text-gray-700">
                  📅 Warranty Start Date
                </label>
                <input
                  type="date"
                  value={warrantyStart}
                  onChange={(e) => setWarrantyStart(e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-lg font-semibold mb-2 text-gray-700">
                  ⏱️ Warranty Duration (months)
                </label>
                <input
                  type="number"
                  value={warrantyDuration}
                  onChange={(e) => setWarrantyDuration(e.target.value)}
                  placeholder="e.g., 12 for 1 year"
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button onClick={onClose} variant="outline" fullWidth size="lg" className="text-xl py-4">
                Cancel
              </Button>
              <Button onClick={handleSave} fullWidth size="lg" className="text-xl py-4 bg-gradient-to-r from-green-600 to-green-700">
                ✅ Save Warranty
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

