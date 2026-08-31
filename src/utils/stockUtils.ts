import { StockEntry, PurchaseOrder, DailyStockSummary, ProductionShift, StockLocation } from '../types';
import { THAI_FULL_MONTHS, THAI_SHORT_MONTHS } from './formatters';

const STORAGE_KEY = 'sumalee_stock_entries_v2';

export const FACTORY_STOCK_PRESET_NAMES = [
  'หอมเจียวยางแดง 5กก (รหัส OF01)',
  'หอมเจียวยางเขียว 5กก (รหัส OF02)',
  'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)',
  'หอมเจียวยางเขียว 100กรัม (รหัส OF02.02)',
  'หอมเจียวC 5กก (รหัส OF03)',
  'กระเทียมเจียวD สูตร40 (รหัส FG01)',
  'กระเทียมเจียวC สูตร60 (รหัส FG03)',
  'กระเทียมเจียวB สูตร80 (รหัส FG04)',
  'กระเทียมเจียวA สูตร100 (รหัส FG06)',
];

export const STOCK_CUTOFF_DATE = '2026-08-01';

/**
 * Normalize product names to match the factory/online stock products.
 * STRICTLY tracks Fried Shallots (หอมเจียว) and Fried Garlic (กระเทียมเจียว) only.
 * Returns null if the product is not fried shallots or fried garlic (e.g. chili, fresh onion, spices).
 */
