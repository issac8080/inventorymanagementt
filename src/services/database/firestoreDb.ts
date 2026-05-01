import { getAuth } from 'firebase/auth';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { Timestamp as TimestampType } from 'firebase/firestore';
import { getFirebaseApp, getFirestoreDb, getFirebaseStorage } from './firebase';
import { Product, WarrantyDocument } from '@/types';

const PRODUCTS = 'products';
const WARRANTIES = 'warranty_documents';
const BATCH_SIZE = 150;

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

function requireUid(): string {
  const uid = getAuth(getFirebaseApp()).currentUser?.uid;
  if (!uid) throw new Error('User not authenticated');
  return uid;
}

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === 'object' && v !== null && 'toDate' in v) {
    return (v as TimestampType).toDate();
  }
  if (typeof v === 'string') return new Date(v);
  return undefined;
}

function mapProductDoc(docId: string, data: Record<string, unknown>): Product {
  const pp = data.purchasePrice;
  return {
    id: docId,
    itemCode: (data.itemCode as string) || '',
    name: (data.name as string) || '',
    category: (data.category as string) || '',
    barcode: (data.barcode as string) || undefined,
    qrValue: (data.qrValue as string) || '',
    location: (data.location as string) || undefined,
    notes: (data.notes as string) || undefined,
    purchasePrice: typeof pp === 'number' && !Number.isNaN(pp) ? pp : undefined,
    currency: typeof data.currency === 'string' ? data.currency : undefined,
    warrantyStart: toDate(data.warrantyStart),
    warrantyEnd: toDate(data.warrantyEnd),
    warrantyDuration: data.warrantyDuration as number | undefined,
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt),
  };
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

async function pumpProducts(
  field: 'ownerUid' | 'userMobile',
  value: string,
  into: Map<string, Product>
): Promise<void> {
  const db = getFirestoreDb();
  let last: QueryDocumentSnapshot | undefined;
  for (;;) {
    const constraints: QueryConstraint[] = [
      where(field, '==', value),
      orderBy('createdAt', 'desc'),
      limit(BATCH_SIZE),
    ];
    if (last) constraints.push(startAfter(last));
    const snap = await getDocs(query(collection(db, PRODUCTS), ...constraints));
    if (snap.empty) break;
    for (const d of snap.docs) {
      into.set(d.id, mapProductDoc(d.id, d.data() as Record<string, unknown>));
    }
    const tail = snap.docs[snap.docs.length - 1];
    if (!tail || snap.size < BATCH_SIZE) break;
    last = tail;
  }
}

function canAccessProduct(data: Record<string, unknown>, mobile: string, uid: string): boolean {
  return data.ownerUid === uid || data.userMobile === mobile;
}

