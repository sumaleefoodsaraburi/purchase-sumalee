import React, { useState, useEffect } from 'react';
import { PurchaseOrder, DocumentType } from '../types';
import { formatCurrency, formatWeight, formatThaiDateTime, generateReceiptNumber, thaiBahtText } from '../utils/formatters';
import { triggerPrintHtml, openPrintWindow, getReceiptHtml } from '../utils/printHelper';
import { X, Printer, ExternalLink, Phone, MapPin, Calendar, FileText, CheckCircle2, Receipt, FileSpreadsheet } from 'lucide-react';

interface ReceiptModalProps {
  order: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
  initialDocType?: DocumentType;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
  initialDocType = 'receipt',
}) => {
  const [docType, setDocType] = useState<DocumentType>(initialDocType);

  useEffect(() => {
    if (order?.taxInvoice?.isRequested && initialDocType === 'receipt') {
      setDocType('tax_invoice');
    } else {
      setDocType(initialDocType);
    }
  }, [order, initialDocType, isOpen]);

  if (!isOpen || !order) return null;

  const isReceipt = docType === 'receipt';
  const isTaxInvoice = docType === 'tax_invoice';
  const isPo = docType === 'po';

  const docNumber = isPo
    ? `#${order.orderNumber}`
    : (order.receiptNumber || generateReceiptNumber(order.orderNumber));

  const docTitleThai = isTaxInvoice
    ? 'ใบเสร็จรับเงิน / ใบกำกับภาษี'
    : isReceipt
    ? 'ใบเสร็จรับเงิน (RECEIPT)'
    : 'ใบสั่งซื้อ (PURCHASE ORDER)';

  const docBadgeTitle = isTaxInvoice
    ? 'ใบเสร็จรับเงิน / ใบกำกับภาษี'
    : isReceipt
    ? 'ใบเสร็จรับเงิน'
    : 'ใบสั่งซื้อ PO';

  const handlePrint = () => {
    triggerPrintHtml(getReceiptHtml(order, docType));
  };

  const handleOpenNewTab = () => {
    openPrintWindow(getReceiptHtml(order, docType));
  };

  const bahtText = thaiBahtText(order.totalAmount);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 print:shadow-none print:border-none print:w-full print:max-w-none print:m-0">
        
        {/* Modal Controls (Hidden during print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 no-print print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              {isPo ? <FileText className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">{docBadgeTitle}</h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                  {docNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isPo ? `อ้างอิง PO #${order.orderNumber}` : `ใบสั่งซื้ออ้างอิง #${order.orderNumber}`}
              </p>
            </div>
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
              <span>{isPo ? 'พิมพ์ใบสั่งซื้อ' : 'พิมพ์ใบเสร็จรับเงิน'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Type Switcher (Hidden during print) */}
        <div className="bg-slate-100/90 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 no-print print:hidden">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-bold text-slate-700">รูปแบบเอกสาร:</span>
          </div>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setDocType('receipt')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isReceipt
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>ใบเสร็จรับเงิน</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType('tax_invoice')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isTaxInvoice
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>ใบเสร็จ / ใบกำกับภาษี</span>
              {order.taxInvoice?.isRequested && (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDocType('po')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isPo
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ใบสั่งซื้อ PO</span>
            </button>
          </div>
        </div>

        {/* RECEIPT CONTENT FOR PRINTING / VIEWING */}
        <div className="printable-content p-6 sm:p-8 space-y-6 text-slate-800 bg-white" id="printable-receipt">
          
          {/* Company & Order Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b pb-6 border-slate-200">
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
                โทร. 0811238415 (081-123-8415)
              </p>
            </div>
            <div className={`p-3.5 rounded-xl border text-right sm:min-w-[220px] shrink-0 ${
              isReceipt || isTaxInvoice
                ? 'bg-emerald-50/60 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <p className={`text-[11px] font-extrabold uppercase tracking-wider ${
                isReceipt || isTaxInvoice ? 'text-emerald-800' : 'text-slate-400'
              }`}>
                {docBadgeTitle}
              </p>
              <p className={`text-base font-black font-mono mt-0.5 ${
                isReceipt || isTaxInvoice ? 'text-emerald-700' : 'text-blue-700'
              }`}>
                {docNumber}
              </p>
              {!isPo && (
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  อ้างอิง PO: #{order.orderNumber}
                </p>
              )}
              <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-end gap-1 font-mono">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>
                  {formatThaiDateTime(order.receiptDate || order.createdAt)}
                </span>
              </p>
            </div>
          </div>

          {/* Customer Info Box */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider mb-1">ข้อมูลลูกค้า / ผู้สั่งซื้อ</p>
              <p className="font-bold text-slate-900 text-sm">{order.customer.name}</p>
              <p className="text-slate-600 flex items-center gap-1.5 mt-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{order.customer.phone}</span>
              </p>
              <p className="text-slate-600 flex items-start gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{order.customer.address}</span>
              </p>

              {(isTaxInvoice || order.taxInvoice?.isRequested) && order.taxInvoice && (
                <div className="mt-3 pt-2 bg-purple-50 p-2.5 rounded-lg border border-purple-200 text-purple-950 space-y-1">
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
              <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider mb-1">
                {isPo ? 'สถานะการทำรายการ' : 'สถานะการชำระเงิน'}
              </p>
              <p className="text-xs">
                <span className="text-slate-500">การชำระเงิน: </span>
                <span className={`font-bold ${
                  order.paymentStatus === 'paid'
                    ? 'text-emerald-700'
                    : order.paymentStatus === 'cod'
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}>
                  {order.paymentStatus === 'paid' ? '✓ ชำระเงินเรียบร้อยแล้ว' : order.paymentStatus === 'cod' ? 'เก็บเงินปลายทาง (COD)' : 'รอชำระเงิน'}
                </span>
              </p>
              <p className="text-xs">
                <span className="text-slate-500">สถานะจัดส่ง: </span>
                <span className="font-bold text-blue-700">
                  {order.deliveryStatus === 'delivered' ? 'จัดส่งสำเร็จ' : order.deliveryStatus === 'shipped' ? 'กำลังจัดส่ง' : 'รอดำเนินการ'}
                </span>
              </p>
              {order.trackingNumber && (
                <p className="text-xs text-slate-600">
                  <span>ขนส่ง: {order.courierName || 'Flash Express'} | </span>
                  <span className="font-mono font-bold text-slate-800">{order.trackingNumber}</span>
                </p>
              )}
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
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                {isPo ? 'รายการสินค้าที่สั่งซื้อ' : 'รายการสินค้า / รายการชำระ'}
              </h4>
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
                  {order.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{item.productName}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {item.packSize === '100g' ? 'แพ็ค 100g' : item.packSize === '500g' ? 'แพ็ค 500g' : item.packSize === '5kg' ? 'แพ็ค 5kg' : 'แพ็ค 1 กก.'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(item.pricePerKg)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800">{formatWeight(item.weightKg)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Box */}
          <div className="flex flex-col sm:flex-row justify-between items-end gap-4 bg-slate-900 text-white p-4 rounded-xl">
            <div className="text-xs text-slate-300 space-y-0.5">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="font-semibold text-white">รวม {order.items.length} รายการสินค้า</span>
                {order.boxCount && (
                  <span className="bg-slate-800 text-emerald-300 font-bold px-2 py-0.5 rounded border border-slate-700">
                    📦 {order.boxCount} กล่อง
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              {order.hasVat || (order.vatAmount && order.vatAmount > 0) ? (
                <div className="text-[11px] text-slate-300 space-y-0.5 mb-1">
                  <div>มูลค่าสินค้าก่อนภาษี: {formatCurrency(order.subtotalAmount || order.items.reduce((sum, i) => sum + i.totalPrice, 0))}</div>
                  {order.shippingFee && order.shippingFee > 0 && (
                    <div>ค่าจัดส่ง: +{formatCurrency(order.shippingFee)}</div>
                  )}
                  <div>
                    ภาษีมูลค่าเพิ่ม VAT 7%: +
                    {formatCurrency(
                      order.vatAmount !== undefined
                        ? order.vatAmount
                        : Math.round(
                            ((order.subtotalAmount || order.items.reduce((sum, i) => sum + i.totalPrice, 0)) +
                              (order.shippingFee || 0)) *
                              0.07 *
                              100
                          ) / 100
                    )}
                  </div>
                </div>
              ) : (
                order.shippingFee && order.shippingFee > 0 && (
                  <div className="text-[11px] text-slate-300 space-y-0.5 mb-1">
                    <div>ราคาสินค้ารวม: {formatCurrency(order.items.reduce((sum, i) => sum + i.totalPrice, 0))}</div>
                    <div>ค่าจัดส่ง: +{formatCurrency(order.shippingFee)}</div>
                  </div>
                )
              )}
              <span className="text-xs text-emerald-400 font-medium">ยอดรวมสุทธิทั้งสิ้น</span>
              <p className="text-2xl font-black text-emerald-300">{formatCurrency(order.totalAmount)}</p>
            </div>
          </div>

          {/* Thai Baht Text Box */}
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-700">
            <div>
              <span className="font-bold text-slate-900">จำนวนเงินตัวอักษร: </span>
              <span className="font-bold text-emerald-800">({bahtText})</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {order.paymentStatus === 'paid' ? '✓ ชำระเงินครบถ้วน' : order.paymentStatus === 'cod' ? 'ชำระเมื่อรับสินค้า' : 'รอชำระ'}
            </div>
          </div>

          {/* Footer Signature line for printing */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
            <div>
              <div className="border-b border-dashed border-slate-300 h-10 mb-2"></div>
              <p className="font-bold text-slate-700">
                {isPo ? 'ผู้สั่งซื้อ / Customer Signature' : 'ผู้ชำระเงิน / Payer Signature'}
              </p>
              <p className="text-[10px] text-slate-400">วันที่ _____/_____/_________</p>
            </div>
            <div>
              <div className="border-b border-dashed border-slate-300 h-10 mb-2"></div>
              <p className="font-bold text-slate-700">
                {isPo ? 'ผู้รับคำสั่งซื้อ / Authorized Signature' : 'ผู้รับเงิน / Cashier (Collector)'}
              </p>
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
              <span>{isPo ? 'พิมพ์ใบสั่งซื้อ' : 'พิมพ์ใบเสร็จรับเงิน'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