export function normalizeProductName(name: string): string | null {
  if (!name) return null;
  const t = name.trim();
  const lower = t.toLowerCase();

  // Exclude non-fried fresh or raw items explicitly
  if (t.includes('หอมแดงสด') || t.includes('หอมสด') || t.includes('กระเทียมสด') || t.includes('กระเทียมสับสด') || t.includes('กระเทียมสับละเอียด')) {
    return null;
  }

  // Exclude chili, pastes, seasonings, packaging, and other non-shallot/garlic items
  if (
    t.includes('พริก') ||
    t.includes('น้ำพริก') ||
    t.includes('ถุง') ||
    t.includes('กล่อง') ||
    t.includes('น้ำมัน') ||
    t.includes('เกลือ') ||
    t.includes('แป้งสด')
  ) {
    return null;
  }

  // 1. Fried Shallots (หอมเจียว / หอมทอด)
  if (t.includes('OF01') || t.includes('ยางแดง')) return 'หอมเจียวยางแดง 5กก (รหัส OF01)';
  if (
    t.includes('OF02.02') ||
    ((t.includes('100กรัม') || t.includes('100 กรัม') || lower.includes('100g') || t.includes('100 ก.')) &&
      (t.includes('หอม') || t.includes('ยางเขียว')))
  ) {
    return 'หอมเจียวยางเขียว 100กรัม (รหัส OF02.02)';
  }
  if (
    t.includes('OF02.01') ||
    ((t.includes('500กรัม') || t.includes('500 กรัม') || lower.includes('500g') || t.includes('500 ก.')) &&
      (t.includes('หอม') || t.includes('ยางเขียว')))
  ) {
    return 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)';
  }
  if (t.includes('OF02') || t.includes('ยางเขียว')) return 'หอมเจียวยางเขียว 5กก (รหัส OF02)';
  if (
    t.includes('OF03') ||
    t.includes('แป้งหนา') ||
    t.includes('หอมเจียวC') ||
    t.includes('หอมเจียว C') ||
    lower.includes('หอมเจียว c')
  ) {
    return 'หอมเจียวC 5กก (รหัส OF03)';
  }

  // Generic Shallots patterns
  if (t.includes('หอมเจียว') || t.includes('หอมทอด') || t.includes('หอมแผ่นเจียว')) {
    if (t.includes('100')) return 'หอมเจียวยางเขียว 100กรัม (รหัส OF02.02)';
    if (t.includes('500')) return 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)';
    if (t.includes('C') || t.includes('c') || t.includes('แป้ง')) return 'หอมเจียวC 5กก (รหัส OF03)';
    if (t.includes('แดง')) return 'หอมเจียวยางแดง 5กก (รหัส OF01)';
    return 'หอมเจียวยางเขียว 5กก (รหัส OF02)';
  }

  // 2. Fried Garlic (กระเทียมเจียว / กระเทียมทอด)
  if (
    t.includes('FG01') ||
    (t.includes('กระเทียม') &&
      (t.includes('สูตร40') ||
        t.includes('สูตร 40') ||
        t.includes('สูตร 4') ||
        t.includes('สูตร4') ||
        t.includes('เจียวD') ||
        t.includes('เจียว D') ||
        t.includes('เจียว d')))
  ) {
    return 'กระเทียมเจียวD สูตร40 (รหัส FG01)';
  }
  if (
    t.includes('FG03') ||
    (t.includes('กระเทียม') &&
      (t.includes('สูตร60') ||
        t.includes('สูตร 60') ||
        t.includes('สูตร 6') ||
        t.includes('สูตร6') ||
        t.includes('เจียวC') ||
        t.includes('เจียว C') ||
        lower.includes('เจียว c')))
  ) {
    return 'กระเทียมเจียวC สูตร60 (รหัส FG03)';
  }
  if (
    t.includes('FG04') ||
    (t.includes('กระเทียม') &&
      (t.includes('สูตร80') ||
        t.includes('สูตร 80') ||
        t.includes('สูตร 8') ||
        t.includes('สูตร8') ||
        t.includes('เจียวB') ||
        t.includes('เจียว B') ||
        lower.includes('เจียว b')))
  ) {
    return 'กระเทียมเจียวB สูตร80 (รหัส FG04)';
  }
  if (
    t.includes('FG06') ||
    (t.includes('กระเทียม') &&
      (t.includes('สูตร100') ||
        t.includes('สูตร 100') ||
        t.includes('สูตร 1') ||
        t.includes('สูตร1') ||
        t.includes('เจียวA') ||
        t.includes('เจียว A') ||
        lower.includes('เจียว a')))
  ) {
    return 'กระเทียมเจียวA สูตร100 (รหัส FG06)';
  }

  // Generic Garlic
  if (t.includes('กระเทียมเจียว') || t.includes('กระเทียมทอด')) {
    if (t.includes('100') || t.includes('A') || t.includes('a')) return 'กระเทียมเจียวA สูตร100 (รหัส FG06)';
    if (t.includes('80') || t.includes('B') || t.includes('b')) return 'กระเทียมเจียวB สูตร80 (รหัส FG04)';
    if (t.includes('60') || t.includes('C') || t.includes('c')) return 'กระเทียมเจียวC สูตร60 (รหัส FG03)';
    return 'กระเทียมเจียวD สูตร40 (รหัส FG01)';
  }

  // Any other product is NOT counted in stock
  return null;
}

/**
 * Check if a product is tracked in the factory/online stock system
 * (Only fried shallots and fried garlic are tracked).
 */
export function isStockTrackedProduct(name: string): boolean {
  return normalizeProductName(name) !== null;
}

/**
 * Sample Initial Stock Production Entries with factory & online source separation
 */
