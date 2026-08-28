import { PurchaseOrder } from '../types';
import { THAI_FULL_MONTHS, THAI_SHORT_MONTHS, formatCurrency, formatWeight } from './formatters';

export interface MonthlyProductStat {
  productName: string;
  packSizes: string[];
  totalWeightKg: number;
  totalRevenue: number;
  ordersCount: number;
  avgPricePerKg: number;
  revenueSharePercent: number;
  weightSharePercent: number;
  monthlyBreakdown?: Record<string, { weightKg: number; revenue: number; ordersCount: number }>;
}

export interface MonthlyProductSummary {
  monthKey: string; // e.g. "2026-08" or "all"
  monthLabel: string; // e.g. "สิงหาคม 2569" or "ทุกเดือน (รวมทั้งหมด)"
  shortLabel: string; // e.g. "ส.ค. 69" or "รวมทั้งหมด"
  totalRevenue: number;
  totalWeightKg: number;
  totalOrdersCount: number;
  distinctProductsCount: number;
  products: MonthlyProductStat[];
}

export interface CrossMonthMatrixRow {
  productName: string;
  packSizes: string[];
  totalWeightKg: number;
  totalRevenue: number;
  totalOrdersCount: number;
  avgPricePerKg: number;
  monthValues: Record<string, { weightKg: number; revenue: number; ordersCount: number }>;
}

/**
 * Get distinct available months with formatted labels
 */
export function getProductAvailableMonths(orders: PurchaseOrder[]): Array<{
  key: string;
  label: string;
  shortLabel: string;
  year: number;
  month: number;
  ordersCount: number;
  revenue: number;
  weightKg: number;
}> {
  const map: Record<string, {
    key: string;
    label: string;
    shortLabel: string;
    year: number;
    month: number;
    ordersCount: number;
    revenue: number;
    weightKg: number;
  }> = {};

  orders.forEach((order) => {
    const d = new Date(order.createdAt);
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
        year: y,
        month: m + 1,
        ordersCount: 0,
        revenue: 0,
        weightKg: 0,
      };
    }

    map[key].ordersCount += 1;
    map[key].revenue += order.totalAmount;
    map[key].weightKg += order.totalWeightKg;
  });

  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
}

/**
 * Compute monthly product sales summary for a specific month or all months
 */
