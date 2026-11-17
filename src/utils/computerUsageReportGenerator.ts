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
  ShadingType,
} from 'docx';
import {
  AppSetting,
  Computer,
  ComputerDamageReport,
  ComputerStatusHistory,
  ComputerUsageRecord,
  ExternalUser,
  SchoolClass,
  Student,
  UsageUserType,
} from '../types';
import { addMasterKopToPdf, buildMasterKopDocxBlocks } from './masterKopSurat';
import {
  formatDurationIndonesian,
  getLastCompletedUsageForComputer,
  resolveComputerOperationalStatus,
} from './computerUsageUtils';
import { formatSafeCsvCell } from './offlineAssets';

export type UsageReportType =
  | 'harian_penggunaan'
  | 'mingguan_penggunaan'
  | 'bulanan_penggunaan'
  | 'per_komputer'
  | 'per_siswa'
  | 'per_kelas'
  | 'integrasi_absensi'
  | 'per_guru_tendik'
  | 'per_teknisi'
  | 'rekap_pemakaian_terakhir_pc'
  | 'pengguna_eksternal'
  | 'kerusakan_pasca_penggunaan'
  | 'analisis_kerusakan_riwayat'
  | 'status_kondisi_komputer'
  | 'komputer_sering_digunakan'
  | 'komputer_jarang_digunakan'
  | 'rekap_pemakaian_lab'
  | 'riwayat_perubahan_status';

export interface UsageReportDefinition {
  id: UsageReportType;
  number: number;
  title: string;
  description: string;
  orientation: 'portrait' | 'landscape';
  category: 'Operasional' | 'Pengguna & Kelas' | 'Kerusakan & Status' | 'Khusus';
}

