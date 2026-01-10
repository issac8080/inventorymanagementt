/**
 * Image compression utilities
 * Compresses images before storage to save space
 */

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const MAX_QUALITY = 0.8;
const MAX_SIZE_KB = 500;

/**
 * Compress an image file
 * @param file - Image file to compress
 * @param maxSizeKB - Maximum size in KB (default: 500KB)
 * @returns Compressed blob
 */
export async function compressImage(
  file: File,
  maxSizeKB: number = MAX_SIZE_KB
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels to meet size requirement
        let quality = MAX_QUALITY;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              const sizeKB = blob.size / 1024;
              
              if (sizeKB > maxSizeKB && quality > 0.1) {
                quality -= 0.1;
                tryCompress();
              } else {
                resolve(blob);
              }
            },
            file.type || 'image/jpeg',
            quality
          );
        };
        
        tryCompress();
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Check if image needs compression
 */
export function needsCompression(file: File): boolean {
  const sizeKB = file.size / 1024;
  return sizeKB > MAX_SIZE_KB;
}

