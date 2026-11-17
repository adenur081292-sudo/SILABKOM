import {
  Computer,
  ComputerCondition,
  ComputerDamageReport,
  ComputerOperationalStatus,
  ComputerUsageRecord,
  ComputerUsageSettings,
  ConditionChecklist,
  ConditionComponentRating,
} from '../types';

export const DEFAULT_COMPUTER_USAGE_SETTINGS: ComputerUsageSettings = {
  id: 'default',
  timezone: 'Asia/Jakarta',
  allowManualTimeOverrideForAdmin: true,
  requireBeforeCheck: true,
  requireAfterCheck: true,
  allowGroupUsage: true,
  maxGroupSize: 4,
  defaultRoomId: 'lab-komputer',
  lowUsageThresholdCount: 2,
  notifyAdminOnDamage: true,
  updatedAt: new Date().toISOString(),
};

export const CONDITION_COMPONENT_ITEMS: {
  key: keyof ConditionChecklist;
  label: string;
}[] = [
  { key: 'cpu', label: 'CPU' },
  { key: 'monitor', label: 'Monitor' },
  { key: 'keyboard', label: 'Keyboard' },
  { key: 'mouse', label: 'Mouse' },
  { key: 'cablesAndConnectors', label: 'Kabel dan konektor' },
  { key: 'internetNetwork', label: 'Jaringan internet' },
  { key: 'operatingSystem', label: 'Sistem operasi' },
  { key: 'applications', label: 'Aplikasi' },
  { key: 'otherDevices', label: 'Perangkat lainnya' },
];

export function createDefaultConditionChecklist(
  defaultValue: ConditionComponentRating = 'Baik'
): ConditionChecklist {
  return {
    cpu: defaultValue,
    monitor: defaultValue,
    keyboard: defaultValue,
    mouse: defaultValue,
    cablesAndConnectors: defaultValue,
    internetNetwork: defaultValue,
    operatingSystem: defaultValue,
    applications: defaultValue,
    otherDevices: defaultValue,
  };
}

export function deriveOverallChecklistCondition(
  checklist: ConditionChecklist
): ConditionComponentRating {
  const values = Object.values(checklist);
  if (values.includes('Rusak')) return 'Rusak';
  if (values.includes('Bermasalah')) return 'Bermasalah';
  return 'Baik';
}

export function getAffectedComponentLabels(checklist: ConditionChecklist): string[] {
  return CONDITION_COMPONENT_ITEMS.filter((item) => checklist[item.key] !== 'Baik').map(
    (item) => `${item.label} (${checklist[item.key]})`
  );
}

/**
 * Mengambil tanggal & jam saat ini berdasarkan zona waktu resmi Asia/Jakarta (WIB).
 */
export function getJakartaNow(): {
  dateStr: string;
  timeStr: string;
  displayDateTime: string;
  isoTimestamp: string;
} {
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((p) => p.type === type)?.value || '00';

  const dateStr = `${getPart(dateParts, 'year')}-${getPart(dateParts, 'month')}-${getPart(dateParts, 'day')}`;
  const timeStr = `${getPart(timeParts, 'hour')}:${getPart(timeParts, 'minute')}`;

  return {
    dateStr,
    timeStr,
    displayDateTime: `${dateStr} ${timeStr} WIB`,
    isoTimestamp: now.toISOString(),
  };
}

export function generateUsageTransactionCode(existingCount = 0): string {
  const { dateStr } = getJakartaNow();
  const compactDate = dateStr.replace(/-/g, '');
  const seq = String(existingCount + 1).padStart(4, '0');
  const rand = String(Math.floor(10 + Math.random() * 89));
  return `USG-${compactDate}-${seq}${rand}`;
}

export function generateComputerDamageCode(existingCount = 0): string {
  const { dateStr } = getJakartaNow();
  const compactDate = dateStr.replace(/-/g, '');
  const seq = String(existingCount + 1).padStart(3, '0');
  const rand = String(Math.floor(10 + Math.random() * 89));
  return `DMG-PC-${compactDate}-${seq}${rand}`;
}

/**
 * Menghitung durasi penggunaan otomatis dalam menit berdasarkan jam mulai & selesai.
 */
export function calculateDurationMinutes(
  usageDate: string,
  startTime: string,
  endTime: string
): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;

  let startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;
  if (endTotal < startTotal) {
    // Handle midnight cross if any
    endTotal += 24 * 60;
  }
  const diff = endTotal - startTotal;
  return diff >= 0 ? diff : 0;
}

