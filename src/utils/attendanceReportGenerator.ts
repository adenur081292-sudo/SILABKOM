import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  PageOrientation,
} from 'docx';
import {
  AttendanceSettings,
  AttendanceStatusCode,
  ClassAttendanceRecord,
  GradeLevel,
  SchoolCalendarEvent,
  SchoolClass,
  Student,
  AcademicYearConfig,
} from '../types';
import {
  calculateAttendanceMetrics,
  getEffectiveSchoolDates,
  getSemesterRange,
  getUnrecordedSchoolDaysCount,
  getWeekDatesInMonth,
  MONTH_NAMES_ID,
} from './attendanceUtils';
import {
  MASTER_KOP_DATA,
  addMasterKopToPdf,
  buildMasterKopDocxBlocks,
} from './masterKopSurat';

export interface AttendanceReportFilter {
  reportType: number; // 1 to 14
  startDate?: string;
  endDate?: string;
  month?: number; // 1..12
  year?: number;
  semester?: '1' | '2' | 'all';
  academicYear?: string;
  classId?: string;
  studentName?: string;
  status?: AttendanceStatusCode | '';
}

export interface AttendanceReportResult {
  title: string;
  reportNumber: string;
  periodLabel: string;
  classLabel: string;
  academicYearLabel: string;
  homeroomName: string;
  homeroomNip: string;
  generatedDate: string;
  headers: string[];
  rows: (string | number)[][];
  summaryNotes: string[];
  chartBars?: { label: string; value: number }[];
}

export const ATTENDANCE_REPORT_DEFINITIONS: { id: number; label: string; desc: string }[] = [
  { id: 1, label: 'Laporan Absensi Harian per Kelas', desc: 'Detail kehadiran siswa per tanggal yang dipilih' },
  { id: 2, label: 'Laporan Absensi Mingguan', desc: 'Rekap kehadiran siswa selama rentang minggu terpilih' },
  { id: 3, label: 'Laporan Absensi Bulanan', desc: 'Rekap kehadiran siswa per bulan berjalan' },
  { id: 4, label: 'Laporan Absensi Semester', desc: 'Rekapitulasi kehadiran semester 1 (Jul-Des) atau semester 2 (Jan-Jun)' },
  { id: 5, label: 'Laporan Absensi Tahunan', desc: 'Rekap kehadiran siswa sepanjang tahun pelajaran' },
  { id: 6, label: 'Rekapitulasi Kehadiran Seluruh Kelas', desc: 'Tabel ringkasan seluruh 9 kelas (X, XI, XII AKL/DKV/ATPH)' },
  { id: 7, label: 'Rekapitulasi Kehadiran Tingkat X', desc: 'Rekap gabungan & per kelas tingkat X (AKL, DKV, ATPH)' },
  { id: 8, label: 'Rekapitulasi Kehadiran Tingkat XI', desc: 'Rekap gabungan & per kelas tingkat XI (AKL, DKV, ATPH)' },
  { id: 9, label: 'Rekapitulasi Kehadiran Tingkat XII', desc: 'Rekap gabungan & per kelas tingkat XII (AKL, DKV, ATPH)' },
  { id: 10, label: 'Laporan Siswa Sering Tidak Hadir', desc: 'Daftar siswa dengan jumlah ketidakhadiran (S+I+A) terbanyak' },
  { id: 11, label: 'Laporan Siswa Tanpa Keterangan (Alpa)', desc: 'Daftar siswa yang memiliki catatan Alpa pada periode terpilih' },
  { id: 12, label: 'Laporan Siswa Persentase Kehadiran Rendah', desc: 'Siswa dengan persentase kehadiran di bawah ambang batas sekolah' },
  { id: 13, label: 'Laporan Riwayat Kehadiran Individu', desc: 'Histori log status absensi per siswa secara kronologis' },
  { id: 14, label: 'Laporan Perbandingan Kehadiran Antarkelas', desc: 'Peringkat dan perbandingan tingkat kehadiran 9 kelas' },
];

