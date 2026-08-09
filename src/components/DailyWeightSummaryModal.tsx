import React, { useState } from 'react';
import { PurchaseOrder } from '../types';
import {
  getDailyWeightBreakdown,
  formatWeight,
  formatCurrency,
  getAvailableMonths,
} from '../utils/formatters';
import {
  X,
  Scale,
  Calendar,
  Printer,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Package,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface DailyWeightSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PurchaseOrder[];
}

export const DailyWeightSummaryModal: React.FC<DailyWeightSummaryModalProps> = ({
  isOpen,
  onClose,
  orders,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [expandedDateKeys, setExpandedDateKeys] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  // Available months
  const availableMonths = getAvailableMonths(orders);

  // Filter orders by month if selected
  const filteredOrders = selectedMonth === 'all'
    ? orders
    : orders.filter((o) => {
        const d = new Date(o.createdAt);
        if (isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === selectedMonth;
      });

  // Get daily weight breakdown
  const dailyBreakdown = getDailyWeightBreakdown(filteredOrders);

  // Filter by search term
  const searchedBreakdown = dailyBreakdown.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchDate = item.dateThaiFull.toLowerCase().includes(term) || item.dateKey.includes(term);
    const matchProduct = item.products.some((p) => p.productName.toLowerCase().includes(term));
    return matchDate || matchProduct;
  });

  // Calculate grand totals for visible items
  const grandTotalWeight = searchedBreakdown.reduce((sum, d) => sum + d.totalWeightKg, 0);
  const grandTotalOrders = searchedBreakdown.reduce((sum, d) => sum + d.totalOrders, 0);
  const grandTotalRevenue = searchedBreakdown.reduce((sum, d) => sum + d.totalRevenue, 0);

  // Toggle expand product breakdown
  const toggleExpand = (dateKey: string) => {
    setExpandedDateKeys((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  // Expand / Collapse all
  const handleToggleExpandAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    searchedBreakdown.forEach((d) => {
      next[d.dateKey] = expand;
    });
    setExpandedDateKeys(next);
  };

  // Print Daily Report
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>รายงานสรุปขายสินค้ารายวัน (น้ำหนัก กก.) - สุมาลี ฟู๊ด</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 0; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
            .title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
            .subtitle { font-size: 13px; color: #475569; }
            .summary-box { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 15px; border-radius: 8px; margin-bottom: 15px; }
            .summary-item { text-align: center; }
            .summary-item strong { display: block; font-size: 14px; color: #047857; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #0f172a; color: #ffffff; padding: 8px 10px; text-align: left; font-size: 11px; }
            td { padding: 8px 10px; border-bottom: 1px solid #cbd5e1; font-size: 11px; vertical-align: top; }
            .weight-badge { font-weight: bold; color: #047857; font-size: 12px; }
            .product-tag { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 4px; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">รายงานสรุปขายสินค้ารายวัน (น้ำหนัก กก.)</div>
            <div class="subtitle">บริษัท สุมาลี ฟู๊ด สระบุรี จำกัด • SUMALEE FOOD SARABURI CO., LTD.</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}</div>
          </div>

          <div class="summary-box">
            <div class="summary-item">
              <span style="font-size: 11px; color: #64748b;">จำนวนวันที่มีการขาย:</span>
              <strong>${searchedBreakdown.length} วัน</strong>
            </div>
            <div class="summary-item">
              <span style="font-size: 11px; color: #64748b;">น้ำหนักขายรวมสุทธิ:</span>
              <strong>${formatWeight(grandTotalWeight)}</strong>
            </div>
            <div class="summary-item">
              <span style="font-size: 11px; color: #64748b;">จำนวนออเดอร์รวม:</span>
              <strong>${grandTotalOrders} ออเดอร์</strong>
            </div>
            <div class="summary-item">
              <span style="font-size: 11px; color: #64748b;">ยอดขายรวม:</span>
              <strong>${formatCurrency(grandTotalRevenue)}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 20%;">วันที่</th>
                <th style="width: 15%; text-align: right;">น้ำหนักรวม (กก.)</th>
                <th style="width: 12%; text-align: center;">จำนวนออเดอร์</th>
                <th style="width: 18%; text-align: right;">ยอดขาย (บาท)</th>
                <th style="width: 30%;">รายการสินค้าขายดีรายวัน</th>
              </tr>
            </thead>
            <tbody>
              ${searchedBreakdown.map((item, idx) => `
                <tr>
                  <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                  <td><strong>${item.dateThaiFull}</strong></td>
                  <td style="text-align: right;" class="weight-badge">${formatWeight(item.totalWeightKg)}</td>
                  <td style="text-align: center;">${item.totalOrders} ออเดอร์</td>
                  <td style="text-align: right; font-weight: bold;">${formatCurrency(item.totalRevenue)}</td>
                  <td>
                    ${item.products.map(p => `
                      <span class="product-tag">${p.productName}: <strong>${formatWeight(p.weightKg)}</strong></span>
                    `).join('')}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-400/30">
              <Scale className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>สรุปน้ำหนักสินค้าที่ขายได้ในแต่ละวัน (Daily Weight Summary)</span>
              </h2>
              <p className="text-xs text-slate-300">
                ตารางสรุปปริมาณน้ำหนักสินค้า (กิโลกรัม) ยอดขาย และรายการสินค้าขายดีแยกรายวัน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์รายงาน</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div className="bg-slate-900 text-white p-4 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <span className="text-[11px] text-slate-400 block">รวมกิโลกรัมทั้งหมด (Total Kg)</span>
            <span className="text-xl font-black text-emerald-400">{formatWeight(grandTotalWeight)}</span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <span className="text-[11px] text-slate-400 block">จำนวนวันที่ขายได้</span>
            <span className="text-xl font-black text-amber-300">{searchedBreakdown.length} วัน</span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <span className="text-[11px] text-slate-400 block">จำนวนออเดอร์รวม</span>
            <span className="text-xl font-black text-blue-300">{grandTotalOrders} ออเดอร์</span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <span className="text-[11px] text-slate-400 block">ยอดขายรวมทั้งหมด</span>
            <span className="text-xl font-black text-teal-300">{formatCurrency(grandTotalRevenue)}</span>
          </div>
        </div>

        {/* FILTERS & SEARCH TOOLBAR */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาวันที่ หรือชื่อสินค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Month Dropdown */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">ทุกเดือน ({orders.length} ออเดอร์)</option>
              {availableMonths.map((m) => (
                <option key={m.yearMonthKey} value={m.yearMonthKey}>
                  เดือน {m.label} ({m.orderCount} ออเดอร์)
                </option>
              ))}
            </select>
          </div>

          {/* Expand/Collapse All Buttons */}
          <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
            <button
              onClick={() => handleToggleExpandAll(true)}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              ขยายทั้งหมด
            </button>
            <button
              onClick={() => handleToggleExpandAll(false)}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              ย่อทั้งหมด
            </button>
          </div>
        </div>

        {/* MAIN DAILY WEIGHT SUMMARY TABLE */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {searchedBreakdown.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Scale className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">ไม่พบข้อมูลสรุปยอดขายน้ำหนักสินค้ารายวัน</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchedBreakdown.map((item, idx) => {
                const isExpanded = !!expandedDateKeys[item.dateKey];

                return (
                  <div
                    key={item.dateKey}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all overflow-hidden"
                  >
                    {/* DAILY HEADER ROW */}
                    <div
                      onClick={() => toggleExpand(item.dateKey)}
                      className="p-3.5 bg-slate-50/80 hover:bg-emerald-50/40 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-mono text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">{item.dateThaiFull}</span>
                            <span className="text-[11px] font-mono font-semibold text-slate-400">({item.dateKey})</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            จำนวนออเดอร์: <strong className="text-slate-800">{item.totalOrders} ออเดอร์</strong> • รวมสินค้า <strong className="text-slate-800">{item.products.length} ชนิด</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-xl border border-emerald-300 inline-block">
                            ⚖️ ขายได้ {formatWeight(item.totalWeightKg)}
                          </span>
                          <span className="text-xs font-bold text-slate-700 block mt-1">
                            ยอดเงิน: {formatCurrency(item.totalRevenue)}
                          </span>
                        </div>

                        <button className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* PRODUCT BREAKDOWN DETAILS */}
                    <div className="p-3 bg-white space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-emerald-600" />
                          <span>รายการสินค้าที่ขายได้ในวันที่ {item.dateThaiShort}:</span>
                        </span>
                        <span className="text-[11px]">คลิกเพื่อ {isExpanded ? 'ซ่อน' : 'แสดงรายละเอียดราคาเพิ่มเติม'}</span>
                      </div>

                      {/* Product Badges (Always visible) */}
                      <div className="flex flex-wrap gap-2">
                        {item.products.map((p, pIdx) => (
                          <div
                            key={pIdx}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2 transition-colors"
                          >
                            <span className="font-bold text-slate-800">{p.productName}</span>
                            <span className="bg-emerald-600 text-white font-bold text-[11px] px-2 py-0.5 rounded-lg shadow-xs">
                              {formatWeight(p.weightKg)}
                            </span>
                            {isExpanded && (
                              <span className="text-emerald-700 font-bold text-[11px] border-l border-slate-300 pl-1.5">
                                {formatCurrency(p.revenue)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Expanded Detailed Table */}
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-slate-100 text-xs">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100/70 text-slate-600 font-semibold text-[11px]">
                                <th className="p-2 rounded-l-lg">ชื่อสินค้า (Product)</th>
                                <th className="p-2 text-right">น้ำหนักรวม (กก.)</th>
                                <th className="p-2 text-right rounded-r-lg">มูลค่ารวม (บาท)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {item.products.map((p, pIdx) => (
                                <tr key={pIdx} className="hover:bg-slate-50/60">
                                  <td className="p-2 font-medium text-slate-800">{p.productName}</td>
                                  <td className="p-2 text-right font-bold text-emerald-700">{formatWeight(p.weightKg)}</td>
                                  <td className="p-2 text-right font-bold text-slate-900">{formatCurrency(p.revenue)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-center shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-md"
          >
            ปิดหน้าต่างสรุป
          </button>
        </div>

      </div>
    </div>
  );
};
