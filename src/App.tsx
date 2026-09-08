import React, { useState, useEffect, useMemo } from 'react';
import { PurchaseOrder, StockEntry } from './types';
import { loadOrders, saveOrders, resetOrdersToDefault, SAMPLE_ORDERS } from './data/sampleOrders';
import {
  subscribeToOrders,
  saveOrderToFirestore,
  deleteOrderFromFirestore,
  seedInitialOrdersIfEmpty,
  syncAllOrdersToFirestore,
  subscribeToStockEntries,
  saveStockEntryToFirestore,
  deleteStockEntryFromFirestore,
  seedInitialStockEntriesIfEmpty,
} from './services/firebaseService';
import {
  loadStockEntriesFromLocalStorage,
  saveStockEntriesToLocalStorage,
  getSampleStockEntries,
} from './utils/stockUtils';
import { Header } from './components/Header';
import { SalesSummary } from './components/SalesSummary';
import { OrderList } from './components/OrderList';
import { OrderFormModal } from './components/OrderFormModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ShippingLabelModal } from './components/ShippingLabelModal';
import { DailyWeightSummaryModal } from './components/DailyWeightSummaryModal';
import { StockManagementModal } from './components/StockManagementModal';
import { CustomerSummary } from './components/CustomerSummary';
import { BarChart2, ListFilter, PlusCircle, CheckCircle, Wifi, CloudCheck, Scale, Users } from 'lucide-react';
import { normalizeCustomerKey } from './utils/customerAnalytics';

