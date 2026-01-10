import { supabase } from './supabase';
import { Product, WarrantyDocument } from '@/types';
import { simpleAuth } from '../auth/simpleAuth';

export const supabaseDb = {
  // Products
  async getAllProducts(): Promise<Product[]> {
    const user = simpleAuth.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_mobile', user.mobile) // Filter by user's mobile
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map((row: any) => ({
      id: row.id,
      itemCode: row.item_code,
      name: row.name,
      category: row.category,
      barcode: row.barcode,
      qrValue: row.qr_value,
      warrantyStart: row.warranty_start ? new Date(row.warranty_start) : undefined,
      warrantyEnd: row.warranty_end ? new Date(row.warranty_end) : undefined,
      warrantyDuration: row.warranty_duration,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    }));
  },

  async getProductById(id: string): Promise<Product | undefined> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }

    return {
      id: data.id,
      itemCode: data.item_code,
      name: data.name,
      category: data.category,
      barcode: data.barcode,
      qrValue: data.qr_value,
      warrantyStart: data.warranty_start ? new Date(data.warranty_start) : undefined,
      warrantyEnd: data.warranty_end ? new Date(data.warranty_end) : undefined,
      warrantyDuration: data.warranty_duration,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    };
  },

  async getProductByItemCode(itemCode: string): Promise<Product | undefined> {
    const user = simpleAuth.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Try exact match first (case-sensitive)
    let { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('item_code', itemCode.trim())
      .eq('user_mobile', user.mobile) // Ensure user owns this product
      .maybeSingle();

    // If not found, try case-insensitive search
    if (error || !data) {
      const { data: caseInsensitiveData, error: caseError } = await supabase
        .from('products')
        .select('*')
        .eq('user_mobile', user.mobile)
        .ilike('item_code', itemCode.trim())
        .maybeSingle();
      
      if (caseError && caseError.code !== 'PGRST116') {
        throw caseError;
      }
      
      if (caseInsensitiveData) {
        data = caseInsensitiveData;
        error = null;
      }
    }

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    
    if (!data) return undefined;

    return {
      id: data.id,
      itemCode: data.item_code,
      name: data.name,
      category: data.category,
      barcode: data.barcode,
      qrValue: data.qr_value,
      warrantyStart: data.warranty_start ? new Date(data.warranty_start) : undefined,
      warrantyEnd: data.warranty_end ? new Date(data.warranty_end) : undefined,
      warrantyDuration: data.warranty_duration,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    };
  },

  async addProduct(product: Product): Promise<string> {
    const user = simpleAuth.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('products')
      .insert({
        id: product.id,
        item_code: product.itemCode,
        name: product.name,
        category: product.category,
        barcode: product.barcode,
        qr_value: product.qrValue,
        warranty_start: product.warrantyStart?.toISOString(),
        warranty_end: product.warrantyEnd?.toISOString(),
        warranty_duration: product.warrantyDuration,
        user_mobile: user.mobile, // User isolation by mobile
        created_at: product.createdAt.toISOString(),
        updated_at: product.updatedAt?.toISOString() || product.createdAt.toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  async updateProduct(id: string, changes: Partial<Product>): Promise<number> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (changes.itemCode !== undefined) updateData.item_code = changes.itemCode;
    if (changes.name !== undefined) updateData.name = changes.name;
    if (changes.category !== undefined) updateData.category = changes.category;
    if (changes.barcode !== undefined) updateData.barcode = changes.barcode;
    if (changes.qrValue !== undefined) updateData.qr_value = changes.qrValue;
    if (changes.warrantyStart !== undefined) updateData.warranty_start = changes.warrantyStart?.toISOString();
    if (changes.warrantyEnd !== undefined) updateData.warranty_end = changes.warrantyEnd?.toISOString();
    if (changes.warrantyDuration !== undefined) updateData.warranty_duration = changes.warrantyDuration;

    const { error, count } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select('id', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Also delete warranty documents
    await supabase
      .from('warranty_documents')
      .delete()
      .eq('product_id', id);
  },

  async searchProducts(query: string): Promise<Product[]> {
    const user = simpleAuth.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_mobile', user.mobile) // Filter by user's mobile
      .or(`name.ilike.%${query}%,item_code.ilike.%${query}%,category.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map((row: any) => ({
      id: row.id,
      itemCode: row.item_code,
      name: row.name,
      category: row.category,
      barcode: row.barcode,
      qrValue: row.qr_value,
      warrantyStart: row.warranty_start ? new Date(row.warranty_start) : undefined,
      warrantyEnd: row.warranty_end ? new Date(row.warranty_end) : undefined,
      warrantyDuration: row.warranty_duration,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    }));
  },

  async getByCategory(category: string): Promise<Product[]> {
    const user = simpleAuth.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_mobile', user.mobile) // Filter by user's mobile
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map((row: any) => ({
      id: row.id,
      itemCode: row.item_code,
      name: row.name,
      category: row.category,
      barcode: row.barcode,
      qrValue: row.qr_value,
      warrantyStart: row.warranty_start ? new Date(row.warranty_start) : undefined,
      warrantyEnd: row.warranty_end ? new Date(row.warranty_end) : undefined,
      warrantyDuration: row.warranty_duration,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    }));
  },

  // Warranty Documents
  async getByProductId(productId: string): Promise<WarrantyDocument | undefined> {
    const user = simpleAuth.getCurrentUser();
    if (!user) {
      console.error('User not authenticated when trying to get warranty document');
      return undefined; // Return undefined instead of throwing for better UX
    }

    try {
      const { data, error } = await supabase
        .from('warranty_documents')
        .select('*')
        .eq('product_id', productId)
        .eq('user_mobile', user.mobile) // Ensure user owns this warranty
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - this is normal, return undefined
          return undefined;
        }
        console.error('Supabase error getting warranty document:', error);
        throw error;
      }

      if (!data || !data.image_data) {
        console.warn('Warranty document found but has no image data');
        return undefined;
      }
      
      // Convert base64 data URL back to Blob
      let blob: Blob;
      try {
        if (typeof data.image_data !== 'string') {
          console.error('Image data is not a string:', typeof data.image_data);
          throw new Error('Invalid image data format');
        }

        if (data.image_data.startsWith('data:')) {
          // Already a data URL - extract base64 part and convert
          const base64Match = data.image_data.match(/^data:image\/\w+;base64,(.+)$/);
          if (base64Match && base64Match[1]) {
            // Convert base64 string to binary
            const binaryString = atob(base64Match[1]);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            // Determine MIME type from data URL
            const mimeMatch = data.image_data.match(/^data:(image\/\w+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
            blob = new Blob([bytes], { type: mimeType });
          } else {
            // Fallback: try fetch (may fail for large images)
            const response = await fetch(data.image_data);
            blob = await response.blob();
          }
        } else {
          // Assume it's raw base64, convert to blob
          try {
            const binaryString = atob(data.image_data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            blob = new Blob([bytes], { type: 'image/png' });
          } catch (base64Error) {
            // Fallback: try with data URL prefix
            const base64Response = await fetch(`data:image/png;base64,${data.image_data}`);
            blob = await base64Response.blob();
          }
        }
      } catch (blobError) {
        console.error('Error converting warranty image data to blob:', blobError);
        throw new Error('Failed to process warranty image data');
      }

      return {
        id: data.id,
        productId: data.product_id,
        imageBlob: blob,
        extractedText: data.extracted_text,
        createdAt: new Date(data.created_at),
      };
    } catch (err: any) {
      console.error('Error in getByProductId:', err);
      // Return undefined instead of throwing to allow the page to still show product info
      return undefined;
    }
  },

  async add(document: WarrantyDocument): Promise<string> {
    const user = simpleAuth.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Convert Blob to base64 data URL
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(document.imageBlob);
    });

    const { data, error } = await supabase
      .from('warranty_documents')
      .insert({
        id: document.id,
        product_id: document.productId,
        image_data: base64,
        extracted_text: document.extractedText,
        user_mobile: user.mobile, // User isolation by mobile
        created_at: document.createdAt.toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('warranty_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async deleteByProductId(productId: string): Promise<void> {
    const { error } = await supabase
      .from('warranty_documents')
      .delete()
      .eq('product_id', productId);

    if (error) throw error;
  },
};

