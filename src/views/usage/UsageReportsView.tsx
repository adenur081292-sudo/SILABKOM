import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  compileComputerUsageReport,
  generateUsageCsvReport,
  generateUsageExcelReport,
  generateUsagePdfReport,
  generateUsageWordReport,
  USAGE_REPORT_DEFINITIONS,
  UsageReportType,
} from '../../utils/computerUsageReportGenerator';
import { UsageUserType } from '../../types';
import { MasterKopSurat } from '../../components/MasterKopSurat';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Eye,
  X,
  Download,
  Sparkles,
} from 'lucide-react';

export const UsageReportsView: React.FC = () => {
  const {
    computers,
    computerUsages,
    computerDamageReports,
    computerStatusHistories,
    students,
    schoolClasses,
    externalUsers,
    settings,
  } = useApp();

  const [selectedReport, setSelectedReport] = useState<UsageReportType>('rekap_pemakaian_terakhir_pc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [className, setClassName] = useState<string>('ALL');
  const [studentId, setStudentId] = useState<string>('ALL');
  const [userType, setUserType] = useState<'ALL' | UsageUserType>('ALL');
  const [computerId, setComputerId] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  const sortedComputers = useMemo(() => {
    return [...computers].sort((a, b) => {
      const na = parseInt(a.computerCode.replace(/[^0-9]/g, ''), 10) || 0;
      const nb = parseInt(b.computerCode.replace(/[^0-9]/g, ''), 10) || 0;
      return na - nb || a.computerCode.localeCompare(b.computerCode);
    });
  }, [computers]);

  const compiledReport = useMemo(() => {
    return compileComputerUsageReport(
      {
        reportType: selectedReport,
        startDate,
        endDate,
        className,
        studentId,
        userType,
        computerId,
        status,
      },
      {
        usages: computerUsages,
        computers: sortedComputers,
        damages: computerDamageReports,
        statusHistories: computerStatusHistories,
        students,
        schoolClasses,
        externalUsers,
      }
    );
  }, [
    selectedReport,
    startDate,
    endDate,
    className,
    studentId,
    userType,
    computerId,
    status,
    computerUsages,
    sortedComputers,
    computerDamageReports,
    computerStatusHistories,
    students,
    schoolClasses,
    externalUsers,
  ]);

  const filteredStudentsForSelect = useMemo(() => {
    return students
      .filter((s) => className === 'ALL' || s.className === className)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, className]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-cyan-600" />
            Pusat Laporan Penggunaan Komputer (18 Format)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Seluruh dokumen, pratinjau cetak, PDF, dan Word (.docx) menggunakan Kop Surat Standar Resmi SMKN 15 Pandeglang.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedReport('rekap_pemakaian_terakhir_pc');
            setIsPreviewOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Buka Laporan Khusus Pemakai Terakhir PC
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="text-xs font-extrabold text-slate-900">Filter Parameter Laporan</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Tanggal Selesai</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Kelas (9 Kelas)</label>
            <select
              value={className}
              onChange={(e) => {
                setClassName(e.target.value);
                setStudentId('ALL');
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
            >
              <option value="ALL">Semua Kelas</option>
              {schoolClasses.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Siswa Spesifik</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
            >
              <option value="ALL">Semua Siswa</option>
              {filteredStudentsForSelect.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.className})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Jenis Pengguna</label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value as 'ALL' | UsageUserType)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
            >
              <option value="ALL">Semua Jenis Pengguna</option>
              <option value="Siswa">Siswa</option>
              <option value="Guru/Tendik">Guru/Tendik</option>
              <option value="Teknisi/Laboran">Teknisi/Laboran</option>
              <option value="Tamu">Tamu</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Komputer</label>
            <select
              value={computerId}
              onChange={(e) => setComputerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
            >
              <option value="ALL">Semua Komputer</option>
              {sortedComputers.map((pc) => (
                <option key={pc.id} value={pc.id}>
                  {pc.computerCode} — {pc.deviceName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Status Transaksi / Tindak Lanjut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
            >
              <option value="ALL">Semua Status</option>
              <option value="Sedang Digunakan">Sedang Digunakan</option>
              <option value="Selesai">Selesai</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setClassName('ALL');
                setStudentId('ALL');
                setUserType('ALL');
                setComputerId('ALL');
                setStatus('ALL');
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* 18 Reports Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {USAGE_REPORT_DEFINITIONS.map((rep) => {
          const isActive = selectedReport === rep.id;
          return (
            <button
              key={rep.id}
              onClick={() => setSelectedReport(rep.id)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-cyan-500/30'
                  : 'bg-white border-slate-200 hover:border-cyan-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                      isActive ? 'bg-cyan-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    #{rep.number} • {rep.category}
                  </span>
                </div>
                <div className="font-extrabold text-xs leading-snug">{rep.title}</div>
                <p className={`text-[11px] mt-1 leading-relaxed ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  {rep.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Report Export Bar + Live Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-extrabold text-sm text-slate-900">{compiledReport.title}</h2>
            <p className="text-[11px] text-slate-500">
              {compiledReport.subtitle} • {compiledReport.periodLabel} ({compiledReport.rows.length} baris)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-600" /> Pratinjau & Cetak
            </button>
            <button
              onClick={() => generateUsagePdfReport(compiledReport, settings)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={() => generateUsageExcelReport(compiledReport)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              onClick={() => generateUsageWordReport(compiledReport, settings)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" /> Word (.docx)
            </button>
            <button
              onClick={() => generateUsageCsvReport(compiledReport)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
            >
              CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                {compiledReport.headers.map((h) => (
                  <th key={h} className="py-2.5 px-3 font-bold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {compiledReport.rows.length === 0 ? (
                <tr>
                  <td colSpan={compiledReport.headers.length} className="py-8 text-center text-slate-400">
                    Tidak ada data laporan untuk filter yang dipilih.
                  </td>
                </tr>
              ) : (
                compiledReport.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-800">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PREVIEW MODAL WITH MASTER KOP SURAT RESMI */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl my-6">
            <div className="no-print bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
              <span className="font-bold text-xs">Pratinjau Resmi — {compiledReport.title}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Dokumen
                </button>
                <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="printable-document p-8 bg-white text-black text-xs space-y-4">
              <MasterKopSurat />
              <div className="text-center space-y-0.5">
                <h2 className="font-bold text-sm uppercase">{compiledReport.title}</h2>
                <p className="text-[11px] text-slate-700">{compiledReport.subtitle}</p>
                <p className="text-[10px] font-semibold text-slate-600">{compiledReport.periodLabel}</p>
              </div>

              <div className="flex flex-wrap justify-center gap-4 text-[10px] py-1 border-y border-slate-200">
                {compiledReport.summaryPairs.map((s) => (
                  <div key={s.label}>
                    <span className="text-slate-500">{s.label}: </span>
                    <strong>{s.value}</strong>
                  </div>
                ))}
              </div>

              <table className="w-full border-collapse border border-slate-400 text-[10px]">
                <thead>
                  <tr className="bg-slate-100">
                    {compiledReport.headers.map((h) => (
                      <th key={h} className="border border-slate-400 p-1.5 font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compiledReport.rows.map((r, rIdx) => (
                    <tr key={rIdx}>
                      {r.map((cell, cIdx) => (
                        <td key={cIdx} className="border border-slate-400 p-1.5">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 pt-6 text-[11px]">
                <div>
                  <div>Mengetahui,</div>
                  <div>Kepala SMKN 15 Pandeglang</div>
                  <div className="mt-14 font-bold underline">{settings.principalName}</div>
                  <div>NIP. {settings.principalNip || '-'}</div>
                </div>
                <div className="text-right">
                  <div>
                    Pandeglang,{' '}
                    {new Date().toLocaleDateString('id-ID', {
                      timeZone: 'Asia/Jakarta',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                  <div>Kepala Laboratorium Komputer</div>
                  <div className="mt-14 font-bold underline">{settings.headOfLabName}</div>
                  <div>NIP. {settings.headOfLabNip || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
