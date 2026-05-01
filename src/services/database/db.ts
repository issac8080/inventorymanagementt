/**
 * Unified database service
 * - Firebase Firestore when that cloud backend is active
 * - Supabase (Postgres + Storage) when that cloud backend is active
 * - Else IndexedDB (Dexie) on this device
 */

import { firestoreProductDb, firestoreWarrantyDb } from './firestoreDb';
import { supabaseProductDb, supabaseWarrantyDb } from './supabaseDb';
import { productDb as dexieProductDb, warrantyDb as dexieWarrantyDb } from './localDb';
import { Product, WarrantyDocument } from '@/types';
import { getActiveCloudBackend, useCloudDatabaseSync, useFirebaseCloudSync, useSupabaseCloudSync } from './cloudEnv';

/** True when using Dexie only (no cloud or user chose device-only). */
export function isUsingLocalDatabase(): boolean {
  return !useCloudDatabaseSync();
}

export function isUsingFirebase(): boolean {
  return useFirebaseCloudSync();
}

export function isUsingSupabase(): boolean {
  return useSupabaseCloudSync();
}

export const productDb = {
  async getAll(): Promise<Product[]> {
    if (!useCloudDatabaseSync()) {
      return await dexieProductDb.getAll();
    }
    if (getActiveCloudBackend() === 'supabase') {
      return await supabaseProductDb.getAll();
    }
    return await firestoreProductDb.getAll();
  },

  async getById(id: string): Promise<Product | undefined> {
    if (!useCloudDatabaseSync()) {
      return await dexieProductDb.getById(id);
    }
    if (getActiveCloudBackend() === 'supabase') {
      return await supabaseProductDb.getById(id);
    }
    return await firestoreProductDb.getById(id);
  },

  async getByItemCode(itemCode: string): Promise<Product | undefined> {
    if (!useCloudDatabaseSync()) {
      return await dexieProductDb.getByItemCode(itemCode);
    }
    if (getActiveCloudBackend() === 'supabase') {
      return await supabaseProductDb.getByItemCode(itemCode);
    }
    return await firestoreProductDb.getByItemCode(itemCode);
  },

  async add(product: Product): Promise<string> {
    if (!useCloudDatabaseSync()) {
      return await dexieProductDb.add(product);
    }
    if (getActiveCloudBackend() === 'supabase') {
      return await supabaseProductDb.add(product);
    }
    return await firestoreProductDb.add(product);
  },

  async update(id: string, changes: Partial<Product>): Promise<number> {
    if (!useCloudDatabaseSync()) {
      return await dexieProductDb.update(id, changes);
    }
    if (getActiveCloudBackend() === 'supabase') {
      return await supabaseProductDb.update(id, changes);
    }
    return await firestoreProductDb.update(id, changes);
  },

  async delete(id: string): Promise<void> {
    if (!useCloudDatabaseSync()) {
      return await dexieProductDb.delete(id);
    }
    if (getActiveCloudBackend() === 'supabase') {
      return await supabaseProductDb.delete(id);
    }
    return await firestoreProductDb.delete(id);
  },

  async search(query: string): Promise<Product[]> {
    if (!useCloudDatabaseSync()) {
      return await dexieProductDb.search(query);
    }
    if (getActiveCloudBackend() === 'supabase') {
      return await supabaseProductDb.search(query);
    }
    return await firestoreProductDb.search(query);
  },

  async getByCategory(category: string): Promise<Product[]> {
    if (!useCloudDatabaseSync()) {
      return await dexieProductDb.getByCategory(category);
    }
    if (getActiveCloudBackend() === 'supabase') {
      return await supabaseProductDb.getByCategory(category);
    }
    return await firestoreProductDb.getByCategory(category);
  },
};

export const warrantyDb = {
  async getByProductId(productId: string): Promise<WarrantyDocument | undefined> {
    if (!useCloudDatabaseSync()) {
      return await dexieWarrantyDb.getByProductId(productId);
    }
    if (getActiveCloudBackend() === 'supabase') {
      return await supabaseWarrantyDb.getByProductId(productId);
    }
    return await firestoreWarrantyDb.getByProductId(productId);
  },

  async add(document: WarrantyDocument): Promise<string> {
    if (!useCloudDatabaseSync()) {
      return await dexieWarrantyDb.add(document);
    }
    if (getActiveCloudBackend() === 'supabase') {
      return await supabaseWarrantyDb.add(document);
    }
    return await firestoreWarrantyDb.add(document);
  },

  async delete(id: string): Promise<void> {
    if (!useCloudDatabaseSync()) {
      return await dexieWarrantyDb.delete(id);
    }
    if (getActiveCloudBackend() === 'supabase') {
      return await supabaseWarrantyDb.delete(id);
    }
    return await firestoreWarrantyDb.delete(id);
  },

  async deleteByProductId(productId: string): Promise<void> {
    if (!useCloudDatabaseSync()) {
      return await dexieWarrantyDb.deleteByProductId(productId);
    }
    if (getActiveCloudBackend() === 'supabase') {
      return await supabaseWarrantyDb.deleteByProductId(productId);
    }
    return await firestoreWarrantyDb.deleteByProductId(productId);
  },
};

/** @deprecated Use useCloudDatabaseSync from ./cloudEnv */
export function useFirestoreCloudSync(): boolean {
  return useCloudDatabaseSync() && useFirebaseCloudSync();
}
