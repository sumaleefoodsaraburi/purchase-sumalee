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

    // Compute aggregated products bought by this customer
    const productMap: Record<string, { productName: string; packSize?: string; totalWeightKg: number; totalAmount: number; ordersCount: number }> = {};
    orders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const pack = it.packSize || (it.productName.includes('100') ? '100g' : it.productName.includes('500') ? '500g' : it.productName.includes('5กก') ? '5kg' : '1kg');
        const pKey = `${it.productName.trim()}__${pack}`;
        if (!productMap[pKey]) {
          productMap[pKey] = {
            productName: it.productName.trim(),
            packSize: it.packSize || pack,
            totalWeightKg: 0,
            totalAmount: 0,
            ordersCount: 0,
          };
        }
        productMap[pKey].totalWeightKg += (it.weightKg || 0);
        productMap[pKey].totalAmount += (it.totalPrice || ((it.weightKg || 0) * (it.pricePerKg || 0)) || 0);
        productMap[pKey].ordersCount += 1;
      });
    });

    const productsBought = Object.values(productMap).sort((a, b) => b.totalWeightKg - a.totalWeightKg);

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
      productsBought,
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
 * Export Customer Summary with Purchased Items overview to CSV (Excel compatible)
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
    'รายการสินค้าที่เคยสั่งซื้อ (น้ำหนัก, ยอดเงิน)',
    'น้ำหนักรวมสะสม (กก.)',
    'ยอดซื้อรวมสะสม (บาท)',
    'สั่งซื้อครั้งแรก',
    'สั่งซื้อล่าสุด',
  ];

  const rows = customers.map((c, idx) => {
    const productsSummaryText = (c.productsBought || [])
      .map((p) => `${p.productName}${p.packSize ? ` [${p.packSize}]` : ''} (${p.totalWeightKg} กก. - ${p.totalAmount.toLocaleString()}฿)`)
      .join('; ');

    return [
      idx + 1,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.address.replace(/"/g, '""')}"`,
      `"${c.tier}"`,
      c.totalOrdersCount,
      c.repeatTimes,
      c.isRepeatCustomer ? '"ลูกค้าซื้อซ้ำ"' : '"ลูกค้าใหม่ (ซื้อ 1 ครั้ง)"',
      `"${productsSummaryText.replace(/"/g, '""')}"`,
      c.totalWeightKg,
      c.totalRevenue,
      `"${formatThaiShortDate(c.firstOrderDate)}"`,
      `"${formatThaiShortDate(c.lastOrderDate)}"`,
    ];
  });

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

/**
 * Export Detailed Customer x Products Breakdown to CSV (Excel compatible)
 * Lists every product ordered by each customer, its weight (kg), and revenue (THB).
 */
export function exportCustomerProductsDetailToCSV(
  customers: CustomerStat[],
  title: string = 'customer_product_breakdown'
): void {
  const headers = [
    'ลำดับลูกค้า',
    'ชื่อลูกค้า',
    'เบอร์โทรศัพท์',
    'ที่อยู่จัดส่ง',
    'ระดับลูกค้า',
    'สินค้าที่สั่งซื้อ',
    'ขนาดบรรจุ/แพ็ค',
    'น้ำหนักสินค้านี้ (กก.)',
    'ยอดเงินสินค้านี้ (บาท)',
    'จำนวนครั้งที่สั่งสินค้านี้ (บิล)',
    'น้ำหนักรวมสะสมของลูกค้า (กก.)',
    'ยอดซื้อรวมสะสมของลูกค้า (บาท)',
    'จำนวนออเดอร์ทั้งหมด (บิล)',
    'ซื้อซ้ำกี่ครั้งแล้ว',
    'สั่งซื้อครั้งแรก',
    'สั่งซื้อล่าสุด',
  ];

  const rows: Array<(string | number)[]> = [];

  let custIdx = 1;
  customers.forEach((c) => {
    const products = c.productsBought && c.productsBought.length > 0
      ? c.productsBought
      : [{ productName: 'ไม่มีข้อมูลสินค้า', packSize: '-', totalWeightKg: c.totalWeightKg, totalAmount: c.totalRevenue, ordersCount: c.totalOrdersCount }];

    products.forEach((p) => {
      rows.push([
        custIdx,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.phone}"`,
        `"${c.address.replace(/"/g, '""')}"`,
        `"${c.tier}"`,
        `"${p.productName.replace(/"/g, '""')}"`,
        `"${p.packSize || '-'}"`,
        p.totalWeightKg,
        p.totalAmount,
        p.ordersCount,
        c.totalWeightKg,
        c.totalRevenue,
        c.totalOrdersCount,
        c.repeatTimes,
        `"${formatThaiShortDate(c.firstOrderDate)}"`,
        `"${formatThaiShortDate(c.lastOrderDate)}"`,
      ]);
    });
    custIdx++;
  });

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

/**
 * Extract distinct months with order stats for an individual customer
 */
