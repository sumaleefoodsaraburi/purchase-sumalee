import { StockEntry, PurchaseOrder, DailyStockSummary, ProductionShift } from '../types';
import { THAI_FULL_MONTHS, THAI_SHORT_MONTHS } from './formatters';

const STORAGE_KEY = 'sumalee_stock_entries_v1';

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
 * Normalize product names to match the factory stock products.
 * Returns null if the product is not one of the stock products.
 */
export function normalizeProductName(name: string): string | null {
  if (!name) return null;
  const t = name.trim();
  if (t.includes('OF01') || t.includes('ยางแดง')) return 'หอมเจียวยางแดง 5กก (รหัส OF01)';
  if (t.includes('OF02.02') || ((t.includes('100กรัม') || t.includes('100 กรัม')) && (t.includes('หอม') || t.includes('ยางเขียว')))) return 'หอมเจียวยางเขียว 100กรัม (รหัส OF02.02)';
  if (t.includes('OF02.01') || ((t.includes('500กรัม') || t.includes('500 กรัม')) && (t.includes('หอม') || t.includes('ยางเขียว')))) return 'หอมเจียวยางเขียว 500กรัม (รหัส OF02.01)';
  if (t.includes('OF02') || t.includes('ยางเขียว')) return 'หอมเจียวยางเขียว 5กก (รหัส OF02)';
  if (t.includes('OF03') || t.includes('แป้งหนา') || t.includes('หอมเจียวC') || t.includes('หอมเจียว C') || t.includes('หอมเจียว c')) return 'หอมเจียวC 5กก (รหัส OF03)';

  // Garlic stock items
  if (t.includes('FG01') || (t.includes('กระเทียม') && (t.includes('สูตร40') || t.includes('สูตร 40') || t.includes('สูตร 4') || t.includes('สูตร4') || t.includes('เจียวD') || t.includes('เจียว D')))) return 'กระเทียมเจียวD สูตร40 (รหัส FG01)';
  if (t.includes('FG03') || (t.includes('กระเทียม') && (t.includes('สูตร60') || t.includes('สูตร 60') || t.includes('สูตร 6') || t.includes('สูตร6') || t.includes('เจียวC') || t.includes('เจียว C')))) return 'กระเทียมเจียวC สูตร60 (รหัส FG03)';
  if (t.includes('FG04') || (t.includes('กระเทียม') && (t.includes('สูตร80') || t.includes('สูตร 80') || t.includes('สูตร 8') || t.includes('สูตร8') || t.includes('เจียวB') || t.includes('เจียว B')))) return 'กระเทียมเจียวB สูตร80 (รหัส FG04)';
  if (t.includes('FG06') || (t.includes('กระเทียม') && (t.includes('สูตร100') || t.includes('สูตร 100') || t.includes('สูตร 1') || t.includes('สูตร1') || t.includes('เจียวA') || t.includes('เจียว A')))) return 'กระเทียมเจียวA สูตร100 (รหัส FG06)';

  return null;
}

/**
 * Sample Initial Stock Production Entries using preset products
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
      recordedBy: 'สมชาย (หัวหน้ากะเช้า)',
      note: 'ผลิตล็อตปกติประจำวัน เครื่องจักรทำงานปกติ',
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
      id: 'stk-20260803-night',
      dateKey: todayStr,
      shift: 'night',
      shiftLabel: 'กะดึก (20:00 - 08:00)',
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
      id: 'stk-20260801-day',
      dateKey: prevStr,
      shift: 'day',
      shiftLabel: 'กะเช้า (08:00 - 20:00)',
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
 * Includes prior days' remaining balance (ยอดคงเหลือยกมาจากเมื่อวาน) starting from 1 Aug 2026
 */
