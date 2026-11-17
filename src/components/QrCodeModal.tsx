import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Computer } from '../types';
import { useApp } from '../context/AppContext';
import { X, Printer, Monitor, Cpu, HardDrive } from 'lucide-react';

interface QrCodeModalProps {
  computer: Computer | null;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ computer, onClose }) => {
  const { settings } = useApp();
  if (!computer) return null;

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
              QR
            </div>
            <div>
              <h3 className="font-bold text-base">Label Inventaris & QR Code</h3>
              <p className="text-xs text-slate-400">{computer.computerCode} - {computer.deviceName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Card */}
        <div id="printable-card" className="p-6">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50">
            {/* School Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <img
                src={settings.logoUrl}
                alt="Logo SMKN 15"
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="flex-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {settings.reportHeaderGov}
                </div>
                <div className="text-sm font-extrabold text-slate-900 leading-tight">
                  {settings.schoolName}
                </div>
                <div className="text-[11px] font-semibold text-cyan-700">
                  KARTU INVENTARIS KOMPUTER LAB
                </div>
              </div>
            </div>

            {/* QR Code and Specs */}
            <div className="flex flex-col sm:flex-row items-center gap-5 mt-4">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                <QRCodeSVG
                  value={JSON.stringify({
                    kode: computer.computerCode,
                    inventaris: computer.inventoryNumber,
                    ruangan: computer.labName,
                    spesifikasi: `${computer.processor} / ${computer.ram} / ${computer.storage}`,
                    kondisi: computer.condition,
                  })}
                  size={120}
                  level="H"
                  includeMargin={false}
                />
                <span className="text-[10px] font-mono font-bold text-slate-600 mt-2">
                  {computer.computerCode}
                </span>
              </div>

              <div className="flex-1 text-xs space-y-1.5 w-full">
                <div>
                  <span className="text-slate-500 block text-[10px]">No. Inventaris:</span>
                  <span className="font-semibold text-slate-800 font-mono text-[11px]">{computer.inventoryNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Nama Perangkat:</span>
                  <span className="font-medium text-slate-800">{computer.deviceName} ({computer.brand})</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Cpu className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                  <span className="truncate">{computer.processor}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                  <span>{computer.ram} | {computer.storage}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Monitor className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                  <span>{computer.labName}</span>
                </div>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Tahun: {computer.procurementYear}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    computer.condition === 'Baik'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {computer.condition}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={handlePrintCard}
            className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-2 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            Cetak Label Kartu
          </button>
        </div>
      </div>
    </div>
  );
};
