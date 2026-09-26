import { PurchaseOrder, SalesMetrics } from '../types';

/**
 * Format currency in Thai Baht (฿)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format weight in Kilograms (กก.)
 */
export function formatWeight(kg: number): string {
  return `${new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(kg)} กก.`;
}

/**
 * Format date to Thai localized format
 * Example: 31 ก.ค. 2026, 14:30 น.
 */
export function formatThaiDateTime(isoString: string): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format date to short Thai date string
 * Example: 31 ก.ค. 69
 */
export function formatThaiShortDate(isoString: string): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('th-TH', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Helper to check if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Filter orders within N days from now
 */
export function filterOrdersByDays(orders: PurchaseOrder[], days: number): PurchaseOrder[] {
  const now = new Date();
  // Set start threshold to N days ago at 00:00:00
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - (days - 1));
  threshold.setHours(0, 0, 0, 0);

  return orders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    return orderDate >= threshold;
  });
}

/**
 * Filter orders for today only
 */
export function filterOrdersToday(orders: PurchaseOrder[]): PurchaseOrder[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return orders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    return orderDate >= startOfToday;
  });
}

/**
 * Compute sales metrics from an array of orders
 */
export function calculateSalesMetrics(orders: PurchaseOrder[]): SalesMetrics {
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalWeightKg = orders.reduce((sum, order) => sum + order.totalWeightKg, 0);
  const orderCount = orders.length;
  const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

  return {
    totalRevenue,
    orderCount,
    totalWeightKg,
    averageOrderValue,
  };
}

/**
 * Group orders by day for the last N days (for charts)
 */
export interface DailySalesData {
  dateKey: string;
  displayDate: string;
  revenue: number;
  weightKg: number;
  ordersCount: number;
}

export function getDailySalesChartData(orders: PurchaseOrder[], daysCount: number): DailySalesData[] {
  const result: DailySalesData[] = [];
  const today = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);

    // Orders for this specific day
    const dayOrders = orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= d && orderDate < nextDay;
    });

    const revenue = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const weightKg = dayOrders.reduce((sum, o) => sum + o.totalWeightKg, 0);

    const monthNamesThai = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const displayDate = `${d.getDate()} ${monthNamesThai[d.getMonth()]}`;

    result.push({
      dateKey: d.toISOString().split('T')[0],
      displayDate,
      revenue,
      weightKg,
      ordersCount: dayOrders.length,
    });
  }

  return result;
}

/**
 * Get Top Products breakdown
 */
export interface ProductStat {
  name: string;
  totalWeightKg: number;
  totalRevenue: number;
  ordersCount: number;
}

export function getTopProducts(orders: PurchaseOrder[], limit: number = 5): ProductStat[] {
  const map: Record<string, ProductStat> = {};

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const name = item.productName.trim() || 'สินค้าไม่ระบุชื่อ';
      if (!map[name]) {
        map[name] = {
          name,
          totalWeightKg: 0,
          totalRevenue: 0,
          ordersCount: 0,
        };
      }
      map[name].totalWeightKg += item.weightKg;
      map[name].totalRevenue += item.totalPrice;
      map[name].ordersCount += 1;
    });
  });

  return Object.values(map)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

export interface MonthOption {
  yearMonthKey: string; // e.g. "2026-07"
  label: string;        // e.g. "กรกฎาคม 2569"
  shortLabel: string;   // e.g. "ก.ค. 69"
  year: number;
  month: number;
  orderCount: number;
  totalRevenue: number;
  totalWeightKg: number;
}

export const THAI_FULL_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_SHORT_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

/**
 * Extract distinct months available in the order list with sales statistics
 */
export function getAvailableMonths(orders: PurchaseOrder[]): MonthOption[] {
  const map: Record<string, MonthOption> = {};

  orders.forEach((o) => {
    const date = new Date(o.createdAt);
    if (isNaN(date.getTime())) return;

    const y = date.getFullYear();
    const m = date.getMonth(); // 0-11
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;

    if (!map[key]) {
      const thaiYear = y + 543;
      map[key] = {
        yearMonthKey: key,
        label: `${THAI_FULL_MONTHS[m]} ${thaiYear}`,
        shortLabel: `${THAI_SHORT_MONTHS[m]} ${String(thaiYear).slice(-2)}`,
        year: y,
        month: m + 1,
        orderCount: 0,
        totalRevenue: 0,
        totalWeightKg: 0,
      };
    }

    map[key].orderCount += 1;
    map[key].totalRevenue += o.totalAmount;
    map[key].totalWeightKg += o.totalWeightKg;
  });

  return Object.values(map).sort((a, b) => b.yearMonthKey.localeCompare(a.yearMonthKey));
}