export function getCustomerAvailableMonths(customer: CustomerStat): {
  key: string;
  label: string;
  shortLabel: string;
  count: number;
  revenue: number;
  weightKg: number;
}[] {
  const map: Record<
    string,
    { key: string; label: string; shortLabel: string; count: number; revenue: number; weightKg: number }
  > = {};

  (customer.orders || []).forEach((o) => {
    const d = new Date(o.createdAt);
    if (isNaN(d.getTime())) return;
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;

    if (!map[key]) {
      const thaiYear = y + 543;
      map[key] = {
        key,
        label: `${THAI_FULL_MONTHS[m]} ${thaiYear}`,
        shortLabel: `${THAI_SHORT_MONTHS[m]} ${String(thaiYear).slice(-2)}`,
        count: 0,
        revenue: 0,
        weightKg: 0,
      };
    }
    map[key].count += 1;
    map[key].revenue += o.totalAmount || 0;
    map[key].weightKg += o.totalWeightKg || 0;
  });

  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
}

/**
 * Computes customer data filtered by a specific month key (e.g. '2026-08' or 'all')
 */
export function getCustomerDataForMonth(customer: CustomerStat, monthKey?: string): {
  monthKey: string;
  monthLabel: string;
  orders: PurchaseOrder[];
  ordersCount: number;
  totalRevenue: number;
  totalWeightKg: number;
  productsBought: {
    productName: string;
    packSize?: string;
    totalWeightKg: number;
    totalAmount: number;
    ordersCount: number;
  }[];
  firstOrderDate: string;
  lastOrderDate: string;
} {
  const isAll = !monthKey || monthKey === 'all';
  const allOrders = customer.orders || [];

  let orders = allOrders;
  let monthLabel = 'ทุกเดือน (สะสมทั้งหมด)';

  if (!isAll) {
    orders = allOrders.filter((o) => {
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return false;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}` === monthKey;
    });

    const [yStr, mStr] = (monthKey || '').split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      monthLabel = `${THAI_FULL_MONTHS[m - 1]} ${y + 543}`;
    }
  }

  const ordersCount = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalWeightKg = orders.reduce((sum, o) => sum + (o.totalWeightKg || 0), 0);

  const productMap: Record<
    string,
    { productName: string; packSize?: string; totalWeightKg: number; totalAmount: number; ordersCount: number }
  > = {};

  orders.forEach((o) => {
    (o.items || []).forEach((it) => {
      const pack =
        it.packSize ||
        (it.productName.includes('100')
          ? '100g'
          : it.productName.includes('500')
          ? '500g'
          : it.productName.includes('5กก')
          ? '5kg'
          : '1kg');
      const pKey = `${it.productName.trim()}__${pack}`;
      if (!productMap[pKey]) {
        productMap[pKey] = {
          productName: it.productName.trim(),
          packSize: it.packSize || pack,
          totalWeightKg: 0,
          totalAmount: 0,
          ordersCount: 0,
        };
      }
      productMap[pKey].totalWeightKg += it.weightKg || 0;
      productMap[pKey].totalAmount +=
        it.totalPrice || (it.weightKg || 0) * (it.pricePerKg || 0) || 0;
      productMap[pKey].ordersCount += 1;
    });
  });

  const productsBought = Object.values(productMap).sort((a, b) => b.totalWeightKg - a.totalWeightKg);

  const sortedChronological = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const firstOrderDate = sortedChronological.length > 0 ? sortedChronological[0].createdAt : customer.firstOrderDate;
  const lastOrderDate =
    sortedChronological.length > 0
      ? sortedChronological[sortedChronological.length - 1].createdAt
      : customer.lastOrderDate;

  return {
    monthKey: monthKey || 'all',
    monthLabel,
    orders,
    ordersCount,
    totalRevenue,
    totalWeightKg,
    productsBought,
    firstOrderDate,
    lastOrderDate,
  };
}

/**
 * Export a Single Customer's complete Order & Product Summary to CSV (Excel compatible)
 * Supports exporting either all-time accumulated data or a specific month's data.
 */
export function exportSingleCustomerSummaryToCSV(customer: CustomerStat, monthKey?: string): void {
  const monthData = getCustomerDataForMonth(customer, monthKey);
  const isMonthly = monthKey && monthKey !== 'all';
  const lines: string[] = [];

  // 1. Header Information Block
  lines.push(
    `"สรุปข้อมูลการสั่งซื้อและรายการสินค้าลูกค้า ${
      isMonthly ? `ประจำเดือน ${monthData.monthLabel}` : '(สะสมทุกเดือน)'
    }"`
  );
  lines.push(`"ชื่อลูกค้า:","${customer.name.replace(/"/g, '""')}"`);
  lines.push(`"เบอร์โทรศัพท์:","${customer.phone}"`);
  lines.push(`"ที่อยู่จัดส่งล่าสุด:","${(customer.address || '-').replace(/"/g, '""')}"`);
  lines.push(`"ระดับลูกค้า:","${customer.tier}"`);
  lines.push(`"ช่วงเวลาของรายงาน:","${monthData.monthLabel}"`);
  lines.push(
    `"จำนวนออเดอร์ในรายงาน:",${monthData.ordersCount} บิล (ยอดสะสมตลอดกาล ${customer.totalOrdersCount} บิล)`
  );
  lines.push(
    `"น้ำหนักสินค้ารวมในรายงาน (กก.):",${monthData.totalWeightKg} (ยอดสะสมตลอดกาล ${customer.totalWeightKg} กก.)`
  );
  lines.push(
    `"ยอดสั่งซื้อรวมในรายงาน (บาท):",${monthData.totalRevenue} (ยอดสะสมตลอดกาล ${customer.totalRevenue} บาท)`
  );
  lines.push(`"วันที่สั่งซื้อครั้งแรกในรายงาน:","${formatThaiShortDate(monthData.firstOrderDate)}"`);
  lines.push(`"วันที่สั่งซื้อล่าสุดในรายงาน:","${formatThaiShortDate(monthData.lastOrderDate)}"`);
  lines.push(
    `"วันที่ออกรายงาน:","${new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}"`
  );
  lines.push(''); // blank row

  // 2. Table 1: Aggregated Products Bought
  lines.push(
    `"--- สรุปรายการสินค้าที่สั่งซื้อใน ${monthData.monthLabel} (${monthData.productsBought.length} รายการ) ---"`
  );
  lines.push('ลำดับ,ชื่อสินค้า,ขนาดบรรจุ,จำนวนครั้งที่สั่ง (บิล),น้ำหนักรวม (กก.),ยอดเงินรวม (บาท),สัดส่วนยอดเงิน (%)');

  monthData.productsBought.forEach((p, idx) => {
    const sharePercent =
      monthData.totalRevenue > 0
        ? (Math.round((p.totalAmount / monthData.totalRevenue) * 1000) / 10).toFixed(1)
        : '0.0';
    lines.push(
      [
        idx + 1,
        `"${p.productName.replace(/"/g, '""')}"`,
        `"${p.packSize || '-'}"`,
        p.ordersCount,
        p.totalWeightKg,
        p.totalAmount,
        `${sharePercent}%`,
      ].join(',')
    );
  });

  // Products Table Total Row
  lines.push(
    [
      '',
      `"รวมสินค้าใน${monthData.monthLabel}"`,
      '""',
      monthData.ordersCount,
      monthData.totalWeightKg,
      monthData.totalRevenue,
      '"100%"',
    ].join(',')
  );

  lines.push(''); // blank row
  lines.push(''); // blank row

  // 3. Table 2: Detailed Order Bills History
  lines.push(
    `"--- ประวัติใบสั่งซื้อแต่ละบิลใน ${monthData.monthLabel} (${monthData.orders.length} บิล) ---"`
  );
  lines.push(
    'ลำดับบิล,รหัสคำสั่งซื้อ (PO),วันที่สั่งซื้อ,สถานะจัดส่ง,สถานะชำระเงิน,รายการสินค้าในบิล,น้ำหนักบิล (กก.),ยอดเงินบิล (บาท),ค่าจัดส่ง (บาท),VAT (บาท),จำนวนกล่อง,หมายเหตุ'
  );

  monthData.orders.forEach((ord, idx) => {
    const itemsText = (ord.items || [])
      .map(
        (it) =>
          `${it.productName}${it.packSize ? ` [${it.packSize}]` : ''} (${it.weightKg} กก. @${it.pricePerKg}฿ = ${it.totalPrice}฿)`
      )
      .join('; ');

    const deliveryStatusText =
      ord.deliveryStatus === 'delivered'
        ? 'จัดส่งสำเร็จ'
        : ord.deliveryStatus === 'shipped'
        ? 'จัดส่งแล้ว'
        : ord.deliveryStatus === 'cancelled'
        ? 'ยกเลิก'
        : 'รอดำเนินการ';

    const paymentStatusText =
      ord.paymentStatus === 'paid'
        ? 'ชำระแล้ว'
        : ord.paymentStatus === 'cod'
        ? 'เก็บเงินปลายทาง'
        : 'รอชำระ';

    lines.push(
      [
        idx + 1,
        `"${ord.orderNumber || ord.id || '-'}"`,
        `"${formatThaiShortDate(ord.createdAt)}"`,
        `"${deliveryStatusText}"`,
        `"${paymentStatusText}"`,
        `"${itemsText.replace(/"/g, '""')}"`,
        ord.totalWeightKg || 0,
        ord.totalAmount || 0,
        ord.shippingFee || 0,
        ord.vatAmount || 0,
        ord.boxCount || 0,
        `"${(ord.note || '-').replace(/"/g, '""')}"`,
      ].join(',')
    );
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const sanitizedCustomerName = customer.name.replace(/[/\\?%*:|"<> ]/g, '_');
  const suffix = isMonthly ? `_${monthKey}` : `_all_months_${new Date().toISOString().slice(0, 10)}`;
  link.setAttribute('download', `sumalee_customer_${sanitizedCustomerName}${suffix}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

