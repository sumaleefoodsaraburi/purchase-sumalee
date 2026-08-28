import React, { useState, useMemo } from 'react';
import { PurchaseOrder } from '../types';
import {
  MonthlyProductSummary,
  getMonthlyProductSummary,
  getProductAvailableMonths,
  getCrossMonthProductMatrix,
  exportMonthlyProductsToCSV,
} from '../utils/productAnalytics';
import { formatCurrency, formatWeight } from '../utils/formatters';
import {
  Package,
  Calendar,
  Layers,
  FileSpreadsheet,
  Search,
  ArrowUpDown,
  TrendingUp,
  Award,
  Scale,
  DollarSign,
  BarChart2,
  Table as TableIcon,
  Check,
  Percent,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';

interface MonthlyProductSalesSummaryProps {
  orders: PurchaseOrder[];
  selectedMonthKey?: string;
  onSelectMonth?: (monthKey: string) => void;
}

type ViewMode = 'table' | 'matrix' | 'chart';
type SortField = 'revenue' | 'weight' | 'orders' | 'name' | 'avgPrice';
type MatrixValueType = 'revenue' | 'weight' | 'orders';

const CHART_COLORS = [
  '#059669', // Emerald 600
  '#2563EB', // Blue 600
  '#7C3AED', // Purple 600
  '#D97706', // Amber 600
  '#DC2626', // Red 600
  '#0891B2', // Cyan 600
  '#4F46E5', // Indigo 600
  '#EA580C', // Orange 600
  '#16A34A', // Green 600
  '#9333EA', // Purple
  '#64748B', // Slate 500
];

export const MonthlyProductSalesSummary: React.FC<MonthlyProductSalesSummaryProps> = ({
  orders,
  selectedMonthKey: externalMonthKey,
  onSelectMonth,
}) => {
  // Local state for month selection (fallback if not controlled externally)
  const [internalMonthKey, setInternalMonthKey] = useState<string>('all');
  const activeMonthKey = externalMonthKey !== undefined ? externalMonthKey : internalMonthKey;

  const handleMonthChange = (key: string) => {
    if (onSelectMonth) {
      onSelectMonth(key);
    }
    setInternalMonthKey(key);
  };

  // View mode: 'table' (Single month detailed list), 'matrix' (Cross-month table), 'chart' (Visual charts)
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Matrix display value type
  const [matrixValueType, setMatrixValueType] = useState<MatrixValueType>('revenue');

  // Available months
  const availableMonths = useMemo(() => getProductAvailableMonths(orders), [orders]);

  // Current month summary
  const monthSummary = useMemo(
    () => getMonthlyProductSummary(orders, activeMonthKey),
    [orders, activeMonthKey]
  );

  // Cross-month matrix data
  const matrixData = useMemo(() => getCrossMonthProductMatrix(orders), [orders]);

  // Filtered & sorted products for table view
  const displayedProducts = useMemo(() => {
    let list = [...monthSummary.products];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) =>
        p.productName.toLowerCase().includes(q) ||
        p.packSizes.some((s) => s.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'revenue') {
        comparison = a.totalRevenue - b.totalRevenue;
      } else if (sortField === 'weight') {
        comparison = a.totalWeightKg - b.totalWeightKg;
      } else if (sortField === 'orders') {
        comparison = a.ordersCount - b.ordersCount;
      } else if (sortField === 'avgPrice') {
        comparison = a.avgPricePerKg - b.avgPricePerKg;
      } else if (sortField === 'name') {
        comparison = a.productName.localeCompare(b.productName, 'th');
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return list;
  }, [monthSummary.products, searchQuery, sortField, sortDirection]);

  // Best selling hero product for the selected month
  const heroProduct = monthSummary.products.length > 0 ? monthSummary.products[0] : null;

  // Chart data for top 10 products
  const chartData = useMemo(() => {
    return monthSummary.products.slice(0, 10).map((p) => ({
      name: p.productName.length > 18 ? p.productName.substring(0, 16) + '...' : p.productName,
      fullName: p.productName,
      revenue: p.totalRevenue,
      weightKg: p.totalWeightKg,
      ordersCount: p.ordersCount,
      share: p.revenueSharePercent,
    }));
  }, [monthSummary.products]);

  // Handle Export Excel
  const handleExportCSV = () => {
    exportMonthlyProductsToCSV(monthSummary, matrixData);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
      
      {/* 1. SECTION HEADER & ACTION BUTTONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
            <Package className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                สรุปยอดขายตามสินค้า รายเดือน (Monthly Product Sales Summary)
              </h3>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 text-xs font-bold rounded-full border border-blue-200">
                {monthSummary.monthLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              วิเคราะห์ยอดขายแยกตามชนิดสินค้า ขนาดบรรจุ ปริมาณน้ำหนัก (กก.) ยอดเงิน และสัดส่วนรายได้
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>ตารางสินค้า</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'matrix'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>เปรียบเทียบทุกเดือน</span>
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'chart'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-purple-600" />
              <span>กราฟวิเคราะห์</span>
            </button>
          </div>

          {/* Export to Excel */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            title="ส่งออกรายงานยอดขายตามสินค้ารายเดือน เป็นไฟล์ Excel (CSV UTF-8)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Excel</span>
          </button>
        </div>
      </div>

      {/* 2. MONTH SELECTOR PILLS */}
      <div className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>เลือกช่วงเดือนเพื่อดูยอดขายสินค้า:</span>
          </div>
          <span className="text-[11px] text-slate-400">
            มีข้อมูลทั้งหมด {availableMonths.length} เดือน
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => handleMonthChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeMonthKey === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ทุกเดือน (รวม {orders.length} บิล)</span>
          </button>

          {availableMonths.map((m) => {
            const isSelected = activeMonthKey === m.key;
            return (
              <button
                key={m.key}
                onClick={() => handleMonthChange(m.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-1 ring-emerald-400'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                <span>{m.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {m.ordersCount} บิล
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. QUICK KPI HIGHLIGHT CARDS FOR THE SELECTED MONTH */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Total Revenue for Month */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>ยอดขายสินค้า ({monthSummary.shortLabel})</span>
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {formatCurrency(monthSummary.totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-500">
            จากคำสั่งซื้อทั้งหมด {monthSummary.totalOrdersCount} บิล
          </p>
        </div>

        {/* KPI 2: Total Weight for Month */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-xl border border-blue-200/80 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-blue-800">
            <span className="flex items-center gap-1">
              <Scale className="w-4 h-4 text-blue-600" />
              <span>น้ำหนักขายรวม ({monthSummary.shortLabel})</span>
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 font-mono">
            {formatWeight(monthSummary.totalWeightKg)}
          </div>
          <p className="text-[11px] text-slate-500">
            เฉลี่ย {monthSummary.totalOrdersCount > 0 ? (monthSummary.totalWeightKg / monthSummary.totalOrdersCount).toFixed(1) : 0} กก./บิล
          </p>
        </div>

        {/* KPI 3: Distinct Products Count */}
        <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50/50 p-4 rounded-xl border border-purple-200/80 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-purple-800">
            <span className="flex items-center gap-1">
              <Package className="w-4 h-4 text-purple-600" />
              <span>จำนวนชนิดสินค้าที่ขายได้</span>
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 font-mono">
            {monthSummary.distinctProductsCount} <span className="text-sm font-semibold text-purple-600">รายการ</span>
          </div>
          <p className="text-[11px] text-slate-500">
            มีการสั่งซื้อในเดือน {monthSummary.shortLabel}
          </p>
        </div>

        {/* KPI 4: Top Hero Product */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 rounded-xl border border-amber-200/80 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800">
            <span className="flex items-center gap-1">
              <Award className="w-4 h-4 text-amber-600" />
              <span>สินค้าขายดีอันดับ 1 (Top Hero)</span>
            </span>
            {heroProduct && (
              <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-1.5 py-0.2 rounded-md">
                {heroProduct.revenueSharePercent}% ยอดขาย
              </span>
            )}
          </div>
          <div className="text-sm font-black text-slate-900 truncate" title={heroProduct?.productName || '-'}>
            {heroProduct ? heroProduct.productName : '-'}
          </div>
          <p className="text-[11px] text-amber-800 font-mono font-semibold">
            {heroProduct ? `${formatCurrency(heroProduct.totalRevenue)} (${formatWeight(heroProduct.totalWeightKg)})` : '-'}
          </p>
        </div>

      </div>

      {/* 4. VIEW CONTENT: TABLE OR MATRIX OR CHART */}
      {viewMode === 'table' && (
        <div className="space-y-4">
          
          {/* Search and Sort Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อสินค้า หรือขนาดบรรจุ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>เรียงตาม:</span>
              </span>
              
              <button
                onClick={() => toggleSort('revenue')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  sortField === 'revenue'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>ยอดเงิน</span>
                {sortField === 'revenue' && <ArrowUpDown className="w-3 h-3" />}
              </button>

              <button
                onClick={() => toggleSort('weight')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  sortField === 'weight'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>น้ำหนัก (กก.)</span>
                {sortField === 'weight' && <ArrowUpDown className="w-3 h-3" />}
              </button>

              <button
                onClick={() => toggleSort('orders')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  sortField === 'orders'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>จำนวนบิล</span>
                {sortField === 'orders' && <ArrowUpDown className="w-3 h-3" />}
              </button>

              <button
                onClick={() => toggleSort('name')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  sortField === 'name'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>ชื่อสินค้า</span>
                {sortField === 'name' && <ArrowUpDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Detailed Product Sales Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>ชื่อสินค้า</span>
                      {sortField === 'name' && <ArrowUpDown className="w-3 h-3 text-emerald-600" />}
                    </div>
                  </th>
                  <th className="py-3 px-3">ขนาดบรรจุ / สเปก</th>
                  <th
                    className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSort('orders')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>สั่งซื้อ (บิล)</span>
                      {sortField === 'orders' && <ArrowUpDown className="w-3 h-3 text-purple-600" />}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSort('weight')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>น้ำหนักขายรวม (กก.)</span>
                      {sortField === 'weight' && <ArrowUpDown className="w-3 h-3 text-blue-600" />}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSort('avgPrice')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>ราคาเฉลี่ย/กก.</span>
                      {sortField === 'avgPrice' && <ArrowUpDown className="w-3 h-3 text-slate-600" />}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSort('revenue')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>ยอดเงินรวม (บาท)</span>
                      {sortField === 'revenue' && <ArrowUpDown className="w-3 h-3 text-emerald-600" />}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right w-36">สัดส่วนยอดขาย (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      ไม่พบข้อมูลสินค้าที่ตรงกับเงื่อนไขในเดือน {monthSummary.monthLabel}
                    </td>
                  </tr>
                ) : (
                  displayedProducts.map((prod, idx) => {
                    const isTop1 = idx === 0 && sortField === 'revenue' && sortDirection === 'desc';
                    const isTop2 = idx === 1 && sortField === 'revenue' && sortDirection === 'desc';
                    const isTop3 = idx === 2 && sortField === 'revenue' && sortDirection === 'desc';

                    return (
                      <tr
                        key={prod.productName}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Rank Badge */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-mono font-black inline-flex items-center justify-center ${
                              isTop1
                                ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs'
                                : isTop2
                                ? 'bg-slate-200 text-slate-700 border border-slate-300'
                                : isTop3
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>

                        {/* Product Name */}
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{prod.productName}</span>
                            {isTop1 && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-300 flex items-center gap-0.5">
                                <Award className="w-3 h-3 text-amber-600" />
                                <span>อันดับ 1</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Pack Sizes */}
                        <td className="py-3 px-3">
                          {prod.packSizes && prod.packSizes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {prod.packSizes.map((s, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Orders Count */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                          {prod.ordersCount} <span className="text-[10px] text-slate-400 font-normal">บิล</span>
                        </td>

                        {/* Weight Sold */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatWeight(prod.totalWeightKg)}
                          <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                            <div
                              className="bg-blue-500 h-1 rounded-full"
                              style={{ width: `${Math.min(prod.weightSharePercent, 100)}%` }}
                            ></div>
                          </div>
                        </td>

                        {/* Average Price per Kg */}
                        <td className="py-3 px-3 text-right font-mono text-slate-600 text-[11px]">
                          {prod.avgPricePerKg > 0 ? `${prod.avgPricePerKg.toFixed(1)} ฿` : '-'}
                        </td>

                        {/* Total Revenue */}
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 text-sm">
                          {formatCurrency(prod.totalRevenue)}
                        </td>

                        {/* Revenue Share Bar & Percentage */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(prod.revenueSharePercent, 100)}%` }}
                              ></div>
                            </div>
                            <span className="font-mono font-bold text-slate-700 text-[11px] w-10 text-right">
                              {prod.revenueSharePercent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer Totals */}
              {displayedProducts.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100/80 text-slate-900 font-black border-t-2 border-slate-300">
                    <td colSpan={3} className="py-3 px-3 text-right">
                      รวมทั้งหมด ({monthSummary.monthLabel}):
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-900">
                      {monthSummary.totalOrdersCount} บิล
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-blue-800">
                      {formatWeight(monthSummary.totalWeightKg)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 text-xs">
                      {monthSummary.totalWeightKg > 0
                        ? `${(monthSummary.totalRevenue / monthSummary.totalWeightKg).toFixed(1)} ฿`
                        : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 text-base">
                      {formatCurrency(monthSummary.totalRevenue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      100%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

        </div>
      )}

      {/* 5. VIEW CONTENT: CROSS-MONTH MATRIX COMPARISON */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/60 p-3 rounded-xl border border-blue-200/80">
            <div className="text-xs text-blue-950">
              <span className="font-bold">📊 ตารางเปรียบเทียบยอดขายสินค้ารายเดือน:</span> ดูแนวโน้มยอดขายและปริมาณของแต่ละสินค้าในทุกเดือนที่มีข้อมูล
            </div>

            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-blue-200 text-xs font-bold self-start sm:self-auto">
              <span className="text-[11px] text-slate-500 px-1">แสดงค่า:</span>
              <button
                onClick={() => setMatrixValueType('revenue')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  matrixValueType === 'revenue'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                ยอดเงิน (บาท)
              </button>
              <button
                onClick={() => setMatrixValueType('weight')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  matrixValueType === 'weight'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                น้ำหนัก (กก.)
              </button>
              <button
                onClick={() => setMatrixValueType('orders')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  matrixValueType === 'orders'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                จำนวนบิล
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3 min-w-[180px]">ชื่อสินค้า</th>
                  <th className="py-3 px-3">ขนาดบรรจุ</th>
                  {matrixData.availableMonths.map((m) => (
                    <th key={m.key} className="py-3 px-3 text-right min-w-[120px]">
                      <div className="text-slate-900 font-bold">{m.shortLabel}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{m.label}</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right bg-slate-100 font-black text-slate-900 min-w-[130px]">
                    รวมทุกเดือน
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData.rows.map((row, idx) => {
                  return (
                    <tr key={row.productName} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {row.productName}
                      </td>
                      <td className="py-2.5 px-3">
                        {row.packSizes.length > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                            {row.packSizes.join(', ')}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Values for each month */}
                      {matrixData.availableMonths.map((m) => {
                        const mVal = row.monthValues[m.key];
                        let displayStr = '-';
                        let isPositive = false;

                        if (mVal) {
                          if (matrixValueType === 'revenue') {
                            displayStr = mVal.revenue > 0 ? formatCurrency(mVal.revenue) : '-';
                            isPositive = mVal.revenue > 0;
                          } else if (matrixValueType === 'weight') {
                            displayStr = mVal.weightKg > 0 ? formatWeight(mVal.weightKg) : '-';
                            isPositive = mVal.weightKg > 0;
                          } else {
                            displayStr = mVal.ordersCount > 0 ? `${mVal.ordersCount} บิล` : '-';
                            isPositive = mVal.ordersCount > 0;
                          }
                        }

                        return (
                          <td
                            key={m.key}
                            className={`py-2.5 px-3 text-right font-mono text-xs ${
                              isPositive
                                ? matrixValueType === 'revenue'
                                  ? 'text-emerald-700 font-bold bg-emerald-50/30'
                                  : matrixValueType === 'weight'
                                  ? 'text-blue-700 font-bold bg-blue-50/30'
                                  : 'text-purple-700 font-bold bg-purple-50/30'
                                : 'text-slate-300'
                            }`}
                          >
                            {displayStr}
                          </td>
                        );
                      })}

                      {/* Overall Total for this row */}
                      <td className="py-2.5 px-3 text-right font-mono font-black bg-slate-50/80">
                        {matrixValueType === 'revenue' && (
                          <span className="text-emerald-700 text-xs">{formatCurrency(row.totalRevenue)}</span>
                        )}
                        {matrixValueType === 'weight' && (
                          <span className="text-blue-700 text-xs">{formatWeight(row.totalWeightKg)}</span>
                        )}
                        {matrixValueType === 'orders' && (
                          <span className="text-purple-700 text-xs">{row.totalOrdersCount} บิล</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-300">
                  <td colSpan={3} className="py-3 px-3 text-right">
                    ยอดรวมทุกสินค้า:
                  </td>
                  {matrixData.availableMonths.map((m) => {
                    const mSummary = getMonthlyProductSummary(orders, m.key);
                    return (
                      <td key={m.key} className="py-3 px-3 text-right font-mono">
                        {matrixValueType === 'revenue' && (
                          <span className="text-emerald-700">{formatCurrency(mSummary.totalRevenue)}</span>
                        )}
                        {matrixValueType === 'weight' && (
                          <span className="text-blue-700">{formatWeight(mSummary.totalWeightKg)}</span>
                        )}
                        {matrixValueType === 'orders' && (
                          <span className="text-purple-700">{mSummary.totalOrdersCount} บิล</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-right font-mono text-emerald-800 font-black bg-slate-200">
                    {matrixValueType === 'revenue' && formatCurrency(matrixData.totalOverallRevenue)}
                    {matrixValueType === 'weight' && formatWeight(matrixData.totalOverallWeightKg)}
                    {matrixValueType === 'orders' && `${orders.length} บิล`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      )}

      {/* 6. VIEW CONTENT: VISUAL CHART */}
      {viewMode === 'chart' && (
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>📊 กราฟเปรียบเทียบยอดขาย 10 อันดับสินค้าแรก ({monthSummary.monthLabel})</span>
              <span className="text-[11px] text-slate-500 font-normal">เรียงตามยอดเงินรวม</span>
            </h4>

            {chartData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ไม่มีข้อมูลยอดขายสินค้าสำหรับเดือนที่เลือก
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      fontSize={11}
                      stroke="#64748B"
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={11}
                      stroke="#334155"
                      width={130}
                    />
                    <Tooltip
                      formatter={(val: number, name: string) => {
                        if (name === 'revenue') return [formatCurrency(val), 'ยอดเงินขาย'];
                        if (name === 'weightKg') return [formatWeight(val), 'น้ำหนัก'];
                        return [val, name];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          return payload[0].payload.fullName;
                        }
                        return label;
                      }}
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      name="ยอดเงินขาย (บาท)"
                      fill="#059669"
                      radius={[0, 6, 6, 0]}
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
