import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, ClassAttendanceRecord } from '../../types';
import {
  calculateAttendanceMetrics,
  getSemesterRange,
  getWeekDatesInMonth,
  MONTH_NAMES_ID,
  STATUS_LABELS,
} from '../../utils/attendanceUtils';
import {
  X,
  User,
  Calendar,
  CheckCircle2,
  Thermometer,
  FileText,
  AlertTriangle,
  Award,
  History,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { ConfirmModal } from '../../components/ConfirmModal';

interface StudentDetailModalProps {
  student: Student | null;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose }) => {
  const {
    classAttendances,
    attendanceLogs,
    attendanceSettings,
    academicYears,
    hasPermission,
    deleteClassAttendance,
  } = useApp();

  const [periodMode, setPeriodMode] = useState<'all' | 'week' | 'month' | 'semester'>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>(
    attendanceSettings.activeSemester || '1'
  );
  const [deleteTarget, setDeleteTarget] = useState<ClassAttendanceRecord | null>(null);

  const canDelete = hasPermission('inputClassAttendance') || hasPermission('crudAllData');

  const studentRecords = useMemo(() => {
    if (!student) return [];
    const base = classAttendances.filter((r) => r.studentId === student.id);
    if (periodMode === 'all') return base;

    if (periodMode === 'week') {
      const dates = getWeekDatesInMonth(selectedYear, selectedMonth, selectedWeek);
      return base.filter((r) => dates.includes(r.date));
    }

    if (periodMode === 'month') {
      const prefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      return base.filter((r) => r.date.startsWith(prefix));
    }

    const range = getSemesterRange(
      attendanceSettings.activeAcademicYear || '2026/2027',
      selectedSemester,
      academicYears
    );
    return base.filter((r) => r.date >= range.startDate && r.date <= range.endDate);
  }, [
    student,
    classAttendances,
    periodMode,
    selectedYear,
    selectedMonth,
    selectedWeek,
    selectedSemester,
    attendanceSettings.activeAcademicYear,
    academicYears,
  ]);

  const metrics = useMemo(() => calculateAttendanceMetrics(studentRecords), [studentRecords]);

  const studentLogs = useMemo(() => {
    if (!student) return [];
    return attendanceLogs.filter((l) => l.studentId === student.id);
  }, [student, attendanceLogs]);

  if (!student) return null;

  const chartData = [
    { name: 'Hadir', value: metrics.hadir, color: '#059669' },
    { name: 'Sakit', value: metrics.sakit, color: '#D97706' },
    { name: 'Izin', value: metrics.izin, color: '#0284C7' },
    { name: 'Alpa', value: metrics.alpa, color: '#DC2626' },
    { name: 'Dispen', value: metrics.dispensasi, color: '#7C3AED' },
  ];

  const getBadgeClass = (status: string) => {
    switch (status) {
      case 'H':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'S':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'I':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'A':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'D':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-extrabold text-base flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base truncate">{student.fullName}</h3>
              <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                <span>NIS: {student.nis}</span>
                <span aria-hidden="true">·</span>
                <span>NISN: {student.nisn || '-'}</span>
                <span aria-hidden="true">·</span>
                <span className="text-cyan-300 font-bold">{student.className}</span>
                <span aria-hidden="true">·</span>
                <span>{student.status}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto text-xs">
          {/* Identity & Period Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900 text-xs mb-1">Identitas Siswa</div>
              <div className="flex justify-between">
                <span className="text-slate-500">Program Keahlian</span>
                <span className="font-semibold text-slate-800 text-right">{student.major}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jenis Kelamin</span>
                <span className="font-semibold text-slate-800">{student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tahun Pelajaran</span>
                <span className="font-semibold text-slate-800">{student.academicYear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Wali Kelas</span>
                <span className="font-semibold text-slate-800 text-right">{student.homeroomTeacher || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Telepon Orang Tua</span>
                <span className="font-mono text-slate-800">{student.parentPhone || '-'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">Alamat</span>
                <span className="text-slate-700 text-right">{student.address || '-'}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cyan-600" />
                Filter Periode Kehadiran
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'week', label: 'Mingguan' },
                  { id: 'month', label: 'Bulanan' },
                  { id: 'semester', label: 'Semester' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPeriodMode(tab.id as 'all' | 'week' | 'month' | 'semester')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      periodMode === tab.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {periodMode === 'week' && (
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 font-semibold"
                  >
                    {[1, 2, 3, 4, 5].map((w) => (
                      <option key={w} value={w}>Minggu {w}</option>
                    ))}
                  </select>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 font-semibold"
                  >
                    {MONTH_NAMES_ID.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 font-semibold"
                  />
                </div>
              )}

              {periodMode === 'month' && (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 font-semibold"
                  >
                    {MONTH_NAMES_ID.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 font-semibold"
                  />
                </div>
              )}

              {periodMode === 'semester' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSemester('1')}
                    className={`py-1.5 rounded-lg font-bold border cursor-pointer ${
                      selectedSemester === '1'
                        ? 'bg-cyan-600 text-white border-cyan-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Semester 1 (Jul-Des)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSemester('2')}
                    className={`py-1.5 rounded-lg font-bold border cursor-pointer ${
                      selectedSemester === '2'
                        ? 'bg-cyan-600 text-white border-cyan-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Semester 2 (Jan-Jun)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 6 KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-between text-emerald-700 font-semibold mb-1">
                <span>Hadir</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-900 tabular-nums">{metrics.hadir}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between text-amber-700 font-semibold mb-1">
                <span>Sakit</span>
                <Thermometer className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-amber-900 tabular-nums">{metrics.sakit}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200">
              <div className="flex items-center justify-between text-sky-700 font-semibold mb-1">
                <span>Izin</span>
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-sky-900 tabular-nums">{metrics.izin}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
              <div className="flex items-center justify-between text-rose-700 font-semibold mb-1">
                <span>Alpa</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-rose-900 tabular-nums">{metrics.alpa}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-violet-50 border border-violet-200">
              <div className="flex items-center justify-between text-violet-700 font-semibold mb-1">
                <span>Dispen</span>
                <Award className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-violet-900 tabular-nums">{metrics.dispensasi}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white">
              <div className="text-cyan-300 font-semibold mb-1">Kehadiran</div>
              <div className="text-2xl font-extrabold tabular-nums">{metrics.percentage}%</div>
              <div className="text-[10px] text-slate-400">dari {metrics.validCount} catatan valid</div>
            </div>
          </div>

          {/* Student Chart */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-3">Grafik Kehadiran Siswa</h4>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Jumlah Hari">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Attendance History Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900">Riwayat Absensi ({studentRecords.length} Catatan)</h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Tanggal</th>
                      <th className="py-2.5 px-3 font-bold">Sesi</th>
                      <th className="py-2.5 px-3 font-bold text-center">Status</th>
                      <th className="py-2.5 px-3 font-bold">Keterangan</th>
                      <th className="py-2.5 px-3 font-bold">Petugas Input</th>
                      {canDelete && <th className="py-2.5 px-3 font-bold text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentRecords.length === 0 ? (
                      <tr>
                        <td colSpan={canDelete ? 6 : 5} className="py-6 text-center text-slate-400">
                          Belum ada catatan absensi pada periode yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      studentRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-semibold text-slate-800">{r.date}</td>
                          <td className="py-2 px-3 text-slate-600">{r.session || 'Harian'}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-md border font-bold text-[10px] ${getBadgeClass(r.status)}`}>
                              {r.status} · {STATUS_LABELS[r.status]}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{r.description || '-'}</td>
                          <td className="py-2 px-3 text-slate-500">{r.recordedBy}</td>
                          {canDelete && (
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(r)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Hapus catatan absensi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Audit Logs: Riwayat Perubahan Data Absensi */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <History className="w-4 h-4 text-cyan-600" />
              Riwayat Perubahan Data Absensi ({studentLogs.length})
            </h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 divide-y divide-slate-200 max-h-48 overflow-y-auto">
              {studentLogs.length === 0 ? (
                <div className="p-4 text-center text-slate-400">Belum ada riwayat perubahan data absensi untuk siswa ini.</div>
              ) : (
                studentLogs.map((lg) => (
                  <div key={lg.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white">
                    <div>
                      <span className="font-bold text-slate-900">
                        [{lg.action}] Tanggal {lg.date} ({lg.session})
                      </span>
                      <div className="text-slate-600 mt-0.5">
                        {lg.action === 'CREATE' && `Status awal dicatat: ${lg.newStatus} (${STATUS_LABELS[lg.newStatus || 'H']})`}
                        {lg.action === 'UPDATE' && `Diubah dari ${lg.previousStatus} → ${lg.newStatus}`}
                        {lg.action === 'DELETE' && `Dihapus (status sebelumnya: ${lg.previousStatus})`}
                        {lg.newDescription ? ` · Ket: ${lg.newDescription}` : ''}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500 shrink-0">
                      <div className="font-semibold text-slate-700">{lg.officerName}</div>
                      <div className="font-mono">{new Date(lg.timestamp).toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Catatan Absensi?"
        message={
          deleteTarget
            ? `Catatan absensi ${deleteTarget.studentName} tanggal ${deleteTarget.date} akan dihapus dan tercatat dalam log audit.`
            : ''
        }
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteClassAttendance(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
