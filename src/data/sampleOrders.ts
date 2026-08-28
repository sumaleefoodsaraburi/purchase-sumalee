import { PurchaseOrder } from '../types';
import { IMPORTED_ORDERS } from './importedOrders';

export const SAMPLE_ORDERS = IMPORTED_ORDERS;

const STORAGE_KEY = 'sumalee_food_orders_v6';

/**
 * Load orders from LocalStorage or return imported real orders dataset
 */
export function loadOrders(): PurchaseOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading orders from localStorage', err);
  }

  // Load imported real orders as initial dataset
  const initialData: PurchaseOrder[] = [...IMPORTED_ORDERS];
  saveOrders(initialData);
  return initialData;
}

/**
 * Save orders array to LocalStorage
 */
export function saveOrders(orders: PurchaseOrder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Error saving orders to localStorage', err);
  }
}

/**
 * Preset list of factory stock products required by user
 */
export const FACTORY_STOCK_PRODUCT_OPTIONS = [
  { code: 'OF01', name: 'หอมเจียวยางแดง 5กก (รหัส OF01)' },
  { code: 'OF02', name: 'หอมเจียวยางเขียว 5กก (รหัส OF02)' },
  { code: 'OF02.01', name: 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)' },
  { code: 'OF02.02', name: 'หอมเจียวยางเขียว 100กรัม (รหัส OF02.02)' },
  { code: 'OF03', name: 'หอมเจียวC 5กก (รหัส OF03)' },
  { code: 'FG01', name: 'กระเทียมเจียวD สูตร40 (รหัส FG01)' },
  { code: 'FG03', name: 'กระเทียมเจียวC สูตร60 (รหัส FG03)' },
  { code: 'FG04', name: 'กระเทียมเจียวB สูตร80 (รหัส FG04)' },
  { code: 'FG06', name: 'กระเทียมเจียวA สูตร100 (รหัส FG06)' },
];

/**
 * Preset list of common products for quick selection in form
 */
export const POPULAR_PRODUCTS_PRESETS = [
  { name: 'หอมเจียวยางแดง 5กก (รหัส OF01)', defaultPrice: 120 },
  { name: 'หอมเจียวยางเขียว 5กก (รหัส OF02)', defaultPrice: 120 },
  { name: 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)', defaultPrice: 65 },
  { name: 'หอมเจียวยางเขียว 100กรัม (รหัส OF02.02)', defaultPrice: 20 },
  { name: 'หอมเจียวC 5กก (รหัส OF03)', defaultPrice: 110 },
  { name: 'กระเทียมเจียวD สูตร40 (รหัส FG01)', defaultPrice: 100 },
  { name: 'กระเทียมเจียวC สูตร60 (รหัส FG03)', defaultPrice: 110 },
  { name: 'กระเทียมเจียวB สูตร80 (รหัส FG04)', defaultPrice: 120 },
  { name: 'กระเทียมเจียวA สูตร100 (รหัส FG06)', defaultPrice: 130 },
  { name: 'หอมเจียว 100 กรัม', defaultPrice: 20 },
  { name: 'หอมเจียว 500 กรัม', defaultPrice: 65 },
  { name: 'หอมเจียว (กก.)', defaultPrice: 120 },
  { name: 'กระเทียมเจียว (กก.)', defaultPrice: 110 },
  { name: 'กระเทียมเจียว 100 กรัม', defaultPrice: 20 },
  { name: 'พริกผัดน้ำมัน (กก.)', defaultPrice: 150 },
  { name: 'พริกแห้งคั่ว (กก.)', defaultPrice: 160 },
  { name: 'หอมแดงแผ่นสด (กก.)', defaultPrice: 70 },
  { name: 'กระเทียมสับละเอียด (กก.)', defaultPrice: 90 },
  { name: 'พริกป่นละเอียด (กก.)', defaultPrice: 140 },
  { name: 'น้ำพริกเผาสูตรเด็ด (กก.)', defaultPrice: 180 },
];

/**
 * Reset orders to original imported dataset
 */
export function resetOrdersToDefault(): PurchaseOrder[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Error clearing localStorage', err);
  }
  return loadOrders();
}