/**
 * Filter orders by specific year-month key (e.g. "2026-06")
 */
export function filterOrdersByMonth(orders: PurchaseOrder[], yearMonthKey: string): PurchaseOrder[] {
  if (!yearMonthKey || yearMonthKey === 'all') return orders;
  return orders.filter((o) => {
    const d = new Date(o.createdAt);
    if (isNaN(d.getTime())) return false;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return key === yearMonthKey;
  });
}

export interface DailyWeightSummary {
  dateKey: string;          // e.g. "2026-08-03"
  dateThaiFull: string;     // e.g. "3 สิงหาคม 2569"
  dateThaiShort: string;    // e.g. "3 ส.ค. 69"
  totalWeightKg: number;
  totalOrders: number;
  totalRevenue: number;
  products: Array<{
    productName: string;
    weightKg: number;
    revenue: number;
  }>;
}

/**
 * Group orders by exact day and compute total weight (กก.) and product weight breakdown for each day
 */
export function getDailyWeightBreakdown(orders: PurchaseOrder[]): DailyWeightSummary[] {
  const map: Record<string, {
    dateKey: string;
    dateObj: Date;
    totalWeightKg: number;
    totalOrders: number;
    totalRevenue: number;
    productMap: Record<string, { productName: string; weightKg: number; revenue: number }>;
  }> = {};

  orders.forEach((order) => {
    const d = new Date(order.createdAt);
    if (isNaN(d.getTime())) return;

    // Local YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    if (!map[dateKey]) {
      map[dateKey] = {
        dateKey,
        dateObj: new Date(year, d.getMonth(), d.getDate()),
        totalWeightKg: 0,
        totalOrders: 0,
        totalRevenue: 0,
        productMap: {},
      };
    }

    map[dateKey].totalWeightKg += order.totalWeightKg;
    map[dateKey].totalOrders += 1;
    map[dateKey].totalRevenue += order.totalAmount;

    order.items.forEach((item) => {
      const pName = item.productName.trim() || 'สินค้าไม่ระบุชื่อ';
      if (!map[dateKey].productMap[pName]) {
        map[dateKey].productMap[pName] = {
          productName: pName,
          weightKg: 0,
          revenue: 0,
        };
      }
      map[dateKey].productMap[pName].weightKg += item.weightKg;
      map[dateKey].productMap[pName].revenue += item.totalPrice;
    });
  });

  const result: DailyWeightSummary[] = Object.values(map).map((entry) => {
    const d = entry.dateObj;
    const thaiYear = d.getFullYear() + 543;
    const mIdx = d.getMonth();

    const dateThaiFull = `${d.getDate()} ${THAI_FULL_MONTHS[mIdx]} ${thaiYear}`;
    const dateThaiShort = `${d.getDate()} ${THAI_SHORT_MONTHS[mIdx]} ${String(thaiYear).slice(-2)}`;

    const products = Object.values(entry.productMap).sort((a, b) => b.weightKg - a.weightKg);

    return {
      dateKey: entry.dateKey,
      dateThaiFull,
      dateThaiShort,
      totalWeightKg: entry.totalWeightKg,
      totalOrders: entry.totalOrders,
      totalRevenue: entry.totalRevenue,
      products,
    };
  });

  // Sort descending by date (newest date first)
  return result.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

/**
 * Filter orders by specific YYYY-MM-DD date string (e.g. "2026-08-02")
 */
export function filterOrdersByExactDate(orders: PurchaseOrder[], yyyyMmDd: string): PurchaseOrder[] {
  if (!yyyyMmDd) return orders;
  return orders.filter((o) => {
    const d = new Date(o.createdAt);
    if (isNaN(d.getTime())) return false;
    const tzoffset = d.getTimezoneOffset() * 60000;
    const localDateStr = new Date(d.getTime() - tzoffset).toISOString().split('T')[0];
    return localDateStr === yyyyMmDd;
  });
}

