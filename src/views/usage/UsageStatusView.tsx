import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Computer, ComputerOperationalStatus } from '../../types';
import {
  getActiveUsageForComputer,
  getComputerUsageTimeline,
  getLastCompletedUsageForComputer,
  getStatusVisualMeta,
  resolveComputerOperationalStatus,
} from '../../utils/computerUsageUtils';
import {
  Monitor,
  LayoutGrid,
  Table2,
  UserCheck,
  Search,
  History,
  X,
  RefreshCw,
} from 'lucide-react';

interface UsageStatusViewProps {
  onSelectMenu: (menuId: string) => void;
}

const ALL_STATUSES: ComputerOperationalStatus[] = [
  'TERSEDIA',
  'SEDANG DIGUNAKAN',
  'PERLU PEMERIKSAAN',
  'RUSAK',
  'DALAM PERBAIKAN',
  'TIDAK DIGUNAKAN',
];

export const UsageStatusView: React.FC<UsageStatusViewProps> = ({ onSelectMenu }) => {
  const {
    computers,
    computerUsages,
    computerDamageReports,
    currentRole,
    hasPermission,
    updateComputerOperationalStatusManual,
  } = useApp();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [inspectPc, setInspectPc] = useState<Computer | null>(null);
  const [statusEditPc, setStatusEditPc] = useState<Computer | null>(null);
  const [newManualStatus, setNewManualStatus] = useState<ComputerOperationalStatus>('TERSEDIA');
  const [statusChangeReason, setStatusChangeReason] = useState<string>('');

  const canChangeStatus =
    currentRole === 'admin' ||
    currentRole === 'teknisi' ||
    currentRole === 'kepala_lab' ||
    hasPermission('manageComputerDamageFollowUp');

  const sortedComputers = useMemo(() => {
    return [...computers].sort((a, b) => {
      const na = parseInt(a.computerCode.replace(/[^0-9]/g, ''), 10) || 0;
      const nb = parseInt(b.computerCode.replace(/[^0-9]/g, ''), 10) || 0;
      return na - nb || a.computerCode.localeCompare(b.computerCode);
    });
  }, [computers]);

  const enrichedComputers = useMemo(() => {
    return sortedComputers.map((pc) => {
      const opStatus = resolveComputerOperationalStatus(pc, computerUsages, computerDamageReports);
      const activeUsage = getActiveUsageForComputer(pc.id, computerUsages);
      const lastCompleted = getLastCompletedUsageForComputer(pc.id, computerUsages);
      const timeline = getComputerUsageTimeline(pc.id, computerUsages);
      return {
        pc,
        opStatus,
        activeUsage,
        lastCompleted,
        totalSessions: timeline.length,
        timeline,
      };
    });
  }, [sortedComputers, computerUsages, computerDamageReports]);

  const statusCounts = useMemo(() => {
    const counts: Record<ComputerOperationalStatus, number> = {
      TERSEDIA: 0,
      'SEDANG DIGUNAKAN': 0,
      'PERLU PEMERIKSAAN': 0,
      RUSAK: 0,
      'DALAM PERBAIKAN': 0,
      'TIDAK DIGUNAKAN': 0,
    };
    for (const item of enrichedComputers) {
      counts[item.opStatus]++;
    }
    return counts;
  }, [enrichedComputers]);

  const filteredList = useMemo(() => {
    return enrichedComputers.filter((item) => {
      if (statusFilter !== 'ALL' && item.opStatus !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCode = item.pc.computerCode.toLowerCase().includes(q);
        const matchName = item.pc.deviceName.toLowerCase().includes(q);
        const matchInv = item.pc.inventoryNumber.toLowerCase().includes(q);
        const matchUser =
          (item.activeUsage?.userName || '').toLowerCase().includes(q) ||
          (item.lastCompleted?.userName || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchInv && !matchUser) return false;
      }
      return true;
    });
  }, [enrichedComputers, statusFilter, search]);

  const handleSaveManualStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusEditPc) return;
    const res = await updateComputerOperationalStatusManual(
      statusEditPc.id,
      newManualStatus,
      statusChangeReason
    );
    if (res.success) {
      setStatusEditPc(null);
      setStatusChangeReason('');
    }
  };

  const inspectItem = inspectPc
    ? enrichedComputers.find((i) => i.pc.id === inspectPc.id)
    : undefined;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Monitor className="w-6 h-6 text-cyan-600" />
            Status Operasional Komputer Laboratorium
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pemantauan 6 status unit workstation terintegrasi real-time dengan transaksi penggunaan dan laporan kerusakan.
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Kartu PC
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" /> Tabel Detail
          </button>
        </div>
      </div>

      {/* 6 Status Filter Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {ALL_STATUSES.map((st) => {
          const meta = getStatusVisualMeta(st);
          const isSelected = statusFilter === st;
          return (
            <button
              key={st}
              onClick={() => setStatusFilter(isSelected ? 'ALL' : st)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`w-2.5 h-2.5 rounded-full ${meta.dotColorClass}`} />
                <span className="text-lg font-extrabold tabular-nums">{statusCounts[st]}</span>
              </div>
              <div className={`text-[10px] font-bold mt-1.5 ${isSelected ? 'text-cyan-300' : 'text-slate-600'}`}>
                {st}
              </div>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode PC (PC-1), nomor inventaris, atau nama pemakai terakhir..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
          />
        </div>
        {statusFilter !== 'ALL' && (
          <button
            onClick={() => setStatusFilter('ALL')}
            className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
          >
            Tampilkan Semua ({enrichedComputers.length})
          </button>
        )}
      </div>

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredList.map(({ pc, opStatus, activeUsage, lastCompleted, totalSessions }) => {
            const meta = getStatusVisualMeta(opStatus);
            return (
              <div
                key={pc.id}
                className={`bg-white rounded-3xl border p-4 shadow-xs flex flex-col justify-between transition-all ${meta.cardBorderClass}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-extrabold text-slate-900">{pc.computerCode}</div>
                      <div className="text-[11px] font-medium text-slate-600 truncate max-w-[180px]">
                        {pc.deviceName}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-lg border text-[9px] font-extrabold shrink-0 ${meta.badgeClass}`}
                    >
                      {opStatus}
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400">{pc.inventoryNumber}</div>

                  {activeUsage ? (
                    <div className="p-2.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-xs">
                      <div className="text-[10px] font-bold text-cyan-800 uppercase">Sedang Dipakai Oleh</div>
                      <div className="font-bold text-slate-900 truncate">{activeUsage.userName}</div>
                      <div className="text-[10px] text-slate-600">
                        {activeUsage.userType} • Mulai {activeUsage.startTime} WIB
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Pemakai Terakhir</div>
                      {lastCompleted ? (
                        <>
                          <div className="font-bold text-slate-900 truncate">{lastCompleted.userName}</div>
                          <div className="text-[10px] text-slate-500">
                            {lastCompleted.usageDate} • Kondisi: {lastCompleted.conditionAfter || lastCompleted.conditionBefore}
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic mt-0.5">Belum ada riwayat pakai</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                  <span className="text-slate-400 font-semibold tabular-nums">{totalSessions} sesi</span>
                  <div className="flex items-center gap-1.5">
                    {canChangeStatus && opStatus !== 'SEDANG DIGUNAKAN' && (
                      <button
                        onClick={() => {
                          setStatusEditPc(pc);
                          setNewManualStatus(opStatus);
                          setStatusChangeReason('');
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        title="Ubah Status Operasional"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setInspectPc(pc)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer flex items-center gap-1"
                    >
                      <History className="w-3 h-3 text-cyan-400" />
                      Detail
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-3 px-4 font-bold">Kode PC</th>
                  <th className="py-3 px-4 font-bold">Nama Komputer & Inv</th>
                  <th className="py-3 px-4 font-bold">Status Operasional</th>
                  <th className="py-3 px-4 font-bold">Pemakai Aktif / Terakhir</th>
                  <th className="py-3 px-4 font-bold">Waktu Terakhir</th>
                  <th className="py-3 px-4 font-bold text-center">Total Sesi</th>
                  <th className="py-3 px-4 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map(({ pc, opStatus, activeUsage, lastCompleted, totalSessions }) => {
                  const meta = getStatusVisualMeta(opStatus);
                  const ref = activeUsage || lastCompleted;
                  return (
                    <tr key={pc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-extrabold text-slate-900">{pc.computerCode}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{pc.deviceName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{pc.inventoryNumber}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-extrabold ${meta.badgeClass}`}>
                          {opStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {ref ? (
                          <div>
                            <div className="font-bold text-slate-900">{ref.userName}</div>
                            <div className="text-[10px] text-slate-500">
                              {ref.userType} {ref.studentClass ? `• ${ref.studentClass}` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum Ada</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 tabular-nums">
                        {ref ? `${ref.usageDate} (${ref.startTime}${ref.endTime ? `-${ref.endTime}` : ''})` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold tabular-nums">{totalSessions}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setInspectPc(pc)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Siapa Terakhir?
                          </button>
                          {canChangeStatus && opStatus !== 'SEDANG DIGUNAKAN' && (
                            <button
                              onClick={() => {
                                setStatusEditPc(pc);
                                setNewManualStatus(opStatus);
                                setStatusChangeReason('');
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: INSPECT LAST USER & TIMELINE */}
      {inspectPc && inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden border border-slate-200 shadow-2xl my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  Detail & Pemakai Terakhir — {inspectPc.computerCode}
                </h3>
                <div className="text-[11px] text-slate-300">{inspectPc.deviceName} • {inspectPc.inventoryNumber}</div>
              </div>
              <button onClick={() => setInspectPc(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[78vh] overflow-y-auto">
              <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200">
                <div className="text-[10px] font-bold uppercase text-cyan-800">Pemakai Terakhir (Transaksi Selesai)</div>
                {inspectItem.lastCompleted ? (
                  <div className="mt-1 space-y-1">
                    <div className="text-base font-extrabold text-slate-900">{inspectItem.lastCompleted.userName}</div>
                    <div className="text-slate-700">
                      Jenis: <strong>{inspectItem.lastCompleted.userType}</strong>
                      {inspectItem.lastCompleted.studentClass && ` • Kelas: ${inspectItem.lastCompleted.studentClass}`}
                      {inspectItem.lastCompleted.externalInstitution && ` • Instansi: ${inspectItem.lastCompleted.externalInstitution}`}
                    </div>
                    <div className="text-slate-600 tabular-nums">
                      Tanggal: {inspectItem.lastCompleted.usageDate} • Jam: {inspectItem.lastCompleted.startTime} - {inspectItem.lastCompleted.endTime} WIB ({inspectItem.lastCompleted.duration})
                    </div>
                    <div className="text-slate-600">
                      Kondisi Sesudah: <strong>{inspectItem.lastCompleted.conditionAfter || inspectItem.lastCompleted.conditionBefore}</strong> • Petugas: {inspectItem.lastCompleted.recordedBy}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 italic mt-1">Belum ada sesi penggunaan selesai pada unit ini.</div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900">Riwayat Penggunaan {inspectPc.computerCode} (Terbaru ke Terlama)</h4>
                  <button
                    onClick={() => {
                      setInspectPc(null);
                      onSelectMenu('usage_history');
                    }}
                    className="text-cyan-700 font-bold hover:underline cursor-pointer"
                  >
                    Buka Halaman Riwayat
                  </button>
                </div>
                {inspectItem.timeline.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 text-center text-slate-400">
                    Belum ada riwayat penggunaan tercatat.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {inspectItem.timeline.slice(0, 10).map((t) => (
                      <div key={t.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900">{t.userName} ({t.userType})</div>
                          <div className="text-[11px] text-slate-500 tabular-nums">
                            {t.usageDate} • {t.startTime}-{t.endTime || 'Aktif'} • {t.duration}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 font-bold text-[10px]">
                          {t.usageStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MANUAL STATUS CHANGE */}
      {statusEditPc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl text-xs">
            <h3 className="font-extrabold text-sm text-slate-900">
              Ubah Status Operasional — {statusEditPc.computerCode}
            </h3>
            <form onSubmit={handleSaveManualStatus} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status Baru *</label>
                <select
                  value={newManualStatus}
                  onChange={(e) => setNewManualStatus(e.target.value as ComputerOperationalStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                >
                  {ALL_STATUSES.filter((s) => s !== 'SEDANG DIGUNAKAN').map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alasan / Keterangan Perubahan *</label>
                <input
                  type="text"
                  required
                  value={statusChangeReason}
                  onChange={(e) => setStatusChangeReason(e.target.value)}
                  placeholder="Contoh: Pemeriksaan teknisi selesai, unit normal"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusEditPc(null)}
                  className="px-4 py-2 font-semibold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer"
                >
                  Simpan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
