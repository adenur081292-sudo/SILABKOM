import {
  SchoolClass,
  Student,
  ClassAttendanceRecord,
  AcademicYearConfig,
  SchoolCalendarEvent,
  AttendanceSettings,
  AttendanceLog,
  AttendanceStatusCode,
} from '../types';
import { buildAttendanceDocId } from './attendanceUtils';

export const FIXED_SCHOOL_CLASSES: SchoolClass[] = [
  // TINGKAT X
  {
    id: 'x-akl',
    name: 'X AKL',
    gradeLevel: 'X',
    major: 'AKL',
    majorFullName: 'Akuntansi dan Keuangan Lembaga',
    homeroomTeacherName: 'Rina Marlina, S.Pd.',
    homeroomTeacherNip: '19880612 201402 2 003',
    academicYear: '2026/2027',
    order: 1,
  },
  {
    id: 'x-dkv',
    name: 'X DKV',
    gradeLevel: 'X',
    major: 'DKV',
    majorFullName: 'Desain Komunikasi Visual',
    homeroomTeacherName: 'Siti Rahmawati, S.Sn.',
    homeroomTeacherNip: '19910324 201903 2 011',
    academicYear: '2026/2027',
    order: 2,
  },
  {
    id: 'x-atph',
    name: 'X ATPH',
    gradeLevel: 'X',
    major: 'ATPH',
    majorFullName: 'Agribisnis Tanaman Pangan dan Hortikultura',
    homeroomTeacherName: 'Dedi Kurniawan, S.P.',
    homeroomTeacherNip: '19850918 201212 1 004',
    academicYear: '2026/2027',
    order: 3,
  },
  // TINGKAT XI
  {
    id: 'xi-akl',
    name: 'XI AKL',
    gradeLevel: 'XI',
    major: 'AKL',
    majorFullName: 'Akuntansi dan Keuangan Lembaga',
    homeroomTeacherName: 'Nenden Suryani, S.E.',
    homeroomTeacherNip: '19870210 201503 2 006',
    academicYear: '2026/2027',
    order: 4,
  },
  {
    id: 'xi-dkv',
    name: 'XI DKV',
    gradeLevel: 'XI',
    major: 'DKV',
    majorFullName: 'Desain Komunikasi Visual',
    homeroomTeacherName: 'Ahmad Fauzi, S.T.',
    homeroomTeacherNip: '19890412 201502 1 005',
    academicYear: '2026/2027',
    order: 5,
  },
  {
    id: 'xi-atph',
    name: 'XI ATPH',
    gradeLevel: 'XI',
    major: 'ATPH',
    majorFullName: 'Agribisnis Tanaman Pangan dan Hortikultura',
    homeroomTeacherName: 'Hendra Wijaya, S.P., M.Si.',
    homeroomTeacherNip: '19841103 201001 1 007',
    academicYear: '2026/2027',
    order: 6,
  },
  // TINGKAT XII
  {
    id: 'xii-akl',
    name: 'XII AKL',
    gradeLevel: 'XII',
    major: 'AKL',
    majorFullName: 'Akuntansi dan Keuangan Lembaga',
    homeroomTeacherName: 'Dra. Hj. Yanti Susilawati',
    homeroomTeacherNip: '19750419 200501 2 009',
    academicYear: '2026/2027',
    order: 7,
  },
  {
    id: 'xii-dkv',
    name: 'XII DKV',
    gradeLevel: 'XII',
    major: 'DKV',
    majorFullName: 'Desain Komunikasi Visual',
    homeroomTeacherName: 'Ade Nur, S.Kom., M.T.',
    homeroomTeacherNip: '19870520 201101 1 008',
    academicYear: '2026/2027',
    order: 8,
  },
  {
    id: 'xii-atph',
    name: 'XII ATPH',
    gradeLevel: 'XII',
    major: 'ATPH',
    majorFullName: 'Agribisnis Tanaman Pangan dan Hortikultura',
    homeroomTeacherName: 'Ujang Rohman, S.P.',
    homeroomTeacherNip: '19830125 200902 1 002',
    academicYear: '2026/2027',
    order: 9,
  },
];

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  id: 'default',
  activeAcademicYear: '2026/2027',
  activeSemester: '1',
  activeDays: [1, 2, 3, 4, 5], // Senin - Jumat
  schoolStartDate: '2026-07-13',
  lowAttendanceThreshold: 85,
  principalName: 'Drs. H. Mulyadi, M.Pd.',
  principalNip: '19710815 199802 1 002',
  reportCity: 'Pandeglang',
  schoolName: 'SMKN 15 PANDEGLANG',
  schoolAddress: 'Jalan Jaksa Agung R. Soeprapto KM.6, Kp. Tapen RT.001 RW.003, Desa Cadasari, Kecamatan Cadasari, Kabupaten Pandeglang, Provinsi Banten, Kode Pos: 42251',
  reportHeaderGov: 'PEMERINTAH PROVINSI BANTEN',
  reportHeaderDept: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
  logoUrl: '/assets/aistudio/LOGO_FIX_SMKN_15_2022_bdddecc6.png',
};