export function calculateDailyStockSummary(
  dateKey: string,
  stockEntries: StockEntry[],
  orders: PurchaseOrder[]
): DailyStockSummary {
  // 1. Calculate PRIOR cumulative stock entries (STOCK_CUTOFF_DATE <= entry.dateKey < target dateKey)
  const priorProducedMap: Record<string, number> = {};

  stockEntries.forEach((entry) => {
    if (entry.dateKey && entry.dateKey >= STOCK_CUTOFF_DATE && entry.dateKey < dateKey) {
      entry.items.forEach((item) => {
        const pName = normalizeProductName(item.productName);
        if (pName) {
          priorProducedMap[pName] = (priorProducedMap[pName] || 0) + item.weightKg;
        }
      });
    }
  });

  // 2. Calculate PRIOR cumulative order sales (STOCK_CUTOFF_DATE <= order dateKey < target dateKey)
  const priorSoldMap: Record<string, number> = {};

  orders.forEach((order) => {
    if (order.deliveryStatus === 'cancelled') return;
    const d = new Date(order.createdAt);
    if (isNaN(d.getTime())) return;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const oDateKey = `${y}-${m}-${day}`;

    if (oDateKey >= STOCK_CUTOFF_DATE && oDateKey < dateKey) {
      order.items.forEach((item) => {
        const pName = normalizeProductName(item.productName);
        if (pName) {
          priorSoldMap[pName] = (priorSoldMap[pName] || 0) + item.weightKg;
        }
      });
    }
  });

  // 3. TODAY'S stock entries (dateKey === target dateKey)
  const dayEntries = stockEntries.filter((e) => e.dateKey === dateKey);

  const producedProductMap: Record<string, { dayKg: number; nightKg: number; totalKg: number }> = {};

  dayEntries.forEach((entry) => {
    const isDay = entry.shift === 'day';

    entry.items.forEach((item) => {
      const pName = normalizeProductName(item.productName);
      if (!pName) return;

      if (!producedProductMap[pName]) {
        producedProductMap[pName] = { dayKg: 0, nightKg: 0, totalKg: 0 };
      }
      if (isDay) {
        producedProductMap[pName].dayKg += item.weightKg;
      } else {
        producedProductMap[pName].nightKg += item.weightKg;
      }
      producedProductMap[pName].totalKg += item.weightKg;
    });
  });

  // 4. TODAY'S orders (order dateKey === target dateKey)
  const soldProductMap: Record<string, number> = {};

  orders.forEach((order) => {
    if (order.deliveryStatus === 'cancelled') return;

    const d = new Date(order.createdAt);
    if (isNaN(d.getTime())) return;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const oDateKey = `${y}-${m}-${day}`;

    if (oDateKey === dateKey) {
      order.items.forEach((item) => {
        const pName = normalizeProductName(item.productName);
        if (pName) {
          soldProductMap[pName] = (soldProductMap[pName] || 0) + item.weightKg;
        }
      });
    }
  });

  // 5. Exclusively calculate the 4 preset products
  let priorRemainingKg = 0;
  let dayShiftWeightKg = 0;
  let nightShiftWeightKg = 0;
  let totalProducedKg = 0;
  let totalAvailableKg = 0;
  let totalSoldKg = 0;

  const productBreakdown = FACTORY_STOCK_PRESET_NAMES.map((pName) => {
    const pPriorProd = priorProducedMap[pName] || 0;
    const pPriorSold = priorSoldMap[pName] || 0;
    const pPriorRemaining = pPriorProd - pPriorSold;

    const prod = producedProductMap[pName] || { dayKg: 0, nightKg: 0, totalKg: 0 };
    const pTodayProduced = prod.totalKg;
    const pAvailable = pPriorRemaining + pTodayProduced;

    const pTodaySold = soldProductMap[pName] || 0;
    const pRemaining = pAvailable - pTodaySold;

    priorRemainingKg += pPriorRemaining;
    dayShiftWeightKg += prod.dayKg;
    nightShiftWeightKg += prod.nightKg;
    totalProducedKg += pTodayProduced;
    totalAvailableKg += pAvailable;
    totalSoldKg += pTodaySold;

    return {
      productName: pName,
      priorRemainingKg: pPriorRemaining,
      dayShiftKg: prod.dayKg,
      nightShiftKg: prod.nightKg,
      producedKg: pTodayProduced,
      availableKg: pAvailable,
      soldKg: pTodaySold,
      remainingKg: pRemaining,
    };
  });

  const remainingStockKg = totalAvailableKg - totalSoldKg;

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
    priorRemainingKg,
    dayShiftWeightKg,
    nightShiftWeightKg,
    totalProducedKg,
    totalAvailableKg,
    totalSoldKg,
    remainingStockKg,
    entriesCount: dayEntries.length,
    productBreakdown,
  };
}

/**
 * Get Daily Stock Summaries for all dates found in stock entries or orders (from Aug 1 onwards)
 */
export function getAllDailyStockSummaries(
  stockEntries: StockEntry[],
  orders: PurchaseOrder[]
): DailyStockSummary[] {
  const datesSet = new Set<string>();

  // Collect dateKeys from stockEntries (Aug 1 onwards)
  stockEntries.forEach((e) => {
    if (e.dateKey && e.dateKey >= STOCK_CUTOFF_DATE) datesSet.add(e.dateKey);
  });

  // Collect dateKeys from orders (Aug 1 onwards)
  orders.forEach((o) => {
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

  return datesArray.map((dKey) => calculateDailyStockSummary(dKey, stockEntries, orders));
}