export function getMonthlyProductSummary(
  orders: PurchaseOrder[],
  monthKey: string = 'all'
): MonthlyProductSummary {
  // Filter orders by monthKey
  const filteredOrders = monthKey === 'all'
    ? orders
    : orders.filter((o) => {
        const d = new Date(o.createdAt);
        if (isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === monthKey;
      });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalWeightKg = filteredOrders.reduce((sum, o) => sum + o.totalWeightKg, 0);
  const totalOrdersCount = filteredOrders.length;

  const productMap: Record<string, {
    productName: string;
    packSizesSet: Set<string>;
    totalWeightKg: number;
    totalRevenue: number;
    ordersCount: number;
  }> = {};

  filteredOrders.forEach((order) => {
    // Keep track of products in this order to count ordersCount accurately per product
    const productsInThisOrder = new Set<string>();

    order.items.forEach((item) => {
      const name = item.productName.trim() || 'สินค้าไม่ระบุชื่อ';
      if (!productMap[name]) {
        productMap[name] = {
          productName: name,
          packSizesSet: new Set<string>(),
          totalWeightKg: 0,
          totalRevenue: 0,
          ordersCount: 0,
        };
      }

      productMap[name].totalWeightKg += item.weightKg;
      productMap[name].totalRevenue += item.totalPrice;
      if (item.packSize) {
        productMap[name].packSizesSet.add(item.packSize);
      }

      productsInThisOrder.add(name);
    });

    productsInThisOrder.forEach((pName) => {
      if (productMap[pName]) {
        productMap[pName].ordersCount += 1;
      }
    });
  });

  const products: MonthlyProductStat[] = Object.values(productMap)
    .map((p) => {
      const avgPricePerKg = p.totalWeightKg > 0 ? p.totalRevenue / p.totalWeightKg : 0;
      const revenueSharePercent = totalRevenue > 0
        ? Math.round((p.totalRevenue / totalRevenue) * 1000) / 10
        : 0;
      const weightSharePercent = totalWeightKg > 0
        ? Math.round((p.totalWeightKg / totalWeightKg) * 1000) / 10
        : 0;

      return {
        productName: p.productName,
        packSizes: Array.from(p.packSizesSet).filter(Boolean),
        totalWeightKg: Math.round(p.totalWeightKg * 100) / 100,
        totalRevenue: Math.round(p.totalRevenue * 100) / 100,
        ordersCount: p.ordersCount,
        avgPricePerKg: Math.round(avgPricePerKg * 100) / 100,
        revenueSharePercent,
        weightSharePercent,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Label formatting
  let monthLabel = 'ทุกเดือน (รวมทั้งหมด)';
  let shortLabel = 'รวมทั้งหมด';

  if (monthKey !== 'all') {
    const [yStr, mStr] = monthKey.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    if (!isNaN(y) && !isNaN(m) && m >= 0 && m < 12) {
      const thaiYear = y + 543;
      monthLabel = `${THAI_FULL_MONTHS[m]} ${thaiYear}`;
      shortLabel = `${THAI_SHORT_MONTHS[m]} ${String(thaiYear).slice(-2)}`;
    }
  }

  return {
    monthKey,
    monthLabel,
    shortLabel,
    totalRevenue,
    totalWeightKg,
    totalOrdersCount,
    distinctProductsCount: products.length,
    products,
  };
}

/**
 * Generate cross-month matrix for all products across all available months
 */
export function getCrossMonthProductMatrix(orders: PurchaseOrder[]): {
  availableMonths: Array<{ key: string; label: string; shortLabel: string }>;
  rows: CrossMonthMatrixRow[];
  totalOverallRevenue: number;
  totalOverallWeightKg: number;
} {
  const availableMonths = getProductAvailableMonths(orders);
  const rowMap: Record<string, {
    productName: string;
    packSizesSet: Set<string>;
    totalWeightKg: number;
    totalRevenue: number;
    totalOrdersCount: number;
    monthValues: Record<string, { weightKg: number; revenue: number; ordersCount: number }>;
  }> = {};

  let totalOverallRevenue = 0;
  let totalOverallWeightKg = 0;

  orders.forEach((order) => {
    totalOverallRevenue += order.totalAmount;
    totalOverallWeightKg += order.totalWeightKg;

    const d = new Date(order.createdAt);
    if (isNaN(d.getTime())) return;
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const productsInOrder = new Set<string>();

    order.items.forEach((item) => {
      const name = item.productName.trim() || 'สินค้าไม่ระบุชื่อ';
      if (!rowMap[name]) {
        rowMap[name] = {
          productName: name,
          packSizesSet: new Set<string>(),
          totalWeightKg: 0,
          totalRevenue: 0,
          totalOrdersCount: 0,
          monthValues: {},
        };
      }

      if (!rowMap[name].monthValues[mKey]) {
        rowMap[name].monthValues[mKey] = { weightKg: 0, revenue: 0, ordersCount: 0 };
      }

      rowMap[name].totalWeightKg += item.weightKg;
      rowMap[name].totalRevenue += item.totalPrice;
      rowMap[name].monthValues[mKey].weightKg += item.weightKg;
      rowMap[name].monthValues[mKey].revenue += item.totalPrice;

      if (item.packSize) {
        rowMap[name].packSizesSet.add(item.packSize);
      }

      productsInOrder.add(name);
    });

    productsInOrder.forEach((pName) => {
      if (rowMap[pName]) {
        rowMap[pName].totalOrdersCount += 1;
        if (rowMap[pName].monthValues[mKey]) {
          rowMap[pName].monthValues[mKey].ordersCount += 1;
        }
      }
    });
  });

  const rows: CrossMonthMatrixRow[] = Object.values(rowMap)
    .map((r) => ({
      productName: r.productName,
      packSizes: Array.from(r.packSizesSet).filter(Boolean),
      totalWeightKg: Math.round(r.totalWeightKg * 100) / 100,
      totalRevenue: Math.round(r.totalRevenue * 100) / 100,
      totalOrdersCount: r.totalOrdersCount,
      avgPricePerKg: r.totalWeightKg > 0 ? Math.round((r.totalRevenue / r.totalWeightKg) * 100) / 100 : 0,
      monthValues: r.monthValues,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  return {
    availableMonths: availableMonths.map((m) => ({ key: m.key, label: m.label, shortLabel: m.shortLabel })),
    rows,
    totalOverallRevenue,
    totalOverallWeightKg,
  };
}

/**
 * Export Monthly Product Sales Summary to CSV (Excel with BOM UTF-8)
 */
export function exportMonthlyProductsToCSV(
  summary: MonthlyProductSummary,
  matrix?: { availableMonths: Array<{ key: string; label: string; shortLabel: string }>; rows: CrossMonthMatrixRow[] }
) {
  const rows: string[] = [];

  // Header Title
  rows.push(`"รายงานสรุปยอดขายตามสินค้า รายเดือน - โรงหมูสุมาลี (Sumalee Pork)"`);
  rows.push(`"ช่วงเวลาที่เลือก:","${summary.monthLabel}"`);
  rows.push(`"วันที่ส่งออกข้อมูล:","${new Intl.DateTimeFormat('th-TH', { dateStyle: 'full', timeStyle: 'medium' }).format(new Date())}"`);
  rows.push(`"ยอดขายรวมทั้งหมด:","${summary.totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท"`);
  rows.push(`"น้ำหนักขายรวม:","${summary.totalWeightKg.toLocaleString('th-TH', { minimumFractionDigits: 2 })} กก."`);
  rows.push(`"จำนวนคำสั่งซื้อ:","${summary.totalOrdersCount} บิล"`);
  rows.push(`"จำนวนรายการสินค้า:","${summary.distinctProductsCount} รายการ"`);
  rows.push('');

  // Table 1: Detailed Product Breakdown for the selected month
  rows.push(`"=== สรุปยอดขายแยกตามรายการสินค้า (${summary.monthLabel}) ==="`);
  rows.push(
    [
      '"อันดับ"',
      '"ชื่อสินค้า"',
      '"ขนาดบรรจุ/สเปก"',
      '"จำนวนคำสั่งซื้อ (บิล)"',
      '"น้ำหนักขายรวม (กก.)"',
      '"ยอดขายรวม (บาท)"',
      '"ราคาเฉลี่ย (บาท/กก.)"',
      '"สัดส่วนยอดขาย (% ยอดเงิน)"',
      '"สัดส่วนน้ำหนัก (% กก.)"',
    ].join(',')
  );

  summary.products.forEach((p, idx) => {
    rows.push(
      [
        `"${idx + 1}"`,
        `"${p.productName.replace(/"/g, '""')}"`,
        `"${p.packSizes.join(', ') || '-'}"`,
        `"${p.ordersCount}"`,
        `"${p.totalWeightKg.toFixed(2)}"`,
        `"${p.totalRevenue.toFixed(2)}"`,
        `"${p.avgPricePerKg.toFixed(2)}"`,
        `"${p.revenueSharePercent.toFixed(1)}%"`,
        `"${p.weightSharePercent.toFixed(1)}%"`,
      ].join(',')
    );
  });

  // Footer totals
  rows.push(
    [
      '"รวม"',
      `"ยอดรวมทั้งหมด ${summary.distinctProductsCount} สินค้า"`,
      '""',
      `"${summary.totalOrdersCount}"`,
      `"${summary.totalWeightKg.toFixed(2)}"`,
      `"${summary.totalRevenue.toFixed(2)}"`,
      `"${summary.totalWeightKg > 0 ? (summary.totalRevenue / summary.totalWeightKg).toFixed(2) : '0.00'}"`,
      '"100%"',
      '"100%"',
    ].join(',')
  );

  // If matrix data exists, add Table 2: Cross-Month Comparison Matrix
  if (matrix && matrix.availableMonths.length > 0) {
    rows.push('');
    rows.push('');
    rows.push('"=== ตารางเปรียบเทียบยอดขายสินค้ารายเดือน (ทุกเดือน) ==="');
    
    // Matrix header (Revenue)
    const headerColsRevenue = ['"อันดับ"', '"ชื่อสินค้า"', '"ขนาดบรรจุ"'];
    matrix.availableMonths.forEach((m) => {
      headerColsRevenue.push(`"ยอดเงิน ${m.label} (บาท)"`);
    });
    headerColsRevenue.push('"ยอดเงินรวมทุกเดือน (บาท)"');
    rows.push(headerColsRevenue.join(','));

    matrix.rows.forEach((r, idx) => {
      const colValues = [`"${idx + 1}"`, `"${r.productName.replace(/"/g, '""')}"`, `"${r.packSizes.join(', ') || '-'}"`];
      matrix.availableMonths.forEach((m) => {
        const val = r.monthValues[m.key]?.revenue || 0;
        colValues.push(`"${val.toFixed(2)}"`);
      });
      colValues.push(`"${r.totalRevenue.toFixed(2)}"`);
      rows.push(colValues.join(','));
    });

    // Matrix header (Weight)
    rows.push('');
    rows.push('"=== ตารางเปรียบเทียบน้ำหนักสินค้ารายเดือน (ทุกเดือน) ==="');
    const headerColsWeight = ['"อันดับ"', '"ชื่อสินค้า"', '"ขนาดบรรจุ"'];
    matrix.availableMonths.forEach((m) => {
      headerColsWeight.push(`"น้ำหนัก ${m.label} (กก.)"`);
    });
    headerColsWeight.push('"น้ำหนักรวมทุกเดือน (กก.)"');
    rows.push(headerColsWeight.join(','));

    matrix.rows.forEach((r, idx) => {
      const colValues = [`"${idx + 1}"`, `"${r.productName.replace(/"/g, '""')}"`, `"${r.packSizes.join(', ') || '-'}"`];
      matrix.availableMonths.forEach((m) => {
        const val = r.monthValues[m.key]?.weightKg || 0;
        colValues.push(`"${val.toFixed(2)}"`);
      });
      colValues.push(`"${r.totalWeightKg.toFixed(2)}"`);
      rows.push(colValues.join(','));
    });
  }

  // Generate file download with UTF-8 BOM
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanMonthName = summary.monthLabel.replace(/[/\\?%*:|"<>]/g, '_');
  a.download = `สรุปยอดขายตามสินค้า_รายเดือน_${cleanMonthName}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
