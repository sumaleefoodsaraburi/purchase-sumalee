import React from 'react';
import { Plus, Calendar, MapPin, Phone, Database, Scale, BarChart2, Users, ListFilter } from 'lucide-react';
import { formatThaiDateTime } from '../utils/formatters';

interface HeaderProps {
  onOpenNewOrder: () => void;
  onOpenOrdersList?: () => void;
  onOpenStockManagement?: () => void;
  onOpenDailyWeightSummary?: () => void;
  onOpenCustomerSummary?: () => void;
  totalOrdersCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewOrder,
  onOpenOrdersList,
  onOpenStockManagement,
  onOpenDailyWeightSummary,
  onOpenCustomerSummary,
  totalOrdersCount,
}) => {
  const nowIso = new Date().toISOString();

  return (
    <header className="bg-slate-900 text-white shadow-lg border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Company Title */}
          <div className="flex items-center gap-3.5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  ระบบบันทึกคำสั่งซื้อ
                </h1>
                <span className="bg-blue-500/20 text-blue-300 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border border-blue-400/30">
                  บริษัท สุมาลี ฟู๊ด สระบุรี จำกัด
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[11px] px-2.5 py-0.5 rounded-full font-mono font-semibold border border-emerald-400/30 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>{totalOrdersCount} ออเดอร์ • Cloud Sync</span>
                </span>
              </div>
              <p className="text-xs font-bold text-slate-300 mt-0.5">
                SUMALEE FOOD SARABURI CO., LTD.
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                  38/1 หมู่ที่ 6 ต.กุดนกเปล้า อ.เมืองสระบุรี จ.สระบุรี 18000
                </span>
                <span className="flex items-center gap-1 font-mono text-emerald-400">
                  <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                  โทร 081-123-8415
                </span>
              </div>
            </div>
          </div>

          {/* 3 Main Action Buttons & Date Info */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="hidden xl:flex items-center gap-2 bg-slate-800/90 px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 font-mono">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>วันนี้: {formatThaiDateTime(nowIso)}</span>
            </div>

            {/* 1. ปุ่มคีย์ใบสั่งซื้อ */}
            <button
              onClick={onOpenNewOrder}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>คีย์ใบสั่งซื้อ</span>
            </button>

            {/* ปุ่มดูและแก้ไขออร์เดอร์ */}
            {onOpenOrdersList && (
              <button
                onClick={onOpenOrdersList}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-amber-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl border border-amber-400/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <ListFilter className="w-4 h-4 text-amber-400" />
                <span>ดู / แก้ไขออเดอร์</span>
              </button>
            )}

            {/* 2. ปุ่มคีย์สต็อกโรงงาน */}
            {onOpenStockManagement && (
              <button
                onClick={onOpenStockManagement}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-black text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/40 ring-2 ring-emerald-400/60 transition-all hover:scale-[1.03] active:scale-[0.98]"
              >
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
                </span>
                <Scale className="w-4 h-4 text-emerald-200 stroke-[2.5]" />
                <span className="tracking-tight">คีย์สต็อกโรงงาน</span>
              </button>
            )}

            {/* 3. ปุ่มสรุปยอดขายรายวัน */}
            {onOpenDailyWeightSummary && (
              <button
                onClick={onOpenDailyWeightSummary}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <BarChart2 className="w-4 h-4 text-amber-400" />
                <span>สรุปยอดขายรายวัน</span>
              </button>
            )}

            {/* 4. ปุ่มสรุปข้อมูลลูกค้า */}
            {onOpenCustomerSummary && (
              <button
                onClick={onOpenCustomerSummary}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-blue-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Users className="w-4 h-4 text-blue-400" />
                <span>สรุปข้อมูลลูกค้า</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};