export default function App() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'orders'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(true);


  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);

  const [receiptOrder, setReceiptOrder] = useState<PurchaseOrder | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const [shippingLabelOrder, setShippingLabelOrder] = useState<PurchaseOrder | null>(null);
  const [isDailyWeightModalOpen, setIsDailyWeightModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Subscribe to Firestore Real-time changes for Orders and Stock Entries
  useEffect(() => {
    // First load local storage cache as immediate fallback
    const cached = loadOrders();
    const initialDataset = cached.length >= SAMPLE_ORDERS.length ? cached : SAMPLE_ORDERS;
    setOrders(initialDataset);

    // Initial stock entries fallback
    const initialStock = loadStockEntriesFromLocalStorage();
    setStockEntries(initialStock);

    // Ensure Firestore is seeded with initial stock entries and orders dataset
    seedInitialOrdersIfEmpty(SAMPLE_ORDERS);
    seedInitialStockEntriesIfEmpty(initialStock);

    // Real-time listener for Orders
    const unsubscribeOrders = subscribeToOrders(
      (realtimeOrders) => {
        setOrders(realtimeOrders);
        saveOrders(realtimeOrders); // Cache locally
        setIsSyncing(false);
      },
      (err) => {
        console.error('Firestore listener error:', err);
        setIsSyncing(false);
      }
    );

    // Real-time listener for Stock Entries
    const unsubscribeStock = subscribeToStockEntries(
      (realtimeStock) => {
        if (realtimeStock) {
          setStockEntries(realtimeStock);
          saveStockEntriesToLocalStorage(realtimeStock);
        }
      },
      (err) => {
        console.error('Firestore stock listener error:', err);
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeStock();
    };
  }, []);

  // Save Stock Entry Handler
  const handleSaveStockEntry = async (entry: StockEntry) => {
    setStockEntries((prev) => {
      const existingIdx = prev.findIndex((e) => e.id === entry.id);
      let updated: StockEntry[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = entry;
      } else {
        updated = [entry, ...prev];
      }
      saveStockEntriesToLocalStorage(updated);
      return updated;
    });

    try {
      await saveStockEntryToFirestore(entry);
    } catch (err) {
      console.error('Error saving stock entry to Firestore:', err);
    }
  };

  // Delete Stock Entry Handler
  const handleDeleteStockEntry = async (entryId: string) => {
    setStockEntries((prev) => {
      const updated = prev.filter((e) => e.id !== entryId);
      saveStockEntriesToLocalStorage(updated);
      return updated;
    });

    try {
      await deleteStockEntryFromFirestore(entryId);
    } catch (err) {
      console.error('Error deleting stock entry from Firestore:', err);
    }
  };

  // Reset to default dataset in Firestore
  const handleResetData = async () => {
    if (window.confirm('คุณต้องการคืนค่าข้อมูลเริ่มต้นใช่หรือไม่? (ข้อมูลในฐานข้อมูล Firestore จะถูกรีเซ็ตเป็นชุดเริ่มต้น 173 รายการ)')) {
      const reset = resetOrdersToDefault();
      setOrders(reset);
      await syncAllOrdersToFirestore(reset);
      showToast('คืนค่าข้อมูลเริ่มต้น 173 ออเดอร์ลงในระบบเรียบร้อยแล้ว');
    }
  };

  // Export JSON backup file
  const handleExportData = () => {
    try {
      const dataStr = JSON.stringify(orders, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sumalee_orders_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('ดาวน์โหลดไฟล์สำรองข้อมูล (JSON) เรียบร้อยแล้ว');
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  // Import JSON backup file
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const item of parsed) {
            await saveOrderToFirestore(item);
          }
          saveOrders(parsed);
          setOrders(parsed);
          showToast(`นำเข้าข้อมูลออเดอร์เข้าสู่ Cloud เรียบร้อยแล้ว (${parsed.length} รายการ)`);
        } else {
          alert('รูปแบบไฟล์ JSON ไม่ถูกต้องหรือไม่มีข้อมูลรายการสั่งซื้อ');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // Save order (Create or Update to Firestore)
  const handleSaveOrder = async (savedPO: PurchaseOrder) => {
    // Save to Firestore in real-time
    await saveOrderToFirestore(savedPO);

    showToast(`บันทึกออเดอร์ ${savedPO.orderNumber} เข้าสู่ Firestore Real-time เรียบร้อยแล้ว`);
  };

  // Delete order from Firestore
  const handleDeleteOrder = async (id: string) => {
    await deleteOrderFromFirestore(id);
    showToast('ลบรายการใบสั่งซื้อจาก Firestore เรียบร้อยแล้ว');
  };

  // Trigger Create New Order Modal
  const handleOpenNewOrder = () => {
    setEditingOrder(null);
    setIsFormOpen(true);
  };

  // Trigger Edit Order Modal
  const handleOpenEditOrder = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  // View Receipt Modal
  const handleViewReceipt = (order: PurchaseOrder) => {
    setReceiptOrder(order);
    setIsReceiptOpen(true);
  };

  // View Shipping Label Modal
  const handleViewShippingLabel = (order: PurchaseOrder) => {
    setShippingLabelOrder(order);
  };

  // Unique customer count
  const uniqueCustomerCount = useMemo(() => {
    return new Set(orders.map((o) => normalizeCustomerKey(o.customer.phone, o.customer.name))).size;
  }, [orders]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased flex flex-col">
      
      {/* HEADER BAR */}
      <Header
        onOpenNewOrder={handleOpenNewOrder}
        onOpenStockManagement={() => setIsStockModalOpen(true)}
        onOpenDailyWeightSummary={() => setIsDailyWeightModalOpen(true)}
        onOpenCustomerSummary={() => setActiveTab('customers')}
        totalOrdersCount={orders.length}
      />

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-emerald-400 font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* NAVIGATION TABS & MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span>สรุปยอดขาย (Dashboard)</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'customers'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>สรุปข้อมูลลูกค้า & ซื้อซ้ำ ({uniqueCustomerCount} ราย)</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ListFilter className="w-4 h-4 text-purple-400" />
            <span>รายการใบสั่งซื้อทั้งหมด ({orders.length})</span>
          </button>
        </div>

        {/* ACTIVE TAB CONTENT */}
        {activeTab === 'dashboard' ? (
          <SalesSummary
            orders={orders}
            onOpenNewOrder={handleOpenNewOrder}
            onViewOrdersTab={() => setActiveTab('orders')}
            onViewCustomersTab={() => setActiveTab('customers')}
            onEditOrder={handleOpenEditOrder}
            onDeleteOrder={handleDeleteOrder}
            onViewReceipt={handleViewReceipt}
            onViewShippingLabel={handleViewShippingLabel}
            onOpenStockModal={() => setIsStockModalOpen(true)}
          />
        ) : activeTab === 'customers' ? (
          <CustomerSummary
            orders={orders}
            onViewReceipt={handleViewReceipt}
            onViewShippingLabel={handleViewShippingLabel}
          />
        ) : (
          <OrderList
            orders={orders}
            onOpenNewOrder={handleOpenNewOrder}
            onEditOrder={handleOpenEditOrder}
            onDeleteOrder={handleDeleteOrder}
            onViewReceipt={handleViewReceipt}
            onViewShippingLabel={handleViewShippingLabel}
          />
        )}


      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400 space-y-1">
          <p>ระบบบันทึกคำสั่งซื้อ บริษัท สุมาลี ฟู๊ด สระบุรี จำกัด (SUMALEE FOOD SARABURI CO., LTD.)</p>
          <p className="text-[11px] text-slate-400">
            38/1 หมู่ที่ 6 ตำบลกุดนกเปล้า อำเภอเมืองสระบุรี จ.สระบุรี 18000 • โทร 081-123-8415
          </p>
        </div>
      </footer>

      {/* ORDER FORM MODAL */}
      <OrderFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingOrder(null);
        }}
        onSaveOrder={handleSaveOrder}
        editingOrder={editingOrder}
        existingOrders={orders}
        stockEntries={stockEntries}
      />

      {/* PRINTABLE RECEIPT MODAL */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        order={receiptOrder}
        onClose={() => {
          setIsReceiptOpen(false);
          setReceiptOrder(null);
        }}
      />

      {/* PRINTABLE SHIPPING LABEL / ENVELOPE MODAL */}
      <ShippingLabelModal
        order={shippingLabelOrder}
        onClose={() => setShippingLabelOrder(null)}
      />

      {/* DAILY WEIGHT SUMMARY MODAL */}
      <DailyWeightSummaryModal
        isOpen={isDailyWeightModalOpen}
        onClose={() => setIsDailyWeightModalOpen(false)}
        orders={orders}
      />

      {/* FACTORY STOCK & DEDUCTION MANAGEMENT MODAL */}
      <StockManagementModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        stockEntries={stockEntries}
        orders={orders}
        onSaveStockEntry={handleSaveStockEntry}
        onDeleteStockEntry={handleDeleteStockEntry}
      />

    </div>
  );
}