export function getSampleStockEntries(): StockEntry[] {
  const todayStr = '2026-08-03';
  const yesterdayStr = '2026-08-02';
  const prevStr = '2026-08-01';

  return [
    {
      id: 'stk-20260803-day',
      dateKey: todayStr,
      shift: 'day',
      shiftLabel: 'กะเช้า (08:00 - 20:00)',
      stockSource: 'factory',
      recordedBy: 'สมชาย (หัวหน้ากะเช้า)',
      note: 'ผลิตล็อตปกติประจำวัน เครื่องจักรทำงานปกติ (สต็อคโรงงาน)',
      totalWeightKg: 750,
      createdAt: '2026-08-03T08:30:00.000Z',
      items: [
        { id: 'i1', productName: 'หอมเจียวยางแดง 5กก (รหัส OF01)', weightKg: 180 },
        { id: 'i2', productName: 'หอมเจียวยางเขียว 5กก (รหัส OF02)', weightKg: 150 },
        { id: 'i3', productName: 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)', weightKg: 70 },
        { id: 'i4', productName: 'หอมเจียวC 5กก (รหัส OF03)', weightKg: 50 },
        { id: 'i4_1', productName: 'กระเทียมเจียวD สูตร40 (รหัส FG01)', weightKg: 100 },
        { id: 'i4_2', productName: 'กระเทียมเจียวC สูตร60 (รหัส FG03)', weightKg: 80 },
        { id: 'i4_3', productName: 'กระเทียมเจียวB สูตร80 (รหัส FG04)', weightKg: 70 },
        { id: 'i4_4', productName: 'กระเทียมเจียวA สูตร100 (รหัส FG06)', weightKg: 50 },
      ],
    },
    {
      id: 'stk-20260803-online',
      dateKey: todayStr,
      shift: 'day',
      shiftLabel: 'กะเช้า (08:00 - 20:00)',
      stockSource: 'online',
      recordedBy: 'สุรีรัตน์ (แอดมินออนไลน์)',
      note: 'เบิกเข้าคลังออนไลน์สำหรับออเดอร์ Shopee / TikTok / เพจ',
      totalWeightKg: 200,
      createdAt: '2026-08-03T09:15:00.000Z',
      items: [
        { id: 'onl-1', productName: 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)', weightKg: 60 },
        { id: 'onl-2', productName: 'หอมเจียวยางเขียว 100กรัม (รหัส OF02.02)', weightKg: 40 },
        { id: 'onl-3', productName: 'หอมเจียวยางแดง 5กก (รหัส OF01)', weightKg: 50 },
        { id: 'onl-4', productName: 'กระเทียมเจียวD สูตร40 (รหัส FG01)', weightKg: 50 },
      ],
    },
    {
      id: 'stk-20260803-night',
      dateKey: todayStr,
      shift: 'night',
      shiftLabel: 'กะดึก (20:00 - 08:00)',
      stockSource: 'factory',
      recordedBy: 'วิชัย (หัวหน้ากะดึก)',
      note: 'เร่งผลิตหอมเจียวและกระเทียมเจียวเพิ่มสำหรับส่งลูกค้า',
      totalWeightKg: 550,
      createdAt: '2026-08-03T20:30:00.000Z',
      items: [
        { id: 'i5', productName: 'หอมเจียวยางแดง 5กก (รหัส OF01)', weightKg: 200 },
        { id: 'i6', productName: 'หอมเจียวยางเขียว 5กก (รหัส OF02)', weightKg: 100 },
        { id: 'i7', productName: 'หอมเจียวC 5กก (รหัส OF03)', weightKg: 50 },
        { id: 'i7_1', productName: 'กระเทียมเจียวD สูตร40 (รหัส FG01)', weightKg: 100 },
        { id: 'i7_2', productName: 'กระเทียมเจียวC สูตร60 (รหัส FG03)', weightKg: 100 },
      ],
    },
    {
      id: 'stk-20260802-day',
      dateKey: yesterdayStr,
      shift: 'day',
      shiftLabel: 'กะเช้า (08:00 - 20:00)',
      stockSource: 'factory',
      recordedBy: 'สมชาย (หัวหน้ากะเช้า)',
      note: 'ผลิตเต็มกำลัง',
      totalWeightKg: 800,
      createdAt: '2026-08-02T08:30:00.000Z',
      items: [
        { id: 'i8', productName: 'หอมเจียวยางแดง 5กก (รหัส OF01)', weightKg: 220 },
        { id: 'i9', productName: 'หอมเจียวยางเขียว 5กก (รหัส OF02)', weightKg: 180 },
        { id: 'i10', productName: 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)', weightKg: 50 },
        { id: 'i11', productName: 'หอมเจียวC 5กก (รหัส OF03)', weightKg: 50 },
        { id: 'i11_1', productName: 'กระเทียมเจียวD สูตร40 (รหัส FG01)', weightKg: 120 },
        { id: 'i11_2', productName: 'กระเทียมเจียวC สูตร60 (รหัส FG03)', weightKg: 100 },
        { id: 'i11_3', productName: 'กระเทียมเจียวB สูตร80 (รหัส FG04)', weightKg: 50 },
        { id: 'i11_4', productName: 'กระเทียมเจียวA สูตร100 (รหัส FG06)', weightKg: 30 },
      ],
    },
    {
      id: 'stk-20260802-online',
      dateKey: yesterdayStr,
      shift: 'day',
      shiftLabel: 'กะเช้า (08:00 - 20:00)',
      stockSource: 'online',
      recordedBy: 'สุรีรัตน์ (แอดมินออนไลน์)',
      note: 'จัดเตรียมสต็อคออนไลน์',
      totalWeightKg: 150,
      createdAt: '2026-08-02T10:00:00.000Z',
      items: [
        { id: 'onl-5', productName: 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)', weightKg: 50 },
        { id: 'onl-6', productName: 'หอมเจียวยางเขียว 100กรัม (รหัส OF02.02)', weightKg: 40 },
        { id: 'onl-7', productName: 'หอมเจียวยางแดง 5กก (รหัส OF01)', weightKg: 30 },
        { id: 'onl-8', productName: 'กระเทียมเจียวD สูตร40 (รหัส FG01)', weightKg: 30 },
      ],
    },
    {
      id: 'stk-20260801-day',
      dateKey: prevStr,
      shift: 'day',
      shiftLabel: 'กะเช้า (08:00 - 20:00)',
      stockSource: 'factory',
      recordedBy: 'สมชาย (หัวหน้ากะเช้า)',
      note: 'เริ่มเดือนใหม่ ผลิตสินค้าครบทุกรายการ',
      totalWeightKg: 720,
      createdAt: '2026-08-01T08:30:00.000Z',
      items: [
        { id: 'i12', productName: 'หอมเจียวยางแดง 5กก (รหัส OF01)', weightKg: 200 },
        { id: 'i13', productName: 'หอมเจียวยางเขียว 5กก (รหัส OF02)', weightKg: 120 },
        { id: 'i14', productName: 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)', weightKg: 50 },
        { id: 'i15', productName: 'หอมเจียวC 5กก (รหัส OF03)', weightKg: 50 },
        { id: 'i15_1', productName: 'กระเทียมเจียวD สูตร40 (รหัส FG01)', weightKg: 100 },
        { id: 'i15_2', productName: 'กระเทียมเจียวC สูตร60 (รหัส FG03)', weightKg: 100 },
        { id: 'i15_3', productName: 'กระเทียมเจียวB สูตร80 (รหัส FG04)', weightKg: 60 },
        { id: 'i15_4', productName: 'กระเทียมเจียวA สูตร100 (รหัส FG06)', weightKg: 40 },
      ],
    },
  ];
}

