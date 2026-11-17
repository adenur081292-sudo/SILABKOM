import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ComputerDamageFollowUpStatus,
  ComputerDamageReport,
  DamageSeverity,
} from '../../types';
import {
  CONDITION_COMPONENT_ITEMS,
  getLastCompletedUsageForComputer,
} from '../../utils/computerUsageUtils';
import {
  AlertOctagon,
  Plus,
  Camera,
  Wrench,
  Clock,
  CheckCircle2,
  X,
  ShieldCheck,
} from 'lucide-react';

export const UsageDamageView: React.FC = () => {
  const {
    computers,
    computerUsages,
    computerDamageReports,
    currentRole,
    hasPermission,
    reportComputerDamage,
    updateComputerDamageFollowUp,
  } = useApp();

  const canReport = hasPermission('recordComputerUsage') || hasPermission('crudAllData');
  const canFollowUp =
    currentRole === 'admin' ||
    currentRole === 'teknisi' ||
    currentRole === 'kepala_lab' ||
    hasPermission('manageComputerDamageFollowUp');

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Create Damage Report Form
  const [selectedPcId, setSelectedPcId] = useState<string>(() => computers[0]?.id || '');
  const [damageType, setDamageType] = useState<string>('Hardware / Perangkat');
  const [severity, setSeverity] = useState<DamageSeverity>('Sedang');
  const [targetStatus, setTargetStatus] = useState<'PERLU PEMERIKSAAN' | 'RUSAK'>('PERLU PEMERIKSAAN');
  const [affectedComponents, setAffectedComponents] = useState<string[]>(['Monitor']);
  const [damageDescription, setDamageDescription] = useState<string>('');
  const [initialAction, setInitialAction] = useState<string>(
    'Unit ditandai untuk pemeriksaan oleh Teknisi/Laboran.'
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Follow-up Modal
  const [followUpTarget, setFollowUpTarget] = useState<ComputerDamageReport | null>(null);
  const [nextFollowUpStatus, setNextFollowUpStatus] =
    useState<ComputerDamageFollowUpStatus>('Dalam Perbaikan');
  const [followUpNotes, setFollowUpNotes] = useState<string>('');

  const selectedPcLastUsage = useMemo(() => {
    if (!selectedPcId) return undefined;
    return getLastCompletedUsageForComputer(selectedPcId, computerUsages);
  }, [selectedPcId, computerUsages]);

  const filteredReports = useMemo(() => {
    if (filterStatus === 'ALL') return computerDamageReports;
    return computerDamageReports.filter((r) => r.followUpStatus === filterStatus);
  }, [computerDamageReports, filterStatus]);

  const toggleComponent = (label: string) => {
    setAffectedComponents((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPcId || !damageDescription.trim()) return;
    setIsSubmitting(true);
    const res = await reportComputerDamage(
      {
        computerId: selectedPcId,
        usageId: selectedPcLastUsage?.usageId,
        damageType,
        damageDescription,
        affectedComponents,
        severity,
        initialAction,
        targetStatus,
      },
      photoFile
    );
    setIsSubmitting(false);
    if (res.success) {
      setIsFormOpen(false);
      setDamageDescription('');
      setPhotoFile(null);
    }
  };

  const handleSubmitFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpTarget) return;
    const res = await updateComputerDamageFollowUp({
      reportId: followUpTarget.id,
      followUpStatus: nextFollowUpStatus,
      notes: followUpNotes,
    });
    if (res.success) {
      setFollowUpTarget(null);
      setFollowUpNotes('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <AlertOctagon className="w-6 h-6 text-rose-600" />
            Laporan Kerusakan Akibat / Pasca Penggunaan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan masalah perangkat keras/lunak beserta hubungan kronologis dengan riwayat penggunaan terakhir (bukan penuduhan otomatis) dan timeline tindak lanjut teknisi.
          </p>
        </div>

        {canReport && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Laporkan Kerusakan Komputer
          </button>
        )}
      </div>

      {/* Policy Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-cyan-300">Prinsip Objektivitas & Pencegahan Penuduhan Otomatis</div>
          <p className="text-slate-300 mt-0.5 leading-relaxed">
            Sistem melampirkan data <strong>Pemakai Terakhir</strong> pada setiap laporan semata-mata sebagai referensi kronologis untuk membantu verifikasi teknis. Pemakai terakhir tidak secara otomatis dianggap sebagai penyebab kerusakan sebelum pemeriksaan teknisi selesai.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          'ALL',
          'Menunggu Pemeriksaan',
          'Perlu Pemeriksaan',
          'Dalam Perbaikan',
          'Selesai Diperbaiki',
          'Rusak Permanen',
        ].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
              filterStatus === st
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st === 'ALL' ? `Semua (${computerDamageReports.length})` : st}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <div className="font-bold text-slate-900 text-sm">Belum Ada Laporan Kerusakan Pada Filter Ini</div>
          <p className="text-xs text-slate-500">
            Jika ditemukan kendala saat pemeriksaan sebelum/sesudah penggunaan, klik tombol Laporkan Kerusakan Komputer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredReports.map((rep) => (
            <div
              key={rep.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-cyan-300 font-mono text-[10px] font-bold">
                    {rep.reportNumber}
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900 mt-1">
                    {rep.computerCode} — {rep.computerName}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400">{rep.inventoryCode}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border ${
                    rep.followUpStatus === 'Selesai Diperbaiki'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : rep.followUpStatus === 'Dalam Perbaikan'
                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {rep.followUpStatus}
                </span>
              </div>

              <div className="text-xs space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-800">
                    {rep.damageType}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 font-bold text-amber-800">
                    Keparahan: {rep.severity}
                  </span>
                  {rep.affectedComponents.map((comp) => (
                    <span
                      key={comp}
                      className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 text-[10px] font-semibold"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
                <p className="text-slate-700 leading-relaxed">{rep.damageDescription}</p>
              </div>

              {/* Hubungan Kronologis */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                <div className="font-bold text-slate-800">Referensi Kronologis Riwayat Terakhir:</div>
                <div>
                  Pemakai Terakhir: <strong>{rep.lastUserName || 'Belum Ada Riwayat'}</strong>
                  {rep.lastUserType ? ` (${rep.lastUserType}${rep.lastUserClassOrOrg ? ` - ${rep.lastUserClassOrOrg}` : ''})` : ''}
                </div>
                {rep.lastUsageDate && (
                  <div className="text-slate-600 tabular-nums">
                    Waktu Pakai: {rep.lastUsageDate} {rep.lastUsageTime} • Ref: {rep.lastUsageId || '-'}
                  </div>
                )}
                <div className="text-slate-500">
                  Pemeriksa: {rep.inspectorName} • Ditemukan: {rep.discoveredAt}
                </div>
              </div>

              {rep.photoUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-44">
                  <img src={rep.photoUrl} alt={rep.reportNumber} className="w-full h-44 object-cover" />
                </div>
              )}

              {/* Timeline Tindak Lanjut */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">Timeline Tindak Lanjut</div>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {(rep.followUpHistory || []).map((entry, idx) => (
                    <div key={idx} className="text-[11px] flex items-start gap-2 text-slate-600">
                      <Clock className="w-3 h-3 text-cyan-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-800">{entry.status}</strong> ({entry.officer}): {entry.notes}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {canFollowUp && (
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => {
                      setFollowUpTarget(rep);
                      setNextFollowUpStatus(
                        rep.followUpStatus === 'Menunggu Pemeriksaan'
                          ? 'Dalam Perbaikan'
                          : 'Selesai Diperbaiki'
                      );
                      setFollowUpNotes('');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                    Update Tindak Lanjut
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL FORM LAPORKAN KERUSAKAN */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden border border-slate-200 shadow-2xl my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                Buat Laporan Kerusakan Komputer
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Unit Komputer *</label>
                <select
                  value={selectedPcId}
                  onChange={(e) => setSelectedPcId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                >
                  {computers.map((pc) => (
                    <option key={pc.id} value={pc.id}>
                      {pc.computerCode} — {pc.deviceName} ({pc.inventoryNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-200 text-[11px] text-cyan-950">
                <span className="font-bold block">Referensi Pemakai Terakhir (Kronologis):</span>
                {selectedPcLastUsage ? (
                  <span>
                    {selectedPcLastUsage.userName} ({selectedPcLastUsage.userType}) — {selectedPcLastUsage.usageDate}{' '}
                    {selectedPcLastUsage.startTime}-{selectedPcLastUsage.endTime} WIB
                  </span>
                ) : (
                  <span className="italic">Belum ada riwayat transaksi selesai untuk komputer ini.</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jenis Kerusakan *</label>
                  <input
                    type="text"
                    required
                    value={damageType}
                    onChange={(e) => setDamageType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Keparahan *</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as DamageSeverity)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    <option value="Ringan">Ringan</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Berat">Berat</option>
                    <option value="Kritis">Kritis</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status PC Tujuan *</label>
                  <select
                    value={targetStatus}
                    onChange={(e) =>
                      setTargetStatus(e.target.value as 'PERLU PEMERIKSAAN' | 'RUSAK')
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    <option value="PERLU PEMERIKSAAN">PERLU PEMERIKSAAN</option>
                    <option value="RUSAK">RUSAK</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Komponen Terdampak</label>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITION_COMPONENT_ITEMS.map((item) => {
                    const active = affectedComponents.includes(item.label);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => toggleComponent(item.label)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                          active
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi Kerusakan / Gejala *</label>
                <textarea
                  rows={3}
                  required
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  placeholder="Jelaskan kondisi kerusakan atau gejala yang ditemukan..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tindakan Awal *</label>
                <input
                  type="text"
                  required
                  value={initialAction}
                  onChange={(e) => setInitialAction(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Upload Foto Bukti (Opsional)</label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <Camera className="w-4 h-4 text-cyan-600" />
                  <span>{photoFile ? photoFile.name : 'Pilih foto kerusakan...'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 font-semibold text-slate-600 cursor-pointer">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  {isSubmitting ? 'Mengirim...' : 'Kirim Laporan Kerusakan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UPDATE TINDAK LANJUT */}
      {followUpTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl text-xs">
            <h3 className="font-extrabold text-sm text-slate-900">
              Update Tindak Lanjut — {followUpTarget.reportNumber}
            </h3>
            <form onSubmit={handleSubmitFollowUp} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Status Penanganan *</label>
                <select
                  value={nextFollowUpStatus}
                  onChange={(e) => setNextFollowUpStatus(e.target.value as ComputerDamageFollowUpStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                >
                  <option value="Perlu Pemeriksaan">Perlu Pemeriksaan</option>
                  <option value="Dalam Perbaikan">Dalam Perbaikan</option>
                  <option value="Selesai Diperbaiki">Selesai Diperbaiki (PC Kembali Tersedia)</option>
                  <option value="Rusak Permanen">Rusak Permanen</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Catatan Teknisi / Tindakan Perbaikan *</label>
                <textarea
                  rows={3}
                  required
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Jelaskan hasil pengecekan atau tindakan perbaikan..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setFollowUpTarget(null)} className="px-4 py-2 text-slate-600 font-semibold cursor-pointer">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer">
                  Simpan Tindak Lanjut
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
