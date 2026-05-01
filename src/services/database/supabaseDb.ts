import { getSupabaseBrowserClient } from './supabaseClient';
import type { Product, WarrantyDocument } from '@/types';

function sessionLoginKey(): string {
  const raw = localStorage.getItem('currentUser');
  if (!raw) throw new Error('User not authenticated');
  try {
    const u = JSON.parse(raw) as { mobile?: string };
    if (!u?.mobile) throw new Error('User not authenticated');
    return u.mobile;
  } catch {
    throw new Error('User not authenticated');
  }
}

async function requireUid(): Promise<string> {
  const sb = getSupabaseBrowserClient();
  const {
    data: { user },
    error,
  } = await sb.auth.getUser();
  if (error || !user?.id) throw new Error('User not authenticated');
  return user.id;
}

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === 'string') return new Date(v);
  return undefined;
}

function mapProductRow(row: Record<string, unknown>): Product {
  const pp = row.purchase_price;
  return {
    id: (row.id as string) || '',
    itemCode: (row.item_code as string) || '',
    name: (row.name as string) || '',
    category: (row.category as string) || '',
    barcode: (row.barcode as string) || undefined,
    qrValue: (row.qr_value as string) || '',
    location: (row.location as string) || undefined,
    notes: (row.notes as string) || undefined,
    purchasePrice: typeof pp === 'number' && !Number.isNaN(pp) ? pp : undefined,
    currency: typeof row.currency === 'string' ? row.currency : undefined,
    warrantyStart: toDate(row.warranty_start),
    warrantyEnd: toDate(row.warranty_end),
    warrantyDuration: row.warranty_duration as number | undefined,
    createdAt: toDate(row.created_at) || new Date(),
    updatedAt: toDate(row.updated_at),
  };
}

function canAccessProduct(row: Record<string, unknown>, mobile: string, uid: string): boolean {
  return row.owner_uid === uid || row.user_mobile === mobile;
}

