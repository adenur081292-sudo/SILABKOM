import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  calculateAttendanceMetrics,
  getEffectiveSchoolDates,
  getTodayIso,
  getUnrecordedSchoolDaysCount,
} from '../../utils/attendanceUtils';
import {
  Users,
  UserCheck,
  Thermometer,
  FileText,
  AlertOctagon,
  Award,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowRight,
  Info,
} from 'lucide-react';

interface AttendanceDashboardViewProps {
  onSelectMenu?: (menuId: string) => void;
}

export const AttendanceDashboardView: React.FC<AttendanceDashboardViewProps> = ({
  onSelectMenu,
}) => {
  const {
    accessibleClasses,
    students,
    classAttendances,
    attendanceSettings,
    schoolCalendar,
    hasPermission,
  } = useApp();

  // Default to latest recorded date or today so user sees live numbers immediately
  const latestRecordedDate = useMemo(() => {
    if (classAttendances.length > 0) {
      return [...classAttendances].sort((a, b) => b.date.localeCompare(a.date))[0].date;
    }
    return getTodayIso();
  }, [classAttendances]);

  const [selectedDate, setSelectedDate] = useState<string>(getTodayIso());

  const accessibleClassIds = useMemo(
    () => new Set(accessibleClasses.map((c) => c.id)),
    [accessibleClasses]
  );

  const scopedStudents = useMemo(
    () => students.filter((s) => accessibleClassIds.has(s.classId) && s.status === 'Aktif'),
    [students, accessibleClassIds]
  );

  const dayRecords = useMemo(
    () =>
      classAttendances.filter(
        (r) => r.date === selectedDate && accessibleClassIds.has(r.classId)
      ),
    [classAttendances, selectedDate, accessibleClassIds]
  );

  const dayMetrics = useMemo(() => calculateAttendanceMetrics(dayRecords), [dayRecords]);

  // Class-by-class recap for selectedDate
  const classSummaryRows = useMemo(() => {
    return accessibleClasses.map((cls) => {
      const clsStudents = scopedStudents.filter((s) => s.classId === cls.id);
      const clsRecs = dayRecords.filter((r) => r.classId === cls.id);
      const m = calculateAttendanceMetrics(clsRecs);
      return {
        cls,
        totalStudents: clsStudents.length,
        ...m,
      };
    });
  }, [accessibleClasses, scopedStudents, dayRecords]);

  // Highest and lowest attendance class (only among classes with recorded data on selectedDate)
  const recordedClassRows = classSummaryRows.filter((r) => r.validCount > 0);
  const highestClass =
    recordedClassRows.length > 0
      ? [...recordedClassRows].sort((a, b) => b.percentage - a.percentage)[0]
      : null;
  const lowestClass =
    recordedClassRows.length > 0
      ? [...recordedClassRows].sort((a, b) => a.percentage - b.percentage)[0]
      : null;

  // Effective school days info (from schoolStartDate to selectedDate)
  const effectiveDates = useMemo(
    () =>
      getEffectiveSchoolDates(
        attendanceSettings.schoolStartDate || '2026-07-13',
        selectedDate,
        attendanceSettings,
        schoolCalendar
      ),
    [attendanceSettings, schoolCalendar, selectedDate]
  );

  const { unrecordedCount } = useMemo(
    () =>
      getUnrecordedSchoolDaysCount(
        effectiveDates,
        classAttendances.filter((r) => accessibleClassIds.has(r.classId))
      ),
    [effectiveDates, classAttendances, accessibleClassIds]
  );

  const canInput = hasPermission('inputClassAttendance') || hasPermission('crudAllData');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Absensi Kelas</h1>
          <p className="text-xs text-slate-500 mt-1">
            Ringkasan kehadiran harian siswa Kelas X, XI, dan XII (AKL, DKV, ATPH) · Tahun Pelajaran{' '}
            <strong className="text-slate-700">{attendanceSettings.activeAcademicYear}</strong> · Semester{' '}
            <strong className="text-slate-700">{attendanceSettings.activeSemester}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-cyan-600 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="font-bold text-slate-800 focus:outline-none"
            />
          </div>
          {dayRecords.length === 0 && latestRecordedDate !== selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(latestRecordedDate)}
              className="px-3 py-2 rounded-xl bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs font-bold hover:bg-cyan-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              Lihat Data Terakhir ({latestRecordedDate})
            </button>
          )}
          {canInput && onSelectMenu && (
            <button
              type="button"
              onClick={() => onSelectMenu('attendance_input')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
            >
              Input Absensi Hari Ini
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </button>
          )}
        </div>
      </div>

      {/* Effective School Days Notice */}
      <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            Hari efektif belajar terhitung: <strong className="tabular-nums">{effectiveDates.length} hari</strong> ·
            Hari efektif belum diinput absensinya:{' '}
            <strong className="text-cyan-300 tabular-nums">{unrecordedCount} hari</strong>{' '}
            <span className="text-slate-300">(tidak dihitung sebagai Alpa)</span>
          </span>
        </div>
        <span className="text-[11px] text-slate-300 font-medium">
          Rumus: Hadir / (H + S + I + A + D) × 100%
        </span>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1.5">
            <span>Seluruh Siswa</span>
            <Users className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{scopedStudents.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{accessibleClasses.length} Kelas Aktif</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1.5">
            <span>Hadir</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{dayMetrics.hadir}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Kode Status: H</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold mb-1.5">
            <span>Sakit</span>
            <Thermometer className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 tabular-nums">{dayMetrics.sakit}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Kode Status: S</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-sky-700 text-xs font-semibold mb-1.5">
            <span>Izin</span>
            <FileText className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-sky-700 tabular-nums">{dayMetrics.izin}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Kode Status: I</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold mb-1.5">
            <span>Alpa</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-700 tabular-nums">{dayMetrics.alpa}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Kode Status: A</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-violet-700 text-xs font-semibold mb-1.5">
            <span>Dispensasi</span>
            <Award className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-2xl font-extrabold text-violet-700 tabular-nums">{dayMetrics.dispensasi}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Kode Status: D</div>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xs col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="text-cyan-300 text-xs font-semibold mb-1.5">Kehadiran</div>
          <div className="text-2xl font-extrabold tabular-nums">{dayMetrics.percentage}%</div>
          <div className="text-[11px] text-slate-300 mt-0.5 tabular-nums">
            {dayMetrics.validCount} catatan valid
          </div>
        </div>
      </div>

      {/* Highest & Lowest Class Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Kelas Tingkat Kehadiran Tertinggi ({selectedDate})
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              {highestClass ? highestClass.cls.name : 'Belum ada data'}
            </div>
            <div className="text-xs text-slate-500">
              {highestClass
                ? `${highestClass.hadir} hadir dari ${highestClass.validCount} catatan · Wali: ${highestClass.cls.homeroomTeacherName}`
                : 'Pilih tanggal dengan catatan absensi atau input absensi terlebih dahulu'}
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 tabular-nums shrink-0">
            {highestClass ? `${highestClass.percentage}%` : '-'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              Kelas Tingkat Kehadiran Terendah ({selectedDate})
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              {lowestClass ? lowestClass.cls.name : 'Belum ada data'}
            </div>
            <div className="text-xs text-slate-500">
              {lowestClass
                ? `${lowestClass.ketidakhadiran} tidak hadir (S+I+A) · Wali: ${lowestClass.cls.homeroomTeacherName}`
                : 'Pilih tanggal dengan catatan absensi atau input absensi terlebih dahulu'}
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-600 tabular-nums shrink-0">
            {lowestClass ? `${lowestClass.percentage}%` : '-'}
          </div>
        </div>
      </div>

      {/* Summary Table for All Accessible Classes (X, XI, XII) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              Ringkasan Kehadiran Seluruh Kelas (Tanggal {selectedDate})
            </h2>
            <p className="text-xs text-slate-500">
              Dihitung otomatis dari koleksi Cloud Firestore berdasarkan status valid (H, S, I, A, D).
            </p>
          </div>
          {onSelectMenu && (
            <button
              type="button"
              onClick={() => onSelectMenu('attendance_recap')}
              className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              Lihat Rekap & Detail Siswa <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-3 px-4 font-bold">Kelas</th>
                <th className="py-3 px-4 font-bold text-right">Total Siswa</th>
                <th className="py-3 px-4 font-bold text-right">Hadir</th>
                <th className="py-3 px-4 font-bold text-right">Sakit</th>
                <th className="py-3 px-4 font-bold text-right">Izin</th>
                <th className="py-3 px-4 font-bold text-right">Alpa</th>
                <th className="py-3 px-4 font-bold text-right">Dispensasi</th>
                <th className="py-3 px-4 font-bold text-right">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classSummaryRows.map((row) => (
                <tr key={row.cls.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{row.cls.name}</div>
                    <div className="text-[11px] text-slate-500">{row.cls.homeroomTeacherName}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-700 tabular-nums">
                    {row.totalStudents}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700 tabular-nums">
                    {row.hadir}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-amber-700 tabular-nums">
                    {row.sakit}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-sky-700 tabular-nums">
                    {row.izin}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-rose-700 tabular-nums">
                    {row.alpa}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-violet-700 tabular-nums">
                    {row.dispensasi}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {row.validCount > 0 ? (
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-cyan-600 rounded-full"
                            style={{ width: `${Math.min(100, row.percentage)}%` }}
                          />
                        </div>
                        <span className="font-extrabold text-slate-900 tabular-nums">{row.percentage}%</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">Belum diinput</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
