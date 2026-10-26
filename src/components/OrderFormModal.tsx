import React, { useState, useEffect, useMemo } from 'react';
import { PurchaseOrder, OrderItem, PaymentStatus, DeliveryStatus, TaxInvoiceInfo, StockLocation, StockEntry, DocumentType } from '../types';
import { POPULAR_PRODUCTS_PRESETS } from '../data/sampleOrders';
import { formatCurrency, formatWeight, generatePoNumber, generateReceiptNumber } from '../utils/formatters';
import { normalizeProductName, getRealtimeAvailableStock, isStockTrackedProduct } from '../utils/stockUtils';
import { ReceiptModal } from './ReceiptModal';
import {
  COURIER_OPTIONS,
  getTrackingUrl,
  getAllTrackingNumbers,
  generateCustomerTrackingMessage,
  copyToClipboard,
  parseMultiTrackingInput,
} from '../utils/trackingUtils';
import {
  X,
  Plus,
  Trash2,
  Package,
  User,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Hash,
  Receipt,
  Building2,
  FileText,
  Truck,
  Box,
  DollarSign,
  Percent,
  Factory,
  Globe,
  Scale,
  PackageCheck,
  AlertTriangle,
  Layers,
  ExternalLink,
  Copy,
  Check,
  ClipboardList,
  Printer,
} from 'lucide-react';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveOrder: (order: PurchaseOrder) => void;
  onViewReceipt?: (order: PurchaseOrder, docType?: DocumentType) => void;
  editingOrder?: PurchaseOrder | null;
  existingOrders?: PurchaseOrder[];
  stockEntries?: StockEntry[];
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  onSaveOrder,
  onViewReceipt,
  editingOrder,
  existingOrders = [],
  stockEntries = [],
}) => {
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [orderDate, setOrderDate] = useState(() => {
    const d = new Date();
    const tzoffset = d.getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().slice(0, 16);
  });

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('pending');
  const [stockSource, setStockSource] = useState<StockLocation>('factory');
  const [note, setNote] = useState('');

  // Shipping & Tracking State (Flash Express is primary)
  const [courierName, setCourierName] = useState<string>('Flash Express');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [trackingList, setTrackingList] = useState<string[]>(['']);
  const [showBatchPaste, setShowBatchPaste] = useState(false);
  const [batchPasteText, setBatchPasteText] = useState('');
  const [copiedTrackingIndex, setCopiedTrackingIndex] = useState<number | null>(null);
  const [copiedTrackingLink, setCopiedTrackingLink] = useState(false);
  const [copiedTrackingMsg, setCopiedTrackingMsg] = useState(false);

  // Shipping Fee & Box Count State
  const [shippingFee, setShippingFee] = useState<number | ''>('');
  const [boxCount, setBoxCount] = useState<number | ''>(1);
  const [hasVat, setHasVat] = useState(false);

  // Tax Invoice State
  const [requestTaxInvoice, setRequestTaxInvoice] = useState(false);
  const [taxCompanyName, setTaxCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [taxBranch, setTaxBranch] = useState('สำนักงานใหญ่');
  const [taxAddress, setTaxAddress] = useState('');
  const [useCustomerAddressForTax, setUseCustomerAddressForTax] = useState(true);

  // Receipt State (การออกใบเสร็จรับเงิน)
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>('');
  const [isDraftReceiptOpen, setIsDraftReceiptOpen] = useState(false);
  const [draftReceiptOrder, setDraftReceiptOrder] = useState<PurchaseOrder | null>(null);

  // Computed PO Number for the selected date
  const calculatedPoNumber = editingOrder
    ? editingOrder.orderNumber
    : generatePoNumber(orderDate, existingOrders, editingOrder?.id);

  // Items State (At least 1 item)
  const [items, setItems] = useState<OrderItem[]>([
    {
      id: 'item-1',
      productName: '',
      pricePerKg: 0,
      weightKg: 0,
      totalPrice: 0,
    },
  ]);

  const [formError, setFormError] = useState('');

  // Pre-fill if editing
  useEffect(() => {
    if (editingOrder) {
      setCustomerName(editingOrder.customer.name || '');
      setCustomerPhone(editingOrder.customer.phone || '');
      setCustomerAddress(editingOrder.customer.address || '');

      const d = new Date(editingOrder.createdAt);
      if (!isNaN(d.getTime())) {
        const tzoffset = d.getTimezoneOffset() * 60000;
        setOrderDate(new Date(d.getTime() - tzoffset).toISOString().slice(0, 16));
      } else {
        const now = new Date();
        const tzoffset = now.getTimezoneOffset() * 60000;
        setOrderDate(new Date(now.getTime() - tzoffset).toISOString().slice(0, 16));
      }

      setPaymentStatus(editingOrder.paymentStatus);
      setDeliveryStatus(editingOrder.deliveryStatus);
      setStockSource(editingOrder.stockSource || 'factory');
      setNote(editingOrder.note || '');

      setCourierName(editingOrder.courierName || 'Flash Express');
      setTrackingNumber(editingOrder.trackingNumber || '');
      setCopiedTrackingLink(false);
      setCopiedTrackingMsg(false);
      setCopiedTrackingIndex(null);
      setShowBatchPaste(false);
      setBatchPasteText('');

      const existingTrackings = getAllTrackingNumbers(editingOrder);
      const boxes = editingOrder.boxCount || (existingTrackings.length > 0 ? existingTrackings.length : 1);
      setBoxCount(boxes);
      if (existingTrackings.length > 0) {
        const initial = [...existingTrackings];
        while (initial.length < boxes) {
          initial.push('');
        }
        setTrackingList(initial);
      } else {
        setTrackingList(Array(Math.max(1, typeof boxes === 'number' ? boxes : 1)).fill(''));
      }

      setShippingFee(editingOrder.shippingFee !== undefined ? editingOrder.shippingFee : '');
      setHasVat(
        editingOrder.hasVat !== undefined
          ? editingOrder.hasVat
          : (editingOrder.vatAmount ? editingOrder.vatAmount > 0 : (editingOrder.taxInvoice?.isRequested || false))
      );

      // Tax Invoice prefill
      if (editingOrder.taxInvoice?.isRequested) {
        setRequestTaxInvoice(true);
        setTaxCompanyName(editingOrder.taxInvoice.companyName || editingOrder.customer.name || '');
        setTaxId(editingOrder.taxInvoice.taxId || '');
        setTaxBranch(editingOrder.taxInvoice.branch || 'สำนักงานใหญ่');
        setTaxAddress(editingOrder.taxInvoice.address || editingOrder.customer.address || '');
        setUseCustomerAddressForTax(editingOrder.taxInvoice.address === editingOrder.customer.address);
      } else {
        setRequestTaxInvoice(false);
        setTaxCompanyName('');
        setTaxId('');
        setTaxBranch('สำนักงานใหญ่');
        setTaxAddress('');
        setUseCustomerAddressForTax(true);
      }

      setReceiptNumber(editingOrder.receiptNumber || generateReceiptNumber(editingOrder.orderNumber));
      setReceiptDate(
        editingOrder.receiptDate
          ? editingOrder.receiptDate.slice(0, 10)
          : (editingOrder.createdAt ? editingOrder.createdAt.slice(0, 10) : '')
      );

      setItems(
        editingOrder.items.length > 0
          ? editingOrder.items
          : [{ id: 'item-1', productName: '', pricePerKg: 0, weightKg: 0, totalPrice: 0 }]
      );
    } else {
      // Reset form
      resetForm();
    }
  }, [editingOrder, isOpen]);

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    const d = new Date();
    const tzoffset = d.getTimezoneOffset() * 60000;
    setOrderDate(new Date(Date.now() - tzoffset).toISOString().slice(0, 16));
    setPaymentStatus('paid');
    setDeliveryStatus('pending');
    setStockSource('factory');
    setCourierName('Flash Express');
    setTrackingNumber('');
    setTrackingList(['']);
    setShowBatchPaste(false);
    setBatchPasteText('');
    setCopiedTrackingIndex(null);
    setCopiedTrackingLink(false);
    setCopiedTrackingMsg(false);
    setNote('');
    setShippingFee('');
    setBoxCount(1);
    setHasVat(false);
    setRequestTaxInvoice(false);
    setTaxCompanyName('');
    setTaxId('');
    setTaxBranch('สำนักงานใหญ่');
    setTaxAddress('');
    setUseCustomerAddressForTax(true);
    setReceiptNumber('');
    setReceiptDate('');
    setIsDraftReceiptOpen(false);
    setDraftReceiptOrder(null);
    setItems([
      {
        id: `item-${Date.now()}`,
        productName: '',
        pricePerKg: 0,
        weightKg: 0,
        totalPrice: 0,
      },
    ]);
    setFormError('');
  };

  const handleUpdateBoxCount = (count: number | '') => {
    setBoxCount(count);
    const num = typeof count === 'number' ? Math.max(1, Math.min(20, count)) : 1;
    setTrackingList((prev) => {
      const copy = [...prev];
      if (num > copy.length) {
        while (copy.length < num) copy.push('');
      } else if (num < copy.length) {
        return copy.slice(0, num);
      }
      return copy;
    });
  };

  const handleUpdateTrackingItem = (index: number, val: string) => {
    setTrackingList((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
    if (val.trim() && deliveryStatus === 'pending') {
      setDeliveryStatus('shipped');
    }
  };

  const handleAddBox = () => {
    const current = typeof boxCount === 'number' ? boxCount : 1;
    handleUpdateBoxCount(current + 1);
  };

  const handleRemoveBox = (index: number) => {
    const current = typeof boxCount === 'number' ? boxCount : 1;
    if (current <= 1) return;
    setTrackingList((prev) => prev.filter((_, i) => i !== index));
    setBoxCount(Math.max(1, current - 1));
  };

  const handleApplyBatchPaste = () => {
    const parsed = parseMultiTrackingInput(batchPasteText);
    if (parsed.length > 0) {
      setBoxCount(parsed.length);
      setTrackingList(parsed);
      setShowBatchPaste(false);
      setBatchPasteText('');
      if (deliveryStatus === 'pending') {
        setDeliveryStatus('shipped');
      }
    }
  };

  if (!isOpen) return null;

  // Handle Item Changes
  const updateItemField = (
    id: string,
    field: keyof OrderItem | 'quantityPieces',
    value: string | number
  ) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;

        const updated: OrderItem = { ...item };

        if (field === 'packSize') {
          const newPack = String(value);
          updated.packSize = newPack;
          if (newPack === '28g') {
            const pieces = item.quantityPieces || (item.weightKg > 0 ? Math.round(item.weightKg / 0.028) : 0);
            updated.quantityPieces = pieces;
            if (pieces > 0) {
              updated.weightKg = Math.round(pieces * 0.028 * 1000) / 1000;
              const unitPrice = Number(item.pricePerKg) || 0;
              updated.totalPrice = Math.round(unitPrice * pieces * 100) / 100;
            }
          } else {
            const price = Number(item.pricePerKg) || 0;
            const weight = Number(item.weightKg) || 0;
            updated.totalPrice = Math.round(price * weight * 100) / 100;
          }
          return updated;
        }

        if (field === 'quantityPieces') {
          const pieces = Number(value) || 0;
          updated.quantityPieces = pieces;
          const weight = Math.round(pieces * 0.028 * 1000) / 1000;
          updated.weightKg = weight;
          const unitPrice = Number(item.pricePerKg) || 0;
          updated.totalPrice = Math.round(unitPrice * pieces * 100) / 100;
          return updated;
        }

        if (field === 'pricePerKg') {
          const price = Number(value) || 0;
          updated.pricePerKg = price;
          if (item.packSize === '28g') {
            const pieces = item.quantityPieces || (item.weightKg > 0 ? Math.round(item.weightKg / 0.028) : 0);
            updated.totalPrice = Math.round(price * pieces * 100) / 100;
          } else {
            const weight = Number(item.weightKg) || 0;
            updated.totalPrice = Math.round(price * weight * 100) / 100;
          }
          return updated;
        }

        if (field === 'weightKg') {
          const weight = Number(value) || 0;
          updated.weightKg = weight;
          if (item.packSize === '28g') {
            const pieces = Math.round(weight / 0.028);
            updated.quantityPieces = pieces;
            const price = Number(item.pricePerKg) || 0;
            updated.totalPrice = Math.round(price * pieces * 100) / 100;
          } else {
            const price = Number(item.pricePerKg) || 0;
            updated.totalPrice = Math.round(price * weight * 100) / 100;
          }
          return updated;
        }

        (updated as any)[field] = value;
        return updated;
      })
    );
  };

  // Add Item Line
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productName: '',
        pricePerKg: 0,
        weightKg: 0,
        totalPrice: 0,
      },
    ]);
  };

  // Remove Item Line
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Quick Preset Product Select
  const handleSelectPreset = (id: string, presetName: string, defaultPrice: number) => {
    updateItemField(id, 'productName', presetName);
    updateItemField(id, 'pricePerKg', defaultPrice);
    if (presetName.includes('28กรัม') || presetName.includes('28 กรัม') || presetName.includes('28g')) {
      updateItemField(id, 'packSize', '28g');
    } else if (presetName.includes('100กรัม') || presetName.includes('100 กรัม') || presetName.includes('100g')) {
      updateItemField(id, 'packSize', '100g');
    } else if (presetName.includes('500กรัม') || presetName.includes('500 กรัม') || presetName.includes('500g')) {
      updateItemField(id, 'packSize', '500g');
    } else if (presetName.includes('10กก') || presetName.includes('10 กก') || presetName.includes('10kg')) {
      updateItemField(id, 'packSize', '10kg');
    } else if (presetName.includes('5กก') || presetName.includes('5 กก') || presetName.includes('5kg')) {
      updateItemField(id, 'packSize', '5kg');
    }
  };

  // Toggle Tax Invoice
  const handleToggleTaxInvoice = () => {
    const next = !requestTaxInvoice;
    setRequestTaxInvoice(next);
    if (next) {
      setHasVat(true);
      if (!taxCompanyName) {
        setTaxCompanyName(customerName);
      }
    }
  };

  // Totals
  const grandTotalWeight = items.reduce((sum, item) => sum + (Number(item.weightKg) || 0), 0);
  const itemsSubtotalAmount = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
  const parsedShippingFee = Number(shippingFee) || 0;
  const taxableBase = itemsSubtotalAmount + parsedShippingFee;
  const vatAmount = hasVat ? Math.round(taxableBase * 0.07 * 100) / 100 : 0;
  const grandTotalAmount = Math.round((taxableBase + vatAmount) * 100) / 100;
  const parsedBoxCount = Number(boxCount) > 0 ? Number(boxCount) : undefined;

  // Build Order Object with Validation
  const buildOrderObject = (): PurchaseOrder | null => {
    setFormError('');

    // Validation
    if (!customerName.trim()) {
      setFormError('กรุณากรอกชื่อลูกค้า');
      return null;
    }
    const finalPhone = customerPhone.trim() || '-';

    if (requestTaxInvoice) {
      if (!taxCompanyName.trim()) {
        setFormError('กรุณากรอกชื่อบริษัท / ผู้เสียภาษี สำหรับใบกำกับภาษี');
        return null;
      }
      if (!taxId.trim()) {
        setFormError('กรุณากรอกเลขประจำตัวผู้เสียภาษี (13 หลัก)');
        return null;
      }
    }

    const validItems = items.filter((item) => item.productName.trim() !== '');
    if (validItems.length === 0) {
      setFormError('กรุณากรอกชื่อสินค้าอย่างน้อย 1 รายการ');
      return null;
    }

    for (const item of validItems) {
      if (Number(item.pricePerKg) < 0) {
        setFormError(`กรุณากรอกราคา (บาท/กก.) ให้ถูกต้องสำหรับ "${item.productName}"`);
        return null;
      }
      if (Number(item.weightKg) <= 0) {
        setFormError(`กรุณากรอกจำนวนน้ำหนัก (กก.) ให้ถูกต้องสำหรับ "${item.productName}"`);
        return null;
      }
    }

    let isoDate: string;
    try {
      const parsedDate = new Date(orderDate);
      isoDate = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : (editingOrder ? editingOrder.createdAt : new Date().toISOString());
    } catch {
      isoDate = editingOrder ? editingOrder.createdAt : new Date().toISOString();
    }

    const orderNumber = calculatedPoNumber;
    const finalReceiptNumber = receiptNumber.trim() || generateReceiptNumber(orderNumber);
    const finalReceiptDate = receiptDate ? new Date(receiptDate).toISOString() : isoDate;

    const cleanedTrackings = trackingList.map((t) => t.trim()).filter((t) => t.length > 0);
    const finalBoxCount = Math.max(parsedBoxCount || 1, cleanedTrackings.length || 1);

    const savedPO: PurchaseOrder = {
      id: editingOrder ? editingOrder.id : `po-${Date.now()}`,
      orderNumber,
      createdAt: isoDate,
      customer: {
        name: customerName.trim(),
        phone: finalPhone,
        address: customerAddress.trim() || '-',
      },
      items: validItems.map((it) => ({
        ...it,
        pricePerKg: Number(it.pricePerKg),
        weightKg: Number(it.weightKg),
        totalPrice: Number(it.totalPrice),
        packSize: it.packSize || '1kg',
        quantityPieces: it.quantityPieces,
      })),
      totalWeightKg: grandTotalWeight,
      subtotalAmount: itemsSubtotalAmount,
      hasVat,
      vatRate: hasVat ? 7 : undefined,
      vatAmount: hasVat ? vatAmount : undefined,
      totalAmount: grandTotalAmount,
      shippingFee: parsedShippingFee > 0 ? parsedShippingFee : undefined,
      boxCount: finalBoxCount,
      paymentStatus,
      deliveryStatus,
      stockSource,
      courierName: courierName.trim() || 'Flash Express',
      trackingNumber: cleanedTrackings.join(', ') || undefined,
      trackingNumbers: cleanedTrackings.length > 0 ? cleanedTrackings : undefined,
      note: note.trim(),
      taxInvoice: {
        isRequested: requestTaxInvoice,
        companyName: requestTaxInvoice ? (taxCompanyName.trim() || customerName.trim()) : undefined,
        taxId: requestTaxInvoice ? taxId.trim() : undefined,
        branch: requestTaxInvoice ? taxBranch.trim() : undefined,
        address: requestTaxInvoice ? (useCustomerAddressForTax ? (customerAddress.trim() || '-') : (taxAddress.trim() || customerAddress.trim())) : undefined,
      },
      receiptNumber: finalReceiptNumber,
      receiptDate: finalReceiptDate,
    };

    return savedPO;
  };

  // Submit Handler (Save Only)
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const savedPO = buildOrderObject();
    if (!savedPO) return;

    onSaveOrder(savedPO);
    resetForm();
    onClose();
  };

  // Save Order and immediately view / print Receipt
  const handleSaveAndIssueReceipt = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const savedPO = buildOrderObject();
    if (!savedPO) return;

    onSaveOrder(savedPO);
    resetForm();
    onClose();
    if (onViewReceipt) {
      onViewReceipt(savedPO, 'receipt');
    }
  };

  // Preview Draft Receipt (Without saving or losing form inputs)
  const handlePreviewReceipt = () => {
    const validItems = items.filter((item) => item.productName.trim() !== '');
    const previewItems = validItems.length > 0
      ? validItems.map((it) => ({
          ...it,
          pricePerKg: Number(it.pricePerKg) || 0,
          weightKg: Number(it.weightKg) || 0,
          totalPrice: Number(it.totalPrice) || 0,
          packSize: it.packSize || '1kg',
          quantityPieces: it.quantityPieces,
        }))
      : items.map((it, idx) => ({
          id: it.id || `item-${idx}`,
          productName: it.productName.trim() || 'หอมเจียวคัดพิเศษ (ตัวอย่าง)',
          pricePerKg: Number(it.pricePerKg) || 160,
          weightKg: Number(it.weightKg) || 10,
          totalPrice: Number(it.totalPrice) || (Number(it.pricePerKg) || 160) * (Number(it.weightKg) || 10),
          packSize: it.packSize || '1kg',
          quantityPieces: it.quantityPieces,
        }));

    const cleanedTrackings = trackingList.map((t) => t.trim()).filter((t) => t.length > 0);
    const orderNum = calculatedPoNumber;
    const finalReceiptNumber = receiptNumber.trim() || generateReceiptNumber(orderNum);

    const draftPO: PurchaseOrder = {
      id: editingOrder ? editingOrder.id : 'preview-draft',
      orderNumber: orderNum,
      createdAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
      customer: {
        name: customerName.trim() || 'คุณลูกค้า (ตัวอย่างใบเสร็จ)',
        phone: customerPhone.trim() || '081-123-4567',
        address: customerAddress.trim() || 'ที่อยู่จัดส่งสำหรับออกใบเสร็จ',
      },
      items: previewItems,
      totalWeightKg: grandTotalWeight > 0 ? grandTotalWeight : 10,
      subtotalAmount: itemsSubtotalAmount > 0 ? itemsSubtotalAmount : 1600,
      hasVat,
      vatRate: hasVat ? 7 : undefined,
      vatAmount: hasVat ? vatAmount : undefined,
      totalAmount: grandTotalAmount > 0 ? grandTotalAmount : 1600,
      shippingFee: parsedShippingFee > 0 ? parsedShippingFee : undefined,
      boxCount: Math.max(parsedBoxCount || 1, cleanedTrackings.length || 1),
      paymentStatus,
      deliveryStatus,
      stockSource,
      courierName: courierName || 'Flash Express',
      trackingNumber: cleanedTrackings.join(', '),
      trackingNumbers: cleanedTrackings,
      note: note.trim(),
      taxInvoice: {
        isRequested: requestTaxInvoice,
        companyName: taxCompanyName.trim() || customerName.trim(),
        taxId: taxId.trim(),
        branch: taxBranch.trim(),
        address: taxAddress.trim() || customerAddress.trim(),
      },
      receiptNumber: finalReceiptNumber,
      receiptDate: receiptDate ? new Date(receiptDate).toISOString() : new Date().toISOString(),
    };

    setDraftReceiptOrder(draftPO);
    setIsDraftReceiptOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              <span>{editingOrder ? 'แก้ไขใบสั่งซื้อ' : 'คีย์ข้อมูลใบสั่งซื้อใหม่'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              กรอกข้อมูลลูกค้า รายการสินค้า ราคา จำนวน และออกใบเสร็จรับเงิน
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreviewReceipt}
              className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="ดูตัวอย่าง / ออกใบเสร็จรับเงิน"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">ออกใบเสร็จ</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* SECTION 1: CUSTOMER INFO */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              <span>1. ข้อมูลชื่อ ที่อยู่ เบอร์โทรลูกค้า</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล / ชื่อร้านลูกค้า <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="เช่น คุณวิชัย พรประเสริฐ"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="เช่น 081-234-5678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ที่อยู่จัดส่ง
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="เลขที่, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด, รหัสไปรษณีย์"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TAX INVOICE TOGGLE & SECTION */}
          <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  ใบกำกับภาษี (Tax Invoice)
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleTaxInvoice}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm border ${
                  requestTaxInvoice
                    ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300/50'
                    : 'bg-white text-slate-700 hover:text-slate-900 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{requestTaxInvoice ? '✓ ขอใบกำกับภาษีแล้ว' : '+ ออกใบกำกับภาษี'}</span>
              </button>
            </div>

            {requestTaxInvoice && (
              <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อบริษัท / ผู้เสียภาษี <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required={requestTaxInvoice}
                      placeholder="เช่น บริษัท เอส เอ็ม ฟู๊ด จำกัด"
                      value={taxCompanyName}
                      onChange={(e) => setTaxCompanyName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลขประจำตัวผู้เสียภาษี (13 หลัก) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={requestTaxInvoice}
                    placeholder="เช่น 0105558123456"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สาขา
                  </label>
                  <select
                    value={taxBranch}
                    onChange={(e) => setTaxBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="สำนักงานใหญ่">สำนักงานใหญ่ (Head Office)</option>
                    <option value="สาขาที่ 00001">สาขาที่ 00001</option>
                    <option value="สาขาที่ 00002">สาขาที่ 00002</option>
                    <option value="สาขาที่ 00003">สาขาที่ 00003</option>
                  </select>
                </div>

                <div className="flex items-center sm:pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={useCustomerAddressForTax}
                      onChange={(e) => setUseCustomerAddressForTax(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span>ใช้ที่อยู่เดียวกับที่อยู่จัดส่ง</span>
                  </label>
                </div>

                {!useCustomerAddressForTax && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ที่อยู่สำหรับออกใบกำกับภาษี
                    </label>
                    <input
                      type="text"
                      placeholder="ระบุที่อยู่ตาม ภ.พ.20"
                      value={taxAddress}
                      onChange={(e) => setTaxAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2 & 3 & 4: PRODUCTS, PRICE & WEIGHT (กก.) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>2. รายการสินค้า ราคา และจำนวน (กก.)</span>
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มสินค้า</span>
              </button>
            </div>

            {/* Quick Product Presets Bar */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>คลิกเพื่อเลือกสินค้าด่วน (พร้อมเช็คยอดคงเหลือใน{stockSource === 'online' ? 'คลังออนไลน์' : 'คลังโรงงาน'}):</span>
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  {stockSource === 'online' ? '🌐 คลังออนไลน์' : '🏭 คลังโรงงาน'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_PRODUCTS_PRESETS.slice(0, 10).map((preset, pIdx) => {
                  const presetStock = getRealtimeAvailableStock(
                    preset.name,
                    stockSource,
                    stockEntries,
                    existingOrders,
                    editingOrder?.id
                  );
                  return (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        // Find first empty item or target last item
                        const targetItem = items.find((i) => !i.productName) || items[items.length - 1];
                        handleSelectPreset(targetItem.id, preset.name, preset.defaultPrice);
                      }}
                      className="text-[11px] bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 px-2 py-1 rounded-md border border-slate-200 transition-colors shrink-0 flex items-center gap-1"
                    >
                      <span>+ {preset.name} ({preset.defaultPrice}฿/กก.)</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                          presetStock.availableKg > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                        title={`ยอดผลิตทั้งหมด: ${presetStock.totalProducedKg} กก. / ตัดขายแล้ว: ${presetStock.totalSoldKg} กก.`}
                      >
                        เหลือ {presetStock.availableKg} กก.
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ITEMS LIST TABLE */}
            <div className="space-y-3">
              {items.map((item, index) => {
                const isTracked = isStockTrackedProduct(item.productName);
                const stockInfo = item.productName && isTracked
                  ? getRealtimeAvailableStock(
                      item.productName,
                      stockSource,
                      stockEntries,
                      existingOrders,
                      editingOrder?.id
                    )
                  : null;

                const remainingAfter = stockInfo
                  ? Math.round((stockInfo.availableKg - (item.weightKg || 0)) * 100) / 100
                  : null;

                const isExceeding = stockInfo && item.weightKg > stockInfo.availableKg;

                return (
                  <div
                    key={item.id}
                    className={`bg-white p-3.5 rounded-xl border transition-all relative space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center ${
                      isExceeding
                        ? 'border-rose-300 ring-1 ring-rose-200'
                        : 'border-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Product Name */}
                    <div className="sm:col-span-5">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[11px] font-semibold text-slate-500">
                          ชื่อสินค้า #{index + 1}
                        </label>
                        {item.productName && (
                          isTracked && stockInfo ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 flex-wrap ${
                                stockInfo.availableKg <= 0
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : isExceeding
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              <span>
                                พร้อมขาย {stockSource === 'online' ? 'ออนไลน์' : 'โรงงาน'}:{' '}
                                <strong className="font-extrabold">{stockInfo.availableKg}</strong> กก.
                              </span>
                              {Number(item.weightKg) > 0 && (
                                <span className="inline-flex items-center gap-1 text-slate-600 font-normal">
                                  <span>➔ ตัดขาย {item.weightKg} กก.</span>
                                  <span>➔ คงเหลือ</span>
                                  <span
                                    className={`font-black px-1 rounded ${
                                      remainingAfter !== null && remainingAfter < 0
                                        ? 'bg-rose-200 text-rose-900'
                                        : 'bg-emerald-200/80 text-emerald-900 font-bold'
                                    }`}
                                  >
                                    {remainingAfter} กก.
                                  </span>
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              สินค้าอื่นๆ (ไม่นับสต็อค)
                            </span>
                          )
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="เช่น หอมเจียว, กระเทียมเจียว"
                        value={item.productName}
                        onChange={(e) => updateItemField(item.id, 'productName', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                      />
                    </div>

                    {/* Price per Kg / Pouch */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                        {item.packSize === '28g' ? 'ราคา/ซอง (บาท)' : 'ราคา/กก. (บาท)'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        placeholder="0.00"
                        value={item.pricePerKg || ''}
                        onChange={(e) => updateItemField(item.id, 'pricePerKg', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                    </div>

                    {/* Weight in Kg or Pouches for 28g */}
                    <div className="sm:col-span-3">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[11px] font-semibold text-slate-500">
                          {item.packSize === '28g'
                            ? 'จำนวนสั่งซื้อ (ซอง)'
                            : isTracked
                            ? 'จำนวนตัดสต็อค (กก.)'
                            : 'จำนวนสั่งซื้อ (กก.)'}
                        </label>
                        {item.packSize === '28g' && (
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            = {item.weightKg || 0} กก.
                          </span>
                        )}
                      </div>
                      {item.packSize === '28g' ? (
                        <input
                          type="number"
                          step="1"
                          min="0"
                          required
                          placeholder="ระบุจำนวนซอง"
                          value={item.quantityPieces !== undefined && item.quantityPieces !== null ? (item.quantityPieces || '') : (item.weightKg ? Math.round(item.weightKg / 0.028) : '')}
                          onChange={(e) => updateItemField(item.id, 'quantityPieces', e.target.value)}
                          className="w-full px-3 py-1.5 bg-emerald-50/40 focus:bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                      ) : (
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          placeholder="0"
                          value={item.weightKg || ''}
                          onChange={(e) => updateItemField(item.id, 'weightKg', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-xs font-semibold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                      )}
                    </div>

                    {/* Delete button */}
                    <div className="sm:col-span-1 flex justify-end items-center sm:pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length <= 1}
                        className={`p-1.5 rounded-lg transition-colors ${
                          items.length <= 1
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Stock Deduction Indicator alert if exceeding */}
                    {isExceeding && (
                      <div className="sm:col-span-12 bg-rose-50 border border-rose-200 text-rose-800 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>
                          ระวัง: รายการนี้คีย์ตัดสต็อค {item.weightKg} กก. เกินยอดพร้อมขายจริงใน{stockSource === 'online' ? 'คลังออนไลน์' : 'คลังโรงงาน'} ({stockInfo?.availableKg} กก.) คงเหลือหลังตัดจะติดลบ ({remainingAfter} กก.)
                        </span>
                      </div>
                    )}

                    {/* Pack Size Selection & Calculated Subtotal */}
                    <div className="sm:col-span-12 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-500">ขนาดแพ็ค:</span>
                        <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 gap-0.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => updateItemField(item.id, 'packSize', '28g')}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                              item.packSize === '28g'
                                ? 'bg-amber-500 text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            แพ็ค 28 กรัม (ซอง)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemField(item.id, 'packSize', '100g')}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                              item.packSize === '100g'
                                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            แพ็ค 100 กรัม
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemField(item.id, 'packSize', '500g')}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                              item.packSize === '500g'
                                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            แพ็ค 500 กรัม
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemField(item.id, 'packSize', '1kg')}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                              (!item.packSize || item.packSize === '1kg')
                                ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            แพ็ค 1 กก.
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemField(item.id, 'packSize', '5kg')}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                              item.packSize === '5kg'
                                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            แพ็ค 5 กิโลกรัม
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemField(item.id, 'packSize', '10kg')}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                              item.packSize === '10kg'
                                ? 'bg-purple-600 text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            แพ็ค 10 กิโลกรัม
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-slate-500">
                        {remainingAfter !== null && (
                          <span className="text-[11px] text-slate-600 font-medium">
                            ตัดแล้วคงเหลือ: <strong className={remainingAfter < 0 ? 'text-rose-600 font-bold' : 'text-emerald-700'}>{remainingAfter} กก.</strong>
                          </span>
                        )}
                        <span>
                          {item.packSize === '28g' ? (
                            <>คำนวณ: {item.pricePerKg || 0} บ./ซอง × {item.quantityPieces || (item.weightKg ? Math.round(item.weightKg / 0.028) : 0)} ซอง ({item.weightKg || 0} กก.)</>
                          ) : (
                            <>คำนวณ: {item.pricePerKg || 0} บาท × {item.weightKg || 0} กก.</>
                          )}
                        </span>
                        <span className="font-bold text-slate-800">
                          รวม = {formatCurrency(item.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION: VAT 7%, SHIPPING FEE & BOX COUNT */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            {/* VAT 7% Option */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    ภาษีมูลค่าเพิ่ม VAT 7%
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {hasVat
                      ? `คิด VAT 7% (รวมค่าส่ง) เป็นเงิน +${formatCurrency(vatAmount)}`
                      : 'เลือกเพื่อคิดภาษีมูลค่าเพิ่ม 7% จากราคาสินค้าและค่าจัดส่ง'}
                  </span>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-300 hover:border-emerald-500 transition-all shadow-xs select-none">
                <input
                  type="checkbox"
                  checked={hasVat}
                  onChange={(e) => setHasVat(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  {hasVat ? '✓ คิด VAT 7%' : 'ไม่คิด VAT (ยอดปกติ)'}
                </span>
              </label>
            </div>

            {/* Box Count & Shipping Fee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Box className="w-3.5 h-3.5 text-slate-500" />
                  <span>จำนวนกล่อง (กล่อง)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="เช่น 1, 2, 3..."
                  value={boxCount}
                  onChange={(e) => handleUpdateBoxCount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                  <span>ค่าจัดส่งแยกต่างหาก (บาท)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00 (ถ้ามี)"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* GRAND TOTAL SUMMARY BAR */}
          <div className="bg-emerald-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div>
              <p className="text-xs text-emerald-200">สรุปยอดรวมทั้งสิ้นในใบสั่งซื้อนี้</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs bg-emerald-800 text-emerald-100 px-2.5 py-0.5 rounded-full font-medium">
                  น้ำหนักรวม: {formatWeight(grandTotalWeight)}
                </span>
                {hasVat && (
                  <span className="text-xs bg-emerald-700 text-emerald-100 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500">
                    ✓ รวม VAT 7%
                  </span>
                )}
                {parsedBoxCount && (
                  <span className="text-xs bg-emerald-800 text-emerald-100 px-2.5 py-0.5 rounded-full font-medium">
                    📦 {parsedBoxCount} กล่อง
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-emerald-200 space-y-0.5 mb-1">
                <div>ราคาสินค้ารวม: {formatCurrency(itemsSubtotalAmount)}</div>
                {parsedShippingFee > 0 && (
                  <div>ค่าจัดส่ง: +{formatCurrency(parsedShippingFee)}</div>
                )}
                {hasVat && (
                  <div className="font-semibold text-emerald-300">
                    ภาษีมูลค่าเพิ่ม VAT 7% (รวมค่าส่ง): +{formatCurrency(vatAmount)}
                  </div>
                )}
              </div>
              <span className="text-xs text-emerald-300 block">ราคารวมทั้งสิ้น</span>
              <span className="text-2xl font-black text-emerald-300">
                {formatCurrency(grandTotalAmount)}
              </span>
            </div>
          </div>

          {/* SECTION: STOCK DEDUCTION SOURCE (โรงงาน หรือ ออนไลน์) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Factory className="w-4 h-4 text-emerald-600" />
                  <span>3. เลือกตัดสต็อคสินค้า (โรงงาน หรือ ออนไลน์)</span>
                  <span className="text-rose-500">*</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ระบุคลังที่ต้องการให้ระบบตัดสต็อคสินค้าสำหรับออเดอร์นี้
                </p>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  stockSource === 'online'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {stockSource === 'online' ? '🌐 ตัดสต็อคออนไลน์' : '🏭 ตัดสต็อคโรงงาน'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option 1: Factory Stock */}
              <button
                type="button"
                onClick={() => setStockSource('factory')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all relative ${
                  stockSource === 'factory'
                    ? 'bg-emerald-50/60 border-emerald-600 shadow-sm ring-2 ring-emerald-200/50'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      stockSource === 'factory'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Factory className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        ตัดสต็อคโรงงาน (Factory)
                      </span>
                      {stockSource === 'factory' && (
                        <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                          เลือกอยู่
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      สำหรับออเดอร์ส่งออกจากโรงงานหลัก / ตัวแทนจำหน่าย / ร้านค้าส่ง
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 2: Online Stock */}
              <button
                type="button"
                onClick={() => setStockSource('online')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all relative ${
                  stockSource === 'online'
                    ? 'bg-blue-50/70 border-blue-600 shadow-sm ring-2 ring-blue-200/50'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      stockSource === 'online'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        ตัดสต็อคออนไลน์ (Online)
                      </span>
                      {stockSource === 'online' && (
                        <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          เลือกอยู่
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      สำหรับออเดอร์ขายออนไลน์ Shopee / TikTok Shop / LINE OA / Facebook
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* LIVE DEDUCTION PREVIEW TABLE FOR CURRENT SELECTION */}
            <div className="mt-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    ตารางจำลองการตัดสต็อคสินค้าจาก ({stockSource === 'online' ? '🌐 คลังออนไลน์' : '🏭 คลังโรงงาน'})
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold border border-emerald-200">
                  นับตัดสต็อคเฉพาะ หอมเจียว & กระเทียมเจียว
                </span>
              </div>

              {items.filter(i => i.productName).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2 text-center">
                  ยังไม่มีการระบุชื่อสินค้าในรายการสั่งซื้อ
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="p-2">สินค้า</th>
                        <th className="p-2 text-right">ยอดสั่งซื้อ (กก.)</th>
                        <th className="p-2 text-right">สต็อคก่อนตัด (กก.)</th>
                        <th className="p-2 text-right font-black">สต็อคคงเหลือหลังตัด (กก.)</th>
                        <th className="p-2 text-center">สถานะตัดสต็อค</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items
                        .filter((i) => i.productName)
                        .map((item, idx) => {
                          const isTracked = isStockTrackedProduct(item.productName);
                          const normalized = normalizeProductName(item.productName);

                          if (!isTracked) {
                            return (
                              <tr key={idx} className="hover:bg-slate-50/60 opacity-80">
                                <td className="p-2 font-bold text-slate-700">
                                  {item.productName}
                                  <span className="block text-[10px] text-slate-400 font-normal">
                                    (สินค้าสั่งผลิต/ทั่วไป - ไม่นับสต็อค)
                                  </span>
                                </td>
                                <td className="p-2 text-right font-bold text-slate-600">
                                  {item.weightKg || 0} กก.
                                </td>
                                <td className="p-2 text-right text-slate-400 italic">—</td>
                                <td className="p-2 text-right text-slate-400 italic">—</td>
                                <td className="p-2 text-center">
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                    ไม่นับสต็อค
                                  </span>
                                </td>
                              </tr>
                            );
                          }

                          const stockInfo迷 = getRealtimeAvailableStock(
                            item.productName,
                            stockSource,
                            stockEntries,
                            existingOrders,
                            editingOrder?.id
                          );
                          const deductKg = item.weightKg || 0;
                          const afterKg = Math.round((stockInfo迷.availableKg - deductKg) * 100) / 100;
                          const isShort = afterKg < 0;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="p-2 font-bold text-slate-900">
                                {item.productName}
                                <span className="block text-[10px] text-emerald-700 font-medium">
                                  {normalized}
                                </span>
                              </td>
                              <td className="p-2 text-right font-bold text-rose-700">
                                -{deductKg} กก.
                              </td>
                              <td className="p-2 text-right text-slate-600 font-semibold">
                                {stockInfo迷.availableKg} กก.
                              </td>
                              <td className="p-2 text-right font-black">
                                <span className={isShort ? 'text-rose-600' : 'text-emerald-700'}>
                                  {afterKg} กก.
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                {isShort ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                    ⚠️ สต็อคไม่พอ
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    ✓ พอตัดสต็อค
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: DATE & PO NUMBER & STATUS & SHIPPING / TRACKING */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-600" />
                <span>4. ข้อมูลการจัดส่ง, เลขพัสดุ (Flash Express) & สถานะออเดอร์</span>
              </h3>
              <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Package className="w-3 h-3 text-amber-700" />
                <span>รองรับแยกหลายกล่อง</span>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  หมายเลขใบสั่งซื้อ (PO Number)
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <Hash className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-base font-black text-slate-900 font-mono tracking-tight bg-emerald-100/80 text-emerald-950 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                    {calculatedPoNumber}
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    (รันเรียงตามวันที่: ปีเดือนวัน-ออร์เดอร์)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>เลือกวันที่และเวลาใบสั่งซื้อ <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สถานะชำระเงิน
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="paid">ชำระเงินแล้ว (Paid)</option>
                  <option value="cod">เก็บเงินปลายทาง (COD)</option>
                  <option value="pending">รอชำระเงิน (Pending)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สถานะจัดส่ง
                </label>
                <select
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value as DeliveryStatus)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="pending">รอดำเนินการ (Pending)</option>
                  <option value="shipped">กำลังจัดส่ง (Shipped)</option>
                  <option value="delivered">จัดส่งสำเร็จ (Delivered)</option>
                  <option value="cancelled">ยกเลิก (Cancelled)</option>
                </select>
              </div>

              {/* Courier & Tracking Number (ขนส่ง & เลขพัสดุ - รองรับแยกหลายกล่อง) */}
              <div className="sm:col-span-2 bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                    <Truck className="w-4 h-4 text-amber-600" />
                    <span>ข้อมูลขนส่ง & เลขพัสดุ (Parcel Tracking)</span>
                    <span className="bg-amber-200 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                      ⚡ ขนส่งหลัก: Flash Express
                    </span>
                  </div>
                  {trackingList.some((t) => t.trim().length > 0) && deliveryStatus === 'pending' && (
                    <button
                      type="button"
                      onClick={() => setDeliveryStatus('shipped')}
                      className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200 px-2 py-0.5 rounded-lg border border-emerald-300 transition-colors"
                    >
                      ✓ ปรับสถานะเป็น "กำลังจัดส่ง"
                    </button>
                  )}
                </div>

                {/* Courier Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    บริษัทขนส่ง (Carrier)
                  </label>
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {COURIER_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Box Count Selector & Quick Batch Paste */}
                <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <span>จำนวนกล่องในออร์เดอร์นี้:</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleUpdateBoxCount(num)}
                          className={`w-7 h-7 text-xs font-bold rounded-lg border transition-all ${
                            boxCount === num
                              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs font-black'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-slate-200">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={boxCount}
                          onChange={(e) => handleUpdateBoxCount(e.target.value ? Number(e.target.value) : '')}
                          className="w-12 px-1.5 py-1 text-center bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-xs text-slate-600 font-bold">กล่อง</span>
                      </div>
                    </div>
                  </div>

                  {/* Batch Paste Toggle */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <span className="text-amber-800 font-medium">
                      {(typeof boxCount === 'number' && boxCount > 1) || trackingList.length > 1
                        ? `📦 มี ${trackingList.length} กล่องพัสดุ (สามารถระบุเลขพัสดุแยกกล่องได้)`
                        : '📦 ส่งพัสดุ 1 กล่อง'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBatchPaste(!showBatchPaste)}
                      className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 hover:underline"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>{showBatchPaste ? 'ปิดช่องวางหลายกล่อง' : 'วางเลขพัสดุหลายรายการพร้อมกัน'}</span>
                    </button>
                  </div>

                  {/* Batch Paste Textarea */}
                  {showBatchPaste && (
                    <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-300 space-y-2 animate-in fade-in duration-100">
                      <label className="block text-[11px] font-bold text-slate-700">
                        วางเลขพัสดุหลายรายการ (1 บรรทัดต่อ 1 กล่อง หรือคั่นด้วยจุลภาค):
                      </label>
                      <textarea
                        rows={3}
                        value={batchPasteText}
                        onChange={(e) => setBatchPasteText(e.target.value)}
                        placeholder={"TH0123456789A\nTH0123456789B\nTH0123456789C"}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowBatchPaste(false)}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyBatchPaste}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs"
                        >
                          นำเข้าแยกตามกล่อง
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Individual Tracking Inputs Per Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      เลขพัสดุแยกตามกล่อง ({courierName})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddBox}
                      className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ เพิ่มอีก 1 กล่อง</span>
                    </button>
                  </div>

                  {trackingList.map((trk, idx) => {
                    const clean = trk.trim();
                    const url = getTrackingUrl(courierName, clean);

                    return (
                      <div
                        key={idx}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1.5 focus-within:border-amber-400 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span>
                              กล่องที่ {idx + 1}{' '}
                              {trackingList.length > 1 ? `(จาก ${trackingList.length} กล่อง)` : ''}
                            </span>
                          </span>

                          {trackingList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBox(idx)}
                              title="ลบกล่องนี้"
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            placeholder={idx === 0 ? "เช่น TH0123456789A (Flash Express)" : `เช่น TH0123456789${String.fromCharCode(66 + idx)}`}
                            value={trk}
                            onChange={(e) => handleUpdateTrackingItem(idx, e.target.value)}
                            className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none uppercase placeholder:font-normal placeholder:normal-case"
                          />
                          <Truck className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {clean && (
                          <div className="flex items-center justify-between pt-0.5 text-[11px]">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1 truncate max-w-[240px]"
                            >
                              <ExternalLink className="w-3 h-3 text-blue-600 shrink-0" />
                              <span className="truncate">ลิงก์เช็คสถานะกล่องที่ {idx + 1}</span>
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await copyToClipboard(url);
                                if (ok) {
                                  setCopiedTrackingIndex(idx);
                                  setTimeout(() => setCopiedTrackingIndex(null), 2000);
                                }
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                copiedTrackingIndex === idx
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                              }`}
                            >
                              {copiedTrackingIndex === idx ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Customer Notification Message Ready-to-Copy Card */}
                {trackingList.some((t) => t.trim().length > 0) && (
                  <div className="bg-white border border-amber-300/80 rounded-xl p-3 space-y-2 text-xs shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="truncate font-mono text-[11px] text-slate-700">
                        <span className="font-bold text-amber-800 mr-1">💬 แจ้งเลขพัสดุให้ลูกค้า:</span>
                        <span className="text-slate-600">
                          {trackingList.filter((t) => t.trim().length > 0).length} กล่อง ({courierName})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            const cleaned = trackingList.map((t) => t.trim()).filter(Boolean);
                            const dummyOrder: PurchaseOrder = {
                              id: 'temp',
                              orderNumber: calculatedPoNumber,
                              createdAt: orderDate,
                              customer: { name: customerName.trim() || 'คุณลูกค้า', phone: customerPhone.trim(), address: customerAddress },
                              items: [],
                              totalWeightKg: grandTotalWeight,
                              totalAmount: grandTotalAmount,
                              paymentStatus,
                              deliveryStatus,
                              courierName,
                              trackingNumber: cleaned.join(', '),
                              trackingNumbers: cleaned,
                              boxCount: Math.max(Number(boxCount) || 1, cleaned.length),
                            };
                            const msg = generateCustomerTrackingMessage(dummyOrder);
                            const ok = await copyToClipboard(msg);
                            if (ok) {
                              setCopiedTrackingMsg(true);
                              setTimeout(() => setCopiedTrackingMsg(false), 2500);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors ${
                            copiedTrackingMsg
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                          }`}
                        >
                          {copiedTrackingMsg ? <Check className="w-3.5 h-3.5 text-white" /> : <FileText className="w-3.5 h-3.5 text-amber-700" />}
                          <span>{copiedTrackingMsg ? 'คัดลอกข้อความ LINE แล้ว' : 'คัดลอกข้อความแจ้งลูกค้า (ทุกล่อง)'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ส่งช่วงเช้าก่อน 10:00 น., วางบิลชั้น 2"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: RECEIPT ISSUANCE (การออกใบเสร็จรับเงิน) */}
          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-300 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <span>5. ข้อมูลการออกใบเสร็จรับเงิน (Receipt Issuance)</span>
                    <span className="text-[10px] font-extrabold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      ✓ พร้อมออกใบเสร็จ
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    สามารถกำหนดเลขที่ใบเสร็จ วันที่ และกดดูตัวอย่างพิมพ์หรือบันทึกพร้อมออกใบเสร็จได้ทันที
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePreviewReceipt}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>ดูตัวอย่าง / พิมพ์ใบเสร็จ</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-emerald-700" />
                    <span>เลขที่ใบเสร็จรับเงิน (Receipt No.)</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                    รหัสเริ่มต้น RC-
                  </span>
                </label>
                <input
                  type="text"
                  value={receiptNumber || generateReceiptNumber(calculatedPoNumber)}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder={`เช่น ${generateReceiptNumber(calculatedPoNumber)}`}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>วันที่ออกใบเสร็จรับเงิน</span>
                </label>
                <input
                  type="date"
                  value={receiptDate ? receiptDate.slice(0, 10) : orderDate.slice(0, 10)}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">สถานะชำระเงิน:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                  paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : paymentStatus === 'cod'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {paymentStatus === 'paid'
                    ? '✓ ชำระเงินเรียบร้อย (ออกใบเสร็จสมบูรณ์)'
                    : paymentStatus === 'cod'
                    ? '⚠️ เก็บเงินปลายทาง (COD)'
                    : '⏳ รอชำระเงิน'}
                </span>
              </div>

              <div className="text-[11px] text-slate-600 font-medium">
                ยอดเงินที่จะแสดงในใบเสร็จ:{' '}
                <span className="text-slate-950 text-xs font-black bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">
                  {formatCurrency(grandTotalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePreviewReceipt}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>ดูตัวอย่างใบเสร็จ</span>
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
              >
                <span>{editingOrder ? 'บันทึกการแก้ไข' : 'บันทึกใบสั่งซื้อ'}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAndIssueReceipt}
                className="px-5 py-2 text-xs sm:text-sm font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 rounded-xl shadow-md shadow-emerald-950/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2 border border-emerald-400"
              >
                <Receipt className="w-4 h-4 stroke-[2.5]" />
                <span>บันทึกและออกใบเสร็จรับเงิน</span>
              </button>
            </div>
          </div>

        </form>

        {/* Live Draft Receipt Modal (Preview from inside form) */}
        <ReceiptModal
          isOpen={isDraftReceiptOpen}
          order={draftReceiptOrder}
          initialDocType="receipt"
          onClose={() => setIsDraftReceiptOpen(false)}
        />

      </div>
    </div>
  );
};
