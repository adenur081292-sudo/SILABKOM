import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Activity } from '../types';
import { compressImageFileToDataUrl } from '../utils/imageUtils';
import {
  Image as ImageIcon,
  Plus,
  Calendar,
  MapPin,
  User,
  Trash2,
  Edit2,
  X,
  Upload,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { OFFLINE_ACTIVITY_PHOTO } from '../utils/offlineAssets';

export const ActivitiesView: React.FC = () => {
  const { activities, saveActivity, deleteActivity, hasPermission, addToast } = useApp();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage = hasPermission('manageActivitiesDocs') || hasPermission('inputPracticumJournal') || hasPermission('crudAllData');

  const [formData, setFormData] = useState<Partial<Activity>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    personInCharge: 'Ade Nur, S.Kom., M.T.',
    location: 'Laboratorium Komputer',
    description: '',
    photoUrl: OFFLINE_ACTIVITY_PHOTO,
    category: 'Workshop & Praktikum',
  });

  const handleOpenAdd = () => {
    setFormData({
      title: '',
      date: new Date().toISOString().split('T')[0],
      personInCharge: 'Ade Nur, S.Kom., M.T.',
      location: 'Laboratorium Komputer',
      description: '',
      photoUrl: OFFLINE_ACTIVITY_PHOTO,
      category: 'Workshop & Praktikum',
    });
    setEditingActivity(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    await saveActivity({
      id: editingActivity ? editingActivity.id : 'act-' + Date.now(),
      title: formData.title,
      date: formData.date || new Date().toISOString().split('T')[0],
      personInCharge: formData.personInCharge || '',
      location: formData.location || 'Laboratorium Komputer',
      description: formData.description || '',
      photoUrl: formData.photoUrl || '',
      category: formData.category || 'Praktikum',
    });

    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await deleteActivity(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-cyan-600" />
            Dokumentasi Kegiatan Laboratorium
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Galeri foto dan arsip dokumentasi kegiatan praktikum siswa, uji kompetensi keahlian (UKK), asesmen ANBK, dan workshop industri.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            Upload Dokumentasi Baru
          </button>
        )}
      </div>

      {/* Grid of Activity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.length > 0 ? (
          activities.map((act) => (
            <div
              key={act.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col group"
            >
              <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                <img
                  src={act.photoUrl || OFFLINE_ACTIVITY_PHOTO}
                  alt={act.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (img.src !== OFFLINE_ACTIVITY_PHOTO) {
                      img.src = OFFLINE_ACTIVITY_PHOTO;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/80 text-cyan-300 border border-slate-700 backdrop-blur-md">
                    {act.category || 'Kegiatan Lab'}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{act.date}</span>
                    <span>•</span>
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{act.location}</span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug">{act.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {act.description || 'Dokumentasi resmi kegiatan laboratorium komputer SMKN 15 Pandeglang.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <User className="w-3.5 h-3.5 text-cyan-600" />
                    <span className="truncate max-w-[140px] font-semibold">{act.personInCharge}</span>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingActivity(act);
                          setFormData(act);
                          setIsFormOpen(true);
                        }}
                        className="p-1 rounded-lg text-slate-500 hover:text-slate-900"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(act.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200">
            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">Belum Ada Dokumentasi Kegiatan</div>
            <div className="text-xs text-slate-400 mt-1">Tambahkan foto dan arsip kegiatan praktikum siswa di sini.</div>
          </div>
        )}
      </div>

      {/* Add / Edit Activity Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                {editingActivity ? 'Edit Dokumentasi Kegiatan' : 'Tambah Dokumentasi Kegiatan'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama / Judul Kegiatan *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Praktikum Pembuatan Rest API & Database Siswa RPL"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Kegiatan</label>
                  <input
                    type="date"
                    required
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Kegiatan</label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Praktikum / UKK / ANBK"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Penanggung Jawab (PIC)</label>
                  <input
                    type="text"
                    value={formData.personInCharge || ''}
                    onChange={(e) => setFormData({ ...formData, personInCharge: e.target.value })}
                    placeholder="Ade Nur, S.Kom."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lokasi Ruangan</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Laboratorium Komputer"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Foto Kegiatan (Upload / URL)</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await compressImageFileToDataUrl(file);
                        setFormData((prev) => ({ ...prev, photoUrl: dataUrl }));
                        addToast('success', 'Foto Terpilih', 'Foto kegiatan siap disimpan.');
                      } catch (err: any) {
                        addToast('error', 'Gagal Upload', err.message || 'File gambar tidak valid.');
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-cyan-400" /> Pilih File Foto
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.photoUrl?.startsWith('data:') ? '' : formData.photoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="https://... atau upload file di atas"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi Kegiatan</label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ringkasan jalannya kegiatan praktikum siswa di laboratorium..."
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
                  Simpan Dokumentasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Hapus Dokumentasi Kegiatan?"
        message="Data foto dan catatan kegiatan ini akan dihapus permanen."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
