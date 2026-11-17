import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import {
  calculateAttendanceMetrics,
  getEffectiveSchoolDates,
  getTodayIso,
  getUnrecordedSchoolDaysCount,
} from '../../utils/attendanceUtils';
import { Search, Info, ClipboardList } from 'lucide-react';
import { StudentDetailModal } from './StudentDetailModal';

export const AttendanceRecapView: React.FC = () => {
  const {
    accessibleClasses,
    students,
    classAttendances,
    attendanceSettings,
    schoolCalendar,
  } = useApp();

  const [classFilter, setClassFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(
    attendanceSettings.schoolStartDate || '2026-07-13'
  );
  const [endDate, setEndDate] = useState<string>(getTodayIso());
  const [search, setSearch] = useState<string>('');
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);

  const accessibleIds = useMemo(
    () => new Set(accessibleClasses.map((c) => c.id)),
    [accessibleClasses]
  );

  const filteredRecords = useMemo(() => {
    return classAttendances.filter((r) => {
      if (!accessibleIds.has(r.classId)) return false;
      if (classFilter !== 'all' && r.classId !== classFilter) return false;
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      return true;
    });
  }, [classAttendances, accessibleIds, classFilter, startDate, endDate]);

  const effectiveDates = useMemo(
    () => getEffectiveSchoolDates(startDate, endDate, attendanceSettings, schoolCalendar),
    [startDate, endDate, attendanceSettings, schoolCalendar]
  );

  const { unrecordedCount } = useMemo(
    () =>
      getUnrecordedSchoolDaysCount(
        effectiveDates,
        filteredRecords,
        classFilter === 'all' ? undefined : classFilter
      ),
    [effectiveDates, filteredRecords, classFilter]
  );

  const studentRecapList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => {
        if (!accessibleIds.has(s.classId)) return false;
        if (classFilter !== 'all' && s.classId !== classFilter) return false;
        if (q && !s.fullName.toLowerCase().includes(q) && !s.nis.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .map((st) => {
        const recs = filteredRecords.filter((r) => r.studentId === st.id);
        return {
          student: st,
          metrics: calculateAttendanceMetrics(recs),
        };
      });
  }, [students, accessibleIds, classFilter, search, filteredRecords]);

  const totalMetrics = useMemo(() => calculateAttendanceMetrics(filteredRecords), [filteredRecords]);
  const lowThreshold = attendanceSettings.lowAttendanceThreshold || 85;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-cyan-600" />
          Rekapitulasi Absensi & Detail Siswa
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Klik nama siswa untuk melihat identitas, riwayat absensi, grafik individu, dan log perubahan data absensi.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Filter Kelas</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
            >
              <option value="all">Seluruh Kelas Diizinkan ({accessibleClasses.length})</option>
              {accessibleClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Tanggal Awal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Cari Siswa</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama atau NIS..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Formula & Unrecorded Info */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 text-slate-700">
            <Info className="w-4 h-4 text-cyan-600 shrink-0" />
            <span>
              Hari Efektif Periode Ini: <strong className="tabular-nums">{effectiveDates.length} hari</strong> · Belum Diinput:{' '}
              <strong className="text-amber-700 tabular-nums">{unrecordedCount} hari</strong> (tidak dihitung Alpa)
            </span>
          </div>
          <div className="font-bold text-slate-900 tabular-nums">
            Total Kehadiran Periode: {totalMetrics.percentage}% ({totalMetrics.validCount} catatan valid)
          </div>
        </div>
      </div>

      {/* Recap Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-3 px-3 font-bold text-center w-10">No</th>
                <th className="py-3 px-3 font-bold">NIS</th>
                <th className="py-3 px-3 font-bold">Nama Siswa (Klik Detail)</th>
                <th className="py-3 px-3 font-bold">Kelas</th>
                <th className="py-3 px-3 font-bold text-right">H</th>
                <th className="py-3 px-3 font-bold text-right">S</th>
                <th className="py-3 px-3 font-bold text-right">I</th>
                <th className="py-3 px-3 font-bold text-right">A</th>
                <th className="py-3 px-3 font-bold text-right">D</th>
                <th className="py-3 px-3 font-bold text-right">Tidak Hadir (S+I+A)</th>
                <th className="py-3 px-3 font-bold text-right">Valid</th>
                <th className="py-3 px-3 font-bold text-right">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentRecapList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    Tidak ada data siswa pada filter yang dipilih.
                  </td>
                </tr>
              ) : (
                studentRecapList.map(({ student, metrics }, idx) => {
                  const isLow = metrics.validCount > 0 && metrics.percentage < lowThreshold;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400 tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{student.nis}</td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => setDetailStudent(student)}
                          className="font-bold text-slate-900 hover:text-cyan-700 underline decoration-slate-300 cursor-pointer text-left"
                        >
                          {student.fullName}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{student.className}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 tabular-nums">{metrics.hadir}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-700 tabular-nums">{metrics.sakit}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-sky-700 tabular-nums">{metrics.izin}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-700 tabular-nums">{metrics.alpa}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-violet-700 tabular-nums">{metrics.dispensasi}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800 tabular-nums">{metrics.ketidakhadiran}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">{metrics.validCount}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-extrabold tabular-nums ${
                            metrics.validCount === 0
                              ? 'text-slate-400'
                              : isLow
                              ? 'text-rose-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {metrics.validCount > 0 ? `${metrics.percentage}%` : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StudentDetailModal student={detailStudent} onClose={() => setDetailStudent(null)} />
    </div>
  );
};
