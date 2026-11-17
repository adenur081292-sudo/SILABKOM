import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ComputerUsageRecord, UsageUserType } from '../../types';
import {
  getActiveUsageForComputer,
  getComputerUsageTimeline,
  getLastCompletedUsageForComputer,
  getStatusVisualMeta,
  resolveComputerOperationalStatus,
} from '../../utils/computerUsageUtils';
import {
  compileComputerUsageReport,
  generateUsagePdfReport,
} from '../../utils/computerUsageReportGenerator';
import { MasterKopSurat } from '../../components/MasterKopSurat';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  History,
  UserCheck,
  Search,
  Eye,
  Printer,
  Download,
  Edit2,
  Trash2,
  X,
  ListFilter,
  Users,
  CheckSquare,
} from 'lucide-react';

export const UsageHistoryView: React.FC = () => {
  const {
    computers,
    laboratories,
    schoolClasses,
    computerUsages,
    computerUsageMembers,
    computerConditionChecks,
    computerDamageReports,
    settings,
    currentRole,
    hasPermission,
    updateComputerUsageWithAudit,
    deleteComputerUsage,
  } = useApp();

  const isAdmin = currentRole === 'admin' || hasPermission('manageComputerUsage');

  // Lookup "Siapa Pemakai Terakhir?" state
  const [lookupPcId, setLookupPcId] = useState<string>(() => computers[0]?.id || '');
  const [isPcTimelineOpen, setIsPcTimelineOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // 10 Filter & Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterComputerId, setFilterComputerId] = useState<string>('ALL');
  const [filterUserType, setFilterUserType] = useState<string>('ALL');
  const [filterClassName, setFilterClassName] = useState<string>('ALL');
  const [filterUsageStatus, setFilterUsageStatus] = useState<string>('ALL');
  const [filterConditionAfter, setFilterConditionAfter] = useState<string>('ALL');
  const [filterCompanion, setFilterCompanion] = useState<string>('ALL');
  const [filterRoomId, setFilterRoomId] = useState<string>('ALL');

  // Detail, Audit Edit, and Delete Modals
  const [detailUsage, setDetailUsage] = useState<ComputerUsageRecord | null>(null);
  const [editTarget, setEditTarget] = useState<ComputerUsageRecord | null>(null);
  const [editReason, setEditReason] = useState<string>('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const sortedComputers = useMemo(() => {
    return [...computers].sort((a, b) => {
      const na = parseInt(a.computerCode.replace(/[^0-9]/g, ''), 10) || 0;
      const nb = parseInt(b.computerCode.replace(/[^0-9]/g, ''), 10) || 0;
      return na - nb || a.computerCode.localeCompare(b.computerCode);
    });
  }, [computers]);

  const companionOptions = useMemo(() => {
    return Array.from(
      new Set(computerUsages.map((u) => (u.companionName || '').trim()).filter(Boolean))
    ).sort();
  }, [computerUsages]);

  const lookupPc = sortedComputers.find((c) => c.id === lookupPcId) || sortedComputers[0];
  const lookupActive = lookupPc ? getActiveUsageForComputer(lookupPc.id, computerUsages) : undefined;
  const lookupLastCompleted = lookupPc
    ? getLastCompletedUsageForComputer(lookupPc.id, computerUsages)
    : undefined;
  const lookupTimeline = lookupPc
    ? getComputerUsageTimeline(lookupPc.id, computerUsages)
    : [];
  const lookupOpStatus = lookupPc
    ? resolveComputerOperationalStatus(lookupPc, computerUsages, computerDamageReports)
    : 'TERSEDIA';

  const filteredUsages = useMemo(() => {
    return computerUsages.filter((u) => {
      if (filterStartDate && u.usageDate < filterStartDate) return false;
      if (filterEndDate && u.usageDate > filterEndDate) return false;
      if (filterComputerId !== 'ALL' && u.computerId !== filterComputerId) return false;
      if (filterUserType !== 'ALL' && u.userType !== filterUserType) return false;
      if (filterClassName !== 'ALL' && (u.studentClass || '') !== filterClassName) return false;
      if (filterUsageStatus !== 'ALL' && u.usageStatus !== filterUsageStatus) return false;
      if (filterConditionAfter !== 'ALL' && (u.conditionAfter || '') !== filterConditionAfter) return false;
      if (filterCompanion !== 'ALL' && (u.companionName || '') !== filterCompanion) return false;
      if (filterRoomId !== 'ALL' && u.roomId !== filterRoomId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${u.usageId} ${u.computerCode} ${u.computerName} ${u.userName} ${u.studentNis || ''} ${u.studentClass || ''} ${u.externalInstitution || ''} ${u.purpose}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    computerUsages,
    filterStartDate,
    filterEndDate,
    filterComputerId,
    filterUserType,
    filterClassName,
    filterUsageStatus,
    filterConditionAfter,
    filterCompanion,
    filterRoomId,
    searchQuery,
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterComputerId('ALL');
    setFilterUserType('ALL');
    setFilterClassName('ALL');
    setFilterUsageStatus('ALL');
    setFilterConditionAfter('ALL');
    setFilterCompanion('ALL');
    setFilterRoomId('ALL');
  };

  const handleDownloadPcHistoryPdf = async () => {
    if (!lookupPc) return;
    const compiled = compileComputerUsageReport(
      {
        reportType: 'per_komputer',
        startDate: '',
        endDate: '',
        className: 'ALL',
        studentId: 'ALL',
        userType: 'ALL',
        computerId: lookupPc.id,
        status: 'ALL',
      },
      {
        usages: computerUsages,
        computers,
        damages: computerDamageReports,
        statusHistories: [],
        students: [],
        schoolClasses,
        externalUsers: [],
      }
    );
    await generateUsagePdfReport(
      {
        ...compiled,
        title: `RIWAYAT PENGGUNAAN ${lookupPc.computerCode} (${lookupPc.deviceName})`,
      },
      settings
    );
  };

  const detailMembers = detailUsage
    ? computerUsageMembers.filter((m) => m.usageId === detailUsage.usageId)
    : [];
  const detailChecks = detailUsage
    ? computerConditionChecks.filter((c) => c.usageId === detailUsage.usageId)
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <History className="w-6 h-6 text-cyan-600" />
          Riwayat Penggunaan Komputer
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Penelusuran lengkap seluruh transaksi penggunaan komputer laboratorium dan identifikasi pemakai terakhir per unit PC.
        </p>
      </div>

      {/* PANEL UTAMA: SIAPA PEMAKAI TERAKHIR KOMPUTER? */}
      <div className="bg-white rounded-3xl border border-cyan-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-600" />
              Pelacakan Cepat: Siapa Pemakai Terakhir Komputer?
            </h2>
            <p className="text-[11px] text-slate-500">
              Menampilkan transaksi terakhir yang telah selesai (dan sesi aktif bila sedang digunakan) beserta kronologi lengkap.
            </p>
          </div>
          <select
            value={lookupPc?.id || ''}
            onChange={(e) => setLookupPcId(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
          >
            {sortedComputers.map((pc) => (
              <option key={pc.id} value={pc.id}>
                {pc.computerCode} — {pc.deviceName}
              </option>
            ))}
          </select>
        </div>

        {lookupPc && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">Unit Workstation</div>
              <div className="font-extrabold text-base text-slate-900">{lookupPc.computerCode}</div>
              <div className="text-slate-700 font-semibold">{lookupPc.deviceName}</div>
              <div className="text-[10px] font-mono text-slate-400">{lookupPc.inventoryNumber}</div>
              <div className="pt-1">
                <span className={`inline-block px-2.5 py-0.5 rounded-lg border text-[10px] font-extrabold ${getStatusVisualMeta(lookupOpStatus).badgeClass}`}>
                  {lookupOpStatus}
                </span>
              </div>
            </div>

            <div className="lg:col-span-2 p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200 space-y-1.5">
              <div className="text-[10px] font-bold uppercase text-cyan-800">
                Pemakai Terakhir (Transaksi Selesai)
              </div>
              {lookupLastCompleted ? (
                <>
                  <div className="text-base font-extrabold text-slate-900">
                    {lookupLastCompleted.userName}
                    <span className="ml-2 px-2 py-0.5 rounded-lg bg-slate-900 text-cyan-300 text-[10px] font-bold">
                      {lookupLastCompleted.userType}
                    </span>
                  </div>
                  <div className="text-slate-700">
                    {lookupLastCompleted.studentClass && `Kelas: ${lookupLastCompleted.studentClass} (NIS: ${lookupLastCompleted.studentNis}) • `}
                    {lookupLastCompleted.externalInstitution && `Instansi: ${lookupLastCompleted.externalInstitution} • `}
                    Tanggal: <strong>{lookupLastCompleted.usageDate}</strong> • Waktu: <strong>{lookupLastCompleted.startTime} - {lookupLastCompleted.endTime} WIB</strong> ({lookupLastCompleted.duration})
                  </div>
                  <div className="text-slate-600">
                    Tujuan: {lookupLastCompleted.purpose} • Kondisi Awal/Akhir: <strong>{lookupLastCompleted.conditionBefore}</strong> → <strong>{lookupLastCompleted.conditionAfter || '-'}</strong>
                  </div>
                  {lookupActive && (
                    <div className="mt-1 px-2.5 py-1 rounded-lg bg-white border border-cyan-300 text-[11px] font-bold text-cyan-900">
                      Catatan: Saat ini sedang digunakan oleh {lookupActive.userName} sejak {lookupActive.startTime} WIB.
                    </div>
                  )}
                </>
              ) : (
                <div className="text-slate-500 italic py-2">
                  Belum ada riwayat transaksi selesai pada unit {lookupPc.computerCode}.
                  {lookupActive && (
                    <span className="block mt-1 font-bold text-cyan-800 not-italic">
                      Sedang digunakan saat ini oleh: {lookupActive.userName} ({lookupActive.startTime} WIB)
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center gap-2">
              {lookupLastCompleted && (
                <button
                  onClick={() => setDetailUsage(lookupLastCompleted)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-600" /> Lihat Detail
                </button>
              )}
              <button
                onClick={() => setIsPcTimelineOpen(true)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-cyan-400" /> Lihat Riwayat ({lookupTimeline.length})
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak
                </button>
                <button
                  onClick={handleDownloadPcHistoryPdf}
                  className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PANEL 10 FILTER & PENCARIAN */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-cyan-600" />
            Filter & Pencarian Riwayat ({filteredUsages.length} dari {computerUsages.length} transaksi)
          </div>
          <button
            onClick={resetFilters}
            className="text-[11px] font-bold text-cyan-700 hover:underline cursor-pointer"
          >
            Reset Semua Filter
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pengguna, NIS, kode PC, nomor transaksi, tujuan..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
            />
          </div>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            title="Tanggal Mulai"
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
          />
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            title="Tanggal Selesai"
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
          />
          <select
            value={filterComputerId}
            onChange={(e) => setFilterComputerId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
          >
            <option value="ALL">Semua Komputer</option>
            {sortedComputers.map((pc) => (
              <option key={pc.id} value={pc.id}>
                {pc.computerCode}
              </option>
            ))}
          </select>

          <select
            value={filterUserType}
            onChange={(e) => setFilterUserType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
          >
            <option value="ALL">Semua Jenis Pengguna</option>
            <option value="Siswa">Siswa</option>
            <option value="Guru/Tendik">Guru/Tendik</option>
            <option value="Teknisi/Laboran">Teknisi/Laboran</option>
            <option value="Tamu">Tamu</option>
          </select>

          <select
            value={filterClassName}
            onChange={(e) => setFilterClassName(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
          >
            <option value="ALL">Semua Kelas (9 Kelas)</option>
            {schoolClasses.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterUsageStatus}
            onChange={(e) => setFilterUsageStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
          >
            <option value="ALL">Semua Status Penggunaan</option>
            <option value="Sedang Digunakan">Sedang Digunakan</option>
            <option value="Selesai">Selesai</option>
            <option value="Dibatalkan">Dibatalkan</option>
          </select>

          <select
            value={filterConditionAfter}
            onChange={(e) => setFilterConditionAfter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
          >
            <option value="ALL">Semua Kondisi Sesudah</option>
            <option value="Baik">Baik</option>
            <option value="Bermasalah">Bermasalah</option>
            <option value="Rusak">Rusak</option>
          </select>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={filterCompanion}
              onChange={(e) => setFilterCompanion(e.target.value)}
              className="px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px]"
            >
              <option value="ALL">Semua Guru/Pendamping</option>
              {companionOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filterRoomId}
              onChange={(e) => setFilterRoomId(e.target.value)}
              className="px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px]"
            >
              <option value="ALL">Semua Ruangan</option>
              {laboratories.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABEL 15 KOLOM RIWAYAT PENGGUNAAN */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-3 px-3 font-bold whitespace-nowrap">No. Transaksi</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Kode PC</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Nama Komputer & Inv</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Jenis</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Nama Pengguna</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Kelas / Instansi</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Tanggal</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Mulai</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Selesai</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Durasi</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Tujuan Penggunaan</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Kondisi Awal</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Kondisi Akhir</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Status</th>
                <th className="py-3 px-3 font-bold whitespace-nowrap">Petugas</th>
                <th className="py-3 px-3 font-bold text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsages.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-10 text-center text-slate-400">
                    Belum ada transaksi riwayat penggunaan komputer yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredUsages.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">{u.usageId}</td>
                    <td className="py-2.5 px-3 font-extrabold text-slate-900 whitespace-nowrap">{u.computerCode}</td>
                    <td className="py-2.5 px-3 min-w-[150px]">
                      <div className="font-semibold text-slate-800">{u.computerName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{u.inventoryCode}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{u.userType}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 min-w-[140px]">
                      {u.userName}
                      {u.isGroupUsage && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 text-[9px]">
                          Kelompok
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {u.userType === 'Siswa'
                        ? `${u.studentClass || '-'} (${u.studentNis || '-'})`
                        : u.userType === 'Tamu'
                        ? u.externalInstitution || '-'
                        : u.subjectOrActivity || u.userType}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">{u.usageDate}</td>
                    <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">{u.startTime}</td>
                    <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">{u.endTime || '-'}</td>
                    <td className="py-2.5 px-3 font-semibold whitespace-nowrap">{u.duration}</td>
                    <td className="py-2.5 px-3 min-w-[160px] max-w-[220px] truncate" title={u.purpose}>
                      {u.purpose}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{u.conditionBefore}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`font-bold ${
                          u.conditionAfter === 'Rusak'
                            ? 'text-rose-700'
                            : u.conditionAfter === 'Bermasalah'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {u.conditionAfter || '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          u.usageStatus === 'Sedang Digunakan'
                            ? 'bg-cyan-100 text-cyan-900'
                            : u.usageStatus === 'Selesai'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.usageStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{u.recordedBy}</td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetailUsage(u)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          title="Lihat Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setEditTarget({ ...u });
                                setEditReason('');
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                              title="Edit Beralasan Audit (Admin)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetId(u.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                              title="Hapus Riwayat (Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETAIL TRANSAKSI + KELOMPOK + 9 KOMPONEN */}
      {detailUsage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden border border-slate-200 shadow-2xl my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Detail Transaksi {detailUsage.usageId}</h3>
                <div className="text-[11px] text-cyan-300">{detailUsage.computerCode} — {detailUsage.computerName}</div>
              </div>
              <button onClick={() => setDetailUsage(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div><span className="text-slate-400 block">Pengguna</span><strong>{detailUsage.userName} ({detailUsage.userType})</strong></div>
                <div><span className="text-slate-400 block">Kelas / Instansi</span><strong>{detailUsage.studentClass || detailUsage.externalInstitution || '-'}</strong></div>
                <div><span className="text-slate-400 block">Waktu Pakai</span><strong>{detailUsage.usageDate} • {detailUsage.startTime} - {detailUsage.endTime || 'Aktif'} WIB ({detailUsage.duration})</strong></div>
                <div><span className="text-slate-400 block">Pendamping & Ruangan</span><strong>{detailUsage.companionName || '-'} • {detailUsage.roomName}</strong></div>
                <div className="col-span-2"><span className="text-slate-400 block">Tujuan / Kegiatan</span><strong>{detailUsage.purpose}</strong></div>
                {detailUsage.editReason && (
                  <div className="col-span-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    <strong>Catatan Audit Admin:</strong> {detailUsage.editReason}
                  </div>
                )}
              </div>

              {detailMembers.length > 0 && (
                <div>
                  <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-600" />
                    Daftar Anggota Pengguna Komputer ({detailMembers.length} Siswa)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detailMembers.map((m) => (
                      <div key={m.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="font-bold text-slate-900">{m.studentName}</div>
                        <div className="text-[10px] text-slate-500">
                          NIS: {m.studentNis} • {m.studentClass} • {m.roleInGroup} • Absensi: {m.attendanceStatus || 'Belum Tercatat'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailChecks.length > 0 && (
                <div>
                  <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    Hasil Pemeriksaan 9 Komponen
                  </div>
                  <div className="space-y-2">
                    {detailChecks.map((chk) => (
                      <div key={chk.id} className="p-3 rounded-2xl border border-slate-200 bg-slate-50">
                        <div className="flex justify-between font-bold text-slate-800 mb-2">
                          <span>{chk.phase}</span>
                          <span>Hasil: {chk.overallCondition}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                          {Object.entries(chk.checklist).map(([k, v]) => (
                            <div key={k} className="px-2 py-1 rounded bg-white border border-slate-200 flex justify-between">
                              <span>{k}</span>
                              <strong className={v === 'Baik' ? 'text-emerald-700' : 'text-rose-700'}>{v}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TIMELINE PER KOMPUTER */}
      {isPcTimelineOpen && lookupPc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden border border-slate-200 shadow-2xl my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                Kronologi Penggunaan — {lookupPc.computerCode} ({lookupTimeline.length} Transaksi)
              </h3>
              <button onClick={() => setIsPcTimelineOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-2.5 text-xs">
              {lookupTimeline.length === 0 ? (
                <div className="text-center text-slate-400 py-8">Belum ada riwayat untuk komputer ini.</div>
              ) : (
                lookupTimeline.map((t, i) => (
                  <div key={t.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-extrabold text-slate-900">
                        #{i + 1} • {t.userName} ({t.userType})
                      </div>
                      <div className="text-slate-600 mt-0.5 tabular-nums">
                        {t.usageDate} • {t.startTime} - {t.endTime || 'Aktif'} WIB ({t.duration}) • {t.usageId}
                      </div>
                      <div className="text-slate-500 mt-0.5">Tujuan: {t.purpose}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-[10px] shrink-0">
                      {t.usageStatus}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CETAK RIWAYAT DENGAN MASTER KOP SURAT RESMI */}
      {isPrintModalOpen && lookupPc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl my-6">
            <div className="no-print bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
              <span className="font-bold text-xs">Pratinjau Cetak Riwayat {lookupPc.computerCode}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Sekarang
                </button>
                <button onClick={() => setIsPrintModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="printable-document p-8 bg-white text-black text-xs space-y-4">
              <MasterKopSurat />
              <div className="text-center">
                <h2 className="font-bold text-sm uppercase">
                  RIWAYAT PENGGUNAAN {lookupPc.computerCode} — {lookupPc.deviceName}
                </h2>
                <p className="text-[11px] text-slate-600">No. Inventaris: {lookupPc.inventoryNumber}</p>
              </div>
              <table className="w-full border-collapse border border-slate-400 text-[10px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-400 p-1.5">No</th>
                    <th className="border border-slate-400 p-1.5">Tanggal</th>
                    <th className="border border-slate-400 p-1.5">Waktu</th>
                    <th className="border border-slate-400 p-1.5">Pengguna</th>
                    <th className="border border-slate-400 p-1.5">Jenis / Kelas</th>
                    <th className="border border-slate-400 p-1.5">Tujuan</th>
                    <th className="border border-slate-400 p-1.5">Kondisi Akhir</th>
                    <th className="border border-slate-400 p-1.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lookupTimeline.map((t, idx) => (
                    <tr key={t.id}>
                      <td className="border border-slate-400 p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-400 p-1.5">{t.usageDate}</td>
                      <td className="border border-slate-400 p-1.5">{t.startTime}-{t.endTime || 'Aktif'}</td>
                      <td className="border border-slate-400 p-1.5 font-semibold">{t.userName}</td>
                      <td className="border border-slate-400 p-1.5">{t.userType} {t.studentClass || t.externalInstitution || ''}</td>
                      <td className="border border-slate-400 p-1.5">{t.purpose}</td>
                      <td className="border border-slate-400 p-1.5 text-center">{t.conditionAfter || t.conditionBefore}</td>
                      <td className="border border-slate-400 p-1.5 text-center">{t.usageStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT BERALASAN AUDIT (KHUSUS ADMIN) */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl text-xs">
            <h3 className="font-extrabold text-sm text-slate-900">
              Koreksi Data Penggunaan (Audit Admin) — {editTarget.usageId}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Tanggal</label>
                <input
                  type="date"
                  value={editTarget.usageDate}
                  onChange={(e) => setEditTarget({ ...editTarget, usageDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Tujuan Penggunaan</label>
                <input
                  type="text"
                  value={editTarget.purpose}
                  onChange={(e) => setEditTarget({ ...editTarget, purpose: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Jam Mulai</label>
                <input
                  type="time"
                  value={editTarget.startTime}
                  onChange={(e) => setEditTarget({ ...editTarget, startTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Jam Selesai</label>
                <input
                  type="time"
                  value={editTarget.endTime}
                  onChange={(e) => setEditTarget({ ...editTarget, endTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
            </div>
            <div>
              <label className="font-bold text-rose-800 block mb-1">Alasan Koreksi Audit Wajib *</label>
              <textarea
                rows={2}
                required
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Contoh: Koreksi jam selesai karena listrik padam..."
                className="w-full px-3 py-2 rounded-xl bg-amber-50 border border-amber-200"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditTarget(null)} className="px-4 py-2 text-slate-600 font-semibold cursor-pointer">
                Batal
              </button>
              <button
                disabled={!editReason.trim()}
                onClick={async () => {
                  await updateComputerUsageWithAudit(editTarget, editReason);
                  setEditTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-50 cursor-pointer"
              >
                Simpan Koreksi Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE (ADMIN ONLY) */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Hapus Riwayat Penggunaan?"
        message="Tindakan ini hanya tersedia untuk Administrator dan akan menghapus transaksi penggunaan secara permanen."
        onConfirm={async () => {
          if (deleteTargetId) {
            await deleteComputerUsage(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
