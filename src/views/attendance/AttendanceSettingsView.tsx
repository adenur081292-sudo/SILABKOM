import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AcademicYearConfig,
  AttendanceSettings,
  CalendarEventType,
  SchoolCalendarEvent,
  SchoolClass,
} from '../../types';
import {
  Settings,
  Calendar,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  UserCheck,
  Building2,
  Lock,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';

const DAY_LABELS: { day: number; label: string }[] = [
  { day: 1, label: 'Senin' },
  { day: 2, label: 'Selasa' },
  { day: 3, label: 'Rabu' },
  { day: 4, label: 'Kamis' },
  { day: 5, label: 'Jumat' },
  { day: 6, label: 'Sabtu' },
  { day: 0, label: 'Minggu' },
];

export const AttendanceSettingsView: React.FC = () => {
  const {
    attendanceSettings,
    saveAttendanceSettings,
    schoolClasses,
    saveSchoolClass,
    academicYears,
    saveAcademicYear,
    deleteAcademicYear,
    schoolCalendar,
    saveCalendarEvent,
    deleteCalendarEvent,
    hasPermission,
  } = useApp();

  const canManage =
    hasPermission('manageAttendanceSettings') || hasPermission('crudAllData');

  const [formSettings, setFormSettings] = useState<AttendanceSettings>(attendanceSettings);
  useEffect(() => {
    setFormSettings(attendanceSettings);
  }, [attendanceSettings]);

  const [activeTab, setActiveTab] = useState<'general' | 'calendar' | 'years' | 'homeroom'>('general');

  // Academic Year Modal
  const [isAyOpen, setIsAyOpen] = useState(false);
  const [ayForm, setAyForm] = useState<Partial<AcademicYearConfig>>({
    year: '2026/2027',
    semester1Start: '2026-07-13',
    semester1End: '2026-12-19',
    semester2Start: '2027-01-04',
    semester2End: '2027-06-19',
    activeSemester: '1',
    isActive: true,
  });
  const [deleteAyId, setDeleteAyId] = useState<string | null>(null);

  // Calendar Event Modal
  const [isCalOpen, setIsCalOpen] = useState(false);
  const [calForm, setCalForm] = useState<Partial<SchoolCalendarEvent>>({
    date: new Date().toISOString().split('T')[0],
    endDate: '',
    title: '',
    type: 'Libur Nasional',
    isHoliday: true,
    description: '',
  });
  const [deleteCalId, setDeleteCalId] = useState<string | null>(null);

  // Homeroom teacher quick editor
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);

  const toggleActiveDay = (day: number) => {
    if (!canManage) return;
    const exists = formSettings.activeDays.includes(day);
    const next = exists
      ? formSettings.activeDays.filter((d) => d !== day)
      : [...formSettings.activeDays, day];
    setFormSettings({ ...formSettings, activeDays: next });
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    await saveAttendanceSettings(formSettings);
  };

  const handleSaveAy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !ayForm.year) return;
    await saveAcademicYear({
      id: ayForm.id || 'ay-' + ayForm.year.replace(/[^0-9]/g, '-'),
      year: ayForm.year,
      semester1Start: ayForm.semester1Start || '2026-07-13',
      semester1End: ayForm.semester1End || '2026-12-19',
      semester2Start: ayForm.semester2Start || '2027-01-04',
      semester2End: ayForm.semester2End || '2027-06-19',
      activeSemester: ayForm.activeSemester || '1',
      isActive: ayForm.isActive ?? true,
    });
    setIsAyOpen(false);
  };

  const handleSaveCal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !calForm.date || !calForm.title) return;
    await saveCalendarEvent({
      id: calForm.id || 'cal-' + Date.now(),
      date: calForm.date,
      endDate: calForm.endDate || undefined,
      title: calForm.title,
      type: (calForm.type as CalendarEventType) || 'Libur Nasional',
      isHoliday: calForm.isHoliday ?? true,
      description: calForm.description || '',
    });
    setIsCalOpen(false);
  };

  const handleSaveHomeroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !editingClass) return;
    await saveSchoolClass(editingClass);
    setEditingClass(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-cyan-600" />
            Pengaturan Absensi, Hari Efektif & Kalender Pendidikan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Atur hari masuk efektif, hari libur nasional/sekolah, tahun pelajaran, kop laporan resmi, dan penugasan Wali Kelas.
          </p>
        </div>
        {!canManage && (
          <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
            <Lock className="w-4 h-4" /> Hanya Baca (Memerlukan Izin Pengaturan Absensi)
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 inline-flex flex-wrap gap-1.5 text-xs">
        {[
          { id: 'general', label: 'Hari Sekolah & Kop Resmi' },
          { id: 'calendar', label: `Kalender & Hari Libur (${schoolCalendar.length})` },
          { id: 'years', label: `Tahun Pelajaran & Semester (${academicYears.length})` },
          { id: 'homeroom', label: `Wali Kelas (9 Kelas)` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === t.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: GENERAL SETTINGS */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 text-xs">
          {/* Active Days */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 block">
              Pengaturan Hari Masuk Sekolah Efektif
            </label>
            <p className="text-[11px] text-slate-500">
              Hari yang tidak dicentang (seperti Sabtu/Minggu) otomatis dianggap hari libur mingguan dan dikecualikan dari perhitungan hari efektif yang belum diinput.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {DAY_LABELS.map((d) => {
                const active = formSettings.activeDays.includes(d.day);
                return (
                  <button
                    key={d.day}
                    type="button"
                    disabled={!canManage}
                    onClick={() => toggleActiveDay(d.day)}
                    className={`px-4 py-2 rounded-xl font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {active && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tahun Pelajaran Aktif</label>
              <select
                disabled={!canManage}
                value={formSettings.activeAcademicYear}
                onChange={(e) => setFormSettings({ ...formSettings, activeAcademicYear: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.year}>{y.year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Semester Aktif</label>
              <select
                disabled={!canManage}
                value={formSettings.activeSemester}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, activeSemester: e.target.value as '1' | '2' })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              >
                <option value="1">Semester 1 (Juli–Desember)</option>
                <option value="2">Semester 2 (Januari–Juni)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tanggal Awal Sekolah Efektif</label>
              <input
                type="date"
                disabled={!canManage}
                value={formSettings.schoolStartDate}
                onChange={(e) => setFormSettings({ ...formSettings, schoolStartDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ambang Batas Kehadiran Rendah (%)</label>
              <input
                type="number"
                min={50}
                max={100}
                disabled={!canManage}
                value={formSettings.lowAttendanceThreshold}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, lowAttendanceThreshold: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold tabular-nums"
              />
            </div>
          </div>

          {/* Official Header & Signatories */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-600" />
              Kop Surat Resmi & Tanda Tangan Kepala Sekolah
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Baris Kop 1 (Pemda)</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={formSettings.reportHeaderGov}
                  onChange={(e) => setFormSettings({ ...formSettings, reportHeaderGov: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Baris Kop 2 (Dinas)</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={formSettings.reportHeaderDept}
                  onChange={(e) => setFormSettings({ ...formSettings, reportHeaderDept: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={formSettings.schoolName}
                  onChange={(e) => setFormSettings({ ...formSettings, schoolName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Alamat Lengkap Sekolah</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={formSettings.schoolAddress}
                  onChange={(e) => setFormSettings({ ...formSettings, schoolAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kota Tanda Tangan</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={formSettings.reportCity}
                  onChange={(e) => setFormSettings({ ...formSettings, reportCity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={formSettings.principalName}
                  onChange={(e) => setFormSettings({ ...formSettings, principalName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={formSettings.principalNip}
                  onChange={(e) => setFormSettings({ ...formSettings, principalNip: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">URL Logo Sekolah</label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={formSettings.logoUrl}
                  onChange={(e) => setFormSettings({ ...formSettings, logoUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-cyan-400" />
                Simpan Pengaturan Absensi
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 2: SCHOOL CALENDAR & HOLIDAYS */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-600" />
                Daftar Hari Libur Nasional, Libur Semester & Kalender Pendidikan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tanggal yang ditandai sebagai Hari Libur tidak dihitung sebagai hari efektif belajar.
              </p>
            </div>
            {canManage && (
              <button
                onClick={() => {
                  setCalForm({
                    date: new Date().toISOString().split('T')[0],
                    endDate: '',
                    title: '',
                    type: 'Libur Nasional',
                    isHoliday: true,
                    description: '',
                  });
                  setIsCalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                Tambah Tanggal Libur / Agenda
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-3 px-4 font-bold">Tanggal</th>
                  <th className="py-3 px-4 font-bold">Nama Hari Libur / Kegiatan</th>
                  <th className="py-3 px-4 font-bold">Kategori</th>
                  <th className="py-3 px-4 font-bold text-center">Status Hari</th>
                  {canManage && <th className="py-3 px-4 font-bold text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schoolCalendar.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">
                      {ev.date}{ev.endDate ? ` s.d. ${ev.endDate}` : ''}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900">{ev.title}</div>
                      {ev.description && (
                        <div className="text-[11px] text-slate-500">{ev.description}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {ev.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {ev.isHoliday ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                          Libur (Non-Efektif)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                          Efektif / Agenda
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setCalForm(ev);
                              setIsCalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteCalId(ev.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ACADEMIC YEARS */}
      {activeTab === 'years' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Konfigurasi Tahun Pelajaran & Rentang Semester 1 / Semester 2
            </h3>
            {canManage && (
              <button
                onClick={() => {
                  setAyForm({
                    year: '2027/2028',
                    semester1Start: '2027-07-12',
                    semester1End: '2027-12-18',
                    semester2Start: '2028-01-03',
                    semester2End: '2028-06-17',
                    activeSemester: '1',
                    isActive: false,
                  });
                  setIsAyOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                Tambah Tahun Pelajaran
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {academicYears.map((ay) => (
              <div
                key={ay.id}
                className={`p-4 rounded-2xl border space-y-2 ${
                  ay.year === formSettings.activeAcademicYear
                    ? 'border-cyan-500 bg-cyan-50/30'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold text-slate-900">TP {ay.year}</span>
                  {ay.year === formSettings.activeAcademicYear && (
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-600 text-white font-bold text-[10px]">
                      Aktif Berjalan
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-800">Semester 1 (Ganjil)</div>
                    <div className="font-mono mt-0.5">{ay.semester1Start} s.d. {ay.semester1End}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-800">Semester 2 (Genap)</div>
                    <div className="font-mono mt-0.5">{ay.semester2Start} s.d. {ay.semester2End}</div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setAyForm(ay);
                        setIsAyOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold"
                    >
                      Edit
                    </button>
                    {academicYears.length > 1 && (
                      <button
                        onClick={() => setDeleteAyId(ay.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HOMEROOM TEACHERS FOR 9 FIXED CLASSES */}
      {activeTab === 'homeroom' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-600" />
              Daftar Wali Kelas Resmi (9 Kelas Tetap SMKN 15 Pandeglang)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Nama dan NIP Wali Kelas otomatis dicantumkan pada kolom tanda tangan laporan absensi per kelas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {schoolClasses.map((cls) => (
              <div
                key={cls.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-extrabold text-slate-900">{cls.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 font-bold text-[10px]">
                      Tingkat {cls.gradeLevel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{cls.majorFullName}</div>
                  <div className="mt-3 pt-2 border-t border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Wali Kelas:</div>
                    <div className="font-bold text-slate-900 mt-0.5">{cls.homeroomTeacherName}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      NIP. {cls.homeroomTeacherNip || '-'}
                    </div>
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => setEditingClass({ ...cls })}
                    className="w-full py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Ubah Wali Kelas
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CALENDAR EVENT */}
      {isCalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Tambah / Edit Kalender Sekolah</h3>
              <button onClick={() => setIsCalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCal} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Mulai *</label>
                  <input
                    type="date"
                    required
                    value={calForm.date || ''}
                    onChange={(e) => setCalForm({ ...calForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Selesai (Opsional)</label>
                  <input
                    type="date"
                    value={calForm.endDate || ''}
                    onChange={(e) => setCalForm({ ...calForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Hari Libur / Agenda *</label>
                <input
                  type="text"
                  required
                  value={calForm.title || ''}
                  onChange={(e) => setCalForm({ ...calForm, title: e.target.value })}
                  placeholder="Contoh: Libur Hari Raya / Penilaian Akhir Semester"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori</label>
                <select
                  value={calForm.type || 'Libur Nasional'}
                  onChange={(e) =>
                    setCalForm({ ...calForm, type: e.target.value as CalendarEventType })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                >
                  <option value="Libur Nasional">Libur Nasional</option>
                  <option value="Libur Semester">Libur Semester</option>
                  <option value="Libur Khusus Sekolah">Libur Khusus Sekolah</option>
                  <option value="Kegiatan Sekolah">Kegiatan Sekolah</option>
                </select>
              </div>
              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={calForm.isHoliday ?? true}
                  onChange={(e) => setCalForm({ ...calForm, isHoliday: e.target.checked })}
                  className="rounded accent-cyan-600"
                />
                <span className="font-semibold text-slate-800">
                  Tandai sebagai Hari Libur (Kecualikan dari hari efektif absensi)
                </span>
              </label>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan</label>
                <input
                  type="text"
                  value={calForm.description || ''}
                  onChange={(e) => setCalForm({ ...calForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Simpan Kalender
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ACADEMIC YEAR */}
      {isAyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Konfigurasi Tahun Pelajaran</h3>
              <button onClick={() => setIsAyOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAy} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tahun Pelajaran *</label>
                <input
                  type="text"
                  required
                  value={ayForm.year || ''}
                  onChange={(e) => setAyForm({ ...ayForm, year: e.target.value })}
                  placeholder="2026/2027"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Awal Sem 1</label>
                  <input
                    type="date"
                    value={ayForm.semester1Start || ''}
                    onChange={(e) => setAyForm({ ...ayForm, semester1Start: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Akhir Sem 1</label>
                  <input
                    type="date"
                    value={ayForm.semester1End || ''}
                    onChange={(e) => setAyForm({ ...ayForm, semester1End: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Awal Sem 2</label>
                  <input
                    type="date"
                    value={ayForm.semester2Start || ''}
                    onChange={(e) => setAyForm({ ...ayForm, semester2Start: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Akhir Sem 2</label>
                  <input
                    type="date"
                    value={ayForm.semester2End || ''}
                    onChange={(e) => setAyForm({ ...ayForm, semester2End: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAyOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Simpan Tahun Pelajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT HOMEROOM TEACHER */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Edit Wali Kelas — {editingClass.name}</h3>
              <button onClick={() => setEditingClass(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveHomeroom} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Wali Kelas *</label>
                <input
                  type="text"
                  required
                  value={editingClass.homeroomTeacherName}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, homeroomTeacherName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">NIP Wali Kelas</label>
                <input
                  type="text"
                  value={editingClass.homeroomTeacherNip || ''}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, homeroomTeacherNip: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 text-slate-600 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Simpan Wali Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteCalId}
        title="Hapus Tanggal Kalender?"
        message="Tanggal ini akan dihapus dari kalender pendidikan / daftar hari libur sekolah."
        onConfirm={async () => {
          if (deleteCalId) {
            await deleteCalendarEvent(deleteCalId);
            setDeleteCalId(null);
          }
        }}
        onCancel={() => setDeleteCalId(null)}
      />

      <ConfirmModal
        isOpen={!!deleteAyId}
        title="Hapus Tahun Pelajaran?"
        message="Konfigurasi tahun pelajaran ini akan dihapus."
        onConfirm={async () => {
          if (deleteAyId) {
            await deleteAcademicYear(deleteAyId);
            setDeleteAyId(null);
          }
        }}
        onCancel={() => setDeleteAyId(null)}
      />
    </div>
  );
};
