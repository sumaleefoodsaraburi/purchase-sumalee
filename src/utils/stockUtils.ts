import { StockEntry, PurchaseOrder, DailyStockSummary, ProductionShift, StockLocation } from '../types';
import { THAI_FULL_MONTHS, THAI_SHORT_MONTHS } from './formatters';

const STORAGE_KEY = 'sumalee_stock_entries_v4';

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

export const FACTORY_STOCK_CUTOFF_DATE = '2026-09-08';
export const ONLINE_STOCK_CUTOFF_DATE = '2026-08-02';
export const STOCK_CUTOFF_DATE = '2026-09-08';

/**
 * Get current date key in Bangkok timezone (YYYY-MM-DD)
 */
export function getTodayDateKey(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}

/**
 * Check if a stock entry is a baseline / opening balance entry
 */
export function isBaselineStockEntry(entry: StockEntry): boolean {
  if (!entry) return false;
  return (
    entry.id.startsWith('stk-baseline') ||
    (typeof entry.note === 'string' &&
      (entry.note.includes('สต็อคเริ่มต้น') ||
        entry.note.includes('สต็อคตั้งต้น') ||
        entry.note.includes('ยอดยกมาเริ่มต้น') ||
        entry.note.includes('พร้อมขายตอนนี้'))) ||
    entry.shiftLabel?.includes('ยอดยกมา') ||
    false
  );
}

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
      (t.includes('หอม') || t.includes('ยางเขียว') || t.includes('ยางแขียว')))
  ) {
    return 'หอมเจียวยางเขียว 100กรัม (รหัส OF02.02)';
  }
  if (
    t.includes('OF02.01') ||
    ((t.includes('500กรัม') || t.includes('500 กรัม') || lower.includes('500g') || t.includes('500 ก.')) &&
      (t.includes('หอม') || t.includes('ยางเขียว') || t.includes('ยางแขียว')))
  ) {
    return 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)';
  }
  if (t.includes('OF02') || t.includes('ยางเขียว') || t.includes('ยางแขียว')) return 'หอมเจียวยางเขียว 5กก (รหัส OF02)';
  if (
    t.includes('OF03') ||
    t.includes('แป้งหนา') ||
    t.includes('หอมหนา') ||
    t.includes('เจียวหนา') ||
    t.includes('หอมเจียวหนา') ||
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
    if (t.includes('C') || t.includes('c') || t.includes('แป้ง') || t.includes('หนา')) return 'หอมเจียวC 5กก (รหัส OF03)';
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
        t.includes('สูตรD') ||
        t.includes('สูตร D') ||
        t.includes('เจียวD') ||
        t.includes('เจียว D') ||
        t.includes('เจียว d') ||
        lower.includes('สูตรd')))
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
        t.includes('สูตรC') ||
        t.includes('สูตร C') ||
        t.includes('เจียวC') ||
        t.includes('เจียว C') ||
        lower.includes('สูตรc') ||
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
        t.includes('สูตรB') ||
        t.includes('สูตร B') ||
        t.includes('เจียวB') ||
        t.includes('เจียว B') ||
        lower.includes('สูตรb') ||
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
        t.includes('สูตรA') ||
        t.includes('สูตร A') ||
        t.includes('เจียวA') ||
        t.includes('เจียว A') ||
        lower.includes('สูตรa') ||
        lower.includes('เจียว a')))
  ) {
    return 'กระเทียมเจียวA สูตร100 (รหัส FG06)';
  }

  // Generic Garlic
  if (t.includes('กระเทียมเจียว') || t.includes('กระเทียมทอด')) {
    if (t.includes('100') || t.includes('A') || t.includes('a') || t.includes('สูตรA')) return 'กระเทียมเจียวA สูตร100 (รหัส FG06)';
    if (t.includes('80') || t.includes('B') || t.includes('b') || t.includes('สูตรB')) return 'กระเทียมเจียวB สูตร80 (รหัส FG04)';
    if (t.includes('60') || t.includes('C') || t.includes('c') || t.includes('สูตรC')) return 'กระเทียมเจียวC สูตร60 (รหัส FG03)';
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
 * Sample Initial Stock Production Entries with factory & online source separation.
 * Factory baseline sets:
 * - หอมเจียวยางแดง: 225 กก
 * - หอมเจียวยางเขียว: 2200 กก
 * - หอมเจียวหนา (หอมเจียวC): 165 กก
 * - กระเทียมสูตรD: 1890 กก
 * - กระเทียมสูตรB: 960 กก
 * - นอกนั้นให้ตัดสต็อคเป็น 0
 */
export function getSampleStockEntries(): StockEntry[] {
  const baseDate = '2026-09-08';

  return [
    {
      id: 'stk-baseline-factory-20261001',
      dateKey: '2026-10-01',
      shift: 'day',
      shiftLabel: 'ยอดยกมาเริ่มต้น (พร้อมขาย)',
      stockSource: 'factory',
      recordedBy: 'ปรับสต็อคโรงงาน (นับจริง)',
      note: 'ปรับยอดสต็อคโรงงาน (นับจริง): ยางเขียว 2,200 กก., ยางแดง 1,223.7 กก., กระเทียมB 1,210 กก., กระเทียมA 451 กก.',
      totalWeightKg: 5084.7,
      createdAt: '2026-10-01T00:00:00.000Z',
      items: [
        { id: 'f-1', productName: 'หอมเจียวยางแดง 5กก (รหัส OF01)', weightKg: 1223.7 },
        { id: 'f-2', productName: 'หอมเจียวยางเขียว 5กก (รหัส OF02)', weightKg: 2200 },
        { id: 'f-3', productName: 'หอมเจียวC 5กก (รหัส OF03)', weightKg: 0 },
        { id: 'f-4', productName: 'กระเทียมเจียวD สูตร40 (รหัส FG01)', weightKg: 0 },
        { id: 'f-5', productName: 'กระเทียมเจียวB สูตร80 (รหัส FG04)', weightKg: 1210 },
        { id: 'f-6', productName: 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)', weightKg: 0 },
        { id: 'f-7', productName: 'หอมเจียวยางเขียว 100กรัม (รหัส OF02.02)', weightKg: 0 },
        { id: 'f-8', productName: 'กระเทียมเจียวC สูตร60 (รหัส FG03)', weightKg: 0 },
        { id: 'f-9', productName: 'กระเทียมเจียวA สูตร100 (รหัส FG06)', weightKg: 451 },
      ],
    },
    {
      id: 'stk-baseline-factory-20260908',
      dateKey: baseDate,
      shift: 'day',
      shiftLabel: 'ยอดยกมาเริ่มต้น (พร้อมขาย)',
      stockSource: 'factory',
      recordedBy: 'ปรับสต็อคโรงงาน (นับจริง)',
      note: 'สต็อคพร้อมขายโรงงาน ปรับปรุงใหม่: ยางแดง 225 กก., ยางเขียว 520 กก., หอมเจียวหนา 165 กก., กระเทียมD 1,890 กก., กระเทียมB 960 กก. (นอกนั้น 0 กก.)',
      totalWeightKg: 3760,
      createdAt: `${baseDate}T00:00:00.000Z`,
      items: [
        { id: 'f-1', productName: 'หอมเจียวยางแดง 5กก (รหัส OF01)', weightKg: 225 },
        { id: 'f-2', productName: 'หอมเจียวยางเขียว 5กก (รหัส OF02)', weightKg: 520 },
        { id: 'f-3', productName: 'หอมเจียวC 5กก (รหัส OF03)', weightKg: 165 },
        { id: 'f-4', productName: 'กระเทียมเจียวD สูตร40 (รหัส FG01)', weightKg: 1890 },
        { id: 'f-5', productName: 'กระเทียมเจียวB สูตร80 (รหัส FG04)', weightKg: 960 },
        { id: 'f-6', productName: 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)', weightKg: 0 },
        { id: 'f-7', productName: 'หอมเจียวยางเขียว 100กรัม (รหัส OF02.02)', weightKg: 0 },
        { id: 'f-8', productName: 'กระเทียมเจียวC สูตร60 (รหัส FG03)', weightKg: 0 },
        { id: 'f-9', productName: 'กระเทียมเจียวA สูตร100 (รหัส FG06)', weightKg: 0 },
      ],
    },
    {
      id: 'stk-baseline-online-20260908',
      dateKey: baseDate,
      shift: 'day',
      shiftLabel: 'กะเช้า (08:00 - 20:00)',
      stockSource: 'online',
      recordedBy: 'สุรีรัตน์ (แอดมินออนไลน์)',
      note: 'สต็อคเริ่มต้นคลังออนไลน์สำหรับ Shopee / TikTok / เพจ',
      totalWeightKg: 1350,
      createdAt: `${baseDate}T09:00:00.000Z`,
      items: [
        { id: 'onl-1', productName: 'หอมเจียวยางเขียว 5กก (รหัส OF02)', weightKg: 300 },
        { id: 'onl-2', productName: 'หอมเจียวยางแดง 5กก (รหัส OF01)', weightKg: 200 },
        { id: 'onl-3', productName: 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)', weightKg: 200 },
        { id: 'onl-4', productName: 'หอมเจียวยางเขียว 100กรัม (รหัส OF02.02)', weightKg: 150 },
        { id: 'onl-5', productName: 'หอมเจียวC 5กก (รหัส OF03)', weightKg: 100 },
        { id: 'onl-6', productName: 'กระเทียมเจียวD สูตร40 (รหัส FG01)', weightKg: 200 },
        { id: 'onl-7', productName: 'กระเทียมเจียวC สูตร60 (รหัส FG03)', weightKg: 200 },
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
        // Ensure stk-baseline-factory-20261001 is included
        const hasLatestBaseline = parsed.some((e: StockEntry) => e.id === 'stk-baseline-factory-20261001');
        if (!hasLatestBaseline) {
          const sample = getSampleStockEntries();
          const latest = sample.find((e) => e.id === 'stk-baseline-factory-20261001');
          if (latest) {
            const updatedList = [latest, ...parsed];
            saveStockEntriesToLocalStorage(updatedList);
            return updatedList;
          }
        }
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
  const orderedProductNames = [...FACTORY_STOCK_PRESET_NAMES];

  // 1. Calculate PRIOR cumulative stock entries & sales using the latest baseline on or before target dateKey
  const priorRemainingMap: Record<string, number> = {};

  orderedProductNames.forEach((pName) => {
    // Find all baseline entries on or before target dateKey for this product
    const baselines = stockEntries
      .filter((e) => matchStockSource(e.stockSource) && isBaselineStockEntry(e) && e.dateKey && e.dateKey <= dateKey)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    const latestBaseline = baselines.find((e) =>
      e.items.some((it) => normalizeProductName(it.productName) === pName)
    );

    let baselineWeight = 0;
    let baseDateKey = stockSourceFilter === 'online' ? ONLINE_STOCK_CUTOFF_DATE : FACTORY_STOCK_CUTOFF_DATE;

    if (latestBaseline) {
      baseDateKey = latestBaseline.dateKey;
      const bItem = latestBaseline.items.find((it) => normalizeProductName(it.productName) === pName);
      if (bItem) {
        baselineWeight = Number(bItem.weightKg) || 0;
      }
    }

    // Sum shifts after baseDateKey and strictly before target dateKey
    let shiftsAfterBaseline = 0;
    stockEntries.forEach((entry) => {
      if (matchStockSource(entry.stockSource) && !isBaselineStockEntry(entry)) {
        if (entry.dateKey && entry.dateKey > baseDateKey && entry.dateKey < dateKey) {
          entry.items.forEach((item) => {
            if (normalizeProductName(item.productName) === pName) {
              shiftsAfterBaseline += Number(item.weightKg) || 0;
            }
          });
        }
      }
    });

    // Sum orders on or after baseDateKey and strictly before target dateKey
    let ordersAfterBaseline = 0;
    orders.forEach((order) => {
      if (order.deliveryStatus === 'cancelled') return;
      if (!matchOrderSource(order.stockSource)) return;

      const d = new Date(order.createdAt);
      if (isNaN(d.getTime())) return;

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const oDateKey = `${y}-${m}-${day}`;

      if (oDateKey >= baseDateKey && oDateKey < dateKey) {
        order.items.forEach((item) => {
          if (normalizeProductName(item.productName) === pName) {
            ordersAfterBaseline += Number(item.weightKg) || 0;
          }
        });
      }
    });

    priorRemainingMap[pName] = Math.max(
      0,
      Math.round((baselineWeight + shiftsAfterBaseline - ordersAfterBaseline) * 100) / 100
    );
  });

  // 3. TODAY'S stock entries (dateKey === target dateKey)
  // Exclude baseline entries so they don't count as today's shift production
  const dayEntries = stockEntries.filter(
    (e) => e.dateKey === dateKey && matchStockSource(e.stockSource) && !isBaselineStockEntry(e)
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

    const cutoff = order.stockSource === 'online' ? ONLINE_STOCK_CUTOFF_DATE : FACTORY_STOCK_CUTOFF_DATE;

    const d = new Date(order.createdAt);
    if (isNaN(d.getTime())) return;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const oDateKey = `${y}-${m}-${day}`;

    if (oDateKey === dateKey && oDateKey >= cutoff) {
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

  const productBreakdown = orderedProductNames.map((pName) => {
    const pPriorRemaining = priorRemainingMap[pName] || 0;

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

  const cutoff = stockSource === 'online' ? ONLINE_STOCK_CUTOFF_DATE : FACTORY_STOCK_CUTOFF_DATE;

  // Find latest baseline for this product and stockSource
  const baselines = stockEntries
    .filter((e) => (e.stockSource || 'factory') === stockSource && isBaselineStockEntry(e) && e.dateKey)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const latestBaseline = baselines.find((e) =>
    e.items.some((it) => normalizeProductName(it.productName) === normName)
  );

  let baselineWeight = 0;
  let baseDateKey = cutoff;

  if (latestBaseline) {
    baseDateKey = latestBaseline.dateKey;
    const bItem = latestBaseline.items.find((it) => normalizeProductName(it.productName) === normName);
    if (bItem) {
      baselineWeight = Number(bItem.weightKg) || 0;
    }
  }

  // 1. Total produced in regular shifts after baseDateKey
  let shiftsAfterKg = 0;
  stockEntries.forEach((entry) => {
    const actualSource = entry.stockSource || 'factory';
    if (actualSource === stockSource && !isBaselineStockEntry(entry)) {
      if (!entry.dateKey || entry.dateKey > baseDateKey) {
        entry.items.forEach((item) => {
          if (normalizeProductName(item.productName) === normName) {
            shiftsAfterKg += Number(item.weightKg) || 0;
          }
        });
      }
    }
  });

  // 2. Total sold in orders on or after baseDateKey (non-cancelled, excluding excludeOrderId)
  let totalSoldKg = 0;
  orders.forEach((order) => {
    if (order.deliveryStatus === 'cancelled') return;
    if (excludeOrderId && order.id === excludeOrderId) return;
    const actualSource = order.stockSource || 'factory';
    if (actualSource === stockSource) {
      const d = new Date(order.createdAt);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const oDateKey = `${y}-${m}-${day}`;
        if (oDateKey < baseDateKey) return;
      }
      order.items.forEach((item) => {
        if (normalizeProductName(item.productName) === normName) {
          totalSoldKg += Number(item.weightKg) || 0;
        }
      });
    }
  });

  const totalProducedKg = Math.round((baselineWeight + shiftsAfterKg) * 100) / 100;
  const availableKg = Math.round((totalProducedKg - totalSoldKg) * 100) / 100;

  return {
    availableKg,
    totalProducedKg,
    totalSoldKg: Math.round(totalSoldKg * 100) / 100,
  };
}

/**
 * Get Daily Stock Summaries for all dates found in stock entries or orders
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

  // Collect dateKeys from stockEntries
  stockEntries.forEach((e) => {
    const cutoff = e.stockSource === 'online' ? ONLINE_STOCK_CUTOFF_DATE : FACTORY_STOCK_CUTOFF_DATE;
    if (e.dateKey && e.dateKey >= cutoff && matchStockSource(e.stockSource)) {
      datesSet.add(e.dateKey);
    }
  });

  // Collect dateKeys from orders
  orders.forEach((o) => {
    if (!matchOrderSource(o.stockSource)) return;
    const cutoff = o.stockSource === 'online' ? ONLINE_STOCK_CUTOFF_DATE : FACTORY_STOCK_CUTOFF_DATE;
    const d = new Date(o.createdAt);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const oDateKey = `${year}-${month}-${day}`;
      if (oDateKey >= cutoff) {
        datesSet.add(oDateKey);
      }
    }
  });

  // Always ensure today is present if >= cutoff
  const todayKey = getTodayDateKey();
  const filterCutoff = stockSourceFilter === 'online' ? ONLINE_STOCK_CUTOFF_DATE : FACTORY_STOCK_CUTOFF_DATE;
  if (todayKey >= filterCutoff) {
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

