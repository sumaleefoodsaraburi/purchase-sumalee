import React, { useState, useMemo, useEffect } from 'react';
import { PurchaseOrder } from '../types';
import {
  formatCurrency,
  formatWeight,
  formatThaiDateTime,
  is28gPouch,
  getPouchPieces,
  THAI_FULL_MONTHS,
} from '../utils/formatters';
import { triggerPrintHtml, openPrintWindow, getDailyPackingListHtml } from '../utils/printHelper';
import { getAllTrackingNumbers, getTrackingUrl } from '../utils/trackingUtils';
import {
  X,
  Truck,
  Printer,
  ExternalLink,
  Search,
  CheckCircle2,
  CheckSquare,
  Square,
  Package,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Boxes,
  MapPin,
  Phone,
  Layers,
  Sparkles,
  ClipboardCheck,
  Send,
  AlertTriangle,
} from 'lucide-react';

interface DailyPackingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PurchaseOrder[];
  onQuickUpdateOrder?: (order: PurchaseOrder) => void;
  onViewShippingLabel?: (order: PurchaseOrder) => void;
}

export const DailyPackingListModal: React.FC<DailyPackingListModalProps> = ({
  isOpen,
  onClose,
  orders,
  onQuickUpdateOrder,
  onViewShippingLabel,
}) => {
  // Today's date string YYYY-MM-DD
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Most recent date with orders if today has none
  const defaultDate = useMemo(() => {
    const todayOrders = orders.filter((o) => {
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return key === todayDateStr;
    });

    if (todayOrders.length > 0) return todayDateStr;

    // Pick latest order date
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sorted.length > 0) {
      const d = new Date(sorted[0].createdAt);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
    return todayDateStr;
  }, [orders, todayDateStr]);

  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [selectedCourier, setSelectedCourier] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'checked'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cod' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewTab, setViewTab] = useState<'orders' | 'summary'>('orders');

  // Checked state map: orderId -> boolean
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  // Consolidated picked items check map: productKey -> boolean
  const [pickedProductMap, setPickedProductMap] = useState<Record<string, boolean>>({});

  // Feedback notification for check actions
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Sync defaultDate on initial open
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(defaultDate);
    }
  }, [isOpen, defaultDate]);

  // Load saved checked status for selectedDate from localStorage
  useEffect(() => {
    if (!selectedDate) return;
    try {
      const saved = localStorage.getItem(`packing_list_checked_${selectedDate}`);
      if (saved) {
        setCheckedMap(JSON.parse(saved));
      } else {
        setCheckedMap({});
      }

      const savedPicked = localStorage.getItem(`packing_list_picked_${selectedDate}`);
      if (savedPicked) {
        setPickedProductMap(JSON.parse(savedPicked));
      } else {
        setPickedProductMap({});
      }
    } catch (e) {
      console.warn('Failed to load checked state:', e);
    }
  }, [selectedDate]);

  // Save checkedMap to localStorage
  const saveCheckedMap = (nextMap: Record<string, boolean>) => {
    setCheckedMap(nextMap);
    try {
      localStorage.setItem(`packing_list_checked_${selectedDate}`, JSON.stringify(nextMap));
    } catch (e) {
      console.warn('Failed to save checked state:', e);
    }
  };

  const savePickedProductMap = (nextMap: Record<string, boolean>) => {
    setPickedProductMap(nextMap);
    try {
      localStorage.setItem(`packing_list_picked_${selectedDate}`, JSON.stringify(nextMap));
    } catch (e) {
      console.warn('Failed to save picked product state:', e);
    }
  };

  const toggleCheckOrder = (orderId: string) => {
    const next = { ...checkedMap, [orderId]: !checkedMap[orderId] };
    saveCheckedMap(next);
  };

  const togglePickedProduct = (key: string) => {
    const next = { ...pickedProductMap, [key]: !pickedProductMap[key] };
    savePickedProductMap(next);
  };

  const handleCheckAll = (check: boolean = true) => {
    if (!check) {
      handleClearChecks();
      return;
    }
    const next: Record<string, boolean> = { ...checkedMap };
    const targetOrders = filteredOrders.length > 0 ? filteredOrders : dayOrders;
    targetOrders.forEach((o) => {
      next[o.id] = true;
    });
    saveCheckedMap(next);
    setFeedbackNotice(`✓ ติ๊กขึ้นของทั้งหมด ${targetOrders.length} บิล เรียบร้อย`);
    setTimeout(() => setFeedbackNotice(null), 2500);
  };

  const handleClearChecks = () => {
    setCheckedMap({});
    try {
      localStorage.removeItem(`packing_list_checked_${selectedDate}`);
      localStorage.setItem(`packing_list_checked_${selectedDate}`, JSON.stringify({}));
    } catch (e) {
      console.warn('Failed to clear checked state:', e);
    }
    setFeedbackNotice('✓ ล้างการติ๊กขึ้นของทั้งหมดเรียบร้อยแล้ว');
    setTimeout(() => setFeedbackNotice(null), 2500);
  };

  const handleCheckAllPicked = () => {
    const next: Record<string, boolean> = {};
    consolidatedProducts.forEach((p) => {
      next[p.key] = true;
    });
    savePickedProductMap(next);
    setFeedbackNotice(`✓ ติ๊กเบิกสินค้าครบ ${consolidatedProducts.length} รายการ`);
    setTimeout(() => setFeedbackNotice(null), 2500);
  };

  const handleClearPicked = () => {
    setPickedProductMap({});
    try {
      localStorage.removeItem(`packing_list_picked_${selectedDate}`);
      localStorage.setItem(`packing_list_picked_${selectedDate}`, JSON.stringify({}));
    } catch (e) {
      console.warn('Failed to clear picked state:', e);
    }
    setFeedbackNotice('✓ ล้างการติ๊กเบิกสินค้าเรียบร้อยแล้ว');
    setTimeout(() => setFeedbackNotice(null), 2500);
  };

  const handleResetChecks = () => {
    setCheckedMap({});
    setPickedProductMap({});
    try {
      localStorage.removeItem(`packing_list_checked_${selectedDate}`);
      localStorage.setItem(`packing_list_checked_${selectedDate}`, JSON.stringify({}));
      localStorage.removeItem(`packing_list_picked_${selectedDate}`);
      localStorage.setItem(`packing_list_picked_${selectedDate}`, JSON.stringify({}));
    } catch (e) {
      console.warn('Failed to reset checked state:', e);
    }
    setFeedbackNotice('✓ รีเซ็ตการเช็คขึ้นของและเบิกสินค้าทั้งหมดของวันนี้แล้ว');
    setTimeout(() => setFeedbackNotice(null), 2500);
  };

  // Distinct dates available in orders
  const availableDates = useMemo(() => {
    const map: Record<string, { dateKey: string; count: number; dateObj: Date }> = {};
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) {
        map[key] = { dateKey: key, count: 0, dateObj: d };
      }
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [orders]);

  // Orders on the selected date
  const dayOrders = useMemo(() => {
    if (!selectedDate) return [];
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return key === selectedDate;
    });
  }, [orders, selectedDate]);

  // Unique couriers on this date
  const availableCouriers = useMemo(() => {
    const set = new Set<string>();
    dayOrders.forEach((o) => {
      if (o.courierName && o.courierName.trim()) {
        set.add(o.courierName.trim());
      } else {
        set.add('Flash Express');
      }
    });
    return Array.from(set);
  }, [dayOrders]);

  // Filtered orders for view
  const filteredOrders = useMemo(() => {
    return dayOrders.filter((order) => {
      // Courier filter
      if (selectedCourier !== 'all') {
        const cName = order.courierName || 'Flash Express';
        if (cName !== selectedCourier) return false;
      }

      // Status filter (checked vs pending)
      const isChecked = !!checkedMap[order.id];
      if (statusFilter === 'checked' && !isChecked) return false;
      if (statusFilter === 'pending' && isChecked) return false;

      // Payment filter
      if (paymentFilter === 'cod' && order.paymentStatus !== 'cod') return false;
      if (paymentFilter === 'paid' && order.paymentStatus !== 'paid') return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchPo = order.orderNumber.toLowerCase().includes(term);
        const matchCustomer = order.customer.name.toLowerCase().includes(term);
        const matchPhone = order.customer.phone.toLowerCase().includes(term);
        const matchAddress = order.customer.address.toLowerCase().includes(term);
        const matchCourier = (order.courierName || '').toLowerCase().includes(term);
        const matchTrackings = getAllTrackingNumbers(order).some((t) => t.toLowerCase().includes(term));
        const matchProducts = (order.items || []).some((it) => it.productName.toLowerCase().includes(term));
        if (
          !matchPo &&
          !matchCustomer &&
          !matchPhone &&
          !matchAddress &&
          !matchCourier &&
          !matchTrackings &&
          !matchProducts
        ) {
          return false;
        }
      }

      return true;
    });
  }, [dayOrders, selectedCourier, statusFilter, paymentFilter, searchTerm, checkedMap]);

  // Metrics on current date
  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalBoxes = filteredOrders.reduce((sum, o) => sum + (o.boxCount || 1), 0);
    const totalWeightKg = filteredOrders.reduce((sum, o) => sum + (o.totalWeightKg || 0), 0);
    const codOrders = filteredOrders.filter((o) => o.paymentStatus === 'cod');
    const totalCodAmount = codOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const totalPouches28g = filteredOrders.reduce(
      (sum, o) =>
        sum +
        (o.items || [])
          .filter((it) => is28gPouch(it.productName, it.packSize))
          .reduce((s, it) => s + getPouchPieces(it.weightKg, it.quantityPieces), 0),
      0
    );

    const checkedOrdersCount = filteredOrders.filter((o) => !!checkedMap[o.id]).length;
    const checkedBoxesCount = filteredOrders
      .filter((o) => !!checkedMap[o.id])
      .reduce((sum, o) => sum + (o.boxCount || 1), 0);

    const progressPercent = totalOrders > 0 ? Math.round((checkedOrdersCount / totalOrders) * 100) : 0;

    return {
      totalOrders,
      totalBoxes,
      totalWeightKg,
      codOrdersCount: codOrders.length,
      totalCodAmount,
      totalPouches28g,
      checkedOrdersCount,
      checkedBoxesCount,
      progressPercent,
    };
  }, [filteredOrders, checkedMap]);

  // Consolidated products breakdown (for Picking & Warehouse Verification)
  const consolidatedProducts = useMemo(() => {
    const map: Record<
      string,
      {
        key: string;
        productName: string;
        packSize: string;
        totalWeightKg: number;
        totalPieces: number;
        isPouch: boolean;
        ordersCount: number;
      }
    > = {};

    filteredOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const pName = it.productName.trim() || 'สินค้าไม่ระบุชื่อ';
        const isPouch = is28gPouch(pName, it.packSize);
        const pack = it.packSize || (isPouch ? '28g' : '1kg');
        const key = `${pName}___${pack}`;
        const pieces = isPouch ? getPouchPieces(it.weightKg, it.quantityPieces) : 0;

        if (!map[key]) {
          map[key] = {
            key,
            productName: pName,
            packSize: pack,
            totalWeightKg: 0,
            totalPieces: 0,
            isPouch,
            ordersCount: 0,
          };
        }
        map[key].totalWeightKg += it.weightKg || 0;
        map[key].totalPieces += pieces;
        map[key].ordersCount += 1;
      });
    });

    return Object.values(map).sort((a, b) => {
      if (a.isPouch !== b.isPouch) return a.isPouch ? 1 : -1;
      return b.totalWeightKg - a.totalWeightKg;
    });
  }, [filteredOrders]);

  // Thai Date formatting for display
  const thaiDateLabel = useMemo(() => {
    if (!selectedDate) return '';
    const parts = selectedDate.split('-');
    if (parts.length !== 3) return selectedDate;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${d} ${THAI_FULL_MONTHS[m]} ${y + 543}`;
  }, [selectedDate]);

  // Step Date: previous or next date that has orders
  const handleStepDate = (direction: 'prev' | 'next') => {
    const curIdx = availableDates.findIndex((d) => d.dateKey === selectedDate);
    if (curIdx === -1) {
      if (availableDates.length > 0) setSelectedDate(availableDates[0].dateKey);
      return;
    }
    if (direction === 'next' && curIdx > 0) {
      setSelectedDate(availableDates[curIdx - 1].dateKey);
    } else if (direction === 'prev' && curIdx < availableDates.length - 1) {
      setSelectedDate(availableDates[curIdx + 1].dateKey);
    }
  };

  // Quick mark status as 'shipped' for checked orders
  const handleMarkShipped = (order: PurchaseOrder) => {
    if (!onQuickUpdateOrder) return;
    const updated: PurchaseOrder = {
      ...order,
      deliveryStatus: 'shipped',
    };
    onQuickUpdateOrder(updated);
  };

  // Trigger Print Packing List
  const handlePrint = () => {
    const html = getDailyPackingListHtml(filteredOrders, thaiDateLabel, selectedCourier);
    triggerPrintHtml(html);
  };

  const handleOpenNewTab = () => {
    const html = getDailyPackingListHtml(filteredOrders, thaiDateLabel, selectedCourier);
    openPrintWindow(html);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-purple-900/40">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-400/30 shadow-inner">
              <Truck className="w-6 h-6 text-purple-300" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>ใบรายการขึ้นของขนส่ง (Daily Packing & Loading List)</span>
                </h2>
                <span className="bg-purple-500/30 text-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-400/30">
                  เช็คขึ้นรถประจำวัน
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">
                ตรวจนับสินค้าขึ้นรถขนส่งแต่ละวัน เช็คจำนวนกล่อง รวมยอด COD และเช็คของง่ายๆ ได้ทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewTab}
              title="เปิดหน้าพิมพ์ในแท็บใหม่"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>แท็บใหม่</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={filteredOrders.length === 0}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ใบขึ้นของ A4</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DATE SELECTOR & COURIER NAVIGATION BAR */}
        <div className="bg-slate-900 text-white p-3 sm:p-4 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
          
          {/* Date controls */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
              <button
                onClick={() => handleStepDate('prev')}
                title="วันก่อนหน้าที่มีออเดอร์"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2 px-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white text-xs font-bold font-mono outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={() => handleStepDate('next')}
                title="วันถัดไปที่มีออเดอร์"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Today Button */}
            <button
              onClick={() => setSelectedDate(todayDateStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedDate === todayDateStr
                  ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              ⚡ วันนี้
            </button>

            {/* Date Display Pill */}
            <span className="text-xs font-extrabold text-amber-300 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 hidden lg:inline-block">
              📅 {thaiDateLabel}
            </span>
          </div>

          {/* Quick Date Presets Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-thin">
            <span className="text-[11px] text-slate-400 shrink-0 mr-1">วันที่มีออเดอร์:</span>
            {availableDates.slice(0, 5).map((d) => (
              <button
                key={d.dateKey}
                onClick={() => setSelectedDate(d.dateKey)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border shrink-0 ${
                  selectedDate === d.dateKey
                    ? 'bg-purple-600 text-white border-purple-400 font-bold'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {d.dateKey.slice(5)} ({d.count})
              </button>
            ))}
          </div>
        </div>

        {/* METRICS & LOADING PROGRESS BAR */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-3">
            
            {/* 1. Total Orders */}
            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">จำนวนออเดอร์</span>
              <span className="text-base sm:text-lg font-black text-indigo-700">{metrics.totalOrders} บิล</span>
            </div>

            {/* 2. Total Boxes */}
            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">จำนวนกล่องรวม</span>
              <span className="text-base sm:text-lg font-black text-slate-900">📦 {metrics.totalBoxes} กล่อง</span>
            </div>

            {/* 3. Total Weight */}
            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">น้ำหนักสินค้ารวม</span>
              <span className="text-base sm:text-lg font-black text-emerald-700">{formatWeight(metrics.totalWeightKg)}</span>
              {metrics.totalPouches28g > 0 && (
                <span className="text-[10px] text-amber-700 font-bold block mt-0.5">
                  (+ ซอง 28g: {metrics.totalPouches28g.toLocaleString()} ซอง)
                </span>
              )}
            </div>

            {/* 4. Total COD Amount */}
            <div className="bg-rose-50/70 p-2.5 sm:p-3 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">ยอด COD เก็บปลายทาง</span>
              <span className="text-base sm:text-lg font-black text-rose-800 font-mono">
                {formatCurrency(metrics.totalCodAmount)}
              </span>
              <span className="text-[10px] text-rose-600 block">({metrics.codOrdersCount} บิลเก็บเงิน)</span>
            </div>

            {/* 5. Checked Progress */}
            <div className="col-span-2 sm:col-span-1 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ขึ้นรถแล้ว</span>
                <span className="text-base sm:text-lg font-black text-purple-700">
                  {metrics.checkedOrdersCount} / {metrics.totalOrders} บิล
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                ({metrics.checkedBoxesCount} / {metrics.totalBoxes} กล่อง)
              </span>
            </div>
          </div>

          {/* Interactive Visual Progress Bar */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-purple-600" />
              <span>ความคืบหน้าขึ้นของ:</span>
            </span>
            <div className="flex-1 min-w-[120px] bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  metrics.progressPercent === 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                }`}
                style={{ width: `${metrics.progressPercent}%` }}
              ></div>
            </div>
            <span
              className={`text-xs font-extrabold px-2 py-0.5 rounded-lg shrink-0 ${
                metrics.progressPercent === 100
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-purple-100 text-purple-800'
              }`}
            >
              {metrics.progressPercent}% {metrics.progressPercent === 100 && '✓ ขึ้นครบทุกกล่องแล้ว'}
            </span>
            {feedbackNotice && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white shadow-xs animate-fade-in flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{feedbackNotice}</span>
              </span>
            )}
          </div>
        </div>

        {/* COURIER FILTER TABS & TOOLBAR */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
          
          {/* Couriers Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-thin">
            <button
              onClick={() => setSelectedCourier('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                selectedCourier === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              ทุกสายขนส่ง ({dayOrders.length})
            </button>
            {availableCouriers.map((c) => {
              const count = dayOrders.filter((o) => (o.courierName || 'Flash Express') === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setSelectedCourier(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                    selectedCourier === c
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50 hover:text-purple-900 hover:border-purple-200'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{c}</span>
                  <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full font-bold">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Filter, Search & View Tabs */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 w-full md:w-auto">
            {/* View Switcher: Orders vs Consolidated Summary */}
            <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setViewTab('orders')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  viewTab === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                เช็คตามบิล ({filteredOrders.length})
              </button>
              <button
                onClick={() => setViewTab('summary')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  viewTab === 'summary' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>สรุปยอดสินค้า ({consolidatedProducts.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาลูกค้า, เลข PO, สินค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            {/* Bulk Check / Reset buttons */}
            {viewTab === 'orders' ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCheckAll(true)}
                  title="ติ๊กขึ้นรถแล้วทั้งหมด"
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>เช็คหมด</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearChecks}
                  title="ล้างการติ๊กขึ้นรถทั้งหมดของวันนี้ (เอาติ๊กออกทุกบิล)"
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ล้างติ๊ก</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCheckAllPicked}
                  title="ติ๊กเบิกสินค้าครบทั้งหมด"
                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>เบิกครบหมด</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearPicked}
                  title="ล้างติ๊กเบิกสินค้าทั้งหมดของวันนี้"
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ล้างติ๊ก</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MAIN BODY CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100 space-y-3">
          
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <Truck className="w-12 h-12 text-slate-300 mx-auto stroke-[1.5]" />
              <h3 className="text-base font-bold text-slate-800">ไม่พบรายการออเดอร์ในวันที่เลือก</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                ไม่มีคำสั่งซื้อในวันที่ {thaiDateLabel} {selectedCourier !== 'all' ? `สำหรับสายขนส่ง ${selectedCourier}` : ''} คุณสามารถเลือกดูวันอื่นๆ จากแถบด้านบนได้
              </p>
            </div>
          ) : viewTab === 'summary' ? (
            /* ================= VIEW 2: CONSOLIDATED PRODUCT SUMMARY (FOR WAREHOUSE PICKING) ================= */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-purple-50/60 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-purple-600" />
                    <span>สรุปยอดรวมสินค้าที่ต้องยกขึ้นรถประจำวัน ({consolidatedProducts.length} รายการ)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    ใช้ตรวจนับสินค้าที่เบิกจากคลังก่อนนำไปจัดใส่กล่องขึ้นรถขนส่ง
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span>น้ำหนักรวม: <strong className="text-emerald-700">{formatWeight(metrics.totalWeightKg)}</strong></span>
                  {metrics.totalPouches28g > 0 && (
                    <span>• ซอง 28g: <strong className="text-amber-800">{metrics.totalPouches28g.toLocaleString()} ซอง</strong></span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 text-center w-12">#</th>
                      <th className="py-2.5 px-3 text-center w-16">เช็คเบิก</th>
                      <th className="py-2.5 px-3">ชื่อสินค้า (Product Name)</th>
                      <th className="py-2.5 px-3 text-center w-28">ขนาดแพ็ค</th>
                      <th className="py-2.5 px-3 text-right">จำนวนรวมที่ต้องขึ้นรถ</th>
                      <th className="py-2.5 px-3 text-center w-24">จำนวนบิล</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {consolidatedProducts.map((p, idx) => {
                      const isPicked = !!pickedProductMap[p.key];
                      return (
                        <tr
                          key={p.key}
                          onClick={() => togglePickedProduct(p.key)}
                          className={`cursor-pointer transition-colors ${
                            isPicked ? 'bg-emerald-50/60 text-slate-800' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isPicked}
                              onChange={() => togglePickedProduct(p.key)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`font-semibold ${isPicked ? 'text-slate-900 line-through text-slate-500' : 'text-slate-900'}`}>
                              {p.productName}
                            </span>
                            {p.isPouch && (
                              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                ซอง 28g
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              {p.packSize}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-sm">
                            {p.isPouch ? (
                              <span className="text-amber-800 font-black">
                                {p.totalPieces.toLocaleString()} ซอง{' '}
                                <span className="text-xs text-slate-500 font-normal">({formatWeight(p.totalWeightKg)})</span>
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-black">{formatWeight(p.totalWeightKg)}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-600">{p.ordersCount} บิล</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ================= VIEW 1: ORDER BY ORDER LOADING CHECKLIST ================= */
            <div className="space-y-3">
              {filteredOrders.map((order, idx) => {
                const isChecked = !!checkedMap[order.id];
                const trackings = getAllTrackingNumbers(order);
                const isCod = order.paymentStatus === 'cod';
                const boxCount = order.boxCount || 1;

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                      isChecked
                        ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                        : 'border-slate-200 hover:border-purple-300 hover:shadow-md'
                    }`}
                  >
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      
                      {/* Left: Check button & Order Details */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Big Interactive Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleCheckOrder(order.id)}
                          className={`mt-0.5 shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-xs ${
                            isChecked
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30 ring-2 ring-emerald-400'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                        >
                          {isChecked ? (
                            <CheckCircle2 className="w-5 h-5 text-white stroke-[2.5]" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="hidden sm:inline">{isChecked ? 'ขึ้นรถแล้ว' : 'ติ๊กขึ้นรถ'}</span>
                        </button>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          {/* Order Number & Badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                              #{idx + 1} • {order.orderNumber}
                            </span>
                            
                            {/* Prominent Box Count Badge */}
                            <span className="bg-purple-100 text-purple-900 font-black text-xs px-2.5 py-0.5 rounded-lg border border-purple-300 shadow-xs flex items-center gap-1">
                              <span>📦 {boxCount} กล่อง</span>
                            </span>

                            {/* Courier Badge */}
                            <span className="bg-amber-50 text-amber-900 font-bold text-xs px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                              <Truck className="w-3 h-3 text-amber-700" />
                              <span>{order.courierName || 'Flash Express'}</span>
                            </span>

                            {/* COD / Payment Badge */}
                            {isCod ? (
                              <span className="bg-rose-50 border border-rose-300 text-rose-800 font-black text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1 animate-pulse">
                                <span>⚠️ COD เก็บเงิน: {formatCurrency(order.totalAmount)}</span>
                              </span>
                            ) : (
                              <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs px-2 py-0.5 rounded-md">
                                ✓ ชำระแล้ว
                              </span>
                            )}
                          </div>

                          {/* Customer Name, Phone & Address */}
                          <div className="text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 text-sm">{order.customer?.name}</span>
                              <a
                                href={`tel:${order.customer?.phone}`}
                                className="text-blue-700 hover:text-blue-900 font-bold font-mono inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                              >
                                <Phone className="w-3 h-3 text-blue-600" />
                                <span>{order.customer?.phone}</span>
                              </a>
                            </div>

                            <p className="text-slate-600 text-xs mt-1 leading-relaxed flex items-start gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="font-medium">{order.customer?.address}</span>
                            </p>
                          </div>

                          {/* Items Breakdown inside this Box */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 mt-2">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              สินค้าในกล่อง (Items to pack & load):
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                              {order.items.map((it) => {
                                const isPouch = is28gPouch(it.productName, it.packSize);
                                const qtyStr = isPouch
                                  ? `${getPouchPieces(it.weightKg, it.quantityPieces)} ซอง`
                                  : `${it.weightKg} กก.`;

                                return (
                                  <div key={it.id} className="flex items-center justify-between gap-2 bg-white px-2 py-1 rounded-md border border-slate-200/60">
                                    <div className="truncate flex items-center gap-1.5">
                                      <span className="font-bold text-slate-800">• {it.productName}</span>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                        isPouch
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}>
                                        {it.packSize || '1kg'}
                                      </span>
                                    </div>
                                    <span className="font-extrabold text-emerald-800 shrink-0 font-mono">
                                      {qtyStr}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Tracking Numbers if present */}
                          {trackings.length > 0 && (
                            <div className="flex items-center gap-2 pt-1 text-xs">
                              <span className="text-[11px] font-bold text-slate-400">เลขพัสดุ:</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {trackings.map((t, tIdx) => (
                                  <a
                                    key={tIdx}
                                    href={getTrackingUrl(order.courierName, t)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-mono font-bold text-blue-700 hover:text-blue-900 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200 text-xs inline-flex items-center gap-1"
                                  >
                                    <span>{t}</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-blue-500" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Note if any */}
                          {order.note && (
                            <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200 font-medium inline-block mt-1">
                              <strong>หมายเหตุ:</strong> {order.note}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Quick Action buttons */}
                      <div className="flex flex-row lg:flex-col items-end justify-between lg:justify-center gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">น้ำหนักกล่อง</span>
                          <span className="text-base font-black text-emerald-700">{formatWeight(order.totalWeightKg)}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onViewShippingLabel && (
                            <button
                              onClick={() => onViewShippingLabel(order)}
                              title="พิมพ์ใบจ่าหน้าซอง"
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1 transition-colors"
                            >
                              <Package className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">ใบจ่าหน้า</span>
                            </button>
                          )}

                          {order.deliveryStatus !== 'shipped' && order.deliveryStatus !== 'delivered' && (
                            <button
                              onClick={() => handleMarkShipped(order)}
                              title="เปลี่ยนสถานะเป็นกำลังจัดส่ง"
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center gap-1 transition-colors"
                            >
                              <Send className="w-3.5 h-3.5 text-indigo-600" />
                              <span>ส่งแล้ว</span>
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>
              บันทึกสถานะการเช็คอัตโนมัติ (Local Storage) • รวม {filteredOrders.length} ออเดอร์
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={filteredOrders.length === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบขึ้นของ A4</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
