import React, { useState, useMemo } from 'react';
import { PurchaseOrder, StockEntry, ProductionShift, StockEntryItem, StockLocation } from '../types';
import { FACTORY_STOCK_PRODUCT_OPTIONS, POPULAR_PRODUCTS_PRESETS } from '../data/sampleOrders';
import {
  calculateDailyStockSummary,
  getAllDailyStockSummaries,
  normalizeProductName,
} from '../utils/stockUtils';
import { formatWeight, formatCurrency } from '../utils/formatters';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Sun,
  Moon,
  Scale,
  PackageCheck,
  PackageX,
  AlertTriangle,
  Printer,
  Search,
  CheckCircle2,
  History,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  Clock,
  TrendingDown,
  Factory,
  Globe,
} from 'lucide-react';

interface StockManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockEntries: StockEntry[];
  orders: PurchaseOrder[];
  onSaveStockEntry: (entry: StockEntry) => Promise<void> | void;
  onDeleteStockEntry: (entryId: string) => Promise<void> | void;
}

export const StockManagementModal: React.FC<StockManagementModalProps> = ({
  isOpen,
  onClose,
  stockEntries,
  orders,
  onSaveStockEntry,
  onDeleteStockEntry,
}) => {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [activeTab, setActiveTab] = useState<'form' | 'summary' | 'history'>('summary');
  
  // Stock Source Filter for views ('all' | 'factory' | 'online')
  const [stockSourceFilter, setStockSourceFilter] = useState<'all' | 'factory' | 'online'>('all');

  // Selected Date for Tab 2 Summary
  const [selectedSummaryDate, setSelectedSummaryDate] = useState<string>(todayStr);

  // Form State
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState<string>(todayStr);
  const [shift, setShift] = useState<ProductionShift>('day');
  const [entryStockSource, setEntryStockSource] = useState<StockLocation>('factory');
  const [recordedBy, setRecordedBy] = useState<string>('สมชาย (หัวหน้ากะ)');
  const [note, setNote] = useState<string>('');
  const [items, setItems] = useState<StockEntryItem[]>([
    { id: '1', productName: FACTORY_STOCK_PRODUCT_OPTIONS[0].name, weightKg: 100 },
    { id: '2', productName: FACTORY_STOCK_PRODUCT_OPTIONS[1].name, weightKg: 80 },
  ]);

  const [historySearch, setHistorySearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<StockEntry | null>(null);

  // Show Toast
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Reset Form
  const resetForm = () => {
    setEditingEntryId(null);
    setEntryDate(todayStr);
    setShift('day');
    setEntryStockSource('factory');
    setRecordedBy('สมชาย (หัวหน้ากะ)');
    setNote('');
    setItems([
      { id: '1', productName: FACTORY_STOCK_PRODUCT_OPTIONS[0].name, weightKg: 100 },
      { id: '2', productName: FACTORY_STOCK_PRODUCT_OPTIONS[1].name, weightKg: 80 },
    ]);
  };

  // Start editing existing entry
  const handleEditEntry = (entry: StockEntry) => {
    setEditingEntryId(entry.id);
    setEntryDate(entry.dateKey);
    setShift(entry.shift);
    setEntryStockSource(entry.stockSource || 'factory');
    setRecordedBy(entry.recordedBy || '');
    setNote(entry.note || '');
    setItems(entry.items.map((it) => ({ ...it })));
    setActiveTab('form');
  };

  // Add Item Line
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        productName: FACTORY_STOCK_PRODUCT_OPTIONS[0].name,
        weightKg: 50,
      },
    ]);
  };

  // Remove Item Line
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Update Item Field
  const handleUpdateItem = (id: string, field: keyof StockEntryItem, value: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return { ...it, [field]: value };
      })
    );
  };

  // Add Quick Preset Products
  const handleQuickAddPreset = (productName: string) => {
    const exists = items.find((i) => i.productName === productName);
    if (exists) {
      handleUpdateItem(exists.id, 'weightKg', (Number(exists.weightKg) || 0) + 50);
    } else {
      setItems((prev) => [
        ...prev,
        { id: Date.now().toString(), productName, weightKg: 50 },
      ]);
    }
  };

  // Save Entry Submit
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items
      .filter((it) => it.productName.trim() && Number(it.weightKg) > 0)
      .map((it) => ({
        id: it.id || Date.now().toString(),
        productName: it.productName.trim(),
        weightKg: Number(it.weightKg),
        note: it.note?.trim() || undefined,
      }));

    if (validItems.length === 0) {
      alert('กรุณาระบุรายการสินค้าและน้ำหนักที่ผลิตได้อย่างน้อย 1 รายการ');
      return;
    }

    const totalWeightKg = validItems.reduce((sum, i) => sum + i.weightKg, 0);

    const shiftLabel = shift === 'day' ? 'กะเช้า (08:00 - 20:00)' : 'กะดึก (20:00 - 08:00)';

    const newEntry: StockEntry = {
      id: editingEntryId || `stk-${entryDate.replace(/-/g, '')}-${shift}-${Date.now().toString().slice(-4)}`,
      dateKey: entryDate,
      shift,
      shiftLabel,
      stockSource: entryStockSource,
      items: validItems,
      totalWeightKg,
      recordedBy: recordedBy.trim() || undefined,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSaveStockEntry(newEntry);
      triggerToast(editingEntryId ? 'อัปเดตข้อมูลสต็อคเรียบร้อยแล้ว!' : 'บันทึกคีย์สต็อคเข้าระบบเรียบร้อยแล้ว!');
      resetForm();
      setSelectedSummaryDate(entryDate);
      setActiveTab('summary');
    } catch (err) {
      console.error('Error saving stock entry:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลสต็อค');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Entry Request (Open custom confirmation modal)
  const handleDeleteRequest = (entry: StockEntry) => {
    setDeletingEntry(entry);
  };

  // Confirm Delete Entry
  const confirmDelete = async () => {
    if (!deletingEntry) return;
    setIsSubmitting(true);
    try {
      await onDeleteStockEntry(deletingEntry.id);
      triggerToast('ลบรายการบันทึกสต็อคเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Error deleting stock entry:', err);
    } finally {
      setIsSubmitting(false);
      setDeletingEntry(null);
    }
  };

  // Selected Daily Summary Data
  const dailySummary = useMemo(() => {
    return calculateDailyStockSummary(selectedSummaryDate, stockEntries, orders, stockSourceFilter);
  }, [selectedSummaryDate, stockEntries, orders, stockSourceFilter]);

  // Today's Stock Summary for current remaining stock reference
  const todaySummary = useMemo(() => {
    return calculateDailyStockSummary(todayStr, stockEntries, orders, stockSourceFilter);
  }, [todayStr, stockEntries, orders, stockSourceFilter]);

  // Product remaining stock map (keyed by product name)
  const productStockMap = useMemo(() => {
    const map: Record<string, number> = {};
    todaySummary.productBreakdown.forEach((p) => {
      map[p.productName] = p.remainingKg;
    });
    return map;
  }, [todaySummary]);

  // All Summaries for History
  const allSummaries = useMemo(() => {
    return getAllDailyStockSummaries(stockEntries, orders, stockSourceFilter);
  }, [stockEntries, orders, stockSourceFilter]);

  const filteredSummaries = allSummaries.filter((s) => {
    if (!historySearch.trim()) return true;
    const term = historySearch.toLowerCase();
    return (
      s.dateThaiFull.toLowerCase().includes(term) ||
      s.dateKey.includes(term) ||
      s.productBreakdown.some((p) => p.productName.toLowerCase().includes(term))
    );
  });

  // Total form weight calculation
  const currentFormTotalWeight = items.reduce((sum, i) => sum + (Number(i.weightKg) || 0), 0);

  // Print Report Handler
  const handlePrintStockReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>รายงานสรุปสต็อคการผลิต & ตัดยอดขายคงเหลือ - สุมาลี ฟู๊ด</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Sarabun', sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 0; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
            .title { font-size: 18px; font-weight: bold; }
            .subtitle { font-size: 12px; color: #475569; }
            .stats-grid { display: flex; gap: 8px; margin-bottom: 12px; }
            .stat-card { flex: 1; border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px; border-radius: 8px; text-align: center; }
            .stat-card span { display: block; font-size: 10px; color: #64748b; }
            .stat-card strong { display: block; font-size: 14px; font-weight: bold; color: #0f172a; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background: #0f172a; color: #ffffff; padding: 6px 8px; font-size: 10px; text-align: left; }
            td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">รายงานสรุปสต็อคสินค้าผลิตได้ & ตัดยอดขายคงเหลือสะสม</div>
            <div class="subtitle">ประจำวันที่: ${dailySummary.dateThaiFull} (${dailySummary.dateKey}) • บริษัท สุมาลี ฟู๊ด สระบุรี จำกัด</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}</div>
          </div>

          <div class="stats-grid">
            <div class="stat-card" style="background:#f1f5f9;">
              <span>📦 ยกมาจากเมื่อวาน</span>
              <strong style="color:#475569;">${formatWeight(dailySummary.priorRemainingKg)}</strong>
            </div>
            <div class="stat-card">
              <span>☀️ ผลิตกะเช้า</span>
              <strong style="color:#0369a1;">${formatWeight(dailySummary.dayShiftWeightKg)}</strong>
            </div>
            <div class="stat-card">
              <span>🌙 ผลิตกะดึก</span>
              <strong style="color:#6d28d9;">${formatWeight(dailySummary.nightShiftWeightKg)}</strong>
            </div>
            <div class="stat-card">
              <span>🏭 รวมผลิตเพิ่มวันนี้</span>
              <strong style="color:#0f172a;">${formatWeight(dailySummary.totalProducedKg)}</strong>
            </div>
            <div class="stat-card" style="background:#e0f2fe; border-color:#7dd3fc;">
              <span>⚖️ พร้อมขายรวมทั้งหมด</span>
              <strong style="color:#0369a1; font-size:15px;">${formatWeight(dailySummary.totalAvailableKg)}</strong>
            </div>
            <div class="stat-card" style="background:#fff1f2; border-color:#fecdd3;">
              <span>📦 ตัดยอดขายวันนี้</span>
              <strong style="color:#be123c;">-${formatWeight(dailySummary.totalSoldKg)}</strong>
            </div>
            <div class="stat-card" style="background:#ecfdf5; border-color:#6ee7b7;">
              <span>📊 คงเหลือสุทธิยกไป</span>
              <strong style="color:#047857; font-size:16px;">${formatWeight(dailySummary.remainingStockKg)}</strong>
            </div>
          </div>

          <h3>รายละเอียดสินค้าและสต็อคคงเหลือสะสมแยกตามชนิด</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 4%;">#</th>
                <th style="width: 28%;">ชื่อรายการสินค้า</th>
                <th style="width: 10%; text-align: right;">ยกมาจากเมื่อวาน</th>
                <th style="width: 9%; text-align: right;">กะเช้า</th>
                <th style="width: 9%; text-align: right;">กะดึก</th>
                <th style="width: 10%; text-align: right;">รวมผลิตวันนี้</th>
                <th style="width: 11%; text-align: right;">พร้อมขายรวม</th>
                <th style="width: 10%; text-align: right;">ตัดยอดขาย</th>
                <th style="width: 9%; text-align: right;">คงเหลือยกไป</th>
              </tr>
            </thead>
            <tbody>
              ${dailySummary.productBreakdown.map((p, idx) => `
                <tr>
                  <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                  <td><strong>${p.productName}</strong></td>
                  <td style="text-align: right; color: #475569;">${formatWeight(p.priorRemainingKg)}</td>
                  <td style="text-align: right;">${formatWeight(p.dayShiftKg)}</td>
                  <td style="text-align: right;">${formatWeight(p.nightShiftKg)}</td>
                  <td style="text-align: right; font-weight: bold;">${formatWeight(p.producedKg)}</td>
                  <td style="text-align: right; font-weight: bold; color: #0284c7;">${formatWeight(p.availableKg)}</td>
                  <td style="text-align: right; color: #be123c; font-weight: bold;">-${formatWeight(p.soldKg)}</td>
                  <td style="text-align: right; font-weight: bold; color: ${p.remainingKg >= 0 ? '#047857' : '#b91c1c'}; font-size: 11px;">
                    ${formatWeight(p.remainingKg)}
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* TOAST FEEDBACK */}
        {successToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-800 text-white px-4 py-2 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{successToast}</span>
          </div>
        )}

        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-400/30">
              <Scale className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>จัดการคีย์สต็อคโรงงาน & ตัดยอดขายคงเหลือ</span>
              </h2>
              <p className="text-xs text-slate-300">
                คีย์บันทึกยอดผลิตแยกกะเช้า-กะดึก ตัดยอดขายออกอัตโนมัติ และเช็คสินค้าพร้อมขายต่อวัน
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP NAVIGATION TABS */}
        <div className="bg-slate-900 text-white border-b border-slate-800 px-4 pt-2 flex items-center justify-between overflow-x-auto shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-t border-x ${
                activeTab === 'summary'
                  ? 'bg-white text-slate-900 border-white font-extrabold shadow-sm'
                  : 'bg-slate-800/60 text-slate-300 hover:text-white border-transparent'
              }`}
            >
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>สรุปสต็อค & ตัดยอดขายวันนี้</span>
            </button>

            <button
              onClick={() => {
                resetForm();
                setActiveTab('form');
              }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-t border-x ${
                activeTab === 'form'
                  ? 'bg-white text-slate-900 border-white font-extrabold shadow-sm'
                  : 'bg-slate-800/60 text-slate-300 hover:text-white border-transparent'
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>{editingEntryId ? 'แก้ไขรายการคีย์สต็อค' : '+ คีย์บันทึกสต็อคเข้าระบบ'}</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-t border-x ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 border-white font-extrabold shadow-sm'
                  : 'bg-slate-800/60 text-slate-300 hover:text-white border-transparent'
              }`}
            >
              <History className="w-4 h-4 text-amber-400" />
              <span>ประวัติการคีย์สต็อคย้อนหลัง</span>
            </button>
          </div>

          {activeTab === 'summary' && (
            <button
              onClick={handlePrintStockReport}
              className="mb-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์รายงานสต็อค</span>
            </button>
          )}
        </div>

        {/* TAB CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/50">

          {/* TAB 1: FORM (คีย์บันทึกสต็อคเข้าระบบ) */}
          {activeTab === 'form' && (
            <form onSubmit={handleSubmitEntry} className="max-w-4xl mx-auto space-y-5">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                      <Plus className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {editingEntryId ? 'แก้ไขรายการคีย์สต็อคการผลิต' : 'บันทึกคีย์สต็อคสินค้าผลิตได้จากโรงงาน'}
                    </h3>
                  </div>
                  {editingEntryId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      ยกเลิกการแก้ไข (สร้างใหม่)
                    </button>
                  )}
                </div>

                {/* Date, Shift, Stock Location, Supervisor Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date Picker */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>วันที่ผลิต / คีย์สต็อค</span>
                    </label>
                    <input
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  {/* Shift Picker (กะเช้า / กะดึก) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>กะการทำงาน (Shift)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShift('day')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          shift === 'day'
                            ? 'bg-amber-500 text-white shadow-xs border border-amber-600'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>กะเช้า</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShift('night')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          shift === 'night'
                            ? 'bg-indigo-900 text-white shadow-xs border border-indigo-950'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5 text-indigo-300" />
                        <span>กะดึก</span>
                      </button>
                    </div>
                  </div>

                  {/* Stock Location Picker (โรงงาน / ออนไลน์) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Factory className="w-3.5 h-3.5 text-emerald-600" />
                      <span>คลังสต็อคที่นำเข้า</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEntryStockSource('factory')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                          entryStockSource === 'factory'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <Factory className="w-3.5 h-3.5" />
                        <span>โรงงาน</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEntryStockSource('online')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                          entryStockSource === 'online'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>ออนไลน์</span>
                      </button>
                    </div>
                  </div>

                  {/* Recorded By / Supervisor */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>ผู้บันทึก / หัวหน้ากะ</span>
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น สมชาย (หัวหน้ากะเช้า)..."
                      value={recordedBy}
                      onChange={(e) => setRecordedBy(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Quick Add Preset Buttons */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700">
                      ตัวเลือกสินค้าที่สามารถคีย์เข้าสต็อคได้ (กดคลิกเติมด่วน +50 กก.):
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold border border-emerald-200">
                      {FACTORY_STOCK_PRODUCT_OPTIONS.length} รายการสต็อคโรงงาน
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {FACTORY_STOCK_PRODUCT_OPTIONS.map((p) => {
                      const remKg = productStockMap[p.name] ?? 0;
                      return (
                        <button
                          key={p.code}
                          type="button"
                          onClick={() => handleQuickAddPreset(p.name)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-800 hover:text-emerald-950 rounded-xl text-xs font-bold border border-slate-200 transition-colors text-left flex flex-col justify-center gap-0.5"
                        >
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span className="text-[10px] text-emerald-700 font-extrabold">รหัส {p.code}</span>
                            <span
                              className={`text-[10px] font-extrabold ${
                                remKg < 0
                                  ? 'text-rose-600'
                                  : remKg === 0
                                  ? 'text-slate-400'
                                  : 'text-emerald-700'
                              }`}
                            >
                              คงเหลือ {formatWeight(remKg)}
                            </span>
                          </div>
                          <span className="truncate">{p.name.replace(/\(รหัส.*\)/, '')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Product Items Table Entry */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      รายการสินค้าที่ผลิตได้
                    </span>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มแถวสินค้า</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {items.map((item, idx) => {
                      const selRemKg = item.productName ? (productStockMap[item.productName] ?? 0) : null;

                      return (
                        <div
                          key={item.id}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                        >
                          {/* Product Name Dropdown Selection */}
                          <div className="sm:col-span-6">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                              เลือกสินค้า #{idx + 1} (สินค้าสต็อคโรงงาน)
                            </label>
                            <select
                              value={item.productName}
                              onChange={(e) => handleUpdateItem(item.id, 'productName', e.target.value)}
                              required
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                              <option value="">-- เลือกรายการสินค้า --</option>
                              {FACTORY_STOCK_PRODUCT_OPTIONS.map((p) => (
                                <option key={p.code} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                            </select>

                            {selRemKg !== null && (
                              <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                                <span className="text-slate-500 font-medium">สต็อกคงเหลือสินค้าชนิดนี้:</span>
                                <span
                                  className={`font-black px-2 py-0.5 rounded-md text-[10px] ${
                                    selRemKg < 0
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : selRemKg === 0
                                      ? 'bg-slate-100 text-slate-600 border border-slate-300'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  }`}
                                >
                                  {formatWeight(selRemKg)}
                                </span>
                              </div>
                            )}
                          </div>

                        {/* Weight Kg */}
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            น้ำหนักที่ผลิตได้ (กิโลกรัม)
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            placeholder="0.00"
                            value={item.weightKg}
                            onChange={(e) =>
                              handleUpdateItem(item.id, 'weightKg', e.target.value ? Number(e.target.value) : '')
                            }
                            required
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>

                        {/* Remove button */}
                        <div className="sm:col-span-1 flex items-end justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={items.length <= 1}
                            className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                  {/* Total Weight Summary */}
                  <div className="bg-emerald-950 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
                    <span className="text-xs text-emerald-300 font-semibold">
                      รวมน้ำหนักที่ผลิตได้ทั้งหมดในรอบคีย์นี้ ({shift === 'day' ? 'กะเช้า' : 'กะดึก'}):
                    </span>
                    <span className="text-xl font-black text-emerald-300">
                      {formatWeight(currentFormTotalWeight)}
                    </span>
                  </div>

                  {/* Note input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      หมายเหตุการผลิต (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ล็อตการผลิตพิเศษ, วัตถุดิบคุณภาพเกรด A..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'กำลังบันทึก...' : editingEntryId ? 'บันทึกการแก้ไข' : 'บันทึกคีย์สต็อคเข้าระบบ'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SUMMARY & DAILY REMAINING BALANCE (สรุปสต็อค & ตัดยอดขาย) */}
          {activeTab === 'summary' && (
            <div className="space-y-5">
              
              {/* Date & Stock Source Filter Bar */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">วันที่:</span>
                    <input
                      type="date"
                      value={selectedSummaryDate}
                      onChange={(e) => setSelectedSummaryDate(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button
                      onClick={() => setSelectedSummaryDate(todayStr)}
                      className="px-2.5 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg text-xs font-bold transition-colors"
                    >
                      วันนี้
                    </button>
                  </div>

                  <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

                  {/* Stock Source Filter Buttons */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                      onClick={() => setStockSourceFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        stockSourceFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📦 ทุกคลังรวมกัน
                    </button>
                    <button
                      onClick={() => setStockSourceFilter('factory')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        stockSourceFilter === 'factory'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      <Factory className="w-3.5 h-3.5" />
                      <span>โรงงาน</span>
                    </button>
                    <button
                      onClick={() => setStockSourceFilter('online')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        stockSourceFilter === 'online'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-blue-700'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>ออนไลน์</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-semibold flex items-center justify-between md:justify-end gap-2">
                  <span>ประจำวันที่: <strong className="text-slate-900 font-black">{dailySummary.dateThaiFull}</strong></span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    stockSourceFilter === 'factory'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : stockSourceFilter === 'online'
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {stockSourceFilter === 'factory' ? '🏭 คลังโรงงาน' : stockSourceFilter === 'online' ? '🌐 คลังออนไลน์' : '📦 รวมทุกคลัง'}
                  </span>
                </div>
              </div>

              {/* OVERVIEW STAT CARDS WITH CUMULATIVE PRIOR BALANCE */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {/* 1. Prior Remaining Balance */}
                <div className="bg-slate-100 p-3 rounded-2xl border border-slate-300 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-extrabold text-slate-600 block mb-1">
                    📦 ยกมาจากเมื่อวาน
                  </span>
                  <span className="text-lg font-black text-slate-700">
                    {formatWeight(dailySummary.priorRemainingKg)}
                  </span>
                </div>

                {/* 2. Day Shift Produced */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                    <span className="font-bold flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>กะเช้า</span>
                    </span>
                  </div>
                  <span className="text-lg font-black text-amber-600">
                    {formatWeight(dailySummary.dayShiftWeightKg)}
                  </span>
                </div>

                {/* 3. Night Shift Produced */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                    <span className="font-bold flex items-center gap-1">
                      <Moon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>กะดึก</span>
                    </span>
                  </div>
                  <span className="text-lg font-black text-indigo-700">
                    {formatWeight(dailySummary.nightShiftWeightKg)}
                  </span>
                </div>

                {/* 4. Total Produced Today */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">
                    🏭 รวมผลิตเพิ่มวันนี้
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {formatWeight(dailySummary.totalProducedKg)}
                  </span>
                </div>

                {/* 5. Total Available Stock (Prior + Today Produced) */}
                <div className="bg-sky-50 p-3 rounded-2xl border border-sky-300 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-extrabold text-sky-800 block mb-1">
                    ⚖️ พร้อมขายรวมทั้งหมด
                  </span>
                  <span className="text-lg font-black text-sky-700">
                    {formatWeight(dailySummary.totalAvailableKg)}
                  </span>
                </div>

                {/* 6. Total Sold Today */}
                <div className="bg-rose-50/80 p-3 rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-rose-700 block mb-1">
                    🛒 ตัดยอดขายวันนี้
                  </span>
                  <span className="text-lg font-black text-rose-700">
                    -{formatWeight(dailySummary.totalSoldKg)}
                  </span>
                </div>

                {/* 7. Remaining Stock Ending Balance */}
                <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-emerald-900 text-white p-3 rounded-2xl border border-emerald-800 shadow-md flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-emerald-300 block mb-1">
                    📊 คงเหลือสุทธิยกไป
                  </span>
                  <span className="text-xl font-black text-emerald-300">
                    {formatWeight(dailySummary.remainingStockKg)}
                  </span>
                </div>
              </div>

              {/* WARNING ALERTS */}
              {dailySummary.remainingStockKg < 0 && (
                <div className="bg-rose-100 border border-rose-300 text-rose-900 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>
                    คำเตือน: ยอดขายสินค้าในวันนี้ ({formatWeight(dailySummary.totalSoldKg)}) สูงกว่ายอดสต็อคพร้อมขายรวมทั้งหมด ({formatWeight(dailySummary.totalAvailableKg)}) กรุณาตรวจสอบยอดการผลิตกะเช้า/กะดึก หรือคีย์สต็อคเพิ่มเติม!
                  </span>
                </div>
              )}

              {/* PRODUCT BREAKDOWN DETAILED TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold">
                      ตารางเช็คสินค้าและสต็อคสะสมพร้อมขายแยกตามชนิดสินค้า
                    </h3>
                  </div>
                  <span className="text-xs text-slate-300 font-semibold">
                    รวมทั้งสิ้น {dailySummary.productBreakdown.length} ชนิดสินค้า
                  </span>
                </div>

                <div className="p-4 overflow-x-auto">
                  {dailySummary.productBreakdown.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Scale className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-medium">ยังไม่มีข้อมูลการผลิตหรือออเดอร์ในวันที่เลือก</p>
                      <button
                        onClick={() => setActiveTab('form')}
                        className="mt-3 px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                      >
                        + คีย์บันทึกสต็อคแรกของวันนี้
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider">
                          <th className="p-3 rounded-l-xl">ชื่อรายการสินค้า</th>
                          <th className="p-2.5 text-right text-slate-600">📦 ยกมาจากเมื่อวาน</th>
                          <th className="p-2.5 text-right">☀️ กะเช้า</th>
                          <th className="p-2.5 text-right">🌙 กะดึก</th>
                          <th className="p-2.5 text-right font-bold text-slate-900">🏭 รวมผลิตเพิ่ม</th>
                          <th className="p-2.5 text-right font-extrabold text-sky-700 bg-sky-50/50">⚖️ พร้อมขายรวม</th>
                          <th className="p-2.5 text-right text-rose-700">🛒 ตัดยอดขาย</th>
                          <th className="p-2.5 text-right font-black">📊 คงเหลือยกไป</th>
                          <th className="p-3 text-center rounded-r-xl">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {dailySummary.productBreakdown.map((p, idx) => {
                          const isNegative = p.remainingKg < 0;
                          const isZero = p.remainingKg === 0;
                          const isLow = p.remainingKg > 0 && p.remainingKg < (p.availableKg * 0.15 || 50);

                          return (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3">
                                <span className="font-extrabold text-slate-900 block">{p.productName}</span>
                              </td>

                              <td className="p-2.5 text-right font-semibold text-slate-600">
                                {formatWeight(p.priorRemainingKg)}
                              </td>

                              <td className="p-2.5 text-right font-medium text-amber-700">
                                {formatWeight(p.dayShiftKg)}
                              </td>

                              <td className="p-2.5 text-right font-medium text-indigo-800">
                                {formatWeight(p.nightShiftKg)}
                              </td>

                              <td className="p-2.5 text-right font-extrabold text-slate-900">
                                {formatWeight(p.producedKg)}
                              </td>

                              <td className="p-2.5 text-right font-black text-sky-800 bg-sky-50/40">
                                {formatWeight(p.availableKg)}
                              </td>

                              <td className="p-2.5 text-right font-extrabold text-rose-600">
                                -{formatWeight(p.soldKg)}
                              </td>

                              <td className="p-2.5 text-right">
                                <span
                                  className={`font-black text-sm px-2.5 py-1 rounded-lg inline-block ${
                                    isNegative
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : isZero
                                      ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  }`}
                                >
                                  {formatWeight(p.remainingKg)}
                                </span>
                              </td>

                              <td className="p-3 text-center">
                                {isNegative ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> ขายเกินสต็อค
                                  </span>
                                ) : isZero ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 inline-flex items-center gap-1">
                                    <PackageX className="w-3 h-3" /> สต็อคหมด
                                  </span>
                                ) : isLow ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> สินค้าเหลือน้อย
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                                    <PackageCheck className="w-3 h-3" /> พร้อมขาย
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* SHIFT ENTRIES DETAILED LIST FOR SELECTED SUMMARY DATE */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-extrabold text-slate-900">
                      รายการคีย์บันทึกการผลิตของวันที่ {dailySummary.dateThaiFull} ({selectedSummaryDate})
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      setEntryDate(selectedSummaryDate);
                      setActiveTab('form');
                    }}
                    className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ คีย์เพิ่มของวันนี้</span>
                  </button>
                </div>

                {stockEntries.filter((e) => e.dateKey === selectedSummaryDate).length === 0 ? (
                  <div className="text-xs text-slate-400 italic p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    ยังไม่มีรายการคีย์บันทึกการผลิตในวันที่เลือกนี้ (ยอดขายถูกตัดจากสต็อคยกมาจากเมื่อวาน)
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {stockEntries
                      .filter((e) => e.dateKey === selectedSummaryDate)
                      .map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-300 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  entry.shift === 'day'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                                }`}
                              >
                                {entry.shift === 'day' ? '☀️ กะเช้า' : '🌙 กะดึก'}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                ผลิตได้รวม: <strong className="text-emerald-700">{formatWeight(entry.totalWeightKg)}</strong>
                              </span>
                              {entry.recordedBy && (
                                <span className="text-[11px] text-slate-500">
                                  (ผู้บันทึก: {entry.recordedBy})
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {entry.items.map((it, iIdx) => {
                                const normName = normalizeProductName(it.productName) || it.productName;
                                const pBreakdown = dailySummary.productBreakdown.find((p) => p.productName === normName);
                                const remKg = pBreakdown ? pBreakdown.remainingKg : (productStockMap[normName] ?? 0);

                                return (
                                  <span
                                    key={iIdx}
                                    className="text-[11px] bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1.5"
                                  >
                                    <span>{it.productName}:</span>
                                    <strong className="text-emerald-700">{formatWeight(it.weightKg)}</strong>
                                    <span
                                      className={`text-[10px] font-bold border-l border-slate-200 pl-1.5 ${
                                        remKg < 0 ? 'text-rose-600 font-black' : 'text-slate-500'
                                      }`}
                                    >
                                      (สต็อกคงเหลือ: {formatWeight(remKg)})
                                    </span>
                                  </span>
                                );
                              })}
                            </div>

                            {entry.note && (
                              <p className="text-[11px] text-slate-500 italic">
                                หมายเหตุ: {entry.note}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleEditEntry(entry)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              แก้ไข
                            </button>
                            <button
                              onClick={() => handleDeleteRequest(entry)}
                              className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                              title="ลบรายการบันทึกสต็อคนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              ลบการคีย์
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: HISTORICAL LOGS (ประวัติการคีย์สต็อคย้อนหลัง) */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              
              {/* Filter Toolbar */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="ค้นหาวันที่ หรือชื่อสินค้า..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  {/* Stock Location Filter in History */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                      onClick={() => setStockSourceFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        stockSourceFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ทุกคลัง
                    </button>
                    <button
                      onClick={() => setStockSourceFilter('factory')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        stockSourceFilter === 'factory'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      <Factory className="w-3.5 h-3.5" />
                      <span>โรงงาน</span>
                    </button>
                    <button
                      onClick={() => setStockSourceFilter('online')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        stockSourceFilter === 'online'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-blue-700'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>ออนไลน์</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-semibold">
                  พบบันทึกย้อนหลังรวม <strong className="text-slate-900">{filteredSummaries.length} วัน</strong> ({stockEntries.filter(e => stockSourceFilter === 'all' || (e.stockSource || 'factory') === stockSourceFilter).length} รอบคีย์)
                </div>
              </div>

              {/* Historical Entries Cards List */}
              <div className="space-y-3">
                {filteredSummaries.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <History className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">ไม่พบบันทึกประวัติสต็อคตามเงื่อนไขที่ค้นหา</p>
                  </div>
                ) : (
                  filteredSummaries.map((summary) => {
                    const dateEntries = stockEntries.filter(
                      (e) => e.dateKey === summary.dateKey && (stockSourceFilter === 'all' || (e.stockSource || 'factory') === stockSourceFilter)
                    );

                    return (
                      <div
                        key={summary.dateKey}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all overflow-hidden"
                      >
                        {/* Day Header */}
                        <div className="p-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-400/30">
                              <Calendar className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-white">{summary.dateThaiFull}</span>
                                <span className="text-[11px] font-mono text-slate-400">({summary.dateKey})</span>
                              </div>
                              <p className="text-[11px] text-slate-300 mt-0.5">
                                บันทึกการผลิตทั้งหมด: <strong className="text-white">{summary.entriesCount} รอบ</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="bg-slate-800 text-amber-300 px-2.5 py-1 rounded-lg border border-slate-700 font-bold">
                              ☀️ เช้า: {formatWeight(summary.dayShiftWeightKg)}
                            </span>
                            <span className="bg-slate-800 text-indigo-300 px-2.5 py-1 rounded-lg border border-slate-700 font-bold">
                              🌙 ดึก: {formatWeight(summary.nightShiftWeightKg)}
                            </span>
                            <span className="bg-emerald-800 text-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-700 font-black">
                              ⚖️ คงเหลือพร้อมขาย: {formatWeight(summary.remainingStockKg)}
                            </span>
                          </div>
                        </div>

                        {/* Individual Shift Entries for this date */}
                        <div className="p-3.5 space-y-3 bg-slate-50/50">
                          {dateEntries.length === 0 ? (
                            <div className="text-xs text-slate-400 italic">
                              ไม่มีรอบการคีย์สต็อคในวันนี้ (เฉพาะยอดขายจากออเดอร์)
                            </div>
                          ) : (
                            dateEntries.map((entry) => (
                              <div
                                key={entry.id}
                                className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                              >
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                        entry.shift === 'day'
                                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                          : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                                      }`}
                                    >
                                      {entry.shift === 'day' ? '☀️ กะเช้า' : '🌙 กะดึก'}
                                    </span>

                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border ${
                                        (entry.stockSource || 'factory') === 'online'
                                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      }`}
                                    >
                                      {(entry.stockSource || 'factory') === 'online' ? (
                                        <>
                                          <Globe className="w-3 h-3 text-blue-600" />
                                          <span>คลังออนไลน์</span>
                                        </>
                                      ) : (
                                        <>
                                          <Factory className="w-3 h-3 text-emerald-600" />
                                          <span>คลังโรงงาน</span>
                                        </>
                                      )}
                                    </span>

                                    <span className="text-xs font-bold text-slate-800">
                                      ผลิตได้รวม: <strong className="text-emerald-700">{formatWeight(entry.totalWeightKg)}</strong>
                                    </span>
                                    {entry.recordedBy && (
                                      <span className="text-[11px] text-slate-500">
                                        (ผู้บันทึก: {entry.recordedBy})
                                      </span>
                                    )}
                                  </div>

                                  {/* List of items in this entry */}
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {entry.items.map((it, iIdx) => {
                                      const normName = normalizeProductName(it.productName) || it.productName;
                                      const pBreakdown = summary.productBreakdown.find((p) => p.productName === normName);
                                      const remKg = pBreakdown ? pBreakdown.remainingKg : (productStockMap[normName] ?? 0);

                                      return (
                                        <span
                                          key={iIdx}
                                          className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1.5"
                                        >
                                          <span>{it.productName}:</span>
                                          <strong className="text-emerald-700">{formatWeight(it.weightKg)}</strong>
                                          <span
                                            className={`text-[10px] font-bold border-l border-slate-200 pl-1.5 ${
                                              remKg < 0 ? 'text-rose-600 font-black' : 'text-slate-500'
                                            }`}
                                          >
                                            (สต็อกคงเหลือ: {formatWeight(remKg)})
                                          </span>
                                        </span>
                                      );
                                    })}
                                  </div>

                                  {entry.note && (
                                    <p className="text-[11px] text-slate-500 italic">
                                      หมายเหตุ: {entry.note}
                                    </p>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => handleEditEntry(entry)}
                                    className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    แก้ไข
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRequest(entry)}
                                    className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                                    title="ลบรายการบันทึกสต็อคนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                    ลบการคีย์
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-center shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-md"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* CONFIRM DELETE STOCK ENTRY MODAL OVERLAY */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 text-left">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  ยืนยันการลบรายการบันทึกสต็อค
                </h3>
                <p className="text-xs text-slate-500">
                  การดำเนินการนี้จะลบรายการคีย์ออกจากระบบทันที
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">วันที่คีย์สต็อค:</span>
                <span className="font-bold text-slate-900">{deletingEntry.dateKey}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">รอบการผลิต:</span>
                <span className="font-bold text-slate-900">
                  {deletingEntry.shift === 'day' ? '☀️ กะเช้า' : '🌙 กะดึก'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ยอดรวมน้ำหนักผลิต:</span>
                <span className="font-extrabold text-emerald-700">
                  {formatWeight(deletingEntry.totalWeightKg)}
                </span>
              </div>
              {deletingEntry.recordedBy && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">ผู้บันทึก:</span>
                  <span className="font-semibold text-slate-800">{deletingEntry.recordedBy}</span>
                </div>
              )}

              {/* Item breakdown & current remaining stock */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <span className="font-extrabold text-slate-900 block text-[11px]">
                  รายการสินค้าในรอบคีย์นี้ & สต็อคคงเหลือปัจจุบัน:
                </span>
                {deletingEntry.items.map((it, idx) => {
                  const normName = normalizeProductName(it.productName) || it.productName;
                  const remKg = productStockMap[normName] ?? 0;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 text-[11px]"
                    >
                      <span className="font-bold text-slate-800 truncate max-w-[170px]">
                        {it.productName}
                      </span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-600 block text-[10px]">
                          คีย์ผลิต: {formatWeight(it.weightKg)}
                        </span>
                        <span
                          className={`font-black text-[10px] ${
                            remKg < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          สต็อคคงเหลือ: {formatWeight(remKg)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-xs font-semibold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
              ⚠️ เมื่อลบแล้ว ยอดรวมผลิตและคงเหลือสต็อคสินค้าในระบบจะถูกคำนวณใหม่ทันที
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-colors shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'กำลังลบ...' : 'ยืนยันลบรายการ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
