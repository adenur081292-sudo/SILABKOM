import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Equipment, EquipmentCategory, ComputerCondition } from '../types';
import * as XLSX from 'xlsx';
import {
  Cpu,
  Plus,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Boxes,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const EquipmentView: React.FC = () => {
  const {
    equipment,
    laboratories,
    saveEquipment,
    deleteEquipment,
    hasPermission,
    addToast,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLabId, setSelectedLabId] = useState<string>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const canEdit = hasPermission('manageInventory') || hasPermission('crudAllData');

  const categories: EquipmentCategory[] = [
    'Printer',
    'Scanner',
    'Proyektor',
    'Switch',
    'Router',
    'Access Point',
    'UPS',
    'Server',
    'Kabel Jaringan',
    'Meja Komputer',
    'Kursi',
    'Lainnya',
  ];

  const [formData, setFormData] = useState<Partial<Equipment>>({
    inventoryNumber: '',
    name: '',
    category: 'Proyektor',
    brand: 'Epson',
    model: 'EB-E01',
    serialNumber: '',
    quantity: 1,
    unit: 'Unit',
    procurementYear: 2024,
    fundingSource: 'BOS Reguler',
    procurementPrice: 5000000,
    labId: laboratories[0]?.id || 'lab-komputer',
    labName: laboratories[0]?.name || 'Laboratorium Komputer',
    condition: 'Baik',
    notes: '',
  });

  const filteredEquipment = equipment.filter((eq) => {
    const q = search.toLowerCase();
    const matchSearch =
      eq.name.toLowerCase().includes(q) ||
      eq.inventoryNumber.toLowerCase().includes(q) ||
      eq.brand.toLowerCase().includes(q) ||
      eq.category.toLowerCase().includes(q);

    const matchCat = selectedCategory === 'all' || eq.category === selectedCategory;
    const matchLab = selectedLabId === 'all' || eq.labId === selectedLabId;

    return matchSearch && matchCat && matchLab;
  });

  const handleOpenAdd = () => {
    const nextInv = `SMKN15/PER-${String(equipment.length + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
    const targetLab = laboratories[0];
    setFormData({
      inventoryNumber: nextInv,
      name: '',
      category: 'Proyektor',
      brand: '',
      model: '',
      serialNumber: '',
      quantity: 1,
      unit: 'Unit',
      procurementYear: 2024,
      fundingSource: 'BOS Reguler',
      procurementPrice: 0,
      labId: targetLab?.id || 'lab-komputer',
      labName: targetLab?.name || 'Laboratorium Komputer',
      condition: 'Baik',
      notes: '',
    });
    setEditingEquipment(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setFormData(eq);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) return;

    const chosenLab = laboratories.find((l) => l.id === formData.labId);
    const labName = chosenLab ? chosenLab.name : formData.labName || 'Laboratorium Komputer';

    await saveEquipment({
      id: editingEquipment ? editingEquipment.id : 'eq-' + Date.now(),
      inventoryNumber: formData.inventoryNumber || `SMKN15/PER/${Date.now()}`,
      name: formData.name,
      category: (formData.category as EquipmentCategory) || 'Lainnya',
      brand: formData.brand || '-',
      model: formData.model || '-',
      serialNumber: formData.serialNumber || '',
      quantity: Number(formData.quantity) || 1,
      unit: formData.unit || 'Unit',
      procurementYear: Number(formData.procurementYear) || 2024,
      fundingSource: formData.fundingSource || 'BOS Reguler',
      procurementPrice: Number(formData.procurementPrice) || 0,
      labId: formData.labId || 'lab-komputer',
      labName,
      condition: (formData.condition as ComputerCondition) || 'Baik',
      notes: formData.notes || '',
    });

    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await deleteEquipment(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredEquipment.map((eq, i) => ({
      No: i + 1,
      'No. Inventaris': eq.inventoryNumber,
      'Nama Perangkat': eq.name,
      Kategori: eq.category,
      Merek: eq.brand,
      'Tipe / Model': eq.model,
      'No. Seri': eq.serialNumber || '-',
      Jumlah: eq.quantity,
      Satuan: eq.unit,
      'Ruang Laboratorium': eq.labName,
      'Tahun Pengadaan': eq.procurementYear,
      'Sumber Dana': eq.fundingSource,
      'Harga Pengadaan (Rp)': eq.procurementPrice || 0,
      Kondisi: eq.condition,
      Keterangan: eq.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Perangkat Pendukung');
    XLSX.writeFile(wb, `Perangkat_Pendukung_SMKN15_${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast('success', 'Export Berhasil', 'Data perangkat pendukung laboratorium berhasil diunduh.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-cyan-600" />
            Inventaris Perangkat Pendukung
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan printer, scanner, proyektor, switch hub, router MikroTik, access point, UPS, meja, kursi, dan peralatan pendukung lab lainnya.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Excel
          </button>
          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              Tambah Perangkat
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama alat, merek, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Semua Kategori ({equipment.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c} ({equipment.filter((e) => e.category === c).length})
              </option>
            ))}
          </select>

          {/* Lab filter */}
          <select
            value={selectedLabId}
            onChange={(e) => setSelectedLabId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Semua Ruang Lab</option>
            {laboratories.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-800">
                <th className="py-3 px-4 font-bold text-center w-12">No</th>
                <th className="py-3 px-4 font-bold">No. Inventaris</th>
                <th className="py-3 px-4 font-bold">Nama Perangkat</th>
                <th className="py-3 px-4 font-bold">Kategori</th>
                <th className="py-3 px-4 font-bold">Merek / Model</th>
                <th className="py-3 px-4 font-bold text-center">Jumlah</th>
                <th className="py-3 px-4 font-bold">Ruangan</th>
                <th className="py-3 px-4 font-bold text-center">Kondisi</th>
                {canEdit && <th className="py-3 px-4 font-bold text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEquipment.length > 0 ? (
                filteredEquipment.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono text-[11px] font-bold text-slate-800">
                      {item.inventoryNumber}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.brand} {item.model}
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold text-slate-800">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{item.labName}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.condition === 'Baik'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {item.condition}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 text-xs">
                    Belum ada data perangkat pendukung pada kategori ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Equipment Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                {editingEquipment ? 'Edit Perangkat Pendukung' : 'Tambah Perangkat Pendukung'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. Inventaris *</label>
                  <input
                    type="text"
                    required
                    value={formData.inventoryNumber || ''}
                    onChange={(e) => setFormData({ ...formData, inventoryNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Perangkat *</label>
                  <select
                    value={formData.category || 'Proyektor'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Perangkat *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Switch Cisco Catalyst 2960 24-Port"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Merek</label>
                  <input
                    type="text"
                    value={formData.brand || ''}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Cisco / Epson"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Model / Tipe</label>
                  <input
                    type="text"
                    value={formData.model || ''}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={formData.serialNumber || ''}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jumlah</label>
                  <input
                    type="number"
                    value={formData.quantity || 1}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Satuan</label>
                  <input
                    type="text"
                    value={formData.unit || 'Unit'}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Unit / Pcs / Roll"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kondisi</label>
                  <select
                    value={formData.condition || 'Baik'}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    <option value="Baik">Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                    <option value="Dalam Perbaikan">Dalam Perbaikan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ruangan Lab</label>
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    {laboratories.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tahun Pengadaan</label>
                  <input
                    type="number"
                    value={formData.procurementYear || 2024}
                    onChange={(e) => setFormData({ ...formData, procurementYear: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Terpasang di rak server lantai 2..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
                >
                  {editingEquipment ? 'Simpan Perubahan' : 'Tambahkan Perangkat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Hapus Perangkat Pendukung?"
        message="Data perangkat ini akan dihapus dari daftar inventaris laboratorium."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