export const firestoreDb = {
  async getAllProducts(): Promise<Product[]> {
    const mobile = sessionLoginKey();
    const uid = requireUid();
    const merged = new Map<string, Product>();
    await pumpProducts('ownerUid', uid, merged);
    await pumpProducts('userMobile', mobile, merged);
    return [...merged.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getProductById(id: string): Promise<Product | undefined> {
    const mobile = sessionLoginKey();
    const uid = requireUid();
    const db = getFirestoreDb();
    const pref = doc(db, PRODUCTS, id);
    const d = await getDoc(pref);
    if (!d.exists()) return undefined;
    const data = d.data() as Record<string, unknown>;
    if (!canAccessProduct(data, mobile, uid)) return undefined;
    return mapProductDoc(d.id, data);
  },

  async getProductByItemCode(itemCode: string): Promise<Product | undefined> {
    const mobile = sessionLoginKey();
    const uid = requireUid();
    const db = getFirestoreDb();
    const trimmed = itemCode.trim();
    for (const [field, val] of [
      ['userMobile', mobile],
      ['ownerUid', uid],
    ] as const) {
      const snap = await getDocs(
        query(collection(db, PRODUCTS), where(field, '==', val), where('itemCode', '==', trimmed), limit(1))
      );
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        return mapProductDoc(docSnap.id, docSnap.data() as Record<string, unknown>);
      }
    }
    const lower = trimmed.toLowerCase();
    const all = await this.getAllProducts();
    return all.find((p) => p.itemCode.toLowerCase() === lower);
  },

  async addProduct(product: Product): Promise<string> {
    const mobile = sessionLoginKey();
    const uid = requireUid();
    const db = getFirestoreDb();
    const refDoc = doc(db, PRODUCTS, product.id);
    await setDoc(refDoc, {
      ownerUid: uid,
      userMobile: mobile,
      itemCode: product.itemCode,
      name: product.name,
      category: product.category,
      barcode: product.barcode ?? null,
      qrValue: product.qrValue,
      warrantyStart: product.warrantyStart ? Timestamp.fromDate(product.warrantyStart) : null,
      warrantyEnd: product.warrantyEnd ? Timestamp.fromDate(product.warrantyEnd) : null,
      warrantyDuration: product.warrantyDuration ?? null,
      location: product.location ?? null,
      notes: product.notes ?? null,
      purchasePrice: product.purchasePrice ?? null,
      currency: product.currency ?? null,
      createdAt: Timestamp.fromDate(product.createdAt),
      updatedAt: Timestamp.fromDate(product.updatedAt ?? product.createdAt),
    });
    return product.id;
  },

  async updateProduct(id: string, changes: Partial<Product>): Promise<number> {
    const mobile = sessionLoginKey();
    const uid = requireUid();
    const db = getFirestoreDb();
    const pref = doc(db, PRODUCTS, id);
    const existing = await getDoc(pref);
    if (!existing.exists()) return 0;
    const prev = existing.data() as Record<string, unknown>;
    if (!canAccessProduct(prev, mobile, uid)) return 0;
    const payload: Record<string, unknown> = {
      updatedAt: Timestamp.fromDate(new Date()),
    };
    if (changes.itemCode !== undefined) payload.itemCode = changes.itemCode;
    if (changes.name !== undefined) payload.name = changes.name;
    if (changes.category !== undefined) payload.category = changes.category;
    if (changes.barcode !== undefined) payload.barcode = changes.barcode ?? null;
    if (changes.qrValue !== undefined) payload.qrValue = changes.qrValue;
    if (changes.warrantyStart !== undefined) {
      payload.warrantyStart = changes.warrantyStart ? Timestamp.fromDate(changes.warrantyStart) : null;
    }
    if (changes.warrantyEnd !== undefined) {
      payload.warrantyEnd = changes.warrantyEnd ? Timestamp.fromDate(changes.warrantyEnd) : null;
    }
    if (changes.warrantyDuration !== undefined) payload.warrantyDuration = changes.warrantyDuration ?? null;
    if (changes.location !== undefined) payload.location = changes.location ?? null;
    if (changes.notes !== undefined) payload.notes = changes.notes ?? null;
    if (changes.purchasePrice !== undefined) payload.purchasePrice = changes.purchasePrice ?? null;
    if (changes.currency !== undefined) payload.currency = changes.currency ?? null;

    if (!prev.ownerUid) {
      payload.ownerUid = uid;
    }

    await updateDoc(pref, payload);
    return 1;
  },

  async deleteProduct(id: string): Promise<void> {
    const mobile = sessionLoginKey();
    const uid = requireUid();
    const db = getFirestoreDb();
    const pref = doc(db, PRODUCTS, id);
    const existing = await getDoc(pref);
    if (!existing.exists()) return;
    const pdata = existing.data() as Record<string, unknown>;
    if (!canAccessProduct(pdata, mobile, uid)) return;

    const wSnap = await getDocs(
      query(collection(db, WARRANTIES), where('productId', '==', id), where('userMobile', '==', mobile))
    );
    const wSnap2 = await getDocs(
      query(collection(db, WARRANTIES), where('productId', '==', id), where('ownerUid', '==', uid))
    );
    const seen = new Set<string>();
    for (const w of [...wSnap.docs, ...wSnap2.docs]) {
      if (seen.has(w.id)) continue;
      seen.add(w.id);
      const wd = w.data() as { storagePath?: string };
      if (wd.storagePath) {
        try {
          await deleteObject(ref(getFirebaseStorage(), wd.storagePath));
        } catch {
          /* ignore missing file */
        }
      }
      await deleteDoc(w.ref);
    }
    await deleteDoc(pref);
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
    const uid = requireUid();
    const db = getFirestoreDb();
    const merged = new Map<string, Product>();
    for (const [field, val] of [
      ['userMobile', mobile],
      ['ownerUid', uid],
    ] as const) {
      const snap = await getDocs(
        query(collection(db, PRODUCTS), where(field, '==', val), where('category', '==', category))
      );
      for (const d of snap.docs) {
        merged.set(d.id, mapProductDoc(d.id, d.data() as Record<string, unknown>));
      }
    }
    return [...merged.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getByProductId(productId: string): Promise<WarrantyDocument | undefined> {
    let mobile: string;
    let uid: string;
    try {
      mobile = sessionLoginKey();
      uid = requireUid();
    } catch {
      return undefined;
    }
    const db = getFirestoreDb();
    try {
      const snap = await getDocs(
        query(collection(db, WARRANTIES), where('productId', '==', productId), where('userMobile', '==', mobile))
      );
      const snap2 = await getDocs(
        query(collection(db, WARRANTIES), where('productId', '==', productId), where('ownerUid', '==', uid))
      );
      const docSnap = snap.docs[0] ?? snap2.docs[0];
      if (!docSnap) return undefined;
      const data = docSnap.data() as Record<string, unknown>;
      const storagePath = data.storagePath as string | undefined;
      const downloadURL = data.downloadURL as string | undefined;
      const imageData = data.imageData as string | undefined;

      let blob: Blob;
      if (downloadURL) {
        const res = await fetch(downloadURL);
        blob = await res.blob();
      } else if (storagePath) {
        const url = await getDownloadURL(ref(getFirebaseStorage(), storagePath));
        const res = await fetch(url);
        blob = await res.blob();
      } else if (imageData) {
        blob = await imageDataToBlob(imageData);
      } else {
        return undefined;
      }

      return {
        id: docSnap.id,
        productId: (data.productId as string) || productId,
        imageBlob: blob,
        extractedText: data.extractedText as string | undefined,
        createdAt: toDate(data.createdAt) || new Date(),
      };
    } catch (e) {
      console.error('Firestore warranty read error:', e);
      return undefined;
    }
  },

  async add(document: WarrantyDocument): Promise<string> {
    const mobile = sessionLoginKey();
    const uid = requireUid();
    const db = getFirestoreDb();
    const storage = getFirebaseStorage();
    const objectPath = `warranties/${uid}/${document.productId}/${document.id}`;
    const storageRef = ref(storage, objectPath);
    await uploadBytes(storageRef, document.imageBlob, {
      contentType: document.imageBlob.type || 'image/jpeg',
    });
    const downloadURL = await getDownloadURL(storageRef);

    const refDoc = doc(db, WARRANTIES, document.id);
    await setDoc(refDoc, {
      ownerUid: uid,
      userMobile: mobile,
      productId: document.productId,
      storagePath: objectPath,
      downloadURL,
      imageData: null,
      extractedText: document.extractedText ?? null,
      createdAt: Timestamp.fromDate(document.createdAt),
    });
    return document.id;
  },

  async delete(id: string): Promise<void> {
    const mobile = sessionLoginKey();
    const uid = requireUid();
    const db = getFirestoreDb();
    const refDoc = doc(db, WARRANTIES, id);
    const d = await getDoc(refDoc);
    if (!d.exists()) return;
    const data = d.data() as Record<string, unknown>;
    if (!canAccessProduct(data, mobile, uid)) return;
    const path = data.storagePath as string | undefined;
    if (path) {
      try {
        await deleteObject(ref(getFirebaseStorage(), path));
      } catch {
        /* ignore */
      }
    }
    await deleteDoc(refDoc);
  },

  async deleteByProductId(productId: string): Promise<void> {
    const mobile = sessionLoginKey();
    const uid = requireUid();
    const db = getFirestoreDb();
    const snap = await getDocs(
      query(collection(db, WARRANTIES), where('productId', '==', productId), where('userMobile', '==', mobile))
    );
    const snap2 = await getDocs(
      query(collection(db, WARRANTIES), where('productId', '==', productId), where('ownerUid', '==', uid))
    );
    const seen = new Set<string>();
    for (const w of [...snap.docs, ...snap2.docs]) {
      if (seen.has(w.id)) continue;
      seen.add(w.id);
      await this.delete(w.id);
    }
  },
};

export const firestoreProductDb = {
  getAll: () => firestoreDb.getAllProducts(),
  getById: (id: string) => firestoreDb.getProductById(id),
  getByItemCode: (code: string) => firestoreDb.getProductByItemCode(code),
  add: (product: Product) => firestoreDb.addProduct(product),
  update: (id: string, changes: Partial<Product>) => firestoreDb.updateProduct(id, changes),
  delete: (id: string) => firestoreDb.deleteProduct(id),
  search: (q: string) => firestoreDb.searchProducts(q),
  getByCategory: (category: string) => firestoreDb.getByCategory(category),
};

export const firestoreWarrantyDb = {
  getByProductId: (productId: string) => firestoreDb.getByProductId(productId),
  add: (document: WarrantyDocument) => firestoreDb.add(document),
  delete: (id: string) => firestoreDb.delete(id),
  deleteByProductId: (productId: string) => firestoreDb.deleteByProductId(productId),
};
