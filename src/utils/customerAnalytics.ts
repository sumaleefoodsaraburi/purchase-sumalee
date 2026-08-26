import { PurchaseOrder, CustomerStat, CustomerPeriodSummary } from '../types';
import { THAI_FULL_MONTHS, THAI_SHORT_MONTHS, formatThaiShortDate, formatCurrency, formatWeight } from './formatters';

/**
 * Normalizes customer key to link repeat purchases by phone number or clean name
 */
export function normalizeCustomerKey(name: string, phone: string): string {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone.length >= 8) {
    return `tel:${cleanPhone}`;
  }
  const cleanName = (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `name:${cleanName || 'unknown'}`;
}

/**
 * Computes comprehensive customer statistics across all orders
 */
export function getAllCustomerStats(
  allOrders: PurchaseOrder[],
  filterOrders?: PurchaseOrder[],
  startDate?: Date,
  endDate?: Date
): CustomerStat[] {
  // Sort all orders chronologically ascending
  const sortedOrders = [...allOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Map of customerKey -> all orders
  const customerMap: Record<
    string,
    {
      key: string;
      latestName: string;
      latestPhone: string;
      latestAddress: string;
      allOrders: PurchaseOrder[];
    }
  > = {};

  sortedOrders.forEach((order) => {
    const key = normalizeCustomerKey(order.customer.name, order.customer.phone);
    if (!customerMap[key]) {
      customerMap[key] = {
        key,
        latestName: order.customer.name.trim(),
        latestPhone: order.customer.phone.trim(),
        latestAddress: order.customer.address.trim(),
        allOrders: [],
      };
    }
    // Update latest contact info if present
    if (order.customer.name.trim()) customerMap[key].latestName = order.customer.name.trim();
    if (order.customer.phone.trim()) customerMap[key].latestPhone = order.customer.phone.trim();
    if (order.customer.address.trim()) customerMap[key].latestAddress = order.customer.address.trim();

    customerMap[key].allOrders.push(order);
  });

  const periodOrderIds = new Set(filterOrders ? filterOrders.map((o) => o.id) : sortedOrders.map((o) => o.id));

  const results: CustomerStat[] = [];

  Object.values(customerMap).forEach((entry) => {
    const orders = entry.allOrders;
    const totalOrdersCount = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalWeightKg = orders.reduce((sum, o) => sum + (o.totalWeightKg || 0), 0);
    const firstOrderDate = orders[0].createdAt;
    const lastOrderDate = orders[orders.length - 1].createdAt;
    const repeatTimes = Math.max(0, totalOrdersCount - 1);
    const isRepeatCustomer = totalOrdersCount > 1;

    let tier: CustomerStat['tier'] = 'ใหม่ (1 ครั้ง)';
    if (totalOrdersCount >= 5) {
      tier = 'VIP (5+ ครั้ง)';
    } else if (totalOrdersCount >= 3) {
      tier = 'ประจำ (3-4 ครั้ง)';
    } else if (totalOrdersCount === 2) {
      tier = 'ซื้อซ้ำ (2 ครั้ง)';
    }

    // Period specific analysis
    const inPeriodOrders = orders.filter((o) => periodOrderIds.has(o.id));
    const ordersInPeriodCount = inPeriodOrders.length;
    const revenueInPeriod = inPeriodOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const weightInPeriod = inPeriodOrders.reduce((sum, o) => sum + (o.totalWeightKg || 0), 0);

    const firstOrderTime = new Date(firstOrderDate).getTime();
    const hasPriorOrdersBeforePeriod = startDate ? firstOrderTime < startDate.getTime() : false;

    const isNewInPeriod = startDate && endDate
      ? firstOrderTime >= startDate.getTime() && firstOrderTime <= endDate.getTime()
      : totalOrdersCount === 1;

    const isRepeatInPeriod = hasPriorOrdersBeforePeriod || (ordersInPeriodCount > 1 && !isNewInPeriod) || (isRepeatCustomer && ordersInPeriodCount > 0);

    results.push({
      id: entry.key,
      name: entry.latestName || 'ไม่ระบุชื่อ',
      phone: entry.latestPhone || '-',
      address: entry.latestAddress || '-',
      totalOrdersCount,
      totalRevenue,
      totalWeightKg,
      firstOrderDate,
      lastOrderDate,
      repeatTimes,
      isRepeatCustomer,
      tier,
      orders: orders.slice().reverse(), // Newest first for UI display
      ordersInPeriodCount,
      revenueInPeriod,
      weightInPeriod,
      isNewInPeriod,
      isRepeatInPeriod,
    });
  });

  return results;
}

/**
 * Groups orders by month and computes new vs repeat customer summary
 */
export function getMonthlyCustomerBreakdown(allOrders: PurchaseOrder[]): CustomerPeriodSummary[] {
  if (allOrders.length === 0) return [];

  // Sort orders
  const sorted = [...allOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Track the first ever order date for each customer
  const firstOrderMap = new Map<string, Date>();
  sorted.forEach((o) => {
    const key = normalizeCustomerKey(o.customer.name, o.customer.phone);
    const d = new Date(o.createdAt);
    if (!firstOrderMap.has(key) || d < firstOrderMap.get(key)!) {
      firstOrderMap.set(key, d);
    }
  });

  // Group by YYYY-MM
  const monthMap: Record<string, { year: number; month: number; orders: PurchaseOrder[] }> = {};

  sorted.forEach((o) => {
    const date = new Date(o.createdAt);
    if (isNaN(date.getTime())) return;
    const y = date.getFullYear();
    const m = date.getMonth(); // 0-11
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;

    if (!monthMap[key]) {
      monthMap[key] = { year: y, month: m + 1, orders: [] };
    }
    monthMap[key].orders.push(o);
  });

  const keys = Object.keys(monthMap).sort((a, b) => b.localeCompare(a)); // Newest month first

  return keys.map((key) => {
    const item = monthMap[key];
    const monthOrders = item.orders;
    const thaiYear = item.year + 543;
    const mIndex = item.month - 1;
    const periodLabel = `${THAI_FULL_MONTHS[mIndex]} ${thaiYear}`;

    // Unique customers in this month
    const customersInMonth = new Map<string, PurchaseOrder[]>();
    monthOrders.forEach((o) => {
      const cKey = normalizeCustomerKey(o.customer.name, o.customer.phone);
      if (!customersInMonth.has(cKey)) {
        customersInMonth.set(cKey, []);
      }
      customersInMonth.get(cKey)!.push(o);
    });

    const totalCustomers = customersInMonth.size;
    let newCustomers = 0;
    let repeatCustomers = 0;

    // Start & End of this month
    const startOfMonth = new Date(item.year, item.month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(item.year, item.month, 0, 23, 59, 59, 999);

    customersInMonth.forEach((custOrders, cKey) => {
      const firstEverDate = firstOrderMap.get(cKey);
      const isNewInThisMonth = firstEverDate && firstEverDate >= startOfMonth && firstEverDate <= endOfMonth;

      if (isNewInThisMonth) {
        newCustomers += 1;
      } else {
        repeatCustomers += 1;
      }
    });

    const totalRevenue = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalWeightKg = monthOrders.reduce((sum, o) => sum + (o.totalWeightKg || 0), 0);
    const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 1000) / 10 : 0;
    const avgRevenuePerCustomer = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;

    return {
      periodKey: key,
      periodLabel,
      startDate: startOfMonth.toISOString().slice(0, 10),
      endDate: endOfMonth.toISOString().slice(0, 10),
      totalCustomers,
      newCustomers,
      repeatCustomers,
      repeatRate,
      totalOrders: monthOrders.length,
      totalRevenue,
      totalWeightKg,
      avgRevenuePerCustomer,
    };
  });
}

/**
 * Gets start and end of week (Monday to Sunday)
 */
function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const start = new Date(d.setDate(diffToMonday));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Formats a short Thai date range (e.g. 18 ส.ค. - 24 ส.ค. 69)
 */
export function formatThaiDateRange(startDate: Date, endDate: Date): string {
  const sDay = startDate.getDate();
  const sMonth = THAI_SHORT_MONTHS[startDate.getMonth()];
  const eDay = endDate.getDate();
  const eMonth = THAI_SHORT_MONTHS[endDate.getMonth()];
  const eYear = String(endDate.getFullYear() + 543).slice(-2);

  if (sMonth === eMonth) {
    return `${sDay} - ${eDay} ${eMonth} ${eYear}`;
  }
  return `${sDay} ${sMonth} - ${eDay} ${eMonth} ${eYear}`;
}

/**
 * Groups orders by week and computes new vs repeat customer summary
 */
export function getWeeklyCustomerBreakdown(allOrders: PurchaseOrder[], limitWeeks: number = 10): CustomerPeriodSummary[] {
  if (allOrders.length === 0) return [];

  const sorted = [...allOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Track the first ever order date for each customer
  const firstOrderMap = new Map<string, Date>();
  sorted.forEach((o) => {
    const key = normalizeCustomerKey(o.customer.name, o.customer.phone);
    const d = new Date(o.createdAt);
    if (!firstOrderMap.has(key) || d < firstOrderMap.get(key)!) {
      firstOrderMap.set(key, d);
    }
  });

  // Collect weeks present in orders
  const weekMap: Record<
    string,
    {
      start: Date;
      end: Date;
      orders: PurchaseOrder[];
    }
  > = {};

  sorted.forEach((o) => {
    const d = new Date(o.createdAt);
    if (isNaN(d.getTime())) return;
    const { start, end } = getWeekRange(d);
    const key = start.toISOString().slice(0, 10);

    if (!weekMap[key]) {
      weekMap[key] = { start, end, orders: [] };
    }
    weekMap[key].orders.push(o);
  });

  // Sort weeks descending (most recent week first)
  const sortedWeekKeys = Object.keys(weekMap).sort((a, b) => b.localeCompare(a)).slice(0, limitWeeks);

  return sortedWeekKeys.map((key, idx) => {
    const { start, end, orders: weekOrders } = weekMap[key];
    const dateRangeLabel = formatThaiDateRange(start, end);
    const periodLabel = idx === 0 ? `สัปดาห์นี้ (${dateRangeLabel})` : idx === 1 ? `สัปดาห์ที่แล้ว (${dateRangeLabel})` : `สัปดาห์ (${dateRangeLabel})`;

    // Unique customers in this week
    const customersInWeek = new Map<string, PurchaseOrder[]>();
    weekOrders.forEach((o) => {
      const cKey = normalizeCustomerKey(o.customer.name, o.customer.phone);
      if (!customersInWeek.has(cKey)) {
        customersInWeek.set(cKey, []);
      }
      customersInWeek.get(cKey)!.push(o);
    });

    const totalCustomers = customersInWeek.size;
    let newCustomers = 0;
    let repeatCustomers = 0;

    customersInWeek.forEach((custOrders, cKey) => {
      const firstEverDate = firstOrderMap.get(cKey);
      const isNewInThisWeek = firstEverDate && firstEverDate >= start && firstEverDate <= end;

      if (isNewInThisWeek) {
        newCustomers += 1;
      } else {
        repeatCustomers += 1;
      }
    });

    const totalRevenue = weekOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalWeightKg = weekOrders.reduce((sum, o) => sum + (o.totalWeightKg || 0), 0);
    const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 1000) / 10 : 0;
    const avgRevenuePerCustomer = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;

    return {
      periodKey: key,
      periodLabel,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      totalCustomers,
      newCustomers,
      repeatCustomers,
      repeatRate,
      totalOrders: weekOrders.length,
      totalRevenue,
      totalWeightKg,
      avgRevenuePerCustomer,
    };
  });
}

/**
 * Calculates customer frequency distribution (how many bought 1x, 2x, 3x, 4-5x, 6+x)
 */
export function getCustomerFrequencyDistribution(customers: CustomerStat[]): {
  once: number;
  twice: number;
  threeTimes: number;
  fourToFive: number;
  sixPlus: number;
} {
  const dist = {
    once: 0,
    twice: 0,
    threeTimes: 0,
    fourToFive: 0,
    sixPlus: 0,
  };

  customers.forEach((c) => {
    const count = c.totalOrdersCount;
    if (count === 1) dist.once += 1;
    else if (count === 2) dist.twice += 1;
    else if (count === 3) dist.threeTimes += 1;
    else if (count >= 4 && count <= 5) dist.fourToFive += 1;
    else if (count >= 6) dist.sixPlus += 1;
  });

  return dist;
}

/**
 * Export Customer Data to CSV formatted for Excel
 */
export function exportCustomersToCSV(customers: CustomerStat[], title: string = 'customer_summary'): void {
  const headers = [
    'ลำดับ',
    'ชื่อลูกค้า',
    'เบอร์โทร',
    'ที่อยู่',
    'ระดับลูกค้า',
    'จำนวนออเดอร์ทั้งหมด (ครั้ง)',
    'ซื้อซ้ำกี่ครั้งแล้ว',
    'สถานะลูกค้า',
    'สั่งซื้อครั้งแรก',
    'สั่งซื้อล่าสุด',
    'น้ำหนักรวมสะสม (กก.)',
    'ยอดซื้อรวมสะสม (บาท)',
  ];

  const rows = customers.map((c, idx) => [
    idx + 1,
    `"${c.name.replace(/"/g, '""')}"`,
    `"${c.phone}"`,
    `"${c.address.replace(/"/g, '""')}"`,
    `"${c.tier}"`,
    c.totalOrdersCount,
    c.repeatTimes,
    c.isRepeatCustomer ? '"ลูกค้าซื้อซ้ำ"' : '"ลูกค้าใหม่ (ซื้อ 1 ครั้ง)"',
    `"${formatThaiShortDate(c.firstOrderDate)}"`,
    `"${formatThaiShortDate(c.lastOrderDate)}"`,
    c.totalWeightKg,
    c.totalRevenue,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `sumalee_${title}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