async function imageDataToBlob(imageData: string): Promise<Blob> {
  if (imageData.startsWith('data:')) {
    const base64Match = imageData.match(/^data:image\/\w+;base64,(.+)$/);
    if (base64Match?.[1]) {
      const binaryString = atob(base64Match[1]);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const mimeMatch = imageData.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      return new Blob([bytes], { type: mimeType });
    }
    const response = await fetch(imageData);
    return response.blob();
  }
  const binaryString = atob(imageData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

const BUCKET = 'warranties';

export const supabaseDb = {
  async getAllProducts(): Promise<Product[]> {
    const mobile = sessionLoginKey();
    const uid = await requireUid();
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from('products')
      .select('*')
      .or(`owner_uid.eq.${uid},user_mobile.eq.${mobile}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const map = new Map<string, Product>();
    for (const row of data ?? []) {
      map.set(row.id as string, mapProductRow(row as Record<string, unknown>));
    }
    return [...map.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getProductById(id: string): Promise<Product | undefined> {
    const mobile = sessionLoginKey();
    const uid = await requireUid();
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from('products').select('*').eq('id', id).maybeSingle();
    if (error || !data) return undefined;
    const row = data as Record<string, unknown>;
    if (!canAccessProduct(row, mobile, uid)) return undefined;
    return mapProductRow(row);
  },

  async getProductByItemCode(itemCode: string): Promise<Product | undefined> {
    const mobile = sessionLoginKey();
    const uid = await requireUid();
    const sb = getSupabaseBrowserClient();
    const trimmed = itemCode.trim();
    for (const [col, val] of [
      ['user_mobile', mobile],
      ['owner_uid', uid],
    ] as const) {
      const { data } = await sb.from('products').select('*').eq(col, val).eq('item_code', trimmed).limit(1).maybeSingle();
      if (data) return mapProductRow(data as Record<string, unknown>);
    }
    const all = await this.getAllProducts();
    const lower = trimmed.toLowerCase();
    return all.find((p) => p.itemCode.toLowerCase() === lower);
  },

  async addProduct(product: Product): Promise<string> {
    const mobile = sessionLoginKey();
    const uid = await requireUid();
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from('products').insert({
      id: product.id,
      owner_uid: uid,
      user_mobile: mobile,
      item_code: product.itemCode,
      name: product.name,
      category: product.category,
      barcode: product.barcode ?? null,
      qr_value: product.qrValue,
      warranty_start: product.warrantyStart?.toISOString() ?? null,
      warranty_end: product.warrantyEnd?.toISOString() ?? null,
      warranty_duration: product.warrantyDuration ?? null,
      location: product.location ?? null,
      notes: product.notes ?? null,
      purchase_price: product.purchasePrice ?? null,
      currency: product.currency ?? null,
      created_at: product.createdAt.toISOString(),
      updated_at: (product.updatedAt ?? product.createdAt).toISOString(),
    });
    if (error) throw error;
    return product.id;
  },

  async updateProduct(id: string, changes: Partial<Product>): Promise<number> {
    const mobile = sessionLoginKey();
    const uid = await requireUid();
    const sb = getSupabaseBrowserClient();
    const { data: existing, error: readErr } = await sb.from('products').select('*').eq('id', id).maybeSingle();
    if (readErr || !existing) return 0;
    const prev = existing as Record<string, unknown>;
    if (!canAccessProduct(prev, mobile, uid)) return 0;

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (changes.itemCode !== undefined) payload.item_code = changes.itemCode;
    if (changes.name !== undefined) payload.name = changes.name;
    if (changes.category !== undefined) payload.category = changes.category;
    if (changes.barcode !== undefined) payload.barcode = changes.barcode ?? null;
    if (changes.qrValue !== undefined) payload.qr_value = changes.qrValue;
    if (changes.warrantyStart !== undefined) {
      payload.warranty_start = changes.warrantyStart ? changes.warrantyStart.toISOString() : null;
    }
    if (changes.warrantyEnd !== undefined) {
      payload.warranty_end = changes.warrantyEnd ? changes.warrantyEnd.toISOString() : null;
    }
    if (changes.warrantyDuration !== undefined) payload.warranty_duration = changes.warrantyDuration ?? null;
    if (changes.location !== undefined) payload.location = changes.location ?? null;
    if (changes.notes !== undefined) payload.notes = changes.notes ?? null;
    if (changes.purchasePrice !== undefined) payload.purchase_price = changes.purchasePrice ?? null;
    if (changes.currency !== undefined) payload.currency = changes.currency ?? null;
    if (!prev.owner_uid) payload.owner_uid = uid;

    const { error } = await sb.from('products').update(payload).eq('id', id);
    if (error) throw error;
    return 1;
  },

  async deleteProduct(id: string): Promise<void> {
    const mobile = sessionLoginKey();
    const uid = await requireUid();
    const sb = getSupabaseBrowserClient();
    const { data: existing, error: readErr } = await sb.from('products').select('*').eq('id', id).maybeSingle();
    if (readErr || !existing) return;
    const pdata = existing as Record<string, unknown>;
    if (!canAccessProduct(pdata, mobile, uid)) return;

    const { data: wRows } = await sb
      .from('warranty_documents')
      .select('id, storage_path')
      .eq('product_id', id)
      .or(`user_mobile.eq.${mobile},owner_uid.eq.${uid}`);
    const seen = new Set<string>();
    for (const w of wRows ?? []) {
      const wid = w.id as string;
      if (seen.has(wid)) continue;
      seen.add(wid);
      const path = w.storage_path as string | undefined;
      if (path) {
        await sb.storage.from(BUCKET).remove([path]).catch(() => {});
      }
      await sb.from('warranty_documents').delete().eq('id', wid);
    }
    await sb.from('products').delete().eq('id', id);
  },

  async searchProducts(search: string): Promise<Product[]> {
    const q = search.trim().toLowerCase();
    if (!q) return this.getAllProducts();
    const all = await this.getAllProducts();
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.itemCode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q)
    );
  },

  async getByCategory(category: string): Promise<Product[]> {
    const mobile = sessionLoginKey();
    const uid = await requireUid();
    const sb = getSupabaseBrowserClient();
    const merged = new Map<string, Product>();
    for (const [col, val] of [
      ['user_mobile', mobile],
      ['owner_uid', uid],
    ] as const) {
      const { data } = await sb.from('products').select('*').eq(col, val).eq('category', category);
      for (const row of data ?? []) {
        merged.set(row.id as string, mapProductRow(row as Record<string, unknown>));
      }
    }
    return [...merged.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getByProductId(productId: string): Promise<WarrantyDocument | undefined> {
    let mobile: string;
    let uid: string;
    try {
      mobile = sessionLoginKey();
      uid = await requireUid();
    } catch {
      return undefined;
    }
    const sb = getSupabaseBrowserClient();
    try {
      const { data: rows } = await sb
        .from('warranty_documents')
        .select('*')
        .eq('product_id', productId)
        .or(`user_mobile.eq.${mobile},owner_uid.eq.${uid}`)
        .limit(1);
      const row = rows?.[0] as Record<string, unknown> | undefined;
      if (!row) return undefined;

      const storagePath = row.storage_path as string | undefined;
      const downloadURL = row.download_url as string | undefined;
      const imageData = row.image_data as string | undefined;

      let blob: Blob;
      if (downloadURL) {
        const res = await fetch(downloadURL);
        blob = await res.blob();
      } else if (storagePath) {
        const { data: signed, error } = await sb.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
        if (error || !signed?.signedUrl) return undefined;
        const res = await fetch(signed.signedUrl);
        blob = await res.blob();
      } else if (imageData) {
        blob = await imageDataToBlob(imageData);
      } else {
        return undefined;
      }

      return {
        id: row.id as string,
        productId: (row.product_id as string) || productId,
        imageBlob: blob,
        extractedText: row.extracted_text as string | undefined,
        createdAt: toDate(row.created_at) || new Date(),
      };
    } catch (e) {
      console.error('Supabase warranty read error:', e);
      return undefined;
    }
  },

  async add(document: WarrantyDocument): Promise<string> {
    const mobile = sessionLoginKey();
    const uid = await requireUid();
    const sb = getSupabaseBrowserClient();
    const objectPath = `${uid}/${document.productId}/${document.id}`;
    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(objectPath, document.imageBlob, {
        contentType: document.imageBlob.type || 'image/jpeg',
        upsert: true,
      });
    if (upErr) throw upErr;

    const { error } = await sb.from('warranty_documents').insert({
      id: document.id,
      owner_uid: uid,
      user_mobile: mobile,
      product_id: document.productId,
      storage_path: objectPath,
      download_url: null,
      image_data: null,
      extracted_text: document.extractedText ?? null,
      created_at: document.createdAt.toISOString(),
    });
    if (error) throw error;
    return document.id;
  },

  async delete(id: string): Promise<void> {
    const mobile = sessionLoginKey();
    const uid = await requireUid();
    const sb = getSupabaseBrowserClient();
    const { data: row, error: readErr } = await sb.from('warranty_documents').select('*').eq('id', id).maybeSingle();
    if (readErr || !row) return;
    const data = row as Record<string, unknown>;
    if (!canAccessProduct(data, mobile, uid)) return;
    const path = data.storage_path as string | undefined;
    if (path) {
      await sb.storage.from(BUCKET).remove([path]).catch(() => {});
    }
    await sb.from('warranty_documents').delete().eq('id', id);
  },

  async deleteByProductId(productId: string): Promise<void> {
    const mobile = sessionLoginKey();
    const uid = await requireUid();
    const sb = getSupabaseBrowserClient();
    const { data: rows } = await sb
      .from('warranty_documents')
      .select('id')
      .eq('product_id', productId)
      .or(`user_mobile.eq.${mobile},owner_uid.eq.${uid}`);
    const seen = new Set<string>();
    for (const w of rows ?? []) {
      const wid = w.id as string;
      if (seen.has(wid)) continue;
      seen.add(wid);
      await this.delete(wid);
    }
  },
};

export const supabaseProductDb = {
  getAll: () => supabaseDb.getAllProducts(),
  getById: (id: string) => supabaseDb.getProductById(id),
  getByItemCode: (code: string) => supabaseDb.getProductByItemCode(code),
  add: (product: Product) => supabaseDb.addProduct(product),
  update: (id: string, changes: Partial<Product>) => supabaseDb.updateProduct(id, changes),
  delete: (id: string) => supabaseDb.deleteProduct(id),
  search: (q: string) => supabaseDb.searchProducts(q),
  getByCategory: (category: string) => supabaseDb.getByCategory(category),
};

export const supabaseWarrantyDb = {
  getByProductId: (productId: string) => supabaseDb.getByProductId(productId),
  add: (document: WarrantyDocument) => supabaseDb.add(document),
  delete: (id: string) => supabaseDb.delete(id),
  deleteByProductId: (productId: string) => supabaseDb.deleteByProductId(productId),
};
