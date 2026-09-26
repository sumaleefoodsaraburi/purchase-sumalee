import React, { useState } from 'react';
import { PurchaseOrder } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { DailyWeightSummaryModal } from './DailyWeightSummaryModal';
import { MonthlyProductSalesSummary } from './MonthlyProductSalesSummary';
import {
  formatCurrency,
  formatWeight,
  calculateSalesMetrics,
  filterOrdersToday,
  filterOrdersByDays,
  getDailySalesChartData,
  getTopProducts,
  getAvailableMonths,
  filterOrdersByMonth,
  getDailyWeightBreakdown,
  MonthOption,
} from '../utils/formatters';
import {
  TrendingUp,
  Calendar,
  Scale,
  ShoppingBag,
  Clock,
  ChevronRight,
  BarChart3,
  Award,
  PackageCheck,
  Edit2,
  Trash2,
  Printer,
  Package,
  Filter,
  Layers,
  Sparkles,
  Check,
  Users,
  Repeat,
  UserPlus,
  Truck,
  Receipt,
} from 'lucide-react';
import { getAllCustomerStats } from '../utils/customerAnalytics';
import { getAllTrackingNumbers } from '../utils/trackingUtils';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';

interface SalesSummaryProps {
  orders: PurchaseOrder[];
  onOpenNewOrder: () => void;
  onViewOrdersTab: () => void;
  onViewCustomersTab?: () => void;
  onEditOrder?: (order: PurchaseOrder) => void;
  onDeleteOrder?: (id: string) => void;
  onViewReceipt?: (order: PurchaseOrder) => void;
  onViewShippingLabel?: (order: PurchaseOrder) => void;
  onOpenStockModal?: () => void;
}

