import React, { useState, useEffect } from 'react';
import { PurchaseOrder, DeliveryStatus } from '../types';
import {
  COURIER_OPTIONS,
  getTrackingUrl,
  getAllTrackingNumbers,
  generateCustomerTrackingMessage,
  copyToClipboard,
  parseMultiTrackingInput,
} from '../utils/trackingUtils';
import {
  X,
  Truck,
  Check,
  Copy,
  ExternalLink,
  FileText,
  User,
  Plus,
  Trash2,
  Layers,
  ClipboardList,
} from 'lucide-react';

interface QuickTrackingModalProps {
  order: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedOrder: PurchaseOrder) => void;
}

export const QuickTrackingModal: React.FC<QuickTrackingModalProps> = ({
  order,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !order) return null;

  const [courierName, setCourierName] = useState<string>(order.courierName || 'Flash Express');
  const [boxCount, setBoxCount] = useState<number>(order.boxCount || 1);
  const [trackingList, setTrackingList] = useState<string[]>(['']);
  const [autoSetShipped, setAutoSetShipped] = useState<boolean>(order.deliveryStatus === 'pending');
  const [showBatchPaste, setShowBatchPaste] = useState(false);
  const [batchPasteText, setBatchPasteText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (order) {
      setCourierName(order.courierName || 'Flash Express');
      setAutoSetShipped(order.deliveryStatus === 'pending');
      setCopiedIndex(null);
      setCopiedMsg(false);
      setShowBatchPaste(false);
      setBatchPasteText('');

      const existing = getAllTrackingNumbers(order);
      const count = Math.max(order.boxCount || 1, existing.length || 1);
      setBoxCount(count);

      if (existing.length > 0) {
        // Fill up to count
        const initial = [...existing];
        while (initial.length < count) {
          initial.push('');
        }
        setTrackingList(initial);
      } else {
        setTrackingList(Array(count).fill(''));
      }
    }
  }, [order]);

  const handleUpdateBoxCount = (newCount: number) => {
    const val = Math.max(1, Math.min(20, newCount));
    setBoxCount(val);
    setTrackingList((prev) => {
      const copy = [...prev];
      if (val > copy.length) {
        while (copy.length < val) {
          copy.push('');
        }
      } else if (val < copy.length) {
        return copy.slice(0, val);
      }
      return copy;
    });
  };

  const handleUpdateTrackingItem = (index: number, value: string) => {
    setTrackingList((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleAddBox = () => {
    handleUpdateBoxCount(boxCount + 1);
  };

  const handleRemoveBox = (index: number) => {
    if (boxCount <= 1) return;
    setTrackingList((prev) => prev.filter((_, i) => i !== index));
    setBoxCount((prev) => Math.max(1, prev - 1));
  };

  const handleApplyBatchPaste = () => {
    const parsed = parseMultiTrackingInput(batchPasteText);
    if (parsed.length > 0) {
      const newCount = Math.max(parsed.length, 1);
      setBoxCount(newCount);
      setTrackingList(parsed);
      setShowBatchPaste(false);
      setBatchPasteText('');
    }
  };

  const cleanedTrackings = trackingList.map((t) => t.trim()).filter((t) => t.length > 0);
  const hasAnyTracking = cleanedTrackings.length > 0;

  const handleCopySingleLink = async (index: number, trk: string) => {
    const url = getTrackingUrl(courierName, trk);
    if (!url) return;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleCopyMessage = async () => {
    const tempOrder: PurchaseOrder = {
      ...order,
      courierName,
      boxCount: Math.max(boxCount, cleanedTrackings.length || 1),
      trackingNumber: cleanedTrackings.join(', ') || undefined,
      trackingNumbers: cleanedTrackings.length > 0 ? cleanedTrackings : undefined,
    };
    const msg = generateCustomerTrackingMessage(tempOrder);
    const ok = await copyToClipboard(msg);
    if (ok) {
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2500);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const nextDeliveryStatus: DeliveryStatus =
      autoSetShipped && hasAnyTracking && order.deliveryStatus === 'pending'
        ? 'shipped'
        : order.deliveryStatus;

    const finalBoxCount = Math.max(boxCount, cleanedTrackings.length || 1);

    const updatedOrder: PurchaseOrder = {
      ...order,
      courierName: courierName.trim() || 'Flash Express',
      boxCount: finalBoxCount,
      trackingNumber: cleanedTrackings.join(', ') || undefined,
      trackingNumbers: cleanedTrackings.length > 0 ? cleanedTrackings : undefined,
      deliveryStatus: nextDeliveryStatus,
    };

    onSave(updatedOrder);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-5 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">บันทึกเลขพัสดุ (Parcel Tracking)</h3>
              <p className="text-[11px] text-amber-300/90 font-mono">
                #{order.orderNumber} • {order.customer.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY FORM */}
        <form onSubmit={handleFormSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Order Brief Info */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>{order.customer.name}</span>
                <span className="font-mono text-slate-500 font-normal">({order.customer.phone})</span>
              </div>
              <p className="text-slate-500 text-[11px] truncate max-w-xs">{order.customer.address}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono font-black text-emerald-700 text-sm">{order.totalAmount.toLocaleString()} ฿</span>
              <span className="block text-[10px] text-slate-400">
                {order.items.length} รายการ ({order.totalWeightKg} กก.)
              </span>
            </div>
          </div>

          {/* Courier Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              บริษัทขนส่ง (Carrier) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COURIER_OPTIONS.slice(0, 4).map((c) => {
                const isSelected = courierName === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCourierName(c.id)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{c.shortLabel}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
            
            {/* Extended dropdown for other couriers */}
            <div className="mt-2">
              <select
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
              >
                {COURIER_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* BOX COUNT SELECTOR (กรณีส่งหลายกล่อง) */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>จำนวนกล่องที่จัดส่งในบิลนี้:</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleUpdateBoxCount(num)}
                    className={`w-7 h-7 text-xs font-bold rounded-lg border transition-all ${
                      boxCount === num
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs font-black'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-amber-300">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={boxCount}
                    onChange={(e) => handleUpdateBoxCount(parseInt(e.target.value) || 1)}
                    className="w-12 px-1.5 py-1 text-center bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs text-amber-900 font-bold">กล่อง</span>
                </div>
              </div>
            </div>

            {/* Quick paste toggle button */}
            <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 text-[11px]">
              <span className="text-amber-800">
                {boxCount > 1 ? `📦 ส่งแยก ${boxCount} กล่องพัสดุ` : '📦 ส่งพัสดุ 1 กล่อง'}
              </span>
              <button
                type="button"
                onClick={() => setShowBatchPaste(!showBatchPaste)}
                className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 hover:underline"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>{showBatchPaste ? 'ปิดช่องวางหลายกล่อง' : 'วางเลขพัสดุหลายรายการพร้อมกัน'}</span>
              </button>
            </div>

            {/* Batch Paste Box */}
            {showBatchPaste && (
              <div className="mt-2 p-2.5 bg-white rounded-xl border border-amber-300 space-y-2 animate-in fade-in duration-100">
                <label className="block text-[11px] font-bold text-slate-700">
                  วางเลขพัสดุหลายรายการ (1 บรรทัดต่อ 1 กล่อง หรือคั่นด้วยจุลภาค):
                </label>
                <textarea
                  rows={3}
                  value={batchPasteText}
                  onChange={(e) => setBatchPasteText(e.target.value)}
                  placeholder={"TH0123456789A\nTH0123456789B\nTH0123456789C"}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBatchPaste(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyBatchPaste}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs"
                  >
                    นำเข้าแยกตามกล่อง
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* INDIVIDUAL TRACKING INPUTS PER BOX */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                เลขพัสดุแยกตามกล่อง ({courierName})
              </label>
              <button
                type="button"
                onClick={handleAddBox}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มอีก 1 กล่อง</span>
              </button>
            </div>

            {trackingList.map((trk, index) => {
              const cleanTrk = trk.trim();
              const itemUrl = getTrackingUrl(courierName, cleanTrk);

              return (
                <div
                  key={index}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 focus-within:border-amber-400 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span>กล่องที่ {index + 1} {boxCount > 1 ? `(จาก ${boxCount} กล่อง)` : ''}</span>
                    </span>

                    {boxCount > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBox(index)}
                        title="ลบกล่องนี้"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder={index === 0 ? "เช่น TH0123456789A" : `เช่น TH0123456789${String.fromCharCode(66 + index)}`}
                      value={trk}
                      onChange={(e) => handleUpdateTrackingItem(index, e.target.value)}
                      className="w-full pl-3 pr-10 py-1.5 bg-white border border-slate-300 focus:border-amber-500 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-200 outline-none uppercase placeholder:font-normal placeholder:normal-case shadow-2xs"
                    />
                    <Truck className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {cleanTrk && (
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <a
                        href={itemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1 truncate max-w-[240px]"
                      >
                        <ExternalLink className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">เช็คพัสดุกล่องที่ {index + 1}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopySingleLink(index, cleanTrk)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                          copiedIndex === index
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {copiedIndex === index ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Auto status check */}
          {order.deliveryStatus === 'pending' && (
            <label className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={autoSetShipped}
                onChange={(e) => setAutoSetShipped(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-xs font-bold text-emerald-900">
                ปรับสถานะจัดส่งเป็น "กำลังจัดส่ง (Shipped)" อัตโนมัติเมื่อบันทึก
              </span>
            </label>
          )}

          {/* Live Link & Copy Card (Multi-box customer message) */}
          {hasAnyTracking && (
            <div className="bg-amber-50/80 border border-amber-300/80 rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider block">
                    💬 ข้อความสำเร็จรูปสำหรับส่งแจ้งลูกค้า (LINE / Chat)
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    พร้อมลิงก์ติดตามพัสดุครบทั้ง {cleanedTrackings.length} กล่อง
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyMessage}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  copiedMsg
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 shadow-2xs'
                }`}
              >
                {copiedMsg ? <Check className="w-4 h-4 text-white stroke-[3]" /> : <FileText className="w-4 h-4 text-amber-700" />}
                <span>{copiedMsg ? 'คัดลอกข้อความ LINE แจ้งลูกค้าแล้ว!' : 'คัดลอกข้อความ LINE แจ้งลูกค้า (ทุกล่อง)'}</span>
              </button>
            </div>
          )}

          {/* SUBMIT BUTTONS */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>บันทึกเลขพัสดุ {boxCount > 1 ? `(${boxCount} กล่อง)` : ''}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