export const INITIAL_ACADEMIC_YEARS: AcademicYearConfig[] = [
  {
    id: 'ay-2025-2026',
    year: '2025/2026',
    semester1Start: '2025-07-14',
    semester1End: '2025-12-20',
    semester2Start: '2026-01-05',
    semester2End: '2026-06-19',
    activeSemester: '2',
    isActive: false,
  },
  {
    id: 'ay-2026-2027',
    year: '2026/2027',
    semester1Start: '2026-07-13',
    semester1End: '2026-12-18',
    semester2Start: '2027-01-04',
    semester2End: '2027-06-18',
    activeSemester: '1',
    isActive: true,
  },
];

export const INITIAL_SCHOOL_CALENDAR: SchoolCalendarEvent[] = [
  {
    id: 'cal-01',
    date: '2026-08-17',
    title: 'Hari Kemerdekaan RI Ke-81',
    type: 'Libur Nasional',
    isHoliday: true,
    description: 'Hari libur nasional Republik Indonesia',
  },
  {
    id: 'cal-02',
    date: '2026-08-25',
    title: 'Maulid Nabi Muhammad SAW',
    type: 'Libur Nasional',
    isHoliday: true,
    description: 'Hari besar keagamaan nasional',
  },
  {
    id: 'cal-03',
    date: '2026-10-05',
    endDate: '2026-10-09',
    title: 'Penilaian Tengah Semester (PTS) Ganjil',
    type: 'Kegiatan Sekolah',
    isHoliday: false,
    description: 'Kegiatan belajar efektif evaluasi tengah semester',
  },
  {
    id: 'cal-04',
    date: '2026-12-21',
    endDate: '2027-01-02',
    title: 'Libur Akhir Semester Ganjil & Tahun Baru',
    type: 'Libur Semester',
    isHoliday: true,
    description: 'Libur semester 1 Tahun Pelajaran 2026/2027',
  },
  {
    id: 'cal-05',
    date: '2026-12-25',
    title: 'Hari Raya Natal',
    type: 'Libur Nasional',
    isHoliday: true,
    description: 'Libur Nasional',
  },
];

const STUDENT_NAMES_BY_CLASS: Record<string, { name: string; gender: 'L' | 'P' }[]> = {
  'x-akl': [
    { name: 'Adinda Putri Lestari', gender: 'P' },
    { name: 'Bagus Pratama Putra', gender: 'L' },
    { name: 'Citra Ayu Permata', gender: 'P' },
    { name: 'Dimas Wahyudi', gender: 'L' },
    { name: 'Eka Nurul Hidayah', gender: 'P' },
  ],
  'x-dkv': [
    { name: 'Fajar Ramadhan', gender: 'L' },
    { name: 'Gita Puspita Sari', gender: 'P' },
    { name: 'Hafiz Maulana Malik', gender: 'L' },
    { name: 'Intan Kusuma Wardani', gender: 'P' },
    { name: 'Joko Susilo', gender: 'L' },
  ],
  'x-atph': [
    { name: 'Kartika Dewi Rahayu', gender: 'P' },
    { name: 'Lukman Hakim', gender: 'L' },
    { name: 'Melati Sukma', gender: 'P' },
    { name: 'Nanda Rizki Saputra', gender: 'L' },
    { name: 'Oktavia Nurjanah', gender: 'P' },
  ],
  'xi-akl': [
    { name: 'Putri Amelia Zahra', gender: 'P' },
    { name: 'Qoriatu Hasanah', gender: 'P' },
    { name: 'Rendi Kurniawan', gender: 'L' },
    { name: 'Salsa Bila Rahma', gender: 'P' },
    { name: 'Taufik Hidayat', gender: 'L' },
  ],
  'xi-dkv': [
    { name: 'Umar Bakri', gender: 'L' },
    { name: 'Vina Alvionita', gender: 'P' },
    { name: 'Wahyu Setiawan', gender: 'L' },
    { name: 'Yulia Rahmawati', gender: 'P' },
    { name: 'Zaki Mubarak', gender: 'L' },
  ],
  'xi-atph': [
    { name: 'Ahmad Rifai', gender: 'L' },
    { name: 'Bela Safitri', gender: 'P' },
    { name: 'Candra Wijaya', gender: 'L' },
    { name: 'Dewi Anggraeni', gender: 'P' },
    { name: 'Eko Prasetyo', gender: 'L' },
  ],
  'xii-akl': [
    { name: 'Fitriani Nurhaliza', gender: 'P' },
    { name: 'Galang Aditya', gender: 'L' },
    { name: 'Hana Pertiwi', gender: 'P' },
    { name: 'Irfan Maulana', gender: 'L' },
    { name: 'Lilis Suryani', gender: 'P' },
  ],
  'xii-dkv': [
    { name: 'Muhammad Ilham Saputra', gender: 'L' },
    { name: 'Nadia Safira', gender: 'P' },
    { name: 'Panji Nugroho', gender: 'L' },
    { name: 'Riska Damayanti', gender: 'P' },
    { name: 'Syahru Ramadhan', gender: 'L' },
  ],
  'xii-atph': [
    { name: 'Teguh Santoso', gender: 'L' },
    { name: 'Ulfa Khoirunnisa', gender: 'P' },
    { name: 'Vicky Hermawan', gender: 'L' },
    { name: 'Wulan Dari', gender: 'P' },
    { name: 'Yoga Pratama', gender: 'L' },
  ],
};