/**
 * Load stock entries from LocalStorage
 */
export function loadStockEntriesFromLocalStorage(): StockEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading stock entries from localStorage:', err);
  }

  const initial = getSampleStockEntries();
  saveStockEntriesToLocalStorage(initial);
  return initial;
}

/**
 * Save stock entries to LocalStorage
 */
export function saveStockEntriesToLocalStorage(entries: StockEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Error saving stock entries to localStorage:', err);
  }
}

/**
 * Calculate Daily Stock & Cumulative Sales Deduction Summary for a specific YYYY-MM-DD
 * Supports separate calculation for 'factory' (โรงงาน), 'online' (ออนไลน์), or 'all' (รวมทั้งหมด)
 */
export function calculateDailyStockSummary(
  dateKey: string,
  stockEntries: StockEntry[],
  orders: PurchaseOrder[],
  stockSourceFilter: StockLocation | 'all' = 'factory'
): DailyStockSummary {
  // Helper to test if a stock entry matches the source filter
  const matchStockSource = (source?: StockLocation) => {
    if (stockSourceFilter === 'all') return true;
    const actual = source || 'factory';
    return actual === stockSourceFilter;
  };

  // Helper to test if an order matches the source filter
  const matchOrderSource = (source?: StockLocation) => {
    if (stockSourceFilter === 'all') return true;
    const actual = source || 'factory';
    return actual === stockSourceFilter;
  };

  // Set of all unique product names across presets, stock entries, and orders
  const allProductNamesSet = new Set<string>(FACTORY_STOCK_PRESET_NAMES);

  // 1. Calculate PRIOR cumulative stock entries (STOCK_CUTOFF_DATE <= entry.dateKey < target dateKey)
  const priorProducedMap: Record<string, number> = {};

  stockEntries.forEach((entry) => {
    if (matchStockSource(entry.stockSource)) {
      entry.items.forEach((item) => {
        const pName = normalizeProductName(item.productName);
        if (pName) {
          allProductNamesSet.add(pName);
          if (entry.dateKey && entry.dateKey >= STOCK_CUTOFF_DATE && entry.dateKey < dateKey) {
            priorProducedMap[pName] = (priorProducedMap[pName] || 0) + (Number(item.weightKg) || 0);
          }
        }
      });
    }
  });

  // 2. Calculate PRIOR cumulative order sales (STOCK_CUTOFF_DATE <= order dateKey < target dateKey)
  const priorSoldMap: Record<string, number> = {};

  orders.forEach((order) => {
    if (order.deliveryStatus === 'cancelled') return;
    if (!matchOrderSource(order.stockSource)) return;

    const d = new Date(order.createdAt);
    if (isNaN(d.getTime())) return;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const oDateKey = `${y}-${m}-${day}`;

    order.items.forEach((item) => {
      const pName = normalizeProductName(item.productName);
      if (pName) {
        allProductNamesSet.add(pName);
        if (oDateKey >= STOCK_CUTOFF_DATE && oDateKey < dateKey) {
          priorSoldMap[pName] = (priorSoldMap[pName] || 0) + (Number(item.weightKg) || 0);
        }
      }
    });
  });

  // 3. TODAY'S stock entries (dateKey === target dateKey)
  const dayEntries = stockEntries.filter(
    (e) => e.dateKey === dateKey && matchStockSource(e.stockSource)
  );

  const producedProductMap: Record<string, { dayKg: number; nightKg: number; totalKg: number }> = {};

  dayEntries.forEach((entry) => {
    const isDay = entry.shift === 'day';

    entry.items.forEach((item) => {
      const pName = normalizeProductName(item.productName);
      if (!pName) return;
      allProductNamesSet.add(pName);

      if (!producedProductMap[pName]) {
        producedProductMap[pName] = { dayKg: 0, nightKg: 0, totalKg: 0 };
      }
      const w = Number(item.weightKg) || 0;
      if (isDay) {
        producedProductMap[pName].dayKg += w;
      } else {
        producedProductMap[pName].nightKg += w;
      }
      producedProductMap[pName].totalKg += w;
    });
  });

  // 4. TODAY'S orders (order dateKey === target dateKey) and collect deducted orders
  const soldProductMap: Record<string, number> = {};
  const deductedOrdersList: NonNullable<DailyStockSummary['deductedOrders']> = [];

  orders.forEach((order) => {
    if (order.deliveryStatus === 'cancelled') return;
    if (!matchOrderSource(order.stockSource)) return;

    const d = new Date(order.createdAt);
    if (isNaN(d.getTime())) return;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const oDateKey = `${y}-${m}-${day}`;

    if (oDateKey === dateKey) {
      let orderMatchedWeight = 0;
      const orderItems = order.items.map((item) => {
        const pName = normalizeProductName(item.productName);
        const w = Number(item.weightKg) || 0;
        if (pName) {
          allProductNamesSet.add(pName);
          soldProductMap[pName] = (soldProductMap[pName] || 0) + w;
          orderMatchedWeight += w;
        }
        return {
          productName: item.productName,
          weightKg: w,
          pricePerKg: Number(item.pricePerKg) || 0,
          totalPrice: Number(item.totalPrice) || 0,
          packSize: item.packSize,
        };
      });

      if (orderMatchedWeight > 0) {
        deductedOrdersList.push({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer.name,
          customerPhone: order.customer.phone,
          stockSource: order.stockSource || 'factory',
          createdAt: order.createdAt,
          deliveryStatus: order.deliveryStatus,
          paymentStatus: order.paymentStatus,
          totalWeightKg: Math.round(orderMatchedWeight * 100) / 100,
          items: orderItems,
        });
      }
    }
  });

  // 5. Calculate breakdown strictly across Fried Shallots & Fried Garlic (9 factory presets)
  let priorRemainingKg = 0;
  let dayShiftWeightKg = 0;
  let nightShiftWeightKg = 0;
  let totalProducedKg = 0;
  let totalAvailableKg = 0;
  let totalSoldKg = 0;

  // Strict list of the 9 preset products (หอมเจียว 5 รายการ + กระเทียมเจียว 4 รายการ)
  const orderedProductNames = [...FACTORY_STOCK_PRESET_NAMES];

  const productBreakdown = orderedProductNames.map((pName) => {
    const pPriorProd = priorProducedMap[pName] || 0;
    const pPriorSold = priorSoldMap[pName] || 0;
    const pPriorRemaining = Math.max(0, Math.round((pPriorProd - pPriorSold) * 100) / 100);

    const prod = producedProductMap[pName] || { dayKg: 0, nightKg: 0, totalKg: 0 };
    const pTodayProduced = Math.round(prod.totalKg * 100) / 100;
    const pAvailable = Math.round((pPriorRemaining + pTodayProduced) * 100) / 100;

    const pTodaySold = Math.round((soldProductMap[pName] || 0) * 100) / 100;
    const pRemaining = Math.round((pAvailable - pTodaySold) * 100) / 100;

    priorRemainingKg += pPriorRemaining;
    dayShiftWeightKg += prod.dayKg;
    nightShiftWeightKg += prod.nightKg;
    totalProducedKg += pTodayProduced;
    totalAvailableKg += pAvailable;
    totalSoldKg += pTodaySold;

    return {
      productName: pName,
      priorRemainingKg: pPriorRemaining,
      dayShiftKg: Math.round(prod.dayKg * 100) / 100,
      nightShiftKg: Math.round(prod.nightKg * 100) / 100,
      producedKg: pTodayProduced,
      availableKg: pAvailable,
      soldKg: pTodaySold,
      remainingKg: pRemaining,
    };
  });

  const remainingStockKg = Math.round((totalAvailableKg - totalSoldKg) * 100) / 100;

  // Format Thai Date
  const parts = dateKey.split('-');
  let dateThaiFull = dateKey;
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const thaiYear = y + 543;
    dateThaiFull = `${d} ${THAI_FULL_MONTHS[m] || ''} ${thaiYear}`;
  }

  return {
    dateKey,
    dateThaiFull,
    stockSource: stockSourceFilter,
    priorRemainingKg: Math.round(priorRemainingKg * 100) / 100,
    dayShiftWeightKg: Math.round(dayShiftWeightKg * 100) / 100,
    nightShiftWeightKg: Math.round(nightShiftWeightKg * 100) / 100,
    totalProducedKg: Math.round(totalProducedKg * 100) / 100,
    totalAvailableKg: Math.round(totalAvailableKg * 100) / 100,
    totalSoldKg: Math.round(totalSoldKg * 100) / 100,
    remainingStockKg,
    entriesCount: dayEntries.length,
    deductedOrders: deductedOrdersList,
    productBreakdown,
  };
}

