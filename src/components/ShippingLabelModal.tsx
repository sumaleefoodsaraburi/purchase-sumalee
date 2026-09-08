import React from 'react';
import { PurchaseOrder } from '../types';
import { formatCurrency, formatWeight, formatThaiDateTime } from '../utils/formatters';
import { triggerPrintHtml, openPrintWindow, getShippingLabelHtml } from '../utils/printHelper';
import { getAllTrackingNumbers } from '../utils/trackingUtils';
import { Printer, ExternalLink, X, MapPin, Phone, Package, Building2, AlertCircle, Truck, Layers } from 'lucide-react';

interface ShippingLabelModalProps {
  order: PurchaseOrder | null;
  onClose: () => void;
}

export const ShippingLabelModal: React.FC<ShippingLabelModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    triggerPrintHtml(getShippingLabelHtml(order));
  };

  const handleOpenNewTab = () => {
    openPrintWindow(getShippingLabelHtml(order));
  };

  return (
    <div className="fixed inset-[#0] z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        
        {/* MODAL CONTROL HEADER (Hidden when printing) */}
        <div className="no-print print:hidden bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm text-white">ใบจ่าหน้าซองพัสดุ (Shipping Label)</h3>
              <p className="text-[11px] text-slate-400">สำหรับแปะหน้ากล่อง/ซองพัสดุ พิมพ์ขนาดมาตรฐาน</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewTab}
              title="เปิดหน้าพิมพ์ในแท็บใหม่"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">แท็บใหม่</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบจ่าหน้าซอง</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE LABEL AREA */}
        <div className="p-6 bg-slate-50 overflow-y-auto max-h-[80vh]">
          <div className="printable-content bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 space-y-6 max-w-xl mx-auto shadow-md">
            
            {/* TOP HEADER: BARCODE / PO NUMBER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-900 pb-4 gap-4">
              <div>
                <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-wider">
                  PARCEL LABEL / ใบจ่าหน้าซอง
                </span>
                <p className="text-xs font-black text-slate-900 mt-1 font-mono">
                  PO NO: {order.orderNumber}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  วันที่: {formatThaiDateTime(order.createdAt)}
                </p>
              </div>

              {/* COD BADGE OR PAID BADGE */}
              <div className="shrink-0 w-full sm:w-auto">
                {order.paymentStatus === 'cod' ? (
                  <div className="bg-rose-50 border-2 border-rose-600 rounded-xl p-3 text-center">
                    <span className="text-[11px] font-black text-rose-700 block uppercase tracking-wider">
                      ⚠️ เก็บเงินปลายทาง (COD)
                    </span>
                    <span className="text-xl font-black text-rose-800 font-mono">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border-2 border-emerald-600 rounded-xl p-3 text-center">
                    <span className="text-xs font-black text-emerald-800 block">
                      ✓ ชำระเงินเรียบร้อยแล้ว
                    </span>
                    <span className="text-[11px] text-emerald-700">ไม่ต้องเรียกเก็บเงิน</span>
                  </div>
                )}
              </div>
            </div>

            {/* SENDER BOX (ผู้ส่ง) */}
            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 text-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-700 font-black text-xs uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>ผู้ส่ง (SENDER)</span>
              </div>
              <p className="font-extrabold text-slate-900 text-base">บริษัท สุมาลี ฟู๊ด สระบุรี จำกัด</p>
              <p className="font-medium text-slate-600 text-xs">SUMALEE FOOD SARABURI CO., LTD.</p>
              <p className="text-slate-700 text-xs sm:text-sm font-medium">38/1 หมู่ที่ 6 ตำบลกุดนกเปล้า อำเภอเมืองสระบุรี จ.สระบุรี 18000</p>
              <p className="font-extrabold text-slate-900 text-sm font-mono pt-1">โทร. 081-123-8415</p>
            </div>

            {/* RECIPIENT BOX (ผู้รับ - PROMINENT & LARGE FOR A4) */}
            <div className="border-4 border-slate-900 rounded-2xl p-6 bg-white text-slate-900 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5 mb-2">
                <div className="flex items-center gap-2 text-rose-600 font-black text-base uppercase tracking-wider">
                  <MapPin className="w-6 h-6 text-rose-600 shrink-0" />
                  <span>ผู้รับ (RECIPIENT / SHIP TO)</span>
                </div>
                {order.boxCount && (
                  <span className="text-sm font-mono font-black bg-slate-100 text-slate-900 px-3 py-1 rounded-lg border border-slate-300">
                    📦 {order.boxCount} กล่อง
                  </span>
                )}
              </div>

              <div className="space-y-2 pl-1">
                <p className="text-2xl font-black text-slate-950 tracking-tight leading-snug">
                  {order.customer.name}
                </p>
                <div>
                  <div className="inline-flex items-center gap-2 text-lg font-black text-blue-800 font-mono bg-blue-50 px-3.5 py-1.5 rounded-xl border-2 border-blue-300">
                    <Phone className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>{order.customer.phone}</span>
                  </div>
                </div>
                <p className="text-lg font-bold text-slate-900 leading-relaxed pt-1 whitespace-pre-line">
                  {order.customer.address}
                </p>
              </div>
            </div>

            {/* TRACKING INFO IF PRESENT (รองรับหลายกล่อง) */}
            {(() => {
              const trackings = getAllTrackingNumbers(order);
              if (trackings.length === 0) return null;
              if (trackings.length === 1) {
                return (
                  <div className="border-2 border-amber-400 bg-amber-50 rounded-xl p-3 text-xs sm:text-sm text-amber-950 font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>ขนส่ง: {order.courierName || 'Flash Express'}</span>
                    </div>
                    <div className="font-mono text-base font-black text-slate-900">
                      เลขพัสดุ: {trackings[0]}
                    </div>
                  </div>
                );
              }
              return (
                <div className="border-2 border-amber-400 bg-amber-50 rounded-xl p-3 text-xs sm:text-sm text-amber-950 font-bold space-y-2">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>ขนส่ง: {order.courierName || 'Flash Express'}</span>
                    </div>
                    <span className="text-xs bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>จัดส่งแยก {trackings.length} กล่อง</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    {trackings.map((trk, i) => (
                      <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-200">
                        <span className="text-xs text-amber-900 font-bold">กล่องที่ {i + 1}:</span>
                        <span className="font-mono text-sm font-black text-slate-900">{trk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* REMARK / NOTE IF PRESENT */}
            {order.note && (
              <div className="border-2 border-dashed border-amber-400 bg-amber-50 rounded-xl p-3.5 text-xs sm:text-sm text-amber-900 font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span><strong>หมายเหตุจัดส่ง:</strong> {order.note}</span>
              </div>
            )}

            {/* FOOTER BARCODE STUB */}
            <div className="pt-2 text-center text-slate-400 font-mono text-[10px] space-y-1 border-t border-dashed border-slate-300">
              <div className="tracking-widest font-bold text-slate-800 text-xs">||| | ||||| |||| || ||||||| ||| ||||</div>
              <p>SUMALEE FOOD SARABURI • PARCEL EXPRESS DELIVERY</p>
            </div>

          </div>
        </div>

        {/* MODAL FOOTER BUTTONS */}
        <div className="no-print print:hidden bg-slate-100 px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewTab}
              className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดในแท็บใหม่</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบจ่าหน้าซอง</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
