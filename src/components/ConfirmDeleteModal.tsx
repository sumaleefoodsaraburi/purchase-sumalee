import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  orderNumber: string;
  customerName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  orderNumber,
  customerName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">ยืนยันการลบใบสั่งซื้อ</h3>
              <p className="text-xs text-rose-100">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-800">
          <p className="text-sm">
            คุณต้องการลบใบสั่งซื้อเลขที่ <strong className="font-mono text-slate-900 font-bold px-1.5 py-0.5 bg-slate-100 rounded border">{orderNumber}</strong> ของคุณ <strong className="text-slate-900 font-bold">{customerName}</strong> ใช่หรือไม่?
          </p>

          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
            ⚠️ เมื่อลบแล้ว ข้อมูลยอดขาย รายการสินค้า และน้ำหนักของใบสั่งซื้อนี้จะถูกลบออกจากระบบทันที
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>ยืนยันลบออเดอร์</span>
          </button>
        </div>

      </div>
    </div>
  );
};
