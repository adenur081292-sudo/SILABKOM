import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DamageReport, DamageSeverity, DamageStatus } from '../types';
import {
  AlertOctagon,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Trash2,
  Edit2,
  X,
  ShieldAlert,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const DamageReportsView: React.FC = () => {
  const {
    damageReports,
    saveDamageReport,
    deleteDamageReport,
    hasPermission,
    laboratories,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<DamageReport | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const canManage = hasPermission('manageDamage') || hasPermission('crudAllData');

  const [formData, setFormData] = useState<Partial<DamageReport>>({
    reportDate: new Date().toISOString().split('T')[0],
    reporterName: '',
    reporterRole: 'Siswa',
    deviceName: '',
    inventoryNumber: '',
    labName: laboratories[0]?.name || 'Laboratorium Komputer',
    damageDescription: '',
    severity: 'Sedang',
    status: 'Menunggu Verifikasi',
    handlerOfficer: 'Rizki Pratama, A.Md.',
    followUpNotes: '',
  });

  const filteredReports = damageReports.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      d.deviceName.toLowerCase().includes(q) ||
      d.reporterName.toLowerCase().includes(q) ||
      d.damageDescription.toLowerCase().includes(q) ||
      d.labName.toLowerCase().includes(q);

    const matchStatus = selectedStatus === 'all' || d.status === selectedStatus;
    const matchSeverity = selectedSeverity === 'all' || d.severity === selectedSeverity;
    return matchSearch && matchStatus && matchSeverity;
  });

  const handleOpenAdd = () => {
    setFormData({
      reportDate: new Date().toISOString().split('T')[0],
      reporterName: '',
      reporterRole: 'Siswa',
      deviceName: '',
      inventoryNumber: '',
      labName: laboratories[0]?.name || 'Laboratorium Komputer',
      damageDescription: '',
      severity: 'Sedang',
      status: 'Menunggu Verifikasi',
      handlerOfficer: 'Rizki Pratama, A.Md.',
      followUpNotes: '',
    });
    setEditingReport(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (d: DamageReport) => {
    setEditingReport(d);
    setFormData(d);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reporterName || !formData.deviceName || !formData.damageDescription) return;

    await saveDamageReport({
      id: editingReport ? editingReport.id : 'dmg-' + Date.now(),
      reportDate: formData.reportDate || new Date().toISOString().split('T')[0],
      reporterName: formData.reporterName,
      reporterRole: formData.reporterRole || 'Pengguna Lab',
      deviceName: formData.deviceName,
      inventoryNumber: formData.inventoryNumber || '',
      labName: formData.labName || 'Laboratorium Komputer',
      damageDescription: formData.damageDescription,
      severity: (formData.severity as DamageSeverity) || 'Sedang',
      status: (formData.status as DamageStatus) || 'Menunggu Verifikasi',
      handlerOfficer: formData.handlerOfficer || '',
      followUpNotes: formData.followUpNotes || '',
    });

    setIsFormOpen(false);
  };

  const handleQuickStatusChange = async (report: DamageReport, newStatus: DamageStatus) => {
    await saveDamageReport({ ...report, status: newStatus });
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await deleteDamageReport(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <AlertOctagon className="w-6 h-6 text-rose-600" />
            Laporan Kerusakan Perangkat
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kanal pengaduan kerusakan komputer dari siswa, guru, maupun teknisi agar segera ditindaklanjuti dan diperbaiki.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Laporkan Kerusakan Baru
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari perangkat, pelapor, ruangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
          >
            <option value="all">Semua Tingkat Keparahan</option>
            <option value="Ringan">Ringan</option>
            <option value="Sedang">Sedang</option>
            <option value="Berat">Berat</option>
            <option value="Kritis">Kritis</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
          >
            <option value="all">Semua Status ({damageReports.length})</option>
            <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
            <option value="Dalam Penanganan">Dalam Penanganan</option>
            <option value="Selesai">Selesai</option>
            <option value="Ditolak">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredReports.length > 0 ? (
          filteredReports.map((item) => {
            let severityBadge = 'bg-slate-100 text-slate-700';
            if (item.severity === 'Ringan') severityBadge = 'bg-cyan-50 text-cyan-800 border-cyan-200';
            if (item.severity === 'Sedang') severityBadge = 'bg-amber-50 text-amber-800 border-amber-200';
            if (item.severity === 'Berat' || item.severity === 'Kritis') severityBadge = 'bg-rose-50 text-rose-800 border-rose-200';

            let statusBadge = 'bg-slate-100 text-slate-700';
            if (item.status === 'Menunggu Verifikasi') statusBadge = 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse';
            if (item.status === 'Dalam Penanganan') statusBadge = 'bg-blue-50 text-blue-800 border-blue-200';
            if (item.status === 'Selesai') statusBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Tgl: {item.reportDate}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${severityBadge}`}>
                      {item.severity}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{item.deviceName}</h3>
                    <div className="text-[10px] text-cyan-800 font-semibold">{item.labName}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Deskripsi Kerusakan:</span>
                    <p className="text-slate-700 leading-relaxed">{item.damageDescription}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Pelapor:</span>
                      <span className="font-bold text-slate-800">{item.reporterName}</span>
                      <span className="text-[10px] text-slate-500 block">({item.reporterRole})</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Status:</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {item.followUpNotes && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-[11px] text-emerald-900">
                      <span className="font-bold block text-[10px] text-emerald-700">Tindak Lanjut Teknisi:</span>
                      {item.followUpNotes}
                    </div>
                  )}
                </div>

                {/* Staff Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-4 text-xs">
                  {canManage ? (
                    <div className="flex items-center gap-1">
                      {item.status === 'Menunggu Verifikasi' && (
                        <button
                          onClick={() => handleQuickStatusChange(item, 'Dalam Penanganan')}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px]"
                        >
                          Tangani
                        </button>
                      )}
                      {item.status === 'Dalam Penanganan' && (
                        <button
                          onClick={() => handleQuickStatusChange(item, 'Selesai')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                        >
                          Selesai
                        </button>
                      )}
                    </div>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="text-slate-600 hover:text-slate-900 font-medium"
                    >
                      Detail / Edit
                    </button>
                    {canManage && (
                      <button
                        onClick={() => setDeleteTargetId(item.id)}
                        className="text-rose-600 hover:text-rose-700 font-medium"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Belum ada laporan kerusakan yang tercatat.
          </div>
        )}
      </div>

      {/* Add / Edit Damage Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-500" />
                {editingReport ? 'Tindak Lanjut Laporan Kerusakan' : 'Buat Laporan Kerusakan Baru'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Pelapor *</label>
                  <input
                    type="text"
                    required
                    value={formData.reporterName || ''}
                    onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                    placeholder="Nama Lengkap Siswa / Guru"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status / Jabatan</label>
                  <input
                    type="text"
                    value={formData.reporterRole || ''}
                    onChange={(e) => setFormData({ ...formData, reporterRole: e.target.value })}
                    placeholder="Siswa XII RPL 1 / Guru"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Perangkat Rusak *</label>
                  <input
                    type="text"
                    required
                    value={formData.deviceName || ''}
                    onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                    placeholder="Contoh: PC-05 / Monitor Acer / Keyboard"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ruang Laboratorium</label>
                  <select
                    value={formData.labName || ''}
                    onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  >
                    {laboratories.map((l) => (
                      <option key={l.id} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tingkat Kerusakan</label>
                  <select
                    value={formData.severity || 'Sedang'}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    <option value="Ringan">Ringan (Masih bisa digunakan)</option>
                    <option value="Sedang">Sedang (Sebagian fitur mati)</option>
                    <option value="Berat">Berat (Mati total / tidak fungsi)</option>
                    <option value="Kritis">Kritis (Konslet / Bahaya)</option>
                  </select>
                </div>

                {canManage && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Status Penanganan</label>
                    <select
                      value={formData.status || 'Menunggu Verifikasi'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                    >
                      <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                      <option value="Diterima">Diterima</option>
                      <option value="Dalam Penanganan">Dalam Penanganan</option>
                      <option value="Selesai">Selesai</option>
                      <option value="Ditolak">Ditolak</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi Kerusakan *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.damageDescription || ''}
                  onChange={(e) => setFormData({ ...formData, damageDescription: e.target.value })}
                  placeholder="Jelaskan secara detail gejala kerusakan yang terjadi..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              {canManage && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Catatan Tindak Lanjut Teknisi</label>
                  <input
                    type="text"
                    value={formData.followUpNotes || ''}
                    onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                    placeholder="Contoh: Sudah diganti kabel power baru..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              )}

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
                  Kirim Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Hapus Laporan Kerusakan?"
        message="Laporan kerusakan ini akan dihapus dari daftar penanganan."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