export const USAGE_REPORT_DEFINITIONS: UsageReportDefinition[] = [
  {
    id: 'harian_penggunaan',
    number: 1,
    title: 'Laporan Penggunaan Komputer Harian',
    description: 'Daftar transaksi penggunaan komputer harian lengkap dengan jam mulai, selesai, durasi & kondisi.',
    orientation: 'landscape',
    category: 'Operasional',
  },
  {
    id: 'mingguan_penggunaan',
    number: 2,
    title: 'Laporan Penggunaan Komputer Mingguan',
    description: 'Rekapitulasi tren penggunaan dan total durasi pemakaian komputer pada rentang mingguan.',
    orientation: 'landscape',
    category: 'Operasional',
  },
  {
    id: 'bulanan_penggunaan',
    number: 3,
    title: 'Laporan Penggunaan Komputer Bulanan',
    description: 'Ringkasan aktivitas penggunaan komputer bulanan menurut kelas, jenis pengguna & ruangan.',
    orientation: 'landscape',
    category: 'Operasional',
  },
  {
    id: 'per_komputer',
    number: 4,
    title: 'Laporan Penggunaan Per Komputer',
    description: 'Log kronologis pemakaian tiap unit komputer untuk pelacakan detail per perangkat.',
    orientation: 'landscape',
    category: 'Operasional',
  },
  {
    id: 'per_siswa',
    number: 5,
    title: 'Laporan Penggunaan Per Siswa',
    description: 'Rekap frekuensi, durasi total & komputer terakhir yang dipakai setiap siswa.',
    orientation: 'landscape',
    category: 'Pengguna & Kelas',
  },
  {
    id: 'per_kelas',
    number: 6,
    title: 'Laporan Penggunaan Per Kelas',
    description: 'Agregasi pemanfaatan laboratorium komputer pada 9 kelas tetap (X, XI, XII AKL/DKV/ATPH).',
    orientation: 'portrait',
    category: 'Pengguna & Kelas',
  },
  {
    id: 'integrasi_absensi',
    number: 7,
    title: 'Laporan Penggunaan Siswa Terintegrasi Absensi Kelas',
    description: 'Sinkronisasi catatan penggunaan PC siswa dengan status kehadirannya pada Absensi Kelas.',
    orientation: 'landscape',
    category: 'Pengguna & Kelas',
  },
  {
    id: 'per_guru_tendik',
    number: 8,
    title: 'Laporan Penggunaan Komputer oleh Guru / Tendik',
    description: 'Riwayat pemakaian unit komputer laboratorium oleh Guru & Tenaga Kependidikan.',
    orientation: 'landscape',
    category: 'Pengguna & Kelas',
  },
  {
    id: 'per_teknisi',
    number: 9,
    title: 'Laporan Penggunaan Komputer oleh Teknisi / Laboran',
    description: 'Catatan penggunaan komputer untuk pemeliharaan, instalasi, jaringan & troubleshooting oleh teknisi.',
    orientation: 'landscape',
    category: 'Pengguna & Kelas',
  },
  {
    id: 'rekap_pemakaian_terakhir_pc',
    number: 10,
    title: 'REKAPITULASI RIWAYAT PENGGUNAAN KOMPUTER LABORATORIUM',
    description: 'Laporan khusus pemakai terakhir setiap unit PC: Kode, Nama PC, Pemakai Terakhir, Jenis, Kelas/Instansi, Waktu, Durasi, Kondisi & Status.',
    orientation: 'landscape',
    category: 'Khusus',
  },
  {
    id: 'pengguna_eksternal',
    number: 11,
    title: 'Laporan Penggunaan Komputer oleh Tamu / Pihak Eksternal',
    description: 'Rekap aktivitas pemakaian komputer oleh tamu eksternal, pengawas ujian, asesor UKK & instansi mitra.',
    orientation: 'landscape',
    category: 'Pengguna & Kelas',
  },
  {
    id: 'kerusakan_pasca_penggunaan',
    number: 12,
    title: 'Laporan Kerusakan Komputer Setelah Penggunaan',
    description: 'Daftar laporan kerusakan atau masalah yang ditemukan pada saat/sesudah pemeriksaan PC.',
    orientation: 'landscape',
    category: 'Kerusakan & Status',
  },
  {
    id: 'analisis_kerusakan_riwayat',
    number: 13,
    title: 'Laporan Analisis Kerusakan Berdasarkan Riwayat Penggunaan',
    description: 'Korelasi kronologis temuan kerusakan dengan transaksi pemakai terakhir & komponen terdampak (bersifat investigatif non-tuduhan).',
    orientation: 'landscape',
    category: 'Kerusakan & Status',
  },
  {
    id: 'status_kondisi_komputer',
    number: 14,
    title: 'Laporan Status Kondisi Seluruh Komputer',
    description: 'Snapshot operasional seluruh unit komputer (TERSEDIA, SEDANG DIGUNAKAN, PERLU PEMERIKSAAN, RUSAK, DALAM PERBAIKAN, TIDAK DIGUNAKAN).',
    orientation: 'landscape',
    category: 'Kerusakan & Status',
  },
  {
    id: 'komputer_sering_digunakan',
    number: 15,
    title: 'Laporan Komputer Paling Sering Digunakan',
    description: 'Pemeringkatan unit komputer dari beban pemakaian tertinggi lengkap dengan akumulasi durasi.',
    orientation: 'portrait',
    category: 'Operasional',
  },
  {
    id: 'komputer_jarang_digunakan',
    number: 16,
    title: 'Laporan Komputer Jarang Digunakan',
    description: 'Identifikasi unit komputer dengan frekuensi pakai paling rendah untuk pemerataan beban aset.',
    orientation: 'portrait',
    category: 'Operasional',
  },
  {
    id: 'rekap_pemakaian_lab',
    number: 17,
    title: 'Laporan Rekapitulasi Pemakaian Laboratorium',
    description: 'Ringkasan pemanfaatan ruang Laboratorium Komputer berdasarkan jenis pengguna, tanggal & durasi total.',
    orientation: 'portrait',
    category: 'Khusus',
  },
  {
    id: 'riwayat_perubahan_status',
    number: 18,
    title: 'Laporan Riwayat Perubahan Status Komputer',
    description: 'Jejak audit perubahan status operasional komputer lengkap dengan petugas pengubah & alasan.',
    orientation: 'landscape',
    category: 'Kerusakan & Status',
  },
];

export interface UsageReportFilter {
  reportType: UsageReportType;
  startDate: string;
  endDate: string;
  className: string; // 'ALL' or 'X AKL' etc.
  studentId: string; // 'ALL' or specific studentId
  userType: 'ALL' | UsageUserType;
  computerId: string; // 'ALL' or specific computerId
  status: string; // 'ALL' or status
}

export interface CompiledUsageReportData {
  title: string;
  subtitle: string;
  periodLabel: string;
  headers: string[];
  rows: (string | number)[][];
  summaryPairs: { label: string; value: string }[];
  orientation: 'portrait' | 'landscape';
}

