import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Activity,
  Monitor,
  MonitorCheck,
  MonitorPlay,
  AlertTriangle,
  Users,
  Clock,
  Search,
  ArrowRight,
  Wrench,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import {
  getJakartaNow,
  getLastCompletedUsageForComputer,
  getActiveUsageForComputer,
  resolveComputerOperationalStatus,
  getStatusVisualMeta,
  formatDurationIndonesian,
} from '../../utils/computerUsageUtils';

interface UsageDashboardViewProps {
  onSelectMenu: (menuId: string) => void;
}

const PIE_COLORS = ['#0891b2', '#2563eb', '#d97706', '#059669'];

export const UsageDashboardView: React.FC<UsageDashboardViewProps> = ({ onSelectMenu }) => {
  const {
    computers,
    computerUsages,
    computerDamageReports,
    schoolClasses,
    hasPermission,
  } = useApp();

  const jakartaNow = getJakartaNow();
  const [lookupPcId, setLookupPcId] = useState<string>(() => computers[0]?.id || '');

  const currentMonth = jakartaNow.dateStr.slice(0, 7);

  // 10 Real KPI Metrics (No Dummy Data)
  const kpis = useMemo(() => {
    const todayUsages = computerUsages.filter((u) => u.usageDate === jakartaNow.dateStr);
    const monthUsages = computerUsages.filter((u) => (u.usageDate || '').startsWith(currentMonth));
    const uniqueUsersToday = new Set(todayUsages.map((u) => u.userName)).size;

    let tersedia = 0;
    let sedangDigunakan = 0;
    let perluPeriksa = 0;
    let rusak = 0;
    let dalamPerbaikan = 0;

    for (const pc of computers) {
      const st = resolveComputerOperationalStatus(pc, computerUsages, computerDamageReports);
      if (st === 'TERSEDIA') tersedia++;
      else if (st === 'SEDANG DIGUNAKAN') sedangDigunakan++;
      else if (st === 'PERLU PEMERIKSAAN') perluPeriksa++;
      else if (st === 'RUSAK') rusak++;
      else if (st === 'DALAM PERBAIKAN') dalamPerbaikan++;
    }

    const activeDamages = computerDamageReports.filter(
      (d) => d.followUpStatus !== 'Selesai Diperbaiki'
    ).length;

    return {
      totalPc: computers.length,
      tersedia,
      sedangDigunakan,
      perluPeriksa,
      rusak,
      dalamPerbaikan,
      todayCount: todayUsages.length,
      monthCount: monthUsages.length,
      uniqueUsersToday,
      activeDamages,
    };
  }, [computers, computerUsages, computerDamageReports, jakartaNow.dateStr, currentMonth]);

  // Chart: Harian 7 Hari Terakhir (Asia/Jakarta)
  const dailyChartData = useMemo(() => {
    const days: { date: string; label: string; sesi: number; menit: number }[] = [];
    const base = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base.getTime() - i * 86400000);
      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
      const label = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
      }).format(d);
      const matched = computerUsages.filter((u) => u.usageDate === dateStr);
      days.push({
        date: dateStr,
        label,
        sesi: matched.length,
        menit: matched.reduce((a, b) => a + (b.durationMinutes || 0), 0),
      });
    }
    return days;
  }, [computerUsages]);

  // Chart: Penggunaan Per Kelas (9 Kelas Tetap)
  const classChartData = useMemo(() => {
    return schoolClasses.map((cls) => ({
      name: cls.name,
      sesi: computerUsages.filter(
        (u) => u.userType === 'Siswa' && u.studentClass === cls.name
      ).length,
    }));
  }, [schoolClasses, computerUsages]);

  // Chart: Per Jenis Pengguna
  const userTypeChartData = useMemo(() => {
    const types = ['Siswa', 'Guru/Tendik', 'Teknisi/Laboran', 'Tamu'] as const;
    return types
      .map((t) => ({
        name: t,
        value: computerUsages.filter((u) => u.userType === t).length,
      }))
      .filter((x) => x.value > 0);
  }, [computerUsages]);

  // Ranking Komputer Paling Sering & Jarang Digunakan
  const usageRanking = useMemo(() => {
    return computers
      .map((pc) => {
        const list = computerUsages.filter((u) => u.computerId === pc.id);
        return {
          pc,
          sessions: list.length,
          minutes: list.reduce((a, b) => a + (b.durationMinutes || 0), 0),
        };
      })
      .sort((a, b) => b.sessions - a.sessions || b.minutes - a.minutes);
  }, [computers, computerUsages]);

  const mostUsed = usageRanking.slice(0, 5);
  const leastUsed = [...usageRanking].reverse().slice(0, 5);

  const selectedLookupPc = computers.find((c) => c.id === lookupPcId) || computers[0];
  const lookupActive = selectedLookupPc
    ? getActiveUsageForComputer(selectedLookupPc.id, computerUsages)
    : undefined;
  const lookupLastCompleted = selectedLookupPc
    ? getLastCompletedUsageForComputer(selectedLookupPc.id, computerUsages)
    : undefined;
  const lookupOpStatus = selectedLookupPc
    ? resolveComputerOperationalStatus(selectedLookupPc, computerUsages, computerDamageReports)
    : 'TERSEDIA';

  const activeSessions = computerUsages.filter((u) => u.usageStatus === 'Sedang Digunakan');
  const recentLogs = computerUsages.slice(0, 6);
  const recentDamages = computerDamageReports.slice(0, 4);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-cyan-600" />
            Dashboard Penggunaan Komputer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pemantauan langsung penggunaan workstation laboratorium oleh Siswa, Guru/Tendik, Teknisi, dan Tamu ({jakartaNow.displayDateTime}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('recordComputerUsage') && (
            <button
              onClick={() => onSelectMenu('usage_input')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <MonitorPlay className="w-4 h-4 text-cyan-400" />
              Mulai / Input Penggunaan
            </button>
          )}
          <button
            onClick={() => onSelectMenu('usage_history')}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4 text-cyan-600" />
            Cek Pemakai Terakhir
          </button>
        </div>
      </div>

      {/* 10 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">Total Komputer</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{kpis.totalPc}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Unit Lab Komputer</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-700">Komputer Tersedia</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">{kpis.tersedia}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Siap Digunakan</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-cyan-200 shadow-xs">
          <div className="text-[11px] font-semibold text-cyan-700">Sedang Digunakan</div>
          <div className="text-2xl font-extrabold text-cyan-700 mt-1 tabular-nums">{kpis.sedangDigunakan}</div>
          <div className="text-[10px] text-cyan-600 mt-0.5">Sesi Aktif Berjalan</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
          <div className="text-[11px] font-semibold text-amber-700">Perlu Pemeriksaan</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1 tabular-nums">{kpis.perluPeriksa}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Menunggu Cek Teknisi</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs">
          <div className="text-[11px] font-semibold text-rose-700">Rusak / Perbaikan</div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1 tabular-nums">
            {kpis.rusak} / {kpis.dalamPerbaikan}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5">Rusak / Dlm Perbaikan</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">Penggunaan Hari Ini</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{kpis.todayCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Tanggal {jakartaNow.dateStr}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">Penggunaan Bulan Ini</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{kpis.monthCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Periode {currentMonth}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">Total Pemakai Hari Ini</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{kpis.uniqueUsersToday}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Pengguna Unik</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">Total Riwayat Tercatat</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{computerUsages.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Seluruh Transaksi</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs">
          <div className="text-[11px] font-semibold text-rose-700">Laporan Kerusakan Aktif</div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1 tabular-nums">{kpis.activeDamages}</div>
          <div className="text-[10px] text-rose-600 mt-0.5">Belum Selesai Diperbaiki</div>
        </div>
      </div>

      {/* Quick Lookup: SIAPA PEMAKAI TERAKHIR KOMPUTER? */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-600" />
              Siapa Pemakai Terakhir Komputer Ini?
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pilih unit komputer untuk langsung menelusuri pengguna aktif atau transaksi terakhir yang selesai.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedLookupPc?.id || ''}
              onChange={(e) => setLookupPcId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
            >
              {computers.map((pc) => (
                <option key={pc.id} value={pc.id}>
                  {pc.computerCode} — {pc.deviceName}
                </option>
              ))}
            </select>
            <button
              onClick={() => onSelectMenu('usage_history')}
              className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer flex items-center gap-1"
            >
              Riwayat Lengkap <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {selectedLookupPc && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-400">Identitas & Status Komputer</div>
              <div className="font-extrabold text-slate-900 text-sm mt-1">
                {selectedLookupPc.computerCode} ({selectedLookupPc.inventoryNumber})
              </div>
              <div className="text-slate-600 mt-0.5">{selectedLookupPc.deviceName}</div>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${getStatusVisualMeta(lookupOpStatus).badgeClass}`}
                >
                  <span className={`w-2 h-2 rounded-full ${getStatusVisualMeta(lookupOpStatus).dotColorClass}`} />
                  {lookupOpStatus}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-cyan-50/50 border border-cyan-200">
              <div className="text-[10px] font-bold uppercase text-cyan-800">Pemakai Terakhir (Selesai)</div>
              {lookupLastCompleted ? (
                <>
                  <div className="font-extrabold text-slate-900 text-sm mt-1">
                    {lookupLastCompleted.userName}
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    {lookupLastCompleted.userType}
                    {lookupLastCompleted.studentClass ? ` • ${lookupLastCompleted.studentClass}` : ''}
                    {lookupLastCompleted.externalInstitution ? ` • ${lookupLastCompleted.externalInstitution}` : ''}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                    {lookupLastCompleted.usageDate} ({lookupLastCompleted.startTime} - {lookupLastCompleted.endTime} WIB) • {lookupLastCompleted.duration}
                  </div>
                </>
              ) : (
                <div className="text-slate-500 italic mt-2">
                  Belum ada transaksi penggunaan yang selesai pada komputer ini.
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-400">Penggunaan Aktif Saat Ini</div>
              {lookupActive ? (
                <>
                  <div className="font-extrabold text-cyan-800 text-sm mt-1">{lookupActive.userName}</div>
                  <div className="text-slate-600 mt-0.5">
                    {lookupActive.userType} • Mulai {lookupActive.startTime} WIB
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">
                    Tujuan: {lookupActive.purpose}
                  </div>
                </>
              ) : (
                <div className="text-slate-500 mt-2">Tidak ada sesi yang sedang berjalan.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-600" />
                Grafik Penggunaan Komputer 7 Hari Terakhir
              </h3>
              <p className="text-[11px] text-slate-500">Jumlah sesi pemakaian per hari (WIB)</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Bar dataKey="sesi" name="Jumlah Sesi" fill="#0891b2" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-cyan-600" />
            Distribusi Jenis Pengguna
          </h3>
          <p className="text-[11px] text-slate-500 mb-3">Siswa, Guru/Tendik, Teknisi, Tamu</p>
          {userTypeChartData.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userTypeChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={72}
                    label
                  >
                    {userTypeChartData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400 text-center px-4">
              Belum ada data transaksi penggunaan komputer tercatat. Gunakan menu Input Penggunaan untuk memulai.
            </div>
          )}
        </div>
      </div>

      {/* Grafik Per 9 Kelas Tetap + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-900 mb-1">
            Penggunaan Komputer Berdasarkan 9 Kelas Tetap
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">
            Integrasi langsung dengan data siswa kelas X, XI, XII (AKL, DKV, ATPH)
          </p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#334155' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Bar dataKey="sesi" name="Sesi Siswa" fill="#1e293b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <MonitorCheck className="w-4 h-4 text-emerald-600" />
              Paling Sering Digunakan
            </h3>
            <div className="mt-2 space-y-1.5 text-xs">
              {mostUsed.map((item) => (
                <div
                  key={item.pc.id}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50"
                >
                  <span className="font-bold text-slate-800">{item.pc.computerCode}</span>
                  <span className="text-slate-600 tabular-nums">
                    {item.sessions} sesi ({formatDurationIndonesian(item.minutes)})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-amber-600" />
              Jarang Digunakan
            </h3>
            <div className="mt-2 space-y-1.5 text-xs">
              {leastUsed.map((item) => (
                <div
                  key={item.pc.id}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50"
                >
                  <span className="font-bold text-slate-800">{item.pc.computerCode}</span>
                  <span className="text-slate-500 tabular-nums">{item.sessions} sesi</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions & Latest Damage & Latest Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-600" />
              Sesi Penggunaan Aktif & Terbaru
            </h3>
            <button
              onClick={() => onSelectMenu('usage_input')}
              className="text-xs font-bold text-cyan-700 hover:underline cursor-pointer"
            >
              Kelola ({activeSessions.length} Aktif)
            </button>
          </div>
          {recentLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              Belum ada aktivitas penggunaan komputer.
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {recentLogs.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">
                      {u.computerCode} — {u.userName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {u.userType}
                      {u.studentClass ? ` (${u.studentClass})` : ''} • {u.usageDate} {u.startTime}
                      {u.endTime ? ` - ${u.endTime}` : ' WIB'}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                      u.usageStatus === 'Sedang Digunakan'
                        ? 'bg-cyan-100 text-cyan-900'
                        : u.usageStatus === 'Selesai'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {u.usageStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Daftar Kerusakan Komputer Terbaru
            </h3>
            <button
              onClick={() => onSelectMenu('usage_damage')}
              className="text-xs font-bold text-cyan-700 hover:underline cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>
          {recentDamages.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl flex flex-col items-center gap-2">
              <Wrench className="w-5 h-5 text-slate-300" />
              <span>Tidak ada laporan kerusakan penggunaan komputer tercatat.</span>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {recentDamages.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-2xl border border-rose-100 bg-rose-50/40 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900">
                      {d.computerCode} — {d.damageType}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate">{d.damageDescription}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Pemakai terakhir (kronologi): {d.lastUserName || '-'} • {d.discoveredAt}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-rose-200 text-rose-800 text-[10px] font-bold shrink-0">
                    {d.followUpStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
