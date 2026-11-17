import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceStatusCode } from '../../types';
import {
  buildAttendanceDocId,
  getHolidayEventForDate,
  getTodayIso,
  isEffectiveSchoolDate,
  STATUS_LABELS,
} from '../../utils/attendanceUtils';
import {
  ClipboardCheck,
  Save,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';
import { StudentDetailModal } from './StudentDetailModal';
import { Student } from '../../types';

interface RowDraft {
  status: AttendanceStatusCode;
  description: string;
}

const STATUS_OPTIONS: { code: AttendanceStatusCode; label: string; activeCls: string }[] = [
  { code: 'H', label: 'Hadir', activeCls: 'bg-emerald-600 text-white border-emerald-600' },
  { code: 'S', label: 'Sakit', activeCls: 'bg-amber-500 text-white border-amber-500' },
  { code: 'I', label: 'Izin', activeCls: 'bg-sky-600 text-white border-sky-600' },
  { code: 'A', label: 'Alpa', activeCls: 'bg-rose-600 text-white border-rose-600' },
  { code: 'D', label: 'Dispen', activeCls: 'bg-violet-600 text-white border-violet-600' },
];

export const AttendanceInputView: React.FC = () => {
  const {
    accessibleClasses,
    students,
    classAttendances,
    academicYears,
    attendanceSettings,
    schoolCalendar,
    userProfile,
    hasPermission,
    saveClassAttendanceBatch,
    deleteClassAttendance,
    addToast,
  } = useApp();

  const [academicYear, setAcademicYear] = useState<string>(
    attendanceSettings.activeAcademicYear || '2026/2027'
  );
  const [semester, setSemester] = useState<'1' | '2'>(
    attendanceSettings.activeSemester || '1'
  );
  const [date, setDate] = useState<string>(getTodayIso());
  const [selectedClassId, setSelectedClassId] = useState<string>(
    accessibleClasses[0]?.id || 'x-akl'
  );
  const [session, setSession] = useState<string>('Harian');

  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);

  const canInput = hasPermission('inputClassAttendance') || hasPermission('crudAllData');

  // Ensure selectedClassId stays valid when role changes
  useEffect(() => {
    if (
      accessibleClasses.length > 0 &&
      !accessibleClasses.some((c) => c.id === selectedClassId)
    ) {
      setSelectedClassId(accessibleClasses[0].id);
    }
  }, [accessibleClasses, selectedClassId]);

  const currentClassObj = useMemo(
    () => accessibleClasses.find((c) => c.id === selectedClassId) || accessibleClasses[0],
    [accessibleClasses, selectedClassId]
  );

  const classStudents = useMemo(
    () =>
      students
        .filter((s) => s.classId === currentClassObj?.id && s.status === 'Aktif')
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [students, currentClassObj]
  );

  // Existing saved records for this exact date + class + session (Duplicate check)
  const existingMap = useMemo(() => {
    const map = new Map<string, (typeof classAttendances)[0]>();
    for (const r of classAttendances) {
      if (
        r.date === date &&
        r.classId === currentClassObj?.id &&
        (r.session || 'Harian') === session
      ) {
        map.set(r.studentId, r);
      }
    }
    return map;
  }, [classAttendances, date, currentClassObj, session]);

  const hasSavedAttendance = existingMap.size > 0;

  // Sync drafts whenever date / class / session / saved data changes
  useEffect(() => {
    const nextDrafts: Record<string, RowDraft> = {};
    for (const st of classStudents) {
      const existing = existingMap.get(st.id);
      nextDrafts[st.id] = {
        status: existing?.status || 'H',
        description: existing?.description || '',
      };
    }
    setDrafts(nextDrafts);
    setIsEditingExisting(false);
  }, [classStudents, existingMap, date, selectedClassId, session]);

  const holidayInfo = useMemo(
    () => getHolidayEventForDate(date, schoolCalendar),
    [date, schoolCalendar]
  );

  const isEffectiveDay = useMemo(
    () => isEffectiveSchoolDate(date, attendanceSettings, schoolCalendar),
    [date, attendanceSettings, schoolCalendar]
  );

  const firstSavedMeta = useMemo(() => {
    const first = Array.from(existingMap.values())[0];
    return first || null;
  }, [existingMap]);

  const handleSetAll = (status: AttendanceStatusCode) => {
    if (hasSavedAttendance && !isEditingExisting) {
      setIsEditingExisting(true);
    }
    const next: Record<string, RowDraft> = {};
    for (const st of classStudents) {
      next[st.id] = {
        status,
        description: drafts[st.id]?.description || '',
      };
    }
    setDrafts(next);
    addToast('info', 'Status Massal Diterapkan', `Seluruh siswa ${currentClassObj?.name} ditandai ${STATUS_LABELS[status]}.`);
  };

  const handleRowChange = (studentId: string, patch: Partial<RowDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'H',
        description: prev[studentId]?.description || '',
        ...patch,
      },
    }));
  };

  const performSave = async () => {
    if (!currentClassObj || classStudents.length === 0) return;
    setIsSaving(true);
    try {
      const entries = classStudents.map((st) => ({
        student: st,
        status: drafts[st.id]?.status || 'H',
        description: drafts[st.id]?.description || '',
      }));
      await saveClassAttendanceBatch(entries, {
        date,
        session,
        academicYear,
        semester,
        classObj: currentClassObj,
      });
      setIsEditingExisting(false);
      setIsConfirmSaveOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!canInput) {
      addToast('error', 'Akses Ditolak', 'Peran Anda hanya memiliki izin lihat pada modul absensi.');
      return;
    }
    if (classStudents.length === 0) {
      addToast('warning', 'Kelas Kosong', 'Tambahkan data siswa di kelas ini terlebih dahulu.');
      return;
    }
    // Confirm before updating already saved attendance (Section 4 rule)
    if (hasSavedAttendance) {
      setIsConfirmSaveOpen(true);
      return;
    }
    performSave();
  };

  // Summary of current draft
  const draftSummary = useMemo(() => {
    let h = 0;
    let s = 0;
    let i = 0;
    let a = 0;
    let d = 0;
    for (const st of classStudents) {
      const code = drafts[st.id]?.status || 'H';
      if (code === 'H') h++;
      else if (code === 'S') s++;
      else if (code === 'I') i++;
      else if (code === 'A') a++;
      else if (code === 'D') d++;
    }
    return { h, s, i, a, d };
  }, [classStudents, drafts]);

  const isLocked = hasSavedAttendance && !isEditingExisting;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-cyan-600" />
            Input Absensi Harian Kelas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pilih tahun pelajaran, semester, tanggal, dan kelas. Sistem mencegah duplikasi absensi per tanggal per sesi.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 font-semibold text-slate-700 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-cyan-600" />
            Petugas: <strong className="text-slate-900">{userProfile?.displayName}</strong>
          </div>
        </div>
      </div>

      {/* Step 1-4 Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="font-bold text-slate-700 block mb-1">1. Tahun Pelajaran</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
            >
              {Array.from(
                new Set([
                  attendanceSettings.activeAcademicYear,
                  ...academicYears.map((y) => y.year),
                  '2025/2026',
                  '2026/2027',
                ])
              )
                .filter(Boolean)
                .map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">2. Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value as '1' | '2')}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
            >
              <option value="1">Semester 1 (Juli - Des)</option>
              <option value="2">Semester 2 (Jan - Jun)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">3. Tanggal Absensi</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-cyan-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">4. Pilih Kelas (9 Kelas)</label>
            <select
              value={currentClassObj?.id || ''}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
            >
              {accessibleClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} — {cls.major}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Sesi Pertemuan</label>
            <select
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
            >
              <option value="Harian">Harian (Utama)</option>
              <option value="Sesi Pagi">Sesi Pagi</option>
              <option value="Sesi Siang">Sesi Siang</option>
              <option value="Praktik Lab">Praktik Lab Komputer</option>
            </select>
          </div>
        </div>

        {/* Holiday / Effective Day Warning */}
        {!isEffectiveDay && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Perhatian Hari Non-Efektif / Libur:</strong>{' '}
              {holidayInfo
                ? `${holidayInfo.title} (${holidayInfo.type}).`
                : 'Tanggal ini berada di luar hari aktif sekolah yang dikonfigurasi pada Pengaturan Absensi.'}{' '}
              Hari libur tidak dianggap ketidakhadiran dalam rekap otomatis.
            </div>
          </div>
        )}

        {/* Saved Status Banner & Duplicate Guard Info */}
        {hasSavedAttendance && firstSavedMeta && (
          <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-bold text-cyan-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                Absensi Sudah Tersimpan untuk {currentClassObj?.name} ({date} · {session})
              </div>
              <div className="text-[11px] text-slate-600 flex items-center gap-3 flex-wrap">
                <span>Petugas: <strong>{firstSavedMeta.recordedBy}</strong></span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Input: {new Date(firstSavedMeta.createdAt).toLocaleString('id-ID')}
                </span>
                <span>Ubah Terakhir: {new Date(firstSavedMeta.updatedAt).toLocaleString('id-ID')}</span>
              </div>
            </div>
            {canInput && !isEditingExisting && (
              <button
                type="button"
                onClick={() => setIsEditingExisting(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                Edit Absensi
              </button>
            )}
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-500 mr-1">Tombol Cepat:</span>
            {canInput && (
              <>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleSetAll('H')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-800 border border-emerald-200 font-bold cursor-pointer"
                >
                  Tandai Semua Hadir
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleSetAll('S')}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-800 border border-amber-200 font-bold cursor-pointer"
                >
                  Tandai Semua Sakit
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleSetAll('I')}
                  className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 disabled:opacity-50 text-sky-800 border border-sky-200 font-bold cursor-pointer"
                >
                  Tandai Semua Izin
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleSetAll('A')}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-800 border border-rose-200 font-bold cursor-pointer"
                >
                  Tandai Semua Alpa
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] font-bold tabular-nums">
            <span className="text-emerald-700">H: {draftSummary.h}</span>
            <span className="text-amber-700">S: {draftSummary.s}</span>
            <span className="text-sky-700">I: {draftSummary.i}</span>
            <span className="text-rose-700">A: {draftSummary.a}</span>
            <span className="text-violet-700">D: {draftSummary.d}</span>
          </div>
        </div>
      </div>

      {/* Student Attendance Input List (Desktop Table + Mobile Cards) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">
              Daftar Siswa Kelas {currentClassObj?.name} ({classStudents.length} Siswa Aktif)
            </h2>
            <p className="text-[11px] text-slate-500">
              Wali Kelas: {currentClassObj?.homeroomTeacherName} · ID Dokumen Unik: {buildAttendanceDocId(date, session, '[studentId]')}
            </p>
          </div>
          {canInput && (
            <button
              type="button"
              disabled={isSaving || isLocked}
              onClick={handleSaveClick}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSaving
                ? 'Menyimpan...'
                : hasSavedAttendance
                ? 'Simpan Perubahan Absensi'
                : 'Simpan Absensi'}
            </button>
          )}
        </div>

        {classStudents.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            Belum ada siswa aktif di kelas {currentClassObj?.name}. Tambahkan siswa pada menu Manajemen Data Siswa terlebih dahulu.
          </div>
        ) : (
          <>
            {/* Mobile Card View (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {classStudents.map((st, idx) => {
                const draft = drafts[st.id] || { status: 'H', description: '' };
                const savedRec = existingMap.get(st.id);
                return (
                  <div key={st.id} className="p-4 space-y-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 mr-1.5">#{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setDetailStudent(st)}
                          className="font-bold text-slate-900 text-sm underline decoration-slate-300 text-left"
                        >
                          {st.fullName}
                        </button>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">NIS: {st.nis}</div>
                      </div>
                      {savedRec && canInput && isEditingExisting && (
                        <button
                          type="button"
                          onClick={() => deleteClassAttendance(savedRec)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                          title="Hapus catatan absensi siswa ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Large Touch Buttons for HP */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {STATUS_OPTIONS.map((opt) => {
                        const active = draft.status === opt.code;
                        return (
                          <button
                            key={opt.code}
                            type="button"
                            disabled={!canInput || isLocked}
                            onClick={() => handleRowChange(st.id, { status: opt.code })}
                            className={`py-2.5 rounded-xl border text-center font-extrabold transition-all ${
                              active
                                ? opt.activeCls
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            } disabled:opacity-70`}
                          >
                            <div>{opt.code}</div>
                            <div className="text-[9px] font-semibold">{opt.label}</div>
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      disabled={!canInput || isLocked}
                      value={draft.description}
                      onChange={(e) => handleRowChange(st.id, { description: e.target.value })}
                      placeholder="Keterangan / alasan ketidakhadiran (opsional)..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs disabled:opacity-70"
                    />
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="py-3 px-4 font-bold text-center w-12">No</th>
                    <th className="py-3 px-4 font-bold w-28">NIS</th>
                    <th className="py-3 px-4 font-bold">Nama Lengkap Siswa</th>
                    <th className="py-3 px-4 font-bold text-center">Tombol Status Cepat (H / S / I / A / D)</th>
                    <th className="py-3 px-4 font-bold w-36">Dropdown</th>
                    <th className="py-3 px-4 font-bold">Keterangan / Alasan</th>
                    {canInput && isEditingExisting && <th className="py-3 px-3 font-bold text-center">Hapus</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((st, idx) => {
                    const draft = drafts[st.id] || { status: 'H', description: '' };
                    const savedRec = existingMap.get(st.id);
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 text-center font-bold text-slate-400 tabular-nums">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">{st.nis}</td>
                        <td className="py-2.5 px-4">
                          <button
                            type="button"
                            onClick={() => setDetailStudent(st)}
                            className="font-bold text-slate-900 hover:text-cyan-700 underline decoration-slate-300 cursor-pointer text-left"
                          >
                            {st.fullName}
                          </button>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {STATUS_OPTIONS.map((opt) => {
                              const active = draft.status === opt.code;
                              return (
                                <button
                                  key={opt.code}
                                  type="button"
                                  disabled={!canInput || isLocked}
                                  onClick={() => handleRowChange(st.id, { status: opt.code })}
                                  title={opt.label}
                                  className={`w-9 h-8 rounded-lg border font-extrabold text-xs transition-all cursor-pointer ${
                                    active
                                      ? opt.activeCls
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                  } disabled:opacity-65 disabled:cursor-not-allowed`}
                                >
                                  {opt.code}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <select
                            disabled={!canInput || isLocked}
                            value={draft.status}
                            onChange={(e) =>
                              handleRowChange(st.id, {
                                status: e.target.value as AttendanceStatusCode,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-800 disabled:opacity-65"
                          >
                            <option value="H">H — Hadir</option>
                            <option value="S">S — Sakit</option>
                            <option value="I">I — Izin</option>
                            <option value="A">A — Alpa</option>
                            <option value="D">D — Dispensasi</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            disabled={!canInput || isLocked}
                            value={draft.description}
                            onChange={(e) => handleRowChange(st.id, { description: e.target.value })}
                            placeholder="Alasan sakit/izin/dispen..."
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 disabled:opacity-65"
                          />
                        </td>
                        {canInput && isEditingExisting && (
                          <td className="py-2.5 px-3 text-center">
                            {savedRec && (
                              <button
                                type="button"
                                onClick={() => deleteClassAttendance(savedRec)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Hapus catatan siswa ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Sticky Save Bar */}
            {canInput && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  Total Siswa: <strong>{classStudents.length}</strong> · Hadir:{' '}
                  <strong className="text-emerald-700">{draftSummary.h}</strong> · Ketidakhadiran (S+I+A):{' '}
                  <strong className="text-rose-700">{draftSummary.s + draftSummary.i + draftSummary.a}</strong>
                </div>
                <div className="flex items-center gap-2">
                  {isLocked && (
                    <button
                      type="button"
                      onClick={() => setIsEditingExisting(true)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 text-cyan-400" />
                      Aktifkan Mode Edit Absensi
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSaving || isLocked}
                    onClick={handleSaveClick}
                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {hasSavedAttendance ? 'Simpan Perubahan' : 'Simpan Absensi'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal before modifying already saved attendance */}
      <ConfirmModal
        isOpen={isConfirmSaveOpen}
        title="Konfirmasi Ubah Absensi Tersimpan?"
        message={`Absensi kelas ${currentClassObj?.name} untuk tanggal ${date} (${session}) sudah pernah disimpan sebelumnya oleh ${
          firstSavedMeta?.recordedBy || 'petugas'
        }. Perubahan akan memperbarui data tanpa duplikasi dan dicatat dalam riwayat log perubahan absensi. Lanjutkan simpan perubahan?`}
        onConfirm={performSave}
        onCancel={() => setIsConfirmSaveOpen(false)}
      />

      <StudentDetailModal student={detailStudent} onClose={() => setDetailStudent(null)} />
    </div>
  );
};
