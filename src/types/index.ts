export type UserRole = string;

export type PermissionKey =
  | 'manageUsers'
  | 'manageRoles'
  | 'crudAllData'
  | 'manageInventory'
  | 'manageSchedules'
  | 'manageBorrowings'
  | 'manageMaintenance'
  | 'manageDamage'
  | 'manageReports'
  | 'manageSettings'
  | 'inputPracticumJournal'
  | 'manageActivitiesDocs'
  | 'manageGallery'
  | 'viewClassAttendance'
  | 'inputClassAttendance'
  | 'manageAttendanceStudents'
  | 'manageAttendanceReports'
  | 'manageAttendanceSettings'
  | 'viewComputerUsage'
  | 'recordComputerUsage'
  | 'manageComputerUsage'
  | 'manageComputerDamageFollowUp';

export interface AccessRole {
  id: string;
  name: string;
  code: string;
  description: string;
  allowedMenus: string[];
  permissions: Record<PermissionKey, boolean>;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  position?: string;
  nip?: string;
  subject?: string;
  phone?: string;
  avatarUrl?: string;
  assignedClassIds?: string[];
  hasCustomPermissions?: boolean;
  customAllowedMenus?: string[];
  customPermissions?: Partial<Record<PermissionKey, boolean>>;
  isActive: boolean;
  authProvisioned?: boolean;
  lastLoginAt?: string;
  createdBy?: string;
  updatedBy?: string;
  disabledAt?: string;
  disabledBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserInvite {
  email: string;
  displayName: string;
  role: UserRole;
  position?: string;
  nip?: string;
  subject?: string;
  phone?: string;
  assignedClassIds?: string[];
  hasCustomPermissions?: boolean;
  customAllowedMenus?: string[];
  customPermissions?: Partial<Record<PermissionKey, boolean>>;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// MODUL ABSENSI KELAS (9 KELAS TETAP)
// ==========================================
export type AttendanceStatusCode = 'H' | 'S' | 'I' | 'A' | 'D';
export type GradeLevel = 'X' | 'XI' | 'XII';
export type VocationalMajor = 'AKL' | 'DKV' | 'ATPH';

export interface SchoolClass {
  id: string;
  name: string;
  gradeLevel: GradeLevel;
  major: VocationalMajor;
  majorFullName: string;
  homeroomTeacherName: string;
  homeroomTeacherNip?: string;
  academicYear: string;
  order: number;
  updatedAt?: string;
}

export interface Student {
  id: string;
  studentId?: string;
  nis: string;
  nisn: string;
  fullName: string;
  name?: string;
  gender: 'L' | 'P';
  classId: string;
  className: string;
  grade?: GradeLevel;
  major: string;
  majorCode?: VocationalMajor;
  academicYear: string;
  homeroomTeacher?: string;
  address?: string;
  status: 'Aktif' | 'Tidak Aktif';
  parentPhone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassAttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  nis?: string;
  classId: string;
  className: string;
  date: string;
  session: string;
  academicYear: string;
  semester: '1' | '2';
  status: AttendanceStatusCode;
  description: string;
  recordedBy: string;
  recordedByUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicYearConfig {
  id: string;
  year: string;
  semester1Start: string;
  semester1End: string;
  semester2Start: string;
  semester2End: string;
  activeSemester: '1' | '2';
  isActive: boolean;
  updatedAt?: string;
}

export type CalendarEventType =
  | 'Libur Nasional'
  | 'Libur Semester'
  | 'Libur Khusus Sekolah'
  | 'Kegiatan Sekolah';

export interface SchoolCalendarEvent {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  type: CalendarEventType;
  isHoliday: boolean;
  description?: string;
  createdAt?: string;
}

export interface AttendanceSettings {
  id: string;
  activeAcademicYear: string;
  activeSemester: '1' | '2';
  activeDays: number[]; // 0=Minggu, 1=Senin, ..., 6=Sabtu
  schoolStartDate: string;
  lowAttendanceThreshold: number;
  principalName: string;
  principalNip: string;
  reportCity: string;
  schoolName: string;
  schoolAddress: string;
  reportHeaderGov: string;
  reportHeaderDept: string;
  logoUrl: string;
  updatedAt?: string;
}

export interface AttendanceLog {
  id: string;
  attendanceId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  date: string;
  session: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  previousStatus?: AttendanceStatusCode;
  newStatus?: AttendanceStatusCode;
  previousDescription?: string;
  newDescription?: string;
  officerName: string;
  officerRole: string;
  timestamp: string;
}

export interface StudentAttendance {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  teacherName: string;
  subject: string;
  classGrade: string;
  labName: string;
  totalStudents: number;
  presentCount: number;
  sickCount: number;
  permissionCount: number;
  absentCount: number;
  absentStudentNames?: string;
  notes?: string;
  createdByUid?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonJournal {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  teacherName: string;
  subject: string;
  classGrade: string;
  labName: string;
  topic: string;
  incidentCategory: 'Kondusif / Normal' | 'Kendala Teknis' | 'Insiden / Perlu Perhatian';
  incidentNotes: string;
  comfortRating: number;
  comfortFeedback: string;
  photoUrl?: string;
  photoCaption?: string;
  createdByUid?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Laboratory {
  id: string;
  name: string;
  code: string;
  capacity: number;
  location: string;
  areaSize: string;
  totalComputers: number;
  personInCharge: string;
  picNip?: string;
  photoUrl?: string;
  description?: string;
  status: 'Tersedia' | 'Sedang Digunakan' | 'Pemeliharaan';
  createdAt?: string;
  updatedAt?: string;
}

export type ComputerCondition = 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Dalam Perbaikan' | 'Tidak Digunakan';

export interface Computer {
  id: string;
  inventoryNumber: string;
  computerCode: string;
  deviceName: string;
  brand: string;
  model: string;
  serialNumber?: string;
  processor: string;
  ram: string;
  storage: string;
  os: string;
  monitor: string;
  keyboard: string;
  mouse: string;
  procurementYear: number;
  fundingSource: string;
  procurementPrice?: number;
  labId: string;
  labName: string;
  lastCheckDate: string;
  condition: ComputerCondition;
  operationalStatus?: ComputerOperationalStatus;
  activeUsageId?: string;
  activeUserName?: string;
  activeUserType?: UsageUserType | '';
  lastUsageId?: string;
  lastUserName?: string;
  lastUserType?: UsageUserType | '';
  lastUserClassOrOrg?: string;
  lastUsageDate?: string;
  lastUsageStartTime?: string;
  lastUsageEndTime?: string;
  lastUsageDuration?: string;
  lastConditionAfter?: string;
  photoUrl?: string;
  notes?: string;
  qrCodeData?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EquipmentCategory =
  | 'Printer'
  | 'Scanner'
  | 'Proyektor'
  | 'Switch'
  | 'Router'
  | 'Access Point'
  | 'UPS'
  | 'Server'
  | 'Kabel Jaringan'
  | 'Meja Komputer'
  | 'Kursi'
  | 'Lainnya';

export interface Equipment {
  id: string;
  inventoryNumber: string;
  name: string;
  category: EquipmentCategory;
  brand: string;
  model: string;
  serialNumber?: string;
  quantity: number;
  unit: string;
  procurementYear: number;
  fundingSource: string;
  procurementPrice?: number;
  labId: string;
  labName: string;
  condition: ComputerCondition;
  photoUrl?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ScheduleStatus = 'Menunggu' | 'Disetujui' | 'Sedang Berlangsung' | 'Selesai' | 'Dibatalkan';

export interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  teacherName: string;
  subject: string;
  classGrade: string;
  vocationalMajor: string;
  labId: string;
  labName: string;
  studentCount: number;
  purpose: string;
  status: ScheduleStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type BorrowingStatus = 'Dipinjam' | 'Sudah Dikembalikan' | 'Terlambat' | 'Rusak';

export interface Borrowing {
  id: string;
  transactionNumber: string;
  borrowDate: string;
  borrowerName: string;
  borrowerRole: string;
  itemName: string;
  itemId?: string;
  quantity: number;
  initialCondition: string;
  returnDate: string;
  actualReturnDate?: string;
  returnedCondition?: string;
  officerName: string;
  status: BorrowingStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type MaintenanceStatus = 'Dijadwalkan' | 'Dalam Pengerjaan' | 'Menunggu Suku Cadang' | 'Selesai' | 'Tidak Dapat Diperbaiki';

export interface Maintenance {
  id: string;
  workOrderNumber: string;
  checkDate: string;
  deviceName: string;
  deviceType: 'Komputer' | 'Perangkat Pendukung' | 'Jaringan' | 'Lainnya';
  inventoryNumber: string;
  damageType: string;
  damageAnalysis: string;
  repairAction: string;
  technicianName: string;
  cost: number;
  spareParts?: string;
  completedDate?: string;
  status: MaintenanceStatus;
  photoBeforeUrl?: string;
  photoAfterUrl?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type DamageSeverity = 'Ringan' | 'Sedang' | 'Berat' | 'Kritis';
export type DamageStatus = 'Menunggu Verifikasi' | 'Diterima' | 'Dalam Penanganan' | 'Selesai' | 'Ditolak';

export interface DamageReport {
  id: string;
  reportDate: string;
  reporterName: string;
  reporterRole: string;
  deviceName: string;
  inventoryNumber?: string;
  labName: string;
  damageDescription: string;
  severity: DamageSeverity;
  photoUrl?: string;
  status: DamageStatus;
  handlerOfficer?: string;
  followUpNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LabUser {
  id: string;
  name: string;
  identifier: string;
  category: 'Guru' | 'Teknisi' | 'Laboran' | 'Siswa' | 'Kepala Sekolah' | 'Lainnya';
  classOrDept?: string;
  email?: string;
  phone?: string;
  gender?: 'L' | 'P';
  createdAt?: string;
  updatedAt?: string;
}

export interface Activity {
  id: string;
  title: string;
  date: string;
  personInCharge: string;
  location: string;
  description: string;
  photoUrl?: string;
  documentUrl?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type LabDocType =
  | 'Tata Tertib'
  | 'SOP Penggunaan Komputer'
  | 'SOP Peminjaman'
  | 'SOP Pemeliharaan'
  | 'Jadwal Pemeliharaan'
  | 'Berita Acara'
  | 'Form Pemeriksaan'
  | 'Daftar Kebutuhan'
  | 'Lainnya';

export interface LabDocument {
  id: string;
  title: string;
  docType: LabDocType;
  documentNumber?: string;
  publishDate: string;
  content: string;
  fileUrl?: string;
  author: string;
  status: 'Aktif' | 'Draft' | 'Arsip';
  createdAt?: string;
  updatedAt?: string;
}

export interface Guest {
  id: string;
  date: string;
  time: string;
  visitorName: string;
  roleOrClass: string;
  institution?: string;
  purpose: string;
  labRoom: string;
  computerUsed?: string;
  notes?: string;
  createdAt?: string;
}

export interface AppSetting {
  id?: string;
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolWebsite: string;
  logoUrl: string;
  principalName: string;
  principalNip: string;
  headOfLabName: string;
  headOfLabNip: string;
  leadTechnicianName: string;
  academicYear: string;
  reportHeaderGov: string;
  reportHeaderDept: string;
  appName: string;
  productionLoginUrl?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
}

// ==========================================
// MODUL GALERI LABORATORIUM
// ==========================================
export interface GalleryCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GalleryImage {
  id: string;
  imageId: string;
  title: string;
  category: string;
  description: string;
  notes?: string;
  imageUrl: string;
  storagePath: string;
  uploadDate: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy: string;
  status: 'Aktif' | 'Arsip';
}

// ==========================================
// MODUL RIWAYAT PENGGUNAAN KOMPUTER (TRACKING)
// ==========================================
export type ComputerOperationalStatus =
  | 'TERSEDIA'
  | 'SEDANG DIGUNAKAN'
  | 'PERLU PEMERIKSAAN'
  | 'RUSAK'
  | 'DALAM PERBAIKAN'
  | 'TIDAK DIGUNAKAN';

export type UsageUserType = 'Siswa' | 'Guru/Tendik' | 'Teknisi/Laboran' | 'Tamu';

export type ConditionComponentRating = 'Baik' | 'Bermasalah' | 'Rusak';

export interface ConditionChecklist {
  cpu: ConditionComponentRating;
  monitor: ConditionComponentRating;
  keyboard: ConditionComponentRating;
  mouse: ConditionComponentRating;
  cablesAndConnectors: ConditionComponentRating;
  internetNetwork: ConditionComponentRating;
  operatingSystem: ConditionComponentRating;
  applications: ConditionComponentRating;
  otherDevices: ConditionComponentRating;
}

export interface ComputerUsageRecord {
  id: string;
  usageId: string;
  computerId: string;
  computerCode: string;
  computerName: string;
  inventoryCode: string;
  userType: UsageUserType;
  userId: string;
  userName: string;
  studentNis?: string;
  studentNisn?: string;
  studentClass?: string;
  attendanceId?: string;
  attendanceStatus?: AttendanceStatusCode | 'Belum Tercatat';
  externalUserId?: string;
  externalInstitution?: string;
  externalContact?: string;
  companionName?: string;
  subjectOrActivity?: string;
  isGroupUsage?: boolean;
  memberCount?: number;
  roomId: string;
  roomName: string;
  usageDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  duration: string;
  purpose: string;
  conditionBefore: ConditionComponentRating;
  conditionBeforeNotes?: string;
  conditionAfter?: ConditionComponentRating;
  conditionAfterNotes?: string;
  hasProblemAfter?: boolean;
  usageStatus: 'Sedang Digunakan' | 'Selesai' | 'Dibatalkan';
  recordedBy: string;
  recordedByUid?: string;
  notes?: string;
  editReason?: string;
  damageReportId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComputerUsageMember {
  id: string;
  usageId: string;
  computerId: string;
  studentId: string;
  studentName: string;
  studentNis: string;
  studentNisn?: string;
  studentClass: string;
  attendanceId?: string;
  attendanceStatus?: AttendanceStatusCode | 'Belum Tercatat';
  roleInGroup?: 'Ketua Kelompok' | 'Anggota';
  createdAt: string;
}

export interface ComputerConditionCheck {
  id: string;
  usageId: string;
  computerId: string;
  inventoryCode: string;
  computerCode: string;
  phase: 'Sebelum Penggunaan' | 'Sesudah Penggunaan' | 'Pemeriksaan Berkala';
  checklist: ConditionChecklist;
  overallCondition: ConditionComponentRating;
  notes?: string;
  checkedBy: string;
  checkedAt: string;
}

export type ComputerDamageFollowUpStatus =
  | 'Menunggu Pemeriksaan'
  | 'Perlu Pemeriksaan'
  | 'Dalam Perbaikan'
  | 'Selesai Diperbaiki'
  | 'Rusak Permanen';

export interface ComputerDamageFollowUpEntry {
  timestamp: string;
  status: ComputerDamageFollowUpStatus;
  notes: string;
  officer: string;
}

export interface ComputerDamageReport {
  id: string;
  reportNumber: string;
  usageId?: string;
  computerId: string;
  computerCode: string;
  computerName: string;
  inventoryCode: string;
  roomId: string;
  roomName: string;
  damageType: string;
  damageDescription: string;
  affectedComponents: string[];
  severity: DamageSeverity;
  discoveredAt: string;
  discoveredDate: string;
  lastUsageId?: string;
  lastUserName?: string;
  lastUserType?: UsageUserType;
  lastUserClassOrOrg?: string;
  lastUsageDate?: string;
  lastUsageTime?: string;
  photoUrl?: string;
  inspectorName: string;
  initialAction: string;
  additionalNotes?: string;
  followUpStatus: ComputerDamageFollowUpStatus;
  followUpHistory: ComputerDamageFollowUpEntry[];
  notifiedRoles?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ComputerStatusHistory {
  id: string;
  computerId: string;
  computerCode: string;
  previousStatus: ComputerOperationalStatus;
  newStatus: ComputerOperationalStatus;
  usageId?: string;
  damageReportId?: string;
  reason: string;
  changedBy: string;
  timestamp: string;
}

export interface ExternalUser {
  id: string;
  fullName: string;
  institution: string;
  identityOrContact?: string;
  totalVisits: number;
  lastVisitDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComputerUsageSettings {
  id: string;
  timezone: 'Asia/Jakarta';
  allowManualTimeOverrideForAdmin: boolean;
  requireBeforeCheck: boolean;
  requireAfterCheck: boolean;
  allowGroupUsage: boolean;
  maxGroupSize: number;
  defaultRoomId: string;
  lowUsageThresholdCount: number;
  notifyAdminOnDamage: boolean;
  updatedAt?: string;
}

