export type StockLocation = 'factory' | 'online';

export interface OrderItem {
  id: string;
  productName: string;
  pricePerKg: number; // ราคาต่อ กก. (บาท)
  weightKg: number;    // จำนวน (กก.)
  totalPrice: number;  // ราคารวม = pricePerKg * weightKg
  packSize?: string;   // e.g. '100g', '500g', '1kg', '5kg'
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'cod';
export type DeliveryStatus = 'pending' | 'shipped' | 'delivered' | 'cancelled';

export interface TaxInvoiceInfo {
  isRequested: boolean;
  companyName?: string;
  taxId?: string;
  branch?: string;
  address?: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string; // e.g. PO-20260731-001
  createdAt: string;   // ISO Date String e.g., 2026-07-31T14:30:00.000Z
  customer: CustomerInfo;
  items: OrderItem[];
  totalWeightKg: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  stockSource?: StockLocation; // 'factory' (โรงงาน) | 'online' (ออนไลน์) - default 'factory'
  shippingFee?: number; // ค่าจัดส่ง (บาท)
  boxCount?: number;    // จำนวนกล่อง (กล่อง)
  note?: string;
  taxInvoice?: TaxInvoiceInfo;
  hasVat?: boolean;      // คิด VAT 7%
  vatRate?: number;      // อัตรา VAT เช่น 7
  vatAmount?: number;    // จำนวนเงินภาษีมูลค่าเพิ่ม (บาท)
  subtotalAmount?: number; // ยอดรวมสินค้าก่อนภาษี (บาท)
}

export type SummaryPeriod = 'today' | '7days' | '30days' | 'all';

export type ProductionShift = 'day' | 'night'; // กะเช้า | กะดึก

export interface StockEntryItem {
  id: string;
  productName: string;
  weightKg: number;    // จำนวนน้ำหนักที่ผลิตได้ (กก.)
  note?: string;
}

export interface StockEntry {
  id: string;
  dateKey: string;        // YYYY-MM-DD e.g. "2026-08-03"
  shift: ProductionShift; // 'day' | 'night'
  shiftLabel?: string;    // e.g. "กะเช้า (08:00 - 20:00)"
  stockSource?: StockLocation; // 'factory' (โรงงาน) | 'online' (ออนไลน์) - default 'factory'
  items: StockEntryItem[];
  totalWeightKg: number;
  recordedBy?: string;    // ชื่อผู้บันทึก / หัวหน้ากะ
  note?: string;
  createdAt: string;      // ISO String
  updatedAt?: string;
}

export interface DailyStockSummary {
  dateKey: string;             // YYYY-MM-DD
  dateThaiFull: string;        // e.g. "3 สิงหาคม 2569"
  stockSource?: StockLocation | 'all'; // แหล่งสต็อคที่สรุป (โรงงาน / ออนไลน์ / ทั้งหมด)
  priorRemainingKg: number;    // ยอดคงเหลือยกมาจากเมื่อวาน (กก.)
  dayShiftWeightKg: number;    // ผลิตเพิ่มกะเช้าวันนี้ (กก.)
  nightShiftWeightKg: number;  // ผลิตเพิ่มกะดึกวันนี้ (กก.)
  totalProducedKg: number;     // ผลิตเพิ่มรวมทั้งวันวันนี้ (กก.)
  totalAvailableKg: number;    // ยอดรวมพร้อมขายทั้งหมด (กก.) = ยกมา + ผลิตเพิ่ม
  totalSoldKg: number;         // ตัดยอดขายออกวันนี้ (กก.)
  remainingStockKg: number;    // ยอดคงเหลือสุทธิยกไป (กก.) = พร้อมขายทั้งหมด - ตัดยอดขาย
  entriesCount: number;        // จำนวนครั้งบันทึกกะ
  productBreakdown: Array<{
    productName: string;
    priorRemainingKg: number;  // ยอดคงเหลือยกมาจากเมื่อวาน (กก.)
    dayShiftKg: number;
    nightShiftKg: number;
    producedKg: number;        // ผลิตเพิ่มวันนี้ (กก.)
    availableKg: number;       // ยอดรวมพร้อมขายทั้งหมด (กก.)
    soldKg: number;            // ตัดยอดขายออกวันนี้ (กก.)
    remainingKg: number;       // ยอดคงเหลือสุทธิยกไป (กก.)
  }>;
}

export interface SalesMetrics {
  totalRevenue: number;
  orderCount: number;
  totalWeightKg: number;
  averageOrderValue: number;
}

export interface CustomerProductSummary {
  productName: string;
  packSize?: string;
  totalWeightKg: number;
  totalAmount: number;
  ordersCount: number;
}

export interface CustomerStat {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalOrdersCount: number;
  totalRevenue: number;
  totalWeightKg: number;
  firstOrderDate: string;
  lastOrderDate: string;
  repeatTimes: number; // ซื้อซ้ำกี่ครั้งแล้ว (เช่น สั่ง 1 ครั้ง = 0 ครั้ง, สั่ง 3 ครั้ง = ซื้อซ้ำ 2 ครั้ง)
  isRepeatCustomer: boolean; // สั่งตั้งแต่ 2 ครั้งขึ้นไป
  tier: 'VIP (5+ ครั้ง)' | 'ประจำ (3-4 ครั้ง)' | 'ซื้อซ้ำ (2 ครั้ง)' | 'ใหม่ (1 ครั้ง)';
  orders: PurchaseOrder[];
  productsBought: CustomerProductSummary[];
  ordersInPeriodCount?: number;
  revenueInPeriod?: number;
  weightInPeriod?: number;
  isNewInPeriod?: boolean;
  isRepeatInPeriod?: boolean;
}

export interface CustomerPeriodSummary {
  periodKey: string;
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  repeatRate: number; // %
  totalOrders: number;
  totalRevenue: number;
  totalWeightKg: number;
  avgRevenuePerCustomer: number;
}

