import React, { useState, useMemo } from 'react';
import { PurchaseOrder, CustomerStat } from '../types';
import {
  getAllCustomerStats,
  getMonthlyCustomerBreakdown,
  getWeeklyCustomerBreakdown,
  getCustomerFrequencyDistribution,
  exportCustomersToCSV,
  exportCustomerProductsDetailToCSV,
  exportSingleCustomerSummaryToCSV,
  getCustomerAvailableMonths,
  getCustomerDataForMonth,
} from '../utils/customerAnalytics';
import {
  formatCurrency,
  formatWeight,
  formatThaiShortDate,
  getAvailableMonths,
  filterOrdersByMonth,
  filterOrdersByDays,
} from '../utils/formatters';
import { CustomerOrderHistoryModal } from './CustomerOrderHistoryModal';
import {
  Users,
  UserPlus,
  Repeat,
  TrendingUp,
  Award,
  Search,
  Download,
  Calendar,
  CalendarDays,
  Clock,
  Filter,
  Phone,
  MapPin,
  ShoppingBag,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  CheckCircle2,
  Package,
  FileSpreadsheet,
  Layers,
  Table,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';

interface CustomerSummaryProps {
  orders: PurchaseOrder[];
  onViewReceipt?: (order: PurchaseOrder) => void;
  onViewShippingLabel?: (order: PurchaseOrder) => void;
}

type PeriodViewType = 'all' | 'monthly' | 'weekly' | '30days' | '7days';
type CustomerFilterType = 'all' | 'new' | 'repeat' | 'vip';
type SortField = 'ordersCount' | 'repeatTimes' | 'totalRevenue' | 'totalWeight' | 'lastOrderDate';

export const CustomerSummary: React.FC<CustomerSummaryProps> = ({
  orders,
  onViewReceipt,
  onViewShippingLabel,
}) => {
  // Period & Filter State
  const [periodType, setPeriodType] = useState<PeriodViewType>('all');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<CustomerFilterType>('all');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [customerViewMode, setCustomerViewMode] = useState<'roster' | 'product_breakdown'>('roster');
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('repeatTimes');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Selected customer for order history modal
  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<CustomerStat | null>(null);

  // Month filter map for individual customer cards/expanded views
  const [customerMonthFilterMap, setCustomerMonthFilterMap] = useState<Record<string, string>>({});

  const getEffectiveCustomerMonth = (customerId: string) => {
    return customerMonthFilterMap[customerId] || (periodType === 'monthly' && selectedMonthKey !== 'all' ? selectedMonthKey : 'all');
  };

  // Available months
  const availableMonths = useMemo(() => getAvailableMonths(orders), [orders]);

  // Unique product names for product filter
  const availableProductNames = useMemo(() => {
    const pSet = new Set<string>();
    orders.forEach((o) => {
      (o.items || []).forEach((it) => {
        if (it.productName) pSet.add(it.productName.trim());
      });
    });
    return Array.from(pSet).sort();
  }, [orders]);

  // Filter orders based on period selection
  const filteredOrders = useMemo(() => {
    if (periodType === '30days') {
      return filterOrdersByDays(orders, 30);
    }
    if (periodType === '7days') {
      return filterOrdersByDays(orders, 7);
    }
    if (periodType === 'monthly') {
      if (selectedMonthKey !== 'all') {
        return filterOrdersByMonth(orders, selectedMonthKey);
      }
      return orders;
    }
    return orders;
  }, [orders, periodType, selectedMonthKey]);

  // Compute all customer statistics
  const allCustomerStats = useMemo(() => {
    return getAllCustomerStats(orders, filteredOrders);
  }, [orders, filteredOrders]);

  // Breakdown by Monthly & Weekly
  const monthlyBreakdown = useMemo(() => getMonthlyCustomerBreakdown(orders), [orders]);
  const weeklyBreakdown = useMemo(() => getWeeklyCustomerBreakdown(orders, 8), [orders]);

  // Frequency Distribution
  const frequencyDist = useMemo(() => getCustomerFrequencyDistribution(allCustomerStats), [allCustomerStats]);

  // Total Metrics Calculations
  const totalUniqueCustomers = allCustomerStats.length;
  const repeatCustomersList = allCustomerStats.filter((c) => c.isRepeatCustomer);
  const repeatCustomersCount = repeatCustomersList.length;
  const newCustomersCount = totalUniqueCustomers - repeatCustomersCount;
  const repeatRate = totalUniqueCustomers > 0 ? Math.round((repeatCustomersCount / totalUniqueCustomers) * 1000) / 10 : 0;
  
  const totalLifetimeRevenue = allCustomerStats.reduce((sum, c) => sum + c.totalRevenue, 0);
  const avgRevenuePerCustomer = totalUniqueCustomers > 0 ? Math.round(totalLifetimeRevenue / totalUniqueCustomers) : 0;
  const avgOrdersPerCustomer = totalUniqueCustomers > 0 ? Math.round((orders.length / totalUniqueCustomers) * 10) / 10 : 0;

  // Filter & Search customer list for table
  const displayedCustomers = useMemo(() => {
    return allCustomerStats
      .filter((c) => {
        // Status filter
        if (selectedCustomerFilter === 'new' && c.isRepeatCustomer) return false;
        if (selectedCustomerFilter === 'repeat' && !c.isRepeatCustomer) return false;
        if (selectedCustomerFilter === 'vip' && c.totalOrdersCount < 5) return false;

        // Product filter
        if (selectedProductFilter !== 'all') {
          const hasProduct = c.productsBought?.some(
            (p) => p.productName === selectedProductFilter || p.productName.includes(selectedProductFilter)
          );
          if (!hasProduct) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = c.name.toLowerCase().includes(q);
          const matchPhone = c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
          const matchAddr = c.address.toLowerCase().includes(q);
          const matchProduct = c.productsBought?.some((p) => p.productName.toLowerCase().includes(q));
          if (!matchName && !matchPhone && !matchAddr && !matchProduct) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: number = 0;
        let valB: number = 0;

        if (sortField === 'repeatTimes') {
          valA = a.repeatTimes;
          valB = b.repeatTimes;
        } else if (sortField === 'ordersCount') {
          valA = a.totalOrdersCount;
          valB = b.totalOrdersCount;
        } else if (sortField === 'totalRevenue') {
          valA = a.totalRevenue;
          valB = b.totalRevenue;
        } else if (sortField === 'totalWeight') {
          valA = a.totalWeightKg;
          valB = b.totalWeightKg;
        } else if (sortField === 'lastOrderDate') {
          valA = new Date(a.lastOrderDate).getTime();
          valB = new Date(b.lastOrderDate).getTime();
        }

        return sortDirection === 'desc' ? valB - valA : valA - valB;
      });
  }, [allCustomerStats, selectedCustomerFilter, selectedProductFilter, searchQuery, sortField, sortDirection]);

  // Frequency Chart Data
  const frequencyChartData = [
    { name: 'ซื้อ 1 ครั้ง (ใหม่)', count: frequencyDist.once, fill: '#3b82f6' },
    { name: 'ซื้อซ้ำ 2 ครั้ง', count: frequencyDist.twice, fill: '#10b981' },
    { name: 'ซื้อซ้ำ 3 ครั้ง', count: frequencyDist.threeTimes, fill: '#059669' },
    { name: 'ซื้อซ้ำ 4-5 ครั้ง', count: frequencyDist.fourToFive, fill: '#d97706' },
    { name: 'VIP 6+ ครั้ง', count: frequencyDist.sixPlus, fill: '#8b5cf6' },
  ];

  // Top Repeat VIP Customers
  const topRepeatCustomers = useMemo(() => {
    return [...allCustomerStats]
      .filter((c) => c.isRepeatCustomer)
      .sort((a, b) => b.totalOrdersCount - a.totalOrdersCount || b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [allCustomerStats]);

  const handleExportOverviewCSV = () => {
    exportCustomersToCSV(displayedCustomers, `customer_overview_${periodType}`);
  };

  const handleExportProductBreakdownCSV = () => {
    exportCustomerProductsDetailToCSV(displayedCustomers, `customer_products_breakdown_${periodType}`);
  };

  const toggleCustomerExpand = (customerId: string) => {
    setExpandedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedCustomerIds.size === displayedCustomers.length) {
      setExpandedCustomerIds(new Set());
    } else {
      setExpandedCustomerIds(new Set(displayedCustomers.map((c) => c.id)));
    }
  };

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. PERIOD SELECTION & ACTION BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>สรุปข้อมูลลูกค้า & สินค้าที่สั่งซื้อ (Customer & Product Analytics)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              วิเคราะห์พฤติกรรมการซื้อซ้ำ สรุปสินค้าที่ลูกค้าแต่ละคนสั่งซื้อ รวมน้ำหนัก ยอดเงิน และส่งออก Excel
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportProductBreakdownCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
              title="ส่งออก Excel แจกแจงสินค้าที่ลูกค้าแต่ละคนสั่งซื้อ รวมน้ำหนักและยอดเงิน"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>ส่งออก Excel สรุปสินค้าตามลูกค้า</span>
            </button>
            <button
              onClick={handleExportOverviewCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors"
              title="ส่งออก Excel รายชื่อและสถิติภาพรวมลูกค้า"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>ส่งออก Excel รายชื่อลูกค้า</span>
            </button>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>ดูข้อมูลตาม:</span>
          </span>

          <button
            onClick={() => setPeriodType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด (All Time)
          </button>

          <button
            onClick={() => setPeriodType('monthly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              periodType === 'monthly'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>รายเดือน (Monthly)</span>
          </button>

          <button
            onClick={() => setPeriodType('weekly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              periodType === 'weekly'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>รายสัปดาห์ (Weekly)</span>
          </button>

          <button
            onClick={() => setPeriodType('30days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === '30days'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            30 วันล่าสุด
          </button>

          <button
            onClick={() => setPeriodType('7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === '7days'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            7 วันล่าสุด
          </button>
        </div>

        {/* Sub-Month Buttons if Monthly selected */}
        {periodType === 'monthly' && availableMonths.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
            <span className="text-[11px] font-bold text-blue-900 mr-1">เลือกเดือน:</span>
            <button
              onClick={() => setSelectedMonthKey('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedMonthKey === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-blue-800 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              ทุกเดือน ({orders.length} บิล)
            </button>
            {availableMonths.map((m) => (
              <button
                key={m.yearMonthKey}
                onClick={() => setSelectedMonthKey(m.yearMonthKey)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedMonthKey === m.yearMonthKey
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {m.label} ({m.orderCount} บิล)
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. MAIN KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Customers */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ลูกค้าทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalUniqueCustomers}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              จากคำสั่งซื้อทั้งหมด {orders.length} รายการ
            </p>
          </div>
        </div>

        {/* Repeat Customers */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ลูกค้าเก่า / ซื้อซ้ำ</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-emerald-700">{repeatCustomersCount}</p>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {repeatRate}%
              </span>
            </div>
            <p className="text-xs text-emerald-600 mt-0.5">
              สั่งซื้อตั้งแต่ 2 ครั้งขึ้นไป
            </p>
          </div>
        </div>

        {/* New Customers */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ลูกค้าใหม่ (ซื้อ 1 ครั้ง)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-blue-700">{newCustomersCount}</p>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {totalUniqueCustomers > 0 ? (100 - repeatRate).toFixed(1) : 0}%
              </span>
            </div>
            <p className="text-xs text-blue-500 mt-0.5">
              ลูกค้าที่เพิ่งเริ่มสั่งซื้อ 1 ครั้ง
            </p>
          </div>
        </div>

        {/* Avg Revenue per Customer */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ยอดซื้อเฉลี่ย / ลูกค้า</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-purple-700">{formatCurrency(avgRevenuePerCustomer)}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              เฉลี่ย {avgOrdersPerCustomer} บิล / ลูกค้า
            </p>
          </div>
        </div>

      </div>

      {/* 3. CHARTS & TOP REPEAT CUSTOMERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART: Frequency Distribution */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>การกระจายตามจำนวนครั้งที่ซื้อ (Purchase Frequency Distribution)</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">รวม {totalUniqueCustomers} ราย</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequencyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [`${value} ราย`, 'จำนวนลูกค้า']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {frequencyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-center">
            <div className="bg-blue-50/60 p-2 rounded-xl border border-blue-100">
              <span className="text-[11px] text-blue-800 font-semibold block">ซื้อ 1 ครั้ง</span>
              <span className="text-base font-black text-blue-700">{frequencyDist.once}</span>
              <span className="text-[10px] text-blue-500 block">
                {totalUniqueCustomers > 0 ? ((frequencyDist.once / totalUniqueCustomers) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
              <span className="text-[11px] text-emerald-800 font-semibold block">ซื้อซ้ำ 2 ครั้ง</span>
              <span className="text-base font-black text-emerald-700">{frequencyDist.twice}</span>
              <span className="text-[10px] text-emerald-500 block">
                {totalUniqueCustomers > 0 ? ((frequencyDist.twice / totalUniqueCustomers) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="bg-teal-50/60 p-2 rounded-xl border border-teal-100">
              <span className="text-[11px] text-teal-800 font-semibold block">ซื้อซ้ำ 3 ครั้ง</span>
              <span className="text-base font-black text-teal-700">{frequencyDist.threeTimes}</span>
              <span className="text-[10px] text-teal-500 block">
                {totalUniqueCustomers > 0 ? ((frequencyDist.threeTimes / totalUniqueCustomers) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="bg-amber-50/60 p-2 rounded-xl border border-amber-100">
              <span className="text-[11px] text-amber-800 font-semibold block">ซื้อซ้ำ 4-5 ครั้ง</span>
              <span className="text-base font-black text-amber-700">{frequencyDist.fourToFive}</span>
              <span className="text-[10px] text-amber-600 block">
                {totalUniqueCustomers > 0 ? ((frequencyDist.fourToFive / totalUniqueCustomers) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="bg-purple-50/60 p-2 rounded-xl border border-purple-100">
              <span className="text-[11px] text-purple-800 font-semibold block">VIP 6+ ครั้ง</span>
              <span className="text-base font-black text-purple-700">{frequencyDist.sixPlus}</span>
              <span className="text-[10px] text-purple-500 block">
                {totalUniqueCustomers > 0 ? ((frequencyDist.sixPlus / totalUniqueCustomers) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* TOP VIP REPEAT CUSTOMERS */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>ลูกค้าประจำซื้อซ้ำสูงสุด (VIP)</span>
              </h3>
            </div>

            <div className="space-y-2.5">
              {topRepeatCustomers.map((cust, idx) => (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomerForModal(cust)}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-800'
                          : idx === 2
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700">
                        {cust.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {cust.phone}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      <Repeat className="w-3 h-3" />
                      ซื้อ {cust.totalOrdersCount} บิล (ซ้ำ {cust.repeatTimes} ครั้ง)
                    </span>
                    <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                      {formatCurrency(cust.totalRevenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              คลิกที่รายชื่อเพื่อดูประวัติการสั่งซื้อทั้งหมดของลูกค้า
            </span>
          </div>
        </div>

      </div>

      {/* 4. BREAKDOWN TABLES (รายเดือน & รายสัปดาห์) */}
      {periodType === 'monthly' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span>ตารางสรุปข้อมูลลูกค้าเปรียบเทียบตาม "รายเดือน" (Monthly Breakdown)</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">ย้อนหลังทุกเดือน</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                  <th className="py-2.5 px-3">เดือน/ปี</th>
                  <th className="py-2.5 px-3 text-center">ลูกค้าที่สั่งซื้อ (คน)</th>
                  <th className="py-2.5 px-3 text-center text-blue-700">🌱 ลูกค้าใหม่</th>
                  <th className="py-2.5 px-3 text-center text-emerald-700">🔁 ลูกค้าซื้อซ้ำ</th>
                  <th className="py-2.5 px-3 text-center">อัตราซื้อซ้ำ (%)</th>
                  <th className="py-2.5 px-3 text-right">จำนวนออเดอร์ (บิล)</th>
                  <th className="py-2.5 px-3 text-right">น้ำหนักรวม (กก.)</th>
                  <th className="py-2.5 px-3 text-right">ยอดขายรวม (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyBreakdown.map((m) => (
                  <tr key={m.periodKey} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{m.periodLabel}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">{m.totalCustomers}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                        {m.newCustomers} คน
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        {m.repeatCustomers} คน
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">{m.repeatRate}%</td>
                    <td className="py-3 px-3 text-right font-mono">{m.totalOrders}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatWeight(m.totalWeightKg)}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">{formatCurrency(m.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {periodType === 'weekly' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>ตารางสรุปข้อมูลลูกค้าเปรียบเทียบตาม "รายสัปดาห์" (Weekly Breakdown)</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">ย้อนหลัง 8 สัปดาห์</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                  <th className="py-2.5 px-3">สัปดาห์ (ช่วงวันที่)</th>
                  <th className="py-2.5 px-3 text-center">ลูกค้าที่สั่งซื้อ (คน)</th>
                  <th className="py-2.5 px-3 text-center text-blue-700">🌱 ลูกค้าใหม่</th>
                  <th className="py-2.5 px-3 text-center text-emerald-700">🔁 ลูกค้าซื้อซ้ำ</th>
                  <th className="py-2.5 px-3 text-center">อัตราซื้อซ้ำ (%)</th>
                  <th className="py-2.5 px-3 text-right">จำนวนออเดอร์ (บิล)</th>
                  <th className="py-2.5 px-3 text-right">น้ำหนักรวม (กก.)</th>
                  <th className="py-2.5 px-3 text-right">ยอดขายรวม (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weeklyBreakdown.map((w) => (
                  <tr key={w.periodKey} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{w.periodLabel}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">{w.totalCustomers}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                        {w.newCustomers} คน
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        {w.repeatCustomers} คน
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">{w.repeatRate}%</td>
                    <td className="py-3 px-3 text-right font-mono">{w.totalOrders}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatWeight(w.totalWeightKg)}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">{formatCurrency(w.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. CUSTOMER ROSTER & DETAILED PRODUCT PURCHASES SUMMARY */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
        
        {/* Header & View Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>ข้อมูลลูกค้าและรายการสินค้าที่สั่งซื้อ ({displayedCustomers.length} ราย)</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ดูข้อมูลสรุปว่าลูกค้าแต่ละคนสั่งซื้อสินค้าอะไรไปบ้าง รวมน้ำหนักกี่ กก. และคิดเป็นเงินเท่าไหร่
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 self-start lg:self-auto">
            <button
              onClick={() => setCustomerViewMode('roster')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                customerViewMode === 'roster'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-slate-600" />
              <span>ตารางรายชื่อลูกค้า</span>
            </button>
            <button
              onClick={() => setCustomerViewMode('product_breakdown')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                customerViewMode === 'product_breakdown'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>สรุปสินค้าที่ลูกค้าสั่งซื้อ</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, เบอร์, ที่อยู่, หรือชื่อสินค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Filter by Product Dropdown */}
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedProductFilter}
                onChange={(e) => setSelectedProductFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="all">📦 สินค้าทั้งหมด ({availableProductNames.length} รายการ)</option>
                {availableProductNames.map((pName) => (
                  <option key={pName} value={pName}>
                    {pName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Segment Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setSelectedCustomerFilter('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedCustomerFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({allCustomerStats.length})
              </button>
              <button
                onClick={() => setSelectedCustomerFilter('repeat')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedCustomerFilter === 'repeat'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                🔁 ซื้อซ้ำ ({repeatCustomersCount})
              </button>
              <button
                onClick={() => setSelectedCustomerFilter('new')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedCustomerFilter === 'new'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-700 hover:text-blue-900'
                }`}
              >
                🌱 ลูกค้าใหม่ ({newCustomersCount})
              </button>
              <button
                onClick={() => setSelectedCustomerFilter('vip')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedCustomerFilter === 'vip'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-700 hover:text-purple-900'
                }`}
              >
                👑 VIP (5+ ครั้ง)
              </button>
            </div>

            {customerViewMode === 'roster' && (
              <button
                onClick={toggleExpandAll}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                {expandedCustomerIds.size === displayedCustomers.length ? 'ย่อทั้งหมด' : 'ขยายรายการสินค้าทั้งหมด'}
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: CUSTOMER ROSTER TABLE */}
        {customerViewMode === 'roster' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">ชื่อลูกค้า / เบอร์โทร</th>
                  <th className="py-3 px-3">สินค้าที่เคยสั่งซื้อ (สรุป)</th>
                  <th
                    onClick={() => handleSortToggle('repeatTimes')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-center text-emerald-800"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>ซื้อซ้ำกี่ครั้ง</span>
                      <ArrowUpDown className="w-3 h-3 text-emerald-600" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortToggle('ordersCount')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>ออเดอร์</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortToggle('lastOrderDate')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>สั่งซื้อล่าสุด</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortToggle('totalWeight')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>น้ำหนักรวม</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortToggle('totalRevenue')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right text-emerald-800"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>ยอดซื้อรวม (บาท)</span>
                      <ArrowUpDown className="w-3 h-3 text-emerald-600" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      ไม่พบข้อมูลลูกค้าที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  displayedCustomers.map((cust, idx) => {
                    const isExpanded = expandedCustomerIds.has(cust.id);
                    const custMonthKey = getEffectiveCustomerMonth(cust.id);
                    const custAvailableMonths = getCustomerAvailableMonths(cust);
                    const custMonthData = getCustomerDataForMonth(cust, custMonthKey);

                    return (
                      <React.Fragment key={cust.id}>
                        <tr
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => toggleCustomerExpand(cust.id)}
                        >
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCustomerExpand(cust.id);
                                }}
                                className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span>{idx + 1}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                              <span>{cust.name}</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                  cust.totalOrdersCount >= 5
                                    ? 'bg-purple-100 text-purple-800'
                                    : cust.totalOrdersCount >= 2
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {cust.tier}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {cust.phone}
                            </div>
                          </td>
                          <td className="py-3 px-3 max-w-[280px]">
                            {custMonthData.productsBought && custMonthData.productsBought.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {custMonthData.productsBought.slice(0, 2).map((p, pIdx) => (
                                  <span
                                    key={pIdx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] border border-slate-200"
                                  >
                                    <span className="font-medium truncate max-w-[130px]">{p.productName}</span>
                                    <span className="text-emerald-700 font-bold font-mono text-[10px]">
                                      {formatWeight(p.totalWeightKg)}
                                    </span>
                                  </span>
                                ))}
                                {custMonthData.productsBought.length > 2 && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600 text-[10px] font-bold">
                                    +{custMonthData.productsBought.length - 2} สินค้า
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {cust.repeatTimes > 0 ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-xs border border-emerald-300">
                                <Repeat className="w-3 h-3 text-emerald-700" />
                                <span>ซื้อซ้ำ {cust.repeatTimes} ครั้ง</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full text-[11px] border border-blue-200">
                                <span>ลูกค้าใหม่ (1 ครั้ง)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono font-bold text-slate-800">
                              {custMonthKey !== 'all' ? custMonthData.ordersCount : cust.totalOrdersCount}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {custMonthKey !== 'all' ? `บิล (${custMonthData.monthLabel})` : 'บิล'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                            {formatThaiShortDate(cust.lastOrderDate)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-900 font-bold">
                            {formatWeight(custMonthKey !== 'all' ? custMonthData.totalWeightKg : cust.totalWeightKg)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-emerald-700">
                            {formatCurrency(custMonthKey !== 'all' ? custMonthData.totalRevenue : cust.totalRevenue)}
                          </td>
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setSelectedCustomerForModal(cust)}
                                className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                                title="ดูบิลและประวัติคำสั่งซื้อ"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>ดูบิล ({cust.totalOrdersCount})</span>
                              </button>
                              <button
                                onClick={() => exportSingleCustomerSummaryToCSV(cust, custMonthKey !== 'all' ? custMonthKey : undefined)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 rounded-lg border border-emerald-200 transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                                title={`ส่งออก Excel ข้อมูลสรุปและประวัติของ ${cust.name} (${custMonthData.monthLabel})`}
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Excel {custMonthKey !== 'all' ? `(${custMonthData.monthLabel})` : ''}</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDABLE ROW: DETAILED PRODUCTS PURCHASED */}
                        {isExpanded && (
                          <tr className="bg-slate-50/60 border-b border-slate-200">
                            <td colSpan={9} className="p-3.5 sm:p-4">
                              <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
                                
                                {/* Header with Customer Name, Stats & Month Selection */}
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <h4 className="font-bold text-xs text-slate-900">
                                      รายการสินค้าที่ <span className="text-blue-700 font-black">{cust.name}</span> สั่งซื้อ
                                    </h4>
                                    <span className="text-[11px] bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                                      ช่วงเวลา: {custMonthData.monthLabel}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      (พบ {custMonthData.productsBought.length} รายการสินค้า จาก {custMonthData.ordersCount} บิล)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <div className="text-xs font-bold text-slate-700 flex items-center gap-3">
                                      <span>น้ำหนัก: <strong className="text-slate-900 font-mono">{formatWeight(custMonthData.totalWeightKg)}</strong></span>
                                      <span>ยอดเงิน: <strong className="text-emerald-700 font-mono">{formatCurrency(custMonthData.totalRevenue)}</strong></span>
                                    </div>
                                    <button
                                      onClick={() => exportSingleCustomerSummaryToCSV(cust, custMonthKey !== 'all' ? custMonthKey : undefined)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
                                      title={`ส่งออก Excel เฉพาะ ${cust.name} (${custMonthData.monthLabel})`}
                                    >
                                      <FileSpreadsheet className="w-3.5 h-3.5" />
                                      <span>ส่งออก Excel ({custMonthData.monthLabel})</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Month Filter Pills for this customer */}
                                {custAvailableMonths.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                                    <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-1">
                                      <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                                      <span>เลือกเดือนของลูกค้ารายนี้:</span>
                                    </span>
                                    <button
                                      onClick={() => setCustomerMonthFilterMap((prev) => ({ ...prev, [cust.id]: 'all' }))}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                        custMonthKey === 'all'
                                          ? 'bg-blue-600 text-white shadow-xs'
                                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      ทั้งหมดทุกเดือน ({cust.totalOrdersCount} บิล)
                                    </button>
                                    {custAvailableMonths.map((m) => (
                                      <button
                                        key={m.key}
                                        onClick={() => setCustomerMonthFilterMap((prev) => ({ ...prev, [cust.id]: m.key }))}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                          custMonthKey === m.key
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        {m.label} ({m.count} บิล)
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Inner Products Table */}
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                        <th className="py-2 px-3">ชื่อสินค้า</th>
                                        <th className="py-2 px-3">ขนาดบรรจุ</th>
                                        <th className="py-2 px-3 text-center">สั่งซื้อ (ครั้ง)</th>
                                        <th className="py-2 px-3 text-right">น้ำหนักรวม (กก.)</th>
                                        <th className="py-2 px-3 text-right">ยอดเงินรวม (บาท)</th>
                                        <th className="py-2 px-3 text-right">สัดส่วนยอดเงิน</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {custMonthData.productsBought.length === 0 ? (
                                        <tr>
                                          <td colSpan={6} className="py-4 text-center text-slate-400">
                                            ไม่พบรายการสั่งซื้อในเดือน {custMonthData.monthLabel}
                                          </td>
                                        </tr>
                                      ) : (
                                        custMonthData.productsBought.map((p, pIdx) => {
                                          const sharePercent = custMonthData.totalRevenue > 0
                                            ? Math.round((p.totalAmount / custMonthData.totalRevenue) * 1000) / 10
                                            : 0;
                                          return (
                                            <tr key={pIdx} className="hover:bg-slate-50/50">
                                              <td className="py-2 px-3 font-bold text-slate-900">
                                                {p.productName}
                                              </td>
                                              <td className="py-2 px-3">
                                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                                                  {p.packSize || '-'}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3 text-center font-mono text-slate-600">
                                                {p.ordersCount} ครั้ง
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                                {formatWeight(p.totalWeightKg)}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                                {formatCurrency(p.totalAmount)}
                                              </td>
                                              <td className="py-2 px-3 text-right text-slate-500 font-mono text-[11px]">
                                                {sharePercent}%
                                              </td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                    {custMonthData.productsBought.length > 0 && (
                                      <tfoot>
                                        <tr className="bg-slate-50 text-slate-900 font-bold border-t border-slate-200">
                                          <td colSpan={3} className="py-2 px-3 text-right">
                                            รวมเฉพาะ ({custMonthData.monthLabel}):
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-slate-900">
                                            {formatWeight(custMonthData.totalWeightKg)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-emerald-700 font-black">
                                            {formatCurrency(custMonthData.totalRevenue)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-slate-500 text-[11px]">
                                            100%
                                          </td>
                                        </tr>
                                      </tfoot>
                                    )}
                                  </table>
                                </div>

                                {cust.address && cust.address !== '-' && (
                                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>ที่อยู่จัดส่ง: {cust.address}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 2: PRODUCT PURCHASES BREAKDOWN CARDS */}
        {customerViewMode === 'product_breakdown' && (
          <div className="space-y-4">
            {displayedCustomers.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-400 text-xs border border-slate-200">
                ไม่พบข้อมูลลูกค้าที่ตรงกับเงื่อนไขการค้นหา
              </div>
            ) : (
              displayedCustomers.map((cust, idx) => {
                const custMonthKey = getEffectiveCustomerMonth(cust.id);
                const custAvailableMonths = getCustomerAvailableMonths(cust);
                const custMonthData = getCustomerDataForMonth(cust, custMonthKey);

                return (
                  <div
                    key={cust.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all p-4 space-y-3"
                  >
                    {/* Customer Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-start sm:items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-slate-900">{cust.name}</h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                cust.totalOrdersCount >= 5
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : cust.totalOrdersCount >= 2
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {cust.tier}
                            </span>
                            {cust.repeatTimes > 0 && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                <Repeat className="w-3 h-3" />
                                <span>ซื้อซ้ำ {cust.repeatTimes} ครั้ง</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {cust.phone}
                            </span>
                            {cust.address && cust.address !== '-' && (
                              <span className="flex items-center gap-1 truncate max-w-md">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {cust.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <div className="text-right mr-1">
                          <div className="text-xs text-slate-500 font-medium">ยอดสั่งซื้อ ({custMonthData.monthLabel})</div>
                          <div className="text-sm font-black text-emerald-700 font-mono">
                            {formatCurrency(custMonthData.totalRevenue)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatWeight(custMonthData.totalWeightKg)} • {custMonthData.ordersCount} บิล
                          </div>
                        </div>
                        <button
                          onClick={() => exportSingleCustomerSummaryToCSV(cust, custMonthKey !== 'all' ? custMonthKey : undefined)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                          title={`ส่งออก Excel สรุปสินค้าและประวัติของ ${cust.name} (${custMonthData.monthLabel})`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Excel {custMonthKey !== 'all' ? `(${custMonthData.monthLabel})` : ''}</span>
                        </button>
                        <button
                          onClick={() => setSelectedCustomerForModal(cust)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ดูบิล ({cust.totalOrdersCount})</span>
                        </button>
                      </div>
                    </div>

                    {/* Month Filter Selector within card */}
                    {custAvailableMonths.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                          <span>เลือกเดือน:</span>
                        </span>
                        <button
                          onClick={() => setCustomerMonthFilterMap((prev) => ({ ...prev, [cust.id]: 'all' }))}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                            custMonthKey === 'all'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          ทั้งหมด ({cust.totalOrdersCount} บิล)
                        </button>
                        {custAvailableMonths.map((m) => (
                          <button
                            key={m.key}
                            onClick={() => setCustomerMonthFilterMap((prev) => ({ ...prev, [cust.id]: m.key }))}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                              custMonthKey === m.key
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {m.label} ({m.count} บิล)
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Customer Products Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                            <th className="py-2 px-3">สินค้าที่สั่งซื้อ</th>
                            <th className="py-2 px-3">ขนาดบรรจุ</th>
                            <th className="py-2 px-3 text-center">สั่งซื้อ</th>
                            <th className="py-2 px-3 text-right">น้ำหนักรวม (กก.)</th>
                            <th className="py-2 px-3 text-right">ยอดเงินรวม (บาท)</th>
                            <th className="py-2 px-3 text-right">สัดส่วนยอดเงิน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {custMonthData.productsBought.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-4 text-center text-slate-400">
                                ไม่พบรายการสั่งซื้อในเดือน {custMonthData.monthLabel}
                              </td>
                            </tr>
                          ) : (
                            custMonthData.productsBought.map((p, pIdx) => {
                              const share = custMonthData.totalRevenue > 0
                                ? Math.round((p.totalAmount / custMonthData.totalRevenue) * 1000) / 10
                                : 0;
                              return (
                                <tr key={pIdx} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>{p.productName}</span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                                      {p.packSize || '-'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                                    {p.ordersCount} บิล
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                    {formatWeight(p.totalWeightKg)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                                    {formatCurrency(p.totalAmount)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-slate-500 font-mono text-[11px]">
                                    {share}%
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        {custMonthData.productsBought.length > 0 && (
                          <tfoot>
                            <tr className="bg-slate-50 text-slate-900 font-bold border-t border-slate-200">
                              <td colSpan={3} className="py-2 px-3 text-right">
                                รวมเฉพาะ ({custMonthData.monthLabel}):
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-900">
                                {formatWeight(custMonthData.totalWeightKg)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-700 font-black">
                                {formatCurrency(custMonthData.totalRevenue)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-500 text-[11px]">
                                100%
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* CUSTOMER ORDER HISTORY MODAL */}
      <CustomerOrderHistoryModal
        customer={selectedCustomerForModal}
        isOpen={!!selectedCustomerForModal}
        onClose={() => setSelectedCustomerForModal(null)}
        onViewReceipt={onViewReceipt}
        onViewShippingLabel={onViewShippingLabel}
      />

    </div>
  );
};
