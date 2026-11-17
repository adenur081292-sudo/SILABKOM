import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ComputerUsageSettings, ExternalUser } from '../../types';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  Settings,
  Save,
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Clock,
} from 'lucide-react';

export const UsageSettingsView: React.FC = () => {
  const {
    laboratories,
    computerUsageSettings,
    externalUsers,
    saveComputerUsageSettings,
    saveExternalUser,
    deleteExternalUser,
  } = useApp();

  const [formSettings, setFormSettings] = useState<ComputerUsageSettings>(computerUsageSettings);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState<boolean>(false);
  const [editingGuest, setEditingGuest] = useState<ExternalUser | null>(null);
  const [guestForm, setGuestForm] = useState<{
    fullName: string;
    institution: string;
    identityOrContact: string;
    notes: string;
  }>({
    fullName: '',
    institution: '',
    identityOrContact: '',
    notes: '',
  });
  const [deleteGuestId, setDeleteGuestId] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveComputerUsageSettings(formSettings);
  };

  const openAddGuest = () => {
    setEditingGuest(null);
    setGuestForm({ fullName: '', institution: '', identityOrContact: '', notes: '' });
    setIsGuestModalOpen(true);
  };

  const openEditGuest = (eu: ExternalUser) => {
    setEditingGuest(eu);
    setGuestForm({
      fullName: eu.fullName,
      institution: eu.institution,
      identityOrContact: eu.identityOrContact || '',
      notes: eu.notes || '',
    });
    setIsGuestModalOpen(true);
  };

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveExternalUser({
      ...(editingGuest || {}),
      ...guestForm,
    });
    if (res.success) {
      setIsGuestModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-cyan-600" />
          Pengaturan Penggunaan Komputer & Direktori Tamu
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Konfigurasi zona waktu operasional Asia/Jakarta (WIB), penggunaan berkelompok, pemeriksaan kondisi, dan manajemen data tamu eksternal.
        </p>
      </div>

      {/* Form Pengaturan */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5 text-xs"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600" />
            Kebijakan Pencatatan Penggunaan Komputer
          </div>
          <span className="px-3 py-1 rounded-xl bg-slate-900 text-cyan-300 font-bold">
            Zona Waktu: Asia/Jakarta (WIB)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Ruangan Lab Default</label>
            <select
              value={formSettings.defaultRoomId}
              onChange={(e) => setFormSettings({ ...formSettings, defaultRoomId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
            >
              {laboratories.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Maksimal Siswa Per Kelompok PC</label>
            <input
              type="number"
              min={1}
              max={6}
              value={formSettings.maxGroupSize}
              onChange={(e) =>
                setFormSettings({ ...formSettings, maxGroupSize: Number(e.target.value) || 2 })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Ambang Jarang Digunakan (Sesi/Bulan)</label>
            <input
              type="number"
              min={0}
              value={formSettings.lowUsageThresholdCount}
              onChange={(e) =>
                setFormSettings({
                  ...formSettings,
                  lowUsageThresholdCount: Number(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={formSettings.allowManualTimeOverrideForAdmin}
              onChange={(e) =>
                setFormSettings({
                  ...formSettings,
                  allowManualTimeOverrideForAdmin: e.target.checked,
                })
              }
              className="rounded accent-cyan-600"
            />
            <span className="font-semibold text-slate-800">
              Izinkan Administrator melakukan koreksi tanggal/jam manual (WIB)
            </span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={formSettings.allowGroupUsage}
              onChange={(e) =>
                setFormSettings({ ...formSettings, allowGroupUsage: e.target.checked })
              }
              className="rounded accent-cyan-600"
            />
            <span className="font-semibold text-slate-800">
              Aktifkan pencatatan 1 komputer dipakai berkelompok (multi-siswa)
            </span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={formSettings.requireBeforeCheck}
              onChange={(e) =>
                setFormSettings({ ...formSettings, requireBeforeCheck: e.target.checked })
              }
              className="rounded accent-cyan-600"
            />
            <span className="font-semibold text-slate-800">
              Wajibkan pemeriksaan kondisi 9 komponen sebelum penggunaan
            </span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={formSettings.notifyAdminOnDamage}
              onChange={(e) =>
                setFormSettings({ ...formSettings, notifyAdminOnDamage: e.target.checked })
              }
              className="rounded accent-cyan-600"
            />
            <span className="font-semibold text-slate-800">
              Kirim notifikasi otomatis ke Admin & Teknisi bila ditemukan kerusakan
            </span>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4 text-cyan-400" />
            Simpan Pengaturan Penggunaan
          </button>
        </div>
      </form>

      {/* Direktori Tamu / Pengguna Eksternal */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-600" />
              Direktori Tamu / Pengguna Eksternal ({externalUsers.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Data tamu pengawas ujian, asesor UKK, teknisi luar, atau mitra instansi yang pernah menggunakan komputer lab.
            </p>
          </div>
          <button
            onClick={openAddGuest}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            Tambah Data Tamu
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-2.5 px-3 font-bold">Nama Lengkap</th>
                <th className="py-2.5 px-3 font-bold">Asal Instansi / Lembaga</th>
                <th className="py-2.5 px-3 font-bold">Identitas / Kontak</th>
                <th className="py-2.5 px-3 font-bold text-center">Jumlah Kunjungan</th>
                <th className="py-2.5 px-3 font-bold">Terakhir Pakai</th>
                <th className="py-2.5 px-3 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {externalUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Belum ada data tamu eksternal tersimpan. Data tamu juga otomatis ditambahkan saat melakukan Check-In kategori Tamu.
                  </td>
                </tr>
              ) : (
                externalUsers.map((eu) => (
                  <tr key={eu.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{eu.fullName}</td>
                    <td className="py-2.5 px-3 text-slate-700">{eu.institution}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{eu.identityOrContact || '-'}</td>
                    <td className="py-2.5 px-3 text-center font-bold tabular-nums">{eu.totalVisits}</td>
                    <td className="py-2.5 px-3 tabular-nums">{eu.lastVisitDate}</td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditGuest(eu)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteGuestId(eu.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tamu Eksternal */}
      {isGuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">
                {editingGuest ? 'Edit Data Tamu Eksternal' : 'Tambah Tamu Eksternal Baru'}
              </h3>
              <button onClick={() => setIsGuestModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGuest} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={guestForm.fullName}
                  onChange={(e) => setGuestForm({ ...guestForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Asal Instansi / Lembaga *</label>
                <input
                  type="text"
                  required
                  value={guestForm.institution}
                  onChange={(e) => setGuestForm({ ...guestForm, institution: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Nomor Identitas / Kontak (Opsional)</label>
                <input
                  type="text"
                  value={guestForm.identityOrContact}
                  onChange={(e) =>
                    setGuestForm({ ...guestForm, identityOrContact: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Catatan</label>
                <input
                  type="text"
                  value={guestForm.notes}
                  onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGuestModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer"
                >
                  Simpan Tamu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteGuestId}
        title="Hapus Data Tamu Eksternal?"
        message="Data tamu ini akan dihapus dari direktori tamu. Riwayat transaksi penggunaan sebelumnya tetap tersimpan."
        onConfirm={async () => {
          if (deleteGuestId) {
            await deleteExternalUser(deleteGuestId);
            setDeleteGuestId(null);
          }
        }}
        onCancel={() => setDeleteGuestId(null)}
      />
    </div>
  );
};
