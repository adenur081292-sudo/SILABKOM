import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AppSetting } from '../types';
import {
  validateBackupPayload,
  BackupValidationSummary,
} from '../utils/conflictValidation';
import {
  Settings,
  Save,
  Database,
  Download,
  Upload,
  RefreshCw,
  Building,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

const LAST_BACKUP_STORAGE_KEY = 'silabkom_last_backup_at';

export const SettingsView: React.FC = () => {
  const {
    settings,
    saveSettings,
    seedInitialDataToFirestore,
    restoreFullBackupData,
    hasPermission,
    addToast,
    accessRoles,
    laboratories,
    computers,
    equipment,
    schedules,
    borrowings,
    maintenanceList,
    damageReports,
    documents,
    usersLab,
    activities,
    guests,
    studentAttendances,
    lessonJournals,
    schoolClasses,
    students,
    classAttendances,
    academicYears,
    schoolCalendar,
    attendanceSettings,
    computerUsages,
    computerUsageMembers,
    computerConditionChecks,
    computerDamageReports,
    computerStatusHistories,
    externalUsers,
    computerUsageSettings,
    galleryCategories,
    galleryImages,
  } = useApp();

  const [formData, setFormData] = useState<AppSetting>(settings);
  const [isSeedConfirmOpen, setIsSeedConfirmOpen] = useState(false);
  const [pendingRestorePayload, setPendingRestorePayload] = useState<any | null>(null);
  const [pendingRestoreSummary, setPendingRestoreSummary] = useState<BackupValidationSummary | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string>(() => {
    try {
      return localStorage.getItem(LAST_BACKUP_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const restoreFileRef = useRef<HTMLInputElement>(null);

  const canEdit = hasPermission('manageSettings') || hasPermission('crudAllData');

  const isBackupOverdue = useMemo(() => {
    if (!lastBackupAt) return true;
    const ms = Date.parse(lastBackupAt);
    if (Number.isNaN(ms)) return true;
    const daysSince = (Date.now() - ms) / (1000 * 60 * 60 * 24);
    return daysSince >= 7;
  }, [lastBackupAt]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings(formData);
  };

  // Export Full JSON Backup across all SILABKOM modules
  const handleExportBackup = () => {
    const exportedIso = new Date().toISOString();
    const backupData = {
      version: '3.0',
      appName: 'SILABKOM SMKN 15 Pandeglang',
      exportDate: exportedIso,
      settings: formData,
      attendanceSettings,
      computerUsageSettings,
      accessRoles,
      laboratories,
      computers,
      equipment,
      schedules,
      borrowings,
      maintenanceList,
      damageReports,
      documents,
      usersLab,
      activities,
      guests,
      studentAttendances,
      lessonJournals,
      schoolClasses,
      students,
      classAttendances,
      academicYears,
      schoolCalendar,
      computerUsages,
      computerUsageMembers,
      computerConditionChecks,
      computerDamageReports,
      computerStatusHistories,
      externalUsers,
      galleryCategories,
      galleryImages,
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SILABKOM_SMKN15_BACKUP_${exportedIso.split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setLastBackupAt(exportedIso);
    try {
      localStorage.setItem(LAST_BACKUP_STORAGE_KEY, exportedIso);
    } catch {
      // ignore
    }
    addToast(
      'success',
      'Backup Lengkap Berhasil',
      `Cadangan lengkap (${computers.length} PC, ${students.length} siswa, ${computerUsages.length} sesi penggunaan, dll.) berhasil diunduh.`
    );
  };

  // Parse & preview JSON Backup before applying non-destructive merge restore
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        const summary = validateBackupPayload(parsed, settings.updatedAt);

        if (!summary.valid) {
          throw new Error(summary.error || 'Format file backup tidak valid.');
        }

        setPendingRestorePayload(parsed);
        setPendingRestoreSummary(summary);
      } catch (err: any) {
        console.error(err);
        addToast('error', 'Gagal Membaca File Backup', err.message || 'File JSON tidak valid.');
      }
    };
    reader.readAsText(file);
    if (restoreFileRef.current) restoreFileRef.current.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestorePayload) return;
    setIsRestoring(true);
    const res = await restoreFullBackupData(pendingRestorePayload);
    setIsRestoring(false);
    if (res.success && pendingRestorePayload.settings) {
      setFormData((prev) => ({ ...prev, ...pendingRestorePayload.settings }));
    }
    setPendingRestorePayload(null);
    setPendingRestoreSummary(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-cyan-600" />
          Pengaturan Sistem & Identitas Sekolah
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Kustomisasi nama sekolah, logo, alamat resmi, nama dan NIP pejabat penandatangan kop laporan, serta manajemen backup/restore database.
        </p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Section 1: Identitas Sekolah */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
            <Building className="w-4 h-4 text-cyan-600" />
            <span>1. Profil Lembaga & Sekolah</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nama Sekolah Resmi *</label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tahun Pelajaran *</label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                placeholder="2026/2027"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Alamat Sekolah</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.schoolAddress}
                onChange={(e) => setFormData({ ...formData, schoolAddress: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nomor Telepon</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.schoolPhone}
                onChange={(e) => setFormData({ ...formData, schoolPhone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Email Sekolah</label>
              <input
                type="email"
                disabled={!canEdit}
                value={formData.schoolEmail}
                onChange={(e) => setFormData({ ...formData, schoolEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Website Resmi</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.schoolWebsite}
                onChange={(e) => setFormData({ ...formData, schoolWebsite: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">URL Logo Resmi Sekolah</label>
              <input
                type="url"
                disabled={!canEdit}
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Penandatangan Laporan (Kop & Pejabat) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
            <UserCheck className="w-4 h-4 text-cyan-600" />
            <span>2. Pejabat Penandatangan Laporan Resmi</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Kop Baris 1 (Pemerintah)</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.reportHeaderGov}
                onChange={(e) => setFormData({ ...formData, reportHeaderGov: e.target.value })}
                placeholder="PEMERINTAH PROVINSI BANTEN"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Kop Baris 2 (Dinas)</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.reportHeaderDept}
                onChange={(e) => setFormData({ ...formData, reportHeaderDept: e.target.value })}
                placeholder="DINAS PENDIDIKAN DAN KEBUDAYAAN"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              />
            </div>

            {/* Kepala Sekolah */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nama Kepala Sekolah *</label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={formData.principalName}
                onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">NIP Kepala Sekolah *</label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={formData.principalNip}
                onChange={(e) => setFormData({ ...formData, principalNip: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
              />
            </div>

            {/* Kepala Lab */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nama Kepala Laboratorium *</label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={formData.headOfLabName}
                onChange={(e) => setFormData({ ...formData, headOfLabName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">NIP Kepala Laboratorium *</label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={formData.headOfLabNip}
                onChange={(e) => setFormData({ ...formData, headOfLabNip: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nama Teknisi Utama Lab</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.leadTechnicianName}
                onChange={(e) => setFormData({ ...formData, leadTechnicianName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nama Sistem Aplikasi</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.appName}
                onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-cyan-400" />
              Simpan Perubahan Pengaturan
            </button>
          </div>
        )}
      </form>

      {/* Section 3: Backup, Restore & Initial Database Seeder */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
            <Database className="w-4 h-4 text-cyan-600" />
            <span>3. Manajemen Cadangan Data (Backup & Restore) & Inisialisasi</span>
          </div>
          {lastBackupAt ? (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Backup Terakhir: {new Date(lastBackupAt).toLocaleString('id-ID')}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Belum ada backup di perangkat ini
            </span>
          )}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Amankan seluruh data inventaris (PC-1 s.d. PC-20), absensi 9 kelas, riwayat penggunaan komputer, jadwal, buku tamu, laporan kerusakan, dan arsip dokumen melalui backup berkas JSON v3.0.
        </p>

        {isBackupOverdue && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Pengingat Backup Mingguan:</strong> Disarankan mengunduh salinan database berkala minimal seminggu sekali sebelum melakukan perubahan data massal.
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Download JSON Backup */}
          <button
            onClick={handleExportBackup}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-700" />
            Download Backup Lengkap (.json)
          </button>

          {/* Restore JSON Backup */}
          {canEdit && (
            <>
              <input
                type="file"
                ref={restoreFileRef}
                onChange={handleRestoreFile}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => restoreFileRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-blue-700" />
                Pulihkan / Restore Data
              </button>
            </>
          )}

          {/* Seeder Button */}
          {canEdit && (
            <button
              onClick={() => setIsSeedConfirmOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-cyan-700" />
              Inisialisasi Data Standar SMKN 15
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Data Seeding */}
      <ConfirmModal
        isOpen={isSeedConfirmOpen}
        title="Inisialisasi Data Awal Laboratorium?"
        message="Tindakan ini akan mengisi database Cloud Firestore dengan profil resmi Laboratorium Komputer SMKN 15 Pandeglang, 20 unit komputer standar, perangkat jaringan, jadwal, dan dokumen SOP."
        confirmLabel="Ya, Sinkronkan Data"
        onConfirm={async () => {
          setIsSeedConfirmOpen(false);
          await seedInitialDataToFirestore();
        }}
        onCancel={() => setIsSeedConfirmOpen(false)}
      />

      {/* Preview & Confirmation Modal for JSON Backup Restore */}
      {pendingRestoreSummary && pendingRestorePayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden border border-slate-200 shadow-2xl text-xs">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Pratinjau & Konfirmasi Pemulihan Data</h3>
                <div className="text-[11px] text-cyan-300 font-mono">
                  {pendingRestoreSummary.appName} • Versi {pendingRestoreSummary.version}
                </div>
              </div>
              <button
                onClick={() => {
                  setPendingRestorePayload(null);
                  setPendingRestoreSummary(null);
                }}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[76vh] overflow-y-auto">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div>
                  Tanggal Ekspor Backup:{' '}
                  <strong>
                    {pendingRestoreSummary.exportDate !== 'Tidak tercatat'
                      ? new Date(pendingRestoreSummary.exportDate).toLocaleString('id-ID')
                      : 'Tidak tercatat'}
                  </strong>
                </div>
                <div>
                  Total Koleksi Valid: <strong>{pendingRestoreSummary.totalCollections}</strong> • Total Rekaman:{' '}
                  <strong>{pendingRestoreSummary.totalRecords}</strong>
                </div>
              </div>

              {pendingRestoreSummary.isOlderThanCurrentSettings && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Perhatian:</strong> Tanggal ekspor file backup ini lebih lama daripada pembaruan data saat ini. Pastikan Anda benar-benar ingin memulihkan arsip lama.
                  </div>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                Pemulihan bersifat <strong>non-destruktif (merge)</strong>: dokumen yang sudah ada akan diperbarui berdasarkan ID tanpa melakukan hapus total database.
              </div>

              <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                {pendingRestoreSummary.collectionCounts.map((col) => (
                  <div key={col.key} className="px-3.5 py-2 flex items-center justify-between">
                    <span className="font-semibold text-slate-700">{col.label}</span>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-900 font-mono font-bold">
                      {col.count} data
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={() => {
                    setPendingRestorePayload(null);
                    setPendingRestoreSummary(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={handleConfirmRestore}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {isRestoring ? 'Memulihkan...' : 'Ya, Pulihkan Data Sekarang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