export function compileComputerUsageReport(
  filter: UsageReportFilter,
  deps: {
    usages: ComputerUsageRecord[];
    computers: Computer[];
    damages: ComputerDamageReport[];
    statusHistories: ComputerStatusHistory[];
    students: Student[];
    schoolClasses: SchoolClass[];
    externalUsers: ExternalUser[];
  }
): CompiledUsageReportData {
  const def =
    USAGE_REPORT_DEFINITIONS.find((d) => d.id === filter.reportType) ||
    USAGE_REPORT_DEFINITIONS[0];

  const periodLabel =
    filter.startDate && filter.endDate
      ? filter.startDate === filter.endDate
        ? `Tanggal: ${filter.startDate}`
        : `Periode: ${filter.startDate} s.d. ${filter.endDate}`
      : 'Semua Periode Tersimpan';

  const matchesUsageFilter = (u: ComputerUsageRecord) => {
    if (filter.startDate && u.usageDate < filter.startDate) return false;
    if (filter.endDate && u.usageDate > filter.endDate) return false;
    if (filter.userType !== 'ALL' && u.userType !== filter.userType) return false;
    if (filter.computerId !== 'ALL' && u.computerId !== filter.computerId) return false;
    if (filter.className !== 'ALL' && (u.studentClass || '') !== filter.className) return false;
    if (filter.studentId !== 'ALL' && u.userId !== filter.studentId) return false;
    if (filter.status !== 'ALL' && u.usageStatus !== filter.status) return false;
    return true;
  };

  const filteredUsages = deps.usages.filter(matchesUsageFilter);
  const sortedComputers = [...deps.computers].sort((a, b) => {
    const na = parseInt(a.computerCode.replace(/[^0-9]/g, ''), 10) || 0;
    const nb = parseInt(b.computerCode.replace(/[^0-9]/g, ''), 10) || 0;
    return na - nb || a.computerCode.localeCompare(b.computerCode);
  });

  const totalMinutes = filteredUsages.reduce((acc, u) => acc + (u.durationMinutes || 0), 0);
  const defaultSummary = [
    { label: 'Total Transaksi', value: String(filteredUsages.length) },
    { label: 'Total Durasi Pakai', value: formatDurationIndonesian(totalMinutes) },
    {
      label: 'Penggunaan Aktif',
      value: String(filteredUsages.filter((u) => u.usageStatus === 'Sedang Digunakan').length),
    },
    {
      label: 'Kendala Pasca Pakai',
      value: String(filteredUsages.filter((u) => u.hasProblemAfter).length),
    },
  ];

  switch (filter.reportType) {
    case 'rekap_pemakaian_terakhir_pc': {
      const targetComputers =
        filter.computerId !== 'ALL'
          ? sortedComputers.filter((c) => c.id === filter.computerId)
          : sortedComputers;
      const rows = targetComputers.map((pc, idx) => {
        const active = deps.usages.find(
          (u) => u.computerId === pc.id && u.usageStatus === 'Sedang Digunakan'
        );
        const lastCompleted = getLastCompletedUsageForComputer(pc.id, deps.usages);
        const ref = active || lastCompleted;
        const opStatus = resolveComputerOperationalStatus(pc, deps.usages, deps.damages);
        const classOrInst = ref
          ? ref.userType === 'Siswa'
            ? ref.studentClass || '-'
            : ref.userType === 'Tamu'
            ? ref.externalInstitution || 'Tamu Eksternal'
            : ref.userType
          : '-';

        return [
          idx + 1,
          pc.computerCode,
          pc.deviceName,
          ref ? ref.userName : 'Belum Pernah Digunakan',
          ref ? ref.userType : '-',
          classOrInst,
          ref ? ref.usageDate : '-',
          ref ? `${ref.startTime} WIB` : '-',
          ref ? (ref.endTime ? `${ref.endTime} WIB` : 'Sedang Berlangsung') : '-',
          ref ? ref.duration : '-',
          ref ? ref.conditionAfter || ref.conditionBefore : pc.condition,
          opStatus,
        ];
      });

      const availableCount = targetComputers.filter(
        (pc) => resolveComputerOperationalStatus(pc, deps.usages, deps.damages) === 'TERSEDIA'
      ).length;
      const activeCount = targetComputers.filter(
        (pc) => resolveComputerOperationalStatus(pc, deps.usages, deps.damages) === 'SEDANG DIGUNAKAN'
      ).length;

      return {
        title: def.title,
        subtitle: 'Identifikasi Pemakai Terakhir, Durasi & Status Setiap Unit Komputer Laboratorium',
        periodLabel,
        headers: [
          'No',
          'Kode PC',
          'Nama Komputer',
          'Pemakai Terakhir / Aktif',
          'Jenis Pengguna',
          'Kelas / Asal Instansi',
          'Tanggal Terakhir',
          'Jam Mulai',
          'Jam Selesai',
          'Durasi',
          'Kondisi Terakhir',
          'Status Saat Ini',
        ],
        rows,
        summaryPairs: [
          { label: 'Total Unit Komputer', value: String(targetComputers.length) },
          { label: 'PC Tersedia', value: String(availableCount) },
          { label: 'PC Sedang Digunakan', value: String(activeCount) },
          {
            label: 'PC Ada Riwayat',
            value: String(rows.filter((r) => r[3] !== 'Belum Pernah Digunakan').length),
          },
        ],
        orientation: 'landscape',
      };
    }

    case 'per_kelas': {
      const classRows = deps.schoolClasses.map((cls, idx) => {
        const clsUsages = filteredUsages.filter(
          (u) => u.userType === 'Siswa' && u.studentClass === cls.name
        );
        const mins = clsUsages.reduce((a, b) => a + (b.durationMinutes || 0), 0);
        const uniqueStudents = new Set(clsUsages.map((u) => u.userId)).size;
        return [
          idx + 1,
          cls.name,
          cls.majorFullName,
          clsUsages.length,
          uniqueStudents,
          formatDurationIndonesian(mins),
          clsUsages.filter((u) => u.hasProblemAfter).length,
        ];
      });
      return {
        title: def.title,
        subtitle: 'Rekapitulasi Penggunaan Komputer Berdasarkan 9 Kelas Tetap SMKN 15 Pandeglang',
        periodLabel,
        headers: [
          'No',
          'Kelas',
          'Kompetensi Keahlian',
          'Total Sesi',
          'Siswa Terlibat',
          'Total Durasi',
          'Temuan Kendala',
        ],
        rows: classRows,
        summaryPairs: defaultSummary,
        orientation: 'portrait',
      };
    }

    case 'per_siswa': {
      const targetStudents = deps.students.filter((s) => {
        if (filter.className !== 'ALL' && s.className !== filter.className) return false;
        if (filter.studentId !== 'ALL' && s.id !== filter.studentId) return false;
        return true;
      });
      const rows = targetStudents
        .map((st) => {
          const stUsages = filteredUsages.filter(
            (u) => u.userType === 'Siswa' && (u.userId === st.id || u.studentNis === st.nis)
          );
          const mins = stUsages.reduce((a, b) => a + (b.durationMinutes || 0), 0);
          const last = stUsages[0];
          return {
            st,
            count: stUsages.length,
            mins,
            lastPc: last ? `${last.computerCode} (${last.usageDate})` : '-',
            lastStatus: last ? last.attendanceStatus || 'Tercatat' : '-',
          };
        })
        .filter((item) => item.count > 0 || filter.studentId !== 'ALL' || filter.className !== 'ALL')
        .map((item, idx) => [
          idx + 1,
          item.st.nis,
          item.st.fullName,
          item.st.className,
          item.count,
          formatDurationIndonesian(item.mins),
          item.lastPc,
          item.lastStatus,
        ]);

      return {
        title: def.title,
        subtitle: 'Statistik Penggunaan Komputer Per Siswa SMKN 15 Pandeglang',
        periodLabel,
        headers: [
          'No',
          'NIS',
          'Nama Siswa',
          'Kelas',
          'Jumlah Sesi',
          'Total Durasi',
          'PC & Tgl Terakhir',
          'Status Absensi Terakhir',
        ],
        rows,
        summaryPairs: defaultSummary,
        orientation: 'landscape',
      };
    }

    case 'integrasi_absensi': {
      const studentUsages = filteredUsages.filter((u) => u.userType === 'Siswa');
      const rows = studentUsages.map((u, idx) => [
        idx + 1,
        u.usageId,
        u.usageDate,
        u.studentNis || '-',
        u.userName,
        u.studentClass || '-',
        u.attendanceStatus || 'Belum Tercatat',
        u.computerCode,
        `${u.startTime} - ${u.endTime || 'Aktif'}`,
        u.duration,
        u.purpose,
      ]);
      return {
        title: def.title,
        subtitle: 'Validasi Pemakaian Komputer Siswa Terhadap Status Kehadiran Modul Absensi Kelas',
        periodLabel,
        headers: [
          'No',
          'No. Transaksi',
          'Tanggal',
          'NIS',
          'Nama Siswa',
          'Kelas',
          'Status Absensi',
          'Komputer',
          'Jam Pakai',
          'Durasi',
          'Tujuan Penggunaan',
        ],
        rows,
        summaryPairs: [
          { label: 'Total Sesi Siswa', value: String(studentUsages.length) },
          {
            label: 'Status Hadir (H)',
            value: String(studentUsages.filter((u) => u.attendanceStatus === 'H').length),
          },
          {
            label: 'Belum Tercatat Absen',
            value: String(
              studentUsages.filter((u) => !u.attendanceStatus || u.attendanceStatus === 'Belum Tercatat')
                .length
            ),
          },
          {
            label: 'Sesi Kelompok',
            value: String(studentUsages.filter((u) => u.isGroupUsage).length),
          },
        ],
        orientation: 'landscape',
      };
    }

    case 'per_guru_tendik':
    case 'per_teknisi':
    case 'pengguna_eksternal': {
      const targetType: UsageUserType =
        filter.reportType === 'per_guru_tendik'
          ? 'Guru/Tendik'
          : filter.reportType === 'per_teknisi'
          ? 'Teknisi/Laboran'
          : 'Tamu';
      const subset = filteredUsages.filter((u) => u.userType === targetType);
      const rows = subset.map((u, idx) => [
        idx + 1,
        u.usageId,
        u.usageDate,
        u.userName,
        targetType === 'Tamu'
          ? `${u.externalInstitution || '-'} ${u.externalContact ? `(${u.externalContact})` : ''}`
          : u.subjectOrActivity || targetType,
        u.computerCode,
        `${u.startTime} - ${u.endTime || 'Aktif'}`,
        u.duration,
        u.purpose,
        u.conditionAfter || u.conditionBefore,
        u.recordedBy,
      ]);
      return {
        title: def.title,
        subtitle: `Riwayat Pemakaian Komputer oleh ${targetType}`,
        periodLabel,
        headers: [
          'No',
          'No. Transaksi',
          'Tanggal',
          'Nama Lengkap',
          targetType === 'Tamu' ? 'Instansi & Kontak' : 'Kegiatan / Tugas',
          'Komputer',
          'Waktu',
          'Durasi',
          'Keperluan / Tujuan',
          'Kondisi Akhir',
          'Petugas',
        ],
        rows,
        summaryPairs: [
          { label: `Total Sesi ${targetType}`, value: String(subset.length) },
          {
            label: 'Total Durasi',
            value: formatDurationIndonesian(subset.reduce((a, b) => a + (b.durationMinutes || 0), 0)),
          },
          { label: 'Tamu Terdaftar', value: String(deps.externalUsers.length) },
          { label: 'Unit Terlibat', value: String(new Set(subset.map((s) => s.computerId)).size) },
        ],
        orientation: 'landscape',
      };
    }

    case 'kerusakan_pasca_penggunaan':
    case 'analisis_kerusakan_riwayat': {
      const filteredDmgs = deps.damages.filter((d) => {
        if (filter.startDate && d.discoveredDate < filter.startDate) return false;
        if (filter.endDate && d.discoveredDate > filter.endDate) return false;
        if (filter.computerId !== 'ALL' && d.computerId !== filter.computerId) return false;
        if (filter.status !== 'ALL' && d.followUpStatus !== filter.status) return false;
        return true;
      });
      const rows = filteredDmgs.map((d, idx) => [
        idx + 1,
        d.reportNumber,
        d.discoveredAt,
        `${d.computerCode} (${d.inventoryCode})`,
        d.damageType,
        d.affectedComponents.join(', '),
        d.severity,
        d.lastUserName ? `${d.lastUserName} (${d.lastUserType || '-'} / ${d.lastUserClassOrOrg || '-'})` : '-',
        d.lastUsageDate ? `${d.lastUsageDate} ${d.lastUsageTime || ''}` : '-',
        d.followUpStatus,
        d.inspectorName,
      ]);
      return {
        title: def.title,
        subtitle:
          filter.reportType === 'analisis_kerusakan_riwayat'
            ? 'Analisis Kronologis Temuan Kerusakan & Referensi Riwayat Pemakai Terakhir (Bukan Penuduhan Otomatis)'
            : 'Rekapitulasi Kerusakan Komputer yang Ditemukan Sebelum/Sesudah Penggunaan',
        periodLabel,
        headers: [
          'No',
          'No. Laporan',
          'Waktu Temuan',
          'Komputer',
          'Jenis Kerusakan',
          'Komponen Terdampak',
          'Keparahan',
          'Pemakai Terakhir (Kronologi)',
          'Waktu Pakai Terakhir',
          'Tindak Lanjut',
          'Pemeriksa',
        ],
        rows,
        summaryPairs: [
          { label: 'Total Laporan', value: String(filteredDmgs.length) },
          {
            label: 'Menunggu / Perlu Cek',
            value: String(
              filteredDmgs.filter(
                (d) =>
                  d.followUpStatus === 'Menunggu Pemeriksaan' ||
                  d.followUpStatus === 'Perlu Pemeriksaan'
              ).length
            ),
          },
          {
            label: 'Dalam Perbaikan',
            value: String(filteredDmgs.filter((d) => d.followUpStatus === 'Dalam Perbaikan').length),
          },
          {
            label: 'Selesai Diperbaiki',
            value: String(filteredDmgs.filter((d) => d.followUpStatus === 'Selesai Diperbaiki').length),
          },
        ],
        orientation: 'landscape',
      };
    }

    case 'status_kondisi_komputer': {
      const targetPcs =
        filter.computerId !== 'ALL'
          ? sortedComputers.filter((c) => c.id === filter.computerId)
          : sortedComputers;
      const rows = targetPcs.map((pc, idx) => {
        const opStatus = resolveComputerOperationalStatus(pc, deps.usages, deps.damages);
        const lastCompleted = getLastCompletedUsageForComputer(pc.id, deps.usages);
        return [
          idx + 1,
          pc.computerCode,
          pc.inventoryNumber,
          pc.deviceName,
          pc.labName,
          opStatus,
          pc.condition,
          pc.lastCheckDate || '-',
          lastCompleted ? `${lastCompleted.userName} (${lastCompleted.usageDate})` : 'Belum Ada',
          pc.notes || '-',
        ];
      });
      return {
        title: def.title,
        subtitle: 'Status Operasional & Kondisi Terkini Seluruh Unit Komputer Laboratorium',
        periodLabel,
        headers: [
          'No',
          'Kode PC',
          'No. Inventaris',
          'Nama Komputer',
          'Ruangan',
          'Status Operasional',
          'Kondisi Fisik',
          'Cek Terakhir',
          'Pemakai Terakhir',
          'Catatan',
        ],
        rows,
        summaryPairs: [
          { label: 'Total Unit', value: String(targetPcs.length) },
          {
            label: 'Tersedia',
            value: String(rows.filter((r) => r[5] === 'TERSEDIA').length),
          },
          {
            label: 'Perlu Cek / Rusak / Perbaikan',
            value: String(
              rows.filter((r) =>
                ['PERLU PEMERIKSAAN', 'RUSAK', 'DALAM PERBAIKAN'].includes(String(r[5]))
              ).length
            ),
          },
          {
            label: 'Sedang Digunakan',
            value: String(rows.filter((r) => r[5] === 'SEDANG DIGUNAKAN').length),
          },
        ],
        orientation: 'landscape',
      };
    }

    case 'komputer_sering_digunakan':
    case 'komputer_jarang_digunakan': {
      const counts = sortedComputers.map((pc) => {
        const pcUsages = filteredUsages.filter((u) => u.computerId === pc.id);
        const mins = pcUsages.reduce((a, b) => a + (b.durationMinutes || 0), 0);
        const last = getLastCompletedUsageForComputer(pc.id, deps.usages);
        return {
          pc,
          sessions: pcUsages.length,
          mins,
          lastDate: last?.usageDate || '-',
          opStatus: resolveComputerOperationalStatus(pc, deps.usages, deps.damages),
        };
      });
      counts.sort((a, b) =>
        filter.reportType === 'komputer_sering_digunakan'
          ? b.sessions - a.sessions || b.mins - a.mins
          : a.sessions - b.sessions || a.mins - b.mins
      );
      const rows = counts.map((item, idx) => [
        idx + 1,
        item.pc.computerCode,
        item.pc.deviceName,
        item.sessions,
        formatDurationIndonesian(item.mins),
        item.lastDate,
        item.opStatus,
      ]);
      return {
        title: def.title,
        subtitle:
          filter.reportType === 'komputer_sering_digunakan'
            ? 'Peringkat Komputer Berdasarkan Frekuensi Penggunaan Tertinggi'
            : 'Daftar Komputer dengan Tingkat Pemanfaatan Paling Rendah',
        periodLabel,
        headers: [
          'Peringkat',
          'Kode PC',
          'Nama Komputer',
          'Jumlah Sesi',
          'Total Durasi',
          'Terakhir Dipakai',
          'Status Saat Ini',
        ],
        rows,
        summaryPairs: defaultSummary,
        orientation: 'portrait',
      };
    }

    case 'rekap_pemakaian_lab': {
      const userTypes: UsageUserType[] = ['Siswa', 'Guru/Tendik', 'Teknisi/Laboran', 'Tamu'];
      const rows = userTypes.map((ut, idx) => {
        const sub = filteredUsages.filter((u) => u.userType === ut);
        const mins = sub.reduce((a, b) => a + (b.durationMinutes || 0), 0);
        const pct =
          filteredUsages.length > 0 ? Math.round((sub.length / filteredUsages.length) * 100) : 0;
        return [
          idx + 1,
          ut,
          sub.length,
          `${pct}%`,
          formatDurationIndonesian(mins),
          sub.filter((s) => s.usageStatus === 'Selesai').length,
          sub.filter((s) => s.hasProblemAfter).length,
        ];
      });
      return {
        title: def.title,
        subtitle: 'Rekapitulasi Tingkat Pemakaian Laboratorium Komputer SMKN 15 Pandeglang',
        periodLabel,
        headers: [
          'No',
          'Kategori Pengguna',
          'Total Sesi',
          'Porsi (%)',
          'Akumulasi Durasi',
          'Sesi Selesai',
          'Temuan Masalah',
        ],
        rows,
        summaryPairs: defaultSummary,
        orientation: 'portrait',
      };
    }

    case 'riwayat_perubahan_status': {
      const hist = deps.statusHistories.filter((h) => {
        if (filter.computerId !== 'ALL' && h.computerId !== filter.computerId) return false;
        const dPart = (h.timestamp || '').slice(0, 10);
        if (filter.startDate && dPart && dPart < filter.startDate) return false;
        if (filter.endDate && dPart && dPart > filter.endDate) return false;
        return true;
      });
      const rows = hist.map((h, idx) => [
        idx + 1,
        new Date(h.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        h.computerCode,
        h.previousStatus,
        h.newStatus,
        h.usageId || h.damageReportId || '-',
        h.reason,
        h.changedBy,
      ]);
      return {
        title: def.title,
        subtitle: 'Log Audit Perubahan Status Operasional Komputer Laboratorium',
        periodLabel,
        headers: [
          'No',
          'Waktu (WIB)',
          'Kode PC',
          'Status Sebelum',
          'Status Sesudah',
          'Ref. Transaksi / Laporan',
          'Keterangan / Alasan',
          'Oleh Petugas',
        ],
        rows,
        summaryPairs: [
          { label: 'Total Perubahan Status', value: String(hist.length) },
          {
            label: 'Unit Terdampak',
            value: String(new Set(hist.map((h) => h.computerId)).size),
          },
        ],
        orientation: 'landscape',
      };
    }

    default: {
      // harian, mingguan, bulanan, per_komputer
      const rows = filteredUsages.map((u, idx) => [
        idx + 1,
        u.usageId,
        u.usageDate,
        `${u.startTime}${u.endTime ? ` - ${u.endTime}` : ' - Aktif'}`,
        u.duration,
        u.computerCode,
        u.userName,
        u.userType,
        u.userType === 'Siswa'
          ? `${u.studentClass || '-'} (NIS: ${u.studentNis || '-'})`
          : u.userType === 'Tamu'
          ? u.externalInstitution || '-'
          : u.subjectOrActivity || '-',
        u.purpose,
        u.conditionBefore,
        u.conditionAfter || '-',
        u.usageStatus,
        u.recordedBy,
      ]);
      return {
        title: def.title,
        subtitle: def.description,
        periodLabel,
        headers: [
          'No',
          'No. Transaksi',
          'Tanggal',
          'Jam Pakai',
          'Durasi',
          'PC',
          'Nama Pengguna',
          'Jenis',
          'Kelas / Instansi / Tugas',
          'Tujuan / Materi',
          'Sebelum',
          'Sesudah',
          'Status',
          'Petugas',
        ],
        rows,
        summaryPairs: defaultSummary,
        orientation: 'landscape',
      };
    }
  }
}

export async function generateUsagePdfReport(
  compiled: CompiledUsageReportData,
  settings: AppSetting
): Promise<void> {
  const doc = new jsPDF({
    orientation: compiled.orientation,
    unit: 'mm',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  // Wajib menggunakan Master Kop Surat Resmi SMKN 15 Pandeglang
  let curY = await addMasterKopToPdf(doc, marginX, 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(compiled.title.toUpperCase(), pageWidth / 2, curY + 2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${compiled.subtitle}  |  ${compiled.periodLabel}`, pageWidth / 2, curY + 7, {
    align: 'center',
  });
  curY += 12;

  if (compiled.summaryPairs.length > 0) {
    const summaryText = compiled.summaryPairs.map((s) => `${s.label}: ${s.value}`).join('   •   ');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(summaryText, pageWidth / 2, curY, { align: 'center' });
    curY += 5;
  }

  autoTable(doc, {
    startY: curY,
    head: [compiled.headers],
    body:
      compiled.rows.length > 0
        ? compiled.rows.map((r) => r.map((c) => String(c)))
        : [['-', 'Belum ada data transaksi pada filter yang dipilih', ...Array(Math.max(0, compiled.headers.length - 2)).fill('')]],
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: compiled.headers.length > 10 ? 7.2 : 8,
      cellPadding: 2.2,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
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
  });

  const finalY = ((doc as any).lastAutoTable?.finalY || curY + 20) + 10;
  const sigY = finalY > pageHeight - 40 ? (doc.addPage(), 22) : finalY;

  const todayId = new Date().toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Pandeglang, ${todayId}`, pageWidth - marginX - 58, sigY);
  doc.text('Mengetahui,', marginX + 6, sigY);
  doc.text('Kepala Sekolah,', marginX + 6, sigY + 5);
  doc.text('Kepala Laboratorium Komputer,', pageWidth - marginX - 58, sigY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text(settings.principalName || 'Drs. H. Mulyadi, M.Pd.', marginX + 6, sigY + 24);
  doc.text(settings.headOfLabName || 'Ade Nur, S.Kom., M.T.', pageWidth - marginX - 58, sigY + 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${settings.principalNip || '-'}`, marginX + 6, sigY + 28.5);
  doc.text(`NIP. ${settings.headOfLabNip || '-'}`, pageWidth - marginX - 58, sigY + 28.5);

  const safeFileName = `${compiled.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
  doc.save(safeFileName);
}

export function generateUsageExcelReport(compiled: CompiledUsageReportData): void {
  const wsData: any[][] = [
    ['PEMERINTAH PROVINSI BANTEN - DINAS PENDIDIKAN DAN KEBUDAYAAN'],
    ['SMKN 15 PANDEGLANG - LABORATORIUM KOMPUTER'],
    [compiled.title.toUpperCase()],
    [`${compiled.subtitle} (${compiled.periodLabel})`],
    [],
    compiled.headers,
    ...compiled.rows,
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penggunaan PC');
  const safeFileName = `${compiled.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.xlsx`;
  XLSX.writeFile(wb, safeFileName);
}

export function generateUsageCsvReport(compiled: CompiledUsageReportData): void {
  const lines = [
    compiled.headers.map((h) => formatSafeCsvCell(h)).join(','),
    ...compiled.rows.map((r) => r.map((c) => formatSafeCsvCell(c)).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${compiled.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function generateUsageWordReport(
  compiled: CompiledUsageReportData,
  settings: AppSetting
): Promise<void> {
  const kopBlocks = await buildMasterKopDocxBlocks();
  const borderStyle = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  };

  const headerRow = new TableRow({
    children: compiled.headers.map(
      (h) =>
        new TableCell({
          borders: borderStyle,
          shading: { fill: '0F172A', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 17, font: 'Tahoma' })],
            }),
          ],
        })
    ),
  });

  const dataRows = (compiled.rows.length > 0 ? compiled.rows : [['-', 'Tidak ada data']]).map(
    (r) =>
      new TableRow({
        children: compiled.headers.map((_, colIdx) =>
          new TableCell({
            borders: borderStyle,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(r[colIdx] ?? ''),
                    size: 16,
                    font: 'Tahoma',
                    color: '0F172A',
                  }),
                ],
              }),
            ],
          })
        ),
      })
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });

  const todayId = new Date().toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size:
              compiled.orientation === 'landscape'
                ? { width: 16838, height: 11906 }
                : { width: 11906, height: 16838 },
          },
        },
        children: [
          ...kopBlocks,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 40 },
            children: [
              new TextRun({
                text: compiled.title.toUpperCase(),
                bold: true,
                size: 24,
                font: 'Tahoma',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 140 },
            children: [
              new TextRun({
                text: `${compiled.subtitle} | ${compiled.periodLabel}`,
                size: 18,
                font: 'Tahoma',
                color: '334155',
              }),
            ],
          }),
          table,
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 240, after: 20 },
            children: [
              new TextRun({
                text: `Pandeglang, ${todayId}`,
                size: 18,
                font: 'Tahoma',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 0, after: 240 },
            children: [
              new TextRun({
                text: 'Kepala Laboratorium Komputer SMKN 15 Pandeglang',
                size: 18,
                font: 'Tahoma',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `${settings.headOfLabName || 'Ade Nur, S.Kom., M.T.'} (NIP. ${settings.headOfLabNip || '-'})`,
                bold: true,
                size: 18,
                font: 'Tahoma',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${compiled.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
