import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Computer, ComputerCondition } from '../types';
import * as XLSX from 'xlsx';
import {
  Monitor,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  QrCode,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
  Cpu,
  HardDrive,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  X,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { QrCodeModal } from '../components/QrCodeModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { OFFLINE_PC_PHOTO } from '../utils/offlineAssets';

export const ComputersView: React.FC = () => {
  const {
    computers,
    laboratories,
    saveComputer,
    deleteComputer,
    batchImportComputers,
    syncDkvComputersFromOfficialSheet,
    hasPermission,
    addToast,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedLabId, setSelectedLabId] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');

  const [detailComputer, setDetailComputer] = useState<Computer | null>(null);
  const [qrComputer, setQrComputer] = useState<Computer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingComputer, setEditingComputer] = useState<Computer | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = hasPermission('manageInventory') || hasPermission('crudAllData');

  const [formData, setFormData] = useState<Partial<Computer>>({
    inventoryNumber: '',
    computerCode: '',
    deviceName: '',
    brand: 'Lenovo',
    model: 'ThinkCentre Neo 50t',
    serialNumber: '',
    processor: 'Intel Core i5-13400',
    ram: '16 GB DDR4',
    storage: '512 GB SSD NVMe',
    os: 'Windows 11 Pro 64-bit',
    monitor: 'Lenovo 23.8 inch FHD IPS',
    keyboard: 'Lenovo USB Standard',
    mouse: 'Lenovo USB Optical',
    procurementYear: 2024,
    fundingSource: 'BOS Reguler',
    procurementPrice: 12500000,
    labId: laboratories[0]?.id || 'lab-komputer',
    labName: laboratories[0]?.name || 'Laboratorium Komputer',
    lastCheckDate: new Date().toISOString().split('T')[0],
    condition: 'Baik',
    photoUrl: OFFLINE_PC_PHOTO,
    notes: 'Kondisi prima siap praktikum.',
  });

  // Filter computers
  const filteredComputers = computers.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.computerCode.toLowerCase().includes(q) ||
      c.deviceName.toLowerCase().includes(q) ||
      c.inventoryNumber.toLowerCase().includes(q) ||
      c.processor.toLowerCase().includes(q) ||
      c.brand.toLowerCase().includes(q) ||
      (c.serialNumber && c.serialNumber.toLowerCase().includes(q));

    const matchLab = selectedLabId === 'all' || c.labId === selectedLabId;
    const matchCond = selectedCondition === 'all' || c.condition === selectedCondition;

    return matchSearch && matchLab && matchCond;
  });

  // Handlers
  const handleOpenAdd = () => {
    const nextCode = `PC-${String(computers.length + 1).padStart(2, '0')}`;
    const targetLab = laboratories[0];
    setFormData({
      inventoryNumber: `SMKN15/${targetLab?.code || 'LAB'}/${nextCode}/${new Date().getFullYear()}`,
      computerCode: nextCode,
      deviceName: `PC Workstation ${nextCode}`,
      brand: 'Lenovo',
      model: 'ThinkCentre Neo 50t',
      serialNumber: `SN-${Date.now().toString().slice(-6)}`,
      processor: 'Intel Core i5-13400 (10 Cores)',
      ram: '16 GB DDR4',
      storage: '512 GB NVMe SSD',
      os: 'Windows 11 Pro 64-bit',
      monitor: 'Lenovo 23.8 inch FHD IPS',
      keyboard: 'Lenovo USB Standard',
      mouse: 'Lenovo USB Optical',
      procurementYear: 2024,
      fundingSource: 'BOS Reguler',
      procurementPrice: 12500000,
      labId: targetLab?.id || 'lab-komputer',
      labName: targetLab?.name || 'Laboratorium Komputer',
      lastCheckDate: new Date().toISOString().split('T')[0],
      condition: 'Baik',
      photoUrl: OFFLINE_PC_PHOTO,
      notes: 'Siap digunakan praktikum coding dan multimedia.',
    });
    setEditingComputer(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (pc: Computer) => {
    setEditingComputer(pc);
    setFormData(pc);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.computerCode || !formData.deviceName) return;

    const chosenLab = laboratories.find((l) => l.id === formData.labId);
    const labName = chosenLab ? chosenLab.name : formData.labName || 'Laboratorium Komputer';

    const saveResult = await saveComputer({
      id: editingComputer ? editingComputer.id : 'pc-' + Date.now(),
      inventoryNumber: formData.inventoryNumber || `SMKN15/PC/${Date.now()}`,
      computerCode: formData.computerCode,
      deviceName: formData.deviceName,
      brand: formData.brand || 'Lenovo',
      model: formData.model || 'ThinkCentre',
      serialNumber: formData.serialNumber || '',
      processor: formData.processor || 'Intel Core i5',
      ram: formData.ram || '16 GB',
      storage: formData.storage || '512 GB SSD',
      os: formData.os || 'Windows 11 Pro',
      monitor: formData.monitor || 'Monitor 24 inch',
      keyboard: formData.keyboard || 'USB Keyboard',
      mouse: formData.mouse || 'USB Mouse',
      procurementYear: Number(formData.procurementYear) || 2024,
      fundingSource: formData.fundingSource || 'BOS Reguler',
      procurementPrice: Number(formData.procurementPrice) || 0,
      labId: formData.labId || 'lab-komputer',
      labName,
      lastCheckDate: formData.lastCheckDate || new Date().toISOString().split('T')[0],
      condition: (formData.condition as ComputerCondition) || 'Baik',
      photoUrl: formData.photoUrl || OFFLINE_PC_PHOTO,
      notes: formData.notes || '',
      qrCodeData: `SMKN15-${formData.computerCode}`,
    });

    if (saveResult && !saveResult.success) {
      return;
    }

    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await deleteComputer(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    const exportData = filteredComputers.map((c, i) => ({
      No: i + 1,
      'Kode PC': c.computerCode,
      'No. Inventaris': c.inventoryNumber,
      'Nama Perangkat': c.deviceName,
      Merek: c.brand,
      'Tipe / Model': c.model,
      'No. Seri': c.serialNumber || '-',
      Prosesor: c.processor,
      RAM: c.ram,
      'Kapasitas Storage': c.storage,
      'Sistem Operasi': c.os,
      Monitor: c.monitor,
      Keyboard: c.keyboard,
      Mouse: c.mouse,
      'Tahun Pengadaan': c.procurementYear,
      'Sumber Dana': c.fundingSource,
      'Harga Pengadaan (Rp)': c.procurementPrice || 0,
      'Ruang Laboratorium': c.labName,
      'Tgl Cek Terakhir': c.lastCheckDate,
      Kondisi: c.condition,
      Keterangan: c.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaris Komputer');
    XLSX.writeFile(wb, `Inventaris_Komputer_SMKN15_${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast('success', 'Export Selesai', 'Data inventaris komputer berhasil diunduh dalam file Excel (.xlsx).');
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Kode PC': 'RPL-PC-10',
        'No. Inventaris': 'SMKN15/LAB-RPL/PC-10/2024',
        'Nama Perangkat': 'PC Workstation Developer 10',
        Merek: 'Lenovo',
        'Tipe / Model': 'ThinkCentre Neo 50t',
        'No. Seri': 'LNV-SN-991201',
        Prosesor: 'Intel Core i5-13400',
        RAM: '16 GB DDR4',
        'Kapasitas Storage': '512 GB NVMe SSD',
        'Sistem Operasi': 'Windows 11 Pro',
        Monitor: 'Lenovo 23.8 inch FHD',
        Keyboard: 'Lenovo USB',
        Mouse: 'Lenovo USB',
        'Tahun Pengadaan': 2024,
        'Sumber Dana': 'BOS Reguler',
        'Harga Pengadaan': 12500000,
        'Ruang Laboratorium': 'Laboratorium Komputer',
        'Tgl Cek Terakhir': '2026-11-10',
        Kondisi: 'Baik',
        Keterangan: 'Siap pakai praktikum',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Import PC');
    XLSX.writeFile(wb, 'Template_Import_Komputer_SMKN15.xlsx');
    addToast('info', 'Template Diunduh', 'Silakan isi template Excel dan unggah kembali melalui tombol Import.');
  };

  // Handle Excel File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const pcsToImport: Partial<Computer>[] = data.map((row) => ({
          computerCode: String(row['Kode PC'] || row['computerCode'] || row['kode'] || `PC-${Date.now()}`),
          inventoryNumber: String(row['No. Inventaris'] || row['inventoryNumber'] || `SMKN15/PC/${Date.now()}`),
          deviceName: String(row['Nama Perangkat'] || row['deviceName'] || 'PC Workstation'),
          brand: String(row['Merek'] || row['brand'] || 'Lenovo'),
          model: String(row['Tipe / Model'] || row['model'] || '-'),
          serialNumber: String(row['No. Seri'] || row['serialNumber'] || ''),
          processor: String(row['Prosesor'] || row['processor'] || 'Intel Core i5'),
          ram: String(row['RAM'] || row['ram'] || '16 GB'),
          storage: String(row['Kapasitas Storage'] || row['storage'] || '512 GB SSD'),
          os: String(row['Sistem Operasi'] || row['os'] || 'Windows 11 Pro'),
          monitor: String(row['Monitor'] || row['monitor'] || '24 inch'),
          keyboard: String(row['Keyboard'] || row['keyboard'] || 'USB Standard'),
          mouse: String(row['Mouse'] || row['mouse'] || 'USB Standard'),
          procurementYear: Number(row['Tahun Pengadaan'] || row['procurementYear']) || 2024,
          fundingSource: String(row['Sumber Dana'] || row['fundingSource'] || 'BOS Reguler'),
          procurementPrice: Number(row['Harga Pengadaan'] || row['procurementPrice']) || 0,
          labId: laboratories[0]?.id || 'lab-komputer',
          labName: String(row['Ruang Laboratorium'] || laboratories[0]?.name || 'Laboratorium Komputer'),
          lastCheckDate: String(row['Tgl Cek Terakhir'] || new Date().toISOString().split('T')[0]),
          condition: (row['Kondisi'] as ComputerCondition) || 'Baik',
          notes: String(row['Keterangan'] || ''),
        }));

        await batchImportComputers(pcsToImport);
      } catch (err: any) {
        console.error(err);
        addToast('error', 'Gagal Impor Excel', 'Format file tidak sesuai atau rusak.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Monitor className="w-6 h-6 text-cyan-600" />
            Inventaris Komputer & Workstation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Data spesifikasi teknis lengkap, nomor seri, ruangan, riwayat kondisi, dan pencetakan kartu inventaris ber-QR Code.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Template */}
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Unduh Format Excel untuk Isi Massal"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Template Excel</span>
          </button>

          {/* Import Excel */}
          {canEdit && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Unggah File Excel Berisi Data Komputer"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-600" />
                <span>Import Excel</span>
              </button>
            </>
          )}

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download seluruh data inventaris ke format .xlsx"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          {/* Official 20 PC Sync Button */}
          {canEdit && (
            <button
              onClick={() => syncDkvComputersFromOfficialSheet()}
              className="px-3 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Sinkronkan 20 unit komputer Laboratorium Komputer sesuai dokumen inventaris resmi SMKN 15 Pandeglang"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-600" />
              <span>Muat 20 PC Lab Komputer Resmi</span>
            </button>
          )}

          {/* Add PC Button */}
          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Tambah Unit PC</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode PC, spesifikasi, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Lab filter */}
          <select
            value={selectedLabId}
            onChange={(e) => setSelectedLabId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Semua Ruang Lab ({computers.length})</option>
            {laboratories.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name} ({computers.filter((c) => c.labId === lab.id).length})
              </option>
            ))}
          </select>

          {/* Condition filter */}
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Semua Kondisi</option>
            <option value="Baik">Baik ({computers.filter((c) => c.condition === 'Baik').length})</option>
            <option value="Rusak Ringan">Rusak Ringan ({computers.filter((c) => c.condition === 'Rusak Ringan').length})</option>
            <option value="Rusak Berat">Rusak Berat ({computers.filter((c) => c.condition === 'Rusak Berat').length})</option>
            <option value="Dalam Perbaikan">Dalam Perbaikan ({computers.filter((c) => c.condition === 'Dalam Perbaikan').length})</option>
            <option value="Tidak Digunakan">Tidak Digunakan</option>
          </select>
        </div>
      </div>

      {/* Official Inventory Status Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-800 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs border border-blue-800/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
            <Monitor className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Inventaris Resmi Ruang Laboratorium Komputer</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-semibold font-mono">
                20 Unit (PC-1 s/d PC-20)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Spesifikasi resmi: Core i5 Processor, RAM hingga 16GB, SSD hingga 704GB, Monitor LG/ASUS/XYZ, Sumber Dana Bosnas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-medium">
            19 Unit Baik
          </span>
          <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg font-medium">
            1 Unit Rusak Ringan (PC-9)
          </span>
        </div>
      </div>

      {/* Table of Computers */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-800">
                <th className="py-3 px-4 font-bold text-center w-12">No</th>
                <th className="py-3 px-4 font-bold">Kode & Inventaris</th>
                <th className="py-3 px-4 font-bold">Nama Perangkat & Merek</th>
                <th className="py-3 px-4 font-bold">Spesifikasi (CPU/RAM/SSD)</th>
                <th className="py-3 px-4 font-bold">Ruangan</th>
                <th className="py-3 px-4 font-bold text-center">Kondisi</th>
                <th className="py-3 px-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComputers.length > 0 ? (
                filteredComputers.map((pc, idx) => (
                  <tr key={pc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 font-mono text-[11px] text-cyan-800">
                        {pc.computerCode}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{pc.inventoryNumber}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{pc.deviceName}</div>
                      <div className="text-[10px] text-slate-500">
                        {pc.brand} {pc.model} {pc.serialNumber ? `• SN: ${pc.serialNumber}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <Cpu className="w-3 h-3 text-cyan-600 shrink-0" />
                        <span className="truncate max-w-xs">{pc.processor}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono">{pc.ram}</span>
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono">{pc.storage}</span>
                        <span className="text-slate-400">{pc.os}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">{pc.labName}</span>
                      <span className="text-[10px] text-slate-400 block">Tahun {pc.procurementYear}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          pc.condition === 'Baik'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : pc.condition === 'Rusak Ringan'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : pc.condition === 'Rusak Berat'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {pc.condition}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setQrComputer(pc)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 transition-colors"
                          title="Lihat / Cetak QR Code & Kartu Inventaris"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDetailComputer(pc)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                          title="Lihat Rincian Spesifikasi Lengkap"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(pc)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              title="Edit Data Komputer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetId(pc.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus Unit Komputer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    Tidak ditemukan data komputer dengan kriteria pencarian tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Menampilkan <span className="font-bold text-slate-800">{filteredComputers.length}</span> dari total{' '}
            <span className="font-bold text-slate-800">{computers.length}</span> unit komputer
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {computers.filter((c) => c.condition === 'Baik').length} Baik
            </span>
            <span className="flex items-center gap-1 text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {computers.filter((c) => c.condition.includes('Rusak')).length} Rusak
            </span>
            <span className="flex items-center gap-1 text-blue-700">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {computers.filter((c) => c.condition === 'Dalam Perbaikan').length} Servis
            </span>
          </div>
        </div>
      </div>

      {/* Add / Edit Computer Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Monitor className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base">
                  {editingComputer ? `Edit Unit: ${editingComputer.computerCode}` : 'Tambah Unit Komputer Baru'}
                </h3>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto scrollbar-thin">
              {/* Group 1: Identitas PC */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">1. Identitas & Ruangan</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Kode Komputer *</label>
                    <input
                      type="text"
                      required
                      value={formData.computerCode || ''}
                      onChange={(e) => setFormData({ ...formData, computerCode: e.target.value })}
                      placeholder="Contoh: PC-01"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono font-bold focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">No. Inventaris *</label>
                    <input
                      type="text"
                      required
                      value={formData.inventoryNumber || ''}
                      onChange={(e) => setFormData({ ...formData, inventoryNumber: e.target.value })}
                      placeholder="1.3.2.10.01.02.001/PC-01"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Lokasi Ruangan *</label>
                    <select
                      value={formData.labId || ''}
                      onChange={(e) => {
                        const lab = laboratories.find((l) => l.id === e.target.value);
                        setFormData({
                          ...formData,
                          labId: e.target.value,
                          labName: lab ? lab.name : '',
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-semibold focus:border-cyan-500"
                    >
                      {laboratories.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nama Perangkat *</label>
                    <input
                      type="text"
                      required
                      value={formData.deviceName || ''}
                      onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                      placeholder="PC Workstation Developer 01"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Kondisi Perangkat *</label>
                    <select
                      value={formData.condition || 'Baik'}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold focus:border-cyan-500"
                    >
                      <option value="Baik">Baik (Normal Operasional)</option>
                      <option value="Rusak Ringan">Rusak Ringan (Bisa Digunakan Sebagian)</option>
                      <option value="Rusak Berat">Rusak Berat (Tidak Berfungsi)</option>
                      <option value="Dalam Perbaikan">Dalam Perbaikan (Servis Teknisi)</option>
                      <option value="Tidak Digunakan">Tidak Digunakan (Arsip/Cadangan)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Group 2: Spesifikasi Hardware */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">2. Spesifikasi Teknis Komputer</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Merek</label>
                    <input
                      type="text"
                      value={formData.brand || ''}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="Lenovo / HP / Dell / Asus"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tipe / Model</label>
                    <input
                      type="text"
                      value={formData.model || ''}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="ThinkCentre Neo 50t"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nomor Seri (Serial No)</label>
                    <input
                      type="text"
                      value={formData.serialNumber || ''}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      placeholder="SN-XXXX-XXXX"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Prosesor (CPU)</label>
                    <input
                      type="text"
                      value={formData.processor || ''}
                      onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
                      placeholder="Intel Core i5-13400 / AMD Ryzen 5"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Kapasitas RAM</label>
                    <input
                      type="text"
                      value={formData.ram || ''}
                      onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                      placeholder="16 GB DDR4 3200MHz"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Penyimpanan (Storage)</label>
                    <input
                      type="text"
                      value={formData.storage || ''}
                      onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                      placeholder="512 GB NVMe SSD"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Sistem Operasi</label>
                    <input
                      type="text"
                      value={formData.os || ''}
                      onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                      placeholder="Windows 11 Pro 64-bit"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Monitor</label>
                    <input
                      type="text"
                      value={formData.monitor || ''}
                      onChange={(e) => setFormData({ ...formData, monitor: e.target.value })}
                      placeholder="Lenovo 23.8 inch FHD"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Keyboard</label>
                    <input
                      type="text"
                      value={formData.keyboard || ''}
                      onChange={(e) => setFormData({ ...formData, keyboard: e.target.value })}
                      placeholder="Lenovo USB Standard"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Mouse</label>
                    <input
                      type="text"
                      value={formData.mouse || ''}
                      onChange={(e) => setFormData({ ...formData, mouse: e.target.value })}
                      placeholder="Lenovo USB Optical"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Pengadaan & Riwayat */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">3. Data Pengadaan & Pemeriksaan</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tahun Pengadaan</label>
                    <input
                      type="number"
                      value={formData.procurementYear || 2024}
                      onChange={(e) => setFormData({ ...formData, procurementYear: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Sumber Dana</label>
                    <input
                      type="text"
                      value={formData.fundingSource || ''}
                      onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value })}
                      placeholder="BOS Reguler / DAK Fisik"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Harga Pengadaan (Rp)</label>
                    <input
                      type="number"
                      value={formData.procurementPrice || 0}
                      onChange={(e) => setFormData({ ...formData, procurementPrice: Number(e.target.value) })}
                      placeholder="12500000"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tgl Cek Terakhir</label>
                    <input
                      type="date"
                      value={formData.lastCheckDate || ''}
                      onChange={(e) => setFormData({ ...formData, lastCheckDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Catatan Tambahan / Keterangan</label>
                  <input
                    type="text"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Contoh: Terinstal aplikasi VS Code, Flutter, Blender 3D..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all"
                >
                  {editingComputer ? 'Simpan Perubahan' : 'Tambahkan Komputer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Specification Modal */}
      {detailComputer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base">Rincian Lengkap Unit Komputer</h3>
              </div>
              <button onClick={() => setDetailComputer(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="text-lg font-extrabold text-slate-900 font-mono text-cyan-700">
                    {detailComputer.computerCode}
                  </div>
                  <div className="text-slate-500 font-mono">{detailComputer.inventoryNumber}</div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    detailComputer.condition === 'Baik'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {detailComputer.condition}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Nama Perangkat</span>
                  <span className="font-bold">{detailComputer.deviceName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Merek & Tipe</span>
                  <span className="font-bold">{detailComputer.brand} {detailComputer.model}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Nomor Seri</span>
                  <span className="font-mono">{detailComputer.serialNumber || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Ruang Laboratorium</span>
                  <span className="font-bold text-cyan-800">{detailComputer.labName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Prosesor (CPU)</span>
                  <span>{detailComputer.processor}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Memori RAM</span>
                  <span>{detailComputer.ram}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Penyimpanan (Storage)</span>
                  <span>{detailComputer.storage}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Sistem Operasi</span>
                  <span>{detailComputer.os}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Monitor</span>
                  <span>{detailComputer.monitor}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Keyboard & Mouse</span>
                  <span>{detailComputer.keyboard} / {detailComputer.mouse}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Pengadaan & Sumber</span>
                  <span>Tahun {detailComputer.procurementYear} ({detailComputer.fundingSource})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Harga Pengadaan</span>
                  <span className="font-mono">Rp {(detailComputer.procurementPrice || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {detailComputer.notes && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                  <span className="font-bold block text-[10px] text-slate-400">Catatan Khusus:</span>
                  {detailComputer.notes}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setQrComputer(detailComputer);
                    setDetailComputer(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold flex items-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  Lihat QR Code
                </button>
                <button
                  onClick={() => setDetailComputer(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code and Card Modal */}
      <QrCodeModal computer={qrComputer} onClose={() => setQrComputer(null)} />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Hapus Unit Komputer?"
        message="Data unit komputer beserta riwayat inventarisnya akan dihapus permanen dari sistem SILABKOM."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
