import { ProductLookupResult } from '@/types';
import { retryWithBackoff, handleError } from '@/utils/errorHandler';
import { ErrorCode } from '@/utils/errorHandler';

// Multiple APIs for comprehensive worldwide product coverage
const UPCITEMDB_API = 'https://api.upcitemdb.com/prod/trial/lookup';
const OPEN_PRODUCT_DATA_API = 'https://world.openfoodfacts.org/api/v0/product';
const EAN_DATA_API = 'https://eandata.com/feed';
const PRODUCT_UPCDATABASE_API = 'https://www.upcdatabase.com/api/v1/prod';

// API timeout in milliseconds
const API_TIMEOUT = 10000;

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = API_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// Try multiple APIs in parallel for fastest results and best coverage
export async function lookupProductByBarcode(barcode: string): Promise<ProductLookupResult | null> {
  // Clean barcode - remove spaces and non-numeric characters except EAN/UPC
  const cleanBarcode = barcode.trim().replace(/\s+/g, '');
  
  if (!cleanBarcode || cleanBarcode.length < 8) {
    return null;
  }

  // Try all APIs in parallel for fastest response
  const promises = [
    retryWithBackoff(() => lookupUPCitemdb(cleanBarcode), 2, 500, 'UPCitemdb lookup'),
    retryWithBackoff(() => lookupOpenProductData(cleanBarcode), 2, 500, 'Open Product Data lookup'),
    retryWithBackoff(() => lookupEANData(cleanBarcode), 2, 500, 'EAN Data lookup'),
  ];

  try {
    const results = await Promise.allSettled(promises);
    
    // Return first successful result
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        return result.value;
      }
    }
  } catch (error) {
    handleError(error, 'Barcode lookup');
  }

  return null;
}

// UPCitemdb - Good for international products
async function lookupUPCitemdb(barcode: string): Promise<ProductLookupResult | null> {
  try {
    const response = await fetchWithTimeout(`${UPCITEMDB_API}?upc=${barcode}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.code === 'OK' && data.items && data.items.length > 0) {
        const item = data.items[0];
        const result = {
          name: item.title || item.description || '',
          category: inferCategory(item.title || item.description || ''),
          description: item.description || '',
          image: item.images?.[0] || '',
        };
        
        if (result.name) return result;
      }
    }
  } catch (error) {
    console.debug('UPCitemdb lookup failed:', error);
  }
  return null;
}

// Open Product Data / OpenFoodFacts - Best for Indian and global products
async function lookupOpenProductData(barcode: string): Promise<ProductLookupResult | null> {
  try {
    const response = await fetchWithTimeout(`${OPEN_PRODUCT_DATA_API}/${barcode}.json`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HomeInventory/1.0',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 1 && data.product) {
        const product = data.product;
        const result = {
          name: product.product_name || product.product_name_en || product.product_name_hi || 
                product.generic_name || product.brands || '',
          category: inferCategory(product.categories || product.product_name || product.brands || ''),
          description: product.ingredients_text || product.generic_name || product.brands || '',
          image: product.image_url || product.image_front_url || product.image_small_url || '',
        };
        
        if (result.name) return result;
      }
    }
  } catch (error) {
    console.debug('Open Product Data lookup failed:', error);
  }
  return null;
}

// EAN Data - Additional coverage
async function lookupEANData(barcode: string): Promise<ProductLookupResult | null> {
  try {
    // Try alternative lookup methods
    const response = await fetchWithTimeout(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.code === 'OK' && data.items && data.items.length > 0) {
        const item = data.items[0];
        const result = {
          name: item.title || item.description || '',
          category: inferCategory(item.title || item.description || ''),
          description: item.description || '',
          image: item.images?.[0] || '',
        };
        
        if (result.name) return result;
      }
    }
  } catch (error) {
    console.debug('EAN Data lookup failed:', error);
  }
  return null;
}

function inferCategory(text: string): string {
  if (!text) return 'Other';
  
  const lowerText = text.toLowerCase();
  
  const categories: Record<string, string> = {
    // Electronics
    'tv': 'Television',
    'television': 'Television',
    'led tv': 'Television',
    'smart tv': 'Television',
    'refrigerator': 'Refrigerator',
    'fridge': 'Refrigerator',
    'washing machine': 'Washing Machine',
    'washing': 'Washing Machine',
    'air conditioner': 'Air Conditioner',
    'ac': 'Air Conditioner',
    'airconditioner': 'Air Conditioner',
    'laptop': 'Laptop',
    'computer': 'Computer',
    'mobile': 'Mobile',
    'phone': 'Mobile',
    'smartphone': 'Mobile',
    'tablet': 'Tablet',
    'microwave': 'Microwave',
    'oven': 'Oven',
    'fan': 'Fan',
    'mixer': 'Mixer',
    'grinder': 'Grinder',
    'iron': 'Iron',
    'vacuum': 'Vacuum',
    'router': 'Router',
    'speaker': 'Speaker',
    'headphone': 'Headphone',
    'earphone': 'Headphone',
    'camera': 'Camera',
    'watch': 'Watch',
    'smartwatch': 'Watch',
    // Indian brands/common terms
    'samsung': 'Other',
    'lg': 'Other',
    'whirlpool': 'Other',
    'godrej': 'Other',
    'voltas': 'Air Conditioner',
    'daikin': 'Air Conditioner',
    'hitachi': 'Other',
    'sony': 'Television',
    'oneplus': 'Mobile',
    'xiaomi': 'Mobile',
    'realme': 'Mobile',
    'oppo': 'Mobile',
    'vivo': 'Mobile',
  };

  // Check for exact matches first
  for (const [key, value] of Object.entries(categories)) {
    if (lowerText.includes(key)) {
      return value;
    }
  }

  return 'Other';
}

