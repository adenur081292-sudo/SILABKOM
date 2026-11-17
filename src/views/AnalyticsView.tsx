import React from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Monitor,
  Activity,
  Users,
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
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

export const AnalyticsView: React.FC = () => {
  const {
    computers,
    equipment,
    laboratories,
    schedules,
    maintenanceList,
    damageReports,
    guests,
  } = useApp();

  // 1. Condition comparison
  const conditionData = [
    { name: 'Baik', value: computers.filter((c) => c.condition === 'Baik').length, color: '#10b981' },
    { name: 'Rusak Ringan', value: computers.filter((c) => c.condition === 'Rusak Ringan').length, color: '#f59e0b' },
    { name: 'Rusak Berat', value: computers.filter((c) => c.condition === 'Rusak Berat').length, color: '#ef4444' },
    { name: 'Dalam Perbaikan', value: computers.filter((c) => c.condition === 'Dalam Perbaikan').length, color: '#3b82f6' },
  ].filter((d) => d.value > 0);

  // 2. Inventory by equipment category
  const categoryMap: Record<string, number> = {};
  equipment.forEach((eq) => {
    categoryMap[eq.category] = (categoryMap[eq.category] || 0) + (eq.quantity || 1);
  });
  const categoryData = Object.entries(categoryMap).map(([category, qty]) => ({
    category,
    qty,
  }));

  // 3. Devices per room (PCs and Peripherals)
  const roomDeviceData = laboratories.map((lab) => {
    const pcCount = computers.filter((c) => c.labId === lab.id).length;
    const eqCount = equipment.filter((e) => e.labId === lab.id).reduce((acc, curr) => acc + (curr.quantity || 1), 0);
    return {
      name: lab.name.replace('Laboratorium ', 'Lab '),
      komputer: pcCount,
      perangkatLain: eqCount,
    };
  });

  // 4. Monthly damage & maintenance trend
  const monthData = [
    { month: 'Jul', kerusakan: 1, pemeliharaan: 2, biaya: 250000 },
    { month: 'Agu', kerusakan: 2, pemeliharaan: 3, biaya: 420000 },
    { month: 'Sep', kerusakan: 3, pemeliharaan: 2, biaya: 310000 },
    { month: 'Okt', kerusakan: 1, pemeliharaan: 4, biaya: 580000 },
    { month: 'Nov', kerusakan: damageReports.length, pemeliharaan: maintenanceList.length, biaya: maintenanceList.reduce((s, m) => s + (m.cost || 0), 0) },
  ];

  // 5. Practical Visits by Class
  const classVisitMap: Record<string, number> = {};
  schedules.forEach((sch) => {
    classVisitMap[sch.classGrade] = (classVisitMap[sch.classGrade] || 0) + (sch.studentCount || 0);
  });
  const classVisitData = Object.entries(classVisitMap).map(([kelas, siswa]) => ({
    kelas,
    siswa,
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-cyan-600" />
          Grafik & Analitik Statistik Laboratorium
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Visualisasi data kondisi perangkat, kapasitas laboratorium, riwayat kerusakan, dan tren kehadiran praktikum siswa secara real-time.
        </p>
      </div>

      {/* Row 1: Condition & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Condition Pie */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Perbandingan Kondisi Komputer</h3>
              <p className="text-xs text-slate-500">Persentase kesehatan seluruh PC workstation</p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {computers.length} Unit Total
            </span>
          </div>

          <div className="h-64 flex items-center justify-center">
            {conditionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conditionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {conditionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} Unit`, 'Jumlah']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs">Belum ada data komputer</div>
            )}
          </div>
        </div>

        {/* Categories Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Inventaris Berdasarkan Kategori</h3>
              <p className="text-xs text-slate-500">Distribusi jumlah unit alat pendukung praktikum</p>
            </div>
            <span className="text-xs font-bold text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-lg">
              {categoryData.length} Kategori
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#64748b' }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} Unit`, 'Kuantitas']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1' }}
                />
                <Bar dataKey="qty" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Devices per room & Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Devices per room */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Alokasi Perangkat Berdasarkan Ruangan</h3>
              <p className="text-xs text-slate-500">Perbandingan PC dan perangkat pendukung per lab</p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {laboratories.length} Ruangan
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomDeviceData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-10} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1' }} />
                <Legend verticalAlign="bottom" height={30} />
                <Bar name="Komputer PC" dataKey="komputer" fill="#0f172a" radius={[6, 6, 0, 0]} />
                <Bar name="Perangkat Pendukung" dataKey="perangkatLain" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Tren Kerusakan & Pemeliharaan Bulanan</h3>
              <p className="text-xs text-slate-500">Grafik frekuensi insiden dan tindakan perbaikan</p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
              Semester Berjalan
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1' }} />
                <Legend verticalAlign="bottom" height={30} />
                <Line
                  type="monotone"
                  name="Laporan Kerusakan"
                  dataKey="kerusakan"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  name="Pemeliharaan Selesai"
                  dataKey="pemeliharaan"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Visits by Class */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Total Kunjungan Siswa Berdasarkan Kelas</h3>
            <p className="text-xs text-slate-500">Akumulasi intensitas pembelajaran praktik di lab komputer</p>
          </div>
        </div>

        <div className="h-60">
          {classVisitData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classVisitData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="kelas" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} Siswa`, 'Total Kehadiran']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1' }}
                />
                <Bar dataKey="siswa" fill="#0891b2" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Belum ada data jadwal praktikum
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