export const SalesSummary: React.FC<SalesSummaryProps> = ({
  orders,
  onOpenNewOrder,
  onViewOrdersTab,
  onViewCustomersTab,
  onEditOrder,
  onDeleteOrder,
  onViewReceipt,
  onViewShippingLabel,
  onOpenStockModal,
}) => {
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);
  const [isDailyWeightModalOpen, setIsDailyWeightModalOpen] = useState<boolean>(false);

  // Customer Stats
  const allCustomerStats = getAllCustomerStats(orders);
  const totalCustomers = allCustomerStats.length;
  const repeatCustomers = allCustomerStats.filter(c => c.isRepeatCustomer).length;
  const newCustomers = totalCustomers - repeatCustomers;
  const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 1000) / 10 : 0;

  // Available months list
  const availableMonths = getAvailableMonths(orders);

  // Selected Month Orders & Metrics
  const activeOrders = filterOrdersByMonth(orders, selectedMonthKey);
  const activeMetrics = calculateSalesMetrics(activeOrders);

  // Overall totals for all time
  const allMetrics = calculateSalesMetrics(orders);

  // Compute metrics for required periods
  const todayOrders = filterOrdersToday(orders);
  const todayMetrics = calculateSalesMetrics(todayOrders);

  // Top products for selected month/active view
  const topProducts = getTopProducts(activeOrders, 5);

  // Daily weight breakdown for all orders and active view
  const allDailyBreakdown = getDailyWeightBreakdown(orders);

  // Today's summary card computation
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
  const todayDay = String(now.getDate()).padStart(2, '0');
  const todayDateKey = `${todayYear}-${todayMonth}-${todayDay}`;

  const todayBreakdownItem = allDailyBreakdown.find((d) => d.dateKey === todayDateKey);

  const todaySummary = todayBreakdownItem || {
    dateKey: todayDateKey,
    dateThaiFull: new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }).format(now),
    dateThaiShort: new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }).format(now),
    totalWeightKg: todayMetrics.totalWeightKg,
    totalOrders: todayMetrics.orderCount,
    totalRevenue: todayMetrics.totalRevenue,
    products: getTopProducts(todayOrders, 100).map((p) => ({
      productName: p.name,
      weightKg: p.totalWeightKg,
      revenue: p.totalRevenue,
    })),
  };

  return (
    <div className="space-y-6">
      
      {/* 0. MONTH SELECTION BUTTONS BAR (ปุ่มแสดงยอดขายของแต่ละเดือนที่มีข้อมูล) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">เลือกดูยอดขายรายเดือน (Monthly Sales View)</h3>
              <p className="text-[11px] text-slate-500">คลิกที่ปุ่มเดือนเพื่อดูสรุปยอดขาย ออเดอร์ และสินค้าขายดีของเดือนนั้น</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
              {availableMonths.length} เดือน ({orders.length} ออเดอร์)
            </span>
          </div>
        </div>

        {/* Month Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setSelectedMonthKey('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedMonthKey === 'all'
                ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-900 ring-offset-1'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ทุกเดือน (รวมทั้งหมด)</span>
            <span className="ml-1 bg-slate-700/50 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
              {formatCurrency(allMetrics.totalRevenue)}
            </span>
          </button>

          {availableMonths.map((m) => {
            const isSelected = selectedMonthKey === m.yearMonthKey;
            return (
              <button
                key={m.yearMonthKey}
                onClick={() => setSelectedMonthKey(m.yearMonthKey)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500 ring-offset-1'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                <span>{m.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {formatCurrency(m.totalRevenue)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTED MONTH BANNER (IF A SPECIFIC MONTH IS CLICKED) */}
      {selectedMonthKey !== 'all' && (
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-emerald-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/30 text-emerald-300 text-xs font-bold rounded-full border border-emerald-400/30">
                สรุปยอดขายประจำเดือน
              </span>
              <h2 className="text-xl font-black text-white">
                {availableMonths.find(m => m.yearMonthKey === selectedMonthKey)?.label}
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              ข้อมูลสรุปยอดขายและปริมาณคำสั่งซื้อเฉพาะในเดือนที่เลือก
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs shrink-0">
            <div className="bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
              <span className="text-slate-300 text-[11px] block">ยอดขายรวม</span>
              <span className="text-lg font-black text-emerald-300">{formatCurrency(activeMetrics.totalRevenue)}</span>
            </div>
            <div className="bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
              <span className="text-slate-300 text-[11px] block">จำนวนออเดอร์</span>
              <span className="text-lg font-black text-white">{activeMetrics.orderCount} ออเดอร์</span>
            </div>
            <div className="bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-sm col-span-2 sm:col-span-1">
              <span className="text-slate-300 text-[11px] block">น้ำหนักสินค้ารวม</span>
              <span className="text-lg font-black text-amber-300">{formatWeight(activeMetrics.totalWeightKg)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 1. THREE MAIN STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* CARD 1: ยอดประจำวันนี้ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border-y border-r border-slate-200 border-l-4 border-emerald-500 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                <Clock className="w-4 h-4" />
              </span>
              <p className="text-sm text-slate-500 font-medium">ยอดประจำวันนี้ (Today)</p>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded uppercase tracking-wider border border-emerald-200">
              Live
            </span>
          </div>

          <div className="mt-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(todayMetrics.totalRevenue)}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block">จำนวนคำสั่งซื้อ</span>
              <span className="text-sm font-bold text-slate-700">{todayMetrics.orderCount} ออเดอร์</span>
            </div>
            <div>
              <span className="text-slate-400 block">น้ำหนักสินค้ารวม</span>
              <span className="text-sm font-bold text-emerald-700">{formatWeight(todayMetrics.totalWeightKg)}</span>
            </div>
          </div>
        </div>

        {/* CARD 2: ยอดในมุมมองที่เลือก */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border-y border-r border-slate-200 border-l-4 border-blue-500 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                <Calendar className="w-4 h-4" />
              </span>
              <p className="text-sm text-slate-500 font-medium">
                {selectedMonthKey === 'all' ? 'ยอดขายสะสมทั้งหมด' : `ยอดขายเดือน ${availableMonths.find(m => m.yearMonthKey === selectedMonthKey)?.shortLabel}`}
              </p>
            </div>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase tracking-wider border border-blue-200">
              {activeOrders.length} ออเดอร์
            </span>
          </div>

          <div className="mt-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(activeMetrics.totalRevenue)}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block">เฉลี่ยต่อออเดอร์</span>
              <span className="text-sm font-bold text-slate-700">{formatCurrency(activeMetrics.averageOrderValue)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">น้ำหนักสินค้ารวม</span>
              <span className="text-sm font-bold text-blue-700">{formatWeight(activeMetrics.totalWeightKg)}</span>
            </div>
          </div>
        </div>

        {/* CARD 3: ยอดรวมสุทธิทุกเดือน */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border-y border-r border-slate-200 border-l-4 border-slate-800 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
                <TrendingUp className="w-4 h-4" />
              </span>
              <p className="text-sm text-slate-500 font-medium">ยอดขายรวมทั้งหมดทุกเดือน</p>
            </div>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded uppercase tracking-wider border border-slate-200">
              Total
            </span>
          </div>

          <div className="mt-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(allMetrics.totalRevenue)}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block">จำนวนคำสั่งซื้อรวม</span>
              <span className="text-sm font-bold text-slate-700">{allMetrics.orderCount} ออเดอร์</span>
            </div>
            <div>
              <span className="text-slate-400 block">น้ำหนักสินค้ารวม</span>
              <span className="text-sm font-bold text-slate-800">{formatWeight(allMetrics.totalWeightKg)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 2. MONTHLY PRODUCT SALES SUMMARY COMPONENT (สรุปยอดขายตามสินค้า รายเดือน) */}
      <MonthlyProductSalesSummary
        orders={orders}
        selectedMonthKey={selectedMonthKey}
        onSelectMonth={(mKey) => setSelectedMonthKey(mKey)}
      />



      {/* 2.5 TODAY'S WEIGHT SALES BREAKDOWN WIDGET */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Scale className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>ยอดขายน้ำหนักสินค้ารวม (ประจำวันนี้)</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-full border border-emerald-300">
                  วันนี้
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                สรุปปริมาณน้ำหนักขายรวม (กก.) แยกตามชนิดสินค้าประจำวันนี้
              </p>
            </div>
          </div>
        </div>

        {/* TODAY's FEATURED BREAKDOWN CARD */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                <Calendar className="w-4 h-4" />
                <span>{todaySummary.dateThaiFull}</span>
              </div>
              <p className="text-slate-300 text-xs">
                ยอดขายประจำวันนี้ทั้งหมด ({todaySummary.totalOrders} ออเดอร์)
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
              <div>
                <span className="text-[11px] text-slate-300 block">น้ำหนักขายรวมวันนี้:</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {formatWeight(todaySummary.totalWeightKg)}
                </span>
              </div>
              <div className="h-8 w-px bg-white/20"></div>
              <div>
                <span className="text-[11px] text-slate-300 block">ยอดเงินขายรวม:</span>
                <span className="text-lg sm:text-xl font-bold text-white">
                  {formatCurrency(todaySummary.totalRevenue)}
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown of products sold TODAY */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>รายละเอียดสินค้าที่ขายได้วันนี้</span>
              <span className="text-[11px] text-emerald-400 font-normal">
                {todaySummary.products.length} ชนิดสินค้า
              </span>
            </h4>

            {todaySummary.products.length === 0 ? (
              <div className="bg-white/5 rounded-xl p-4 text-center text-slate-400 text-xs italic border border-white/5">
                ยังไม่มีรายการออเดอร์ในวันนี้
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {todaySummary.products.map((p, idx) => (
                  <div
                    key={idx}
                    className="bg-white/10 hover:bg-white/15 transition-colors p-3 rounded-xl border border-white/10 flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <span className="text-xs font-semibold text-white block truncate">• {p.productName}</span>
                      <span className="text-[10px] text-slate-300">{formatCurrency(p.revenue)}</span>
                    </div>
                    <span className="text-xs font-black text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40 shrink-0">
                      {formatWeight(p.weightKg)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 border-t border-slate-700/60">
            <span>* รายการน้ำหนักและยอดขายรวมคำนวณอัตโนมัติจากออเดอร์ขายจริงวันนี้</span>
            <span>ดูประวัติย้อนหลัง {allDailyBreakdown.length} วัน ได้จากปุ่ม "สรุปยอดขายรายวัน" ที่แถบเมนูด้านบน</span>
          </div>
        </div>
      </div>

      {/* 2.5 CUSTOMER INSIGHTS BANNER (สรุปข้อมูลลูกค้า & อัตราการซื้อซ้ำ) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-blue-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-400/30">
                <Users className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm sm:text-base text-white">
                สรุปข้อมูลลูกค้า & อัตราการซื้อซ้ำ (Customer Overview)
              </h3>
            </div>
            <p className="text-xs text-blue-200/80">
              วิเคราะห์ฐานลูกค้า {totalCustomers} ราย: ลูกค้าเก่าซื้อซ้ำ {repeatCustomers} ราย ({repeatRate}%) และลูกค้าใหม่ {newCustomers} ราย
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <Repeat className="w-3.5 h-3.5 text-emerald-400" />
              <span>อัตราซื้อซ้ำ:</span>
              <span className="font-black text-emerald-400 font-mono">{repeatRate}%</span>
            </div>

            {onViewCustomersTab && (
              <button
                onClick={onViewCustomersTab}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>ดูสรุปและวิเคราะห์ข้อมูลลูกค้าฉบับเต็ม</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. TOP SELLING PRODUCTS & RECENT ORDERS SNIPPET */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TOP PRODUCTS */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>
                สินค้าขายดี {selectedMonthKey !== 'all' ? `(${availableMonths.find(m => m.yearMonthKey === selectedMonthKey)?.shortLabel})` : '(รวม)'}
              </span>
            </h3>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">ยังไม่มีข้อมูลสินค้า</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((prod, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                      idx === 1 ? 'bg-slate-200 text-slate-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-800 truncate">{prod.name}</p>
                      <p className="text-[11px] text-slate-500">
                        รวม {formatWeight(prod.totalWeightKg)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-emerald-700">{formatCurrency(prod.totalRevenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ORDERS SNIPPET (FOR SELECTED VIEW) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <span>
                รายการใบสั่งซื้อ {selectedMonthKey !== 'all' ? `เดือน ${availableMonths.find(m => m.yearMonthKey === selectedMonthKey)?.label}` : 'ล่าสุด'} ({activeOrders.length} ออเดอร์)
              </span>
            </h3>
            <button
              onClick={onViewOrdersTab}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              <span>ดูในตารางทั้งหมด</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-500">ยังไม่มีใบสั่งซื้อในเดือนนี้</p>
              <button
                onClick={onOpenNewOrder}
                className="mt-3 text-xs bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors inline-flex items-center gap-1"
              >
                + คีย์ออเดอร์ใหม่
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto pr-1">
              {activeOrders.slice(0, 15).map((ord) => (
                <div key={ord.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-lg transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{ord.orderNumber}</span>
                      <span className="text-xs text-slate-900 font-bold">{ord.customer.name}</span>
                      <span className="text-[11px] text-slate-400">({ord.customer.phone})</span>
                      {(() => {
                        const trks = getAllTrackingNumbers(ord);
                        if (trks.length === 0) return null;
                        if (trks.length === 1) {
                          return (
                            <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Truck className="w-2.5 h-2.5 text-amber-600" />
                              <span>{ord.courierName || 'Flash'}: {trks[0]}</span>
                            </span>
                          );
                        }
                        return (
                          <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-950 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Truck className="w-2.5 h-2.5 text-amber-600" />
                            <span>{ord.courierName || 'Flash'} ({trks.length} กล่อง)</span>
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {ord.items.map(i => `${i.productName} (${i.weightKg}กก.)`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <div className="text-right mr-1">
                      <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 block text-center">
                        {formatWeight(ord.totalWeightKg)}
                      </span>
                      <span className="text-xs font-bold text-slate-900 block mt-0.5">
                        {formatCurrency(ord.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {onViewShippingLabel && (
                        <button
                          onClick={() => onViewShippingLabel(ord)}
                          title="จ่าหน้าซอง"
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors"
                        >
                          <Package className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onViewReceipt && (
                        <button
                          onClick={() => onViewReceipt(ord)}
                          title="ออก / พิมพ์ใบเสร็จรับเงิน"
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-300 transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                        </button>
                      )}
                      {onEditOrder && (
                        <button
                          onClick={() => onEditOrder(ord)}
                          title="แก้ไขออเดอร์ (ข้อมูลลูกค้า สินค้า และเลขพัสดุ)"
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-300 font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                          <span>แก้ไข</span>
                        </button>
                      )}
                      {onDeleteOrder && (
                        <button
                          onClick={() => setOrderToDelete(ord)}
                          title="ลบออเดอร์"
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg border border-slate-200 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmDeleteModal
        isOpen={!!orderToDelete}
        orderNumber={orderToDelete?.orderNumber || ''}
        customerName={orderToDelete?.customer.name || ''}
        onConfirm={() => {
          if (orderToDelete && onDeleteOrder) {
            onDeleteOrder(orderToDelete.id);
            setOrderToDelete(null);
          }
        }}
        onCancel={() => setOrderToDelete(null)}
      />

      {/* DAILY WEIGHT SUMMARY MODAL */}
      <DailyWeightSummaryModal
        isOpen={isDailyWeightModalOpen}
        onClose={() => setIsDailyWeightModalOpen(false)}
        orders={orders}
      />

    </div>
  );
};