export function formatDurationIndonesian(minutes: number): string {
  if (!minutes || minutes <= 0) return '< 1 menit';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs} jam ${mins} menit`;
  if (hrs > 0) return `${hrs} jam`;
  return `${mins} menit`;
}

/**
 * Resolusi status operasional komputer 6-status yang tersinkronisasi dengan inventaris & sesi aktif.
 */
export function resolveComputerOperationalStatus(
  computer: Computer,
  usages: ComputerUsageRecord[],
  damageReports: ComputerDamageReport[] = []
): ComputerOperationalStatus {
  const activeSession = usages.find(
    (u) => u.computerId === computer.id && u.usageStatus === 'Sedang Digunakan'
  );
  if (activeSession) return 'SEDANG DIGUNAKAN';

  if (computer.condition === 'Tidak Digunakan' || computer.operationalStatus === 'TIDAK DIGUNAKAN') {
    return 'TIDAK DIGUNAKAN';
  }
  if (computer.condition === 'Dalam Perbaikan' || computer.operationalStatus === 'DALAM PERBAIKAN') {
    return 'DALAM PERBAIKAN';
  }

  const openDmg = damageReports.find(
    (d) =>
      d.computerId === computer.id &&
      d.followUpStatus !== 'Selesai Diperbaiki'
  );
  if (openDmg) {
    if (openDmg.followUpStatus === 'Dalam Perbaikan') return 'DALAM PERBAIKAN';
    if (openDmg.followUpStatus === 'Perlu Pemeriksaan' || openDmg.followUpStatus === 'Menunggu Pemeriksaan') {
      return computer.condition === 'Rusak Berat' || computer.operationalStatus === 'RUSAK'
        ? 'RUSAK'
        : 'PERLU PEMERIKSAAN';
    }
    if (openDmg.followUpStatus === 'Rusak Permanen') return 'RUSAK';
  }

  if (computer.condition === 'Rusak Berat' || computer.condition === 'Rusak Ringan') {
    if (computer.operationalStatus === 'PERLU PEMERIKSAAN') return 'PERLU PEMERIKSAAN';
    return 'RUSAK';
  }

  if (computer.operationalStatus === 'PERLU PEMERIKSAAN') return 'PERLU PEMERIKSAAN';
  if (computer.operationalStatus === 'RUSAK') return 'RUSAK';

  return 'TERSEDIA';
}

export function mapOperationalStatusToCondition(
  status: ComputerOperationalStatus
): ComputerCondition {
  switch (status) {
    case 'RUSAK':
      return 'Rusak Berat';
    case 'PERLU PEMERIKSAAN':
      return 'Rusak Ringan';
    case 'DALAM PERBAIKAN':
      return 'Dalam Perbaikan';
    case 'TIDAK DIGUNAKAN':
      return 'Tidak Digunakan';
    case 'TERSEDIA':
    case 'SEDANG DIGUNAKAN':
    default:
      return 'Baik';
  }
}

/**
 * Mengambil seluruh riwayat penggunaan komputer dari terbaru hingga terlama.
 */
export function getComputerUsageTimeline(
  computerId: string,
  usages: ComputerUsageRecord[]
): ComputerUsageRecord[] {
  return usages
    .filter((u) => u.computerId === computerId)
    .sort((a, b) => {
      const dateCmp = (b.usageDate || '').localeCompare(a.usageDate || '');
      if (dateCmp !== 0) return dateCmp;
      const timeCmp = (b.startTime || '').localeCompare(a.startTime || '');
      if (timeCmp !== 0) return timeCmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
}

/**
 * Mengambil transaksi penggunaan TERAKHIR YANG SUDAH SELESAI untuk menjawab:
 * "Komputer ini terakhir digunakan oleh siapa?"
 */
export function getLastCompletedUsageForComputer(
  computerId: string,
  usages: ComputerUsageRecord[]
): ComputerUsageRecord | undefined {
  return getComputerUsageTimeline(computerId, usages).find(
    (u) => u.usageStatus === 'Selesai'
  );
}

export function getActiveUsageForComputer(
  computerId: string,
  usages: ComputerUsageRecord[]
): ComputerUsageRecord | undefined {
  return usages.find(
    (u) => u.computerId === computerId && u.usageStatus === 'Sedang Digunakan'
  );
}

export function getStatusVisualMeta(status: ComputerOperationalStatus): {
  label: string;
  badgeClass: string;
  cardBorderClass: string;
  dotColorClass: string;
} {
  switch (status) {
    case 'TERSEDIA':
      return {
        label: 'TERSEDIA',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        cardBorderClass: 'border-slate-200 hover:border-emerald-300',
        dotColorClass: 'bg-emerald-500',
      };
    case 'SEDANG DIGUNAKAN':
      return {
        label: 'SEDANG DIGUNAKAN',
        badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        cardBorderClass: 'border-cyan-300 bg-cyan-50/20',
        dotColorClass: 'bg-cyan-500',
      };
    case 'PERLU PEMERIKSAAN':
      return {
        label: 'PERLU PEMERIKSAAN',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        cardBorderClass: 'border-amber-300 bg-amber-50/20',
        dotColorClass: 'bg-amber-500',
      };
    case 'RUSAK':
      return {
        label: 'RUSAK',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        cardBorderClass: 'border-rose-300 bg-rose-50/20',
        dotColorClass: 'bg-rose-500',
      };
    case 'DALAM PERBAIKAN':
      return {
        label: 'DALAM PERBAIKAN',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        cardBorderClass: 'border-indigo-300 bg-indigo-50/20',
        dotColorClass: 'bg-indigo-500',
      };
    case 'TIDAK DIGUNAKAN':
    default:
      return {
        label: 'TIDAK DIGUNAKAN',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        cardBorderClass: 'border-slate-300 bg-slate-50/70',
        dotColorClass: 'bg-slate-500',
      };
  }
}
