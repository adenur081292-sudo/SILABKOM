import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Eye,
  Calendar,
  Filter,
  FileText,
  FileCode,
  Building2,
  CheckCircle2,
  X,
  FileCheck,
} from 'lucide-react';
import {
  REPORT_TITLES,
  compileReportData,
  generatePdfReport,
  generateExcelReport,
  generateWordReport,
  generateCsvReport,
  ReportFilter,
  ReportDataResult,
} from '../utils/reportGenerator';
import { MasterKopSurat } from '../components/MasterKopSurat';

export const ReportsView: React.FC = () => {
  const {
    laboratories,
    computers,
    equipment,
    schedules,
    borrowings,
    maintenanceList,
    damageReports,
    activities,
    documents,
    guests,
    studentAttendances,
    lessonJournals,
    settings,
    addToast,
  } = useApp();

  const [filter, setFilter] = useState<ReportFilter>({
    reportType: 1,
    startDate: '',
    endDate: '',
    academicYear: settings.academicYear || '2026/2027',
    labId: '',
    condition: '',
    status: '',
    officerName: '',
  });

  const [previewData, setPreviewData] = useState<ReportDataResult | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Compile report data based on current filters
  const currentReportResult = useMemo(() => {
    return compileReportData(filter, {
      laboratories,
      computers,
      equipment,
      schedules,
      borrowings,
      maintenanceList,
      damageReports,
      activities,
      documents,
      guests,
      studentAttendances,
      lessonJournals,
    });
  }, [
    filter,
    laboratories,
    computers,
    equipment,
    schedules,
    borrowings,
    maintenanceList,
    damageReports,
    activities,
    documents,
    guests,
    studentAttendances,
    lessonJournals,
  ]);

  const handleOpenPreview = () => {
    setPreviewData(currentReportResult);
    setIsPreviewModalOpen(true);
  };

  const handleDownloadPdf = async () => {
    try {
      await generatePdfReport(currentReportResult, settings);
      addToast('success', 'PDF Terunduh', `Laporan ${currentReportResult.title} berhasil diunduh dalam format PDF resmi ber-kop.`);
    } catch {
      addToast('error', 'Gagal Ekspor PDF', 'Terjadi kesalahan saat membuat dokumen PDF.');
    }
  };

  const handleDownloadExcel = () => {
    generateExcelReport(currentReportResult, settings);
    addToast('success', 'Excel Terunduh', `Laporan berhasil diekspor ke format Excel (.xlsx).`);
  };

  const handleDownloadWord = async () => {
    try {
      await generateWordReport(currentReportResult, settings);
      addToast('success', 'Word Terunduh', `Laporan berhasil diunduh dalam format Word (.doc) lengkap dengan kop dinas.`);
    } catch {
      addToast('error', 'Gagal Ekspor Word', 'Terjadi kesalahan saat membuat dokumen Word.');
    }
  };

  const handleDownloadCsv = () => {
    generateCsvReport(currentReportResult);
    addToast('success', 'CSV Terunduh', `Laporan berhasil diekspor ke file CSV.`);
  };

  const handleDirectPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-800 text-xs font-bold mb-1">
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
            23 Format Laporan Terstandarisasi
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Pusat Laporan Otomatis Laboratorium
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pilih jenis laporan, tentukan rentang tanggal atau ruangan, lihat pratinjau berkop dinas, lalu unduh dalam format PDF, Excel, Word, CSV, atau Cetak langsung.
          </p>
        </div>
      </div>

      {/* Main Filter & Report Configuration Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Step 1: Select Report Type */}
        <div>
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-2">
            1. Pilih Jenis Laporan (23 Pilihan Resmi)
          </label>
          <div className="relative">
            <select
              value={filter.reportType}
              onChange={(e) => setFilter({ ...filter, reportType: Number(e.target.value) })}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-bold text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-cyan-500 shadow-inner"
            >
              {Object.entries(REPORT_TITLES).map(([num, name]) => (
                <option key={num} value={num}>
                  {num}. {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Parametric Filters */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            2. Filter Parameter Laporan
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Start date */}
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Tanggal Awal</label>
              <input
                type="date"
                value={filter.startDate || ''}
                onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            {/* End date */}
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Tanggal Akhir</label>
              <input
                type="date"
                value={filter.endDate || ''}
                onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            {/* Room filter */}
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Ruang Laboratorium</label>
              <select
                value={filter.labId || ''}
                onChange={(e) => setFilter({ ...filter, labId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium"
              >
                <option value="">Semua Ruangan Lab</option>
                {laboratories.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Condition filter */}
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Kondisi Perangkat</label>
              <select
                value={filter.condition || ''}
                onChange={(e) => setFilter({ ...filter, condition: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium"
              >
                <option value="">Semua Kondisi</option>
                <option value="Baik">Baik</option>
                <option value="Rusak Ringan">Rusak Ringan</option>
                <option value="Rusak Berat">Rusak Berat</option>
                <option value="Dalam Perbaikan">Dalam Perbaikan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenPreview}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              Pratinjau Laporan
            </button>
            <button
              onClick={handleDirectPrint}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              Cetak Langsung
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Unduh PDF
            </button>
            <button
              onClick={handleDownloadExcel}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Unduh Excel (.xlsx)
            </button>
            <button
              onClick={handleDownloadWord}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Unduh Word (.doc)
            </button>
            <button
              onClick={handleDownloadCsv}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Live Table Report View in Page */}
      <div className={`${!isPreviewModalOpen ? 'printable-document' : ''} bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden`}>
        {/* Report Official Master Letterhead Banner */}
        <div className="p-5 sm:p-6 bg-white border-b border-slate-200 space-y-3">
          <MasterKopSurat />
          <div className="text-center space-y-0.5 pt-1">
            <div className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              {currentReportResult.title}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Nomor: {currentReportResult.reportNumber} • Tanggal: {currentReportResult.generatedDate}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                {currentReportResult.headers.map((h, i) => (
                  <th key={i} className="py-3 px-4 font-bold text-xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentReportResult.rows.length > 0 ? (
                currentReportResult.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-3 px-4">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={currentReportResult.headers.length || 1} className="py-12 text-center text-slate-400">
                    Tidak ada baris data yang cocok dengan kriteria filter saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Notes and Signature Blocks */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-6">
          {/* Notes */}
          <div className="text-xs">
            <span className="font-bold text-slate-800 block mb-1">Catatan & Rekapitulasi:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              {currentReportResult.summaryNotes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 text-center text-xs pt-4 border-t border-slate-200">
            <div>
              <div className="text-slate-500">Mengetahui,</div>
              <div className="font-bold text-slate-800">Kepala Sekolah SMKN 15 Pandeglang</div>
              <div className="mt-16 font-extrabold text-slate-900 underline">{settings.principalName}</div>
              <div className="text-[10px] text-slate-500 font-mono">NIP. {settings.principalNip}</div>
            </div>

            <div>
              <div className="text-slate-500">Pandeglang, {currentReportResult.generatedDate}</div>
              <div className="font-bold text-slate-800">Kepala Laboratorium Komputer</div>
              <div className="mt-16 font-extrabold text-slate-900 underline">{settings.headOfLabName}</div>
              <div className="text-[10px] text-slate-500 font-mono">NIP. {settings.headOfLabNip}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pratinjau Modal */}
      {isPreviewModalOpen && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-cyan-400" />
                Pratinjau Resmi Laporan Laboratorium
              </h3>
              <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Letterhead and Content */}
            <div className="max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible">
              <div className="printable-document p-6 sm:p-8 space-y-5 text-xs bg-white">
                <MasterKopSurat />

                <div className="text-center space-y-1">
                  <h2 className="text-sm font-extrabold uppercase text-slate-900">{previewData.title}</h2>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Nomor: {previewData.reportNumber} | Periode: {settings.academicYear} | Tanggal: {previewData.generatedDate}
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl print:rounded-none print:overflow-visible">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-200">
                        {previewData.headers.map((h, i) => (
                          <th key={i} className="py-2.5 px-3 font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((c, cIdx) => (
                            <td key={cIdx} className="py-2 px-3">{String(c)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <span className="font-bold text-slate-800 block mb-1">Catatan & Rekapitulasi:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    {previewData.summaryNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 text-center pt-8 text-xs">
                  <div>
                    <div>Mengetahui,</div>
                    <div className="font-semibold">Kepala SMKN 15 Pandeglang</div>
                    <div className="mt-14 font-bold underline">{settings.principalName}</div>
                    <div className="text-[10px] text-slate-500">NIP. {settings.principalNip}</div>
                  </div>
                  <div>
                    <div>Pandeglang, {previewData.generatedDate}</div>
                    <div className="font-semibold">Kepala Laboratorium Komputer</div>
                    <div className="mt-14 font-bold underline">{settings.headOfLabName}</div>
                    <div className="text-[10px] text-slate-500">NIP. {settings.headOfLabNip}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                Cetak
              </button>
              <button
                onClick={async () => {
                  await generatePdfReport(previewData, settings);
                }}
                className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Unduh PDF
              </button>
              <button
                onClick={() => {
                  generateExcelReport(previewData, settings);
                }}
                className="px-4 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Unduh Excel
              </button>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
