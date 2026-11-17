import {
  Computer,
  ComputerDamageReport,
  ComputerOperationalStatus,
  ComputerUsageRecord,
  Schedule,
  UserRole,
} from '../types';
import { resolveComputerOperationalStatus } from './computerUsageUtils';

/**
 * Parses HH:MM (24-hour) string into total minutes since midnight.
 * Returns null if format or bounds are invalid.
 */
export function normalizeTimeToMinutes(timeStr: string | undefined | null): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Validates that startTime and endTime are well-formed HH:MM values and startTime < endTime.
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const startMin = normalizeTimeToMinutes(startTime);
  const endMin = normalizeTimeToMinutes(endTime);
  if (startMin === null || endMin === null) return false;
  return startMin < endMin;
}

/**
 * Checks whether two intervals [startA, endA) and [startB, endB) overlap.
 * Boundary touching (e.g., 07:00-09:00 and 09:00-11:00) is NOT an overlap.
 */
export function doTimeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = normalizeTimeToMinutes(startA);
  const aEnd = normalizeTimeToMinutes(endA);
  const bStart = normalizeTimeToMinutes(startB);
  const bEnd = normalizeTimeToMinutes(endB);
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false;
  if (aStart >= aEnd || bStart >= bEnd) return false;
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Finds any schedule conflict for the same room & date (excluding cancelled or self).
 */
export function findScheduleOverlap(
  candidate: Pick<Schedule, 'id' | 'labId' | 'date' | 'startTime' | 'endTime' | 'status'>,
  existingSchedules: Schedule[]
): { validTimeRange: boolean; conflict: Schedule | null } {
  if (!isValidTimeRange(candidate.startTime, candidate.endTime)) {
    return { validTimeRange: false, conflict: null };
  }
  if (candidate.status === 'Dibatalkan') {
    return { validTimeRange: true, conflict: null };
  }

  const clash =
    existingSchedules.find((s) => {
      if (s.id === candidate.id) return false;
      if (s.labId !== candidate.labId) return false;
      if (s.date !== candidate.date) return false;
      if (s.status === 'Dibatalkan') return false;
      return doTimeRangesOverlap(
        candidate.startTime,
        candidate.endTime,
        s.startTime,
        s.endTime
      );
    }) || null;

  return { validTimeRange: true, conflict: clash };
}

/**
 * Validates that computerCode and inventoryNumber are unique across existing computers.
 */