export const INITIAL_CLASS_STUDENTS: Student[] = (() => {
  const list: Student[] = [];
  let seq = 1;
  for (const cls of FIXED_SCHOOL_CLASSES) {
    const names = STUDENT_NAMES_BY_CLASS[cls.id] || [];
    names.forEach((entry, idx) => {
      const nis = `26${String(cls.order).padStart(2, '0')}${String(idx + 1).padStart(3, '0')}`;
      const nisn = `008${String(1000000 + seq * 137).slice(0, 7)}`;
      const studentId = `std-${cls.id}-${idx + 1}`;
      list.push({
        id: studentId,
        studentId,
        nis,
        nisn,
        fullName: entry.name,
        name: entry.name,
        gender: entry.gender,
        classId: cls.id,
        className: cls.name,
        grade: cls.gradeLevel,
        major: cls.majorFullName,
        majorCode: cls.major,
        academicYear: '2026/2027',
        homeroomTeacher: cls.homeroomTeacherName,
        address: 'Kab. Pandeglang, Banten',
        status: 'Aktif',
        parentPhone: `0812${String(11000000 + seq * 7919).slice(0, 8)}`,
        createdAt: '2026-07-13T07:00:00.000Z',
        updatedAt: '2026-07-13T07:00:00.000Z',
      });
      seq++;
    });
  }
  return list;
})();

const SAMPLE_DATES: { date: string; semester: '1' | '2'; academicYear: string }[] = [
  // Several months across Semester 1 (2026/2027) & recent November 2026 dates up to 2026-11-12
  { date: '2026-08-10', semester: '1', academicYear: '2026/2027' },
  { date: '2026-09-14', semester: '1', academicYear: '2026/2027' },
  { date: '2026-10-12', semester: '1', academicYear: '2026/2027' },
  { date: '2026-11-02', semester: '1', academicYear: '2026/2027' },
  { date: '2026-11-04', semester: '1', academicYear: '2026/2027' },
  { date: '2026-11-09', semester: '1', academicYear: '2026/2027' },
  { date: '2026-11-10', semester: '1', academicYear: '2026/2027' },
  { date: '2026-11-11', semester: '1', academicYear: '2026/2027' },
  { date: '2026-11-12', semester: '1', academicYear: '2026/2027' },
];

export const INITIAL_CLASS_ATTENDANCE: ClassAttendanceRecord[] = (() => {
  const records: ClassAttendanceRecord[] = [];
  SAMPLE_DATES.forEach((dInfo, dIdx) => {
    INITIAL_CLASS_STUDENTS.forEach((st, sIdx) => {
      // Deterministic realistic distribution (mostly Hadir, some S/I/A/D)
      let status: AttendanceStatusCode = 'H';
      let description = '';
      const mod = (dIdx * 7 + sIdx * 3) % 29;
      if (mod === 4) {
        status = 'S';
        description = 'Demam / Surat keterangan dokter';
      } else if (mod === 11) {
        status = 'I';
        description = 'Izin keperluan keluarga';
      } else if (mod === 19) {
        status = 'A';
        description = 'Tanpa keterangan';
      } else if (mod === 25) {
        status = 'D';
        description = 'Dispensasi lomba / OSIS sekolah';
      }

      const id = buildAttendanceDocId(dInfo.date, 'Harian', st.id);
      records.push({
        id,
        studentId: st.id,
        studentName: st.fullName,
        nis: st.nis,
        classId: st.classId,
        className: st.className,
        date: dInfo.date,
        session: 'Harian',
        academicYear: dInfo.academicYear,
        semester: dInfo.semester,
        status,
        description,
        recordedBy: 'Petugas Absensi Sekolah',
        recordedByUid: 'sys-petugas-01',
        createdAt: `${dInfo.date}T08:15:00.000Z`,
        updatedAt: `${dInfo.date}T08:15:00.000Z`,
      });
    });
  });
  return records;
})();

export const INITIAL_ATTENDANCE_LOGS: AttendanceLog[] = [
  {
    id: 'attlog-init-01',
    attendanceId: INITIAL_CLASS_ATTENDANCE[0]?.id || 'sample',
    studentId: INITIAL_CLASS_STUDENTS[0]?.id || 'std-1',
    studentName: INITIAL_CLASS_STUDENTS[0]?.fullName || 'Adinda Putri Lestari',
    classId: 'x-akl',
    className: 'X AKL',
    date: '2026-11-12',
    session: 'Harian',
    action: 'CREATE',
    newStatus: INITIAL_CLASS_ATTENDANCE[0]?.status || 'H',
    newDescription: '',
    officerName: 'Petugas Absensi Sekolah',
    officerRole: 'Petugas Absensi',
    timestamp: '2026-11-12T07:45:00.000Z',
  },
];
