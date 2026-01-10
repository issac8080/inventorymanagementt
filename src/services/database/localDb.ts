import Dexie, { Table } from 'dexie';
import { Product, WarrantyDocument } from '@/types';

class HomeInventoryDB extends Dexie {
  products!: Table<Product>;
  warrantyDocuments!: Table<WarrantyDocument>;

  constructor() {
    super('HomeInventoryDB');
    
    // Version 1: Initial schema
    this.version(1).stores({
      products: 'id, itemCode, name, category, qrValue, warrantyEnd',
      warrantyDocuments: 'id, productId, createdAt'
    });
    
    // Version 2: Add indexes for better performance and add updatedAt
    this.version(2).stores({
      products: 'id, itemCode, name, category, qrValue, warrantyEnd, createdAt, updatedAt, barcode',
      warrantyDocuments: 'id, productId, createdAt'
    }).upgrade(async (tx) => {
      // Migration: Add updatedAt to existing products
      const products = await tx.table('products').toArray();
      await Promise.all(
        products.map(product =>
          tx.table('products').update(product.id, {
            updatedAt: product.createdAt || new Date()
          })
        )
      );
    });
  }
}

export const db = new HomeInventoryDB();

// Helper functions for common operations
export const productDb = {
  async getAll(): Promise<Product[]> {
    return await db.products.toArray();
  },

  async getById(id: string): Promise<Product | undefined> {
    return await db.products.get(id);
  },

  async getByItemCode(itemCode: string): Promise<Product | undefined> {
    return await db.products.where('itemCode').equals(itemCode).first();
  },

  async add(product: Product): Promise<string> {
    return await db.products.add(product);
  },

  async update(id: string, changes: Partial<Product>): Promise<number> {
    return await db.products.update(id, changes);
  },

  async delete(id: string): Promise<void> {
    await db.products.delete(id);
    // Also delete associated warranty documents
    await db.warrantyDocuments.where('productId').equals(id).delete();
  },

  async search(query: string): Promise<Product[]> {
    const lowerQuery = query.toLowerCase();
    return await db.products
      .filter(p => 
        p.name.toLowerCase().includes(lowerQuery) ||
        p.itemCode.toLowerCase().includes(lowerQuery) ||
        p.category.toLowerCase().includes(lowerQuery)
      )
      .toArray();
  },

  async getByCategory(category: string): Promise<Product[]> {
    return await db.products.where('category').equals(category).toArray();
  }
};

export const warrantyDb = {
  async getByProductId(productId: string): Promise<WarrantyDocument | undefined> {
    return await db.warrantyDocuments.where('productId').equals(productId).first();
  },

  async add(document: WarrantyDocument): Promise<string> {
    return await db.warrantyDocuments.add(document);
  },

  async delete(id: string): Promise<void> {
    await db.warrantyDocuments.delete(id);
  },

  async deleteByProductId(productId: string): Promise<void> {
    await db.warrantyDocuments.where('productId').equals(productId).delete();
  }
};

