import React from 'react';
import { PurchaseOrder } from '../types';
import { formatCurrency, formatWeight, formatThaiDateTime } from '../utils/formatters';
import { triggerPrintHtml, openPrintWindow, getReceiptHtml } from '../utils/printHelper';
import { translateProductToBurmese } from '../utils/burmeseTranslator';
import { X, Printer, ExternalLink, Phone, MapPin, Calendar, FileText, Languages } from 'lucide-react';

interface ReceiptModalProps {
  order: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    triggerPrintHtml(getReceiptHtml(order));
  };

  const handleOpenNewTab = () => {
    openPrintWindow(getReceiptHtml(order));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 print:shadow-none print:border-none print:w-full print:max-w-none print:m-0">
        
        {/* Modal Controls (Hidden during print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 no-print print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">ใบสั่งซื้อ (Purchase Order) #{order.orderNumber}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewTab}
              title="เปิดหน้าพิมพ์ในแท็บใหม่"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors border border-slate-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">แท็บใหม่</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ใบสั่งซื้อ</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RECEIPT CONTENT FOR PRINTING / VIEWING */}
        <div className="printable-content p-6 sm:p-8 space-y-6 text-slate-800 bg-white" id="printable-receipt">
          
          {/* Company & Order Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 border-slate-200">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  บริษัท สุมาลี ฟู๊ด สระบุรี จำกัด
                </h2>
                <p className="text-xs font-bold text-slate-600 tracking-wider">
                  SUMALEE FOOD SARABURI CO., LTD.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  38/1 หมู่ที่ 6 ตำบลกุดนกเปล้า อำเภอเมืองสระบุรี จ.สระบุรี 18000
                </p>
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                  โทร 0811238415 (081-123-8415)
                </p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-right sm:min-w-[210px] shrink-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {order.taxInvoice?.isRequested ? 'ใบสั่งซื้อ / ใบกำกับภาษี' : 'ใบสั่งซื้อ / PURCHASE ORDER'}
              </p>
              <p className="text-base font-black text-blue-700 font-mono mt-0.5">#{order.orderNumber}</p>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-end gap-1 font-mono">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{formatThaiDateTime(order.createdAt)}</span>
              </p>
            </div>
          </div>

          {/* Customer Info Box */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider mb-1">ข้อมูลลูกค้า</p>
              <p className="font-bold text-slate-900 text-sm">{order.customer.name}</p>
              <p className="text-slate-600 flex items-center gap-1.5 mt-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{order.customer.phone}</span>
              </p>
              <p className="text-slate-600 flex items-start gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{order.customer.address}</span>
              </p>

              {order.taxInvoice?.isRequested && (
                <div className="mt-3 pt-2 border-t border-slate-200 bg-purple-50 p-2.5 rounded-lg border border-purple-200 text-purple-950 space-y-1">
                  <p className="font-bold text-xs text-purple-900 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>ข้อมูลออกใบกำกับภาษี</span>
                  </p>
                  <p className="font-bold">{order.taxInvoice.companyName}</p>
                  <p className="font-mono text-[11px]">เลขประจำตัวผู้เสียภาษี: {order.taxInvoice.taxId}</p>
                  <p className="text-[11px]">สาขา: {order.taxInvoice.branch || 'สำนักงานใหญ่'}</p>
                  {order.taxInvoice.address && order.taxInvoice.address !== order.customer.address && (
                    <p className="text-[11px] text-purple-900">ที่อยู่ใบกำกับภาษี: {order.taxInvoice.address}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
              <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider mb-1">สถานะการทำรายการ</p>
              <p className="text-xs">
                <span className="text-slate-500">สถานะชำระเงิน: </span>
                <span className="font-bold text-emerald-700">
                  {order.paymentStatus === 'paid' ? 'ชำระเงินเรียบร้อย' : order.paymentStatus === 'cod' ? 'เก็บเงินปลายทาง (COD)' : 'รอชำระเงิน'}
                </span>
              </p>
              <p className="text-xs">
                <span className="text-slate-500">สถานะจัดส่ง: </span>
                <span className="font-bold text-blue-700">
                  {order.deliveryStatus === 'delivered' ? 'จัดส่งสำเร็จ' : order.deliveryStatus === 'shipped' ? 'กำลังจัดส่ง' : 'รอดำเนินการ'}
                </span>
              </p>
              {order.note && (
                <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 text-left mt-2">
                  <span className="font-bold">หมายเหตุ: </span>{order.note}
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">รายการสินค้าที่สั่งซื้อ</h4>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Languages className="w-3.5 h-3.5 text-emerald-600" />
                <span>แปลภาษาพม่าอัตโนมัติ (မြန်မာဘာသာ)</span>
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">ลำดับ</th>
                    <th className="py-2.5 px-3">รายการสินค้า</th>
                    <th className="py-2.5 px-3 text-right">ราคา/กก. (บาท)</th>
                    <th className="py-2.5 px-3 text-right">จำนวน (กก.)</th>
                    <th className="py-2.5 px-3 text-right">ราคารวม (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => {
                    const burmeseName = translateProductToBurmese(item.productName);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{item.productName}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {item.packSize === '500g' ? 'แพ็ค 500g' : item.packSize === '5kg' ? 'แพ็ค 5kg' : 'แพ็ค 1 กก.'}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                            <span className="text-[10px]">🇲🇲</span>
                            <span>{burmeseName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(item.pricePerKg)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-800">{formatWeight(item.weightKg)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Box */}
          <div className="flex flex-col sm:flex-row justify-between items-end gap-4 bg-slate-900 text-white p-4 rounded-xl">
            <div className="text-xs text-slate-300 space-y-0.5">
              <p>รวมน้ำหนักสินค้าทั้งหมด: <span className="font-bold text-white text-sm">{formatWeight(order.totalWeightKg)}</span></p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>รวม {order.items.length} รายการสินค้า</span>
                {order.boxCount && (
                  <span className="bg-slate-800 text-emerald-300 font-bold px-2 py-0.5 rounded border border-slate-700">
                    📦 {order.boxCount} กล่อง
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              {order.shippingFee && order.shippingFee > 0 && (
                <div className="text-[11px] text-slate-300 space-y-0.5 mb-1">
                  <div>ราคาสินค้ารวม: {formatCurrency(order.items.reduce((sum, i) => sum + i.totalPrice, 0))}</div>
                  <div>ค่าจัดส่ง: +{formatCurrency(order.shippingFee)}</div>
                </div>
              )}
              <span className="text-xs text-emerald-400 font-medium">ยอดรวมสุทธิทั้งสิ้น</span>
              <p className="text-2xl font-black text-emerald-300">{formatCurrency(order.totalAmount)}</p>
            </div>
          </div>

          {/* Footer Signature line for printing */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
            <div>
              <div className="border-b border-dashed border-slate-300 h-10 mb-2"></div>
              <p>ผู้สั่งซื้อ / Customer Signature</p>
              <p className="text-[10px] text-slate-400">วันที่ _____/_____/_________</p>
            </div>
            <div>
              <div className="border-b border-dashed border-slate-300 h-10 mb-2"></div>
              <p>ผู้รับเงิน / Authorized Signature</p>
              <p className="text-[10px] text-slate-400">วันที่ _____/_____/_________</p>
            </div>
          </div>

        </div>

        {/* Modal Footer Controls (Hidden during print) */}
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
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบสั่งซื้อ</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
