import { addMonths, addYears, parse, isValid } from 'date-fns';

export interface WarrantyInfo {
  startDate?: Date;
  endDate?: Date;
  duration?: number; // in months
  isValid: boolean;
}

/**
 * Calculates warranty end date from start date and duration
 * @param startDate - Warranty start date
 * @param duration - Warranty duration in months
 * @returns Warranty end date
 */
export function calculateWarrantyEnd(
  startDate: Date,
  duration: number
): Date {
  return addMonths(startDate, duration);
}

/**
 * Parses warranty duration from text (e.g., "12 months", "1 year")
 * @param text - Text containing warranty duration
 * @returns Duration in months, or null if not found
 */
export function parseWarrantyDuration(text: string): number | null {
  // Try to extract duration from text
  // Patterns: "12 months", "1 year", "24 months", "2 years", etc.
  const patterns = [
    /(\d+)\s*(?:month|months|mo)/i,
    /(\d+)\s*(?:year|years|yr)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      if (pattern.source.includes('year')) {
        return value * 12; // Convert years to months
      }
      return value;
    }
  }

  return null;
}

/**
 * Parses warranty date from text in various formats
 * Supports: DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY, DD MMM YYYY
 * @param text - Text containing warranty date
 * @returns Parsed date, or null if not found
 */
export function parseWarrantyDate(text: string): Date | null {
  // Common date patterns
  const patterns = [
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/, // DD-MM-YYYY or DD/MM/YYYY
    /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/, // YYYY-MM-DD or YYYY/MM/DD
    /(\d{1,2})\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i, // DD MMM YYYY
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let date: Date | null = null;
      
      if (pattern.source.includes('Jan|Feb')) {
        // Try parsing as DD MMM YYYY
        try {
          date = parse(match[0], 'd MMM yyyy', new Date());
        } catch {}
      } else if (match[1].length === 4) {
        // YYYY-MM-DD format
        try {
          date = parse(match[0], 'yyyy-MM-dd', new Date());
        } catch {}
      } else {
        // DD-MM-YYYY or DD/MM/YYYY format
        try {
          // Try with dash first
          date = parse(match[0].replace(/\//g, '-'), 'dd-MM-yyyy', new Date());
          if (!isValid(date)) {
            // Try with slash format
            date = parse(match[0], 'dd/MM/yyyy', new Date());
          }
        } catch {}
      }

      if (date && isValid(date)) {
        return date;
      }
    }
  }

  return null;
}

/**
 * Gets the warranty status for a product
 * @param warrantyEnd - Warranty end date (optional)
 * @returns 'valid' if warranty is active, 'expired' if past, 'none' if no warranty info
 */
export function getWarrantyStatus(warrantyEnd?: Date): 'valid' | 'expired' | 'none' {
  if (!warrantyEnd) return 'none';
  
  const now = new Date();
  if (warrantyEnd < now) return 'expired';
  return 'valid';
}

