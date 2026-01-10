/**
 * Database export and import utilities
 * Allows users to backup and restore their data
 */

import { productDb, warrantyDb } from '@/services/database/db';
import { Product, WarrantyDocument } from '@/types';
import { handleError, ErrorCode } from './errorHandler';
import toast from 'react-hot-toast';

export interface DatabaseExport {
  version: number;
  exportDate: string;
  products: Product[];
  warrantyDocuments: WarrantyDocument[];
  metadata?: {
    totalProducts: number;
    totalWarrantyDocs: number;
    appVersion?: string;
  };
}

/**
 * Export all database data to JSON
 */
export async function exportDatabase(): Promise<Blob> {
  try {
    const products = await productDb.getAll();
    
    // Get all warranty documents for all products
    const warrantyDocs: WarrantyDocument[] = [];
    for (const product of products) {
      const warranty = await warrantyDb.getByProductId(product.id);
      if (warranty) {
        warrantyDocs.push(warranty);
      }
    }
    
    const exportData: DatabaseExport = {
      version: 1,
      exportDate: new Date().toISOString(),
      products,
      warrantyDocuments: warrantyDocs,
      metadata: {
        totalProducts: products.length,
        totalWarrantyDocs: warrantyDocs.length,
        appVersion: '1.0.0',
      },
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  } catch (error) {
    throw handleError(error, 'Database export failed');
  }
}

/**
 * Download database export as file
 */
export async function downloadDatabaseExport(): Promise<void> {
  try {
    const blob = await exportDatabase();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `home-inventory-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Database exported successfully!');
  } catch (error) {
    const appError = handleError(error, 'Export download failed');
    toast.error(appError.userMessage);
    throw appError;
  }
}

/**
 * Import database from JSON file
 */
export async function importDatabase(file: File): Promise<{
  success: boolean;
  imported: { products: number; warranties: number };
  errors?: string[];
}> {
  try {
    const text = await file.text();
    const importData: DatabaseExport = JSON.parse(text);
    
    // Validate import data structure
    if (!importData.products || !Array.isArray(importData.products)) {
      throw new Error('Invalid export file format: missing products array');
    }
    
    if (!importData.warrantyDocuments || !Array.isArray(importData.warrantyDocuments)) {
      throw new Error('Invalid export file format: missing warrantyDocuments array');
    }
    
    const errors: string[] = [];
    let importedProducts = 0;
    let importedWarranties = 0;
    
    // Import products
    for (const product of importData.products) {
      try {
        // Check if product already exists
        const existing = await productDb.getByItemCode(product.itemCode);
        if (existing) {
          // Update existing product
          await productDb.update(existing.id, {
            ...product,
            updatedAt: new Date(),
          });
        } else {
          // Add new product
          await productDb.add({
            ...product,
            createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
            updatedAt: new Date(),
          });
        }
        importedProducts++;
      } catch (error) {
        errors.push(`Failed to import product ${product.itemCode}: ${error}`);
      }
    }
    
    // Import warranty documents
    for (const warranty of importData.warrantyDocuments) {
      try {
        // Check if warranty already exists
        const existing = await warrantyDb.getByProductId(warranty.productId);
        if (existing) {
          // Delete existing and add new one (since we don't have update method)
          await warrantyDb.delete(existing.id);
        }
        // Add new warranty
        await warrantyDb.add({
          ...warranty,
          createdAt: warranty.createdAt ? new Date(warranty.createdAt) : new Date(),
        });
        importedWarranties++;
      } catch (error) {
        errors.push(`Failed to import warranty for product ${warranty.productId}: ${error}`);
      }
    }
    
    if (errors.length > 0) {
      toast.error(`Imported with ${errors.length} errors. Check console for details.`);
      console.error('Import errors:', errors);
    } else {
      toast.success(`Successfully imported ${importedProducts} products and ${importedWarranties} warranty documents!`);
    }
    
    return {
      success: errors.length === 0,
      imported: {
        products: importedProducts,
        warranties: importedWarranties,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const appError = handleError(error, 'Database import failed');
    toast.error(appError.userMessage);
    throw appError;
  }
}

/**
 * Clear all database data (use with caution!)
 * Note: This will delete all products and warranties for the current user
 */
export async function clearDatabase(): Promise<void> {
  try {
    const products = await productDb.getAll();
    
    // Delete all products (this will cascade delete warranties)
    for (const product of products) {
      await productDb.delete(product.id);
    }
    
    toast.success('Database cleared successfully');
  } catch (error) {
    const appError = handleError(error, 'Database clear failed');
    toast.error(appError.userMessage);
    throw appError;
  }
}