export function validateComputerUniqueIdentity(
  candidate: Pick<Computer, 'id' | 'computerCode' | 'inventoryNumber'>,
  existingComputers: Computer[]
): { valid: boolean; error?: string } {
  const normCode = (candidate.computerCode || '').trim().toUpperCase();
  const normInv = (candidate.inventoryNumber || '').trim().toUpperCase();

  if (!normCode) {
    return { valid: false, error: 'Kode komputer (contoh: PC-1 s.d. PC-20) wajib diisi.' };
  }

  const dupCode = existingComputers.find(
    (c) => c.id !== candidate.id && (c.computerCode || '').trim().toUpperCase() === normCode
  );
  if (dupCode) {
    return {
      valid: false,
      error: `Kode komputer "${candidate.computerCode}" sudah terdaftar pada unit "${dupCode.deviceName}". Gunakan kode unit yang unik.`,
    };
  }

  if (normInv) {
    const dupInv = existingComputers.find(
      (c) => c.id !== candidate.id && (c.inventoryNumber || '').trim().toUpperCase() === normInv
    );
    if (dupInv) {
      return {
        valid: false,
        error: `Nomor inventaris "${candidate.inventoryNumber}" sudah digunakan oleh ${dupInv.computerCode}.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Determines whether a PC can be selected for usage, enforcing damaged (PC-9) and active session locks.
 */
export function isComputerUsableForRole(
  pc: Computer,
  usages: ComputerUsageRecord[],
  damageReports: ComputerDamageReport[],
  role: UserRole
): { usable: boolean; status: ComputerOperationalStatus; reason?: string } {
  const status = resolveComputerOperationalStatus(pc, usages, damageReports);

  if (status === 'SEDANG DIGUNAKAN') {
    const active = usages.find(
      (u) => u.computerId === pc.id && u.usageStatus === 'Sedang Digunakan'
    );
    return {
      usable: false,
      status,
      reason: `${pc.computerCode} sedang digunakan oleh ${active?.userName || pc.activeUserName || 'pengguna lain'}.`,
    };
  }

  if (status === 'RUSAK' || status === 'DALAM PERBAIKAN' || status === 'TIDAK DIGUNAKAN') {
    return {
      usable: false,
      status,
      reason: `${pc.computerCode} berstatus ${status} (${pc.condition}) dan dikunci agar tidak dipakai sebelum diperbaiki.`,
    };
  }

  if (
    status === 'PERLU PEMERIKSAAN' &&
    role !== 'admin' &&
    role !== 'teknisi' &&
    role !== 'kepala_lab'
  ) {
    return {
      usable: false,
      status,
      reason: `${pc.computerCode} berstatus PERLU PEMERIKSAAN oleh Teknisi/Laboran sebelum dapat digunakan.`,
    };
  }

  return { usable: true, status };
}

/**
 * Detects time overlap for a computer usage session on the same date (useful for admin manual time entries).
 */
export function findUsageTimeOverlapOnSameDate(
  computerId: string,
  usageDate: string,
  startTime: string,
  endTime: string | undefined,
  existingUsages: ComputerUsageRecord[],
  excludeUsageId?: string
): ComputerUsageRecord | null {
  const startMin = normalizeTimeToMinutes(startTime);
  if (startMin === null) return null;
  // If checking start-time only (open check-in), represent as a 1-minute slot at startTime
  const endMin = endTime ? normalizeTimeToMinutes(endTime) : startMin + 1;
  if (endMin === null || endMin <= startMin) return null;

  return (
    existingUsages.find((u) => {
      if (u.id === excludeUsageId || u.usageId === excludeUsageId) return false;
      if (u.computerId !== computerId) return false;
      if (u.usageDate !== usageDate) return false;
      if (u.usageStatus === 'Dibatalkan') return false;

      if (u.usageStatus === 'Sedang Digunakan') {
        return true;
      }

      const uStart = normalizeTimeToMinutes(u.startTime);
      const uEnd = normalizeTimeToMinutes(u.endTime);
      if (uStart === null || uEnd === null || uEnd <= uStart) return false;
      return startMin < uEnd && endMin > uStart;
    }) || null
  );
}

export interface BackupValidationSummary {
  valid: boolean;
  error?: string;
  version: string;
  appName: string;
  exportDate: string;
  isOlderThanCurrentSettings: boolean;
  totalCollections: number;
  totalRecords: number;
  collectionCounts: { key: string; label: string; count: number }[];
}

const BACKUP_COLLECTION_LABELS: { key: string; label: string }[] = [
  { key: 'laboratories', label: 'Ruangan Laboratorium' },
  { key: 'computers', label: 'Inventaris Komputer (PC-1 s.d. PC-20)' },
  { key: 'equipment', label: 'Perangkat Pendukung' },
  { key: 'schedules', label: 'Jadwal Laboratorium' },
  { key: 'borrowings', label: 'Peminjaman Barang' },
  { key: 'maintenanceList', label: 'Pemeliharaan & Servis' },
  { key: 'damageReports', label: 'Laporan Kerusakan Alat' },
  { key: 'documents', label: 'Dokumen & SOP' },
  { key: 'usersLab', label: 'Direktori Pengguna Lab' },
  { key: 'activities', label: 'Dokumentasi Kegiatan' },
  { key: 'guests', label: 'Buku Tamu Lab' },
  { key: 'studentAttendances', label: 'Absensi Praktikum Guru' },
  { key: 'lessonJournals', label: 'Jurnal Praktikum Guru' },
  { key: 'schoolClasses', label: 'Kelas Tetap (9 Kelas)' },
  { key: 'students', label: 'Data Siswa' },
  { key: 'classAttendances', label: 'Rekam Absensi Kelas' },
  { key: 'academicYears', label: 'Tahun Pelajaran' },
  { key: 'schoolCalendar', label: 'Kalender Sekolah' },
  { key: 'computerUsages', label: 'Riwayat Penggunaan Komputer' },
  { key: 'computerUsageMembers', label: 'Anggota Kelompok Penggunaan PC' },
  { key: 'computerConditionChecks', label: 'Pemeriksaan Kondisi 9 Komponen' },
  { key: 'computerDamageReports', label: 'Laporan Kerusakan Penggunaan PC' },
  { key: 'computerStatusHistories', label: 'Riwayat Status Komputer' },
  { key: 'externalUsers', label: 'Tamu Eksternal Penggunaan PC' },
  { key: 'galleryCategories', label: 'Kategori Galeri' },
  { key: 'galleryImages', label: 'Galeri Laboratorium' },
  { key: 'accessRoles', label: 'Peran & Hak Akses RBAC' },
];

/**
 * Validates parsed backup JSON safely before restore preview/execution.
 */
export function validateBackupPayload(
  parsed: any,
  currentSettingsUpdatedAt?: string
): BackupValidationSummary {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      error: 'Struktur file JSON backup tidak valid (bukan objek JSON).',
      version: '-',
      appName: '-',
      exportDate: '-',
      isOlderThanCurrentSettings: false,
      totalCollections: 0,
      totalRecords: 0,
      collectionCounts: [],
    };
  }

  const hasAppMarker =
    typeof parsed.appName === 'string' &&
    parsed.appName.toUpperCase().includes('SILABKOM');
  const hasSettings = parsed.settings && typeof parsed.settings === 'object';
  const hasAnyArray = BACKUP_COLLECTION_LABELS.some((c) => Array.isArray(parsed[c.key]));

  if (!hasAppMarker && !hasSettings && !hasAnyArray) {
    return {
      valid: false,
      error: 'File JSON ini tidak dikenali sebagai cadangan database SILABKOM.',
      version: '-',
      appName: '-',
      exportDate: '-',
      isOlderThanCurrentSettings: false,
      totalCollections: 0,
      totalRecords: 0,
      collectionCounts: [],
    };
  }

  // Ensure no collection field is corrupted (non-array where array is expected)
  for (const col of BACKUP_COLLECTION_LABELS) {
    if (parsed[col.key] !== undefined && !Array.isArray(parsed[col.key])) {
      return {
        valid: false,
        error: `Data koleksi "${col.label}" rusak atau bukan daftar array yang valid.`,
        version: '-',
        appName: '-',
        exportDate: '-',
        isOlderThanCurrentSettings: false,
        totalCollections: 0,
        totalRecords: 0,
        collectionCounts: [],
      };
    }
  }

  const collectionCounts = BACKUP_COLLECTION_LABELS.filter((col) =>
    Array.isArray(parsed[col.key])
  ).map((col) => ({
    key: col.key,
    label: col.label,
    count: (parsed[col.key] as any[]).length,
  }));

  const totalRecords =
    collectionCounts.reduce((sum, item) => sum + item.count, 0) +
    (hasSettings ? 1 : 0) +
    (parsed.attendanceSettings ? 1 : 0) +
    (parsed.computerUsageSettings ? 1 : 0);

  const exportDate = typeof parsed.exportDate === 'string' ? parsed.exportDate : '';
  let isOlderThanCurrentSettings = false;
  if (exportDate && currentSettingsUpdatedAt) {
    const expMs = Date.parse(exportDate);
    const curMs = Date.parse(currentSettingsUpdatedAt);
    if (!Number.isNaN(expMs) && !Number.isNaN(curMs) && expMs < curMs) {
      isOlderThanCurrentSettings = true;
    }
  }

  return {
    valid: true,
    version: String(parsed.version || '2.x'),
    appName: String(parsed.appName || 'SILABKOM SMKN 15 Pandeglang'),
    exportDate: exportDate || 'Tidak tercatat',
    isOlderThanCurrentSettings,
    totalCollections: collectionCounts.length,
    totalRecords,
    collectionCounts,
  };
}
