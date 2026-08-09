import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { PurchaseOrder, StockEntry } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specified database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

const COLLECTION_NAME = 'purchase_orders';
const STOCK_COLLECTION_NAME = 'stock_entries';

/**
 * Real-time listener for purchase orders in Firestore.
 * Updates subscribers in real time across all open browsers/devices without login!
 */
export function subscribeToOrders(
  onSuccess: (orders: PurchaseOrder[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(collection(db, COLLECTION_NAME));

  return onSnapshot(
    q,
    (snapshot) => {
      const ordersList: PurchaseOrder[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as PurchaseOrder;
        ordersList.push(data);
      });

      // Sort by createdAt descending (newest first)
      ordersList.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      onSuccess(ordersList);
    },
    (error) => {
      console.error('Error listening to Firestore orders:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Save or update a purchase order in Firestore
 */
export async function saveOrderToFirestore(order: PurchaseOrder): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, order.id);
  // Remove undefined fields if any
  const cleanOrder = JSON.parse(JSON.stringify(order));
  await setDoc(docRef, cleanOrder);
}

/**
 * Delete a purchase order from Firestore
 */
export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, orderId);
  await deleteDoc(docRef);
}

/**
 * Sync all orders to Firestore using a fast atomic batch write
 */
export async function syncAllOrdersToFirestore(ordersList: PurchaseOrder[]): Promise<void> {
  try {
    // Firestore batch limit is 500 operations per batch
    const chunkSize = 400;
    for (let i = 0; i < ordersList.length; i += chunkSize) {
      const chunk = ordersList.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const item of chunk) {
        const docRef = doc(db, COLLECTION_NAME, item.id);
        const cleanOrder = JSON.parse(JSON.stringify(item));
        batch.set(docRef, cleanOrder);
      }
      await batch.commit();
    }
    console.log(`Synced ${ordersList.length} orders to Firestore via batch write.`);
  } catch (err) {
    console.error('Error syncing batch orders to Firestore:', err);
  }
}

/**
 * Seed initial sample orders into Firestore if database is empty or incomplete
 */
export async function seedInitialOrdersIfEmpty(defaultOrders: PurchaseOrder[]): Promise<void> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);
    const sampleFirstPo = defaultOrders[0]?.orderNumber;
    const firstDoc = snapshot.docs[0]?.data();

    if (
      snapshot.empty ||
      snapshot.size < defaultOrders.length ||
      (firstDoc && firstDoc.orderNumber && !firstDoc.orderNumber.match(/^\d{8}-\d{3}$/))
    ) {
      console.log(`Firestore seeding/updating complete dataset (${defaultOrders.length} orders)...`);
      await syncAllOrdersToFirestore(defaultOrders);
    }
  } catch (err) {
    console.error('Error checking/seeding Firestore orders:', err);
  }
}

/**
 * Seed initial sample stock entries into Firestore if collection is empty
 */
export async function seedInitialStockEntriesIfEmpty(defaultStock: StockEntry[]): Promise<void> {
  try {
    const colRef = collection(db, STOCK_COLLECTION_NAME);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty && defaultStock.length > 0) {
      console.log(`Seeding initial stock entries to Firestore (${defaultStock.length} entries)...`);
      const batch = writeBatch(db);
      for (const item of defaultStock) {
        const docRef = doc(db, STOCK_COLLECTION_NAME, item.id);
        const cleanItem = JSON.parse(JSON.stringify(item));
        batch.set(docRef, cleanItem);
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('Error seeding initial stock entries:', err);
  }
}

/**
 * Real-time listener for stock production entries in Firestore
 */
export function subscribeToStockEntries(
  onSuccess: (entries: StockEntry[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(collection(db, STOCK_COLLECTION_NAME));

  return onSnapshot(
    q,
    (snapshot) => {
      const stockList: StockEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as StockEntry;
        stockList.push(data);
      });

      // Sort by dateKey and shift
      stockList.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      onSuccess(stockList);
    },
    (error) => {
      console.error('Error listening to Firestore stock entries:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Save or update a stock entry in Firestore
 */
export async function saveStockEntryToFirestore(entry: StockEntry): Promise<void> {
  const docRef = doc(db, STOCK_COLLECTION_NAME, entry.id);
  const cleanData = JSON.parse(JSON.stringify(entry));
  await setDoc(docRef, cleanData);
}

/**
 * Delete a stock entry from Firestore
 */
export async function deleteStockEntryFromFirestore(entryId: string): Promise<void> {
  const docRef = doc(db, STOCK_COLLECTION_NAME, entryId);
  await deleteDoc(docRef);
}

