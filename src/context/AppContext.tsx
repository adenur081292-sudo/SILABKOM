import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  db,
  auth,
  storage,
  googleProvider,
  MASTER_ADMIN_EMAIL,
  provisionAuthAccount,
  handleFirestoreError,
  OperationType,
  testConnection,
} from '../firebase';
import { normalizeEmailKey, translateFirebaseAuthError } from '../utils/authUtils';
import { compressImageFileToDataUrl } from '../utils/imageUtils';
import {
  UserProfile,
  UserRole,
  AccessRole,
  PermissionKey,
  StudentAttendance,
  LessonJournal,
  Laboratory,
  Computer,
  Equipment,
  Schedule,
  Borrowing,
  Maintenance,
  DamageReport,
  LabUser,
  Activity,
  LabDocument,
  Guest,
  AppSetting,
  ActivityLog,
  SchoolClass,
  Student,
  ClassAttendanceRecord,
  AcademicYearConfig,
  SchoolCalendarEvent,
  AttendanceSettings,
  AttendanceLog,
  AttendanceStatusCode,
  GalleryCategory,
  GalleryImage,
  ComputerOperationalStatus,
  UsageUserType,
  ConditionChecklist,
  ConditionComponentRating,
  ComputerUsageRecord,
  ComputerUsageMember,
  ComputerConditionCheck,
  ComputerDamageReport,
  ComputerDamageFollowUpStatus,
  ComputerStatusHistory,
  ExternalUser,
  ComputerUsageSettings,
  DamageSeverity,
} from '../types';
import {
  DEFAULT_SETTINGS,
  INITIAL_LABS,
  INITIAL_COMPUTERS,
  INITIAL_EQUIPMENT,
  INITIAL_SCHEDULES,
  INITIAL_DOCUMENTS,
  INITIAL_USERS_LAB,
  INITIAL_BORROWINGS,
  INITIAL_MAINTENANCE,
  INITIAL_DAMAGE_REPORTS,
  INITIAL_ACCESS_ROLES,
  INITIAL_SYSTEM_USERS,
  INITIAL_STUDENT_ATTENDANCES,
  INITIAL_LESSON_JOURNALS,
  INITIAL_GALLERY_CATEGORIES,
} from '../utils/initialData';
import {
  FIXED_SCHOOL_CLASSES,
  DEFAULT_ATTENDANCE_SETTINGS,
  INITIAL_ACADEMIC_YEARS,
  INITIAL_SCHOOL_CALENDAR,
  INITIAL_CLASS_STUDENTS,
  INITIAL_CLASS_ATTENDANCE,
  INITIAL_ATTENDANCE_LOGS,
} from '../utils/attendanceInitialData';
import { buildAttendanceDocId } from '../utils/attendanceUtils';
import {
  DEFAULT_COMPUTER_USAGE_SETTINGS,
  getJakartaNow,
  generateUsageTransactionCode,
  generateComputerDamageCode,
  calculateDurationMinutes,
  formatDurationIndonesian,
  deriveOverallChecklistCondition,
  getAffectedComponentLabels,
  mapOperationalStatusToCondition,
  resolveComputerOperationalStatus,
  getLastCompletedUsageForComputer,
} from '../utils/computerUsageUtils';
import {
  validateComputerUniqueIdentity,
  findScheduleOverlap,
  findUsageTimeOverlapOnSameDate,
  isComputerUsableForRole,
  validateBackupPayload,
} from '../utils/conflictValidation';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface AppContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  currentRole: UserRole;
  activeRoleObject: AccessRole;
  accessRoles: AccessRole[];
  systemUsers: UserProfile[];
  isOnlineDb: boolean;
  isLoading: boolean;
  authReady: boolean;
  authNotice: string | null;
  clearAuthNotice: () => void;
  toasts: ToastMessage[];
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  removeToast: (id: string) => void;

  // Permission Helpers
  hasPermission: (perm: PermissionKey) => boolean;
  canAccessMenu: (menuId: string) => boolean;
  isSuperAdmin: boolean;
  logUnauthorizedAccess: (attemptedMenu: string) => Promise<void>;

  // Auth & Profile
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithEmailPassword: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateOwnProfile: (updates: {
    displayName: string;
    phone?: string;
    avatarUrl?: string;
    nip?: string;
    subject?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoggingOut: boolean;

  // Data Collections
  laboratories: Laboratory[];
  computers: Computer[];
  equipment: Equipment[];
  schedules: Schedule[];
  borrowings: Borrowing[];
  maintenanceList: Maintenance[];
  damageReports: DamageReport[];
  usersLab: LabUser[];
  activities: Activity[];
  documents: LabDocument[];
  guests: Guest[];
  studentAttendances: StudentAttendance[];
  lessonJournals: LessonJournal[];
  settings: AppSetting;
  activityLogs: ActivityLog[];

  // CRUD Methods
  saveAccessRole: (role: AccessRole) => Promise<void>;
  deleteAccessRole: (id: string) => Promise<void>;

  createManagedUserAccount: (input: {
    displayName: string;
    email: string;
    initialPassword: string;
    position: string;
    role: UserRole;
    nip?: string;
    subject?: string;
    phone?: string;
    assignedClassIds?: string[];
    isActive: boolean;
    hasCustomPermissions?: boolean;
    customAllowedMenus?: string[];
    customPermissions?: Partial<Record<PermissionKey, boolean>>;
  }) => Promise<{ success: boolean; uid?: string; alreadyInAuth?: boolean; error?: string; message?: string }>;
  saveSystemUser: (user: UserProfile) => Promise<void>;
  toggleUserActiveStatus: (uid: string, nextActive: boolean) => Promise<void>;
  deleteSystemUser: (uid: string) => Promise<void>;

  saveStudentAttendance: (item: StudentAttendance) => Promise<void>;
  deleteStudentAttendance: (id: string) => Promise<void>;

  saveLessonJournal: (item: LessonJournal) => Promise<void>;
  deleteLessonJournal: (id: string) => Promise<void>;

  saveLaboratory: (lab: Laboratory) => Promise<void>;
  deleteLaboratory: (id: string) => Promise<void>;

  saveComputer: (pc: Computer) => Promise<{ success: boolean; error?: string }>;
  deleteComputer: (id: string) => Promise<void>;
  batchImportComputers: (pcs: Partial<Computer>[]) => Promise<number>;

  saveEquipment: (eq: Equipment) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  batchImportEquipment: (eqs: Partial<Equipment>[]) => Promise<number>;

  saveSchedule: (schedule: Schedule) => Promise<{ success: boolean; error?: string }>;
  deleteSchedule: (id: string) => Promise<void>;

  saveBorrowing: (item: Borrowing) => Promise<void>;
  deleteBorrowing: (id: string) => Promise<void>;

  saveMaintenance: (item: Maintenance) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;

  saveDamageReport: (item: DamageReport) => Promise<void>;
  deleteDamageReport: (id: string) => Promise<void>;

  saveLabUser: (item: LabUser) => Promise<void>;
  deleteLabUser: (id: string) => Promise<void>;

  saveActivity: (item: Activity) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;

  saveDocument: (item: LabDocument) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;

  saveGuest: (item: Guest) => Promise<void>;
  deleteGuest: (id: string) => Promise<void>;

  saveSettings: (settings: AppSetting) => Promise<void>;
  seedInitialDataToFirestore: () => Promise<void>;
  syncDkvComputersFromOfficialSheet: () => Promise<void>;
  restoreFullBackupData: (
    parsedBackup: any
  ) => Promise<{ success: boolean; restoredCount: number; error?: string }>;
  logActivity: (action: string, module: string, details: string) => Promise<void>;

  // Absensi Kelas Module Collections & Helpers
  schoolClasses: SchoolClass[];
  students: Student[];
  classAttendances: ClassAttendanceRecord[];
  academicYears: AcademicYearConfig[];
  schoolCalendar: SchoolCalendarEvent[];
  attendanceSettings: AttendanceSettings;
  attendanceLogs: AttendanceLog[];
  accessibleClasses: SchoolClass[];

  saveSchoolClass: (cls: SchoolClass) => Promise<void>;
  saveStudent: (student: Student) => Promise<{ success: boolean; error?: string }>;
  deleteStudent: (id: string) => Promise<void>;
  batchImportStudents: (items: Partial<Student>[]) => Promise<number>;
  moveStudentsClass: (studentIds: string[], targetClassId: string) => Promise<void>;
  saveClassAttendanceBatch: (
    entries: {
      student: Student;
      status: AttendanceStatusCode;
      description: string;
    }[],
    meta: {
      date: string;
      session: string;
      academicYear: string;
      semester: '1' | '2';
      classObj: SchoolClass;
    }
  ) => Promise<{ saved: number; updated: number; created: number }>;
  deleteClassAttendance: (record: ClassAttendanceRecord) => Promise<void>;
  saveAcademicYear: (item: AcademicYearConfig) => Promise<void>;
  deleteAcademicYear: (id: string) => Promise<void>;
  saveCalendarEvent: (item: SchoolCalendarEvent) => Promise<void>;
  deleteCalendarEvent: (id: string) => Promise<void>;
  saveAttendanceSettings: (item: AttendanceSettings) => Promise<void>;

  // Galeri Laboratorium Module Collections & Helpers
  galleryImages: GalleryImage[];
  galleryCategories: GalleryCategory[];
  saveGalleryImage: (
    data: Partial<GalleryImage>,
    file?: File | null,
    onProgress?: (percent: number) => void
  ) => Promise<{ success: boolean; error?: string }>;
  deleteGalleryImage: (image: GalleryImage) => Promise<void>;
  saveGalleryCategory: (category: Partial<GalleryCategory>) => Promise<{ success: boolean; error?: string }>;
  deleteGalleryCategory: (id: string) => Promise<void>;

  // Riwayat Penggunaan Komputer (Computer Usage Tracking) Collections & Methods
  computerUsages: ComputerUsageRecord[];
  computerUsageMembers: ComputerUsageMember[];
  computerConditionChecks: ComputerConditionCheck[];
  computerDamageReports: ComputerDamageReport[];
  computerStatusHistories: ComputerStatusHistory[];
  externalUsers: ExternalUser[];
  computerUsageSettings: ComputerUsageSettings;

  startComputerUsage: (params: {
    computerId: string;
    userType: UsageUserType;
    selectedStudents?: {
      student: Student;
      attendanceId?: string;
      attendanceStatus?: AttendanceStatusCode | 'Belum Tercatat';
    }[];
    userId?: string;
    userName?: string;
    externalUserId?: string;
    externalInstitution?: string;
    externalContact?: string;
    companionName?: string;
    subjectOrActivity?: string;
    roomId?: string;
    roomName?: string;
    usageDate?: string;
    startTime?: string;
    purpose: string;
    checklistBefore: ConditionChecklist;
    conditionBeforeNotes?: string;
    notes?: string;
    recordedBy?: string;
  }) => Promise<{ success: boolean; usage?: ComputerUsageRecord; error?: string }>;

  finishComputerUsage: (params: {
    usageId: string;
    endTime?: string;
    checklistAfter: ConditionChecklist;
    conditionAfterNotes?: string;
    hasProblemAfter: boolean;
    notes?: string;
    damagePayload?: {
      damageType: string;
      damageDescription: string;
      severity: DamageSeverity;
      initialAction: string;
      photoFile?: File | null;
    };
  }) => Promise<{ success: boolean; usage?: ComputerUsageRecord; damageReport?: ComputerDamageReport; error?: string }>;

  cancelOrForceResolveUsage: (params: {
    usageId: string;
    resolution: 'Dibatalkan' | 'Selesai';
    reason: string;
    endTime?: string;
  }) => Promise<{ success: boolean; error?: string }>;

  updateComputerUsageWithAudit: (
    usage: ComputerUsageRecord,
    editReason: string
  ) => Promise<{ success: boolean; error?: string }>;

  deleteComputerUsage: (usageId: string) => Promise<{ success: boolean; error?: string }>;

  reportComputerDamage: (
    params: {
      computerId: string;
      usageId?: string;
      damageType: string;
      damageDescription: string;
      affectedComponents: string[];
      severity: DamageSeverity;
      initialAction: string;
      additionalNotes?: string;
      targetStatus: 'PERLU PEMERIKSAAN' | 'RUSAK';
    },
    photoFile?: File | null
  ) => Promise<{ success: boolean; report?: ComputerDamageReport; error?: string }>;

  updateComputerDamageFollowUp: (params: {
    reportId: string;
    followUpStatus: ComputerDamageFollowUpStatus;
    notes: string;
  }) => Promise<{ success: boolean; error?: string }>;

  updateComputerOperationalStatusManual: (
    computerId: string,
    newStatus: ComputerOperationalStatus,
    reason: string
  ) => Promise<{ success: boolean; error?: string }>;

  saveExternalUser: (user: Partial<ExternalUser>) => Promise<{ success: boolean; user?: ExternalUser; error?: string }>;
  deleteExternalUser: (id: string) => Promise<void>;
  saveComputerUsageSettings: (settings: ComputerUsageSettings) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('');
  const [isOnlineDb, setIsOnlineDb] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const authEventSeqRef = useRef<number>(0);
  const isLoggingOutRef = useRef<boolean>(false);

  // Collections state
  const [accessRoles, setAccessRoles] = useState<AccessRole[]>(INITIAL_ACCESS_ROLES);
  const [systemUsers, setSystemUsers] = useState<UserProfile[]>(INITIAL_SYSTEM_USERS);
  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>(INITIAL_STUDENT_ATTENDANCES);
  const [lessonJournals, setLessonJournals] = useState<LessonJournal[]>(INITIAL_LESSON_JOURNALS);

  const [laboratories, setLaboratories] = useState<Laboratory[]>(INITIAL_LABS);
  const [computers, setComputers] = useState<Computer[]>(INITIAL_COMPUTERS);
  const [equipment, setEquipment] = useState<Equipment[]>(INITIAL_EQUIPMENT);
  const [schedules, setSchedules] = useState<Schedule[]>(INITIAL_SCHEDULES);
  const [borrowings, setBorrowings] = useState<Borrowing[]>(INITIAL_BORROWINGS);
  const [maintenanceList, setMaintenanceList] = useState<Maintenance[]>(INITIAL_MAINTENANCE);
  const [damageReports, setDamageReports] = useState<DamageReport[]>(INITIAL_DAMAGE_REPORTS);
  const [usersLab, setUsersLab] = useState<LabUser[]>(INITIAL_USERS_LAB);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [documents, setDocuments] = useState<LabDocument[]>(INITIAL_DOCUMENTS);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [settings, setSettings] = useState<AppSetting>(DEFAULT_SETTINGS);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Absensi Kelas Collections State
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>(FIXED_SCHOOL_CLASSES);
  const [students, setStudents] = useState<Student[]>(INITIAL_CLASS_STUDENTS);
  const [classAttendances, setClassAttendances] = useState<ClassAttendanceRecord[]>(INITIAL_CLASS_ATTENDANCE);
  const [academicYears, setAcademicYears] = useState<AcademicYearConfig[]>(INITIAL_ACADEMIC_YEARS);
  const [schoolCalendar, setSchoolCalendar] = useState<SchoolCalendarEvent[]>(INITIAL_SCHOOL_CALENDAR);
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE_SETTINGS);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(INITIAL_ATTENDANCE_LOGS);

  // Galeri Laboratorium Collections State
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryCategories, setGalleryCategories] = useState<GalleryCategory[]>(INITIAL_GALLERY_CATEGORIES);

  // Riwayat Penggunaan Komputer Collections State
  const [computerUsages, setComputerUsages] = useState<ComputerUsageRecord[]>([]);
  const [computerUsageMembers, setComputerUsageMembers] = useState<ComputerUsageMember[]>([]);
  const [computerConditionChecks, setComputerConditionChecks] = useState<ComputerConditionCheck[]>([]);
  const [computerDamageReports, setComputerDamageReports] = useState<ComputerDamageReport[]>([]);
  const [computerStatusHistories, setComputerStatusHistories] = useState<ComputerStatusHistory[]>([]);
  const [externalUsers, setExternalUsers] = useState<ExternalUser[]>([]);
  const [computerUsageSettings, setComputerUsageSettings] = useState<ComputerUsageSettings>(
    DEFAULT_COMPUTER_USAGE_SETTINGS
  );

  const addToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAuthNotice = () => setAuthNotice(null);

  // Resolve active AccessRole object
  const activeRoleObject = useMemo<AccessRole>(() => {
    return (
      accessRoles.find((r) => r.id === currentRole) ||
      INITIAL_ACCESS_ROLES.find((r) => r.id === currentRole) ||
      INITIAL_ACCESS_ROLES[INITIAL_ACCESS_ROLES.length - 1]
    );
  }, [accessRoles, currentRole]);

  const isSuperAdmin = useMemo(() => {
    if (!currentUser || !userProfile || !userProfile.isActive) return false;
    return (
      userProfile.role === 'admin' ||
      (currentUser.email?.toLowerCase() === MASTER_ADMIN_EMAIL && Boolean(currentUser.emailVerified))
    );
  }, [currentUser, userProfile]);

  const hasPermission = (perm: PermissionKey): boolean => {
    if (!currentUser || !userProfile || !userProfile.isActive) return false;
    if (isSuperAdmin) return true;
    if (userProfile.hasCustomPermissions) {
      return Boolean(userProfile.customPermissions?.[perm]);
    }
    return Boolean(activeRoleObject?.permissions?.[perm]);
  };

  const canAccessMenu = (menuId: string): boolean => {
    if (!currentUser || !userProfile || !userProfile.isActive) return false;
    if (menuId === 'dashboard' || menuId === 'profile') return true;
    if (isSuperAdmin) return true;
    if (userProfile.hasCustomPermissions) {
      return Boolean(userProfile.customAllowedMenus?.includes(menuId));
    }
    return Boolean(activeRoleObject?.allowedMenus?.includes(menuId));
  };

  // Classes accessible by active user (for Wali Kelas / Petugas Absensi class-scoping)
  const accessibleClasses = useMemo<SchoolClass[]>(() => {
    const sorted = [...schoolClasses].sort((a, b) => (a.order || 0) - (b.order || 0));
    if (isSuperAdmin || currentRole === 'kepala_sekolah') return sorted;
    const assigned = userProfile?.assignedClassIds || [];
    if ((currentRole === 'wali_kelas' || currentRole === 'petugas_absensi') && assigned.length > 0) {
      return sorted.filter((c) => assigned.includes(c.id));
    }
    return sorted;
  }, [schoolClasses, isSuperAdmin, currentRole, userProfile]);

  const sanitizeUserProfile = (raw: any, fallbackUid?: string): UserProfile => {
    const copy = { ...raw };
    delete copy.password;
    return {
      ...copy,
      uid: copy.uid || fallbackUid || '',
      email: copy.email || '',
      displayName: copy.displayName || 'Pengguna SILABKOM',
      role: copy.role || 'guru_mapel',
      isActive: copy.isActive !== false,
    } as UserProfile;
  };

  const getCachedProfileKey = (uid: string) => `silabkom_cached_profile_${uid}`;

  const readCachedProfile = (uid: string): UserProfile | null => {
    try {
      const raw = localStorage.getItem(getCachedProfileKey(uid));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || parsed.uid !== uid) return null;
      return sanitizeUserProfile(parsed, uid);
    } catch {
      return null;
    }
  };

  const writeCachedProfile = (uid: string, profile: UserProfile) => {
    try {
      localStorage.setItem(getCachedProfileKey(uid), JSON.stringify(profile));
    } catch {
      // Ignore storage quota restrictions
    }
  };

  const clearCachedProfile = (uid?: string | null) => {
    try {
      if (uid) {
        localStorage.removeItem(getCachedProfileKey(uid));
      }
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('silabkom_cached_profile_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore storage removal errors
    }
    try {
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('silabkom_cached_profile_')) {
          sessionKeysToRemove.push(k);
        }
      }
      sessionKeysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      // Ignore sessionStorage removal errors
    }
  };

  const resetTransientAuthSessionState = () => {
    setCurrentUser(null);
    setUserProfile(null);
    setCurrentRole('');
    setSystemUsers([]);
    setActivityLogs([]);
    setAttendanceLogs([]);
    setAccessRoles(INITIAL_ACCESS_ROLES);
    setSettings(DEFAULT_SETTINGS);
  };

  // Auth observer + Real-time account status enforcement (with offline IndexedDB/cache continuity)
  useEffect(() => {
    testConnection().then((connected) => {
      setIsOnlineDb(connected && (typeof navigator === 'undefined' || navigator.onLine));
    });

    const handleOnline = () => {
      testConnection().then((connected) => setIsOnlineDb(connected));
    };
    const handleOffline = () => {
      setIsOnlineDb(false);
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !auth.currentUser) {
        authEventSeqRef.current += 1;
        clearCachedProfile();
        resetTransientAuthSessionState();
        setAuthReady(true);
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pageshow', handlePageShow);

    let unsubUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      const seq = ++authEventSeqRef.current;

      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (!user || isLoggingOutRef.current) {
        resetTransientAuthSessionState();
        setIsLoading(false);
        setAuthReady(true);
        return;
      }

      const isMaster =
        user.email?.toLowerCase() === MASTER_ADMIN_EMAIL && Boolean(user.emailVerified);

      try {
        const userRef = doc(db, 'users', user.uid);
        let userSnap = await getDoc(userRef);
        if (seq !== authEventSeqRef.current || isLoggingOutRef.current) return;

        if (!userSnap.exists()) {
          if (isMaster) {
            const masterProfile: UserProfile = {
              uid: user.uid,
              email: user.email || MASTER_ADMIN_EMAIL,
              displayName: user.displayName || 'Ade Nur, S.Kom., M.T.',
              role: 'admin',
              position: 'Super Administrator SILABKOM',
              nip: '19870520 201101 1 008',
              subject: 'Administrator Sistem',
              phone: '081288991234',
              assignedClassIds: [],
              avatarUrl: user.photoURL || undefined,
              isActive: true,
              authProvisioned: true,
              lastLoginAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userRef, masterProfile, { merge: true });
            userSnap = await getDoc(userRef);
            if (seq !== authEventSeqRef.current || isLoggingOutRef.current) return;
          } else if (user.email) {
            // Check if Administrator created an invite/pre-link for this email
            const emailKey = normalizeEmailKey(user.email);
            const inviteRef = doc(db, 'user_invites', emailKey);
            const inviteSnap = await getDoc(inviteRef);
            if (seq !== authEventSeqRef.current || isLoggingOutRef.current) return;
            if (inviteSnap.exists()) {
              const inv = inviteSnap.data() as any;
              if (inv.isActive === false) {
                clearCachedProfile(user.uid);
                await fbSignOut(auth);
                setAuthNotice('Akun Anda sedang dinonaktifkan oleh Administrator SILABKOM.');
                resetTransientAuthSessionState();
                setIsLoading(false);
                setAuthReady(true);
                return;
              }
              const provisionedProfile: UserProfile = {
                uid: user.uid,
                email: user.email,
                displayName: inv.displayName || user.displayName || user.email.split('@')[0],
                role: inv.role || 'guru_mapel',
                position: inv.position || '',
                nip: inv.nip || '',
                subject: inv.subject || '',
                phone: inv.phone || '',
                assignedClassIds: inv.assignedClassIds || [],
                hasCustomPermissions: Boolean(inv.hasCustomPermissions),
                customAllowedMenus: inv.customAllowedMenus || [],
                customPermissions: inv.customPermissions || {},
                avatarUrl: user.photoURL || undefined,
                isActive: true,
                authProvisioned: true,
                lastLoginAt: new Date().toISOString(),
                createdBy: inv.createdBy || 'Administrator',
                createdAt: inv.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              await setDoc(userRef, provisionedProfile);
              await deleteDoc(inviteRef).catch(() => {});
              userSnap = await getDoc(userRef);
              if (seq !== authEventSeqRef.current || isLoggingOutRef.current) return;
            }
          }
        }

        if (!userSnap.exists()) {
          clearCachedProfile(user.uid);
          await fbSignOut(auth);
          setAuthNotice(
            'Akun belum terdaftar atau aksesnya telah dicabut. Hubungi Administrator SILABKOM SMKN 15 Pandeglang.'
          );
          resetTransientAuthSessionState();
          setIsLoading(false);
          setAuthReady(true);
          return;
        }

        const profileData = sanitizeUserProfile(userSnap.data(), user.uid);
        if (!profileData.isActive && !isMaster) {
          clearCachedProfile(user.uid);
          await fbSignOut(auth);
          setAuthNotice('Akun Anda dinonaktifkan oleh Administrator. Anda tidak dapat mengakses sistem.');
          resetTransientAuthSessionState();
          setIsLoading(false);
          setAuthReady(true);
          return;
        }

        if (seq !== authEventSeqRef.current || isLoggingOutRef.current) return;
        writeCachedProfile(user.uid, profileData);
        setCurrentUser(user);
        setUserProfile(profileData);
        setCurrentRole(profileData.role);
        setAuthNotice(null);
        setIsLoading(false);
        setAuthReady(true);

        // Live listener on current user's Firestore doc so deactivation or role edits apply immediately
        unsubUserDoc = onSnapshot(
          userRef,
          async (liveSnap) => {
            if (seq !== authEventSeqRef.current || isLoggingOutRef.current) return;
            if (!liveSnap.exists()) {
              if (!isMaster) {
                clearCachedProfile(user.uid);
                setAuthNotice('Akses akun Anda telah dicabut oleh Administrator.');
                await fbSignOut(auth);
              }
              return;
            }
            const liveProfile = sanitizeUserProfile(liveSnap.data(), user.uid);
            if (!liveProfile.isActive && !isMaster) {
              clearCachedProfile(user.uid);
              setAuthNotice('Akun Anda dinonaktifkan oleh Administrator. Sesi dihentikan.');
              await fbSignOut(auth);
              return;
            }
            writeCachedProfile(user.uid, liveProfile);
            setUserProfile(liveProfile);
            setCurrentRole(liveProfile.role);
          },
          (err) => console.warn('Live profile watch note:', err.message)
        );
      } catch (err: any) {
        if (seq !== authEventSeqRef.current || isLoggingOutRef.current) return;
        const errMsg = String(err?.message || '').toLowerCase();
        const isOfflineErr =
          (typeof navigator !== 'undefined' && !navigator.onLine) ||
          err?.code === 'unavailable' ||
          errMsg.includes('offline') ||
          errMsg.includes('network');

        if (isOfflineErr) {
          const cached = readCachedProfile(user.uid);
          if (cached && (cached.isActive || isMaster)) {
            setCurrentUser(user);
            setUserProfile(cached);
            setCurrentRole(cached.role);
            setIsOnlineDb(false);
            setAuthNotice(null);
            setIsLoading(false);
            setAuthReady(true);
            return;
          }
        }

        console.error('Auth verification error:', err);
        setAuthNotice('Gagal memverifikasi profil akun pada database. Silakan masuk kembali.');
        await fbSignOut(auth).catch(() => {});
        resetTransientAuthSessionState();
        setIsLoading(false);
        setAuthReady(true);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pageshow', handlePageShow);
      if (unsubUserDoc) unsubUserDoc();
      unsubscribeAuth();
    };
  }, []);

  // Sync collections with Firestore ONLY when authenticated & verified active
  useEffect(() => {
    if (!currentUser || !userProfile || !userProfile.isActive) {
      return;
    }

    const canListUsers = isSuperAdmin || Boolean(
      userProfile.hasCustomPermissions
        ? userProfile.customPermissions?.manageUsers
        : accessRoles.find((r) => r.id === currentRole)?.permissions?.manageUsers ||
          accessRoles.find((r) => r.id === currentRole)?.permissions?.crudAllData
    );

    // 0a. Access Roles (Database is the authoritative source of permissions)
    const unsubRoles = onSnapshot(
      collection(db, 'access_roles'),
      async (snapshot) => {
        if (!snapshot.empty) {
          const items: AccessRole[] = [];
          snapshot.forEach((d) => {
            const rawRole = { id: d.id, ...d.data() } as AccessRole;
            const coreFallback = INITIAL_ACCESS_ROLES.find((cr) => cr.id === d.id);
            const rawMenus = Array.isArray(rawRole.allowedMenus) ? [...rawRole.allowedMenus] : ['dashboard'];
            const menus = [...rawMenus];
            if (!menus.includes('dashboard')) menus.unshift('dashboard');

            const existingPerms = (rawRole.permissions || {}) as Record<string, boolean>;
            let hasMissingCorePerm = false;
            const mergedPerms = { ...existingPerms } as Record<PermissionKey, boolean>;
            if (coreFallback) {
              for (const [pk, pv] of Object.entries(coreFallback.permissions)) {
                if (mergedPerms[pk as PermissionKey] === undefined) {
                  mergedPerms[pk as PermissionKey] = pv;
                  hasMissingCorePerm = true;
                }
              }
              for (const mk of coreFallback.allowedMenus) {
                if (!menus.includes(mk)) {
                  menus.push(mk);
                  hasMissingCorePerm = true;
                }
              }
            }

            if (hasMissingCorePerm && isSuperAdmin) {
              setDoc(
                doc(db, 'access_roles', d.id),
                { allowedMenus: menus, permissions: mergedPerms, updatedAt: new Date().toISOString() },
                { merge: true }
              ).catch(() => {});
            }

            items.push({ ...rawRole, allowedMenus: menus, permissions: mergedPerms });
          });
          for (const coreRole of INITIAL_ACCESS_ROLES) {
            if (!items.some((r) => r.id === coreRole.id)) {
              if (isSuperAdmin) {
                setDoc(doc(db, 'access_roles', coreRole.id), coreRole).catch(() => {});
              }
              items.push(coreRole);
            }
          }
          setAccessRoles(items);
        } else {
          if (isSuperAdmin) {
            for (const r of INITIAL_ACCESS_ROLES) {
              setDoc(doc(db, 'access_roles', r.id), r).catch(() => {});
            }
          }
          setAccessRoles(INITIAL_ACCESS_ROLES);
        }
      },
      (err) => console.warn('Access roles sync note:', err.message)
    );

    // 0b. System Users (PII Protected: Only list full directory for Administrator/manageUsers)
    let unsubUsers = () => {};
    if (canListUsers) {
      unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const items: UserProfile[] = [];
          snapshot.forEach((d) => items.push(sanitizeUserProfile(d.data(), d.id)));
          setSystemUsers(items.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')));
        },
        (err) => console.warn('Users sync note:', err.message)
      );
    } else {
      setSystemUsers(userProfile ? [userProfile] : []);
    }

    // 0c. Student Attendances (Practicum)
    const unsubAttendances = onSnapshot(
      collection(db, 'practicum_attendance'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: StudentAttendance[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as StudentAttendance));
          setStudentAttendances(items.sort((a, b) => b.date.localeCompare(a.date)));
        }
      },
      (err) => console.warn('Attendance sync note:', err.message)
    );

    // 0d. Lesson Journals (Incidents, 1-5 Stars, Practicum Photos)
    const unsubJournals = onSnapshot(
      collection(db, 'lesson_journals'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: LessonJournal[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as LessonJournal));
          setLessonJournals(items.sort((a, b) => b.date.localeCompare(a.date)));
        }
      },
      (err) => console.warn('Journals sync note:', err.message)
    );

    // 1. Laboratories - Only single room "Laboratorium Komputer" allowed
    const unsubLabs = onSnapshot(
      collection(db, 'laboratories'),
      async (snapshot) => {
        if (!snapshot.empty) {
          const items: Laboratory[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as Laboratory));

          const obsolete = items.filter((l) => l.id !== 'lab-komputer' && l.name !== 'Laboratorium Komputer');
          for (const obs of obsolete) {
            deleteDoc(doc(db, 'laboratories', obs.id)).catch(() => {});
          }

          const valid = items.filter((l) => l.id === 'lab-komputer' || l.name === 'Laboratorium Komputer');
          if (valid.length === 0) {
            await setDoc(doc(db, 'laboratories', INITIAL_LABS[0].id), INITIAL_LABS[0]);
            setLaboratories(INITIAL_LABS);
          } else {
            setLaboratories(valid);
          }
        } else {
          await setDoc(doc(db, 'laboratories', INITIAL_LABS[0].id), INITIAL_LABS[0]);
          setLaboratories(INITIAL_LABS);
        }
      },
      (err) => console.warn('Labs sync note:', err.message)
    );

    // 2. Computers
    const unsubComputers = onSnapshot(
      collection(db, 'computers'),
      async (snapshot) => {
        if (!snapshot.empty) {
          const items: Computer[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as Computer));

          const hasOfficialPcs = items.some((item) => item.id.startsWith('pc-dkv-') || item.computerCode === 'PC-1');
          if (!hasOfficialPcs) {
            for (const pc of INITIAL_COMPUTERS) {
              setDoc(doc(db, 'computers', pc.id), pc).catch(() => {});
            }
          }
          setComputers(items);
        } else {
          for (const pc of INITIAL_COMPUTERS) {
            setDoc(doc(db, 'computers', pc.id), pc).catch(() => {});
          }
          setComputers(INITIAL_COMPUTERS);
        }
      },
      (err) => console.warn('Computers sync note:', err.message)
    );

    // 3. Equipment
    const unsubEquipment = onSnapshot(
      collection(db, 'equipment'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: Equipment[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as Equipment));
          setEquipment(items);
        }
      },
      (err) => console.warn('Equipment sync note:', err.message)
    );

    // 4. Schedules
    const unsubSchedules = onSnapshot(
      collection(db, 'schedules'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: Schedule[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as Schedule));
          setSchedules(items);
        }
      },
      (err) => console.warn('Schedules sync note:', err.message)
    );

    // 5. Borrowings
    const unsubBorrowings = onSnapshot(
      collection(db, 'borrowings'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: Borrowing[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as Borrowing));
          setBorrowings(items);
        }
      },
      (err) => console.warn('Borrowings sync note:', err.message)
    );

    // 6. Maintenance
    const unsubMaintenance = onSnapshot(
      collection(db, 'maintenance'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: Maintenance[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as Maintenance));
          setMaintenanceList(items);
        }
      },
      (err) => console.warn('Maintenance sync note:', err.message)
    );

    // 7. Damage Reports
    const unsubDamage = onSnapshot(
      collection(db, 'damage_reports'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: DamageReport[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as DamageReport));
          setDamageReports(items);
        }
      },
      (err) => console.warn('Damage reports sync note:', err.message)
    );

    // 8. Users Lab
    const unsubUsersLab = onSnapshot(
      collection(db, 'users_lab'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: LabUser[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as LabUser));
          setUsersLab(items);
        }
      },
      (err) => console.warn('Users lab sync note:', err.message)
    );

    // 9. Activities
    const unsubActivities = onSnapshot(
      collection(db, 'activities'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: Activity[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as Activity));
          setActivities(items);
        }
      },
      (err) => console.warn('Activities sync note:', err.message)
    );

    // 10. Documents
    const unsubDocs = onSnapshot(
      collection(db, 'documents'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: LabDocument[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as LabDocument));
          setDocuments(items);
        }
      },
      (err) => console.warn('Docs sync note:', err.message)
    );

    // 11. Guests
    const unsubGuests = onSnapshot(
      collection(db, 'guests'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: Guest[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as Guest));
          setGuests(items);
        }
      },
      (err) => console.warn('Guests sync note:', err.message)
    );

    // 12. Settings
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'general'),
      (d) => {
        if (d.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...d.data() } as AppSetting);
        }
      },
      (err) => console.warn('Settings sync note:', err.message)
    );

    // 13. Activity Logs
    const unsubLogs = onSnapshot(
      collection(db, 'activity_logs'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: ActivityLog[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as ActivityLog));
          setActivityLogs(items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }
      },
      (err) => console.warn('Logs sync note:', err.message)
    );

    // 14. Classes (Fixed 9 classes guaranteed)
    const unsubClasses = onSnapshot(
      collection(db, 'classes'),
      async (snapshot) => {
        if (!snapshot.empty) {
          const items: SchoolClass[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as SchoolClass));
          const merged = [...items];
          for (const fixed of FIXED_SCHOOL_CLASSES) {
            if (!merged.some((c) => c.id === fixed.id)) {
              setDoc(doc(db, 'classes', fixed.id), fixed).catch(() => {});
              merged.push(fixed);
            }
          }
          setSchoolClasses(merged.sort((a, b) => (a.order || 0) - (b.order || 0)));
        } else {
          for (const fixed of FIXED_SCHOOL_CLASSES) {
            setDoc(doc(db, 'classes', fixed.id), fixed).catch(() => {});
          }
          setSchoolClasses(FIXED_SCHOOL_CLASSES);
        }
      },
      (err) => console.warn('Classes sync note:', err.message)
    );

    // 15. Students
    let hasLoadedStudentsFromFirestore = false;
    const unsubStudents = onSnapshot(
      collection(db, 'students'),
      (snapshot) => {
        if (!snapshot.empty) {
          hasLoadedStudentsFromFirestore = true;
          const items: Student[] = [];
          snapshot.forEach((d) => {
            const raw = d.data() as Record<string, any>;
            const matchedCls =
              FIXED_SCHOOL_CLASSES.find((c) => c.id === raw.classId) ||
              FIXED_SCHOOL_CLASSES.find(
                (c) =>
                  c.name.toLowerCase() === String(raw.className || '').toLowerCase() ||
                  (c.gradeLevel === raw.grade && c.major === (raw.majorCode || raw.major))
              ) ||
              FIXED_SCHOOL_CLASSES[0];
            const resolvedName = String(raw.fullName || raw.name || '').trim();
            items.push({
              ...raw,
              id: d.id,
              studentId: raw.studentId || d.id,
              nis: String(raw.nis || ''),
              nisn: String(raw.nisn || ''),
              fullName: resolvedName,
              name: resolvedName,
              gender: raw.gender === 'P' || raw.gender === 'Perempuan' ? 'P' : 'L',
              classId: raw.classId || matchedCls.id,
              className: raw.className || matchedCls.name,
              grade: raw.grade || matchedCls.gradeLevel,
              major: raw.major || matchedCls.majorFullName,
              majorCode: raw.majorCode || matchedCls.major,
              academicYear: raw.academicYear || '2026/2027',
              homeroomTeacher: raw.homeroomTeacher ?? matchedCls.homeroomTeacherName,
              address: raw.address || '',
              parentPhone: raw.parentPhone || '',
              status: raw.status === 'Tidak Aktif' ? 'Tidak Aktif' : 'Aktif',
            } as Student);
          });
          setStudents(items.sort((a, b) => a.fullName.localeCompare(b.fullName)));
        } else if (hasLoadedStudentsFromFirestore) {
          setStudents([]);
        }
      },
      (err) => console.warn('Students sync note:', err.message)
    );

    // 16. Class Attendance Records
    const unsubClassAtt = onSnapshot(
      collection(db, 'attendance'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: ClassAttendanceRecord[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as ClassAttendanceRecord));
          setClassAttendances(items.sort((a, b) => b.date.localeCompare(a.date)));
        }
      },
      (err) => console.warn('Class attendance sync note:', err.message)
    );

    // 17. Academic Years
    const unsubAcademicYears = onSnapshot(
      collection(db, 'academic_years'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: AcademicYearConfig[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as AcademicYearConfig));
          setAcademicYears(items.sort((a, b) => b.year.localeCompare(a.year)));
        }
      },
      (err) => console.warn('Academic years sync note:', err.message)
    );

    // 18. School Calendar
    const unsubSchoolCalendar = onSnapshot(
      collection(db, 'school_calendar'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: SchoolCalendarEvent[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as SchoolCalendarEvent));
          setSchoolCalendar(items.sort((a, b) => a.date.localeCompare(b.date)));
        }
      },
      (err) => console.warn('School calendar sync note:', err.message)
    );

    // 19. Attendance Settings
    const unsubAttSettings = onSnapshot(
      doc(db, 'attendance_settings', 'default'),
      (d) => {
        if (d.exists()) {
          setAttendanceSettings({ ...DEFAULT_ATTENDANCE_SETTINGS, ...d.data() } as AttendanceSettings);
        }
      },
      (err) => console.warn('Attendance settings sync note:', err.message)
    );

    // 20. Attendance Logs
    const unsubAttLogs = onSnapshot(
      collection(db, 'attendance_logs'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: AttendanceLog[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as AttendanceLog));
          setAttendanceLogs(items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }
      },
      (err) => console.warn('Attendance logs sync note:', err.message)
    );

    // 21. Galeri Laboratorium Images
    let hasLoadedGalleryFromFirestore = false;
    const unsubGalleryImages = onSnapshot(
      collection(db, 'galleryImages'),
      (snapshot) => {
        if (!snapshot.empty) {
          hasLoadedGalleryFromFirestore = true;
          const items: GalleryImage[] = [];
          snapshot.forEach((d) => {
            const raw = d.data() as Record<string, any>;
            items.push({
              ...raw,
              id: d.id,
              imageId: raw.imageId || d.id,
              title: String(raw.title || ''),
              category: String(raw.category || 'Lain-lain'),
              description: String(raw.description || ''),
              notes: raw.notes ? String(raw.notes) : '',
              imageUrl: String(raw.imageUrl || ''),
              storagePath: String(raw.storagePath || ''),
              uploadDate: String(raw.uploadDate || ''),
              createdAt: String(raw.createdAt || ''),
              updatedAt: String(raw.updatedAt || ''),
              uploadedBy: String(raw.uploadedBy || 'Administrator'),
              status: raw.status === 'Arsip' ? 'Arsip' : 'Aktif',
            });
          });
          setGalleryImages(
            items.sort((a, b) => {
              const dateDiff = (b.uploadDate || '').localeCompare(a.uploadDate || '');
              if (dateDiff !== 0) return dateDiff;
              return (b.createdAt || '').localeCompare(a.createdAt || '');
            })
          );
        } else if (hasLoadedGalleryFromFirestore) {
          setGalleryImages([]);
        }
      },
      (err) => console.warn('Gallery images sync note:', err.message)
    );

    // 22. Galeri Laboratorium Categories
    const unsubGalleryCategories = onSnapshot(
      collection(db, 'galleryCategories'),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: GalleryCategory[] = [];
          snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as GalleryCategory));
          setGalleryCategories(items.sort((a, b) => (a.order || 0) - (b.order || 0)));
        } else {
          for (const cat of INITIAL_GALLERY_CATEGORIES) {
            setDoc(doc(db, 'galleryCategories', cat.id), cat).catch(() => {});
          }
          setGalleryCategories(INITIAL_GALLERY_CATEGORIES);
        }
      },
      (err) => console.warn('Gallery categories sync note:', err.message)
    );

    // 23-29. Riwayat Penggunaan Komputer (7 Firestore Collections)
    const unsubComputerUsage = onSnapshot(
      collection(db, 'computer_usage'),
      (snapshot) => {
        const items: ComputerUsageRecord[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as ComputerUsageRecord));
        setComputerUsages(
          items.sort((a, b) => {
            const dCmp = (b.usageDate || '').localeCompare(a.usageDate || '');
            if (dCmp !== 0) return dCmp;
            const tCmp = (b.startTime || '').localeCompare(a.startTime || '');
            if (tCmp !== 0) return tCmp;
            return (b.createdAt || '').localeCompare(a.createdAt || '');
          })
        );
      },
      (err) => console.warn('Computer usage sync note:', err.message)
    );

    const unsubUsageMembers = onSnapshot(
      collection(db, 'computer_usage_members'),
      (snapshot) => {
        const items: ComputerUsageMember[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as ComputerUsageMember));
        setComputerUsageMembers(items);
      },
      (err) => console.warn('Usage members sync note:', err.message)
    );

    const unsubConditionChecks = onSnapshot(
      collection(db, 'computer_condition_checks'),
      (snapshot) => {
        const items: ComputerConditionCheck[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as ComputerConditionCheck));
        setComputerConditionChecks(
          items.sort((a, b) => (b.checkedAt || '').localeCompare(a.checkedAt || ''))
        );
      },
      (err) => console.warn('Condition checks sync note:', err.message)
    );

    const unsubComputerDamages = onSnapshot(
      collection(db, 'computer_damage_reports'),
      (snapshot) => {
        const items: ComputerDamageReport[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as ComputerDamageReport));
        setComputerDamageReports(
          items.sort((a, b) => (b.discoveredAt || '').localeCompare(a.discoveredAt || ''))
        );
      },
      (err) => console.warn('Computer damages sync note:', err.message)
    );

    const unsubStatusHistory = onSnapshot(
      collection(db, 'computer_status_history'),
      (snapshot) => {
        const items: ComputerStatusHistory[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as ComputerStatusHistory));
        setComputerStatusHistories(
          items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
        );
      },
      (err) => console.warn('Status history sync note:', err.message)
    );

    const unsubExternalUsers = onSnapshot(
      collection(db, 'external_users'),
      (snapshot) => {
        const items: ExternalUser[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as ExternalUser));
        setExternalUsers(items.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')));
      },
      (err) => console.warn('External users sync note:', err.message)
    );

    const unsubUsageSettings = onSnapshot(
      doc(db, 'computer_usage_settings', 'default'),
      (d) => {
        if (d.exists()) {
          setComputerUsageSettings({ ...DEFAULT_COMPUTER_USAGE_SETTINGS, ...d.data() } as ComputerUsageSettings);
        }
      },
      (err) => console.warn('Usage settings sync note:', err.message)
    );

    return () => {
      unsubRoles();
      unsubUsers();
      unsubAttendances();
      unsubJournals();
      unsubLabs();
      unsubComputers();
      unsubEquipment();
      unsubSchedules();
      unsubBorrowings();
      unsubMaintenance();
      unsubDamage();
      unsubUsersLab();
      unsubActivities();
      unsubDocs();
      unsubGuests();
      unsubSettings();
      unsubLogs();
      unsubClasses();
      unsubStudents();
      unsubClassAtt();
      unsubAcademicYears();
      unsubSchoolCalendar();
      unsubAttSettings();
      unsubAttLogs();
      unsubGalleryImages();
      unsubGalleryCategories();
      unsubComputerUsage();
      unsubUsageMembers();
      unsubConditionChecks();
      unsubComputerDamages();
      unsubStatusHistory();
      unsubExternalUsers();
      unsubUsageSettings();
    };
  }, [currentUser?.uid, userProfile?.isActive, currentRole, userProfile?.hasCustomPermissions]);

  // Activity logger helper
  const logActivity = async (action: string, module: string, details: string) => {
    const newLog: ActivityLog = {
      id: 'log-' + Date.now(),
      userId: currentUser?.uid || userProfile?.uid || 'user-system',
      userName: userProfile?.displayName || 'Admin Lab',
      userRole: activeRoleObject?.name || currentRole,
      action,
      module,
      details,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev]);

    try {
      await setDoc(doc(db, 'activity_logs', newLog.id), newLog);
    } catch {
      // Local state updated
    }
  };

  const logUnauthorizedAccess = async (attemptedMenu: string) => {
    await logActivity(
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'Keamanan Sistem',
      `Percobaan akses menu terlarang (${attemptedMenu}) oleh ${userProfile?.displayName || currentUser?.email || 'Unknown'}`
    );
  };

  // Helper to resolve & activate user profile after Firebase Auth login
  const verifyAuthenticatedUserProfile = async (
    user: User,
    method: 'EMAIL_PASSWORD' | 'GOOGLE'
  ): Promise<{ success: boolean; error?: string }> => {
    const isMaster =
      user.email?.toLowerCase() === MASTER_ADMIN_EMAIL && Boolean(user.emailVerified);
    const nowIso = new Date().toISOString();
    const userRef = doc(db, 'users', user.uid);
    let userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      if (isMaster) {
        const masterProfile: UserProfile = {
          uid: user.uid,
          email: user.email || MASTER_ADMIN_EMAIL,
          displayName: user.displayName || 'Ade Nur, S.Kom., M.T.',
          role: 'admin',
          position: 'Super Administrator SILABKOM',
          nip: '19870520 201101 1 008',
          subject: 'Administrator Sistem',
          phone: '081288991234',
          assignedClassIds: [],
          avatarUrl: user.photoURL || undefined,
          isActive: true,
          authProvisioned: true,
          lastLoginAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        await setDoc(userRef, masterProfile, { merge: true });
        userSnap = await getDoc(userRef);
      } else if (user.email) {
        const emailKey = normalizeEmailKey(user.email);
        const inviteRef = doc(db, 'user_invites', emailKey);
        const inviteSnap = await getDoc(inviteRef);
        if (inviteSnap.exists()) {
          const inv = inviteSnap.data() as any;
          if (inv.isActive === false) {
            await fbSignOut(auth);
            return {
              success: false,
              error: 'Akun Anda sedang dinonaktifkan oleh Administrator SILABKOM.',
            };
          }
          const provisionedProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: inv.displayName || user.displayName || user.email.split('@')[0],
            role: inv.role || 'guru_mapel',
            position: inv.position || '',
            nip: inv.nip || '',
            subject: inv.subject || '',
            phone: inv.phone || '',
            assignedClassIds: inv.assignedClassIds || [],
            hasCustomPermissions: Boolean(inv.hasCustomPermissions),
            customAllowedMenus: inv.customAllowedMenus || [],
            customPermissions: inv.customPermissions || {},
            avatarUrl: user.photoURL || undefined,
            isActive: true,
            authProvisioned: true,
            lastLoginAt: nowIso,
            createdBy: inv.createdBy || 'Administrator',
            createdAt: inv.createdAt || nowIso,
            updatedAt: nowIso,
          };
          await setDoc(userRef, provisionedProfile);
          await deleteDoc(inviteRef).catch(() => {});
          userSnap = await getDoc(userRef);
        }
      }
    }

    if (!userSnap.exists()) {
      await fbSignOut(auth);
      return {
        success: false,
        error:
          'Akun belum terdaftar atau aksesnya telah dicabut. Hubungi Administrator SILABKOM SMKN 15 Pandeglang.',
      };
    }

    const profileData = sanitizeUserProfile(userSnap.data(), user.uid);
    if (!profileData.isActive && !isMaster) {
      await fbSignOut(auth);
      return {
        success: false,
        error: 'Akun Anda dinonaktifkan oleh Administrator. Anda tidak dapat mengakses sistem.',
      };
    }

    const updatedProfile: UserProfile = {
      ...profileData,
      lastLoginAt: nowIso,
      updatedAt: nowIso,
      ...(user.photoURL && !profileData.avatarUrl ? { avatarUrl: user.photoURL } : {}),
    };

    try {
      await updateDoc(userRef, {
        lastLoginAt: nowIso,
        updatedAt: nowIso,
      });
    } catch {
      // Non-fatal timestamp update
    }

    if (isLoggingOutRef.current || auth.currentUser?.uid !== user.uid) {
      return { success: false, error: 'Sesi autentikasi berubah. Silakan masuk kembali.' };
    }

    clearCachedProfile();
    writeCachedProfile(user.uid, updatedProfile);
    setCurrentUser(user);
    setUserProfile(updatedProfile);
    setCurrentRole(updatedProfile.role);
    setAuthNotice(null);

    const roleName =
      accessRoles.find((r) => r.id === updatedProfile.role)?.name ||
      INITIAL_ACCESS_ROLES.find((r) => r.id === updatedProfile.role)?.name ||
      updatedProfile.role;
    addToast('success', 'Login Berhasil', `Selamat datang, ${updatedProfile.displayName} (${roleName})`);
    await setDoc(doc(db, 'activity_logs', 'log-' + Date.now()), {
      id: 'log-' + Date.now(),
      userId: user.uid,
      userName: updatedProfile.displayName,
      userRole: roleName,
      action: method === 'GOOGLE' ? 'LOGIN_GOOGLE' : 'LOGIN_SUCCESS',
      module: 'Autentikasi',
      details: `${updatedProfile.displayName} (${updatedProfile.email}) berhasil masuk sebagai ${roleName}`,
      timestamp: nowIso,
    }).catch(() => {});

    return { success: true };
  };

  // Google Login (Restricted strictly to Master Admin or pre-registered accounts)
  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      isLoggingOutRef.current = false;
      await setPersistence(auth, browserLocalPersistence);
      const res = await signInWithPopup(auth, googleProvider);
      return await verifyAuthenticatedUserProfile(res.user, 'GOOGLE');
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      const msg = translateFirebaseAuthError(err);
      addToast('error', 'Login Google Gagal', msg);
      return { success: false, error: msg };
    }
  };

  // Real Firebase Auth Email & Password Login
  const loginWithEmailPassword = async (
    emailInput: string,
    passwordInput: string,
    rememberMe = true
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !passwordInput) {
      return { success: false, error: 'Email dan kata sandi wajib diisi.' };
    }

    try {
      isLoggingOutRef.current = false;
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, passwordInput);
      return await verifyAuthenticatedUserProfile(cred.user, 'EMAIL_PASSWORD');
    } catch (err: any) {
      const msg = translateFirebaseAuthError(err);
      return { success: false, error: msg };
    }
  };

  // Forgot Password / Admin Password Reset Email
  const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return { success: false, error: 'Masukkan alamat email yang terdaftar.' };
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      if (currentUser && userProfile) {
        logActivity(
          'PASSWORD_RESET_SENT',
          'Keamanan & Akun',
          `Mengirim email reset kata sandi ke ${cleanEmail}`
        );
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: translateFirebaseAuthError(err) };
    }
  };

  // Logged-in user changes their own password securely
  const changeOwnPassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      return { success: false, error: 'Sesi login tidak valid.' };
    }
    if (newPassword.length < 6) {
      return { success: false, error: 'Kata sandi baru minimal 6 karakter.' };
    }
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      logActivity(
        'CHANGE_OWN_PASSWORD',
        'Profil Pengguna',
        `${userProfile?.displayName || user.email} memperbarui kata sandi akun`
      );
      addToast('success', 'Kata Sandi Diperbarui', 'Kata sandi akun Anda berhasil diubah.');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: translateFirebaseAuthError(err) };
    }
  };

  // Logged-in user updates only allowed safe personal profile fields (role/jabatan/status/permissions locked)
  const updateOwnProfile = async (updates: {
    displayName: string;
    phone?: string;
    avatarUrl?: string;
    nip?: string;
    subject?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || !userProfile) {
      return { success: false, error: 'Anda belum login.' };
    }
    const cleanName = updates.displayName.trim();
    if (!cleanName) {
      return { success: false, error: 'Nama lengkap tidak boleh kosong.' };
    }

    const nowIso = new Date().toISOString();
    const safeUpdate = {
      displayName: cleanName,
      phone: (updates.phone ?? userProfile.phone ?? '').trim(),
      avatarUrl: (updates.avatarUrl ?? userProfile.avatarUrl ?? '').trim(),
      nip: (updates.nip ?? userProfile.nip ?? '').trim(),
      subject: (updates.subject ?? userProfile.subject ?? '').trim(),
      updatedAt: nowIso,
    };

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), safeUpdate);
      setUserProfile((prev) => (prev ? { ...prev, ...safeUpdate } : prev));
      addToast('success', 'Profil Disimpan', 'Informasi profil pribadi Anda berhasil diperbarui.');
      logActivity('UPDATE_OWN_PROFILE', 'Profil Pengguna', `Memperbarui profil ${cleanName}`);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Gagal memperbarui profil.';
      addToast('error', 'Gagal Memperbarui Profil', msg);
      return { success: false, error: msg };
    }
  };

  // Logout (True Firebase signOut + session/cache cleanup + history lock)
  const logout = async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsLoggingOut(true);
    authEventSeqRef.current += 1;

    const prevUser = currentUser;
    const prevProfile = userProfile;
    const uidToClear = prevUser?.uid || auth.currentUser?.uid;
    let signOutError: any = null;

    try {
      // Best-effort non-blocking logout audit log (never block signOut if offline/slow)
      if (prevUser && prevProfile) {
        const logId = 'log-' + Date.now();
        const logoutLog: ActivityLog = {
          id: logId,
          userId: prevUser.uid,
          userName: prevProfile.displayName,
          userRole: activeRoleObject?.name || currentRole || prevProfile.role,
          action: 'LOGOUT',
          module: 'Autentikasi',
          details: `${prevProfile.displayName} (${prevProfile.email}) keluar dari sistem`,
          timestamp: new Date().toISOString(),
        };
        await Promise.race([
          setDoc(doc(db, 'activity_logs', logId), logoutLog).catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ]);
      }

      clearCachedProfile(uidToClear);
      try {
        await fbSignOut(auth);
      } catch (firstErr) {
        // Retry once cleanly if transient error occurs
        await fbSignOut(auth).catch(() => {
          throw firstErr;
        });
      }
    } catch (err: any) {
      signOutError = err;
      console.error('Logout error:', err);
    } finally {
      if (!signOutError && !auth.currentUser) {
        clearCachedProfile(uidToClear);
        resetTransientAuthSessionState();
        setAuthNotice(null);
        setIsLoading(false);
        setAuthReady(true);

        if (typeof window !== 'undefined') {
          try {
            window.history.replaceState({ silabkomAuth: 'logged_out', ts: Date.now() }, '', '/');
            window.history.pushState({ silabkomAuth: 'login_guard', ts: Date.now() }, '', '/');
          } catch {
            // Ignore history API errors in restricted frames
          }
        }

        addToast('success', 'Keluar Sistem', 'Anda berhasil keluar dari SILABKOM.');
      } else {
        const errMsg = signOutError?.message || 'Tidak dapat mengakhiri sesi Firebase Authentication.';
        addToast('error', 'Gagal Keluar Akun', `${errMsg} Silakan coba lagi atau muat ulang halaman.`);
      }

      isLoggingOutRef.current = false;
      setIsLoggingOut(false);
    }
  };

  // CRUD: Access Roles
  const saveAccessRole = async (role: AccessRole) => {
    if (!hasPermission('manageRoles') && !hasPermission('crudAllData') && !isSuperAdmin) {
      addToast('error', 'Akses Ditolak', 'Anda tidak memiliki izin mengubah hak akses.');
      return;
    }
    const id = role.id || role.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'role_' + Date.now();
    const payload: AccessRole = {
      ...role,
      id,
      updatedAt: new Date().toISOString(),
      createdAt: role.createdAt || new Date().toISOString(),
    };
    setAccessRoles((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });

    try {
      await setDoc(doc(db, 'access_roles', id), payload);
      addToast('success', 'Hak Akses Disimpan', `Level hak akses "${payload.name}" berhasil disimpan.`);
      logActivity('SAVE_ACCESS_ROLE', 'Manajemen Hak Akses', `Menyimpan level hak akses: ${payload.name}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `access_roles/${id}`);
    }
  };

  const deleteAccessRole = async (id: string) => {
    if (!hasPermission('manageRoles') && !hasPermission('crudAllData') && !isSuperAdmin) {
      addToast('error', 'Akses Ditolak', 'Anda tidak memiliki izin menghapus hak akses.');
      return;
    }
    const target = accessRoles.find((r) => r.id === id);
    if (target?.isSystem || ['admin', 'administrator', 'kepala_lab', 'guru_mapel', 'kepala_sekolah', 'teknisi', 'wali_kelas', 'petugas_absensi'].includes(id)) {
      addToast('warning', 'Tidak Dapat Dihapus', 'Level hak akses inti sistem tidak boleh dihapus.');
      return;
    }
    setAccessRoles((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'access_roles', id));
      addToast('success', 'Hak Akses Dihapus', `Level "${target?.name || id}" berhasil dihapus.`);
      logActivity('DELETE_ACCESS_ROLE', 'Manajemen Hak Akses', `Menghapus level hak akses: ${target?.name || id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `access_roles/${id}`);
    }
  };

  // Admin: Create new user in Firebase Auth (via isolated secondary app) + Firestore profile (NO plaintext password stored!)
  const createManagedUserAccount = async (input: {
    displayName: string;
    email: string;
    initialPassword: string;
    position: string;
    role: UserRole;
    nip?: string;
    subject?: string;
    phone?: string;
    assignedClassIds?: string[];
    isActive: boolean;
    hasCustomPermissions?: boolean;
    customAllowedMenus?: string[];
    customPermissions?: Partial<Record<PermissionKey, boolean>>;
  }): Promise<{ success: boolean; uid?: string; alreadyInAuth?: boolean; error?: string; message?: string }> => {
    if (!hasPermission('manageUsers') && !hasPermission('crudAllData') && !isSuperAdmin) {
      return { success: false, error: 'Anda tidak memiliki kewenangan membuat akun pengguna.' };
    }
    if (input.role === 'admin' && !isSuperAdmin) {
      return { success: false, error: 'Hanya Super Administrator yang dapat membuat akun Super Administrator.' };
    }

    const cleanEmail = input.email.trim().toLowerCase();
    const nowIso = new Date().toISOString();

    const authResult = await provisionAuthAccount(cleanEmail, input.initialPassword, input.displayName);

    if (authResult.success && authResult.uid) {
      const profilePayload: UserProfile = {
        uid: authResult.uid,
        email: cleanEmail,
        displayName: input.displayName.trim(),
        role: input.role,
        position: input.position.trim(),
        nip: (input.nip || '').trim(),
        subject: (input.subject || '').trim(),
        phone: (input.phone || '').trim(),
        assignedClassIds: input.assignedClassIds || [],
        hasCustomPermissions: Boolean(input.hasCustomPermissions),
        customAllowedMenus: input.customAllowedMenus || [],
        customPermissions: input.customPermissions || {},
        isActive: input.isActive,
        authProvisioned: true,
        createdBy: userProfile?.displayName || currentUser?.email || 'Administrator',
        updatedBy: userProfile?.displayName || currentUser?.email || 'Administrator',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      try {
        await setDoc(doc(db, 'users', authResult.uid), profilePayload);
        addToast('success', 'Akun Berhasil Dibuat', `${profilePayload.displayName} telah terdaftar di Firebase Auth & Firestore.`);
        logActivity(
          'CREATE_USER_ACCOUNT',
          'Manajemen Akun',
          `Membuat akun baru: ${profilePayload.displayName} (${cleanEmail}) - Role: ${profilePayload.role}`
        );
        return { success: true, uid: authResult.uid };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${authResult.uid}`);
        return { success: false, error: 'Akun Auth dibuat tetapi gagal menyimpan profil ke Firestore.' };
      }
    }

    // If email already exists in Firebase Authentication (e.g., Google Auth or previous test), link via existing profile or user_invites
    if (authResult.code === 'auth/email-already-in-use') {
      const existingDoc = systemUsers.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existingDoc) {
        await saveSystemUser({
          ...existingDoc,
          displayName: input.displayName.trim(),
          role: input.role,
          position: input.position.trim(),
          nip: (input.nip || '').trim(),
          subject: (input.subject || '').trim(),
          phone: (input.phone || '').trim(),
          assignedClassIds: input.assignedClassIds || [],
          hasCustomPermissions: Boolean(input.hasCustomPermissions),
          customAllowedMenus: input.customAllowedMenus || [],
          customPermissions: input.customPermissions || {},
          isActive: input.isActive,
          authProvisioned: true,
        });
        return {
          success: true,
          uid: existingDoc.uid,
          alreadyInAuth: true,
          message:
            'Email sudah terdaftar di Firebase Auth. Profil & hak akses diperbarui; gunakan "Reset Kata Sandi" jika perlu mengganti sandi.',
        };
      }

      const emailKey = normalizeEmailKey(cleanEmail);
      await setDoc(doc(db, 'user_invites', emailKey), {
        email: cleanEmail,
        displayName: input.displayName.trim(),
        role: input.role,
        position: input.position.trim(),
        nip: (input.nip || '').trim(),
        subject: (input.subject || '').trim(),
        phone: (input.phone || '').trim(),
        assignedClassIds: input.assignedClassIds || [],
        hasCustomPermissions: Boolean(input.hasCustomPermissions),
        customAllowedMenus: input.customAllowedMenus || [],
        customPermissions: input.customPermissions || {},
        isActive: input.isActive,
        createdBy: userProfile?.displayName || 'Administrator',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      logActivity(
        'CREATE_USER_INVITE',
        'Manajemen Akun',
        `Menautkan undangan akun: ${input.displayName} (${cleanEmail}) - Role: ${input.role}`
      );
      addToast(
        'info',
        'Akun Ditautkan',
        'Email sudah terdaftar di Firebase Authentication. Role & hak akses telah ditautkan otomatis saat pengguna masuk.'
      );
      return {
        success: true,
        alreadyInAuth: true,
        message:
          'Email sudah ada di Firebase Auth. Profil & hak akses ditautkan otomatis saat pengguna masuk (atau kirim Reset Kata Sandi).',
      };
    }

    const translated = translateFirebaseAuthError({ code: authResult.code, message: authResult.error });
    addToast('error', 'Gagal Membuat Akun', translated);
    return { success: false, error: translated };
  };

  // CRUD: Update existing System User (Akun Login, Jabatan, Role & Custom Permissions)
  const saveSystemUser = async (user: UserProfile) => {
    if (!hasPermission('manageUsers') && !hasPermission('crudAllData') && !isSuperAdmin) {
      addToast('error', 'Akses Ditolak', 'Anda tidak memiliki izin mengelola akun pengguna.');
      return;
    }
    const uid = user.uid;
    if (!uid) return;

    const existingTarget = systemUsers.find((x) => x.uid === uid);
    if ((user.role === 'admin' || existingTarget?.role === 'admin') && !isSuperAdmin) {
      addToast('error', 'Akses Ditolak', 'Hanya Super Administrator yang dapat mengubah akun Super Administrator.');
      return;
    }

    // Prevent demoting or deactivating the last Super Administrator
    const activeSuperAdmins = systemUsers.filter((u) => u.role === 'admin' && u.isActive);
    if (
      existingTarget?.role === 'admin' &&
      (user.role !== 'admin' || !user.isActive) &&
      activeSuperAdmins.length <= 1
    ) {
      addToast('warning', 'Dilindungi Sistem', 'Akun Super Administrator terakhir tidak dapat dinonaktifkan atau diturunkan perannya.');
      return;
    }

    const sanitized = sanitizeUserProfile(user, uid);
    const payload: UserProfile = {
      ...sanitized,
      uid,
      email: sanitized.email.trim().toLowerCase(),
      updatedBy: userProfile?.displayName || currentUser?.email || 'Administrator',
      updatedAt: new Date().toISOString(),
      createdAt: sanitized.createdAt || new Date().toISOString(),
    };

    setSystemUsers((prev) => {
      const idx = prev.findIndex((x) => x.uid === uid);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });

    try {
      await setDoc(doc(db, 'users', uid), payload, { merge: true });
      addToast('success', 'Akun Pengguna Disimpan', `Perubahan akun ${payload.displayName} berhasil disimpan.`);
      logActivity(
        'UPDATE_USER_ACCESS',
        'Manajemen Akun',
        `Memperbarui akun & hak akses: ${payload.displayName} (${payload.role}, status: ${payload.isActive ? 'Aktif' : 'Nonaktif'})`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  };

  const toggleUserActiveStatus = async (uid: string, nextActive: boolean) => {
    if (!hasPermission('manageUsers') && !hasPermission('crudAllData') && !isSuperAdmin) {
      addToast('error', 'Akses Ditolak', 'Anda tidak memiliki izin mengubah status akun.');
      return;
    }
    const target = systemUsers.find((u) => u.uid === uid);
    if (!target) return;
    if (target.email.toLowerCase() === MASTER_ADMIN_EMAIL) {
      addToast('warning', 'Dilindungi', 'Akun Super Administrator utama tidak dapat dinonaktifkan.');
      return;
    }
    if (uid === currentUser?.uid && !nextActive) {
      addToast('warning', 'Dilindungi', 'Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang login.');
      return;
    }
    const activeSuperAdmins = systemUsers.filter((u) => u.role === 'admin' && u.isActive);
    if (target.role === 'admin' && !nextActive && activeSuperAdmins.length <= 1) {
      addToast('warning', 'Dilindungi Sistem', 'Akun Super Administrator terakhir tidak dapat dinonaktifkan.');
      return;
    }

    const nowIso = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'users', uid), {
        isActive: nextActive,
        disabledAt: nextActive ? '' : nowIso,
        disabledBy: nextActive ? '' : (userProfile?.displayName || 'Administrator'),
        updatedBy: userProfile?.displayName || 'Administrator',
        updatedAt: nowIso,
      });
      addToast(
        nextActive ? 'success' : 'warning',
        nextActive ? 'Akun Diaktifkan' : 'Akun Dinonaktifkan',
        `${target.displayName} sekarang berstatus ${nextActive ? 'Aktif' : 'Nonaktif'}.`
      );
      logActivity(
        nextActive ? 'ENABLE_USER_ACCOUNT' : 'DISABLE_USER_ACCOUNT',
        'Manajemen Akun',
        `${nextActive ? 'Mengaktifkan' : 'Menonaktifkan'} akun ${target.displayName} (${target.email})`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const deleteSystemUser = async (uid: string) => {
    if (!hasPermission('manageUsers') && !hasPermission('crudAllData') && !isSuperAdmin) {
      addToast('error', 'Akses Ditolak', 'Anda tidak memiliki izin mencabut akses akun.');
      return;
    }
    const target = systemUsers.find((u) => u.uid === uid);
    if (target?.email.toLowerCase() === MASTER_ADMIN_EMAIL) {
      addToast('warning', 'Dilindungi', 'Akun Super Administrator utama tidak dapat dihapus.');
      return;
    }
    if (uid === currentUser?.uid) {
      addToast('warning', 'Dilindungi', 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.');
      return;
    }
    const activeSuperAdmins = systemUsers.filter((u) => u.role === 'admin' && u.isActive);
    if (target?.role === 'admin' && activeSuperAdmins.length <= 1) {
      addToast('warning', 'Dilindungi Sistem', 'Akun Super Administrator terakhir tidak dapat dihapus.');
      return;
    }

    setSystemUsers((prev) => prev.filter((x) => x.uid !== uid));
    try {
      await deleteDoc(doc(db, 'users', uid));
      if (target?.email) {
        await deleteDoc(doc(db, 'user_invites', normalizeEmailKey(target.email))).catch(() => {});
      }
      addToast('success', 'Akses Akun Dicabut', `Akses untuk ${target?.displayName || uid} telah dicabut.`);
      logActivity('REVOKE_USER_ACCESS', 'Manajemen Akun', `Mencabut akses akun: ${target?.displayName || uid}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
    }
  };

  // CRUD: Student Attendances
  const saveStudentAttendance = async (item: StudentAttendance) => {
    const id = item.id || 'att-' + Date.now();
    const payload: StudentAttendance = {
      ...item,
      id,
      createdByUid: item.createdByUid || userProfile?.uid || 'system',
      updatedAt: new Date().toISOString(),
      createdAt: item.createdAt || new Date().toISOString(),
    };
    setStudentAttendances((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [payload, ...prev];
    });

    try {
      await setDoc(doc(db, 'practicum_attendance', id), payload);
      addToast('success', 'Absensi Tersimpan', `Absensi kelas ${item.classGrade} (${item.subject}) berhasil disimpan.`);
      logActivity('SAVE_ATTENDANCE', 'Absensi Siswa Praktikum', `Absensi ${item.classGrade} - ${item.subject} (${item.presentCount}/${item.totalStudents} hadir)`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `practicum_attendance/${id}`);
    }
  };

  const deleteStudentAttendance = async (id: string) => {
    setStudentAttendances((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'practicum_attendance', id));
      addToast('success', 'Absensi Dihapus', 'Data absensi praktikum berhasil dihapus.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `practicum_attendance/${id}`);
    }
  };

  // CRUD: Lesson Journals (Incidents, 1-5 Star Comfort Feedback, Practicum Photos)
  const saveLessonJournal = async (item: LessonJournal) => {
    const id = item.id || 'jrn-' + Date.now();
    const payload: LessonJournal = {
      ...item,
      id,
      createdByUid: item.createdByUid || userProfile?.uid || 'system',
      updatedAt: new Date().toISOString(),
      createdAt: item.createdAt || new Date().toISOString(),
    };
    setLessonJournals((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [payload, ...prev];
    });

    try {
      await setDoc(doc(db, 'lesson_journals', id), payload);
      addToast('success', 'Jurnal Praktikum Tersimpan', `Catatan pembelajaran & rating kenyamanan (${item.comfortRating} Bintang) tersimpan.`);
      logActivity('SAVE_JOURNAL', 'Jurnal & Dokumentasi Praktikum', `Jurnal ${item.subject} (${item.classGrade}) • Rating ${item.comfortRating}★`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lesson_journals/${id}`);
    }
  };

  const deleteLessonJournal = async (id: string) => {
    setLessonJournals((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'lesson_journals', id));
      addToast('success', 'Jurnal Dihapus', 'Catatan jurnal pembelajaran berhasil dihapus.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `lesson_journals/${id}`);
    }
  };

  // CRUD: Laboratories
  const saveLaboratory = async (lab: Laboratory) => {
    const id = lab.id || 'lab-' + Date.now();
    const payload = { ...lab, id, updatedAt: new Date().toISOString() };
    setLaboratories((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });

    try {
      await setDoc(doc(db, 'laboratories', id), payload);
      addToast('success', 'Data Tersimpan', `Ruangan ${lab.name} berhasil disimpan`);
      logActivity('SAVE_LAB', 'Data Laboratorium', `Menyimpan data laboratorium: ${lab.name}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `laboratories/${id}`);
    }
  };

  const deleteLaboratory = async (id: string) => {
    const target = laboratories.find((l) => l.id === id);
    setLaboratories((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'laboratories', id));
      addToast('success', 'Data Dihapus', `Ruangan laboratorium berhasil dihapus`);
      logActivity('DELETE_LAB', 'Data Laboratorium', `Menghapus ruangan: ${target?.name || id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `laboratories/${id}`);
    }
  };

  // CRUD: Computers
  const saveComputer = async (pc: Computer): Promise<{ success: boolean; error?: string }> => {
    const id = pc.id || 'pc-' + Date.now();
    const candidate: Computer = { ...pc, id };
    const uniqueCheck = validateComputerUniqueIdentity(candidate, computers);
    if (!uniqueCheck.valid) {
      addToast('error', 'Data Komputer Duplikat', uniqueCheck.error || 'Kode komputer harus unik.');
      return { success: false, error: uniqueCheck.error };
    }

    const qrData = pc.qrCodeData || `SMKN15-${pc.computerCode || id}`;
    const payload = {
      ...pc,
      id,
      qrCodeData: qrData,
      updatedAt: new Date().toISOString(),
      createdAt: pc.createdAt || new Date().toISOString(),
    };

    setComputers((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });

    try {
      await setDoc(doc(db, 'computers', id), payload);
      addToast('success', 'Inventaris Disimpan', `Komputer ${pc.computerCode} (${pc.deviceName}) tersimpan`);
      logActivity('SAVE_PC', 'Inventaris Komputer', `Menyimpan unit PC: ${pc.computerCode}`);
      return { success: true };
    } catch (err: any) {
      console.error('Error saving computer:', err);
      const errMsg = err?.message || 'Gagal menyimpan data komputer ke database.';
      addToast('error', 'Gagal Menyimpan Komputer', errMsg);
      return { success: false, error: errMsg };
    }
  };

  const deleteComputer = async (id: string) => {
    const target = computers.find((c) => c.id === id);
    setComputers((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'computers', id));
      addToast('success', 'Data Dihapus', `Unit komputer berhasil dihapus`);
      logActivity('DELETE_PC', 'Inventaris Komputer', `Menghapus unit PC: ${target?.computerCode || id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `computers/${id}`);
    }
  };

  const batchImportComputers = async (pcs: Partial<Computer>[]): Promise<number> => {
    let count = 0;
    const newItems: Computer[] = [];
    for (const item of pcs) {
      if (!item.deviceName && !item.computerCode) continue;
      const id = item.id || 'pc-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const fullItem: Computer = {
        id,
        inventoryNumber: item.inventoryNumber || `SMKN15/PC/${Date.now()}/${count + 1}`,
        computerCode: item.computerCode || `PC-${count + 1}`,
        deviceName: item.deviceName || 'PC Workstation',
        brand: item.brand || 'Lenovo',
        model: item.model || 'Neo 50t',
        serialNumber: item.serialNumber || '',
        processor: item.processor || 'Intel Core i5',
        ram: item.ram || '16 GB',
        storage: item.storage || '512 GB SSD',
        os: item.os || 'Windows 11 Pro',
        monitor: item.monitor || 'Monitor 24 inch',
        keyboard: item.keyboard || 'USB Keyboard',
        mouse: item.mouse || 'USB Mouse',
        procurementYear: Number(item.procurementYear) || 2024,
        fundingSource: item.fundingSource || 'BOS Reguler',
        procurementPrice: Number(item.procurementPrice) || 10000000,
        labId: item.labId || laboratories[0]?.id || 'lab-komputer',
        labName: item.labName || laboratories[0]?.name || 'Laboratorium Komputer',
        lastCheckDate: item.lastCheckDate || new Date().toISOString().split('T')[0],
        condition: item.condition || 'Baik',
        notes: item.notes || '',
        qrCodeData: `SMKN15-${item.computerCode || id}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newItems.push(fullItem);
      count++;
    }

    setComputers((prev) => [...prev, ...newItems]);
    for (const pc of newItems) {
      try {
        await setDoc(doc(db, 'computers', pc.id), pc);
      } catch {
        // continue
      }
    }
    addToast('success', 'Import Berhasil', `${count} unit komputer berhasil diimpor ke sistem.`);
    logActivity('IMPORT_EXCEL_PC', 'Inventaris Komputer', `Impor massal ${count} komputer dari Excel`);
    return count;
  };

  // CRUD: Equipment
  const saveEquipment = async (eq: Equipment) => {
    const id = eq.id || 'eq-' + Date.now();
    const payload = { ...eq, id, updatedAt: new Date().toISOString() };
    setEquipment((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });

    try {
      await setDoc(doc(db, 'equipment', id), payload);
      addToast('success', 'Perangkat Disimpan', `${eq.name} (${eq.category}) berhasil disimpan`);
      logActivity('SAVE_EQUIPMENT', 'Perangkat Pendukung', `Menyimpan perangkat: ${eq.name}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `equipment/${id}`);
    }
  };

  const deleteEquipment = async (id: string) => {
    const target = equipment.find((e) => e.id === id);
    setEquipment((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'equipment', id));
      addToast('success', 'Perangkat Dihapus', `Perangkat pendukung berhasil dihapus`);
      logActivity('DELETE_EQUIPMENT', 'Perangkat Pendukung', `Menghapus perangkat: ${target?.name || id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `equipment/${id}`);
    }
  };

  const batchImportEquipment = async (eqs: Partial<Equipment>[]): Promise<number> => {
    let count = 0;
    const newItems: Equipment[] = [];
    for (const item of eqs) {
      if (!item.name) continue;
      const id = item.id || 'eq-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const fullItem: Equipment = {
        id,
        inventoryNumber: item.inventoryNumber || `SMKN15/EQ/${Date.now()}/${count + 1}`,
        name: item.name,
        category: item.category || 'Lainnya',
        brand: item.brand || '-',
        model: item.model || '-',
        serialNumber: item.serialNumber || '',
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'Unit',
        procurementYear: Number(item.procurementYear) || 2024,
        fundingSource: item.fundingSource || 'BOS Reguler',
        procurementPrice: Number(item.procurementPrice) || 0,
        labId: item.labId || laboratories[0]?.id || 'lab-komputer',
        labName: item.labName || laboratories[0]?.name || 'Laboratorium Komputer',
        condition: item.condition || 'Baik',
        notes: item.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newItems.push(fullItem);
      count++;
    }

    setEquipment((prev) => [...prev, ...newItems]);
    for (const item of newItems) {
      try {
        await setDoc(doc(db, 'equipment', item.id), item);
      } catch {
        // continue
      }
    }
    addToast('success', 'Import Berhasil', `${count} perangkat pendukung berhasil diimpor.`);
    logActivity('IMPORT_EXCEL_EQ', 'Perangkat Pendukung', `Impor massal ${count} perangkat dari Excel`);
    return count;
  };

  // CRUD: Schedules
  const saveSchedule = async (schedule: Schedule): Promise<{ success: boolean; error?: string }> => {
    const overlapCheck = findScheduleOverlap(schedule, schedules);

    if (!overlapCheck.validTimeRange) {
      const errMsg = 'Rentang jam tidak valid! Jam selesai harus lebih besar dari jam mulai.';
      addToast('error', 'Waktu Jadwal Tidak Valid', errMsg);
      return { success: false, error: errMsg };
    }

    if (overlapCheck.conflict) {
      const clash = overlapCheck.conflict;
      const errMsg = `Bentrok Jadwal! Ruangan ${clash.labName} sudah digunakan oleh ${clash.teacherName} (${clash.subject} - ${clash.classGrade}) pada pukul ${clash.startTime} - ${clash.endTime}.`;
      addToast('error', 'Jadwal Bentrok', errMsg);
      return { success: false, error: errMsg };
    }

    const id = schedule.id || 'sch-' + Date.now();
    const payload = { ...schedule, id, updatedAt: new Date().toISOString() };

    setSchedules((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });

    try {
      await setDoc(doc(db, 'schedules', id), payload);
      addToast('success', 'Jadwal Disimpan', `Jadwal praktikum ${schedule.subject} (${schedule.classGrade}) tersimpan.`);
      logActivity('SAVE_SCHEDULE', 'Jadwal Laboratorium', `Menyimpan jadwal: ${schedule.subject} - ${schedule.classGrade}`);
      return { success: true };
    } catch (err: any) {
      const errMsg = err?.message || 'Gagal menyimpan jadwal ke database.';
      addToast('error', 'Gagal Menyimpan Jadwal', errMsg);
      return { success: false, error: errMsg };
    }
  };

  const deleteSchedule = async (id: string) => {
    const target = schedules.find((s) => s.id === id);
    setSchedules((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'schedules', id));
      addToast('success', 'Jadwal Dihapus', `Jadwal penggunaan lab berhasil dihapus`);
      logActivity('DELETE_SCHEDULE', 'Jadwal Laboratorium', `Menghapus jadwal: ${target?.subject || id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `schedules/${id}`);
    }
  };

  // CRUD: Borrowings
  const saveBorrowing = async (item: Borrowing) => {
    const id = item.id || 'bor-' + Date.now();
    const payload = { ...item, id, updatedAt: new Date().toISOString() };
    setBorrowings((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });

    try {
      await setDoc(doc(db, 'borrowings', id), payload);
      addToast('success', 'Transaksi Disimpan', `Transaksi peminjaman ${item.transactionNumber} berhasil dicatat.`);
      logActivity('SAVE_BORROWING', 'Peminjaman Barang', `Peminjaman ${item.itemName} oleh ${item.borrowerName}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `borrowings/${id}`);
    }
  };

  const deleteBorrowing = async (id: string) => {
    setBorrowings((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'borrowings', id));
      addToast('success', 'Data Dihapus', 'Data peminjaman berhasil dihapus');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `borrowings/${id}`);
    }
  };

  // CRUD: Maintenance
  const saveMaintenance = async (item: Maintenance) => {
    const id = item.id || 'mnt-' + Date.now();
    const payload = { ...item, id, updatedAt: new Date().toISOString() };
    setMaintenanceList((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });

    try {
      await setDoc(doc(db, 'maintenance', id), payload);
      addToast('success', 'Pemeliharaan Disimpan', `Work Order ${item.workOrderNumber} (${item.deviceName}) tersimpan.`);
      logActivity('SAVE_MAINTENANCE', 'Pemeliharaan & Perbaikan', `Pekerjaan perbaikan: ${item.deviceName}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `maintenance/${id}`);
    }
  };

  const deleteMaintenance = async (id: string) => {
    setMaintenanceList((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'maintenance', id));
      addToast('success', 'Data Dihapus', 'Catatan pemeliharaan berhasil dihapus');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `maintenance/${id}`);
    }
  };

  // CRUD: Damage Reports
  const saveDamageReport = async (item: DamageReport) => {
    const id = item.id || 'dmg-' + Date.now();
    const payload = { ...item, id, updatedAt: new Date().toISOString() };
    setDamageReports((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });

    try {
      await setDoc(doc(db, 'damage_reports', id), payload);
      addToast('success', 'Laporan Kerusakan Terkirim', `Laporan kerusakan ${item.deviceName} berhasil direkam.`);
      logActivity('SAVE_DAMAGE', 'Laporan Kerusakan', `Laporan kerusakan ${item.deviceName} oleh ${item.reporterName}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `damage_reports/${id}`);
    }
  };

  const deleteDamageReport = async (id: string) => {
    setDamageReports((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'damage_reports', id));
      addToast('success', 'Laporan Dihapus', 'Data laporan kerusakan berhasil dihapus');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `damage_reports/${id}`);
    }
  };

  // CRUD: Lab Users
  const saveLabUser = async (item: LabUser) => {
    const id = item.id || 'usr-' + Date.now();
    const payload = { ...item, id, updatedAt: new Date().toISOString() };
    setUsersLab((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });

    try {
      await setDoc(doc(db, 'users_lab', id), payload);
      addToast('success', 'Pengguna Disimpan', `${item.name} (${item.category}) tersimpan.`);
      logActivity('SAVE_USER_LAB', 'Pengguna Laboratorium', `Menyimpan data pengguna lab: ${item.name}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users_lab/${id}`);
    }
  };

  const deleteLabUser = async (id: string) => {
    setUsersLab((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'users_lab', id));
      addToast('success', 'Pengguna Dihapus', 'Data pengguna lab berhasil dihapus');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users_lab/${id}`);
    }
  };

  // CRUD: Activities
  const saveActivity = async (item: Activity) => {
    const id = item.id || 'act-' + Date.now();
    const payload = { ...item, id, updatedAt: new Date().toISOString() };
    setActivities((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });

    try {
      await setDoc(doc(db, 'activities', id), payload);
      addToast('success', 'Kegiatan Disimpan', `Dokumentasi ${item.title} berhasil disimpan`);
      logActivity('SAVE_ACTIVITY', 'Dokumentasi Kegiatan', `Menyimpan dokumentasi kegiatan: ${item.title}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `activities/${id}`);
    }
  };

  const deleteActivity = async (id: string) => {
    setActivities((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'activities', id));
      addToast('success', 'Dokumentasi Dihapus', 'Dokumentasi kegiatan berhasil dihapus');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `activities/${id}`);
    }
  };

  // CRUD: Documents & SOPs
  const saveDocument = async (item: LabDocument) => {
    const id = item.id || 'doc-' + Date.now();
    const payload = { ...item, id, updatedAt: new Date().toISOString() };
    setDocuments((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });

    try {
      await setDoc(doc(db, 'documents', id), payload);
      addToast('success', 'Dokumen Disimpan', `Dokumen SOP/Administrasi "${item.title}" berhasil disimpan.`);
      logActivity('SAVE_DOCUMENT', 'Administrasi Laboratorium', `Menyimpan dokumen: ${item.title}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `documents/${id}`);
    }
  };

  const deleteDocument = async (id: string) => {
    setDocuments((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'documents', id));
      addToast('success', 'Dokumen Dihapus', 'Dokumen administrasi berhasil dihapus');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `documents/${id}`);
    }
  };

  // CRUD: Guests
  const saveGuest = async (item: Guest) => {
    const id = item.id || 'gst-' + Date.now();
    const payload = { ...item, id, createdAt: new Date().toISOString() };
    setGuests((prev) => [payload, ...prev]);

    try {
      await setDoc(doc(db, 'guests', id), payload);
      addToast('success', 'Buku Tamu Terisi', `Terima kasih ${item.visitorName}, kunjungan Anda telah tercatat.`);
      logActivity('ADD_GUEST', 'Buku Tamu', `Kunjungan tamu: ${item.visitorName} ke ${item.labRoom}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `guests/${id}`);
    }
  };

  const deleteGuest = async (id: string) => {
    setGuests((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'guests', id));
      addToast('success', 'Data Dihapus', 'Catatan kunjungan berhasil dihapus');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `guests/${id}`);
    }
  };

  // Settings
  const saveSettings = async (newSettings: AppSetting) => {
    const payload = { ...newSettings, updatedAt: new Date().toISOString() };
    setSettings(payload);
    try {
      await setDoc(doc(db, 'settings', 'general'), payload);
      addToast('success', 'Pengaturan Disimpan', 'Identitas sekolah dan kop laporan berhasil diperbarui.');
      logActivity('UPDATE_SETTINGS', 'Pengaturan Sistem', 'Memperbarui identitas sekolah dan tanda tangan kop');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/general');
    }
  };

  // ==========================================
  // CRUD: ABSENSI KELAS MODULE
  // ==========================================
  const saveSchoolClass = async (cls: SchoolClass) => {
    const payload = { ...cls, updatedAt: new Date().toISOString() };
    setSchoolClasses((prev) => {
      const idx = prev.findIndex((c) => c.id === cls.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });
    try {
      await setDoc(doc(db, 'classes', cls.id), payload, { merge: true });
      addToast('success', 'Data Kelas Disimpan', `Wali kelas & info ${cls.name} diperbarui.`);
      logActivity('SAVE_CLASS', 'Absensi Kelas', `Memperbarui data kelas ${cls.name}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `classes/${cls.id}`);
    }
  };

  const saveStudent = async (student: Student): Promise<{ success: boolean; error?: string }> => {
    const id = student.id || student.studentId || `std-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nisClean = (student.nis || '').trim();
    const cleanFullName = (student.fullName || student.name || '').trim();

    if (!nisClean || !cleanFullName) {
      const msg = 'NIS dan Nama Lengkap siswa wajib diisi.';
      addToast('error', 'Data Tidak Lengkap', msg);
      return { success: false, error: msg };
    }

    // Cegah NIS ganda terdaftar dua kali
    const duplicateNis = students.find(
      (s) => s.nis.trim().toLowerCase() === nisClean.toLowerCase() && s.id !== id
    );
    if (duplicateNis) {
      const msg = `NIS ${nisClean} sudah terdaftar atas nama ${duplicateNis.fullName} (${duplicateNis.className}).`;
      addToast('error', 'NIS Duplikat Ditolak', msg);
      return { success: false, error: msg };
    }

    const cls =
      schoolClasses.find((c) => c.id === student.classId) ||
      schoolClasses.find((c) => c.gradeLevel === student.grade && c.major === student.majorCode) ||
      schoolClasses.find((c) => c.name.toLowerCase() === (student.className || '').toLowerCase()) ||
      FIXED_SCHOOL_CLASSES.find((c) => c.id === student.classId) ||
      FIXED_SCHOOL_CLASSES[0];

    const resolvedGender: 'L' | 'P' =
      student.gender === 'P' || String(student.gender || '').toLowerCase() === 'perempuan'
        ? 'P'
        : 'L';

    const payload: Student = {
      id,
      studentId: id,
      nis: nisClean,
      nisn: (student.nisn || '').trim(),
      fullName: cleanFullName,
      name: cleanFullName,
      gender: resolvedGender,
      classId: cls?.id || student.classId || 'x-akl',
      className: cls?.name || student.className || 'X AKL',
      grade: cls?.gradeLevel || student.grade || 'X',
      major: cls?.majorFullName || student.major || 'Akuntansi dan Keuangan Lembaga',
      majorCode: cls?.major || student.majorCode || 'AKL',
      academicYear: student.academicYear || attendanceSettings.activeAcademicYear || '2026/2027',
      homeroomTeacher: (student.homeroomTeacher ?? cls?.homeroomTeacherName ?? '').trim(),
      address: (student.address || '').trim(),
      parentPhone: (student.parentPhone || '').trim(),
      status: student.status === 'Tidak Aktif' ? 'Tidak Aktif' : 'Aktif',
      createdAt: student.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const previousStudents = students;
    const existingBefore = students.find((s) => s.id === id);
    setStudents((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next.sort((a, b) => a.fullName.localeCompare(b.fullName));
      }
      return [...prev, payload].sort((a, b) => a.fullName.localeCompare(b.fullName));
    });

    try {
      await setDoc(doc(db, 'students', id), payload, { merge: true });
      addToast(
        'success',
        existingBefore ? 'Data Siswa Diperbarui' : 'Siswa Berhasil Ditambahkan',
        `${payload.fullName} (NIS: ${payload.nis}) tersimpan di kelas ${payload.className}.`
      );
      logActivity(
        existingBefore ? 'UPDATE_STUDENT' : 'CREATE_STUDENT',
        'Manajemen Data Siswa',
        `${existingBefore ? 'Memperbarui' : 'Menambahkan'} siswa ${payload.fullName} (${payload.nis}) - ${payload.className}`
      );
      return { success: true };
    } catch (err: any) {
      setStudents(previousStudents);
      const rawMsg = err?.message || 'Gagal menyimpan data siswa ke Firebase Firestore.';
      const isPermErr = rawMsg.toLowerCase().includes('permission') || err?.code === 'permission-denied';
      const friendlyMsg = isPermErr
        ? `Akses ditolak Firestore saat menyimpan data siswa (${rawMsg}). Pastikan akun login aktif dan memiliki peran Administrator atau izin Kelola Data Siswa.`
        : rawMsg;
      addToast('error', 'Gagal Menyimpan Siswa', friendlyMsg);
      handleFirestoreError(err, OperationType.WRITE, `students/${id}`);
      return { success: false, error: friendlyMsg };
    }
  };

  const deleteStudent = async (id: string) => {
    const previousStudents = students;
    const target = students.find((s) => s.id === id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteDoc(doc(db, 'students', id));
      addToast('success', 'Siswa Dihapus', `Data ${target?.fullName || id} telah dihapus dari Cloud Firestore.`);
      logActivity('DELETE_STUDENT', 'Manajemen Data Siswa', `Menghapus siswa: ${target?.fullName || id}`);
    } catch (err: any) {
      setStudents(previousStudents);
      const rawMsg = err?.message || 'Terjadi kesalahan saat menghapus data dari Firestore.';
      addToast('error', 'Gagal Menghapus Siswa', rawMsg);
      handleFirestoreError(err, OperationType.DELETE, `students/${id}`);
    }
  };

  const batchImportStudents = async (items: Partial<Student>[]): Promise<number> => {
    let skippedDup = 0;
    const candidates: Student[] = [];
    const seenNis = new Set(students.map((s) => s.nis.trim().toLowerCase()));

    for (const item of items) {
      const rawName = (item.fullName || item.name || '').trim();
      const rawNis = String(item.nis || '').trim();
      if (!rawName || !rawNis) continue;

      if (seenNis.has(rawNis.toLowerCase())) {
        skippedDup++;
        continue;
      }
      seenNis.add(rawNis.toLowerCase());

      const cls =
        schoolClasses.find(
          (c) =>
            c.id === item.classId ||
            c.name.toLowerCase() === (item.className || '').toLowerCase() ||
            (c.gradeLevel === item.grade && c.major === item.majorCode)
        ) || schoolClasses[0] || FIXED_SCHOOL_CLASSES[0];
      const id = item.id || 'std-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
      const st: Student = {
        id,
        studentId: id,
        nis: rawNis,
        nisn: String(item.nisn || '').trim(),
        fullName: rawName,
        name: rawName,
        gender: item.gender === 'P' || String(item.gender || '').toLowerCase() === 'perempuan' ? 'P' : 'L',
        classId: cls.id,
        className: cls.name,
        grade: cls.gradeLevel,
        major: item.major || cls.majorFullName,
        majorCode: cls.major,
        academicYear: item.academicYear || attendanceSettings.activeAcademicYear || '2026/2027',
        homeroomTeacher: item.homeroomTeacher || cls.homeroomTeacherName,
        address: item.address ? String(item.address).trim() : '',
        status: item.status === 'Tidak Aktif' ? 'Tidak Aktif' : 'Aktif',
        parentPhone: item.parentPhone ? String(item.parentPhone).trim() : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      candidates.push(st);
    }

    const persisted: Student[] = [];
    let lastError: any = null;
    for (const st of candidates) {
      try {
        await setDoc(doc(db, 'students', st.id), st);
        persisted.push(st);
      } catch (err: any) {
        lastError = err;
      }
    }

    if (persisted.length > 0) {
      setStudents((prev) => [...prev, ...persisted].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      addToast(
        'success',
        'Import Siswa Berhasil',
        `${persisted.length} data siswa berhasil disimpan ke Cloud Firestore${skippedDup > 0 ? ` (${skippedDup} NIS duplikat dilewati)` : ''}${candidates.length > persisted.length ? `, ${candidates.length - persisted.length} gagal` : ''}.`
      );
      logActivity('IMPORT_STUDENTS', 'Manajemen Data Siswa', `Import Excel ${persisted.length} data siswa`);
    } else if (lastError) {
      addToast('error', 'Gagal Import Siswa ke Firestore', lastError?.message || 'Periksa izin akses database.');
      handleFirestoreError(lastError, OperationType.WRITE, 'students');
    } else if (skippedDup > 0) {
      addToast('warning', 'Semua NIS Sudah Terdaftar', `${skippedDup} baris dilewati karena NIS sudah ada.`);
    }
    return persisted.length;
  };

  const moveStudentsClass = async (studentIds: string[], targetClassId: string) => {
    const targetCls = schoolClasses.find((c) => c.id === targetClassId);
    if (!targetCls || studentIds.length === 0) return;
    const now = new Date().toISOString();

    const movedIds: string[] = [];
    let lastErr: any = null;
    for (const sid of studentIds) {
      const existingSt = students.find((s) => s.id === sid);
      if (existingSt) {
        try {
          await setDoc(
            doc(db, 'students', sid),
            {
              ...existingSt,
              classId: targetCls.id,
              className: targetCls.name,
              grade: targetCls.gradeLevel,
              major: targetCls.majorFullName,
              majorCode: targetCls.major,
              homeroomTeacher: targetCls.homeroomTeacherName,
              updatedAt: now,
            },
            { merge: true }
          );
          movedIds.push(sid);
        } catch (err: any) {
          lastErr = err;
        }
      }
    }

    if (movedIds.length > 0) {
      setStudents((prev) =>
        prev.map((s) =>
          movedIds.includes(s.id)
            ? {
                ...s,
                classId: targetCls.id,
                className: targetCls.name,
                grade: targetCls.gradeLevel,
                major: targetCls.majorFullName,
                majorCode: targetCls.major,
                homeroomTeacher: targetCls.homeroomTeacherName,
                updatedAt: now,
              }
            : s
        )
      );
      addToast(
        'success',
        'Pindah Kelas Berhasil',
        `${movedIds.length} siswa dipindahkan ke kelas ${targetCls.name}. Riwayat absensi sebelumnya tetap tersimpan.`
      );
      logActivity('MOVE_STUDENTS_CLASS', 'Manajemen Data Siswa', `Memindahkan ${movedIds.length} siswa ke ${targetCls.name}`);
    }

    if (lastErr) {
      addToast('error', 'Gagal Memindahkan Kelas', lastErr?.message || 'Periksa izin database Firestore.');
      handleFirestoreError(lastErr, OperationType.WRITE, 'students');
    }
  };

  const saveClassAttendanceBatch = async (
    entries: {
      student: Student;
      status: AttendanceStatusCode;
      description: string;
    }[],
    meta: {
      date: string;
      session: string;
      academicYear: string;
      semester: '1' | '2';
      classObj: SchoolClass;
    }
  ): Promise<{ saved: number; updated: number; created: number }> => {
    const now = new Date().toISOString();
    const officerName = userProfile?.displayName || 'Petugas Absensi';
    const officerRole = activeRoleObject?.name || currentRole;
    const officerUid = currentUser?.uid || userProfile?.uid || 'system';

    let created = 0;
    let updated = 0;
    const upsertedRecords: ClassAttendanceRecord[] = [];
    const newLogs: AttendanceLog[] = [];

    for (const entry of entries) {
      const docId = buildAttendanceDocId(meta.date, meta.session, entry.student.id);
      const existing = classAttendances.find(
        (r) =>
          r.id === docId ||
          (r.studentId === entry.student.id && r.date === meta.date && (r.session || 'Harian') === (meta.session || 'Harian'))
      );

      if (existing) {
        updated++;
      } else {
        created++;
      }

      const record: ClassAttendanceRecord = {
        id: existing?.id || docId,
        studentId: entry.student.id,
        studentName: entry.student.fullName,
        nis: entry.student.nis,
        classId: meta.classObj.id,
        className: meta.classObj.name,
        date: meta.date,
        session: meta.session || 'Harian',
        academicYear: meta.academicYear,
        semester: meta.semester,
        status: entry.status,
        description: entry.description || '',
        recordedBy: officerName,
        recordedByUid: officerUid,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      upsertedRecords.push(record);

      // Write audit log whenever new or status/description changed
      if (!existing || existing.status !== entry.status || (existing.description || '') !== (entry.description || '')) {
        newLogs.push({
          id: `attlog-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          attendanceId: record.id,
          studentId: entry.student.id,
          studentName: entry.student.fullName,
          classId: meta.classObj.id,
          className: meta.classObj.name,
          date: meta.date,
          session: meta.session || 'Harian',
          action: existing ? 'UPDATE' : 'CREATE',
          previousStatus: existing?.status,
          newStatus: entry.status,
          previousDescription: existing?.description,
          newDescription: entry.description || '',
          officerName,
          officerRole,
          timestamp: now,
        });
      }
    }

    setClassAttendances((prev) => {
      const map = new Map<string, ClassAttendanceRecord>();
      for (const r of prev) map.set(r.id, r);
      for (const r of upsertedRecords) map.set(r.id, r);
      return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    });

    if (newLogs.length > 0) {
      setAttendanceLogs((prev) => [...newLogs, ...prev]);
    }

    for (const r of upsertedRecords) {
      try {
        await setDoc(doc(db, 'attendance', r.id), r);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `attendance/${r.id}`);
      }
    }

    for (const lg of newLogs) {
      try {
        await setDoc(doc(db, 'attendance_logs', lg.id), lg);
      } catch {
        // non-fatal log error
      }
    }

    addToast(
      'success',
      'Absensi Berhasil Disimpan',
      `Kelas ${meta.classObj.name} (${meta.date}): ${created} data baru, ${updated} diperbarui.`
    );
    logActivity(
      'SAVE_CLASS_ATTENDANCE',
      'Absensi Kelas',
      `Simpan absensi ${meta.classObj.name} tanggal ${meta.date} (${meta.session}) oleh ${officerName}`
    );

    return { saved: upsertedRecords.length, updated, created };
  };

  const deleteClassAttendance = async (record: ClassAttendanceRecord) => {
    const now = new Date().toISOString();
    const lg: AttendanceLog = {
      id: `attlog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      attendanceId: record.id,
      studentId: record.studentId,
      studentName: record.studentName,
      classId: record.classId,
      className: record.className,
      date: record.date,
      session: record.session,
      action: 'DELETE',
      previousStatus: record.status,
      previousDescription: record.description,
      officerName: userProfile?.displayName || 'Petugas Absensi',
      officerRole: activeRoleObject?.name || currentRole,
      timestamp: now,
    };

    setClassAttendances((prev) => prev.filter((r) => r.id !== record.id));
    setAttendanceLogs((prev) => [lg, ...prev]);

    try {
      await deleteDoc(doc(db, 'attendance', record.id));
      await setDoc(doc(db, 'attendance_logs', lg.id), lg).catch(() => {});
      addToast('success', 'Catatan Absensi Dihapus', `Absensi ${record.studentName} tanggal ${record.date} dihapus.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `attendance/${record.id}`);
    }
  };

  const saveAcademicYear = async (item: AcademicYearConfig) => {
    const id = item.id || 'ay-' + item.year.replace(/[^0-9]+/g, '-');
    const payload = { ...item, id, updatedAt: new Date().toISOString() };
    setAcademicYears((prev) => {
      const list = payload.isActive ? prev.map((x) => ({ ...x, isActive: false })) : [...prev];
      const idx = list.findIndex((x) => x.id === id);
      if (idx >= 0) {
        list[idx] = payload;
        return list;
      }
      return [payload, ...list];
    });
    try {
      await setDoc(doc(db, 'academic_years', id), payload);
      addToast('success', 'Tahun Pelajaran Disimpan', `Tahun pelajaran ${item.year} tersimpan.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `academic_years/${id}`);
    }
  };

  const deleteAcademicYear = async (id: string) => {
    setAcademicYears((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'academic_years', id));
      addToast('success', 'Tahun Pelajaran Dihapus', 'Data tahun pelajaran telah dihapus.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `academic_years/${id}`);
    }
  };

  const saveCalendarEvent = async (item: SchoolCalendarEvent) => {
    const id = item.id || 'cal-' + Date.now();
    const payload: SchoolCalendarEvent = {
      ...item,
      id,
      createdAt: item.createdAt || new Date().toISOString(),
    };
    setSchoolCalendar((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next.sort((a, b) => a.date.localeCompare(b.date));
      }
      return [...prev, payload].sort((a, b) => a.date.localeCompare(b.date));
    });
    try {
      await setDoc(doc(db, 'school_calendar', id), payload);
      addToast('success', 'Kalender Sekolah Disimpan', `${item.title} (${item.date}) disimpan.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `school_calendar/${id}`);
    }
  };

  const deleteCalendarEvent = async (id: string) => {
    setSchoolCalendar((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteDoc(doc(db, 'school_calendar', id));
      addToast('success', 'Agenda Dihapus', 'Agenda kalender/hari libur dihapus.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `school_calendar/${id}`);
    }
  };

  const saveAttendanceSettings = async (item: AttendanceSettings) => {
    const payload = { ...item, id: 'default', updatedAt: new Date().toISOString() };
    setAttendanceSettings(payload);
    try {
      await setDoc(doc(db, 'attendance_settings', 'default'), payload);
      addToast('success', 'Pengaturan Absensi Disimpan', 'Konfigurasi hari efektif, semester aktif, dan kop laporan diperbarui.');
      logActivity('UPDATE_ATTENDANCE_SETTINGS', 'Pengaturan Absensi', `Memperbarui pengaturan absensi TP ${item.activeAcademicYear}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'attendance_settings/default');
    }
  };

  // ==========================================
  // CRUD: GALERI LABORATORIUM
  // ==========================================
  const uploadGalleryFileToStorage = async (
    imageId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ imageUrl: string; storagePath: string; usedFallback: boolean }> => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `galleryImages/${imageId}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    try {
      const downloadUrl = await new Promise<string>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type || 'image/jpeg',
        });

        // Timeout guard if Firebase Storage bucket or CORS is unavailable
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            try {
              uploadTask.cancel();
            } catch {
              // ignore cancel error
            }
            reject(new Error('storage/timeout'));
          }
        }, 12000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0 && onProgress) {
              const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 90);
              onProgress(pct);
            }
          },
          (error) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              reject(error);
            }
          },
          async () => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              try {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                if (onProgress) onProgress(95);
                resolve(url);
              } catch (urlErr) {
                reject(urlErr);
              }
            }
          }
        );
      });

      return { imageUrl: downloadUrl, storagePath, usedFallback: false };
    } catch (storageErr: any) {
      console.warn('Firebase Storage fallback activated:', storageErr?.code || storageErr?.message);
      if (onProgress) onProgress(60);
      // Graceful fallback: compress image safely (< 350KB) for online Firestore sync if Storage bucket rules are not yet enabled
      const compressedDataUrl = await compressImageFileToDataUrl(file, 1100, 0.78);
      if (onProgress) onProgress(92);
      return {
        imageUrl: compressedDataUrl,
        storagePath: `firestore-inline/${imageId}_${safeName}`,
        usedFallback: true,
      };
    }
  };

  const safeDeleteStorageObject = async (targetPath: string, excludeImageId?: string) => {
    if (!targetPath || !targetPath.startsWith('galleryImages/')) return;
    // Consistency check: ensure no other document references the same storagePath
    const stillInUse = galleryImages.some(
      (img) => img.id !== excludeImageId && img.storagePath === targetPath
    );
    if (stillInUse) return;
    try {
      await deleteObject(ref(storage, targetPath));
    } catch (err: any) {
      if (err?.code !== 'storage/object-not-found') {
        console.warn('Storage delete warning:', err?.message || err);
      }
    }
  };

  const saveGalleryImage = async (
    data: Partial<GalleryImage>,
    file?: File | null,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanTitle = (data.title || '').trim();
    const cleanCategory = (data.category || '').trim();
    if (!cleanTitle || !cleanCategory) {
      const msg = 'Judul dan kategori gambar wajib diisi.';
      addToast('error', 'Data Belum Lengkap', msg);
      return { success: false, error: msg };
    }

    const imageId = data.imageId || data.id || `img-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const existingItem = galleryImages.find((g) => g.id === imageId);
    const oldStoragePath = existingItem?.storagePath || data.storagePath || '';

    let finalImageUrl = data.imageUrl || '';
    let finalStoragePath = data.storagePath || '';
    let usedFallback = false;

    try {
      if (file) {
        if (onProgress) onProgress(5);
        const uploaded = await uploadGalleryFileToStorage(imageId, file, onProgress);
        finalImageUrl = uploaded.imageUrl;
        finalStoragePath = uploaded.storagePath;
        usedFallback = uploaded.usedFallback;
      }

      if (!finalImageUrl) {
        const msg = 'File gambar wajib dipilih sebelum disimpan.';
        addToast('error', 'Gambar Kosong', msg);
        return { success: false, error: msg };
      }

      const now = new Date().toISOString();
      const payload: GalleryImage = {
        id: imageId,
        imageId,
        title: cleanTitle,
        category: cleanCategory,
        description: (data.description || '').trim(),
        notes: (data.notes || '').trim(),
        imageUrl: finalImageUrl,
        storagePath: finalStoragePath || `firestore-inline/${imageId}`,
        uploadDate: data.uploadDate || now.split('T')[0],
        createdAt: existingItem?.createdAt || data.createdAt || now,
        updatedAt: now,
        uploadedBy: existingItem?.uploadedBy || userProfile?.displayName || 'Administrator',
        status: data.status === 'Arsip' ? 'Arsip' : 'Aktif',
      };

      const previousGallery = galleryImages;
      setGalleryImages((prev) => {
        const idx = prev.findIndex((x) => x.id === imageId);
        const next = idx >= 0 ? prev.map((x, i) => (i === idx ? payload : x)) : [payload, ...prev];
        return next.sort((a, b) => (b.uploadDate || '').localeCompare(a.uploadDate || ''));
      });

      try {
        await setDoc(doc(db, 'galleryImages', imageId), payload, { merge: true });
        if (onProgress) onProgress(100);
      } catch (fsErr: any) {
        setGalleryImages(previousGallery);
        // Rollback newly uploaded storage file if Firestore metadata write failed
        if (file && finalStoragePath.startsWith('galleryImages/') && finalStoragePath !== oldStoragePath) {
          await safeDeleteStorageObject(finalStoragePath, imageId);
        }
        const errMsg = fsErr?.message || 'Gagal menyimpan metadata gambar ke Cloud Firestore.';
        addToast('error', 'Gagal Menyimpan Gambar', errMsg);
        handleFirestoreError(fsErr, OperationType.WRITE, `galleryImages/${imageId}`);
        return { success: false, error: errMsg };
      }

      // Clean up replaced old storage object after successful Firestore write
      if (file && oldStoragePath && oldStoragePath !== finalStoragePath) {
        await safeDeleteStorageObject(oldStoragePath, imageId);
      }

      addToast(
        usedFallback ? 'warning' : 'success',
        existingItem ? 'Gambar Diperbarui' : 'Gambar Berhasil Disimpan',
        usedFallback
          ? `"${payload.title}" tersimpan online ke Firestore (mode kompresi karena Firebase Storage belum aktif/terotorisasi).`
          : `"${payload.title}" berhasil diunggah dan tersimpan di Galeri Laboratorium.`
      );
      logActivity(
        existingItem ? 'UPDATE_GALLERY_IMAGE' : 'CREATE_GALLERY_IMAGE',
        'Galeri Laboratorium',
        `${existingItem ? 'Memperbarui' : 'Mengunggah'} gambar "${payload.title}" (${payload.category})`
      );
      return { success: true };
    } catch (err: any) {
      const errMsg = err?.message || 'Terjadi kesalahan saat mengunggah gambar.';
      addToast('error', 'Upload Gagal', errMsg);
      return { success: false, error: errMsg };
    }
  };

  const deleteGalleryImage = async (image: GalleryImage) => {
    const targetId = image.id || image.imageId;
    const previousGallery = galleryImages;
    setGalleryImages((prev) => prev.filter((g) => g.id !== targetId));

    try {
      await deleteDoc(doc(db, 'galleryImages', targetId));
      await safeDeleteStorageObject(image.storagePath, targetId);
      addToast('success', 'Gambar Dihapus', `"${image.title}" telah dihapus dari Galeri Laboratorium.`);
      logActivity('DELETE_GALLERY_IMAGE', 'Galeri Laboratorium', `Menghapus gambar "${image.title}" (${image.category})`);
    } catch (err: any) {
      setGalleryImages(previousGallery);
      addToast('error', 'Gagal Menghapus Gambar', err?.message || 'Terjadi kesalahan saat menghapus gambar.');
      handleFirestoreError(err, OperationType.DELETE, `galleryImages/${targetId}`);
    }
  };

  const saveGalleryCategory = async (
    category: Partial<GalleryCategory>
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanName = (category.name || '').trim();
    if (!cleanName) {
      const msg = 'Nama kategori wajib diisi.';
      addToast('error', 'Kategori Tidak Valid', msg);
      return { success: false, error: msg };
    }

    const id =
      category.id ||
      `cat-${cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}-${Date.now().toString().slice(-4)}`;

    const duplicate = galleryCategories.find(
      (c) => c.name.trim().toLowerCase() === cleanName.toLowerCase() && c.id !== id
    );
    if (duplicate) {
      const msg = `Kategori "${cleanName}" sudah tersedia.`;
      addToast('error', 'Kategori Duplikat', msg);
      return { success: false, error: msg };
    }

    const existingCat = galleryCategories.find((c) => c.id === id);
    const now = new Date().toISOString();
    const payload: GalleryCategory = {
      id,
      name: cleanName,
      description: (category.description || '').trim(),
      order: category.order ?? existingCat?.order ?? galleryCategories.length + 1,
      createdAt: existingCat?.createdAt || category.createdAt || now,
      updatedAt: now,
    };

    const previousCats = galleryCategories;
    setGalleryCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      const next = idx >= 0 ? prev.map((c, i) => (i === idx ? payload : c)) : [...prev, payload];
      return next.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    try {
      await setDoc(doc(db, 'galleryCategories', id), payload, { merge: true });
      addToast('success', 'Kategori Disimpan', `Kategori "${payload.name}" berhasil disimpan.`);
      logActivity(
        existingCat ? 'UPDATE_GALLERY_CATEGORY' : 'CREATE_GALLERY_CATEGORY',
        'Galeri Laboratorium',
        `${existingCat ? 'Memperbarui' : 'Menambahkan'} kategori: ${payload.name}`
      );
      return { success: true };
    } catch (err: any) {
      setGalleryCategories(previousCats);
      const errMsg = err?.message || 'Gagal menyimpan kategori ke Firestore.';
      addToast('error', 'Gagal Menyimpan Kategori', errMsg);
      handleFirestoreError(err, OperationType.WRITE, `galleryCategories/${id}`);
      return { success: false, error: errMsg };
    }
  };

  const deleteGalleryCategory = async (id: string) => {
    const target = galleryCategories.find((c) => c.id === id);
    const previousCats = galleryCategories;
    setGalleryCategories((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteDoc(doc(db, 'galleryCategories', id));
      addToast('success', 'Kategori Dihapus', `Kategori "${target?.name || id}" telah dihapus.`);
      logActivity('DELETE_GALLERY_CATEGORY', 'Galeri Laboratorium', `Menghapus kategori: ${target?.name || id}`);
    } catch (err: any) {
      setGalleryCategories(previousCats);
      addToast('error', 'Gagal Menghapus Kategori', err?.message || 'Gagal menghapus kategori.');
      handleFirestoreError(err, OperationType.DELETE, `galleryCategories/${id}`);
    }
  };

  // =========================================================================
  // CRUD & ATOMIC TRANSACTIONS: RIWAYAT PENGGUNAAN KOMPUTER
  // =========================================================================
  const uploadUsageEvidenceImage = async (
    reportId: string,
    file: File
  ): Promise<string> => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `computerDamageEvidence/${reportId}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    try {
      const downloadUrl = await new Promise<string>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type || 'image/jpeg',
        });
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            try {
              uploadTask.cancel();
            } catch {
              // ignore
            }
            reject(new Error('storage/timeout'));
          }
        }, 12000);
        uploadTask.on(
          'state_changed',
          () => {},
          (err) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              reject(err);
            }
          },
          async () => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              try {
                resolve(await getDownloadURL(uploadTask.snapshot.ref));
              } catch (uErr) {
                reject(uErr);
              }
            }
          }
        );
      });
      return downloadUrl;
    } catch {
      return compressImageFileToDataUrl(file, 1000, 0.76);
    }
  };

  const startComputerUsage = async (params: {
    computerId: string;
    userType: UsageUserType;
    selectedStudents?: {
      student: Student;
      attendanceId?: string;
      attendanceStatus?: AttendanceStatusCode | 'Belum Tercatat';
    }[];
    userId?: string;
    userName?: string;
    externalUserId?: string;
    externalInstitution?: string;
    externalContact?: string;
    companionName?: string;
    subjectOrActivity?: string;
    roomId?: string;
    roomName?: string;
    usageDate?: string;
    startTime?: string;
    purpose: string;
    checklistBefore: ConditionChecklist;
    conditionBeforeNotes?: string;
    notes?: string;
    recordedBy?: string;
  }): Promise<{ success: boolean; usage?: ComputerUsageRecord; error?: string }> => {
    const targetPc = computers.find((c) => c.id === params.computerId);
    if (!targetPc) {
      const msg = 'Komputer tidak ditemukan dalam inventaris.';
      addToast('error', 'Komputer Tidak Valid', msg);
      return { success: false, error: msg };
    }

    // Validasi ketersediaan komputer lokal + pencegahan double-session / PC rusak (termasuk PC-9)
    const availability = isComputerUsableForRole(targetPc, computerUsages, computerDamageReports, currentRole);
    if (!availability.usable) {
      const msg = availability.reason || `${targetPc.computerCode} tidak tersedia.`;
      if (availability.status === 'PERLU PEMERIKSAAN') {
        addToast('warning', 'Perlu Pemeriksaan Teknisi', msg);
      } else if (availability.status === 'SEDANG DIGUNAKAN') {
        addToast('error', 'Komputer Sedang Digunakan', msg);
      } else {
        addToast('error', 'Komputer Tidak Tersedia', msg);
      }
      return { success: false, error: msg };
    }

    const jakarta = getJakartaNow();
    const usageDate = params.usageDate || jakarta.dateStr;
    const startTime = params.startTime || jakarta.timeStr;

    const timeOverlap = findUsageTimeOverlapOnSameDate(
      targetPc.id,
      usageDate,
      startTime,
      undefined,
      computerUsages
    );
    if (timeOverlap) {
      const msg = `Bentrok Waktu PC! ${targetPc.computerCode} sudah tercatat digunakan oleh ${timeOverlap.userName} pada ${timeOverlap.usageDate} (${timeOverlap.startTime}${timeOverlap.endTime ? ` - ${timeOverlap.endTime}` : ' s.d. selesai'}).`;
      addToast('error', 'Bentrok Jadwal Penggunaan PC', msg);
      return { success: false, error: msg };
    }

    const nowIso = jakarta.isoTimestamp;
    const usageId = generateUsageTransactionCode(computerUsages.length);
    const conditionBefore = deriveOverallChecklistCondition(params.checklistBefore);
    const officerName = params.recordedBy || userProfile?.displayName || 'Petugas Lab';
    const officerUid = currentUser?.uid || userProfile?.uid || 'system';

    const roomObj = laboratories.find((l) => l.id === (params.roomId || targetPc.labId)) || laboratories[0];
    const roomId = roomObj?.id || targetPc.labId || 'lab-komputer';
    const roomName = params.roomName || roomObj?.name || targetPc.labName || 'Laboratorium Komputer';

    let primaryUserId = params.userId || '';
    let primaryUserName = (params.userName || '').trim();
    let studentNis: string | undefined;
    let studentNisn: string | undefined;
    let studentClass: string | undefined;
    let attendanceId: string | undefined;
    let attendanceStatus: AttendanceStatusCode | 'Belum Tercatat' | undefined;
    let memberDocs: ComputerUsageMember[] = [];
    let isGroupUsage = false;
    let extUserDoc: ExternalUser | null = null;

    if (params.userType === 'Siswa') {
      const selected = params.selectedStudents || [];
      if (selected.length === 0) {
        const msg = 'Pilih minimal 1 siswa yang akan menggunakan komputer.';
        addToast('error', 'Siswa Belum Dipilih', msg);
        return { success: false, error: msg };
      }
      const primary = selected[0];
      isGroupUsage = selected.length > 1;
      primaryUserId = primary.student.id;
      primaryUserName = isGroupUsage
        ? `${primary.student.fullName} (+${selected.length - 1} anggota)`
        : primary.student.fullName;
      studentNis = primary.student.nis;
      studentNisn = primary.student.nisn;
      studentClass = primary.student.className;
      attendanceId = primary.attendanceId;
      attendanceStatus = primary.attendanceStatus || 'Belum Tercatat';

      memberDocs = selected.map((sel, idx) => ({
        id: `${usageId}-m${idx + 1}`,
        usageId,
        computerId: targetPc.id,
        studentId: sel.student.id,
        studentName: sel.student.fullName,
        studentNis: sel.student.nis,
        studentNisn: sel.student.nisn || '',
        studentClass: sel.student.className,
        attendanceId: sel.attendanceId || '',
        attendanceStatus: sel.attendanceStatus || 'Belum Tercatat',
        roleInGroup: idx === 0 && isGroupUsage ? 'Ketua Kelompok' : 'Anggota',
        createdAt: nowIso,
      }));
    } else if (params.userType === 'Tamu') {
      if (!primaryUserName || !(params.externalInstitution || '').trim()) {
        const msg = 'Nama lengkap dan asal instansi/lembaga tamu wajib diisi.';
        addToast('error', 'Data Tamu Belum Lengkap', msg);
        return { success: false, error: msg };
      }
      const existingExt = externalUsers.find(
        (eu) =>
          (params.externalUserId && eu.id === params.externalUserId) ||
          (eu.fullName.toLowerCase() === primaryUserName.toLowerCase() &&
            eu.institution.toLowerCase() === (params.externalInstitution || '').trim().toLowerCase())
      );
      const extId = existingExt?.id || params.externalUserId || `ext-${Date.now()}-${Math.floor(Math.random() * 100)}`;
      extUserDoc = {
        id: extId,
        fullName: primaryUserName,
        institution: (params.externalInstitution || '').trim(),
        identityOrContact: (params.externalContact || '').trim(),
        totalVisits: (existingExt?.totalVisits || 0) + 1,
        lastVisitDate: usageDate,
        notes: existingExt?.notes || '',
        createdAt: existingExt?.createdAt || nowIso,
        updatedAt: nowIso,
      };
      primaryUserId = extId;
    } else {
      if (!primaryUserName) {
        const msg = `Pilih atau masukkan nama ${params.userType} terlebih dahulu.`;
        addToast('error', 'Pengguna Belum Dipilih', msg);
        return { success: false, error: msg };
      }
      primaryUserId = primaryUserId || `staff-${Date.now()}`;
    }

    const usageDoc: ComputerUsageRecord = {
      id: usageId,
      usageId,
      computerId: targetPc.id,
      computerCode: targetPc.computerCode,
      computerName: targetPc.deviceName,
      inventoryCode: targetPc.inventoryNumber,
      userType: params.userType,
      userId: primaryUserId,
      userName: primaryUserName,
      studentNis: studentNis || '',
      studentNisn: studentNisn || '',
      studentClass: studentClass || '',
      attendanceId: attendanceId || '',
      attendanceStatus: attendanceStatus,
      externalUserId: extUserDoc?.id || '',
      externalInstitution: (params.externalInstitution || '').trim(),
      externalContact: (params.externalContact || '').trim(),
      companionName: (params.companionName || '').trim(),
      subjectOrActivity: (params.subjectOrActivity || '').trim(),
      isGroupUsage,
      memberCount: memberDocs.length || 1,
      roomId,
      roomName,
      usageDate,
      startTime,
      endTime: '',
      durationMinutes: 0,
      duration: 'Sedang Berlangsung',
      purpose: (params.purpose || '').trim(),
      conditionBefore,
      conditionBeforeNotes: (params.conditionBeforeNotes || '').trim(),
      usageStatus: 'Sedang Digunakan',
      recordedBy: officerName,
      recordedByUid: officerUid,
      notes: (params.notes || '').trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const checkDoc: ComputerConditionCheck = {
      id: `chk-bef-${usageId}`,
      usageId,
      computerId: targetPc.id,
      inventoryCode: targetPc.inventoryNumber,
      computerCode: targetPc.computerCode,
      phase: 'Sebelum Penggunaan',
      checklist: params.checklistBefore,
      overallCondition: conditionBefore,
      notes: (params.conditionBeforeNotes || '').trim(),
      checkedBy: officerName,
      checkedAt: nowIso,
    };

    const historyDoc: ComputerStatusHistory = {
      id: `sthist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      computerId: targetPc.id,
      computerCode: targetPc.computerCode,
      previousStatus: availability.status,
      newStatus: 'SEDANG DIGUNAKAN',
      usageId,
      reason: `Check-In penggunaan (${params.userType}: ${primaryUserName})`,
      changedBy: officerName,
      timestamp: nowIso,
    };

    // Transaksi atomik Firestore untuk mencegah dua sesi aktif bersamaan pada PC yang sama
    try {
      await runTransaction(db, async (tx) => {
        const pcRef = doc(db, 'computers', targetPc.id);
        const pcSnap = await tx.get(pcRef);
        if (pcSnap.exists()) {
          const pcData = pcSnap.data() as Computer;
          if (pcData.operationalStatus === 'SEDANG DIGUNAKAN' || pcData.activeUsageId) {
            throw new Error(`KONFLIK_PC: ${targetPc.computerCode} sudah digunakan oleh ${pcData.activeUserName || 'pengguna lain'}.`);
          }
        }
        if (extUserDoc) {
          tx.set(doc(db, 'external_users', extUserDoc.id), extUserDoc, { merge: true });
        }
        tx.set(doc(db, 'computer_usage', usageId), usageDoc);
        for (const m of memberDocs) {
          tx.set(doc(db, 'computer_usage_members', m.id), m);
        }
        tx.set(doc(db, 'computer_condition_checks', checkDoc.id), checkDoc);
        tx.set(doc(db, 'computer_status_history', historyDoc.id), historyDoc);
        tx.set(
          pcRef,
          {
            ...targetPc,
            operationalStatus: 'SEDANG DIGUNAKAN',
            activeUsageId: usageId,
            activeUserName: primaryUserName,
            activeUserType: params.userType,
            updatedAt: nowIso,
          },
          { merge: true }
        );
      });
    } catch (err: any) {
      if (err?.message?.startsWith('KONFLIK_PC:')) {
        const cleanMsg = err.message.replace('KONFLIK_PC:', '').trim();
        addToast('error', 'Bentrok Penggunaan PC', cleanMsg);
        return { success: false, error: cleanMsg };
      }
      // Fallback queued writes when offline so IndexedDB persistentLocalCache syncs upon reconnect
      console.warn('Firestore transaction offline fallback queued:', err?.message);
      const pcPatch = {
        ...targetPc,
        operationalStatus: 'SEDANG DIGUNAKAN' as ComputerOperationalStatus,
        activeUsageId: usageId,
        activeUserName: primaryUserName,
        activeUserType: params.userType,
        updatedAt: nowIso,
      };
      if (extUserDoc) {
        setDoc(doc(db, 'external_users', extUserDoc.id), extUserDoc, { merge: true }).catch(() => {});
      }
      setDoc(doc(db, 'computer_usage', usageId), usageDoc).catch(() => {});
      for (const m of memberDocs) {
        setDoc(doc(db, 'computer_usage_members', m.id), m).catch(() => {});
      }
      setDoc(doc(db, 'computer_condition_checks', checkDoc.id), checkDoc).catch(() => {});
      setDoc(doc(db, 'computer_status_history', historyDoc.id), historyDoc).catch(() => {});
      setDoc(doc(db, 'computers', targetPc.id), pcPatch, { merge: true }).catch(() => {});
    }

    // Sinkronkan state lokal
    setComputerUsages((prev) => [usageDoc, ...prev]);
    if (memberDocs.length > 0) {
      setComputerUsageMembers((prev) => [...memberDocs, ...prev]);
    }
    setComputerConditionChecks((prev) => [checkDoc, ...prev]);
    setComputerStatusHistories((prev) => [historyDoc, ...prev]);
    if (extUserDoc) {
      setExternalUsers((prev) => {
        const idx = prev.findIndex((x) => x.id === extUserDoc!.id);
        if (idx >= 0) return prev.map((x, i) => (i === idx ? extUserDoc! : x));
        return [...prev, extUserDoc!].sort((a, b) => a.fullName.localeCompare(b.fullName));
      });
    }
    setComputers((prev) =>
      prev.map((c) =>
        c.id === targetPc.id
          ? {
              ...c,
              operationalStatus: 'SEDANG DIGUNAKAN',
              activeUsageId: usageId,
              activeUserName: primaryUserName,
              activeUserType: params.userType,
              updatedAt: nowIso,
            }
          : c
      )
    );

    addToast(
      'success',
      `Check-In ${targetPc.computerCode} Berhasil`,
      `${usageId} — ${primaryUserName} (${params.userType}) mulai menggunakan komputer pada ${startTime} WIB.`
    );
    logActivity(
      'CHECKIN_COMPUTER_USAGE',
      'Penggunaan Komputer',
      `Mulai penggunaan ${targetPc.computerCode} oleh ${primaryUserName} (${params.userType}) [${usageId}]`
    );

    return { success: true, usage: usageDoc };
  };

  const finishComputerUsage = async (params: {
    usageId: string;
    endTime?: string;
    checklistAfter: ConditionChecklist;
    conditionAfterNotes?: string;
    hasProblemAfter: boolean;
    notes?: string;
    damagePayload?: {
      damageType: string;
      damageDescription: string;
      severity: DamageSeverity;
      initialAction: string;
      photoFile?: File | null;
    };
  }): Promise<{ success: boolean; usage?: ComputerUsageRecord; damageReport?: ComputerDamageReport; error?: string }> => {
    const existing = computerUsages.find((u) => u.id === params.usageId || u.usageId === params.usageId);
    if (!existing) {
      const msg = 'Data penggunaan aktif tidak ditemukan.';
      addToast('error', 'Transaksi Tidak Ditemukan', msg);
      return { success: false, error: msg };
    }
    if (existing.usageStatus !== 'Sedang Digunakan') {
      const msg = `Transaksi ${existing.usageId} sudah berstatus ${existing.usageStatus}.`;
      addToast('warning', 'Sudah Selesai', msg);
      return { success: false, error: msg };
    }

    const jakarta = getJakartaNow();
    const endTime = params.endTime || jakarta.timeStr;
    const nowIso = jakarta.isoTimestamp;
    const durationMinutes = calculateDurationMinutes(existing.usageDate, existing.startTime, endTime);
    const duration = formatDurationIndonesian(durationMinutes);
    const conditionAfter = deriveOverallChecklistCondition(params.checklistAfter);
    const officerName = userProfile?.displayName || 'Petugas Lab';

    const targetPc = computers.find((c) => c.id === existing.computerId);
    const hasProblem = params.hasProblemAfter || conditionAfter !== 'Baik';
    const nextOpStatus: ComputerOperationalStatus = hasProblem
      ? conditionAfter === 'Rusak'
        ? 'RUSAK'
        : 'PERLU PEMERIKSAAN'
      : 'TERSEDIA';

    let createdDamage: ComputerDamageReport | undefined;
    let syncedLegacyDamage: DamageReport | undefined;

    if (hasProblem && params.damagePayload) {
      const reportNumber = generateComputerDamageCode(computerDamageReports.length);
      let photoUrl = '';
      if (params.damagePayload.photoFile) {
        photoUrl = await uploadUsageEvidenceImage(reportNumber, params.damagePayload.photoFile);
      }
      const affectedComponents = getAffectedComponentLabels(params.checklistAfter);
      const classOrOrg =
        existing.userType === 'Siswa'
          ? existing.studentClass || 'Siswa'
          : existing.userType === 'Tamu'
          ? existing.externalInstitution || 'Tamu Eksternal'
          : existing.userType;

      createdDamage = {
        id: reportNumber,
        reportNumber,
        usageId: existing.usageId,
        computerId: existing.computerId,
        computerCode: existing.computerCode,
        computerName: existing.computerName,
        inventoryCode: existing.inventoryCode,
        roomId: existing.roomId,
        roomName: existing.roomName,
        damageType: params.damagePayload.damageType || 'Kendala Perangkat Keras/Lunak',
        damageDescription: params.damagePayload.damageDescription || params.conditionAfterNotes || 'Ditemukan masalah saat pemeriksaan sesudah penggunaan.',
        affectedComponents: affectedComponents.length > 0 ? affectedComponents : ['Pemeriksaan Umum'],
        severity: params.damagePayload.severity || (conditionAfter === 'Rusak' ? 'Berat' : 'Ringan'),
        discoveredAt: `${jakarta.dateStr} ${jakarta.timeStr} WIB`,
        discoveredDate: jakarta.dateStr,
        lastUsageId: existing.usageId,
        lastUserName: existing.userName,
        lastUserType: existing.userType,
        lastUserClassOrOrg: classOrOrg,
        lastUsageDate: existing.usageDate,
        lastUsageTime: `${existing.startTime} - ${endTime} WIB`,
        photoUrl,
        inspectorName: officerName,
        initialAction: params.damagePayload.initialAction || 'Unit ditandai untuk pemeriksaan teknisi laboratorium.',
        additionalNotes:
          'Catatan kronologis sistem: Pengguna terakhir dicatat sebagai referensi riwayat pemakaian, bukan penuduhan otomatis kerusakan.',
        followUpStatus: 'Menunggu Pemeriksaan',
        followUpHistory: [
          {
            timestamp: nowIso,
            status: 'Menunggu Pemeriksaan',
            notes: `Dilaporkan saat Check-Out sesi ${existing.usageId}. ${params.damagePayload.initialAction || ''}`.trim(),
            officer: officerName,
          },
        ],
        notifiedRoles: ['admin', 'teknisi', 'kepala_lab'],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      syncedLegacyDamage = {
        id: `dmg-sync-${reportNumber}`,
        reportDate: jakarta.dateStr,
        reporterName: officerName,
        reporterRole: activeRoleObject?.name || 'Petugas Lab',
        deviceName: `${existing.computerCode} - ${existing.computerName}`,
        inventoryNumber: existing.inventoryCode,
        labName: existing.roomName,
        damageDescription: `[${reportNumber}] ${createdDamage.damageDescription} (Pemakai terakhir pada riwayat: ${existing.userName} - ${classOrOrg})`,
        severity: createdDamage.severity,
        photoUrl,
        status: 'Menunggu Verifikasi',
        followUpNotes: createdDamage.initialAction,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    }

    const updatedUsage: ComputerUsageRecord = {
      ...existing,
      endTime,
      durationMinutes,
      duration,
      conditionAfter,
      conditionAfterNotes: (params.conditionAfterNotes || '').trim(),
      hasProblemAfter: hasProblem,
      usageStatus: 'Selesai',
      notes: params.notes !== undefined ? params.notes.trim() : existing.notes,
      damageReportId: createdDamage?.id || existing.damageReportId || '',
      updatedAt: nowIso,
    };

    const checkAfterDoc: ComputerConditionCheck = {
      id: `chk-aft-${existing.usageId}`,
      usageId: existing.usageId,
      computerId: existing.computerId,
      inventoryCode: existing.inventoryCode,
      computerCode: existing.computerCode,
      phase: 'Sesudah Penggunaan',
      checklist: params.checklistAfter,
      overallCondition: conditionAfter,
      notes: (params.conditionAfterNotes || '').trim(),
      checkedBy: officerName,
      checkedAt: nowIso,
    };

    const historyDoc: ComputerStatusHistory = {
      id: `sthist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      computerId: existing.computerId,
      computerCode: existing.computerCode,
      previousStatus: 'SEDANG DIGUNAKAN',
      newStatus: nextOpStatus,
      usageId: existing.usageId,
      damageReportId: createdDamage?.id || '',
      reason: hasProblem
        ? `Check-Out dengan temuan kondisi ${conditionAfter}. Pemakai terakhir: ${existing.userName}.`
        : `Check-Out selesai (${duration}), kondisi baik.`,
      changedBy: officerName,
      timestamp: nowIso,
    };

    const pcUpdatePatch: Partial<Computer> = {
      operationalStatus: nextOpStatus,
      condition: mapOperationalStatusToCondition(nextOpStatus),
      lastCheckDate: existing.usageDate,
      activeUsageId: '',
      activeUserName: '',
      activeUserType: '',
      lastUsageId: existing.usageId,
      lastUsageDate: existing.usageDate,
      lastUsageStartTime: existing.startTime,
      lastUsageEndTime: endTime,
      lastUsageDuration: duration,
      lastUserName: existing.userName,
      lastUserType: existing.userType,
      lastUserClassOrOrg:
        existing.userType === 'Siswa'
          ? existing.studentClass
          : existing.userType === 'Tamu'
          ? existing.externalInstitution
          : existing.userType,
      lastConditionAfter: conditionAfter,
      updatedAt: nowIso,
    };

    try {
      await runTransaction(db, async (tx) => {
        const pcRef = doc(db, 'computers', existing.computerId);
        await tx.get(pcRef);
        tx.set(doc(db, 'computer_usage', existing.id), updatedUsage, { merge: true });
        tx.set(doc(db, 'computer_condition_checks', checkAfterDoc.id), checkAfterDoc);
        tx.set(doc(db, 'computer_status_history', historyDoc.id), historyDoc);
        if (createdDamage) {
          tx.set(doc(db, 'computer_damage_reports', createdDamage.id), createdDamage);
        }
        if (syncedLegacyDamage) {
          tx.set(doc(db, 'damage_reports', syncedLegacyDamage.id), syncedLegacyDamage);
        }
        tx.set(pcRef, { ...(targetPc || {}), ...pcUpdatePatch }, { merge: true });
      });
    } catch (err: any) {
      // Offline fallback: queue writes via Firestore IndexedDB cache so they sync automatically when online
      console.warn('Firestore checkout offline fallback queued:', err?.message);
      setDoc(doc(db, 'computer_usage', existing.id), updatedUsage, { merge: true }).catch(() => {});
      setDoc(doc(db, 'computer_condition_checks', checkAfterDoc.id), checkAfterDoc).catch(() => {});
      setDoc(doc(db, 'computer_status_history', historyDoc.id), historyDoc).catch(() => {});
      if (createdDamage) {
        setDoc(doc(db, 'computer_damage_reports', createdDamage.id), createdDamage).catch(() => {});
      }
      if (syncedLegacyDamage) {
        setDoc(doc(db, 'damage_reports', syncedLegacyDamage.id), syncedLegacyDamage).catch(() => {});
      }
      setDoc(
        doc(db, 'computers', existing.computerId),
        { ...(targetPc || {}), ...pcUpdatePatch },
        { merge: true }
      ).catch(() => {});
    }

    setComputerUsages((prev) => prev.map((u) => (u.id === existing.id ? updatedUsage : u)));
    setComputerConditionChecks((prev) => [checkAfterDoc, ...prev]);
    setComputerStatusHistories((prev) => [historyDoc, ...prev]);
    if (createdDamage) {
      setComputerDamageReports((prev) => [createdDamage!, ...prev]);
    }
    if (syncedLegacyDamage) {
      setDamageReports((prev) => [syncedLegacyDamage!, ...prev]);
    }
    setComputers((prev) =>
      prev.map((c) => (c.id === existing.computerId ? { ...c, ...pcUpdatePatch } : c))
    );

    if (createdDamage) {
      addToast(
        'warning',
        `Selesai & Laporan Kerusakan ${createdDamage.reportNumber} Dibuat`,
        `${existing.computerCode} selesai digunakan (${duration}) dengan status ${nextOpStatus}. Notifikasi telah dikirim ke Admin & Teknisi.`
      );
    } else {
      addToast(
        'success',
        `Check-Out ${existing.computerCode} Selesai`,
        `Durasi penggunaan: ${duration}. Status komputer kembali TERSEDIA.`
      );
    }
    logActivity(
      'CHECKOUT_COMPUTER_USAGE',
      'Penggunaan Komputer',
      `Selesai penggunaan ${existing.computerCode} oleh ${existing.userName} (${duration}, Kondisi: ${conditionAfter})`
    );

    return { success: true, usage: updatedUsage, damageReport: createdDamage };
  };

  const cancelOrForceResolveUsage = async (params: {
    usageId: string;
    resolution: 'Dibatalkan' | 'Selesai';
    reason: string;
    endTime?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!hasPermission('manageComputerUsage') && currentRole !== 'admin') {
      const msg = 'Hanya Administrator yang memiliki wewenang pembatalan atau penyelesaian paksa.';
      addToast('error', 'Akses Ditolak', msg);
      return { success: false, error: msg };
    }
    if (!params.reason.trim()) {
      const msg = 'Alasan audit wajib diisi.';
      addToast('error', 'Alasan Kosong', msg);
      return { success: false, error: msg };
    }
    const existing = computerUsages.find((u) => u.id === params.usageId || u.usageId === params.usageId);
    if (!existing) {
      return { success: false, error: 'Transaksi tidak ditemukan.' };
    }

    const jakarta = getJakartaNow();
    const nowIso = jakarta.isoTimestamp;
    const endTime = params.resolution === 'Selesai' ? params.endTime || jakarta.timeStr : existing.endTime || jakarta.timeStr;
    const durationMinutes =
      params.resolution === 'Selesai'
        ? calculateDurationMinutes(existing.usageDate, existing.startTime, endTime)
        : 0;
    const duration =
      params.resolution === 'Selesai' ? formatDurationIndonesian(durationMinutes) : 'Dibatalkan';
    const officerName = userProfile?.displayName || 'Administrator';

    const updatedUsage: ComputerUsageRecord = {
      ...existing,
      usageStatus: params.resolution,
      endTime,
      durationMinutes,
      duration,
      conditionAfter: params.resolution === 'Selesai' ? existing.conditionBefore : undefined,
      editReason: params.reason.trim(),
      updatedAt: nowIso,
    };

    const historyDoc: ComputerStatusHistory = {
      id: `sthist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      computerId: existing.computerId,
      computerCode: existing.computerCode,
      previousStatus: 'SEDANG DIGUNAKAN',
      newStatus: 'TERSEDIA',
      usageId: existing.usageId,
      reason: `Khusus Admin (${params.resolution}): ${params.reason.trim()}`,
      changedBy: officerName,
      timestamp: nowIso,
    };

    const targetPc = computers.find((c) => c.id === existing.computerId);
    const pcPatch: Partial<Computer> = {
      operationalStatus: 'TERSEDIA',
      activeUsageId: '',
      activeUserName: '',
      activeUserType: '',
      ...(params.resolution === 'Selesai'
        ? {
            lastUsageId: existing.usageId,
            lastUsageDate: existing.usageDate,
            lastUsageStartTime: existing.startTime,
            lastUsageEndTime: endTime,
            lastUserName: existing.userName,
            lastUserType: existing.userType,
            lastConditionAfter: existing.conditionBefore,
          }
        : {}),
      updatedAt: nowIso,
    };

    try {
      await setDoc(doc(db, 'computer_usage', existing.id), updatedUsage, { merge: true });
      await setDoc(doc(db, 'computer_status_history', historyDoc.id), historyDoc);
      if (targetPc && (targetPc.activeUsageId === existing.usageId || existing.usageStatus === 'Sedang Digunakan')) {
        await setDoc(doc(db, 'computers', existing.computerId), { ...targetPc, ...pcPatch }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `computer_usage/${existing.id}`);
    }

    setComputerUsages((prev) => prev.map((u) => (u.id === existing.id ? updatedUsage : u)));
    setComputerStatusHistories((prev) => [historyDoc, ...prev]);
    setComputers((prev) =>
      prev.map((c) => (c.id === existing.computerId ? { ...c, ...pcPatch } : c))
    );

    addToast(
      'info',
      `Transaksi ${params.resolution}`,
      `${existing.usageId} (${existing.computerCode}) ditandai ${params.resolution} dengan catatan audit.`
    );
    logActivity(
      'ADMIN_FORCE_RESOLVE_USAGE',
      'Penggunaan Komputer',
      `${params.resolution} transaksi ${existing.usageId} oleh Admin. Alasan: ${params.reason}`
    );
    return { success: true };
  };

  const updateComputerUsageWithAudit = async (
    usage: ComputerUsageRecord,
    editReason: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!hasPermission('manageComputerUsage') && currentRole !== 'admin') {
      const msg = 'Hanya Administrator yang dapat mengubah riwayat penggunaan.';
      addToast('error', 'Akses Ditolak', msg);
      return { success: false, error: msg };
    }
    if (!editReason.trim()) {
      const msg = 'Alasan perubahan (audit trail) wajib diisi sebelum menyimpan koreksi.';
      addToast('error', 'Alasan Audit Wajib', msg);
      return { success: false, error: msg };
    }

    const durationMinutes =
      usage.usageStatus === 'Selesai' && usage.endTime
        ? calculateDurationMinutes(usage.usageDate, usage.startTime, usage.endTime)
        : usage.durationMinutes;
    const duration =
      usage.usageStatus === 'Selesai' && usage.endTime
        ? formatDurationIndonesian(durationMinutes)
        : usage.duration;

    const payload: ComputerUsageRecord = {
      ...usage,
      durationMinutes,
      duration,
      editReason: editReason.trim(),
      updatedAt: new Date().toISOString(),
    };

    setComputerUsages((prev) => prev.map((u) => (u.id === payload.id ? payload : u)));
    try {
      await setDoc(doc(db, 'computer_usage', payload.id), payload, { merge: true });
      addToast('success', 'Riwayat Diperbarui', `Koreksi ${payload.usageId} tersimpan dengan catatan audit.`);
      logActivity(
        'AUDIT_EDIT_USAGE',
        'Penggunaan Komputer',
        `Mengedit ${payload.usageId} (${payload.computerCode}). Alasan: ${editReason.trim()}`
      );
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `computer_usage/${payload.id}`);
      return { success: false, error: err?.message };
    }
  };

  const deleteComputerUsage = async (usageId: string): Promise<{ success: boolean; error?: string }> => {
    if (!hasPermission('manageComputerUsage') && currentRole !== 'admin') {
      const msg = 'Penghapusan riwayat penggunaan hanya diperbolehkan untuk Administrator.';
      addToast('error', 'Akses Ditolak', msg);
      return { success: false, error: msg };
    }
    const target = computerUsages.find((u) => u.id === usageId || u.usageId === usageId);
    if (!target) return { success: false, error: 'Data tidak ditemukan.' };

    setComputerUsages((prev) => prev.filter((u) => u.id !== target.id));
    setComputerUsageMembers((prev) => prev.filter((m) => m.usageId !== target.usageId));

    try {
      await deleteDoc(doc(db, 'computer_usage', target.id));
      // Jika menghapus sesi aktif, pulihkan komputer ke TERSEDIA
      const pc = computers.find((c) => c.id === target.computerId);
      if (pc && pc.activeUsageId === target.usageId) {
        await setDoc(
          doc(db, 'computers', pc.id),
          { ...pc, operationalStatus: 'TERSEDIA', activeUsageId: '', activeUserName: '', activeUserType: '' },
          { merge: true }
        );
        setComputers((prev) =>
          prev.map((c) =>
            c.id === pc.id
              ? { ...c, operationalStatus: 'TERSEDIA', activeUsageId: '', activeUserName: '', activeUserType: '' }
              : c
          )
        );
      }
      addToast('success', 'Riwayat Dihapus', `Transaksi ${target.usageId} telah dihapus oleh Administrator.`);
      logActivity(
        'DELETE_COMPUTER_USAGE',
        'Penggunaan Komputer',
        `Menghapus riwayat ${target.usageId} (${target.computerCode} - ${target.userName})`
      );
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `computer_usage/${target.id}`);
      return { success: false, error: err?.message };
    }
  };

  const reportComputerDamage = async (
    params: {
      computerId: string;
      usageId?: string;
      damageType: string;
      damageDescription: string;
      affectedComponents: string[];
      severity: DamageSeverity;
      initialAction: string;
      additionalNotes?: string;
      targetStatus: 'PERLU PEMERIKSAAN' | 'RUSAK';
    },
    photoFile?: File | null
  ): Promise<{ success: boolean; report?: ComputerDamageReport; error?: string }> => {
    const pc = computers.find((c) => c.id === params.computerId);
    if (!pc) {
      const msg = 'Komputer tidak ditemukan.';
      addToast('error', 'Data Tidak Valid', msg);
      return { success: false, error: msg };
    }

    const jakarta = getJakartaNow();
    const nowIso = jakarta.isoTimestamp;
    const reportNumber = generateComputerDamageCode(computerDamageReports.length);
    const officerName = userProfile?.displayName || 'Petugas Lab';

    // Cari transaksi terakhir yang relevan (aktif/selesai) sebagai referensi kronologis TANPA menuduh otomatis
    const linkedUsage =
      (params.usageId && computerUsages.find((u) => u.id === params.usageId || u.usageId === params.usageId)) ||
      getLastCompletedUsageForComputer(pc.id, computerUsages);

    let photoUrl = '';
    if (photoFile) {
      photoUrl = await uploadUsageEvidenceImage(reportNumber, photoFile);
    }

    const lastUserClassOrOrg = linkedUsage
      ? linkedUsage.userType === 'Siswa'
        ? linkedUsage.studentClass || 'Siswa'
        : linkedUsage.userType === 'Tamu'
        ? linkedUsage.externalInstitution || 'Tamu Eksternal'
        : linkedUsage.userType
      : undefined;

    const report: ComputerDamageReport = {
      id: reportNumber,
      reportNumber,
      usageId: linkedUsage?.usageId || '',
      computerId: pc.id,
      computerCode: pc.computerCode,
      computerName: pc.deviceName,
      inventoryCode: pc.inventoryNumber,
      roomId: pc.labId,
      roomName: pc.labName,
      damageType: params.damageType,
      damageDescription: params.damageDescription.trim(),
      affectedComponents: params.affectedComponents.length > 0 ? params.affectedComponents : ['Lainnya'],
      severity: params.severity,
      discoveredAt: `${jakarta.dateStr} ${jakarta.timeStr} WIB`,
      discoveredDate: jakarta.dateStr,
      lastUsageId: linkedUsage?.usageId || pc.lastUsageId || '',
      lastUserName: linkedUsage?.userName || pc.lastUserName || 'Belum Ada Riwayat Penggunaan',
      lastUserType: linkedUsage?.userType || (pc.lastUserType ? (pc.lastUserType as UsageUserType) : undefined),
      lastUserClassOrOrg: lastUserClassOrOrg || pc.lastUserClassOrOrg || '',
      lastUsageDate: linkedUsage?.usageDate || pc.lastUsageDate || '',
      lastUsageTime: linkedUsage
        ? `${linkedUsage.startTime}${linkedUsage.endTime ? ` - ${linkedUsage.endTime} WIB` : ' WIB'}`
        : '',
      photoUrl,
      inspectorName: officerName,
      initialAction: params.initialAction.trim(),
      additionalNotes:
        params.additionalNotes?.trim() ||
        'Hubungan kronologis: Data pemakai terakhir dicatat hanya sebagai referensi pemeriksaan, bukan tuduhan penyebab otomatis.',
      followUpStatus:
        params.targetStatus === 'PERLU PEMERIKSAAN' ? 'Perlu Pemeriksaan' : 'Menunggu Pemeriksaan',
      followUpHistory: [
        {
          timestamp: nowIso,
          status:
            params.targetStatus === 'PERLU PEMERIKSAAN' ? 'Perlu Pemeriksaan' : 'Menunggu Pemeriksaan',
          notes: `Laporan kerusakan dibuat oleh ${officerName}. Tindakan awal: ${params.initialAction.trim()}`,
          officer: officerName,
        },
      ],
      notifiedRoles: ['admin', 'teknisi', 'kepala_lab'],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const syncedLegacy: DamageReport = {
      id: `dmg-sync-${reportNumber}`,
      reportDate: jakarta.dateStr,
      reporterName: officerName,
      reporterRole: activeRoleObject?.name || currentRole,
      deviceName: `${pc.computerCode} - ${pc.deviceName}`,
      inventoryNumber: pc.inventoryNumber,
      labName: pc.labName,
      damageDescription: `[${reportNumber}] ${report.damageDescription}`,
      severity: params.severity,
      photoUrl,
      status: 'Menunggu Verifikasi',
      followUpNotes: report.initialAction,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const prevStatus = resolveComputerOperationalStatus(pc, computerUsages, computerDamageReports);
    const historyDoc: ComputerStatusHistory = {
      id: `sthist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      computerId: pc.id,
      computerCode: pc.computerCode,
      previousStatus: prevStatus,
      newStatus: params.targetStatus,
      usageId: linkedUsage?.usageId || '',
      damageReportId: report.id,
      reason: `Laporan kerusakan ${reportNumber}: ${report.damageType}`,
      changedBy: officerName,
      timestamp: nowIso,
    };

    const pcPatch: Partial<Computer> = {
      operationalStatus: params.targetStatus,
      condition: mapOperationalStatusToCondition(params.targetStatus),
      lastCheckDate: jakarta.dateStr,
      updatedAt: nowIso,
    };

    setComputerDamageReports((prev) => [report, ...prev]);
    setDamageReports((prev) => [syncedLegacy, ...prev]);
    setComputerStatusHistories((prev) => [historyDoc, ...prev]);
    setComputers((prev) => prev.map((c) => (c.id === pc.id ? { ...c, ...pcPatch } : c)));

    try {
      await setDoc(doc(db, 'computer_damage_reports', report.id), report);
      await setDoc(doc(db, 'damage_reports', syncedLegacy.id), syncedLegacy);
      await setDoc(doc(db, 'computer_status_history', historyDoc.id), historyDoc);
      await setDoc(doc(db, 'computers', pc.id), { ...pc, ...pcPatch }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `computer_damage_reports/${report.id}`);
    }

    addToast(
      'warning',
      `Laporan Kerusakan ${reportNumber} Terkirim`,
      `Status ${pc.computerCode} diperbarui ke ${params.targetStatus}. Notifikasi telah diteruskan ke Admin & Teknisi.`
    );
    logActivity(
      'REPORT_COMPUTER_DAMAGE',
      'Kerusakan Penggunaan Komputer',
      `Laporan ${reportNumber} untuk ${pc.computerCode} (${params.damageType}) oleh ${officerName}`
    );

    return { success: true, report };
  };

  const updateComputerDamageFollowUp = async (params: {
    reportId: string;
    followUpStatus: ComputerDamageFollowUpStatus;
    notes: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const existing = computerDamageReports.find((r) => r.id === params.reportId);
    if (!existing) return { success: false, error: 'Laporan kerusakan tidak ditemukan.' };

    const jakarta = getJakartaNow();
    const nowIso = jakarta.isoTimestamp;
    const officerName = userProfile?.displayName || 'Teknisi / Admin';

    const newEntry = {
      timestamp: nowIso,
      status: params.followUpStatus,
      notes: params.notes.trim() || `Status diperbarui menjadi ${params.followUpStatus}.`,
      officer: officerName,
    };

    const updatedReport: ComputerDamageReport = {
      ...existing,
      followUpStatus: params.followUpStatus,
      followUpHistory: [newEntry, ...(existing.followUpHistory || [])],
      updatedAt: nowIso,
    };

    let nextOpStatus: ComputerOperationalStatus = 'PERLU PEMERIKSAAN';
    if (params.followUpStatus === 'Dalam Perbaikan') nextOpStatus = 'DALAM PERBAIKAN';
    else if (params.followUpStatus === 'Selesai Diperbaiki') nextOpStatus = 'TERSEDIA';
    else if (params.followUpStatus === 'Rusak Permanen') nextOpStatus = 'RUSAK';

    const pc = computers.find((c) => c.id === existing.computerId);
    const prevOpStatus = pc
      ? resolveComputerOperationalStatus(pc, computerUsages, computerDamageReports)
      : 'PERLU PEMERIKSAAN';

    const pcPatch: Partial<Computer> = {
      operationalStatus: nextOpStatus,
      condition: mapOperationalStatusToCondition(nextOpStatus),
      lastCheckDate: jakarta.dateStr,
      updatedAt: nowIso,
    };

    const historyDoc: ComputerStatusHistory = {
      id: `sthist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      computerId: existing.computerId,
      computerCode: existing.computerCode,
      previousStatus: prevOpStatus,
      newStatus: nextOpStatus,
      damageReportId: existing.id,
      reason: `Tindak lanjut kerusakan (${existing.reportNumber}): ${params.followUpStatus}`,
      changedBy: officerName,
      timestamp: nowIso,
    };

    setComputerDamageReports((prev) => prev.map((r) => (r.id === existing.id ? updatedReport : r)));
    setComputerStatusHistories((prev) => [historyDoc, ...prev]);
    if (pc) {
      setComputers((prev) => prev.map((c) => (c.id === pc.id ? { ...c, ...pcPatch } : c)));
    }

    // Sync corresponding legacy damage report if exists
    const legacyId = `dmg-sync-${existing.reportNumber}`;
    const legacyTarget = damageReports.find((d) => d.id === legacyId);
    if (legacyTarget) {
      const mappedLegacyStatus: DamageReport['status'] =
        params.followUpStatus === 'Selesai Diperbaiki'
          ? 'Selesai'
          : params.followUpStatus === 'Dalam Perbaikan'
          ? 'Dalam Penanganan'
          : 'Diterima';
      const updatedLegacy: DamageReport = {
        ...legacyTarget,
        status: mappedLegacyStatus,
        handlerOfficer: officerName,
        followUpNotes: newEntry.notes,
        updatedAt: nowIso,
      };
      setDamageReports((prev) => prev.map((d) => (d.id === legacyId ? updatedLegacy : d)));
      setDoc(doc(db, 'damage_reports', legacyId), updatedLegacy, { merge: true }).catch(() => {});
    }

    try {
      await setDoc(doc(db, 'computer_damage_reports', existing.id), updatedReport, { merge: true });
      await setDoc(doc(db, 'computer_status_history', historyDoc.id), historyDoc);
      if (pc) {
        await setDoc(doc(db, 'computers', pc.id), { ...pc, ...pcPatch }, { merge: true });
      }
      addToast(
        'success',
        'Tindak Lanjut Diperbarui',
        `${existing.reportNumber} (${existing.computerCode}) -> ${params.followUpStatus}. Status PC: ${nextOpStatus}.`
      );
      logActivity(
        'UPDATE_DAMAGE_FOLLOWUP',
        'Kerusakan Penggunaan Komputer',
        `Update ${existing.reportNumber} menjadi ${params.followUpStatus} (${newEntry.notes})`
      );
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `computer_damage_reports/${existing.id}`);
      return { success: false, error: err?.message };
    }
  };

  const updateComputerOperationalStatusManual = async (
    computerId: string,
    newStatus: ComputerOperationalStatus,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    const pc = computers.find((c) => c.id === computerId);
    if (!pc) return { success: false, error: 'Komputer tidak ditemukan.' };

    const active = computerUsages.find((u) => u.computerId === computerId && u.usageStatus === 'Sedang Digunakan');
    if (active && newStatus !== 'SEDANG DIGUNAKAN') {
      const msg = `${pc.computerCode} masih memiliki sesi aktif (${active.usageId}). Selesaikan sesi terlebih dahulu sebelum mengubah status.`;
      addToast('warning', 'Sesi Masih Aktif', msg);
      return { success: false, error: msg };
    }

    const jakarta = getJakartaNow();
    const nowIso = jakarta.isoTimestamp;
    const prevStatus = resolveComputerOperationalStatus(pc, computerUsages, computerDamageReports);
    const officerName = userProfile?.displayName || 'Petugas Lab';

    const historyDoc: ComputerStatusHistory = {
      id: `sthist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      computerId: pc.id,
      computerCode: pc.computerCode,
      previousStatus: prevStatus,
      newStatus,
      reason: reason.trim() || `Pembaruan status manual oleh ${officerName}`,
      changedBy: officerName,
      timestamp: nowIso,
    };

    const pcPatch: Partial<Computer> = {
      operationalStatus: newStatus,
      condition: mapOperationalStatusToCondition(newStatus),
      lastCheckDate: jakarta.dateStr,
      updatedAt: nowIso,
    };

    setComputers((prev) => prev.map((c) => (c.id === pc.id ? { ...c, ...pcPatch } : c)));
    setComputerStatusHistories((prev) => [historyDoc, ...prev]);

    try {
      await setDoc(doc(db, 'computers', pc.id), { ...pc, ...pcPatch }, { merge: true });
      await setDoc(doc(db, 'computer_status_history', historyDoc.id), historyDoc);
      addToast('success', `Status ${pc.computerCode} Diubah`, `Status operasional kini: ${newStatus}.`);
      logActivity(
        'UPDATE_PC_OPERATIONAL_STATUS',
        'Status Komputer',
        `Mengubah status ${pc.computerCode} dari ${prevStatus} menjadi ${newStatus}. Alasan: ${historyDoc.reason}`
      );
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `computers/${pc.id}`);
      return { success: false, error: err?.message };
    }
  };

  const saveExternalUser = async (
    user: Partial<ExternalUser>
  ): Promise<{ success: boolean; user?: ExternalUser; error?: string }> => {
    const cleanName = (user.fullName || '').trim();
    const cleanInst = (user.institution || '').trim();
    if (!cleanName || !cleanInst) {
      const msg = 'Nama lengkap dan asal instansi/lembaga tamu wajib diisi.';
      addToast('error', 'Data Tamu Belum Lengkap', msg);
      return { success: false, error: msg };
    }
    const id = user.id || `ext-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = getJakartaNow();
    const existing = externalUsers.find((e) => e.id === id);
    const payload: ExternalUser = {
      id,
      fullName: cleanName,
      institution: cleanInst,
      identityOrContact: (user.identityOrContact || '').trim(),
      totalVisits: user.totalVisits ?? existing?.totalVisits ?? 0,
      lastVisitDate: user.lastVisitDate || existing?.lastVisitDate || now.dateStr,
      notes: (user.notes || '').trim(),
      createdAt: existing?.createdAt || user.createdAt || now.isoTimestamp,
      updatedAt: now.isoTimestamp,
    };

    setExternalUsers((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      const next = idx >= 0 ? prev.map((x, i) => (i === idx ? payload : x)) : [...prev, payload];
      return next.sort((a, b) => a.fullName.localeCompare(b.fullName));
    });

    try {
      await setDoc(doc(db, 'external_users', id), payload, { merge: true });
      addToast('success', 'Data Tamu Disimpan', `${payload.fullName} (${payload.institution}) tersimpan.`);
      return { success: true, user: payload };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `external_users/${id}`);
      return { success: false, error: err?.message };
    }
  };

  const deleteExternalUser = async (id: string) => {
    const target = externalUsers.find((e) => e.id === id);
    setExternalUsers((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteDoc(doc(db, 'external_users', id));
      addToast('success', 'Data Tamu Dihapus', `${target?.fullName || id} dihapus dari direktori tamu.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `external_users/${id}`);
    }
  };

  const saveComputerUsageSettings = async (item: ComputerUsageSettings) => {
    const payload: ComputerUsageSettings = {
      ...item,
      id: 'default',
      timezone: 'Asia/Jakarta',
      updatedAt: new Date().toISOString(),
    };
    setComputerUsageSettings(payload);
    try {
      await setDoc(doc(db, 'computer_usage_settings', 'default'), payload, { merge: true });
      addToast('success', 'Pengaturan Disimpan', 'Konfigurasi modul Penggunaan Komputer diperbarui.');
      logActivity(
        'SAVE_USAGE_SETTINGS',
        'Pengaturan Penggunaan',
        'Memperbarui konfigurasi Riwayat Penggunaan Komputer'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'computer_usage_settings/default');
    }
  };

  // Non-destructive JSON backup restore with full schema validation
  const restoreFullBackupData = async (
    parsedBackup: any
  ): Promise<{ success: boolean; restoredCount: number; error?: string }> => {
    const validation = validateBackupPayload(parsedBackup, settings.updatedAt);
    if (!validation.valid) {
      addToast('error', 'File Backup Tidak Valid', validation.error || 'Format JSON tidak dikenali.');
      return { success: false, restoredCount: 0, error: validation.error };
    }

    setIsLoading(true);
    let restoredCount = 0;
    try {
      if (parsedBackup.settings && typeof parsedBackup.settings === 'object') {
        const mergedSettings: AppSetting = {
          ...settings,
          ...parsedBackup.settings,
          id: 'general',
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'settings', 'general'), mergedSettings, { merge: true });
        setSettings(mergedSettings);
        restoredCount++;
      }

      if (parsedBackup.attendanceSettings && typeof parsedBackup.attendanceSettings === 'object') {
        const mergedAttSet = {
          ...attendanceSettings,
          ...parsedBackup.attendanceSettings,
          id: 'default',
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'attendance_settings', 'default'), mergedAttSet, { merge: true });
        setAttendanceSettings(mergedAttSet);
        restoredCount++;
      }

      if (parsedBackup.computerUsageSettings && typeof parsedBackup.computerUsageSettings === 'object') {
        const mergedUsageSet = {
          ...computerUsageSettings,
          ...parsedBackup.computerUsageSettings,
          id: 'default',
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'computer_usage_settings', 'default'), mergedUsageSet, { merge: true });
        setComputerUsageSettings(mergedUsageSet);
        restoredCount++;
      }

      const collectionMappings: {
        backupKey: string;
        firestoreCollection: string;
        setter?: (items: any[]) => void;
        getDocId?: (item: any) => string;
      }[] = [
        { backupKey: 'accessRoles', firestoreCollection: 'access_roles', setter: setAccessRoles },
        { backupKey: 'laboratories', firestoreCollection: 'laboratories', setter: setLaboratories },
        { backupKey: 'computers', firestoreCollection: 'computers', setter: setComputers },
        { backupKey: 'equipment', firestoreCollection: 'equipment', setter: setEquipment },
        { backupKey: 'schedules', firestoreCollection: 'schedules', setter: setSchedules },
        { backupKey: 'borrowings', firestoreCollection: 'borrowings', setter: setBorrowings },
        { backupKey: 'maintenanceList', firestoreCollection: 'maintenance', setter: setMaintenanceList },
        { backupKey: 'damageReports', firestoreCollection: 'damage_reports', setter: setDamageReports },
        { backupKey: 'usersLab', firestoreCollection: 'users_lab', setter: setUsersLab },
        { backupKey: 'activities', firestoreCollection: 'activities', setter: setActivities },
        { backupKey: 'documents', firestoreCollection: 'documents', setter: setDocuments },
        { backupKey: 'guests', firestoreCollection: 'guests', setter: setGuests },
        { backupKey: 'studentAttendances', firestoreCollection: 'practicum_attendance', setter: setStudentAttendances },
        { backupKey: 'lessonJournals', firestoreCollection: 'lesson_journals', setter: setLessonJournals },
        { backupKey: 'schoolClasses', firestoreCollection: 'classes', setter: setSchoolClasses },
        { backupKey: 'students', firestoreCollection: 'students', setter: setStudents },
        { backupKey: 'classAttendances', firestoreCollection: 'attendance', setter: setClassAttendances },
        { backupKey: 'academicYears', firestoreCollection: 'academic_years', setter: setAcademicYears },
        { backupKey: 'schoolCalendar', firestoreCollection: 'school_calendar', setter: setSchoolCalendar },
        { backupKey: 'computerUsages', firestoreCollection: 'computer_usage', setter: setComputerUsages },
        { backupKey: 'computerUsageMembers', firestoreCollection: 'computer_usage_members', setter: setComputerUsageMembers },
        { backupKey: 'computerConditionChecks', firestoreCollection: 'computer_condition_checks', setter: setComputerConditionChecks },
        { backupKey: 'computerDamageReports', firestoreCollection: 'computer_damage_reports', setter: setComputerDamageReports },
        { backupKey: 'computerStatusHistories', firestoreCollection: 'computer_status_history', setter: setComputerStatusHistories },
        { backupKey: 'externalUsers', firestoreCollection: 'external_users', setter: setExternalUsers },
        { backupKey: 'galleryCategories', firestoreCollection: 'galleryCategories', setter: setGalleryCategories },
        { backupKey: 'galleryImages', firestoreCollection: 'galleryImages', setter: setGalleryImages },
      ];

      for (const mapping of collectionMappings) {
        const rawList = parsedBackup[mapping.backupKey];
        if (!Array.isArray(rawList) || rawList.length === 0) continue;

        const validDocs: any[] = [];
        for (const item of rawList) {
          if (!item || typeof item !== 'object') continue;
          const itemId = String(item.id || item.uid || item.usageId || '').trim();
          if (!itemId) continue;
          const normalized = { ...item, id: itemId };
          await setDoc(doc(db, mapping.firestoreCollection, itemId), normalized, { merge: true });
          validDocs.push(normalized);
          restoredCount++;
        }
        if (mapping.setter && validDocs.length > 0) {
          mapping.setter(validDocs);
        }
      }

      addToast(
        'success',
        'Pemulihan Data Berhasil',
        `${restoredCount} entri data dari cadangan JSON berhasil dipulihkan secara non-destruktif.`
      );
      logActivity(
        'RESTORE_BACKUP',
        'Konfigurasi Sistem',
        `Memulihkan ${restoredCount} rekaman data dari file backup JSON (versi ${validation.version})`
      );
      return { success: true, restoredCount };
    } catch (err: any) {
      const msg = err?.message || 'Terjadi kendala saat memulihkan cadangan database.';
      addToast('error', 'Gagal Memulihkan Data', msg);
      return { success: false, restoredCount, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  // Seeder for Cloud Firestore
  const seedInitialDataToFirestore = async () => {
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), DEFAULT_SETTINGS);

      const oldLabIds = ['lab-rpl', 'lab-tkj', 'lab-dkv', 'lab-umum'];
      for (const oldId of oldLabIds) {
        deleteDoc(doc(db, 'laboratories', oldId)).catch(() => {});
      }

      for (const r of INITIAL_ACCESS_ROLES) {
        await setDoc(doc(db, 'access_roles', r.id), r);
      }
      for (const lab of INITIAL_LABS) {
        await setDoc(doc(db, 'laboratories', lab.id), lab);
      }
      for (const pc of INITIAL_COMPUTERS) {
        await setDoc(doc(db, 'computers', pc.id), pc);
      }
      for (const eq of INITIAL_EQUIPMENT) {
        await setDoc(doc(db, 'equipment', eq.id), eq);
      }
      for (const sch of INITIAL_SCHEDULES) {
        await setDoc(doc(db, 'schedules', sch.id), sch);
      }
      for (const bor of INITIAL_BORROWINGS) {
        await setDoc(doc(db, 'borrowings', bor.id), bor);
      }
      for (const mnt of INITIAL_MAINTENANCE) {
        await setDoc(doc(db, 'maintenance', mnt.id), mnt);
      }
      for (const dmg of INITIAL_DAMAGE_REPORTS) {
        await setDoc(doc(db, 'damage_reports', dmg.id), dmg);
      }
      for (const u of INITIAL_USERS_LAB) {
        await setDoc(doc(db, 'users_lab', u.id), u);
      }
      for (const docItem of INITIAL_DOCUMENTS) {
        await setDoc(doc(db, 'documents', docItem.id), docItem);
      }
      for (const att of INITIAL_STUDENT_ATTENDANCES) {
        await setDoc(doc(db, 'practicum_attendance', att.id), att);
      }
      for (const jrn of INITIAL_LESSON_JOURNALS) {
        await setDoc(doc(db, 'lesson_journals', jrn.id), jrn);
      }

      // Seed Absensi Kelas module collections
      for (const cls of FIXED_SCHOOL_CLASSES) {
        await setDoc(doc(db, 'classes', cls.id), cls);
      }
      for (const st of INITIAL_CLASS_STUDENTS) {
        await setDoc(doc(db, 'students', st.id), st);
      }
      for (const rec of INITIAL_CLASS_ATTENDANCE) {
        await setDoc(doc(db, 'attendance', rec.id), rec);
      }
      for (const ay of INITIAL_ACADEMIC_YEARS) {
        await setDoc(doc(db, 'academic_years', ay.id), ay);
      }
      for (const cal of INITIAL_SCHOOL_CALENDAR) {
        await setDoc(doc(db, 'school_calendar', cal.id), cal);
      }
      await setDoc(doc(db, 'attendance_settings', 'default'), DEFAULT_ATTENDANCE_SETTINGS);
      for (const lg of INITIAL_ATTENDANCE_LOGS) {
        await setDoc(doc(db, 'attendance_logs', lg.id), lg);
      }
      for (const cat of INITIAL_GALLERY_CATEGORIES) {
        await setDoc(doc(db, 'galleryCategories', cat.id), cat);
      }

      setAccessRoles(INITIAL_ACCESS_ROLES);
      setLaboratories(INITIAL_LABS);
      setComputers(INITIAL_COMPUTERS);
      setEquipment(INITIAL_EQUIPMENT);
      setSchedules(INITIAL_SCHEDULES);
      setBorrowings(INITIAL_BORROWINGS);
      setMaintenanceList(INITIAL_MAINTENANCE);
      setDamageReports(INITIAL_DAMAGE_REPORTS);
      setUsersLab(INITIAL_USERS_LAB);
      setDocuments(INITIAL_DOCUMENTS);
      setStudentAttendances(INITIAL_STUDENT_ATTENDANCES);
      setLessonJournals(INITIAL_LESSON_JOURNALS);
      setSettings(DEFAULT_SETTINGS);
      setSchoolClasses(FIXED_SCHOOL_CLASSES);
      setStudents(INITIAL_CLASS_STUDENTS);
      setClassAttendances(INITIAL_CLASS_ATTENDANCE);
      setAcademicYears(INITIAL_ACADEMIC_YEARS);
      setSchoolCalendar(INITIAL_SCHOOL_CALENDAR);
      setAttendanceSettings(DEFAULT_ATTENDANCE_SETTINGS);
      setAttendanceLogs(INITIAL_ATTENDANCE_LOGS);

      addToast('success', 'Inisialisasi Data Selesai', 'Data resmi Laboratorium Komputer & Absensi 9 Kelas SMKN 15 Pandeglang berhasil disinkronkan ke Cloud Firestore.');
      logActivity('SEED_DATABASE', 'Konfigurasi Sistem', 'Inisialisasi data awal laboratorium & absensi kelas ke Cloud Firestore');
    } catch (err: any) {
      console.error('Seeder error:', err);
      addToast('error', 'Gagal Inisialisasi', err.message || 'Periksa koneksi database online.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync official computers for Laboratorium Komputer
  const syncDkvComputersFromOfficialSheet = async () => {
    setIsLoading(true);
    try {
      const oldLabIds = ['lab-rpl', 'lab-tkj', 'lab-dkv', 'lab-umum'];
      for (const oldId of oldLabIds) {
        deleteDoc(doc(db, 'laboratories', oldId)).catch(() => {});
      }

      await setDoc(doc(db, 'laboratories', INITIAL_LABS[0].id), INITIAL_LABS[0]);
      setLaboratories(INITIAL_LABS);

      for (const pc of INITIAL_COMPUTERS) {
        await setDoc(doc(db, 'computers', pc.id), pc);
      }

      const pc9Dmg = INITIAL_DAMAGE_REPORTS.find((d) => d.id === 'dmg-dkv-09');
      if (pc9Dmg) {
        await setDoc(doc(db, 'damage_reports', pc9Dmg.id), pc9Dmg);
      }

      setComputers(INITIAL_COMPUTERS);
      addToast(
        'success',
        'Data Laboratorium Komputer Tersinkronisasi',
        'Ruangan tunggal Laboratorium Komputer dan 20 unit PC resmi berhasil disimpan ke database.'
      );
      logActivity(
        'SYNC_OFFICIAL_PCS',
        'Inventaris Komputer',
        'Sinkronisasi 20 unit PC Laboratorium Komputer dari dokumen inventaris resmi'
      );
    } catch (err: any) {
      console.error('Failed to sync official computers:', err);
      addToast('error', 'Gagal Sinkronisasi', err.message || 'Gagal menyimpan ke database online.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        userProfile,
        currentRole,
        activeRoleObject,
        accessRoles,
        systemUsers,
        isOnlineDb,
        isLoading,
        authReady,
        authNotice,
        clearAuthNotice,
        toasts,
        addToast,
        removeToast,
        hasPermission,
        canAccessMenu,
        isSuperAdmin,
        logUnauthorizedAccess,
        loginWithGoogle,
        loginWithEmailPassword,
        sendPasswordReset,
        changeOwnPassword,
        updateOwnProfile,
        logout,
        isLoggingOut,
        laboratories,
        computers,
        equipment,
        schedules,
        borrowings,
        maintenanceList,
        damageReports,
        usersLab,
        activities,
        documents,
        guests,
        studentAttendances,
        lessonJournals,
        settings,
        activityLogs,
        saveAccessRole,
        deleteAccessRole,
        createManagedUserAccount,
        saveSystemUser,
        toggleUserActiveStatus,
        deleteSystemUser,
        saveStudentAttendance,
        deleteStudentAttendance,
        saveLessonJournal,
        deleteLessonJournal,
        saveLaboratory,
        deleteLaboratory,
        saveComputer,
        deleteComputer,
        batchImportComputers,
        saveEquipment,
        deleteEquipment,
        batchImportEquipment,
        saveSchedule,
        deleteSchedule,
        saveBorrowing,
        deleteBorrowing,
        saveMaintenance,
        deleteMaintenance,
        saveDamageReport,
        deleteDamageReport,
        saveLabUser,
        deleteLabUser,
        saveActivity,
        deleteActivity,
        saveDocument,
        deleteDocument,
        saveGuest,
        deleteGuest,
        saveSettings,
        seedInitialDataToFirestore,
        syncDkvComputersFromOfficialSheet,
        restoreFullBackupData,
        logActivity,
        schoolClasses,
        students,
        classAttendances,
        academicYears,
        schoolCalendar,
        attendanceSettings,
        attendanceLogs,
        accessibleClasses,
        saveSchoolClass,
        saveStudent,
        deleteStudent,
        batchImportStudents,
        moveStudentsClass,
        saveClassAttendanceBatch,
        deleteClassAttendance,
        saveAcademicYear,
        deleteAcademicYear,
        saveCalendarEvent,
        deleteCalendarEvent,
        saveAttendanceSettings,
        galleryImages,
        galleryCategories,
        saveGalleryImage,
        deleteGalleryImage,
        saveGalleryCategory,
        deleteGalleryCategory,
        computerUsages,
        computerUsageMembers,
        computerConditionChecks,
        computerDamageReports,
        computerStatusHistories,
        externalUsers,
        computerUsageSettings,
        startComputerUsage,
        finishComputerUsage,
        cancelOrForceResolveUsage,
        updateComputerUsageWithAudit,
        deleteComputerUsage,
        reportComputerDamage,
        updateComputerDamageFollowUp,
        updateComputerOperationalStatusManual,
        saveExternalUser,
        deleteExternalUser,
        saveComputerUsageSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