export function compileAttendanceReport(
  filter: AttendanceReportFilter,
  payload: {
    classes: SchoolClass[];
    students: Student[];
    records: ClassAttendanceRecord[];
    settings: AttendanceSettings;
    calendar: SchoolCalendarEvent[];
    academicYears: AcademicYearConfig[];
  }
): AttendanceReportResult {
  const { classes, students, records, settings, calendar, academicYears } = payload;
  const def = ATTENDANCE_REPORT_DEFINITIONS.find((d) => d.id === filter.reportType) || ATTENDANCE_REPORT_DEFINITIONS[0];
  const academicYear = filter.academicYear || settings.activeAcademicYear || '2026/2027';

  // Resolve effective date boundaries
  let periodStart = filter.startDate || '';
  let periodEnd = filter.endDate || '';
  let periodLabel = 'Semua Periode';

  if (filter.reportType === 1) {
    const targetDay = filter.startDate || filter.endDate || new Date().toISOString().split('T')[0];
    periodStart = targetDay;
    periodEnd = targetDay;
    periodLabel = `Tanggal ${targetDay}`;
  } else if (filter.reportType === 2) {
    const y = filter.year || new Date().getFullYear();
    const m = filter.month || new Date().getMonth() + 1;
    const wDates = getWeekDatesInMonth(y, m, 1);
    if (!periodStart && wDates.length) {
      periodStart = `${y}-${String(m).padStart(2, '0')}-01`;
      periodEnd = `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    }
    periodLabel = periodStart && periodEnd ? `${periodStart} s.d. ${periodEnd}` : `${MONTH_NAMES_ID[m - 1]} ${y}`;
  } else if (filter.reportType === 3) {
    const y = filter.year || new Date().getFullYear();
    const m = filter.month || new Date().getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    periodStart = filter.startDate || `${y}-${String(m).padStart(2, '0')}-01`;
    periodEnd = filter.endDate || `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    periodLabel = `${MONTH_NAMES_ID[m - 1]} ${y}`;
  } else if (filter.reportType === 4) {
    const sem = filter.semester === '2' ? '2' : '1';
    const range = getSemesterRange(academicYear, sem, academicYears);
    periodStart = filter.startDate || range.startDate;
    periodEnd = filter.endDate || range.endDate;
    periodLabel = `Semester ${sem} (${sem === '1' ? 'Jul-Des' : 'Jan-Jun'}) TP ${academicYear}`;
  } else if (filter.reportType === 5) {
    const s1 = getSemesterRange(academicYear, '1', academicYears);
    const s2 = getSemesterRange(academicYear, '2', academicYears);
    periodStart = filter.startDate || s1.startDate;
    periodEnd = filter.endDate || s2.endDate;
    periodLabel = `Tahun Pelajaran ${academicYear}`;
  } else if (filter.startDate || filter.endDate) {
    periodLabel = `${filter.startDate || 'Awal'} s.d. ${filter.endDate || 'Sekarang'}`;
  }

  // Filter classes & students
  const selectedClass = filter.classId ? classes.find((c) => c.id === filter.classId) : undefined;
  const classLabel = selectedClass ? selectedClass.name : 'Seluruh Kelas (X, XI, XII)';
  const homeroomName = selectedClass?.homeroomTeacherName || 'Wali Kelas / Koordinator Absensi';
  const homeroomNip = selectedClass?.homeroomTeacherNip || '-';

  // Filter attendance records cleanly
  const filteredRecords = records.filter((r) => {
    if (filter.classId && r.classId !== filter.classId) return false;
    if (filter.academicYear && r.academicYear !== filter.academicYear) return false;
    if (filter.semester && filter.semester !== 'all' && r.semester !== filter.semester) return false;
    if (periodStart && r.date < periodStart) return false;
    if (periodEnd && r.date > periodEnd) return false;
    if (filter.status && r.status !== filter.status) return false;
    if (filter.studentName && !r.studentName.toLowerCase().includes(filter.studentName.toLowerCase())) return false;
    return true;
  });

  const effStart = periodStart || settings.schoolStartDate || '2026-07-13';
  const effEnd = periodEnd || new Date().toISOString().split('T')[0];
  const effectiveDates = getEffectiveSchoolDates(effStart, effEnd, settings, calendar);
  const { unrecordedCount } = getUnrecordedSchoolDaysCount(effectiveDates, filteredRecords, filter.classId);
  const globalMetrics = calculateAttendanceMetrics(filteredRecords);

  const reportNumber = `SMKN15/ABS/LAP-${String(filter.reportType).padStart(2, '0')}/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
  const generatedDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let headers: string[] = [];
  let rows: (string | number)[][] = [];
  let summaryNotes: string[] = [];
  let chartBars: { label: string; value: number }[] = [];

  const compileByStudents = (targetStudents: Student[]) => {
    return targetStudents.map((st, idx) => {
      const stRecords = filteredRecords.filter((r) => r.studentId === st.id);
      const m = calculateAttendanceMetrics(stRecords);
      return {
        row: [
          idx + 1,
          st.nis,
          st.fullName,
          st.className,
          m.hadir,
          m.sakit,
          m.izin,
          m.alpa,
          m.dispensasi,
          m.ketidakhadiran,
          m.validCount,
          `${m.percentage}%`,
        ],
        metrics: m,
        student: st,
      };
    });
  };

  const compileByClasses = (targetClasses: SchoolClass[]) => {
    return targetClasses.map((cls) => {
      const activeStudents = students.filter((s) => s.classId === cls.id && s.status === 'Aktif');
      const clsRecords = filteredRecords.filter((r) => r.classId === cls.id);
      const m = calculateAttendanceMetrics(clsRecords);
      return {
        cls,
        totalStudents: activeStudents.length,
        metrics: m,
      };
    });
  };

  switch (filter.reportType) {
    case 1: {
      // 1. Laporan absensi harian per kelas
      headers = ['No', 'NIS', 'Nama Lengkap Siswa', 'Kelas', 'Tanggal', 'Sesi', 'Status', 'Keterangan', 'Petugas Input'];
      const targetStudents = students.filter(
        (s) =>
          (!filter.classId || s.classId === filter.classId) &&
          (!filter.studentName || s.fullName.toLowerCase().includes(filter.studentName.toLowerCase())) &&
          s.status === 'Aktif'
      );
      rows = targetStudents.map((st, idx) => {
        const rec = filteredRecords.find((r) => r.studentId === st.id);
        return [
          idx + 1,
          st.nis,
          st.fullName,
          st.className,
          rec?.date || periodStart,
          rec?.session || 'Harian',
          rec?.status || 'Belum Diinput',
          rec?.description || '-',
          rec?.recordedBy || '-',
        ];
      });
      summaryNotes = [
        `Total Siswa Kelas: ${targetStudents.length} Siswa`,
        `Hadir: ${globalMetrics.hadir} | Sakit: ${globalMetrics.sakit} | Izin: ${globalMetrics.izin} | Alpa: ${globalMetrics.alpa} | Dispensasi: ${globalMetrics.dispensasi}`,
        `Persentase Kehadiran Valid: ${globalMetrics.percentage}%`,
      ];
      break;
    }

    case 2:
    case 3:
    case 4:
    case 5: {
      // 2, 3, 4, 5: Mingguan, Bulanan, Semester, Tahunan per siswa
      headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Dispen', 'Total Tidak Hadir', 'Valid', 'Kehadiran (%)'];
      const targetStudents = students.filter(
        (s) =>
          (!filter.classId || s.classId === filter.classId) &&
          (!filter.studentName || s.fullName.toLowerCase().includes(filter.studentName.toLowerCase()))
      );
      const compiled = compileByStudents(targetStudents);
      rows = compiled.map((c) => c.row);
      summaryNotes = [
        `Total Siswa Tercakup: ${targetStudents.length} Siswa | Catatan Valid: ${globalMetrics.validCount}`,
        `H: ${globalMetrics.hadir} | S: ${globalMetrics.sakit} | I: ${globalMetrics.izin} | A: ${globalMetrics.alpa} | D: ${globalMetrics.dispensasi}`,
        `Persentase Kehadiran Keseluruhan: ${globalMetrics.percentage}% (Hari efektif tanpa input: ${unrecordedCount} hari — tidak dihitung Alpa)`,
      ];
      break;
    }

    case 6:
    case 14: {
      // 6. Rekap seluruh kelas & 14. Perbandingan antarkelas
      headers = ['No', 'Kelas', 'Program Keahlian', 'Wali Kelas', 'Total Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Dispensasi', 'Valid', 'Persentase (%)'];
      const compiled = compileByClasses(classes);
      const ordered = filter.reportType === 14
        ? [...compiled].sort((a, b) => b.metrics.percentage - a.metrics.percentage)
        : compiled;
      rows = ordered.map((item, idx) => [
        idx + 1,
        item.cls.name,
        item.cls.major,
        item.cls.homeroomTeacherName,
        item.totalStudents,
        item.metrics.hadir,
        item.metrics.sakit,
        item.metrics.izin,
        item.metrics.alpa,
        item.metrics.dispensasi,
        item.metrics.validCount,
        `${item.metrics.percentage}%`,
      ]);
      chartBars = ordered.map((item) => ({
        label: item.cls.name,
        value: item.metrics.percentage,
      }));
      const top = [...compiled].sort((a, b) => b.metrics.percentage - a.metrics.percentage)[0];
      summaryNotes = [
        `Total Kelas: ${classes.length} Kelas | Total Siswa Aktif: ${students.filter((s) => s.status === 'Aktif').length} Siswa`,
        `Kehadiran Tertinggi: ${top ? `${top.cls.name} (${top.metrics.percentage}%)` : '-'}`,
        `Rata-rata Kehadiran Sekolah: ${globalMetrics.percentage}%`,
      ];
      break;
    }

    case 7:
    case 8:
    case 9: {
      // 7, 8, 9: Rekapitulasi Tingkat X, XI, XII
      const targetGrade: GradeLevel = filter.reportType === 7 ? 'X' : filter.reportType === 8 ? 'XI' : 'XII';
      headers = ['No', 'Kelas', 'Program Keahlian', 'Wali Kelas', 'Siswa Aktif', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Dispen', 'Ketidakhadiran', 'Persentase (%)'];
      const gradeClasses = classes.filter((c) => c.gradeLevel === targetGrade);
      const compiled = compileByClasses(gradeClasses);
      rows = compiled.map((item, idx) => [
        idx + 1,
        item.cls.name,
        item.cls.majorFullName,
        item.cls.homeroomTeacherName,
        item.totalStudents,
        item.metrics.hadir,
        item.metrics.sakit,
        item.metrics.izin,
        item.metrics.alpa,
        item.metrics.dispensasi,
        item.metrics.ketidakhadiran,
        `${item.metrics.percentage}%`,
      ]);
      chartBars = compiled.map((item) => ({ label: item.cls.name, value: item.metrics.percentage }));
      const gradeRecords = filteredRecords.filter((r) => gradeClasses.some((c) => c.id === r.classId));
      const gm = calculateAttendanceMetrics(gradeRecords);
      summaryNotes = [
        `Tingkat ${targetGrade} mencakup 3 kelas (${gradeClasses.map((c) => c.name).join(', ')})`,
        `Hadir: ${gm.hadir} | Sakit: ${gm.sakit} | Izin: ${gm.izin} | Alpa: ${gm.alpa} | Dispen: ${gm.dispensasi}`,
        `Persentase Kehadiran Tingkat ${targetGrade}: ${gm.percentage}%`,
      ];
      break;
    }

    case 10: {
      // 10. Laporan siswa sering tidak hadir (S+I+A terbanyak)
      headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Sakit', 'Izin', 'Alpa', 'Total Tidak Hadir (S+I+A)', 'Valid', 'Persentase (%)'];
      const targetStudents = students.filter((s) => !filter.classId || s.classId === filter.classId);
      const compiled = targetStudents
        .map((st) => ({ st, m: calculateAttendanceMetrics(filteredRecords.filter((r) => r.studentId === st.id)) }))
        .filter((x) => x.m.ketidakhadiran > 0)
        .sort((a, b) => b.m.ketidakhadiran - a.m.ketidakhadiran);
      rows = compiled.map((x, idx) => [
        idx + 1,
        x.st.nis,
        x.st.fullName,
        x.st.className,
        x.m.sakit,
        x.m.izin,
        x.m.alpa,
        x.m.ketidakhadiran,
        x.m.validCount,
        `${x.m.percentage}%`,
      ]);
      summaryNotes = [
        `Ditemukan ${compiled.length} siswa dengan catatan ketidakhadiran (Sakit + Izin + Alpa).`,
        'Perlu tindak lanjut pembinaan bersama Wali Kelas & Guru BK sesuai tata tertib sekolah.',
      ];
      break;
    }

    case 11: {
      // 11. Laporan siswa tanpa keterangan (Alpa)
      headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Jumlah Alpa', 'Tanggal Alpa', 'Keterangan', 'No. Telp Orang Tua'];
      const targetStudents = students.filter((s) => !filter.classId || s.classId === filter.classId);
      const compiled = targetStudents
        .map((st) => {
          const alpaRecs = filteredRecords.filter((r) => r.studentId === st.id && r.status === 'A');
          return { st, alpaRecs };
        })
        .filter((x) => x.alpaRecs.length > 0)
        .sort((a, b) => b.alpaRecs.length - a.alpaRecs.length);
      rows = compiled.map((x, idx) => [
        idx + 1,
        x.st.nis,
        x.st.fullName,
        x.st.className,
        `${x.alpaRecs.length} Hari`,
        x.alpaRecs.map((r) => r.date).join(', '),
        x.alpaRecs.map((r) => r.description).filter(Boolean).join('; ') || 'Tanpa Keterangan',
        x.st.parentPhone || '-',
      ]);
      summaryNotes = [
        `Total Siswa Memiliki Catatan Alpa: ${compiled.length} Siswa`,
        `Total Kejadian Alpa pada Periode Ini: ${globalMetrics.alpa} Catatan`,
      ];
      break;
    }

    case 12: {
      // 12. Laporan siswa persentase kehadiran rendah (< threshold)
      const threshold = settings.lowAttendanceThreshold || 85;
      headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'S+I+A', 'Catatan Valid', 'Persentase (%)', 'Keterangan'];
      const targetStudents = students.filter((s) => !filter.classId || s.classId === filter.classId);
      const compiled = targetStudents
        .map((st) => ({ st, m: calculateAttendanceMetrics(filteredRecords.filter((r) => r.studentId === st.id)) }))
        .filter((x) => x.m.validCount > 0 && x.m.percentage < threshold)
        .sort((a, b) => a.m.percentage - b.m.percentage);
      rows = compiled.map((x, idx) => [
        idx + 1,
        x.st.nis,
        x.st.fullName,
        x.st.className,
        x.m.hadir,
        x.m.ketidakhadiran,
        x.m.validCount,
        `${x.m.percentage}%`,
        `Di bawah ambang batas (${threshold}%)`,
      ]);
      summaryNotes = [
        `Ambang Batas Kehadiran Sekolah: ${threshold}%`,
        `Jumlah Siswa Perlu Perhatian Khusus: ${compiled.length} Siswa`,
      ];
      break;
    }

    case 13:
    default: {
      // 13. Laporan riwayat kehadiran individu
      headers = ['No', 'Tanggal', 'Sesi', 'NIS', 'Nama Siswa', 'Kelas', 'Status', 'Keterangan', 'Petugas Pencatat'];
      const sorted = [...filteredRecords].sort((a, b) => b.date.localeCompare(a.date));
      rows = sorted.map((r, idx) => [
        idx + 1,
        r.date,
        r.session || 'Harian',
        r.nis || '-',
        r.studentName,
        r.className,
        r.status,
        r.description || '-',
        r.recordedBy,
      ]);
      summaryNotes = [
        `Total Log Riwayat Kehadiran: ${sorted.length} Catatan`,
        `Persentase Hadir: ${globalMetrics.percentage}% (H:${globalMetrics.hadir}, S:${globalMetrics.sakit}, I:${globalMetrics.izin}, A:${globalMetrics.alpa}, D:${globalMetrics.dispensasi})`,
      ];
      break;
    }
  }

  return {
    title: def.label.toUpperCase(),
    reportNumber,
    periodLabel,
    classLabel,
    academicYearLabel: academicYear,
    homeroomName,
    homeroomNip,
    generatedDate,
    headers,
    rows,
    summaryNotes,
    chartBars,
  };
}

// ===========================================
// 1. EXPORT PDF (.pdf) WITH MASTER KOP SURAT FOTO 1
// ===========================================
export async function generateAttendancePdfReport(
  report: AttendanceReportResult,
  settings: AttendanceSettings
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Official Master Kop Surat SMKN 15 Pandeglang (FOTO 1)
  const titleStartY = await addMasterKopToPdf(doc, 14, 8);

  // Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(report.title, pageWidth / 2, titleStartY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Nomor: ${report.reportNumber}  |  Kelas: ${report.classLabel}  |  Periode: ${report.periodLabel}  |  Tahun Pelajaran: ${report.academicYearLabel}`,
    pageWidth / 2,
    titleStartY + 5,
    { align: 'center' }
  );

  // Table
  autoTable(doc, {
    startY: titleStartY + 9,
    head: [report.headers],
    body: report.rows.length > 0 ? report.rows : [['-', 'Tidak ada data pada filter yang dipilih', '', '', '', '']],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.4,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  let finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 110;
  if (finalY > 148) {
    doc.addPage();
    finalY = 20;
  }

  // Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Rekapitulasi & Catatan Perhitungan:', 14, finalY + 8);
  doc.setFont('helvetica', 'normal');
  report.summaryNotes.forEach((n, i) => {
    doc.text(`• ${n}`, 18, finalY + 13 + i * 4.5);
  });

  // Mini visual bars if relevant
  if (report.chartBars && report.chartBars.length > 0) {
    const barStartY = finalY + 14 + report.summaryNotes.length * 4.5 + 3;
    if (barStartY < 165) {
      doc.setFont('helvetica', 'bold');
      doc.text('Grafik Ringkas Persentase Kehadiran Antarkelas:', 14, barStartY);
      report.chartBars.slice(0, 9).forEach((b, idx) => {
        const y = barStartY + 5 + idx * 5;
        if (y < 185) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.text(b.label, 14, y);
          doc.setFillColor(226, 232, 240);
          doc.rect(34, y - 3, 55, 3, 'F');
          doc.setFillColor(8, 145, 178);
          doc.rect(34, y - 3, Math.max(1, (b.value / 100) * 55), 3, 'F');
          doc.text(`${b.value}%`, 92, y);
        }
      });
    }
  }

  // Signatures (Kepala Sekolah & Wali Kelas)
  const signY = Math.max(finalY + 32, 140);
  const leftX = 55;
  const rightX = pageWidth - 65;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Mengetahui,', leftX, signY, { align: 'center' });
  doc.text('Kepala Sekolah', leftX, signY + 5, { align: 'center' });

  doc.text(`${settings.reportCity || 'Pandeglang'}, ${report.generatedDate}`, rightX, signY, { align: 'center' });
  doc.text('Wali Kelas / Petugas Absensi', rightX, signY + 5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(settings.principalName || '-', leftX, signY + 25, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${settings.principalNip || '-'}`, leftX, signY + 29, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(report.homeroomName, rightX, signY + 25, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${report.homeroomNip}`, rightX, signY + 29, { align: 'center' });

  doc.save(`${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_smkn15.pdf`);
}

// ===========================================
// 2. EXPORT EXCEL (.xlsx)
// ===========================================
export function generateAttendanceExcelReport(
  report: AttendanceReportResult,
  settings: AttendanceSettings
) {
  const wb = XLSX.utils.book_new();
  const sheetData: (string | number)[][] = [
    [MASTER_KOP_DATA.line1],
    [MASTER_KOP_DATA.line2],
    [MASTER_KOP_DATA.line3],
    [`${MASTER_KOP_DATA.addressLine1} ${MASTER_KOP_DATA.addressLine2}`],
    [`Website: ${MASTER_KOP_DATA.websiteUrl}, Email: ${MASTER_KOP_DATA.emailAddress}`],
    [],
    [report.title],
    [`Nomor: ${report.reportNumber}`],
    [`Kelas: ${report.classLabel} | Periode: ${report.periodLabel} | Tahun Pelajaran: ${report.academicYearLabel}`],
    [`Tanggal Pembuatan: ${report.generatedDate}`],
    [],
    report.headers,
    ...report.rows,
    [],
    ['REKAPITULASI & CATATAN:'],
    ...report.summaryNotes.map((n) => [n]),
    [],
    ['Mengetahui,', '', '', '', `${settings.reportCity || 'Pandeglang'}, ${report.generatedDate}`],
    ['Kepala Sekolah,', '', '', '', 'Wali Kelas / Petugas Absensi,'],
    [],
    [],
    [settings.principalName || '-', '', '', '', report.homeroomName],
    [`NIP. ${settings.principalNip || '-'}`, '', '', '', `NIP. ${report.homeroomNip}`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Absensi');
  XLSX.writeFile(wb, `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_smkn15.xlsx`);
}

// ===========================================
// 3. EXPORT REAL WORD (.docx)
// ===========================================
export async function generateAttendanceWordReport(
  report: AttendanceReportResult,
  settings: AttendanceSettings
) {
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  };

  const headerRow = new TableRow({
    tableHeader: true,
    children: report.headers.map(
      (h) =>
        new TableCell({
          shading: { fill: '0F172A' },
          borders: cellBorder,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: h,
                  bold: true,
                  color: 'FFFFFF',
                  size: 18,
                  font: 'Calibri',
                }),
              ],
            }),
          ],
        })
    ),
  });

  const dataRows = report.rows.map(
    (r) =>
      new TableRow({
        children: r.map(
          (val) =>
            new TableCell({
              borders: cellBorder,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: String(val),
                      size: 18,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            })
        ),
      })
  );

  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorder,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Mengetahui,', size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Kepala Sekolah SMKN 15 Pandeglang', size: 20 })],
              }),
              new Paragraph({ text: '' }),
              new Paragraph({ text: '' }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: settings.principalName || '-', bold: true, underline: {}, size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `NIP. ${settings.principalNip || '-'}`, size: 18 })],
              }),
            ],
          }),
          new TableCell({
            borders: noBorder,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${settings.reportCity || 'Pandeglang'}, ${report.generatedDate}`, size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Wali Kelas / Petugas Absensi', size: 20 })],
              }),
              new Paragraph({ text: '' }),
              new Paragraph({ text: '' }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: report.homeroomName, bold: true, underline: {}, size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `NIP. ${report.homeroomNip}`, size: 18 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const masterKopBlocks = await buildMasterKopDocxBlocks();

  const wordDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
          },
        },
        children: [
          ...masterKopBlocks,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 80 },
            children: [new TextRun({ text: report.title, bold: true, size: 24 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Nomor: ${report.reportNumber}  |  Kelas: ${report.classLabel}  |  Periode: ${report.periodLabel}  |  Tahun Pelajaran: ${report.academicYearLabel}`,
                size: 18,
                color: '475569',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [new TextRun({ text: 'Catatan & Rekapitulasi:', bold: true, size: 20 })],
          }),
          ...report.summaryNotes.map(
            (n) =>
              new Paragraph({
                spacing: { after: 40 },
                children: [new TextRun({ text: `• ${n}`, size: 18 })],
              })
          ),
          new Paragraph({ text: '', spacing: { before: 240 } }),
          signatureTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(wordDoc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_smkn15.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===========================================
// 4. EXPORT CSV (.csv)
// ===========================================
const sanitizeAttCsv = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (/^-\d+(\.\d+)?$/.test(str.trim())) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  const first = str.charAt(0);
  const safe =
    first === '=' || first === '+' || first === '-' || first === '@' || first === '\t' || first === '\r'
      ? `'${str}`
      : str;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function generateAttendanceCsvReport(report: AttendanceReportResult) {
  const csvRows: string[] = [];
  csvRows.push(sanitizeAttCsv(report.title));
  csvRows.push(sanitizeAttCsv(`Nomor: ${report.reportNumber}`));
  csvRows.push(
    sanitizeAttCsv(
      `Kelas: ${report.classLabel} | Periode: ${report.periodLabel} | Tahun Pelajaran: ${report.academicYearLabel}`
    )
  );
  csvRows.push('');
  csvRows.push(report.headers.map((h) => sanitizeAttCsv(h)).join(','));
  report.rows.forEach((r) => {
    csvRows.push(r.map((c) => sanitizeAttCsv(c)).join(','));
  });
  const csvContent = '\ufeff' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_smkn15.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
