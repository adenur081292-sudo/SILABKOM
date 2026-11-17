import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceStatusCode } from '../../types';
import {
  ATTENDANCE_REPORT_DEFINITIONS,
  AttendanceReportFilter,
  compileAttendanceReport,
  generateAttendancePdfReport,
  generateAttendanceExcelReport,
  generateAttendanceWordReport,
  generateAttendanceCsvReport,
} from '../../utils/attendanceReportGenerator';
import { getTodayIso, MONTH_NAMES_ID } from '../../utils/attendanceUtils';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
  Eye,
  Play,
  X,
  Filter,
  BarChart2,
  Lock,
} from 'lucide-react';
import { MasterKopSurat } from '../../components/MasterKopSurat';

export const AttendanceReportsView: React.FC = () => {
  const {
    accessibleClasses,
    students,
    classAttendances,
    attendanceSettings,
    schoolCalendar,
    academicYears,
    hasPermission,
    addToast,
    logActivity,
  } = useApp();

  const canExport = hasPermission('manageAttendanceReports') || hasPermission('crudAllData');

  const now = new Date();
  const [filter, setFilter] = useState<AttendanceReportFilter>({
    reportType: 6,
    startDate: attendanceSettings.schoolStartDate || '2026-07-13',
    endDate: getTodayIso(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    semester: 'all',
    academicYear: attendanceSettings.activeAcademicYear || '2026/2027',
    classId: accessibleClasses.length === 1 ? accessibleClasses[0].id : '',
    studentName: '',
    status: '',
  });

  const [appliedFilter, setAppliedFilter] = useState<AttendanceReportFilter>(filter);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const accessibleIds = useMemo(
    () => new Set(accessibleClasses.map((c) => c.id)),
    [accessibleClasses]
  );

  const scopedStudents = useMemo(
    () => students.filter((s) => accessibleIds.has(s.classId)),
    [students, accessibleIds]
  );

  const scopedRecords = useMemo(
    () => classAttendances.filter((r) => accessibleIds.has(r.classId)),
    [classAttendances, accessibleIds]
  );

  const compiledReport = useMemo(() => {
    return compileAttendanceReport(appliedFilter, {
      classes: accessibleClasses,
      students: scopedStudents,
      records: scopedRecords,
      settings: attendanceSettings,
      calendar: schoolCalendar,
      academicYears,
    });
  }, [
    appliedFilter,
    accessibleClasses,
    scopedStudents,
    scopedRecords,
    attendanceSettings,
    schoolCalendar,
    academicYears,
  ]);

  const handleApplyFilter = () => {
    setAppliedFilter({ ...filter });
    addToast('info', 'Laporan Diperbarui', `Menampilkan: ${ATTENDANCE_REPORT_DEFINITIONS.find((d) => d.id === filter.reportType)?.label}`);
  };

  const handleSelectReportType = (id: number) => {
    const next = { ...filter, reportType: id };
    setFilter(next);
    setAppliedFilter(next);
  };

  const handleDownloadPdf = async () => {
    if (!canExport) return;
    setIsExporting(true);
    try {
      await generateAttendancePdfReport(compiledReport, attendanceSettings);
      addToast('success', 'PDF Diunduh', `${compiledReport.title} berhasil diekspor ke PDF.`);
      logActivity('EXPORT_ATTENDANCE_PDF', 'Laporan Absensi', compiledReport.title);
    } catch {
      addToast('error', 'Gagal Ekspor PDF', 'Terjadi kesalahan saat membuat dokumen PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!canExport) return;
    try {
      generateAttendanceExcelReport(compiledReport, attendanceSettings);
      addToast('success', 'Excel Diunduh', `${compiledReport.title} berhasil diekspor ke Excel (.xlsx).`);
      logActivity('EXPORT_ATTENDANCE_EXCEL', 'Laporan Absensi', compiledReport.title);
    } catch {
      addToast('error', 'Gagal Ekspor Excel', 'Terjadi kesalahan saat membuat dokumen Excel.');
    }
  };

  const handleDownloadWord = async () => {
    if (!canExport) return;
    setIsExporting(true);
    try {
      await generateAttendanceWordReport(compiledReport, attendanceSettings);
      addToast('success', 'Word Diunduh', `${compiledReport.title} berhasil diekspor ke Word (.docx).`);
      logActivity('EXPORT_ATTENDANCE_WORD', 'Laporan Absensi', compiledReport.title);
    } catch {
      addToast('error', 'Gagal Ekspor Word', 'Terjadi kesalahan saat membuat dokumen Word.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!canExport) return;
    try {
      generateAttendanceCsvReport(compiledReport);
      addToast('success', 'CSV Diunduh', `${compiledReport.title} berhasil diekspor ke CSV.`);
      logActivity('EXPORT_ATTENDANCE_CSV', 'Laporan Absensi', compiledReport.title);
    } catch {
      addToast('error', 'Gagal Ekspor CSV', 'Terjadi kesalahan saat membuat file CSV.');
    }
  };

  const handlePrint = () => {
    setIsPreviewOpen(true);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const yearOptions = Array.from(
    new Set([
      ...academicYears.map((y) => y.year),
      attendanceSettings.activeAcademicYear || '2026/2027',
    ])
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-cyan-600" />
            Laporan Absensi Otomatis (14 Jenis Laporan)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Susun, pratinjau, cetak, dan unduh laporan kehadiran resmi SMKN 15 Pandeglang dalam format PDF, Excel, Word (.docx), dan CSV.
          </p>
        </div>

        {!canExport && (
          <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
            <Lock className="w-4 h-4" /> Mode Pratinjau (Unduh dibatasi hak akses)
          </div>
        )}
      </div>

      {/* 14 Report Types Selector Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 print:hidden">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span>1. Pilih Jenis Laporan Absensi (14 Format Tersedia)</span>
          <span className="text-[11px] font-semibold text-cyan-700">
            Aktif: #{filter.reportType}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {ATTENDANCE_REPORT_DEFINITIONS.map((def) => {
            const active = filter.reportType === def.id;
            return (
              <button
                key={def.id}
                onClick={() => handleSelectReportType(def.id)}
                className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-md text-[10px] font-extrabold flex items-center justify-center shrink-0 tabular-nums ${
                      active ? 'bg-cyan-500 text-slate-950' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {def.id}
                  </span>
                  <span className="text-[11px] font-bold leading-tight line-clamp-1">
                    {def.label}
                  </span>
                </div>
                <div
                  className={`text-[10px] mt-1 line-clamp-1 ${
                    active ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {def.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 9 Filter Parameters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 text-xs print:hidden">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-600" />
            2. Parameter Filter Laporan
          </span>
          <button
            onClick={() => {
              const reset: AttendanceReportFilter = {
                reportType: filter.reportType,
                startDate: attendanceSettings.schoolStartDate || '2026-07-13',
                endDate: getTodayIso(),
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                semester: 'all',
                academicYear: attendanceSettings.activeAcademicYear || '2026/2027',
                classId: '',
                studentName: '',
                status: '',
              };
              setFilter(reset);
              setAppliedFilter(reset);
            }}
            className="text-[11px] font-bold text-cyan-700 hover:underline cursor-pointer"
          >
            Reset Filter
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Tanggal Awal</label>
            <input
              type="date"
              value={filter.startDate || ''}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Tanggal Akhir</label>
            <input
              type="date"
              value={filter.endDate || ''}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Bulan</label>
            <select
              value={filter.month || 1}
              onChange={(e) => setFilter({ ...filter, month: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
            >
              {MONTH_NAMES_ID.map((mName, idx) => (
                <option key={mName} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Tahun</label>
            <input
              type="number"
              value={filter.year || 2026}
              onChange={(e) => setFilter({ ...filter, year: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold tabular-nums"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Semester</label>
            <select
              value={filter.semester || 'all'}
              onChange={(e) =>
                setFilter({ ...filter, semester: e.target.value as '1' | '2' | 'all' })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
            >
              <option value="all">Semua Semester</option>
              <option value="1">Semester 1 (Ganjil: Jul–Des)</option>
              <option value="2">Semester 2 (Genap: Jan–Jun)</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Tahun Pelajaran</label>
            <select
              value={filter.academicYear || ''}
              onChange={(e) => setFilter({ ...filter, academicYear: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
            >
              <option value="">Semua Tahun Pelajaran</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Kelas</label>
            <select
              value={filter.classId || ''}
              onChange={(e) => setFilter({ ...filter, classId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
            >
              {accessibleClasses.length > 1 && (
                <option value="">Seluruh Kelas Diizinkan ({accessibleClasses.length})</option>
              )}
              {accessibleClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.majorFullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Nama Siswa</label>
            <input
              type="text"
              value={filter.studentName || ''}
              onChange={(e) => setFilter({ ...filter, studentName: e.target.value })}
              placeholder="Cari nama siswa..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Status Kehadiran</label>
            <select
              value={filter.status || ''}
              onChange={(e) =>
                setFilter({ ...filter, status: e.target.value as AttendanceStatusCode | '' })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
            >
              <option value="">Semua Status (H/S/I/A/D)</option>
              <option value="H">H — Hadir</option>
              <option value="S">S — Sakit</option>
              <option value="I">I — Izin</option>
              <option value="A">A — Alpa</option>
              <option value="D">D — Dispensasi</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleApplyFilter}
              className="w-full px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Tampilkan Laporan
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Pratinjau Resmi
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              Cetak
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={!canExport || isExporting}
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Unduh PDF
            </button>
            <button
              disabled={!canExport || isExporting}
              onClick={handleDownloadExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Unduh Excel
            </button>
            <button
              disabled={!canExport || isExporting}
              onClick={handleDownloadWord}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Word (.docx)
            </button>
            <button
              disabled={!canExport || isExporting}
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh CSV
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs print:hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">{compiledReport.title}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Nomor: <span className="font-mono">{compiledReport.reportNumber}</span> • Kelas: <strong>{compiledReport.classLabel}</strong> • Periode: <strong>{compiledReport.periodLabel}</strong>
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 text-[11px] font-bold tabular-nums self-start sm:self-auto">
            {compiledReport.rows.length} Baris Data
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                {compiledReport.headers.map((h, i) => (
                  <th key={i} className="py-3 px-3.5 font-bold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {compiledReport.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/80">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`py-2.5 px-3.5 ${
                        typeof cell === 'number' || String(cell).endsWith('%')
                          ? 'tabular-nums font-semibold'
                          : ''
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {compiledReport.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={compiledReport.headers.length}
                    className="py-10 text-center text-slate-400"
                  >
                    Tidak ada data absensi yang sesuai dengan filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {compiledReport.chartBars && compiledReport.chartBars.length > 0 && (
          <div className="p-5 border-t border-slate-200 bg-slate-50/50 space-y-2">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-cyan-600" />
              Ringkasan Grafik Persentase Kehadiran
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {compiledReport.chartBars.map((b) => (
                <div key={b.label} className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                    <span>{b.label}</span>
                    <span className="tabular-nums text-cyan-700">{b.value}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-600 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(2, b.value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="font-bold text-slate-800">Rekapitulasi & Catatan Perhitungan:</div>
          {compiledReport.summaryNotes.map((note, idx) => (
            <div key={idx}>• {note}</div>
          ))}
        </div>
      </div>

      {/* OFFICIAL PREVIEW & PRINTABLE DOCUMENT MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs overflow-y-auto p-4 print:static print:bg-white print:p-0">
          <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
            {/* Modal Toolbar (hidden on print) */}
            <div className="bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <div className="text-xs font-bold flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                Pratinjau Dokumen Laporan Resmi — {attendanceSettings.schoolName}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Sekarang
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div id="printable-attendance-report" className="p-6 sm:p-8 space-y-5 text-slate-900 bg-white">
              {/* Official Master Kop Surat FOTO 1 */}
              <MasterKopSurat />

              {/* Document Title & Metadata */}
              <div className="text-center space-y-1">
                <h2 className="text-base font-extrabold uppercase underline">
                  {compiledReport.title}
                </h2>
                <p className="text-[11px] text-slate-600">
                  Nomor: <span className="font-mono">{compiledReport.reportNumber}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px]">
                <div>
                  <span className="text-slate-500">Kelas:</span>{' '}
                  <strong className="text-slate-900">{compiledReport.classLabel}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Periode:</span>{' '}
                  <strong className="text-slate-900">{compiledReport.periodLabel}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Tahun Pelajaran:</span>{' '}
                  <strong className="text-slate-900">{compiledReport.academicYearLabel}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal Buat:</span>{' '}
                  <strong className="text-slate-900">{compiledReport.generatedDate}</strong>
                </div>
              </div>

              {/* Official Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      {compiledReport.headers.map((h, i) => (
                        <th key={i} className="border border-slate-700 py-2 px-2 text-center font-bold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compiledReport.rows.map((r, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        {r.map((c, cIdx) => (
                          <td key={cIdx} className="border border-slate-300 py-1.5 px-2 tabular-nums">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mini Chart Bars */}
              {compiledReport.chartBars && compiledReport.chartBars.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <div className="text-[11px] font-bold">Grafik Perbandingan Kehadiran:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {compiledReport.chartBars.map((b) => (
                      <div key={b.label} className="text-[10px]">
                        <div className="flex justify-between font-bold">
                          <span>{b.label}</span>
                          <span>{b.value}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-700"
                            style={{ width: `${Math.min(100, b.value)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Notes */}
              <div className="text-[11px] space-y-0.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="font-bold">Catatan & Rekapitulasi:</div>
                {compiledReport.summaryNotes.map((n, i) => (
                  <div key={i}>• {n}</div>
                ))}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 text-xs text-center">
                <div>
                  <div>Mengetahui,</div>
                  <div className="font-semibold">Kepala Sekolah {attendanceSettings.schoolName}</div>
                  <div className="h-16" />
                  <div className="font-bold underline">{attendanceSettings.principalName}</div>
                  <div className="text-[11px]">NIP. {attendanceSettings.principalNip}</div>
                </div>
                <div>
                  <div>
                    {attendanceSettings.reportCity || 'Pandeglang'}, {compiledReport.generatedDate}
                  </div>
                  <div className="font-semibold">Wali Kelas / Petugas Absensi</div>
                  <div className="h-16" />
                  <div className="font-bold underline">{compiledReport.homeroomName}</div>
                  <div className="text-[11px]">NIP. {compiledReport.homeroomNip}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
