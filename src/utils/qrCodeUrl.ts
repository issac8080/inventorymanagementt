/**
 * Generates a QR code URL that links to the product page on the website
 * Format: https://inventorymanagementt.vercel.app/product/{itemCode}
 * 
 * @param itemCode - The product item code (e.g., "TV-001")
 * @returns The full URL for the QR code
 * 
 * @example
 * ```typescript
 * const qrUrl = generateQRCodeUrl('TV-001');
 * // Returns: "https://inventorymanagementt.vercel.app/product/TV-001"
 * ```
 */
export function generateQRCodeUrl(itemCode: string): string {
  const baseUrl = 'https://inventorymanagementt.vercel.app';
  return `${baseUrl}/product/${itemCode}`;
}

/**
 * Extracts the item code from a QR code URL
 * Handles both URL format and plain itemCode format for backward compatibility
 * 
 * @param qrValue - The QR code value (URL or itemCode)
 * @returns The item code extracted from the QR code
 * 
 * @example
 * ```typescript
 * const itemCode = extractItemCodeFromQR('https://inventorymanagementt.vercel.app/product/TV-001');
 * // Returns: "TV-001"
 * 
 * const itemCode2 = extractItemCodeFromQR('TV-001');
 * // Returns: "TV-001"
 * ```
 */
export function extractItemCodeFromQR(qrValue: string): string {
  if (!qrValue) return '';
  
  // Check if it's a URL format
  if (qrValue.includes('/product/')) {
    const parts = qrValue.split('/product/');
    if (parts.length > 1) {
      return parts[1].split('?')[0].split('#')[0].trim(); // Remove query params and hash
    }
  }
  
  // Otherwise, assume it's already an itemCode
  return qrValue.trim();
}