/**
 * Get Realtime Available Ready-to-Sell Stock for a specific product and location
 * Accurately deducts all active orders up to today (optionally excluding editing order)
 */
export function getRealtimeAvailableStock(
  productName: string,
  stockSource: StockLocation,
  stockEntries: StockEntry[],
  orders: PurchaseOrder[],
  excludeOrderId?: string
): { availableKg: number; totalProducedKg: number; totalSoldKg: number } {
  const normName = normalizeProductName(productName);
  if (!normName) {
    return { availableKg: 0, totalProducedKg: 0, totalSoldKg: 0 };
  }

  // 1. Total produced in stock entries for stockSource
  let totalProducedKg = 0;
  stockEntries.forEach((entry) => {
    const actualSource = entry.stockSource || 'factory';
    if (actualSource === stockSource) {
      entry.items.forEach((item) => {
        if (normalizeProductName(item.productName) === normName) {
          totalProducedKg += Number(item.weightKg) || 0;
        }
      });
    }
  });

  // 2. Total sold in orders for stockSource (non-cancelled and excluding excludeOrderId)
  let totalSoldKg = 0;
  orders.forEach((order) => {
    if (order.deliveryStatus === 'cancelled') return;
    if (excludeOrderId && order.id === excludeOrderId) return;
    const actualSource = order.stockSource || 'factory';
    if (actualSource === stockSource) {
      order.items.forEach((item) => {
        if (normalizeProductName(item.productName) === normName) {
          totalSoldKg += Number(item.weightKg) || 0;
        }
      });
    }
  });

  const availableKg = Math.round((totalProducedKg - totalSoldKg) * 100) / 100;

  return {
    availableKg,
    totalProducedKg: Math.round(totalProducedKg * 100) / 100,
    totalSoldKg: Math.round(totalSoldKg * 100) / 100,
  };
}