/**
 * Generate PO Number in YYYYMMDD-XXX format based on order date and existing orders
 * Example: 20260802-001, 20260701-002
 */
export function generatePoNumber(
  targetDateInput: string | Date,
  existingOrders: PurchaseOrder[],
  currentOrderId?: string
): string {
  const d = new Date(targetDateInput);
  if (isNaN(d.getTime())) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    return `${dateStr}-001`;
  }

  // Format YYYYMMDD
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`; // e.g. 20260802

  // YYYY-MM-DD for comparison
  const targetDateYmd = `${year}-${month}-${day}`;

  // Find all orders on the same day (excluding current order if editing)
  const sameDayOrders = existingOrders.filter((o) => {
    if (currentOrderId && o.id === currentOrderId) return false;
    const od = new Date(o.createdAt);
    if (isNaN(od.getTime())) return false;
    const oYear = od.getFullYear();
    const oMonth = String(od.getMonth() + 1).padStart(2, '0');
    const oDay = String(od.getDate()).padStart(2, '0');
    return `${oYear}-${oMonth}-${oDay}` === targetDateYmd;
  });

  // Calculate next sequence
  const nextSeq = sameDayOrders.length + 1;
  const seqPadded = String(nextSeq).padStart(3, '0'); // e.g. 001, 002

  return `${datePrefix}-${seqPadded}`;
}

/**
 * Generate Receipt Number in RC-YYYYMMDD-XXX format from orderNumber
 * Example: RC-20260802-001
 */
export function generateReceiptNumber(orderNumber: string): string {
  if (!orderNumber) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    return `RC-${dateStr}-001`;
  }
  const clean = orderNumber.replace(/^PO-?/i, '');
  return `RC-${clean}`;
}

/**
 * Convert Thai currency number to Thai Baht text (e.g. 1500 -> หนึ่งพันห้าร้อยบาทถ้วน)
 */
export function thaiBahtText(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'ศูนย์บาทถ้วน';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  // Round to 2 decimal places
  const rounded = Math.round(absAmount * 100) / 100;
  const [intPartStr, decPartStr = '00'] = rounded.toFixed(2).split('.');

  const digitWords = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const posWords = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

  function convertGroup(groupStr: string): string {
    let result = '';
    const len = groupStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(groupStr[i], 10);
      const pos = len - 1 - i;
      if (digit === 0) continue;

      if (pos === 1) {
        // tens
        if (digit === 1) {
          result += 'สิบ';
        } else if (digit === 2) {
          result += 'ยี่สิบ';
        } else {
          result += digitWords[digit] + 'สิบ';
        }
      } else if (pos === 0) {
        // units
        if (digit === 1 && len > 1 && parseInt(groupStr[len - 2], 10) > 0) {
          result += 'เอ็ด';
        } else {
          result += digitWords[digit];
        }
      } else {
        result += digitWords[digit] + posWords[pos];
      }
    }
    return result;
  }

  function convertInteger(intStr: string): string {
    if (intStr === '0' || intStr === '') return '';
    let result = '';
    let remaining = intStr;

    while (remaining.length > 0) {
      const chunkLen = remaining.length % 6 || 6;
      const chunk = remaining.slice(0, chunkLen);
      remaining = remaining.slice(chunkLen);

      const chunkText = convertGroup(chunk);
      if (chunkText) {
        result += chunkText + (remaining.length > 0 ? 'ล้าน' : '');
      }
    }
    return result;
  }

  let bahtStr = '';
  const intVal = parseInt(intPartStr, 10);
  if (intVal === 0 && decPartStr !== '00') {
    // only satang
    bahtStr = '';
  } else {
    bahtStr = convertInteger(intPartStr) + 'บาท';
  }

  let satangStr = '';
  const satangVal = parseInt(decPartStr, 10);
  if (satangVal === 0) {
    satangStr = 'ถ้วน';
  } else {
    satangStr = convertGroup(decPartStr) + 'สตางค์';
  }

  return (isNegative ? 'ลบ' : '') + bahtStr + satangStr;
}



