import { PurchaseOrder } from '../types';

export const COURIER_OPTIONS = [
  { id: 'Flash Express', label: 'Flash Express (แฟลช เอ็กซ์เพรส)', shortLabel: 'Flash Express', color: 'bg-amber-50 text-amber-800 border-amber-300' },
  { id: 'Kerry Express', label: 'Kerry Express (เคอรี่ เอ็กซ์เพรส / KEX)', shortLabel: 'Kerry Express', color: 'bg-orange-50 text-orange-800 border-orange-300' },
  { id: 'J&T Express', label: 'J&T Express (เจแอนด์ที เอ็กซ์เพรส)', shortLabel: 'J&T Express', color: 'bg-red-50 text-red-800 border-red-300' },
  { id: 'ไปรษณีย์ไทย', label: 'ไปรษณีย์ไทย (EMS / ลงทะเบียน)', shortLabel: 'ไปรษณีย์ไทย', color: 'bg-rose-50 text-rose-800 border-rose-300' },
  { id: 'Nim Express', label: 'Nim Express (นิ่ม เอ็กซ์เพรส)', shortLabel: 'Nim Express', color: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
  { id: 'ขนส่งเอกชน/รถส่งของ', label: 'ขนส่งเอกชน / รถส่งของโรงงาน', shortLabel: 'ขนส่งเอกชน', color: 'bg-slate-50 text-slate-800 border-slate-300' },
  { id: 'อื่นๆ', label: 'อื่นๆ (ระบุเอง)', shortLabel: 'อื่นๆ', color: 'bg-slate-50 text-slate-800 border-slate-300' },
] as const;

/**
 * Extract all tracking numbers from order as a clean array
 */
export function getAllTrackingNumbers(order?: Partial<PurchaseOrder> | null): string[] {
  if (!order) return [];

  // Check explicit trackingNumbers array first
  if (Array.isArray(order.trackingNumbers) && order.trackingNumbers.length > 0) {
    const list = order.trackingNumbers
      .map((t) => (t || '').trim())
      .filter((t) => t.length > 0);
    if (list.length > 0) return list;
  }

  // Fallback to trackingNumber string (might contain multiple numbers separated by comma, slash or newline)
  if (order.trackingNumber && order.trackingNumber.trim()) {
    const raw = order.trackingNumber.trim();
    const split = raw
      .split(/[\n,;/]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (split.length > 0) return split;
    return [raw];
  }

  return [];
}

/**
 * Parses multi-line or comma-separated raw input from user/scanner
 */
export function parseMultiTrackingInput(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,;\t]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Generate tracking URL based on courier service and tracking number
 */
export function getTrackingUrl(courierName: string = 'Flash Express', trackingNumber?: string): string {
  if (!trackingNumber || !trackingNumber.trim()) return '';
  const cleanTrack = trackingNumber.trim();

  const lowerCourier = courierName.toLowerCase();

  if (lowerCourier.includes('flash') || courierName === 'Flash Express') {
    return `https://www.flashexpress.co.th/tracking/?se=${encodeURIComponent(cleanTrack)}`;
  }
  if (lowerCourier.includes('kerry') || lowerCourier.includes('kex')) {
    return `https://th.kerryexpress.com/th/track/?track=${encodeURIComponent(cleanTrack)}`;
  }
  if (lowerCourier.includes('j&t') || lowerCourier.includes('jt')) {
    return `https://www.jtexpress.co.th/index/query/gzquery.html?bills=${encodeURIComponent(cleanTrack)}`;
  }
  if (lowerCourier.includes('ไปรษณีย์') || lowerCourier.includes('ems') || lowerCourier.includes('thai post')) {
    return `https://track.thailandpost.co.th/?trackNumber=${encodeURIComponent(cleanTrack)}`;
  }
  if (lowerCourier.includes('nim')) {
    return `https://www.nimexpress.com/web/p/tracking?i=${encodeURIComponent(cleanTrack)}`;
  }

  // Default fallback to Flash Express since it's the primary courier
  return `https://www.flashexpress.co.th/tracking/?se=${encodeURIComponent(cleanTrack)}`;
}

/**
 * Format summary string of tracking numbers for display (e.g. "กล่อง 1: TH01..., กล่อง 2: TH02...")
 */
export function formatTrackingSummary(order?: Partial<PurchaseOrder> | null): string {
  const trackings = getAllTrackingNumbers(order);
  if (trackings.length === 0) return '-';
  if (trackings.length === 1) return trackings[0];
  return trackings.map((t, idx) => `กล่อง ${idx + 1}: ${t}`).join(', ');
}

/**
 * Generate formatted text message ready to send to customer via LINE, Messenger, or SMS
 * Supports both single box and multiple boxes!
 */
export function generateCustomerTrackingMessage(order: PurchaseOrder): string {
  const courier = order.courierName || 'Flash Express';
  const trackings = getAllTrackingNumbers(order);
  const totalBoxes = Math.max(order.boxCount || 0, trackings.length);

  const lines = [
    `📦 แจ้งจัดส่งสินค้า - บริษัท สุมาลี ฟู๊ด สระบุรี จำกัด`,
    `----------------------------------------`,
    `เรียนคุณ: ${order.customer.name}`,
    `เลขที่คำสั่งซื้อ (PO): ${order.orderNumber}`,
    `🚚 บริการขนส่ง: ${courier}`,
  ];

  if (totalBoxes > 1) {
    lines.push(`📦 จำนวนพัสดุ: ${totalBoxes} กล่อง`);
  }

  if (order.paymentStatus === 'cod') {
    lines.push(`💵 ยอดเก็บเงินปลายทาง (COD): ${order.totalAmount.toLocaleString()} บาท`);
  }

  lines.push(`----------------------------------------`);

  if (trackings.length > 1) {
    lines.push(`🔢 รายการเลขพัสดุแต่ละกล่อง:`);
    trackings.forEach((trk, idx) => {
      lines.push(`  • กล่องที่ ${idx + 1}/${trackings.length}: ${trk}`);
      const link = getTrackingUrl(courier, trk);
      if (link) {
        lines.push(`    เช็คพัสดุ: ${link}`);
      }
    });
  } else if (trackings.length === 1) {
    const trk = trackings[0];
    lines.push(`🔢 เลขพัสดุ (Tracking No.): ${trk}`);
    const link = getTrackingUrl(courier, trk);
    if (link) {
      lines.push(``);
      lines.push(`🔗 ตรวจสอบสถานะการจัดส่งได้ที่ลิงก์นี้:`);
      lines.push(link);
    }
  } else {
    lines.push(`🔢 เลขพัสดุ: อยู่ระหว่างเตรียมการจัดส่ง`);
  }

  lines.push(``);
  lines.push(`สุมาลี ฟู๊ด สระบุรี ขอบพระคุณที่ไว้วางใจอุดหนุนสินค้าค่ะ 🙏`);

  return lines.join('\n');
}

/**
 * Copy string to user clipboard with multi-environment fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}
