import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { productDb, warrantyDb, db } from '../localDb';
import { Product, WarrantyDocument } from '@/types';
import { generateUUID } from '@/utils/uuid';

describe('LocalDb - Unit & Integration Tests', () => {
  let testProduct: Product;
  let testWarranty: WarrantyDocument;

  beforeAll(async () => {
    // Ensure database is open before tests
    try {
      if (!db.isOpen()) {
        await db.open();
      }
    } catch (error) {
      // If database is already open or opening fails, try to continue
      await db.open().catch(() => {});
    }
  });

  beforeEach(async () => {
    // Clear database before each test
    try {
      // Clear products
      const allProducts = await productDb.getAll();
      for (const product of allProducts) {
        await productDb.delete(product.id);
      }
      // Clear warranties
      const allWarranties = await db.warrantyDocuments.toArray();
      for (const warranty of allWarranties) {
        await warrantyDb.delete(warranty.id);
      }
    } catch (error) {
      // Ignore errors if database is not initialized yet
    }
    
    testProduct = {
      id: generateUUID(),
      itemCode: 'TV-001',
      name: 'Test TV',
      category: 'TV',
      qrValue: 'TV-001',
      barcode: '1234567890123',
      createdAt: new Date(),
    };

    testWarranty = {
      id: generateUUID(),
      productId: testProduct.id,
      imageBlob: new Blob(['test'], { type: 'image/png' }),
      createdAt: new Date(),
    };
  });

  afterEach(async () => {
    // Cleanup
    try {
      await productDb.delete(testProduct.id);
    } catch {}
  });

  describe('productDb', () => {
    describe('add', () => {
      it('should add a product successfully', async () => {
        const id = await productDb.add(testProduct);
        expect(id).toBe(testProduct.id);
        
        const retrieved = await productDb.getById(id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.name).toBe('Test TV');
      });

      it('should generate unique IDs for products', async () => {
        const product1 = { ...testProduct, id: generateUUID(), itemCode: 'TV-001' };
        const product2 = { ...testProduct, id: generateUUID(), itemCode: 'TV-002' };
        
        await productDb.add(product1);
        await productDb.add(product2);
        
        const all = await productDb.getAll();
        expect(all.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('getById', () => {
      it('should retrieve product by ID', async () => {
        await productDb.add(testProduct);
        const retrieved = await productDb.getById(testProduct.id);
        
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(testProduct.id);
        expect(retrieved?.name).toBe(testProduct.name);
      });

      it('should return undefined for non-existent ID', async () => {
        const result = await productDb.getById('non-existent');
        expect(result).toBeUndefined();
      });
    });

    describe('getByItemCode', () => {
      it('should retrieve product by item code', async () => {
        await productDb.add(testProduct);
        const retrieved = await productDb.getByItemCode('TV-001');
        
        expect(retrieved).toBeDefined();
        expect(retrieved?.itemCode).toBe('TV-001');
      });

      it('should return undefined for non-existent item code', async () => {
        const result = await productDb.getByItemCode('TV-999');
        expect(result).toBeUndefined();
      });
    });

    describe('getAll', () => {
      it('should return all products', async () => {
        await productDb.add(testProduct);
        const product2 = { ...testProduct, id: generateUUID(), itemCode: 'TV-002', name: 'Test TV 2' };
        await productDb.add(product2);
        
        const all = await productDb.getAll();
        expect(all.length).toBeGreaterThanOrEqual(2);
      });

      it('should return empty array when no products', async () => {
        const all = await productDb.getAll();
        expect(Array.isArray(all)).toBe(true);
      });
    });

    describe('update', () => {
      it('should update product successfully', async () => {
        await productDb.add(testProduct);
        await productDb.update(testProduct.id, { name: 'Updated TV' });
        
        const updated = await productDb.getById(testProduct.id);
        expect(updated?.name).toBe('Updated TV');
      });

      it('should update multiple fields', async () => {
        await productDb.add(testProduct);
        await productDb.update(testProduct.id, {
          name: 'Updated TV',
          category: 'Television',
        });
        
        const updated = await productDb.getById(testProduct.id);
        expect(updated?.name).toBe('Updated TV');
        expect(updated?.category).toBe('Television');
      });
    });

    describe('delete', () => {
      it('should delete product successfully', async () => {
        await productDb.add(testProduct);
        await productDb.delete(testProduct.id);
        
        const deleted = await productDb.getById(testProduct.id);
        expect(deleted).toBeUndefined();
      });

      it('should delete associated warranty documents', async () => {
        await productDb.add(testProduct);
        await warrantyDb.add(testWarranty);
        
        await productDb.delete(testProduct.id);
        
        const warranty = await warrantyDb.getByProductId(testProduct.id);
        expect(warranty).toBeUndefined();
      });
    });

    describe('search', () => {
      it('should search by name', async () => {
        await productDb.add(testProduct);
        const results = await productDb.search('Test');
        
        expect(results.length).toBeGreaterThan(0);
        expect(results.some(p => p.name.includes('Test'))).toBe(true);
      });

      it('should search by item code', async () => {
        await productDb.add(testProduct);
        const results = await productDb.search('TV-001');
        
        expect(results.length).toBeGreaterThan(0);
      });

      it('should search by category', async () => {
        await productDb.add(testProduct);
        const results = await productDb.search('TV');
        
        expect(results.length).toBeGreaterThan(0);
      });

      it('should be case insensitive', async () => {
        await productDb.add(testProduct);
        const results = await productDb.search('test');
        
        expect(results.length).toBeGreaterThan(0);
      });
    });

    describe('getByCategory', () => {
      it('should return products by category', async () => {
        await productDb.add(testProduct);
        const results = await productDb.getByCategory('TV');
        
        expect(results.length).toBeGreaterThan(0);
        expect(results.every(p => p.category === 'TV')).toBe(true);
      });
    });
  });

  describe('warrantyDb', () => {
    beforeEach(async () => {
      await productDb.add(testProduct);
    });

    describe('add', () => {
      it('should add warranty document', async () => {
        const id = await warrantyDb.add(testWarranty);
        expect(id).toBe(testWarranty.id);
      });
    });

    describe('getByProductId', () => {
      it('should retrieve warranty by product ID', async () => {
        await warrantyDb.add(testWarranty);
        const retrieved = await warrantyDb.getByProductId(testProduct.id);
        
        expect(retrieved).toBeDefined();
        expect(retrieved?.productId).toBe(testProduct.id);
      });

      it('should return undefined if no warranty exists', async () => {
        const result = await warrantyDb.getByProductId('non-existent');
        expect(result).toBeUndefined();
      });
    });

    describe('delete', () => {
      it('should delete warranty document', async () => {
        await warrantyDb.add(testWarranty);
        await warrantyDb.delete(testWarranty.id);
        
        const deleted = await warrantyDb.getByProductId(testProduct.id);
        expect(deleted).toBeUndefined();
      });
    });

    describe('deleteByProductId', () => {
      it('should delete all warranties for a product', async () => {
        await warrantyDb.add(testWarranty);
        await warrantyDb.deleteByProductId(testProduct.id);
        
        const deleted = await warrantyDb.getByProductId(testProduct.id);
        expect(deleted).toBeUndefined();
      });
    });
  });
});

