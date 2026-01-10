/**
 * Unified database service
 * Uses Supabase as primary database for user-specific, cross-device data
 * Falls back to localDb for offline support if needed
 */

import { supabaseDb } from './supabaseDb';
import { Product, WarrantyDocument } from '@/types';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url !== 'https://placeholder.supabase.co');
};

// Export the database service - use Supabase if configured, otherwise throw error
export const productDb = {
  async getAll(): Promise<Product[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }
    return await supabaseDb.getAllProducts();
  },

  async getById(id: string): Promise<Product | undefined> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }
    return await supabaseDb.getProductById(id);
  },

  async getByItemCode(itemCode: string): Promise<Product | undefined> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }
    return await supabaseDb.getProductByItemCode(itemCode);
  },

  async add(product: Product): Promise<string> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }
    return await supabaseDb.addProduct(product);
  },

  async update(id: string, changes: Partial<Product>): Promise<number> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }
    return await supabaseDb.updateProduct(id, changes);
  },

  async delete(id: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }
    return await supabaseDb.deleteProduct(id);
  },

  async search(query: string): Promise<Product[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }
    return await supabaseDb.searchProducts(query);
  },

  async getByCategory(category: string): Promise<Product[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }
    return await supabaseDb.getByCategory(category);
  },
};

export const warrantyDb = {
  async getByProductId(productId: string): Promise<WarrantyDocument | undefined> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }
    return await supabaseDb.getByProductId(productId);
  },

  async add(document: WarrantyDocument): Promise<string> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }
    return await supabaseDb.add(document);
  },

  async delete(id: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }
    return await supabaseDb.delete(id);
  },

  async deleteByProductId(productId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured. Please set up Supabase environment variables.');
    }
    return await supabaseDb.deleteByProductId(productId);
  },
};

