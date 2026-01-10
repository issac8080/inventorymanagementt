import { productDb } from '@/services/database/db';

/**
 * Maps category names to their abbreviated codes
 */
const categoryMap: Record<string, string> = {
  'television': 'TV',
  'tv': 'TV',
  'refrigerator': 'FRIDGE',
  'fridge': 'FRIDGE',
  'washing machine': 'WM',
  'air conditioner': 'AC',
  'laptop': 'LAPTOP',
  'computer': 'PC',
  'mobile': 'PHONE',
  'phone': 'PHONE',
  'tablet': 'TABLET',
  'microwave': 'MW',
  'oven': 'OVEN',
  'fan': 'FAN',
  'mixer': 'MIXER',
  'grinder': 'GRINDER',
  'iron': 'IRON',
  'vacuum': 'VACUUM',
  'router': 'ROUTER',
  'speaker': 'SPEAKER',
  'headphone': 'HP',
  'camera': 'CAM',
  'watch': 'WATCH',
};

/**
 * Gets the category code abbreviation for a given category name
 * @param category - The category name (e.g., "Television", "TV")
 * @returns The category code (e.g., "TV", "FRIDGE")
 */
export function getCategoryCode(category: string): string {
  const normalized = category.toLowerCase().trim();
  return categoryMap[normalized] || category.toUpperCase().substring(0, 6);
}

/**
 * Generates a unique item code for a product based on its category
 * Format: CATEGORY-XXX (e.g., TV-001, FRIDGE-002)
 * 
 * @param category - The product category (e.g., "TV", "Refrigerator")
 * @returns Promise resolving to item code (e.g., "TV-001")
 * @throws {Error} If category is invalid or database operation fails
 * 
 * @example
 * ```typescript
 * const itemCode = await generateItemCode('TV');
 * // Returns: "TV-001" (or next available number)
 * ```
 */
export async function generateItemCode(category: string): Promise<string> {
  const categoryCode = getCategoryCode(category);
  
  // Get all products in this category
  const existingProducts = await productDb.getByCategory(category);
  
  // Find the highest number for this category
  let maxNumber = 0;
  const prefix = `${categoryCode}-`;
  
  existingProducts.forEach(product => {
    if (product.itemCode.startsWith(prefix)) {
      const numStr = product.itemCode.replace(prefix, '');
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  });
  
  const nextNumber = maxNumber + 1;
  return `${categoryCode}-${nextNumber.toString().padStart(3, '0')}`;
}

