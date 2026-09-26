import React, { useState, useMemo } from 'react';
import { CustomerStat, PurchaseOrder } from '../types';
import { formatCurrency, formatWeight, formatThaiDateTime, formatThaiShortDate } from '../utils/formatters';
import {
  exportSingleCustomerSummaryToCSV,
  getCustomerAvailableMonths,
  getCustomerDataForMonth,
} from '../utils/customerAnalytics';
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
  FileSpreadsheet,
  Download,
  Filter,
  Truck,
  ExternalLink,
} from 'lucide-react';
import { getTrackingUrl } from '../utils/trackingUtils';

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
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');

  // Available months for this customer
  const availableMonths = useMemo(() => {
    if (!customer) return [];
    return getCustomerAvailableMonths(customer);
  }, [customer]);

  // Compute monthly-specific metrics and products for this customer
  const currentMonthData = useMemo(() => {
    if (!customer) return null;
    return getCustomerDataForMonth(customer, selectedMonthKey);
  }, [customer, selectedMonthKey]);

  if (!isOpen || !customer || !currentMonthData) return null;

  const isMonthlyFiltered = selectedMonthKey !== 'all';

  const handleExportThisCustomerExcel = () => {
    exportSingleCustomerSummaryToCSV(customer, selectedMonthKey);
  };

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
              <div className="flex items-center gap-2 flex-wrap">
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportThisCustomerExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              title={`ส่งออก Excel ${isMonthlyFiltered ? `เฉพาะเดือน ${currentMonthData.monthLabel}` : 'ข้อมูลสะสมทุกเดือน'}`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isMonthlyFiltered ? `ส่งออก Excel (${currentMonthData.monthLabel})` : 'ส่งออก Excel ลูกค้ารายนี้'}
              </span>
              <span className="sm:hidden">Excel</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto space-y-4">

          {/* MONTH SELECTOR BAR */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>เลือกช่วงเดือนที่ต้องการดูข้อมูล & ส่งออก Excel:</span>
              </label>
              {isMonthlyFiltered && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  กำลังแสดง: {currentMonthData.monthLabel}
                </span>
              )}
            </div>

            {/* Quick Month Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedMonthKey('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedMonthKey === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                <span>ทุกเดือน (สะสม {customer.totalOrdersCount} บิล)</span>
              </button>

              {availableMonths.map((m) => {
                const isSelected = selectedMonthKey === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedMonthKey(m.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                    }`}
                  >
                    <span>{m.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {m.count} บิล
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Customer KPI Highlights for the Selected Month / All-time */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">
                {isMonthlyFiltered ? `จำนวนออเดอร์ (${currentMonthData.monthLabel})` : 'จำนวนออเดอร์ทั้งหมด'}
              </span>
              <span className="text-lg font-black text-slate-900">{currentMonthData.ordersCount} บิล</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {isMonthlyFiltered
                  ? `จากสะสมทั้งหมด ${customer.totalOrdersCount} บิล`
                  : customer.repeatTimes > 0
                  ? `ซื้อซ้ำ ${customer.repeatTimes} ครั้ง`
                  : 'สั่งครั้งแรก'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">
                {isMonthlyFiltered ? `ยอดซื้อ (${currentMonthData.monthLabel})` : 'ยอดซื้อสะสมทั้งหมด'}
              </span>
              <span className="text-lg font-black text-emerald-700">{formatCurrency(currentMonthData.totalRevenue)}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                เฉลี่ย{' '}
                {currentMonthData.ordersCount > 0
                  ? formatCurrency(currentMonthData.totalRevenue / currentMonthData.ordersCount)
                  : '0 ฿'}
                /บิล
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">
                {isMonthlyFiltered ? `น้ำหนักรวม (${currentMonthData.monthLabel})` : 'น้ำหนักสินค้ารวมสะสม'}
              </span>
              <span className="text-lg font-black text-blue-700">{formatWeight(currentMonthData.totalWeightKg)}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                เฉลี่ย{' '}
                {currentMonthData.ordersCount > 0
                  ? formatWeight(currentMonthData.totalWeightKg / currentMonthData.ordersCount)
                  : '0 กก.'}
                /บิล
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">
                {isMonthlyFiltered ? `ช่วงเวลาในเดือนนี้` : 'ช่วงเวลาสั่งซื้อ'}
              </span>
              <span className="text-xs font-bold text-slate-800 block truncate">
                แรก: {formatThaiShortDate(currentMonthData.firstOrderDate)}
              </span>
              <span className="text-xs font-bold text-emerald-700 block truncate mt-0.5">
                ล่าสุด: {formatThaiShortDate(currentMonthData.lastOrderDate)}
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

          {/* AGGREGATED PRODUCTS BOUGHT BY THIS CUSTOMER IN SELECTED PERIOD */}
          {currentMonthData.productsBought && currentMonthData.productsBought.length > 0 ? (
            <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-200/80 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-700" />
                  <span>
                    สรุปสินค้าที่สั่งซื้อ {isMonthlyFiltered ? `ในเดือน ${currentMonthData.monthLabel}` : 'สะสมทุกเดือน'} ({currentMonthData.productsBought.length} รายการ)
                  </span>
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-800">
                    รวม {formatWeight(currentMonthData.totalWeightKg)} • {formatCurrency(currentMonthData.totalRevenue)}
                  </span>
                  <button
                    onClick={handleExportThisCustomerExcel}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-[11px] font-bold transition-colors shadow-2xs"
                    title={`ดาวน์โหลด Excel ${isMonthlyFiltered ? `เดือน ${currentMonthData.monthLabel}` : 'ทุกเดือน'}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Excel {isMonthlyFiltered ? `(${currentMonthData.monthLabel})` : ''}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentMonthData.productsBought.map((p, pIdx) => (
                  <div
                    key={pIdx}
                    className="bg-white p-2.5 rounded-lg border border-emerald-200/60 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-slate-900 truncate">
                        {p.productName}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        {p.packSize && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200 text-[10px]">
                            {p.packSize}
                          </span>
                        )}
                        <span>สั่ง {p.ordersCount} ครั้ง</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900 block font-mono">
                        {formatWeight(p.totalWeightKg)}
                      </span>
                      <span className="font-bold text-emerald-700 text-[11px] block font-mono">
                        {formatCurrency(p.totalAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              ไม่มีรายการสินค้าในเดือนที่เลือก ({currentMonthData.monthLabel})
            </div>
          )}

          {/* ORDERS HISTORY TIMELINE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>
                  {isMonthlyFiltered
                    ? `ใบสั่งซื้อในเดือน ${currentMonthData.monthLabel} (${currentMonthData.orders.length} บิล)`
                    : `ประวัติคำสั่งซื้อทั้งหมด (${customer.orders.length} บิล)`}
                </span>
              </h4>
              <button
                onClick={handleExportThisCustomerExcel}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>ส่งออก Excel เฉพาะรายการนี้</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {currentMonthData.orders.length === 0 ? (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  ไม่พบบิลสั่งซื้อในเดือน {currentMonthData.monthLabel}
                </div>
              ) : (
                currentMonthData.orders.map((ord, idx) => {
                  const orderNumInLifetime = customer.orders.length - customer.orders.indexOf(ord);
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
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              isFirstEver
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isFirstEver ? '🌱 สั่งซื้อครั้งแรก' : `🔁 ซื้อซ้ำ (บิลที่ ${orderNumInLifetime})`}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatThaiDateTime(ord.createdAt)}
                          </span>
                          {ord.trackingNumber && (
                            <a
                              href={getTrackingUrl(ord.courierName, ord.trackingNumber)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                              title="เปิดลิงก์เช็คสถานะพัสดุ"
                            >
                              <Truck className="w-3 h-3 text-amber-600" />
                              <span>{ord.courierName || 'Flash'}: {ord.trackingNumber}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-blue-600" />
                            </a>
                          )}
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition-colors"
                            >
                              <Printer className="w-3 h-3 text-emerald-600" />
                              <span>ใบเสร็จรับเงิน</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                          {ord.items.map((it, itIdx) => (
                            <div key={itIdx} className="flex items-center justify-between text-slate-700">
                              <span className="truncate flex items-center gap-1.5">
                                <span>• {it.productName}</span>
                                {it.packSize && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                    {it.packSize === '100g' ? '100g' : it.packSize === '500g' ? '500g' : it.packSize === '5kg' ? '5kg' : '1 กก.'}
                                  </span>
                                )}
                              </span>
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
                })
              )}
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={handleExportThisCustomerExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>
              ส่งออก Excel ลูกค้าท่านนี้ {isMonthlyFiltered ? `(เฉพาะเดือน ${currentMonthData.monthLabel})` : '(สะสมทุกเดือน)'}
            </span>
          </button>
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
