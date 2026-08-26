import React, { useState, useEffect } from 'react';
import { PurchaseOrder, OrderItem, PaymentStatus, DeliveryStatus, TaxInvoiceInfo } from '../types';
import { POPULAR_PRODUCTS_PRESETS } from '../data/sampleOrders';
import { formatCurrency, formatWeight, generatePoNumber } from '../utils/formatters';
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
} from 'lucide-react';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveOrder: (order: PurchaseOrder) => void;
  editingOrder?: PurchaseOrder | null;
  existingOrders?: PurchaseOrder[];
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  onSaveOrder,
  editingOrder,
  existingOrders = [],
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
  const [note, setNote] = useState('');

  // Shipping Fee & Box Count State
  const [shippingFee, setShippingFee] = useState<number | ''>('');
  const [boxCount, setBoxCount] = useState<number | ''>('');
  const [hasVat, setHasVat] = useState(false);

  // Tax Invoice State
  const [requestTaxInvoice, setRequestTaxInvoice] = useState(false);
  const [taxCompanyName, setTaxCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [taxBranch, setTaxBranch] = useState('สำนักงานใหญ่');
  const [taxAddress, setTaxAddress] = useState('');
  const [useCustomerAddressForTax, setUseCustomerAddressForTax] = useState(true);

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
      setNote(editingOrder.note || '');

      setShippingFee(editingOrder.shippingFee !== undefined ? editingOrder.shippingFee : '');
      setBoxCount(editingOrder.boxCount !== undefined ? editingOrder.boxCount : '');
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
    setNote('');
    setShippingFee('');
    setBoxCount('');
    setHasVat(false);
    setRequestTaxInvoice(false);
    setTaxCompanyName('');
    setTaxId('');
    setTaxBranch('สำนักงานใหญ่');
    setTaxAddress('');
    setUseCustomerAddressForTax(true);
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

  if (!isOpen) return null;

  // Handle Item Changes
  const updateItemField = (
    id: string,
    field: keyof OrderItem,
    value: string | number
  ) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        if (field === 'pricePerKg' || field === 'weightKg') {
          const price = field === 'pricePerKg' ? Number(value) || 0 : item.pricePerKg;
          const weight = field === 'weightKg' ? Number(value) || 0 : item.weightKg;
          updated.totalPrice = Math.round(price * weight * 100) / 100;
        }

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

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!customerName.trim()) {
      setFormError('กรุณากรอกชื่อลูกค้า');
      return;
    }
    const finalPhone = customerPhone.trim() || '-';

    if (requestTaxInvoice) {
      if (!taxCompanyName.trim()) {
        setFormError('กรุณากรอกชื่อบริษัท / ผู้เสียภาษี สำหรับใบกำกับภาษี');
        return;
      }
      if (!taxId.trim()) {
        setFormError('กรุณากรอกเลขประจำตัวผู้เสียภาษี (13 หลัก)');
        return;
      }
    }

    const validItems = items.filter((item) => item.productName.trim() !== '');
    if (validItems.length === 0) {
      setFormError('กรุณากรอกชื่อสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    for (const item of validItems) {
      if (Number(item.pricePerKg) < 0) {
        setFormError(`กรุณากรอกราคา (บาท/กก.) ให้ถูกต้องสำหรับ "${item.productName}"`);
        return;
      }
      if (Number(item.weightKg) <= 0) {
        setFormError(`กรุณากรอกจำนวนน้ำหนัก (กก.) ให้ถูกต้องสำหรับ "${item.productName}"`);
        return;
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
        totalPrice: Number(it.pricePerKg) * Number(it.weightKg),
        packSize: it.packSize || '1kg',
      })),
      totalWeightKg: grandTotalWeight,
      subtotalAmount: itemsSubtotalAmount,
      hasVat,
      vatRate: hasVat ? 7 : undefined,
      vatAmount: hasVat ? vatAmount : undefined,
      totalAmount: grandTotalAmount,
      shippingFee: parsedShippingFee > 0 ? parsedShippingFee : undefined,
      boxCount: parsedBoxCount,
      paymentStatus,
      deliveryStatus,
      note: note.trim(),
      taxInvoice: {
        isRequested: requestTaxInvoice,
        companyName: requestTaxInvoice ? (taxCompanyName.trim() || customerName.trim()) : undefined,
        taxId: requestTaxInvoice ? taxId.trim() : undefined,
        branch: requestTaxInvoice ? taxBranch.trim() : undefined,
        address: requestTaxInvoice ? (useCustomerAddressForTax ? (customerAddress.trim() || '-') : (taxAddress.trim() || customerAddress.trim())) : undefined,
      },
    };

    onSaveOrder(savedPO);
    resetForm();
    onClose();
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
              กรอกข้อมูลลูกค้า รายการสินค้า ราคา และจำนวน (กก.)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
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
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>คลิกเพื่อเลือกสินค้าด่วน (หรือพิมพ์เองได้):</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_PRODUCTS_PRESETS.slice(0, 6).map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => {
                      // Find first empty item or target last item
                      const targetItem = items.find((i) => !i.productName) || items[items.length - 1];
                      handleSelectPreset(targetItem.id, preset.name, preset.defaultPrice);
                    }}
                    className="text-[11px] bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 px-2 py-1 rounded-md border border-slate-200 transition-colors shrink-0"
                  >
                    + {preset.name} ({preset.defaultPrice}฿/กก.)
                  </button>
                ))}
              </div>
            </div>

            {/* ITEMS LIST TABLE */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm relative space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center"
                >
                  {/* Product Name */}
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                      ชื่อสินค้า #{index + 1}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น หอมเจียว, กระเทียมเจียว"
                      value={item.productName}
                      onChange={(e) => updateItemField(item.id, 'productName', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                    />
                  </div>

                  {/* Price per Kg */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                      ราคา/กก. (บาท)
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

                  {/* Weight in Kg */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                      จำนวน (กก.)
                    </label>
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

                  {/* Pack Size Selection & Calculated Subtotal */}
                  <div className="sm:col-span-12 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">ขนาดแพ็ค:</span>
                      <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 gap-0.5">
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
                          onClick={() => updateItemField(item.id, 'packSize', '5kg')}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                            item.packSize === '5kg'
                              ? 'bg-emerald-600 text-white font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          แพ็ค 5 กิโลกรัม
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-slate-500">
                      <span>
                        คำนวณ: {item.pricePerKg || 0} บาท × {item.weightKg || 0} กก.
                      </span>
                      <span className="font-bold text-slate-800">
                        รวม = {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
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
                  onChange={(e) => setBoxCount(e.target.value ? Number(e.target.value) : '')}
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

          {/* SECTION 5: DATE & PO NUMBER & STATUS & NOTE */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
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

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md shadow-emerald-950/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>{editingOrder ? 'บันทึกการแก้ไข' : 'บันทึกใบสั่งซื้อ'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
