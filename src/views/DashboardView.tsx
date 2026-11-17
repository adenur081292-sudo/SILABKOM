import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ShareLoginLinkCard } from '../components/ShareLoginLinkCard';
import {
  getJakartaNow,
  getLastCompletedUsageForComputer,
  resolveComputerOperationalStatus,
  getStatusVisualMeta,
} from '../utils/computerUsageUtils';
import {
  Monitor,
  Building2,
  CalendarCheck2,
  ArrowLeftRight,
  Wrench,
  AlertOctagon,
  Users,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  Clock,
  Activity,
  GraduationCap,
  MonitorPlay,
  History,
  UserCheck,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface DashboardViewProps {
  onSelectMenu: (menuId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectMenu }) => {
  const {
    laboratories,
    computers,
    equipment,
    schedules,
    borrowings,
    maintenanceList,
    damageReports,
    computerDamageReports,
    activityLogs,
    students,
    guests,
    externalUsers,
    computerUsages,
    canAccessMenu,
    hasPermission,
    isSuperAdmin,
    activeRoleObject,
    settings,
  } = useApp();

  const jakartaNow = useMemo(() => getJakartaNow(), []);
  const todayStr = jakartaNow.dateStr;

  const goodComputers = computers.filter((c) => c.condition === 'Baik').length;
  const damagedComputers = computers.filter((c) => c.condition.includes('Rusak')).length;
  const repairComputers = computers.filter((c) => c.condition === 'Dalam Perbaikan').length;

  const activeBorrowings = borrowings.filter((b) => b.status === 'Dipinjam').length;
  const pendingDamage = damageReports.filter((d) => d.status === 'Menunggu Verifikasi').length;
  const openUsageDamages = computerDamageReports.filter((d) => d.followUpStatus !== 'Selesai Diperbaiki').length;
  const activeSchedules = schedules.filter(
    (s) => s.status === 'Disetujui' || s.status === 'Sedang Berlangsung'
  ).length;
  const activeStudents = students.filter((s) => s.status === 'Aktif').length;
  const totalGuests = guests.length + externalUsers.length;
  const activeUsageSessions = computerUsages.filter((u) => u.usageStatus === 'Sedang Digunakan');
  const todayUsages = computerUsages.filter((u) => u.usageDate === todayStr && u.usageStatus !== 'Dibatalkan');

  // Condition Pie Data
  const conditionChartData = [
    { name: 'Baik', value: goodComputers, color: '#10b981' },
    {
      name: 'Rusak Ringan',
      value: computers.filter((c) => c.condition === 'Rusak Ringan').length,
      color: '#f59e0b',
    },
    {
      name: 'Rusak Berat',
      value: computers.filter((c) => c.condition === 'Rusak Berat').length,
      color: '#f43f5e',
    },
    { name: 'Dalam Perbaikan', value: repairComputers, color: '#3b82f6' },
  ].filter((d) => d.value > 0);

  // Usage by Day (Last 7 Days)
  const weeklyUsageData = useMemo(() => {
    const res: { label: string; sesi: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const lbl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      res.push({
        label: lbl,
        sesi: computerUsages.filter((u) => u.usageDate === iso && u.usageStatus !== 'Dibatalkan').length,
      });
    }
    return res;
  }, [computerUsages]);

  // Computer cards sorted by code
  const sortedComputers = useMemo(
    () =>
      [...computers].sort((a, b) =>
        a.computerCode.localeCompare(b.computerCode, undefined, { numeric: true })
      ),
    [computers]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Classic Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[11px] font-bold">
              <span>{settings.schoolName || 'SMKN 15 PANDEGLANG'}</span>
              <span>•</span>
              <span>Tahun Pelajaran {settings.academicYear || '2026/2027'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              SELAMAT DATANG DI <span className="text-cyan-400">SILABKOM</span>
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-cyan-100">
              Sistem Informasi Laboratorium Komputer SMKN 15 Pandeglang
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pusat kendali pengelolaan laboratorium komputer untuk memantau penggunaan komputer, data siswa dan tamu, inventaris, jadwal praktikum, absensi, jurnal kegiatan, peminjaman, serta laporan administrasi laboratorium secara terintegrasi.
            </p>
          </div>

          <div className="bg-slate-950/50 border border-slate-700/70 rounded-2xl p-4 sm:p-5 shrink-0 min-w-[240px] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-semibold">Peran Aktif</span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-bold">
                {isSuperAdmin ? 'Super Administrator' : activeRoleObject?.name || 'Pengguna'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800">
              <div>
                <div className="text-lg font-extrabold text-white">{computers.length}</div>
                <div className="text-[10px] text-slate-400">Unit PC</div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-emerald-400">{goodComputers}</div>
                <div className="text-[10px] text-slate-400">Kondisi Baik</div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-cyan-400">{activeUsageSessions.length}</div>
                <div className="text-[10px] text-slate-400">Sedang Pakai</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Berbagi Link Login SILABKOM (Khusus Administrator / Pengelola Akun) */}
      {(isSuperAdmin || hasPermission('manageUsers')) && <ShareLoginLinkCard compact />}

      {/* Pending Damage Alert */}
      {(pendingDamage > 0 || openUsageDamages > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-amber-950">
                Ada {pendingDamage + openUsageDamages} Laporan Kerusakan Menunggu Penanganan
              </div>
              <div className="text-xs text-amber-800">
                Segera periksa dan tindak lanjuti agar kondisi perangkat laboratorium tetap optimal.
              </div>
            </div>
          </div>
          <button
            onClick={() => onSelectMenu(openUsageDamages > 0 ? 'usage_damage' : 'damage_reports')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Lihat Laporan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => canAccessMenu('computers') && onSelectMenu('computers')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Komputer</span>
            <Monitor className="w-5 h-5 text-cyan-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{computers.length} Unit</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {goodComputers} Baik • {damagedComputers + repairComputers} Cek/Servis
          </div>
        </div>

        <div
          onClick={() => canAccessMenu('usage_input') && onSelectMenu('usage_input')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Penggunaan Hari Ini</span>
            <MonitorPlay className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{todayUsages.length} Sesi</div>
          <div className="text-[11px] text-cyan-700 font-semibold mt-1">
            {activeUsageSessions.length} Komputer sedang digunakan
          </div>
        </div>

        <div
          onClick={() => canAccessMenu('attendance_students') && onSelectMenu('attendance_students')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Siswa &amp; Tamu Lab</span>
            <GraduationCap className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{activeStudents} Siswa</div>
          <div className="text-[11px] text-slate-500 mt-1">{totalGuests} Data Tamu Eksternal</div>
        </div>

        <div
          onClick={() => canAccessMenu('schedules') && onSelectMenu('schedules')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Jadwal &amp; Peminjaman</span>
            <CalendarCheck2 className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{activeSchedules} Jadwal</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {activeBorrowings} Peminjaman Aktif • {equipment.length} Perangkat
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-slate-900">Akses Cepat Modul SILABKOM</h2>
            <p className="text-[11px] text-slate-500">Pintasan menu operasional laboratorium komputer</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {[
            { id: 'usage_input', label: 'Input Penggunaan PC', icon: MonitorPlay },
            { id: 'attendance_input', label: 'Input Absensi Kelas', icon: UserCheck },
            { id: 'practicum_journal', label: 'Jurnal Praktikum', icon: Activity },
            { id: 'computers', label: 'Inventaris PC', icon: Monitor },
            { id: 'borrowings', label: 'Peminjaman Alat', icon: ArrowLeftRight },
            { id: 'reports', label: 'Pusat Laporan', icon: FileSpreadsheet },
          ]
            .filter((item) => canAccessMenu(item.id))
            .map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectMenu(item.id)}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-left transition-all cursor-pointer flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-cyan-400 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-800 leading-snug">{item.label}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Status Komputer & Pemakai Terakhir */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-cyan-600" />
              Status Komputer &amp; Pemakai Terakhir
            </h2>
            <p className="text-xs text-slate-500">
              Pemantauan status operasional real-time dan pemakai terakhir setiap workstation
            </p>
          </div>
          {canAccessMenu('usage_status') && (
            <button
              onClick={() => onSelectMenu('usage_status')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <span>Kelola Status PC</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sortedComputers.slice(0, 12).map((pc) => {
            const opStatus = resolveComputerOperationalStatus(pc, computerUsages, computerDamageReports);
            const meta = getStatusVisualMeta(opStatus);
            const activeSession = computerUsages.find(
              (u) => u.computerId === pc.id && u.usageStatus === 'Sedang Digunakan'
            );
            const lastCompleted = getLastCompletedUsageForComputer(pc.id, computerUsages);

            return (
              <div
                key={pc.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-xs font-mono text-slate-900">{pc.computerCode}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[130px]">{pc.labName}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeClass}`}>
                    {meta.label}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/70 text-[11px]">
                  {activeSession ? (
                    <div className="text-blue-800 font-semibold truncate">
                      Aktif: {activeSession.userName}
                    </div>
                  ) : lastCompleted ? (
                    <div className="text-slate-600 truncate">
                      Pemakai terakhir: <strong className="text-slate-800">{lastCompleted.userName}</strong>
                    </div>
                  ) : (
                    <div className="text-slate-400">Belum ada riwayat pemakaian</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-1">Tren Penggunaan Komputer (7 Hari Terakhir)</h3>
          <p className="text-[11px] text-slate-500 mb-4">Jumlah sesi praktikum &amp; pemakaian PC harian</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyUsageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip />
                <Bar dataKey="sesi" name="Sesi Penggunaan" fill="#0891b2" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-1">Distribusi Kondisi Perangkat Komputer</h3>
          <p className="text-[11px] text-slate-500 mb-4">Ringkasan kelayakan unit PC di {laboratories.length} laboratorium</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={conditionChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                >
                  {conditionChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Summary: Maintenance & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-600" />
              Pemeliharaan &amp; Jadwal Terdekat
            </h3>
            <span className="text-[11px] text-slate-400">{maintenanceList.length} Catatan Servis</span>
          </div>
          <div className="space-y-2 text-xs">
            {schedules.slice(0, 4).map((s) => (
              <div key={s.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">{s.subject} — {s.classGrade}</div>
                  <div className="text-[11px] text-slate-500">{s.date} · {s.startTime} - {s.endTime} · {s.labName}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 shrink-0">
                  {s.status}
                </span>
              </div>
            ))}
            {schedules.length === 0 && (
              <div className="text-center py-6 text-slate-400">Belum ada jadwal terdaftar</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-600" />
              Aktivitas Terbaru Sistem
            </h3>
            <span className="text-[11px] text-slate-400">Log Real-Time</span>
          </div>
          <div className="space-y-2 text-xs">
            {activityLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800">{log.action}</div>
                  <div className="text-[11px] text-slate-500 truncate">{log.details}</div>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(log.timestamp).toLocaleDateString('id-ID')}
                </span>
              </div>
            ))}
            {activityLogs.length === 0 && (
              <div className="text-center py-6 text-slate-400">Belum ada aktivitas tercatat</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
