import React, { useState } from 'react';
import { PurchaseOrder, SummaryPeriod } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  formatCurrency,
  formatWeight,
  formatThaiDateTime,
  filterOrdersToday,
  filterOrdersByDays,
  getAvailableMonths,
  filterOrdersByMonth,
  filterOrdersByExactDate,
} from '../utils/formatters';
import {
  Search,
  Filter,
  FileText,
  Printer,
  Edit2,
  Trash2,
  Download,
  Calendar,
  Phone,
  MapPin,
  Clock,
  Package,
  FileSpreadsheet,
} from 'lucide-react';

interface OrderListProps {
  orders: PurchaseOrder[];
  onOpenNewOrder: () => void;
  onEditOrder: (order: PurchaseOrder) => void;
  onDeleteOrder: (id: string) => void;
  onViewReceipt: (order: PurchaseOrder) => void;
  onViewShippingLabel: (order: PurchaseOrder) => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  onOpenNewOrder,
  onEditOrder,
  onDeleteOrder,
  onViewReceipt,
  onViewShippingLabel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<SummaryPeriod | string>('all');
  const [specificDate, setSpecificDate] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);

  // Available months from data
  const availableMonths = getAvailableMonths(orders);

  // Filter logic
  let filtered = orders;

  // Specific Date Filter takes priority if set
  if (specificDate) {
    filtered = filterOrdersByExactDate(filtered, specificDate);
  } else if (selectedPeriod === 'today') {
    filtered = filterOrdersToday(filtered);
  } else if (selectedPeriod === '7days') {
    filtered = filterOrdersByDays(filtered, 7);
  } else if (selectedPeriod === '30days') {
    filtered = filterOrdersByDays(filtered, 30);
  } else if (selectedPeriod !== 'all') {
    // Specific month key e.g. "2026-06"
    filtered = filterOrdersByMonth(filtered, selectedPeriod);
  }

  // Payment Status Filter
  if (paymentFilter !== 'all') {
    filtered = filtered.filter((o) => o.paymentStatus === paymentFilter);
  }

  // Search Filter
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(term) ||
        o.customer.name.toLowerCase().includes(term) ||
        o.customer.phone.toLowerCase().includes(term) ||
        o.customer.address.toLowerCase().includes(term) ||
        o.items.some((item) => item.productName.toLowerCase().includes(term))
    );
  }


  // Totals for filtered list
  const filteredRevenue = filtered.reduce((sum, o) => sum + o.totalAmount, 0);
  const filteredWeightKg = filtered.reduce((sum, o) => sum + o.totalWeightKg, 0);

  // Export Excel/CSV Handler (Itemized with Price/Unit)
  const handleExportExcel = () => {
    if (filtered.length === 0) return;

    const headers = [
      'เลขที่ใบสั่งซื้อ',
      'วันที่สั่งซื้อ',
      'ชื่อลูกค้า',
      'เบอร์โทรศัพท์',
      'ที่อยู่จัดส่ง',
      'ลำดับสินค้า',
      'รายการสินค้า',
      'ขนาดบรรจุ',
      'ราคา/หน่วย (บาท)',
      'น้ำหนัก (กก.)',
      'ราคารวมรายการ (บาท)',
      'น้ำหนักรวมทั้งบิล (กก.)',
      'ยอดก่อน VAT (บาท)',
      'VAT 7% (บาท)',
      'ค่าจัดส่ง (บาท)',
      'ยอดรวมทั้งบิล (บาท)',
      'สถานะการชำระเงิน',
      'สถานะการจัดส่ง',
      'ขอใบกำกับภาษี',
      'หมายเหตุ',
    ];

    let csv = headers.join(',') + '\n';

    filtered.forEach((o) => {
      const paymentLabel =
        o.paymentStatus === 'paid'
          ? 'ชำระแล้ว'
          : o.paymentStatus === 'cod'
          ? 'เก็บเงินปลายทาง (COD)'
          : 'รอชำระ';

      const deliveryLabel =
        o.deliveryStatus === 'delivered'
          ? 'จัดส่งแล้ว'
          : o.deliveryStatus === 'shipped'
          ? 'กำลังจัดส่ง'
          : o.deliveryStatus === 'cancelled'
          ? 'ยกเลิก'
          : 'รอดำเนินการ';

      const taxInvoiceLabel = o.taxInvoice?.isRequested ? 'ขอใบกำกับภาษี' : 'ไม่ระบุ';
      const subtotal = o.subtotalAmount || (o.items ? o.items.reduce((s, it) => s + (it.totalPrice || 0), 0) : 0);
      const shippingVal = o.shippingFee || 0;
      const vatVal =
        o.hasVat || (o.vatAmount && o.vatAmount > 0)
          ? (o.vatAmount !== undefined ? o.vatAmount : Math.round((subtotal + shippingVal) * 0.07 * 100) / 100)
          : 0;

      if (o.items && o.items.length > 0) {
        o.items.forEach((item, index) => {
          const packLabel =
            item.packSize === '100g'
              ? '100 กรัม'
              : item.packSize === '500g'
              ? '500 กรัม'
              : item.packSize === '5kg'
              ? '5 กิโลกรัม'
              : '1 กิโลกรัม';

          const row = [
            `"${o.orderNumber}"`,
            `"${formatThaiDateTime(o.createdAt)}"`,
            `"${(o.customer?.name || '').replace(/"/g, '""')}"`,
            `"${(o.customer?.phone || '').replace(/"/g, '""')}"`,
            `"${(o.customer?.address || '').replace(/"/g, '""')}"`,
            index + 1,
            `"${(item.productName || '').replace(/"/g, '""')}"`,
            `"${packLabel}"`,
            item.pricePerKg,
            item.weightKg,
            item.totalPrice,
            o.totalWeightKg,
            subtotal,
            vatVal,
            shippingVal,
            o.totalAmount,
            `"${paymentLabel}"`,
            `"${deliveryLabel}"`,
            `"${taxInvoiceLabel}"`,
            `"${(o.note || '').replace(/"/g, '""')}"`,
          ].join(',');
          csv += row + '\n';
        });
      } else {
        // Fallback for order without items
        const row = [
          `"${o.orderNumber}"`,
          `"${formatThaiDateTime(o.createdAt)}"`,
          `"${(o.customer?.name || '').replace(/"/g, '""')}"`,
          `"${(o.customer?.phone || '').replace(/"/g, '""')}"`,
          `"${(o.customer?.address || '').replace(/"/g, '""')}"`,
          '-',
          '-',
          '-',
          0,
          0,
          0,
          o.totalWeightKg,
          subtotal,
          vatVal,
          shippingVal,
          o.totalAmount,
          `"${paymentLabel}"`,
          `"${deliveryLabel}"`,
          `"${taxInvoiceLabel}"`,
          `"${(o.note || '').replace(/"/g, '""')}"`,
        ].join(',');
        csv += row + '\n';
      }
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileNameDate = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Sumalee_Sales_Orders_${fileNameDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      
      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, ที่อยู่, เลข PO, หรือชื่อสินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 transition-all"
            />
          </div>

          {/* Export Excel & Add button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportExcel}
              disabled={filtered.length === 0}
              title="ส่งออกไฟล์ Excel (.csv) แยกรายการสินค้าพร้อมราคา/หน่วย"
              className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200 inline-flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>ส่งออก Excel</span>
            </button>
            <button
              onClick={onOpenNewOrder}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
            >
              <span>+ คีย์ออเดอร์ใหม่</span>
            </button>
          </div>

        </div>

        {/* Period Pills & Payment Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          
          {/* Period, Month Toggles & Specific Date Picker */}
          <div className="flex flex-wrap items-center gap-1.5 font-semibold">
            <span className="text-slate-400 text-[11px] mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>ช่วงเวลา/เดือน:</span>
            </span>
            <button
              onClick={() => {
                setSpecificDate('');
                setSelectedPeriod('all');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                !specificDate && selectedPeriod === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด ({orders.length})
            </button>
            <button
              onClick={() => {
                setSpecificDate('');
                setSelectedPeriod('today');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                !specificDate && selectedPeriod === 'today'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ประจำวันนี้
            </button>

            {availableMonths.map((m) => (
              <button
                key={m.yearMonthKey}
                onClick={() => {
                  setSpecificDate('');
                  setSelectedPeriod(m.yearMonthKey);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all border ${
                  !specificDate && selectedPeriod === m.yearMonthKey
                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                }`}
              >
                เดือน {m.label} ({m.orderCount})
              </button>
            ))}

            {/* Custom Specific Date Picker */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 ml-1">
              <span className="text-[11px] text-slate-500 font-normal pl-1">เลือกวันที่:</span>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="bg-white border border-slate-300 rounded text-xs font-semibold px-2 py-0.5 text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {specificDate && (
                <button
                  onClick={() => setSpecificDate('')}
                  title="ล้างการเลือกวันที่"
                  className="text-slate-400 hover:text-rose-600 text-xs px-1 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Payment filter select */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">ชำระเงิน:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="paid">ชำระแล้ว</option>
              <option value="cod">เก็บเงินปลายทาง</option>
              <option value="pending">รอชำระ</option>
            </select>
          </div>

        </div>

      </div>

      {/* FILTERED SUMMARY BANNER */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <FileText className="w-4 h-4" />
          </span>
          <div>
            <span className="text-slate-300">แสดงผล: </span>
            <span className="font-bold text-white">{filtered.length} รายการใบสั่งซื้อ</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <div>
            <span className="text-slate-400">น้ำหนักรวม: </span>
            <span className="text-emerald-400 font-bold text-sm">{formatWeight(filteredWeightKg)}</span>
          </div>
          <div>
            <span className="text-slate-400">ยอดรวมสุทธิ: </span>
            <span className="text-emerald-300 font-bold text-sm">{formatCurrency(filteredRevenue)}</span>
          </div>
        </div>
      </div>

      {/* ORDERS LIST CARDS / TABLE */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-sm">ไม่พบรายการใบสั่งซื้อ</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            ไม่พบข้อมูลตามเงื่อนไขการค้นหา คุณสามารถกดคีย์ข้อมูลใบสั่งซื้อใหม่ได้ทันที
          </p>
          <button
            onClick={onOpenNewOrder}
            className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition-colors inline-block"
          >
            + คีย์ใบสั่งซื้อใหม่
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4"
            >
              {/* Order Header line */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {order.orderNumber}
                  </span>
                  {order.taxInvoice?.isRequested && (
                    <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <FileText className="w-3 h-3 text-purple-600" />
                      <span>ใบกำกับภาษี</span>
                    </span>
                  )}
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatThaiDateTime(order.createdAt)}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Payment Status Pill */}
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    order.paymentStatus === 'paid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : order.paymentStatus === 'cod'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {order.paymentStatus === 'paid' ? 'ชำระแล้ว' : order.paymentStatus === 'cod' ? 'เก็บเงินปลายทาง' : 'รอชำระ'}
                  </span>

                  {/* Actions */}
                  <button
                    onClick={() => onViewShippingLabel(order)}
                    title="พิมพ์ใบจ่าหน้าซองพัสดุ"
                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200 flex items-center gap-1 text-[11px] font-bold px-2"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ใบจ่าหน้าซอง</span>
                  </button>
                  <button
                    onClick={() => onViewReceipt(order)}
                    title="พิมพ์ / ดูใบเสร็จ"
                    className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg transition-colors border border-slate-200"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditOrder(order)}
                    title="แก้ไขข้อมูล"
                    className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg transition-colors border border-slate-200"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setOrderToDelete(order)}
                    title="ลบออเดอร์"
                    className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-colors border border-slate-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Customer & Items Content */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Customer Details */}
                <div className="md:col-span-4 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <p className="font-bold text-slate-900 text-sm">{order.customer.name}</p>
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{order.customer.phone}</span>
                  </p>
                  <p className="text-slate-500 flex items-start gap-1.5 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{order.customer.address}</span>
                  </p>
                  {order.taxInvoice?.isRequested && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] bg-purple-50/70 p-2 rounded-lg border border-purple-100 space-y-0.5">
                      <p className="font-bold text-purple-950 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-purple-600 shrink-0" />
                        <span>ใบกำกับภาษี: {order.taxInvoice.companyName}</span>
                      </p>
                      <p className="text-purple-800 font-mono">
                        เลขภาษี: {order.taxInvoice.taxId} ({order.taxInvoice.branch || 'สำนักงานใหญ่'})
                      </p>
                    </div>
                  )}
                </div>

                {/* Items Breakdown */}
                <div className="md:col-span-8 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">รายการสินค้าในใบสั่งซื้อ</p>
                    <div className="divide-y divide-slate-100 text-xs">
                      {order.items.map((it) => (
                        <div key={it.id} className="py-1 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-800">{it.productName}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {it.packSize === '100g' ? 'แพ็ค 100g' : it.packSize === '500g' ? 'แพ็ค 500g' : it.packSize === '5kg' ? 'แพ็ค 5kg' : 'แพ็ค 1 กก.'}
                            </span>
                          </div>
                          <span className="text-slate-500 text-[11px] shrink-0">
                            {formatCurrency(it.pricePerKg)}/กก. × <strong className="text-emerald-700">{it.weightKg} กก.</strong> = <strong className="text-slate-900">{formatCurrency(it.totalPrice)}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Total Line */}
                  <div className="pt-2 mt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>น้ำหนักสินค้ารวม: <span className="text-emerald-700">{formatWeight(order.totalWeightKg)}</span></span>
                      {order.boxCount && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                          📦 {order.boxCount} กล่อง
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {order.shippingFee && order.shippingFee > 0 && (
                        <span className="text-[11px] font-normal text-slate-500 mr-2">
                          (รวมค่าส่ง {formatCurrency(order.shippingFee)})
                        </span>
                      )}
                      <span className="text-slate-900">
                        ราคารวมทั้งสิ้น: <span className="text-emerald-600 text-base font-black">{formatCurrency(order.totalAmount)}</span>
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {order.note && (
                <p className="text-[11px] text-amber-800 bg-amber-50/70 p-2 rounded-lg border border-amber-100">
                  <span className="font-bold">หมายเหตุ: </span>{order.note}
                </p>
              )}

            </div>
          ))}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmDeleteModal
        isOpen={!!orderToDelete}
        orderNumber={orderToDelete?.orderNumber || ''}
        customerName={orderToDelete?.customer.name || ''}
        onConfirm={() => {
          if (orderToDelete) {
            onDeleteOrder(orderToDelete.id);
            setOrderToDelete(null);
          }
        }}
        onCancel={() => setOrderToDelete(null)}
      />

    </div>
  );
};
