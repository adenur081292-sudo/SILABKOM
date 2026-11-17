import {
  AttendanceStatusCode,
  ClassAttendanceRecord,
  AttendanceSettings,
  SchoolCalendarEvent,
  AcademicYearConfig,
} from '../types';

export const STATUS_LABELS: Record<AttendanceStatusCode, string> = {
  H: 'Hadir',
  S: 'Sakit',
  I: 'Izin',
  A: 'Alpa',
  D: 'Dispensasi',
};

export interface AttendanceMetrics {
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  dispensasi: number;
  ketidakhadiran: number; // S + I + A
  validCount: number; // H + S + I + A + D
  percentage: number; // (H / validCount) * 100
}

/**
 * Rumus Perhitungan Resmi (Section 9):
 * - Jumlah Ketidakhadiran = Sakit + Izin + Alpa
 * - Jumlah Catatan Absensi Valid = Hadir + Sakit + Izin + Alpa + Dispensasi
 * - Persentase Kehadiran = (Jumlah Hadir / Jumlah Catatan Absensi Valid) * 100%
 * Data yang belum diinput TIDAK dianggap sebagai alpa.
 */
export function calculateAttendanceMetrics(records: ClassAttendanceRecord[]): AttendanceMetrics {
  let hadir = 0;
  let sakit = 0;
  let izin = 0;
  let alpa = 0;
  let dispensasi = 0;

  for (const r of records) {
    if (r.status === 'H') hadir++;
    else if (r.status === 'S') sakit++;
    else if (r.status === 'I') izin++;
    else if (r.status === 'A') alpa++;
    else if (r.status === 'D') dispensasi++;
  }

  const ketidakhadiran = sakit + izin + alpa;
  const validCount = hadir + sakit + izin + alpa + dispensasi;
  const percentage = validCount > 0 ? Number(((hadir / validCount) * 100).toFixed(1)) : 0;

  return {
    hadir,
    sakit,
    izin,
    alpa,
    dispensasi,
    ketidakhadiran,
    validCount,
    percentage,
  };
}

/**
 * Checks whether a YYYY-MM-DD date is a holiday in school_calendar
 */
export function getHolidayEventForDate(
  dateStr: string,
  calendar: SchoolCalendarEvent[]
): SchoolCalendarEvent | undefined {
  return calendar.find((ev) => {
    if (!ev.isHoliday) return false;
    if (ev.endDate && ev.endDate >= ev.date) {
      return dateStr >= ev.date && dateStr <= ev.endDate;
    }
    return ev.date === dateStr;
  });
}

/**
 * Checks if a date is an effective school day based on activeDays and holidays
 */
export function isEffectiveSchoolDate(
  dateStr: string,
  settings: AttendanceSettings,
  calendar: SchoolCalendarEvent[]
): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  const dayOfWeek = dt.getDay(); // 0=Sun..6=Sat
  const activeDays = settings.activeDays?.length ? settings.activeDays : [1, 2, 3, 4, 5];
  if (!activeDays.includes(dayOfWeek)) return false;
  if (getHolidayEventForDate(dateStr, calendar)) return false;
  return true;
}

/**
 * Generates all effective school dates between startDate and endDate inclusive (up to today if capped)
 */
export function getEffectiveSchoolDates(
  startDate: string,
  endDate: string,
  settings: AttendanceSettings,
  calendar: SchoolCalendarEvent[],
  capAtToday = true
): string[] {
  const todayStr = getTodayIso();
  const effectiveEnd = capAtToday && endDate > todayStr ? todayStr : endDate;
  if (!startDate || !effectiveEnd || startDate > effectiveEnd) return [];

  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = effectiveEnd.split('-').map(Number);
  const curr = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  const result: string[] = [];
  let guard = 0;
  while (curr <= end && guard < 400) {
    guard++;
    const iso = formatDateToIso(curr);
    if (isEffectiveSchoolDate(iso, settings, calendar)) {
      result.push(iso);
    }
    curr.setDate(curr.getDate() + 1);
  }
  return result;
}

/**
 * Counts effective school days in the range that do NOT have any recorded attendance yet
 */
export function getUnrecordedSchoolDaysCount(
  effectiveDates: string[],
  records: ClassAttendanceRecord[],
  classId?: string
): { unrecordedCount: number; unrecordedDates: string[] } {
  const recordedSet = new Set<string>();
  for (const r of records) {
    if (!classId || r.classId === classId) {
      recordedSet.add(r.date);
    }
  }
  const unrecordedDates = effectiveDates.filter((d) => !recordedSet.has(d));
  return {
    unrecordedCount: unrecordedDates.length,
    unrecordedDates,
  };
}

export function formatDateToIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getTodayIso(): string {
  return formatDateToIso(new Date());
}

/**
 * Deterministic ID to prevent duplicate attendance per student per date per session
 */
export function buildAttendanceDocId(date: string, session: string, studentId: string): string {
  const safeSession = (session || 'Harian').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const safeStudent = studentId.replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `${date}__${safeSession}__${safeStudent}`;
}

/**
 * Resolves semester date ranges based on academic year (e.g. "2026/2027")
 * Semester 1: July - December of startYear
 * Semester 2: January - June of endYear
 */
export function getSemesterRange(
  academicYear: string,
  semester: '1' | '2',
  configs?: AcademicYearConfig[]
): { startDate: string; endDate: string } {
  const cfg = configs?.find((c) => c.year === academicYear);
  if (cfg) {
    return semester === '1'
      ? { startDate: cfg.semester1Start, endDate: cfg.semester1End }
      : { startDate: cfg.semester2Start, endDate: cfg.semester2End };
  }
  const parts = (academicYear || '2026/2027').split('/');
  const startY = Number(parts[0]) || 2026;
  const endY = Number(parts[1]) || startY + 1;
  if (semester === '1') {
    return { startDate: `${startY}-07-01`, endDate: `${startY}-12-31` };
  }
  return { startDate: `${endY}-01-01`, endDate: `${endY}-06-30` };
}

/**
 * Gets all dates belonging to weekIndex (1..5) of a given month (1..12) and year
 */
export function getWeekDatesInMonth(year: number, month: number, weekIndex: number): string[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDay = (weekIndex - 1) * 7 + 1;
  if (startDay > daysInMonth) return [];
  const endDay = Math.min(daysInMonth, startDay + 6);
  const dates: string[] = [];
  for (let d = startDay; d <= endDay; d++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return dates;
}

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const DAY_FULL_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function formatIndonesianShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return `${DAY_NAMES_ID[dt.getDay()]}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}
