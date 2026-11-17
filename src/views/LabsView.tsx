import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Laboratory } from '../types';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  Monitor,
  MapPin,
  Maximize2,
  CheckCircle2,
  Clock,
  Wrench,
  Search,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { OFFLINE_LAB_PHOTO } from '../utils/offlineAssets';

interface LabsViewProps {
  onSelectLab?: (labId: string) => void;
}

export const LabsView: React.FC<LabsViewProps> = ({ onSelectLab }) => {
  const { laboratories, computers, saveLaboratory, deleteLaboratory, hasPermission } = useApp();

  const [search, setSearch] = useState('');
  const [selectedLab, setSelectedLab] = useState<Laboratory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const canEdit = hasPermission('manageInventory') || hasPermission('crudAllData');

  const [formData, setFormData] = useState<Partial<Laboratory>>({
    name: '',
    code: '',
    capacity: 36,
    location: '',
    areaSize: '12 x 8 Meter',
    totalComputers: 36,
    personInCharge: '',
    picNip: '',
    photoUrl: '',
    description: '',
    status: 'Tersedia',
  });

  const filteredLabs = laboratories.filter((lab) => {
    const q = search.toLowerCase();
    return (
      lab.name.toLowerCase().includes(q) ||
      lab.code.toLowerCase().includes(q) ||
      lab.personInCharge.toLowerCase().includes(q)
    );
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      code: `LAB-0${laboratories.length + 1}`,
      capacity: 36,
      location: 'Gedung Kejuruan Lantai 2',
      areaSize: '12 x 8 Meter (96 m²)',
      totalComputers: 36,
      personInCharge: '',
      picNip: '',
      photoUrl: OFFLINE_LAB_PHOTO,
      description: '',
      status: 'Tersedia',
    });
    setSelectedLab(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (lab: Laboratory) => {
    setSelectedLab(lab);
    setFormData(lab);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    await saveLaboratory({
      id: selectedLab ? selectedLab.id : 'lab-' + Date.now(),
      name: formData.name,
      code: formData.code,
      capacity: Number(formData.capacity) || 0,
      location: formData.location || '',
      areaSize: formData.areaSize || '',
      totalComputers: Number(formData.totalComputers) || 0,
      personInCharge: formData.personInCharge || '',
      picNip: formData.picNip || '',
      photoUrl: formData.photoUrl || '',
      description: formData.description || '',
      status: formData.status as any || 'Tersedia',
    });

    setIsModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await deleteLaboratory(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-cyan-600" />
            Data Ruangan Laboratorium Komputer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan seluruh laboratorium komputer, kapasitas siswa, penanggung jawab, dan fasilitas ruang.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Ruangan Lab
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama lab, kode, atau guru..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Menampilkan <span className="font-bold text-slate-900">{filteredLabs.length}</span> ruangan laboratorium
        </div>
      </div>

      {/* Lab Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredLabs.map((lab) => {
          const pcCount = computers.filter((c) => c.labId === lab.id).length;
          const goodPcs = computers.filter((c) => c.labId === lab.id && c.condition === 'Baik').length;

          return (
            <div
              key={lab.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col group"
            >
              {/* Photo & Status Badge */}
              <div className="relative h-48 w-full bg-slate-800 overflow-hidden">
                <img
                  src={lab.photoUrl || OFFLINE_LAB_PHOTO}
                  alt={lab.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (img.src !== OFFLINE_LAB_PHOTO) {
                      img.src = OFFLINE_LAB_PHOTO;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                <div className="absolute top-4 left-4">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/80 text-cyan-300 border border-slate-700 backdrop-blur-md">
                    {lab.code}
                  </span>
                </div>

                <div className="absolute top-4 right-4">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border ${
                      lab.status === 'Tersedia'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                        : lab.status === 'Sedang Digunakan'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                        : 'bg-rose-950/80 text-rose-300 border-rose-700'
                    }`}
                  >
                    {lab.status}
                  </span>
                </div>

                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <h3 className="text-base font-extrabold truncate">{lab.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{lab.location}</span>
                  </div>
                </div>
              </div>

              {/* Lab Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {lab.description || 'Laboratorium komputer aktif untuk kegiatan praktikum siswa SMKN 15 Pandeglang.'}
                </p>

                {/* Specs Pill Counters */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-semibold">Kapasitas</span>
                    <span className="text-sm font-extrabold text-slate-800">{lab.capacity} Kursi</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-semibold">Komputer</span>
                    <span className="text-sm font-extrabold text-slate-800">{pcCount} Unit</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-semibold">Luas Ruang</span>
                    <span className="text-sm font-extrabold text-slate-800 truncate">{lab.areaSize || '-'}</span>
                  </div>
                </div>

                {/* Person in charge */}
                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Penanggung Jawab:</span>
                    <span className="font-bold text-slate-800">{lab.personInCharge || '-'}</span>
                    {lab.picNip && <span className="text-[10px] text-slate-500 block">NIP. {lab.picNip}</span>}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Kondisi PC:</span>
                    <span className="font-bold text-emerald-600">{goodPcs} Baik</span>
                    <span className="text-[10px] text-slate-400 ml-1">/ {pcCount} Unit</span>
                  </div>
                </div>

                {/* Actions Footer */}
                {canEdit && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenEdit(lab)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(lab.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Laboratory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                {selectedLab ? 'Edit Data Laboratorium' : 'Tambah Laboratorium Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Laboratorium *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Laboratorium Komputer"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kode Ruangan *</label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="LAB-KOM"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kapasitas (Kursi)</label>
                  <input
                    type="number"
                    value={formData.capacity || 36}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total Komputer</label>
                  <input
                    type="number"
                    value={formData.totalComputers || 36}
                    onChange={(e) => setFormData({ ...formData, totalComputers: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Ruangan</label>
                  <select
                    value={formData.status || 'Tersedia'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500 font-semibold"
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Sedang Digunakan">Sedang Digunakan</option>
                    <option value="Pemeliharaan">Pemeliharaan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lokasi Gedung</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Gedung Kejuruan Lantai 2"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Luas Ruangan</label>
                  <input
                    type="text"
                    value={formData.areaSize || ''}
                    onChange={(e) => setFormData({ ...formData, areaSize: e.target.value })}
                    placeholder="12 x 8 Meter (96 m²)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Penanggung Jawab (Nama)</label>
                  <input
                    type="text"
                    value={formData.personInCharge || ''}
                    onChange={(e) => setFormData({ ...formData, personInCharge: e.target.value })}
                    placeholder="Ade Nur, S.Kom."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">NIP Penanggung Jawab</label>
                  <input
                    type="text"
                    value={formData.picNip || ''}
                    onChange={(e) => setFormData({ ...formData, picNip: e.target.value })}
                    placeholder="19870520 201101 1 008"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">URL Foto Ruangan</label>
                <input
                  type="url"
                  value={formData.photoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="https://... (opsional)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan / Fasilitas</label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Laboratorium dilengkapi AC, proyektor, access point, dan PC workstation spesifikasi tinggi..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all"
                >
                  {selectedLab ? 'Simpan Perubahan' : 'Tambah Laboratorium'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Hapus Ruangan Laboratorium?"
        message="Menghapus ruangan ini tidak akan otomatis menghapus komputer di dalamnya, namun disarankan untuk memindahkan komputer ke ruangan lain terlebih dahulu."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
