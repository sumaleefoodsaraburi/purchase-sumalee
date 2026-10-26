import { PurchaseOrder, DocumentType } from '../types';
import { formatCurrency, formatWeight, formatThaiDateTime, generateReceiptNumber, thaiBahtText } from './formatters';
import { getAllTrackingNumbers } from './trackingUtils';

/**
 * Generate full HTML document string for Receipt / Purchase Order / Tax Invoice
 */
export function getReceiptHtml(order: PurchaseOrder, docType: DocumentType = 'receipt'): string {
  const isReceipt = docType === 'receipt';
  const isTaxInvoice = docType === 'tax_invoice' || (docType === 'receipt' && order.taxInvoice?.isRequested);

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

  const docNumber = isReceipt || isTaxInvoice
    ? (order.receiptNumber || generateReceiptNumber(order.orderNumber))
    : `#${order.orderNumber}`;

  const docDate = isReceipt || isTaxInvoice
    ? (order.receiptDate ? formatThaiDateTime(order.receiptDate) : formatThaiDateTime(order.createdAt))
    : formatThaiDateTime(order.createdAt);

  const itemsRows = order.items
    .map(
      (item, idx) => {
        const packLabel =
          item.packSize === '28g'
            ? ' <span style="font-size:10px; background:#fef3c7; padding:2px 6px; border-radius:4px; color:#92400e; border:1px solid #fde68a;">แพ็ค 28g</span>'
            : item.packSize === '100g'
            ? ' <span style="font-size:10px; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#475569; border:1px solid #cbd5e1;">แพ็ค 100g</span>'
            : item.packSize === '500g'
            ? ' <span style="font-size:10px; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#475569; border:1px solid #cbd5e1;">แพ็ค 500g</span>'
            : item.packSize === '5kg'
            ? ' <span style="font-size:10px; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#475569; border:1px solid #cbd5e1;">แพ็ค 5kg</span>'
            : item.packSize === '10kg'
            ? ' <span style="font-size:10px; background:#f3e8ff; padding:2px 6px; border-radius:4px; color:#6b21a8; border:1px solid #e9d5ff;">แพ็ค 10kg</span>'
            : ' <span style="font-size:10px; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#475569; border:1px solid #cbd5e1;">แพ็ค 1 กก.</span>';

        const unitPriceStr = item.packSize === '28g'
          ? `${formatCurrency(item.pricePerKg)}/ซอง`
          : `${formatCurrency(item.pricePerKg)}/กก.`;

        const qtyStr = item.packSize === '28g'
          ? `${item.quantityPieces || Math.round(item.weightKg / 0.028)} ซอง <span style="font-size:11px; color:#64748b; font-weight:normal;">(${formatWeight(item.weightKg)})</span>`
          : formatWeight(item.weightKg);

        return `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${item.productName}${packLabel}</div>
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">${unitPriceStr}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #065f46;">${qtyStr}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(item.totalPrice)}</td>
        </tr>
      `;
      }
    )
    .join('');

  const paymentStatusThai =
    order.paymentStatus === 'paid'
      ? 'ชำระเงินเรียบร้อยแล้ว'
      : order.paymentStatus === 'cod'
      ? 'เก็บเงินปลายทาง (COD)'
      : 'รอชำระเงิน';

  const deliveryStatusThai =
    order.deliveryStatus === 'delivered'
      ? 'จัดส่งสำเร็จ'
      : order.deliveryStatus === 'shipped'
      ? 'กำลังจัดส่ง'
      : 'รอดำเนินการ';

  const bahtText = thaiBahtText(order.totalAmount);

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>${docTitleThai} ${docNumber} - บริษัท สุมาลี ฟู๊ด สระบุรี จำกัด</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #ffffff;
          color: #1e293b;
          font-size: 13px;
          line-height: 1.5;
          padding: 25px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 30px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .company-name {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
        }
        .company-sub {
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0.5px;
        }
        .company-address {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }
        .company-phone {
          font-size: 12px;
          font-weight: 700;
          color: #047857;
          margin-top: 2px;
        }
        .po-badge-box {
          background-color: ${isReceipt || isTaxInvoice ? '#f0fdf4' : '#f8fafc'};
          border: 1.5px solid ${isReceipt || isTaxInvoice ? '#86efac' : '#cbd5e1'};
          border-radius: 8px;
          padding: 10px 16px;
          text-align: right;
          min-width: 220px;
        }
        .po-title {
          font-size: 11px;
          font-weight: 800;
          color: ${isReceipt || isTaxInvoice ? '#166534' : '#64748b'};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .po-number {
          font-size: 18px;
          font-weight: 900;
          color: ${isReceipt || isTaxInvoice ? '#047857' : '#1d4ed8'};
          font-family: monospace;
          margin-top: 2px;
        }
        .po-ref {
          font-size: 10px;
          color: #64748b;
          font-family: monospace;
          margin-top: 2px;
        }
        .po-date {
          font-size: 11px;
          color: #475569;
          margin-top: 4px;
        }
        .customer-grid {
          display: flex;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 20px;
          gap: 15px;
        }
        .cust-section {
          flex: 1;
        }
        .cust-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .cust-name {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }
        .cust-detail {
          font-size: 12px;
          color: #475569;
          margin-top: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background-color: #f1f5f9;
          color: #334155;
          font-weight: 700;
          font-size: 12px;
          padding: 10px;
          border-top: 1px solid #cbd5e1;
          border-bottom: 2px solid #cbd5e1;
        }
        .summary-box {
          background-color: #0f172a;
          color: #ffffff;
          border-radius: 8px;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .summary-left {
          font-size: 12px;
          color: #cbd5e1;
        }
        .summary-total {
          text-align: right;
        }
        .summary-total-label {
          font-size: 11px;
          color: #34d399;
          font-weight: 600;
        }
        .summary-total-amount {
          font-size: 24px;
          font-weight: 800;
          color: #6ee7b7;
        }
        .baht-text-box {
          background-color: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
          padding: 8px 14px;
          margin-bottom: 24px;
          font-size: 12px;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        .sig-block {
          width: 45%;
          text-align: center;
          font-size: 11px;
          color: #64748b;
        }
        .sig-line {
          border-bottom: 1px dashed #cbd5e1;
          height: 45px;
          margin-bottom: 8px;
        }
        @media print {
          body {
            padding: 0;
          }
          .container {
            border: none;
            padding: 0;
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- HEADER -->
        <div class="header">
          <div>
            <div class="company-name">บริษัท สุมาลี ฟู๊ด สระบุรี จำกัด</div>
            <div class="company-sub">SUMALEE FOOD SARABURI CO., LTD.</div>
            <div class="company-address">38/1 หมู่ที่ 6 ตำบลกุดนกเปล้า อำเภอเมืองสระบุรี จ.สระบุรี 18000</div>
            <div class="company-phone">โทร. 0811238415 (081-123-8415)</div>
          </div>
          <div class="po-badge-box">
            <div class="po-title">${docBadgeTitle}</div>
            <div class="po-number">${docNumber}</div>
            ${isReceipt || isTaxInvoice ? `<div class="po-ref">อ้างอิง PO #${order.orderNumber}</div>` : ''}
            <div class="po-date">วันที่: ${docDate}</div>
          </div>
        </div>

        <!-- CUSTOMER & ORDER INFO -->
        <div class="customer-grid">
          <div class="cust-section">
            <div class="cust-label">ข้อมูลลูกค้า (CUSTOMER)</div>
            <div class="cust-name">${order.customer.name}</div>
            <div class="cust-detail">📞 โทร: ${order.customer.phone}</div>
            <div class="cust-detail">📍 ที่อยู่: ${order.customer.address}</div>
            ${
              order.taxInvoice?.isRequested
                ? `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 11px;">
                  <strong style="color: #4c1d95;">📄 ข้อมูลใบกำกับภาษี:</strong>
                  <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">${order.taxInvoice.companyName}</div>
                  <div>เลขประจำตัวผู้เสียภาษี: <strong>${order.taxInvoice.taxId}</strong> (${order.taxInvoice.branch || 'สำนักงานใหญ่'})</div>
                  ${order.taxInvoice.address && order.taxInvoice.address !== order.customer.address ? `<div>ที่อยู่ภาษี: ${order.taxInvoice.address}</div>` : ''}
                </div>
              `
                : ''
            }
          </div>
          <div class="cust-section" style="text-align: right;">
            <div class="cust-label">สถานะการสั่งซื้อ</div>
            <div class="cust-detail">สถานะการชำระเงิน: <strong>${paymentStatusThai}</strong></div>
            <div class="cust-detail">สถานะการจัดส่ง: <strong>${deliveryStatusThai}</strong></div>
            ${
              order.trackingNumber
                ? `<div class="cust-detail" style="margin-top: 4px; color: #b45309; font-weight: 700;">🚚 ขนส่ง: ${order.courierName || 'Flash Express'} | เลขพัสดุ: <span style="font-family: monospace; font-size: 13px; color: #0f172a;">${order.trackingNumber}</span></div>`
                : ''
            }
            ${
              order.note
                ? `<div class="cust-detail" style="margin-top: 6px; background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 11px;"><strong>หมายเหตุ:</strong> ${order.note}</div>`
                : ''
            }
          </div>
        </div>

        <!-- TABLE -->
        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">ลำดับ</th>
              <th style="text-align: left;">รายการสินค้า</th>
              <th style="width: 120px; text-align: right;">ราคา/หน่วย</th>
              <th style="width: 130px; text-align: right;">จำนวน</th>
              <th style="width: 140px; text-align: right;">ราคารวม (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- TOTALS -->
        <div class="summary-box">
          <div class="summary-left">
            <div style="font-size: 13px; font-weight: 700; color: #ffffff;">จำนวนทั้งหมด ${order.items.length} รายการ</div>
            ${order.boxCount ? `<div style="font-size: 11px; margin-top: 4px;"><span style="background:#334155; padding:2px 8px; border-radius:4px; color:#6ee7b7; font-weight:bold;">📦 ${order.boxCount} กล่อง</span></div>` : ''}
          </div>
          <div class="summary-total">
            ${
              order.hasVat || (order.vatAmount && order.vatAmount > 0)
                ? (() => {
                    const subtotal = order.subtotalAmount || order.items.reduce((sum, i) => sum + i.totalPrice, 0);
                    const shipping = order.shippingFee || 0;
                    const calculatedVat = order.vatAmount !== undefined ? order.vatAmount : Math.round((subtotal + shipping) * 0.07 * 100) / 100;
                    return `
                      <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 2px;">
                        มูลค่าสินค้าก่อนภาษี: ${formatCurrency(subtotal)}
                      </div>
                      ${
                        shipping > 0
                          ? `<div style="font-size: 11px; color: #cbd5e1; margin-bottom: 2px;">
                              ค่าจัดส่ง: +${formatCurrency(shipping)}
                            </div>`
                          : ''
                      }
                      <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 2px;">
                        ภาษีมูลค่าเพิ่ม VAT 7%: +${formatCurrency(calculatedVat)}
                      </div>
                    `;
                  })()
                : (order.shippingFee && order.shippingFee > 0
                    ? `<div style="font-size: 11px; color: #cbd5e1; margin-bottom: 2px;">
                        ราคาสินค้า: ${formatCurrency(order.items.reduce((sum, i) => sum + i.totalPrice, 0))}
                       </div>
                       <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 2px;">
                        ค่าจัดส่ง: +${formatCurrency(order.shippingFee)}
                       </div>`
                    : '')
            }
            <div class="summary-total-label">ยอดรวมสุทธิทั้งสิ้น</div>
            <div class="summary-total-amount">${formatCurrency(order.totalAmount)}</div>
          </div>
        </div>

        <!-- BAHT TEXT -->
        <div class="baht-text-box">
          <div><strong style="color: #0f172a;">จำนวนเงินตัวอักษร:</strong> <span style="font-weight: 700; color: #047857;">(${bahtText})</span></div>
          <div style="font-size: 11px; color: #64748b;">สถานะ: <strong style="color: #047857;">${paymentStatusThai}</strong></div>
        </div>

        <!-- SIGNATURES -->
        <div class="signatures">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div>${isReceipt || isTaxInvoice ? 'ผู้ชำระเงิน / Customer (Payer)' : 'ผู้สั่งซื้อ / Customer Signature'}</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">วันที่ _____/_____/_________</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div>${isReceipt || isTaxInvoice ? 'ผู้รับเงิน / Cashier (Authorized Collector)' : 'ผู้รับคำสั่งซื้อ / Authorized Signature'}</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">วันที่ _____/_____/_________</div>
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.focus();
          window.print();
        };
      </script>
    </body>
    </html>
  `;
}

/**
 * Generate full HTML document string for Shipping Label (ใบจ่าหน้าซอง)
 * Large high-contrast typography optimized for A4 printing without item list
 */
export function getShippingLabelHtml(order: PurchaseOrder): string {
  const isCod = order.paymentStatus === 'cod';

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>ใบจ่าหน้าซอง ${order.orderNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Sarabun', -apple-system, sans-serif;
          background: #ffffff;
          padding: 15px;
          color: #0f172a;
        }
        .label-card {
          max-width: 720px;
          margin: 0 auto;
          border: 4px solid #0f172a;
          border-radius: 16px;
          padding: 24px;
          background: #ffffff;
        }
        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #0f172a;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .badge {
          background: #0f172a;
          color: white;
          font-size: 14px;
          font-weight: 800;
          padding: 6px 14px;
          border-radius: 6px;
          letter-spacing: 0.5px;
          display: inline-block;
        }
        .po-no {
          font-size: 18px;
          font-weight: 800;
          margin-top: 6px;
          font-family: monospace;
          color: #0f172a;
        }
        .cod-box {
          border: 3px solid ${isCod ? '#dc2626' : '#059669'};
          background: ${isCod ? '#fef2f2' : '#ecfdf5'};
          padding: 10px 20px;
          border-radius: 12px;
          text-align: center;
          min-width: 220px;
        }
        .sender-box {
          border: 2px solid #94a3b8;
          border-radius: 12px;
          padding: 16px 20px;
          font-size: 14px;
          background: #f8fafc;
          margin-bottom: 20px;
          line-height: 1.6;
        }
        .recipient-box {
          border: 4px solid #0f172a;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          background: #ffffff;
        }
        .recipient-title {
          font-size: 16px;
          font-weight: 800;
          color: #dc2626;
          border-bottom: 3px solid #0f172a;
          padding-bottom: 10px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .recipient-name {
          font-size: 26px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 8px;
          line-height: 1.3;
        }
        .recipient-phone {
          display: inline-block;
          font-size: 22px;
          font-weight: 900;
          color: #1d4ed8;
          background: #eff6ff;
          border: 2px solid #3b82f6;
          padding: 6px 18px;
          border-radius: 10px;
          margin: 8px 0 14px 0;
          font-family: monospace;
        }
        .recipient-addr {
          font-size: 20px;
          font-weight: 700;
          line-height: 1.65;
          color: #0f172a;
          white-space: pre-line;
        }
        .note-box {
          border: 2px dashed #d97706;
          border-radius: 12px;
          padding: 14px 18px;
          background: #fffbeb;
          color: #92400e;
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        .footer-stub {
          padding-top: 14px;
          text-align: center;
          color: #64748b;
          font-family: monospace;
          font-size: 12px;
          border-top: 2px dashed #cbd5e1;
        }
        @media print {
          body { padding: 0; margin: 0; }
          .label-card { max-width: 100%; border-width: 4px; padding: 24px; }
          @page { margin: 1cm; size: auto; }
        }
      </style>
    </head>
    <body>
      <div class="label-card">
        <div class="top-bar">
          <div>
            <span class="badge">PARCEL LABEL / ใบจ่าหน้าซอง</span>
            <div class="po-no">PO NO: ${order.orderNumber}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">วันที่: ${formatThaiDateTime(order.createdAt)}</div>
          </div>
          <div>
            ${
              isCod
                ? `
                <div class="cod-box">
                  <div style="font-size: 12px; font-weight: 900; color: #b91c1c; text-transform: uppercase;">⚠️ เก็บเงินปลายทาง (COD)</div>
                  <div style="font-size: 28px; font-weight: 900; color: #991b1b; font-family: monospace;">${formatCurrency(
                    order.totalAmount
                  )}</div>
                </div>
              `
                : `
                <div class="cod-box">
                  <div style="font-size: 14px; font-weight: 900; color: #065f46;">✓ ชำระเงินเรียบร้อยแล้ว</div>
                  <div style="font-size: 12px; color: #047857; font-weight: 700;">ไม่ต้องเรียกเก็บเงิน</div>
                </div>
              `
            }
          </div>
        </div>

        <div class="sender-box">
          <strong style="color: #1d4ed8; font-size: 14px;">ผู้ส่ง (SENDER):</strong>
          <div style="font-weight: 800; font-size: 16px; color: #0f172a; margin-top: 2px;">บริษัท สุมาลี ฟู๊ด สระบุรี จำกัด (SUMALEE FOOD SARABURI CO., LTD.)</div>
          <div style="font-size: 14px; color: #334155;">38/1 หมู่ที่ 6 ตำบลกุดนกเปล้า อำเภอเมืองสระบุรี จ.สระบุรี 18000</div>
          <div style="font-weight: 800; font-size: 15px; color: #0f172a; margin-top: 4px;">โทร. 081-123-8415</div>
        </div>

        <div class="recipient-box">
          <div class="recipient-title">
            <span>📍 ผู้รับ (RECIPIENT / SHIP TO)</span>
            ${order.boxCount ? `<span style="font-size: 14px; background: #f1f5f9; color: #0f172a; padding: 2px 8px; border-radius: 6px; font-weight: 800; border: 1px solid #cbd5e1;">📦 ${order.boxCount} กล่อง</span>` : ''}
          </div>
          <div class="recipient-name">${order.customer.name}</div>
          <div class="recipient-phone">📞 โทร: ${order.customer.phone}</div>
          <div class="recipient-addr">${order.customer.address}</div>
        </div>

        ${(() => {
          const trackings = getAllTrackingNumbers(order);
          if (trackings.length === 0) return '';
          if (trackings.length === 1) {
            return `<div style="margin-top: 12px; background: #fffbeb; border: 2px solid #f59e0b; border-radius: 10px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; color: #92400e; font-size: 14px;">🚚 ขนส่ง: ${order.courierName || 'Flash Express'}</span>
                <span style="font-weight: 900; font-family: monospace; font-size: 16px; color: #0f172a; letter-spacing: 1px;">เลขพัสดุ: ${trackings[0]}</span>
              </div>`;
          }
          return `<div style="margin-top: 12px; background: #fffbeb; border: 2px solid #f59e0b; border-radius: 10px; padding: 10px 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #fcd34d; padding-bottom: 6px; margin-bottom: 8px;">
                <span style="font-weight: 800; color: #92400e; font-size: 14px;">🚚 ขนส่ง: ${order.courierName || 'Flash Express'}</span>
                <span style="font-weight: 800; font-size: 13px; color: #78350f; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 8px; border-radius: 6px;">จัดส่งแยก ${trackings.length} กล่อง</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${trackings
                  .map(
                    (t, i) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 6px 10px; border-radius: 6px; border: 1px solid #fed7aa;">
                    <span style="font-weight: 800; color: #7c2d12; font-size: 13px;">📦 กล่องที่ ${i + 1}:</span>
                    <span style="font-weight: 900; font-family: monospace; font-size: 15px; color: #0f172a; letter-spacing: 1px;">${t}</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>`;
        })()}

        ${
          order.note
            ? `<div class="note-box"><strong>📝 หมายเหตุจัดส่ง:</strong> ${order.note}</div>`
            : ''
        }

        <div class="footer-stub">
          <div style="letter-spacing: 4px; font-weight: 900; font-size: 16px; color: #0f172a; margin-bottom: 4px;">||| | ||||| |||| || ||||||| ||| ||||</div>
          <div>SUMALEE FOOD SARABURI • PARCEL EXPRESS DELIVERY</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.focus();
          window.print();
        };
      </script>
    </body>
    </html>
  `;
}

/**
 * Opens document in a new browser tab/window for full printing & preview
 */
export function openPrintWindow(htmlContent: string) {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
    } else {
      triggerPrintHtml(htmlContent);
    }
  } catch (err) {
    console.error('Failed to open print window:', err);
    triggerPrintHtml(htmlContent);
  }
}

/**
 * Direct print by injecting clean printable HTML element into body
 * and triggering native window.print()
 */
export function triggerPrintHtml(htmlContent: string) {
  try {
    // Remove existing print containers if present
    const existing = document.getElementById('direct-print-root');
    if (existing) {
      existing.remove();
    }
    document.querySelectorAll('.direct-print-style-node').forEach((el) => el.remove());

    // Parse html content to extract body and styles
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Extract styles from generated HTML
    const styles = doc.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach((styleNode) => {
      const cloned = styleNode.cloneNode(true);
      if (cloned instanceof HTMLElement) {
        cloned.classList.add('direct-print-style-node');
      }
      document.head.appendChild(cloned);
    });

    // Create printable container
    const printRoot = document.createElement('div');
    printRoot.id = 'direct-print-root';
    printRoot.innerHTML = doc.body.innerHTML;
    document.body.appendChild(printRoot);

    // Call native window.print()
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.warn('Native window.print error:', e);
      } finally {
        setTimeout(() => {
          if (printRoot && printRoot.parentNode) {
            printRoot.parentNode.removeChild(printRoot);
          }
          document.querySelectorAll('.direct-print-style-node').forEach((el) => el.remove());
        }, 1200);
      }
    }, 200);

  } catch (err) {
    console.error('Print initialization error:', err);
    openPrintWindow(htmlContent);
  }
}