/**
 * Get Daily Stock Summaries for all dates found in stock entries or orders (from Aug 1 onwards)
 */
export function getAllDailyStockSummaries(
  stockEntries: StockEntry[],
  orders: PurchaseOrder[],
  stockSourceFilter: StockLocation | 'all' = 'factory'
): DailyStockSummary[] {
  const datesSet = new Set<string>();

  const matchStockSource = (source?: StockLocation) => {
    if (stockSourceFilter === 'all') return true;
    const actual = source || 'factory';
    return actual === stockSourceFilter;
  };

  const matchOrderSource = (source?: StockLocation) => {
    if (stockSourceFilter === 'all') return true;
    const actual = source || 'factory';
    return actual === stockSourceFilter;
  };

  // Collect dateKeys from stockEntries (Aug 1 onwards)
  stockEntries.forEach((e) => {
    if (e.dateKey && e.dateKey >= STOCK_CUTOFF_DATE && matchStockSource(e.stockSource)) {
      datesSet.add(e.dateKey);
    }
  });

  // Collect dateKeys from orders (Aug 1 onwards)
  orders.forEach((o) => {
    if (!matchOrderSource(o.stockSource)) return;
    const d = new Date(o.createdAt);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const oDateKey = `${year}-${month}-${day}`;
      if (oDateKey >= STOCK_CUTOFF_DATE) {
        datesSet.add(oDateKey);
      }
    }
  });

  // Always ensure today is present if >= cutoff
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (todayKey >= STOCK_CUTOFF_DATE) {
    datesSet.add(todayKey);
  }

  const datesArray = Array.from(datesSet).sort((a, b) => b.localeCompare(a));

  return datesArray.map((dKey) =>
    calculateDailyStockSummary(dKey, stockEntries, orders, stockSourceFilter)
  );
}

/**
 * Get quick stock balance map for today or specified date
 */
export function getProductStockBalanceMap(
  dateKey: string,
  stockEntries: StockEntry[],
  orders: PurchaseOrder[],
  stockSource: StockLocation | 'all' = 'factory'
): Record<string, number> {
  const summary = calculateDailyStockSummary(dateKey, stockEntries, orders, stockSource);
  const map: Record<string, number> = {};
  summary.productBreakdown.forEach((p) => {
    map[p.productName] = p.remainingKg;
  });
  return map;
}

