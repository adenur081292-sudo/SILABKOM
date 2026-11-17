import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { GradeLevel } from '../../types';
import {
  calculateAttendanceMetrics,
  formatIndonesianShortDate,
  getSemesterRange,
  getWeekDatesInMonth,
  MONTH_NAMES_ID,
} from '../../utils/attendanceUtils';
import { BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const AttendanceChartsView: React.FC = () => {
  const {
    accessibleClasses,
    students,
    classAttendances,
    academicYears,
    attendanceSettings,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'semester'>('weekly');

  // Weekly filters
  const [weeklyScope, setWeeklyScope] = useState<'all' | 'class' | 'grade'>('all');
  const [weeklyClassId, setWeeklyClassId] = useState<string>(accessibleClasses[0]?.id || 'x-akl');
  const [weeklyGrade, setWeeklyGrade] = useState<GradeLevel>('X');
  const [weeklyMonth, setWeeklyMonth] = useState<number>(11); // Nov default
  const [weeklyYear, setWeeklyYear] = useState<number>(2026);
  const [weeklyIndex, setWeeklyIndex] = useState<number>(2); // Minggu 2 (08-14 Nov)

  // Monthly filters
  const [monthlyYear, setMonthlyYear] = useState<number>(2026);
  const [monthlyClassId, setMonthlyClassId] = useState<string>('all');
  const [monthlySemester, setMonthlySemester] = useState<'all' | '1' | '2'>('all');

  // Semester filters
  const [semAcademicYear, setSemAcademicYear] = useState<string>(
    attendanceSettings.activeAcademicYear || '2026/2027'
  );
  const [semClassId, setSemClassId] = useState<string>('all');

  const accessibleIds = useMemo(
    () => new Set(accessibleClasses.map((c) => c.id)),
    [accessibleClasses]
  );

  // ==========================
  // WEEKLY COMPUTATION (Sec 6)
  // ==========================
  const weeklyFilteredRecords = useMemo(() => {
    return classAttendances.filter((r) => {
      if (!accessibleIds.has(r.classId)) return false;
      if (weeklyScope === 'class') return r.classId === weeklyClassId;
      if (weeklyScope === 'grade') {
        const cls = accessibleClasses.find((c) => c.id === r.classId);
        return cls?.gradeLevel === weeklyGrade;
      }
      return true;
    });
  }, [classAttendances, accessibleIds, weeklyScope, weeklyClassId, weeklyGrade, accessibleClasses]);

  const weeklyDates = useMemo(
    () => getWeekDatesInMonth(weeklyYear, weeklyMonth, weeklyIndex),
    [weeklyYear, weeklyMonth, weeklyIndex]
  );

  const weeklyChartData = useMemo(() => {
    return weeklyDates.map((dStr) => {
      const dayRecs = weeklyFilteredRecords.filter((r) => r.date === dStr);
      const m = calculateAttendanceMetrics(dayRecs);
      return {
        date: dStr,
        label: formatIndonesianShortDate(dStr),
        Hadir: m.hadir,
        Sakit: m.sakit,
        Izin: m.izin,
        Alpa: m.alpa,
        Dispensasi: m.dispensasi,
        Persentase: m.percentage,
      };
    });
  }, [weeklyDates, weeklyFilteredRecords]);

  const weeklyTotals = useMemo(() => {
    const recsInWeek = weeklyFilteredRecords.filter((r) => weeklyDates.includes(r.date));
    return calculateAttendanceMetrics(recsInWeek);
  }, [weeklyFilteredRecords, weeklyDates]);

  // ==========================
  // MONTHLY COMPUTATION (Sec 7)
  // ==========================
  const monthlyChartData = useMemo(() => {
    const allowedMonths =
      monthlySemester === '1'
        ? [7, 8, 9, 10, 11, 12]
        : monthlySemester === '2'
        ? [1, 2, 3, 4, 5, 6]
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    return allowedMonths.map((mNum) => {
      const prefix = `${monthlyYear}-${String(mNum).padStart(2, '0')}`;
      const recs = classAttendances.filter((r) => {
        if (!accessibleIds.has(r.classId)) return false;
        if (monthlyClassId !== 'all' && r.classId !== monthlyClassId) return false;
        return r.date.startsWith(prefix);
      });
      const met = calculateAttendanceMetrics(recs);
      return {
        monthNum: mNum,
        bulan: MONTH_NAMES_ID[mNum - 1].slice(0, 3),
        fullMonth: MONTH_NAMES_ID[mNum - 1],
        Hadir: met.hadir,
        Sakit: met.sakit,
        Izin: met.izin,
        Alpa: met.alpa,
        Dispensasi: met.dispensasi,
        Persentase: met.percentage,
        Valid: met.validCount,
      };
    });
  }, [classAttendances, accessibleIds, monthlyYear, monthlyClassId, monthlySemester]);

  const monthlyClassComparison = useMemo(() => {
    return accessibleClasses.map((cls) => {
      const recs = classAttendances.filter((r) => {
        if (r.classId !== cls.id) return false;
        if (!r.date.startsWith(String(monthlyYear))) return false;
        if (monthlySemester !== 'all' && r.semester !== monthlySemester) return false;
        return true;
      });
      const m = calculateAttendanceMetrics(recs);
      return {
        kelas: cls.name,
        Persentase: m.percentage,
        Hadir: m.hadir,
        TidakHadir: m.ketidakhadiran,
      };
    });
  }, [accessibleClasses, classAttendances, monthlyYear, monthlySemester]);

  // ==========================
  // SEMESTER COMPUTATION (Sec 8)
  // ==========================
  const sem1Range = useMemo(
    () => getSemesterRange(semAcademicYear, '1', academicYears),
    [semAcademicYear, academicYears]
  );
  const sem2Range = useMemo(
    () => getSemesterRange(semAcademicYear, '2', academicYears),
    [semAcademicYear, academicYears]
  );

  const sem1Records = useMemo(() => {
    return classAttendances.filter((r) => {
      if (!accessibleIds.has(r.classId)) return false;
      if (semClassId !== 'all' && r.classId !== semClassId) return false;
      return r.date >= sem1Range.startDate && r.date <= sem1Range.endDate;
    });
  }, [classAttendances, accessibleIds, semClassId, sem1Range]);

  const sem2Records = useMemo(() => {
    return classAttendances.filter((r) => {
      if (!accessibleIds.has(r.classId)) return false;
      if (semClassId !== 'all' && r.classId !== semClassId) return false;
      return r.date >= sem2Range.startDate && r.date <= sem2Range.endDate;
    });
  }, [classAttendances, accessibleIds, semClassId, sem2Range]);

  const sem1Metrics = useMemo(() => calculateAttendanceMetrics(sem1Records), [sem1Records]);
  const sem2Metrics = useMemo(() => calculateAttendanceMetrics(sem2Records), [sem2Records]);
  const semCombinedMetrics = useMemo(
    () => calculateAttendanceMetrics([...sem1Records, ...sem2Records]),
    [sem1Records, sem2Records]
  );

  const sem1MonthlyChart = useMemo(() => {
    return [7, 8, 9, 10, 11, 12].map((mNum) => {
      const startY = Number(semAcademicYear.split('/')[0]) || 2026;
      const prefix = `${startY}-${String(mNum).padStart(2, '0')}`;
      const m = calculateAttendanceMetrics(sem1Records.filter((r) => r.date.startsWith(prefix)));
      return {
        bulan: MONTH_NAMES_ID[mNum - 1].slice(0, 3),
        Hadir: m.hadir,
        Sakit: m.sakit,
        Izin: m.izin,
        Alpa: m.alpa,
        Dispensasi: m.dispensasi,
        Persentase: m.percentage,
      };
    });
  }, [sem1Records, semAcademicYear]);

  const sem2MonthlyChart = useMemo(() => {
    return [1, 2, 3, 4, 5, 6].map((mNum) => {
      const endY = Number(semAcademicYear.split('/')[1]) || 2027;
      const prefix = `${endY}-${String(mNum).padStart(2, '0')}`;
      const m = calculateAttendanceMetrics(sem2Records.filter((r) => r.date.startsWith(prefix)));
      return {
        bulan: MONTH_NAMES_ID[mNum - 1].slice(0, 3),
        Hadir: m.hadir,
        Sakit: m.sakit,
        Izin: m.izin,
        Alpa: m.alpa,
        Dispensasi: m.dispensasi,
        Persentase: m.percentage,
      };
    });
  }, [sem2Records, semAcademicYear]);

  const interSemesterComparison = useMemo(
    () => [
      {
        periode: 'Semester 1 (Jul-Des)',
        Hadir: sem1Metrics.hadir,
        Ketidakhadiran: sem1Metrics.ketidakhadiran,
        Dispensasi: sem1Metrics.dispensasi,
        Persentase: sem1Metrics.percentage,
      },
      {
        periode: 'Semester 2 (Jan-Jun)',
        Hadir: sem2Metrics.hadir,
        Ketidakhadiran: sem2Metrics.ketidakhadiran,
        Dispensasi: sem2Metrics.dispensasi,
        Persentase: sem2Metrics.percentage,
      },
    ],
    [sem1Metrics, sem2Metrics]
  );

  const semesterAllClassesComparison = useMemo(() => {
    const allSemRecords = [...sem1Records, ...sem2Records];
    return accessibleClasses.map((cls) => {
      const clsRecs = allSemRecords.filter((r) => r.classId === cls.id);
      const m = calculateAttendanceMetrics(clsRecs);
      return {
        kelas: cls.name,
        Persentase: m.percentage,
        Hadir: m.hadir,
        Ketidakhadiran: m.ketidakhadiran,
        valid: m.validCount,
      };
    });
  }, [accessibleClasses, sem1Records, sem2Records]);

  const semesterClassRanking = useMemo(() => {
    return [...semesterAllClassesComparison].sort((a, b) => b.Persentase - a.Persentase);
  }, [semesterAllClassesComparison]);

  const semTotalStudents = useMemo(() => {
    return students.filter(
      (s) =>
        accessibleIds.has(s.classId) &&
        (semClassId === 'all' || s.classId === semClassId) &&
        s.status === 'Aktif'
    ).length;
  }, [students, accessibleIds, semClassId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-600" />
            Grafik & Analitik Kehadiran Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visualisasi interaktif mingguan, bulanan (Jan–Des), dan rekapitulasi semester 1 & semester 2.
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 inline-flex items-center gap-1 text-xs">
          {[
            { id: 'weekly', label: 'Grafik Mingguan' },
            { id: 'monthly', label: 'Grafik Bulanan' },
            { id: 'semester', label: 'Grafik Semester' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as 'weekly' | 'monthly' | 'semester')}
              className={`px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: GRAFIK MINGGUAN */}
      {activeTab === 'weekly' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Cakupan Tampilan</label>
              <select
                value={weeklyScope}
                onChange={(e) => setWeeklyScope(e.target.value as 'all' | 'class' | 'grade')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              >
                <option value="all">Gabungan Seluruh Kelas</option>
                <option value="class">Per Kelas</option>
                <option value="grade">Per Tingkat (X / XI / XII)</option>
              </select>
            </div>

            {weeklyScope === 'class' && (
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Pilih Kelas</label>
                <select
                  value={weeklyClassId}
                  onChange={(e) => setWeeklyClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                >
                  {accessibleClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
            )}

            {weeklyScope === 'grade' && (
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Pilih Tingkat</label>
                <select
                  value={weeklyGrade}
                  onChange={(e) => setWeeklyGrade(e.target.value as GradeLevel)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                >
                  <option value="X">Tingkat X (AKL, DKV, ATPH)</option>
                  <option value="XI">Tingkat XI (AKL, DKV, ATPH)</option>
                  <option value="XII">Tingkat XII (AKL, DKV, ATPH)</option>
                </select>
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-600 block mb-1">Bulan</label>
              <select
                value={weeklyMonth}
                onChange={(e) => setWeeklyMonth(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              >
                {MONTH_NAMES_ID.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-600 block mb-1">Tahun</label>
              <input
                type="number"
                value={weeklyYear}
                onChange={(e) => setWeeklyYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 block mb-1">Minggu Ke-</label>
              <select
                value={weeklyIndex}
                onChange={(e) => setWeeklyIndex(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              >
                <option value={1}>Minggu 1 (Tgl 1–7)</option>
                <option value={2}>Minggu 2 (Tgl 8–14)</option>
                <option value={3}>Minggu 3 (Tgl 15–21)</option>
                <option value={4}>Minggu 4 (Tgl 22–28)</option>
                <option value={5}>Minggu 5 (Tgl 29–31)</option>
              </select>
            </div>
          </div>

          {/* Weekly Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-500 font-semibold">Total Hadir</div>
              <div className="text-2xl font-extrabold text-emerald-700 tabular-nums mt-1">{weeklyTotals.hadir}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-500 font-semibold">Total Sakit</div>
              <div className="text-2xl font-extrabold text-amber-700 tabular-nums mt-1">{weeklyTotals.sakit}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-500 font-semibold">Total Izin</div>
              <div className="text-2xl font-extrabold text-sky-700 tabular-nums mt-1">{weeklyTotals.izin}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-500 font-semibold">Total Alpa</div>
              <div className="text-2xl font-extrabold text-rose-700 tabular-nums mt-1">{weeklyTotals.alpa}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-500 font-semibold">Dispensasi</div>
              <div className="text-2xl font-extrabold text-violet-700 tabular-nums mt-1">{weeklyTotals.dispensasi}</div>
            </div>
            <div className="bg-slate-900 text-white p-4 rounded-2xl">
              <div className="text-cyan-300 font-semibold">Kehadiran Minggu</div>
              <div className="text-2xl font-extrabold tabular-nums mt-1">{weeklyTotals.percentage}%</div>
            </div>
          </div>

          {/* Weekly BarChart & LineChart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-4">
                Grafik Batang Harian (Hadir, Sakit, Izin, Alpa, Dispensasi)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Hadir" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Sakit" fill="#D97706" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Izin" fill="#0284C7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Alpa" fill="#DC2626" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Dispensasi" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-4">
                Grafik Garis Persentase Kehadiran (%) & Tren Hadir Harian
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="Persentase"
                      name="Persentase Kehadiran (%)"
                      stroke="#0891b2"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Hadir"
                      name="Jumlah Hadir"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GRAFIK BULANAN */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Tahun</label>
              <input
                type="number"
                value={monthlyYear}
                onChange={(e) => setMonthlyYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Pilih Kelas</label>
              <select
                value={monthlyClassId}
                onChange={(e) => setMonthlyClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              >
                <option value="all">Seluruh Kelas ({accessibleClasses.length} Kelas)</option>
                {accessibleClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Filter Semester</label>
              <select
                value={monthlySemester}
                onChange={(e) => setMonthlySemester(e.target.value as 'all' | '1' | '2')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              >
                <option value="all">Januari – Desember (Satu Tahun)</option>
                <option value="1">Semester 1 (Juli – Desember)</option>
                <option value="2">Semester 2 (Januari – Juni)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-4">
                Statistik Kehadiran Bulanan ({monthlyYear})
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Hadir" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Sakit" fill="#D97706" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Izin" fill="#0284C7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Alpa" fill="#DC2626" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Dispensasi" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-4">
                Perbandingan Persentase Kehadiran Antarkelas ({monthlyYear})
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyClassComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="kelas" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="Persentase" name="Kehadiran (%)" fill="#0891b2" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="py-3 px-4 font-bold">Bulan</th>
                    <th className="py-3 px-4 font-bold text-right">Hadir</th>
                    <th className="py-3 px-4 font-bold text-right">Sakit</th>
                    <th className="py-3 px-4 font-bold text-right">Izin</th>
                    <th className="py-3 px-4 font-bold text-right">Alpa</th>
                    <th className="py-3 px-4 font-bold text-right">Dispensasi</th>
                    <th className="py-3 px-4 font-bold text-right">Persentase Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyChartData.map((row) => (
                    <tr key={row.monthNum} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{row.fullMonth} {monthlyYear}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-700 tabular-nums">{row.Hadir}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-amber-700 tabular-nums">{row.Sakit}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-sky-700 tabular-nums">{row.Izin}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-rose-700 tabular-nums">{row.Alpa}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-violet-700 tabular-nums">{row.Dispensasi}</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 tabular-nums">
                        {row.Valid > 0 ? `${row.Persentase}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GRAFIK SEMESTER */}
      {activeTab === 'semester' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Tahun Pelajaran</label>
              <select
                value={semAcademicYear}
                onChange={(e) => setSemAcademicYear(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
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
              <label className="font-semibold text-slate-600 block mb-1">Filter Kelas</label>
              <select
                value={semClassId}
                onChange={(e) => setSemClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
              >
                <option value="all">Seluruh Kelas ({accessibleClasses.length} Kelas)</option>
                {accessibleClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Semester KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <div className="text-slate-500 font-semibold">Total Siswa</div>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">{semTotalStudents}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <div className="text-slate-500 font-semibold">Kehadiran</div>
              <div className="text-xl font-extrabold text-emerald-700 tabular-nums mt-1">{semCombinedMetrics.hadir}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <div className="text-slate-500 font-semibold">Ketidakhadiran</div>
              <div className="text-xl font-extrabold text-rose-700 tabular-nums mt-1">{semCombinedMetrics.ketidakhadiran}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <div className="text-slate-500 font-semibold">Sakit</div>
              <div className="text-xl font-extrabold text-amber-700 tabular-nums mt-1">{semCombinedMetrics.sakit}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <div className="text-slate-500 font-semibold">Izin</div>
              <div className="text-xl font-extrabold text-sky-700 tabular-nums mt-1">{semCombinedMetrics.izin}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <div className="text-slate-500 font-semibold">Alpa</div>
              <div className="text-xl font-extrabold text-rose-700 tabular-nums mt-1">{semCombinedMetrics.alpa}</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
              <div className="text-slate-500 font-semibold">Dispensasi</div>
              <div className="text-xl font-extrabold text-violet-700 tabular-nums mt-1">{semCombinedMetrics.dispensasi}</div>
            </div>
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl">
              <div className="text-cyan-300 font-semibold">Persentase</div>
              <div className="text-xl font-extrabold tabular-nums mt-1">{semCombinedMetrics.percentage}%</div>
            </div>
          </div>

          {/* 1. Semester 1 & 2. Semester 2 Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">
                1. Grafik Kehadiran Semester 1 (Juli – Desember)
              </h3>
              <p className="text-[11px] text-slate-500 mb-4 tabular-nums">
                Persentase Semester 1: <strong>{sem1Metrics.percentage}%</strong> ({sem1Metrics.validCount} catatan)
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sem1MonthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Hadir" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Sakit" fill="#D97706" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Izin" fill="#0284C7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Alpa" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">
                2. Grafik Kehadiran Semester 2 (Januari – Juni)
              </h3>
              <p className="text-[11px] text-slate-500 mb-4 tabular-nums">
                Persentase Semester 2: <strong>{sem2Metrics.percentage}%</strong> ({sem2Metrics.validCount} catatan)
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sem2MonthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Hadir" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Sakit" fill="#D97706" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Izin" fill="#0284C7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Alpa" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 3. Inter-semester comparison & 4. All Classes comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-4">
                3. Perbandingan Kehadiran Antarsemester ({semAcademicYear})
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={interSemesterComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="periode" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Hadir" fill="#059669" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Ketidakhadiran" name="Tidak Hadir (S+I+A)" fill="#DC2626" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Persentase" name="Persentase (%)" fill="#0891b2" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-4">
                4. Perbandingan Kehadiran Seluruh Kelas (TP {semAcademicYear})
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={semesterAllClassesComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="kelas" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="Persentase" name="Kehadiran (%)" fill="#0f172a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 5. Peringkat Kelas Berdasarkan Persentase Kehadiran */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5">
            <h3 className="font-bold text-sm text-slate-900 mb-4">
              5. Peringkat Kelas Berdasarkan Persentase Kehadiran (TP {semAcademicYear})
            </h3>
            <div className="space-y-3">
              {semesterClassRanking.map((item, idx) => (
                <div key={item.kelas} className="flex items-center gap-4 text-xs">
                  <div
                    className={`w-8 h-8 rounded-xl font-extrabold flex items-center justify-center shrink-0 tabular-nums ${
                      idx === 0
                        ? 'bg-cyan-600 text-white'
                        : idx === 1
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div className="w-24 font-bold text-slate-900 shrink-0">{item.kelas}</div>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-600 rounded-full transition-all"
                      style={{ width: `${Math.min(100, item.Persentase)}%` }}
                    />
                  </div>
                  <div className="w-32 text-right text-slate-500 hidden sm:block tabular-nums">
                    {item.Hadir} H / {item.Ketidakhadiran} Tidak Hadir
                  </div>
                  <div className="w-16 text-right font-extrabold text-slate-900 tabular-nums">
                    {item.valid > 0 ? `${item.Persentase}%` : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
