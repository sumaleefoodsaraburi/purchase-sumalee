import React from 'react';
import { CustomerStat, PurchaseOrder } from '../types';
import { formatCurrency, formatWeight, formatThaiDateTime, formatThaiShortDate } from '../utils/formatters';
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  Clock,
  CheckCircle,
  FileText,
  Printer,
  ChevronRight,
  Sparkles,
  Repeat,
  Package,
} from 'lucide-react';

interface CustomerOrderHistoryModalProps {
  customer: CustomerStat | null;
  isOpen: boolean;
  onClose: () => void;
  onViewReceipt?: (order: PurchaseOrder) => void;
  onViewShippingLabel?: (order: PurchaseOrder) => void;
}

export const CustomerOrderHistoryModal: React.FC<CustomerOrderHistoryModalProps> = ({
  customer,
  isOpen,
  onClose,
  onViewReceipt,
  onViewShippingLabel,
}) => {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">{customer.name}</h3>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    customer.totalOrdersCount >= 5
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                      : customer.totalOrdersCount >= 3
                      ? 'bg-blue-500/20 text-blue-300 border-blue-400/40'
                      : customer.totalOrdersCount === 2
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-slate-700 text-slate-300 border-slate-600'
                  }`}
                >
                  {customer.tier}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono">{customer.phone}</span>
                {customer.repeatTimes > 0 ? (
                  <span className="text-emerald-400 font-semibold ml-2 flex items-center gap-1">
                    <Repeat className="w-3 h-3" />
                    ซื้อซ้ำแล้ว {customer.repeatTimes} ครั้ง (รวม {customer.totalOrdersCount} ออเดอร์)
                  </span>
                ) : (
                  <span className="text-blue-300 ml-2">ลูกค้าใหม่ (สั่งซื้อ 1 ครั้ง)</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Customer KPI Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">จำนวนออเดอร์ทั้งหมด</span>
              <span className="text-lg font-black text-slate-900">{customer.totalOrdersCount} บิล</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">
                {customer.repeatTimes > 0 ? `ซื้อซ้ำ ${customer.repeatTimes} ครั้ง` : 'สั่งครั้งแรก'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">ยอดซื้อสะสมทั้งหมด</span>
              <span className="text-lg font-black text-emerald-700">{formatCurrency(customer.totalRevenue)}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                เฉลี่ย {formatCurrency(customer.totalRevenue / customer.totalOrdersCount)}/บิล
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">น้ำหนักสินค้ารวมสะสม</span>
              <span className="text-lg font-black text-blue-700">{formatWeight(customer.totalWeightKg)}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                เฉลี่ย {formatWeight(customer.totalWeightKg / customer.totalOrdersCount)}/บิล
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">ช่วงเวลาสั่งซื้อ</span>
              <span className="text-xs font-bold text-slate-800 block truncate">
                ครั้งแรก: {formatThaiShortDate(customer.firstOrderDate)}
              </span>
              <span className="text-xs font-bold text-emerald-700 block truncate mt-0.5">
                ล่าสุด: {formatThaiShortDate(customer.lastOrderDate)}
              </span>
            </div>
          </div>

          {/* Address */}
          {customer.address && customer.address !== '-' && (
            <div className="bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 flex items-start gap-2 text-xs text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-700 mr-1">ที่อยู่จัดส่งล่าสุด:</span>
                <span>{customer.address}</span>
              </div>
            </div>
          )}

          {/* ORDERS HISTORY TIMELINE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>ประวัติคำสั่งซื้อทั้งหมด ({customer.orders.length} รายการ)</span>
              </h4>
            </div>

            <div className="space-y-2.5">
              {customer.orders.map((ord, idx) => {
                const orderNumInLifetime = customer.orders.length - idx; // e.g. Order #1, #2, #3
                const isFirstEver = orderNumInLifetime === 1;

                return (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-all shadow-2xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          #{ord.orderNumber}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isFirstEver
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isFirstEver ? '🌱 สั่งซื้อครั้งแรก' : `🔁 ซื้อซ้ำครั้งที่ ${orderNumInLifetime - 1} (บิลที่ ${orderNumInLifetime})`}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatThaiDateTime(ord.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {onViewShippingLabel && (
                          <button
                            onClick={() => onViewShippingLabel(ord)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                          >
                            <Package className="w-3 h-3" />
                            <span>จ่าหน้า</span>
                          </button>
                        )}
                        {onViewReceipt && (
                          <button
                            onClick={() => onViewReceipt(ord)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
                          >
                            <Printer className="w-3 h-3 text-slate-500" />
                            <span>ใบสั่งซื้อ PO</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        {ord.items.map((it, itIdx) => (
                          <div key={itIdx} className="flex items-center justify-between text-slate-700">
                            <span className="truncate">• {it.productName}</span>
                            <span className="font-semibold shrink-0 ml-2 font-mono text-slate-900">
                              {it.weightKg} กก. × {it.pricePerKg}฿ = {formatCurrency(it.totalPrice)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col justify-between text-right">
                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          {ord.boxCount ? <div>จำนวนกล่อง: {ord.boxCount} กล่อง</div> : null}
                          {ord.shippingFee ? <div>ค่าจัดส่ง: +{formatCurrency(ord.shippingFee)}</div> : null}
                          {ord.hasVat || (ord.vatAmount && ord.vatAmount > 0) ? (
                            <div>VAT 7%: +{formatCurrency(ord.vatAmount || 0)}</div>
                          ) : null}
                        </div>
                        <div className="flex items-baseline justify-between pt-1 border-t border-slate-200">
                          <span className="text-[11px] font-bold text-slate-500">
                            น้ำหนักรวม {formatWeight(ord.totalWeightKg)}
                          </span>
                          <span className="text-sm font-black text-emerald-700">
                            {formatCurrency(ord.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
