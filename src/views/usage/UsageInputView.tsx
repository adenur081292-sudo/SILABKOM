import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AttendanceStatusCode,
  ComputerUsageRecord,
  ConditionChecklist,
  DamageSeverity,
  UsageUserType,
} from '../../types';
import {
  CONDITION_COMPONENT_ITEMS,
  createDefaultConditionChecklist,
  deriveOverallChecklistCondition,
  generateUsageTransactionCode,
  getJakartaNow,
  getStatusVisualMeta,
  resolveComputerOperationalStatus,
} from '../../utils/computerUsageUtils';
import {
  isComputerUsableForRole,
  findUsageTimeOverlapOnSameDate,
} from '../../utils/conflictValidation';
import {
  MonitorPlay,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  UserCheck,
  Wrench,
  Clock,
  Save,
  ShieldAlert,
  Camera,
  Check,
  Search,
} from 'lucide-react';

interface UsageInputViewProps {
  onSelectMenu?: (menuId: string) => void;
}

export const UsageInputView: React.FC<UsageInputViewProps> = ({ onSelectMenu }) => {
  const {
    computers,
    laboratories,
    schoolClasses,
    students,
    classAttendances,
    systemUsers,
    externalUsers,
    computerUsages,
    computerDamageReports,
    computerUsageSettings,
    userProfile,
    currentRole,
    hasPermission,
    startComputerUsage,
    finishComputerUsage,
    cancelOrForceResolveUsage,
  } = useApp();

  const canRecord = hasPermission('recordComputerUsage') || hasPermission('crudAllData');
  const isAdmin = currentRole === 'admin' || hasPermission('manageComputerUsage');

  const jakartaNow = getJakartaNow();
  const [activeTab, setActiveTab] = useState<'checkin' | 'active'>('checkin');

  // Form Check-In State
  const [userType, setUserType] = useState<UsageUserType>('Siswa');
  const [usageDate, setUsageDate] = useState<string>(jakartaNow.dateStr);
  const [startTime, setStartTime] = useState<string>(jakartaNow.timeStr);
  const [manualTimeEnabled, setManualTimeEnabled] = useState<boolean>(false);
  const [selectedClassId, setSelectedClassId] = useState<string>(() => schoolClasses[0]?.id || 'x-akl');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [staffName, setStaffName] = useState<string>('');
  const [staffUserId, setStaffUserId] = useState<string>('');
  const [selectedExtId, setSelectedExtId] = useState<string>('');
  const [extName, setExtName] = useState<string>('');
  const [extInstitution, setExtInstitution] = useState<string>('');
  const [extContact, setExtContact] = useState<string>('');
  const [companionName, setCompanionName] = useState<string>(userProfile?.displayName || '');
  const [subjectOrActivity, setSubjectOrActivity] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    () => computerUsageSettings.defaultRoomId || laboratories[0]?.id || 'lab-komputer'
  );
  const [selectedComputerId, setSelectedComputerId] = useState<string>('');
  const [multiPcMode, setMultiPcMode] = useState<boolean>(false);
  const [selectedComputerIds, setSelectedComputerIds] = useState<string[]>([]);
  const [purpose, setPurpose] = useState<string>('');
  const [checklistBefore, setChecklistBefore] = useState<ConditionChecklist>(
    createDefaultConditionChecklist('Baik')
  );
  const [conditionBeforeNotes, setConditionBeforeNotes] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Check-Out Modal State
  const [checkoutTarget, setCheckoutTarget] = useState<ComputerUsageRecord | null>(null);
  const [checkoutEndTime, setCheckoutEndTime] = useState<string>(jakartaNow.timeStr);
  const [checkoutChecklist, setCheckoutChecklist] = useState<ConditionChecklist>(
    createDefaultConditionChecklist('Baik')
  );
  const [checkoutConditionNotes, setCheckoutConditionNotes] = useState<string>('');
  const [hasProblemAfter, setHasProblemAfter] = useState<boolean>(false);
  const [checkoutNotes, setCheckoutNotes] = useState<string>('');
  const [dmgType, setDmgType] = useState<string>('Hardware / Perangkat');
  const [dmgDesc, setDmgDesc] = useState<string>('');
  const [dmgSeverity, setDmgSeverity] = useState<DamageSeverity>('Sedang');
  const [dmgInitialAction, setDmgInitialAction] = useState<string>('');
  const [dmgPhotoFile, setDmgPhotoFile] = useState<File | null>(null);

  // Admin Force Cancel / Complete Modal State
  const [adminActionTarget, setAdminActionTarget] = useState<{
    usage: ComputerUsageRecord;
    resolution: 'Dibatalkan' | 'Selesai';
  } | null>(null);
  const [adminReason, setAdminReason] = useState<string>('');

  const activeSessions = useMemo(
    () => computerUsages.filter((u) => u.usageStatus === 'Sedang Digunakan'),
    [computerUsages]
  );

  // Sorted computers + availability map
  const sortedComputers = useMemo(() => {
    return [...computers].sort((a, b) => {
      const na = parseInt(a.computerCode.replace(/[^0-9]/g, ''), 10) || 0;
      const nb = parseInt(b.computerCode.replace(/[^0-9]/g, ''), 10) || 0;
      return na - nb || a.computerCode.localeCompare(b.computerCode);
    });
  }, [computers]);

  const pcAvailabilityMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof isComputerUsableForRole>>();
    for (const pc of sortedComputers) {
      map.set(pc.id, isComputerUsableForRole(pc, computerUsages, computerDamageReports, currentRole));
    }
    return map;
  }, [sortedComputers, computerUsages, computerDamageReports, currentRole]);

  const usableComputerIds = useMemo(
    () => sortedComputers.filter((pc) => pcAvailabilityMap.get(pc.id)?.usable).map((pc) => pc.id),
    [sortedComputers, pcAvailabilityMap]
  );

  const effectiveSelectedComputerIds = useMemo(() => {
    if (multiPcMode) {
      return selectedComputerIds.filter((id) => usableComputerIds.includes(id));
    }
    return selectedComputerId && usableComputerIds.includes(selectedComputerId)
      ? [selectedComputerId]
      : [];
  }, [multiPcMode, selectedComputerIds, selectedComputerId, usableComputerIds]);

  const timeOverlapConflicts = useMemo(() => {
    const effectiveDate = manualTimeEnabled && isAdmin ? usageDate : jakartaNow.dateStr;
    const effectiveTime = manualTimeEnabled && isAdmin ? startTime : jakartaNow.timeStr;
    return effectiveSelectedComputerIds
      .map((cid) => {
        const pc = sortedComputers.find((c) => c.id === cid);
        const clash = findUsageTimeOverlapOnSameDate(
          cid,
          effectiveDate,
          effectiveTime,
          undefined,
          computerUsages
        );
        return clash && pc ? { pc, clash } : null;
      })
      .filter(Boolean) as { pc: (typeof sortedComputers)[number]; clash: ComputerUsageRecord }[];
  }, [
    effectiveSelectedComputerIds,
    sortedComputers,
    manualTimeEnabled,
    isAdmin,
    usageDate,
    startTime,
    jakartaNow.dateStr,
    jakartaNow.timeStr,
    computerUsages,
  ]);

  // Class & Student + Attendance Integration
  const selectedClassObj = schoolClasses.find((c) => c.id === selectedClassId) || schoolClasses[0];

  const studentsWithAttendance = useMemo(() => {
    const classStudents = students.filter(
      (s) => s.classId === selectedClassObj?.id && s.status === 'Aktif'
    );
    const enriched = classStudents.map((st) => {
      const att = classAttendances.find(
        (r) => r.studentId === st.id && r.date === usageDate
      );
      const status: AttendanceStatusCode | 'Belum Tercatat' = att?.status || 'Belum Tercatat';
      return {
        student: st,
        attendanceId: att?.id,
        attendanceStatus: status,
      };
    });

    const filtered = studentSearch.trim()
      ? enriched.filter(
          (item) =>
            item.student.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
            item.student.nis.toLowerCase().includes(studentSearch.toLowerCase())
        )
      : enriched;

    // Prioritaskan siswa Hadir (H), namun tetap izinkan melihat seluruh siswa kelas
    const orderRank = (s: AttendanceStatusCode | 'Belum Tercatat') => {
      if (s === 'H') return 1;
      if (s === 'D') return 2;
      if (s === 'Belum Tercatat') return 3;
      return 4;
    };
    return filtered.sort(
      (a, b) =>
        orderRank(a.attendanceStatus) - orderRank(b.attendanceStatus) ||
        a.student.fullName.localeCompare(b.student.fullName)
    );
  }, [students, classAttendances, selectedClassObj, usageDate, studentSearch]);

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      if (prev.includes(studentId)) return prev.filter((id) => id !== studentId);
      if (!computerUsageSettings.allowGroupUsage) return [studentId];
      if (prev.length >= (computerUsageSettings.maxGroupSize || 4)) return prev;
      return [...prev, studentId];
    });
  };

  const resetForm = () => {
    const now = getJakartaNow();
    setUsageDate(now.dateStr);
    setStartTime(now.timeStr);
    setManualTimeEnabled(false);
    setSelectedStudentIds([]);
    setStaffName('');
    setStaffUserId('');
    setSelectedExtId('');
    setExtName('');
    setExtInstitution('');
    setExtContact('');
    setSubjectOrActivity('');
    setSelectedComputerId('');
    setSelectedComputerIds([]);
    setPurpose('');
    setChecklistBefore(createDefaultConditionChecklist('Baik'));
    setConditionBeforeNotes('');
    setNotes('');
  };

  const togglePcSelection = (pcId: string) => {
    if (!usableComputerIds.includes(pcId)) return;
    if (multiPcMode) {
      setSelectedComputerIds((prev) =>
        prev.includes(pcId) ? prev.filter((id) => id !== pcId) : [...prev, pcId]
      );
    } else {
      setSelectedComputerId(pcId);
    }
  };

  const handleStartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRecord || effectiveSelectedComputerIds.length === 0 || !purpose.trim()) return;

    setIsSubmitting(true);
    const chosenRoom = laboratories.find((l) => l.id === selectedRoomId) || laboratories[0];
    const nowFresh = getJakartaNow();
    const effectiveDate = manualTimeEnabled && isAdmin ? usageDate : nowFresh.dateStr;
    const effectiveTime = manualTimeEnabled && isAdmin ? startTime : nowFresh.timeStr;

    const selectedStudentsPayload = studentsWithAttendance.filter((s) =>
      selectedStudentIds.includes(s.student.id)
    );

    let successCount = 0;
    for (const targetComputerId of effectiveSelectedComputerIds) {
      const res = await startComputerUsage({
        computerId: targetComputerId,
        userType,
        selectedStudents: userType === 'Siswa' ? selectedStudentsPayload : undefined,
        userId: userType === 'Guru/Tendik' || userType === 'Teknisi/Laboran' ? staffUserId : undefined,
        userName:
          userType === 'Tamu'
            ? extName
            : userType === 'Guru/Tendik' || userType === 'Teknisi/Laboran'
            ? staffName
            : undefined,
        externalUserId: selectedExtId || undefined,
        externalInstitution: extInstitution,
        externalContact: extContact,
        companionName,
        subjectOrActivity,
        roomId: chosenRoom?.id || 'lab-komputer',
        roomName: chosenRoom?.name || 'Laboratorium Komputer',
        usageDate: effectiveDate,
        startTime: effectiveTime,
        purpose,
        checklistBefore,
        conditionBeforeNotes,
        notes,
        recordedBy: userProfile?.displayName,
      });
      if (res.success) successCount++;
    }

    setIsSubmitting(false);

    if (successCount > 0) {
      resetForm();
      setActiveTab('active');
    }
  };

  const openCheckoutModal = (usage: ComputerUsageRecord) => {
    const now = getJakartaNow();
    setCheckoutTarget(usage);
    setCheckoutEndTime(now.timeStr);
    setCheckoutChecklist(createDefaultConditionChecklist('Baik'));
    setCheckoutConditionNotes('');
    setHasProblemAfter(false);
    setCheckoutNotes(usage.notes || '');
    setDmgType('Hardware / Perangkat');
    setDmgDesc('');
    setDmgSeverity('Sedang');
    setDmgInitialAction('Komputer ditandai perlu pemeriksaan teknisi.');
    setDmgPhotoFile(null);
  };

  const handleConfirmCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutTarget) return;
    const derived = deriveOverallChecklistCondition(checkoutChecklist);
    const problemDetected = hasProblemAfter || derived !== 'Baik';

    setIsSubmitting(true);
    const res = await finishComputerUsage({
      usageId: checkoutTarget.id,
      endTime: manualTimeEnabled && isAdmin ? checkoutEndTime : getJakartaNow().timeStr,
      checklistAfter: checkoutChecklist,
      conditionAfterNotes: checkoutConditionNotes,
      hasProblemAfter: problemDetected,
      notes: checkoutNotes,
      damagePayload: problemDetected
        ? {
            damageType: dmgType,
            damageDescription: dmgDesc || checkoutConditionNotes || 'Temuan kendala pasca penggunaan.',
            severity: dmgSeverity,
            initialAction: dmgInitialAction,
            photoFile: dmgPhotoFile,
          }
        : undefined,
    });
    setIsSubmitting(false);
    if (res.success) {
      setCheckoutTarget(null);
    }
  };

  const transactionPreview = generateUsageTransactionCode(computerUsages.length);

  const attendanceBadge = (st: AttendanceStatusCode | 'Belum Tercatat') => {
    switch (st) {
      case 'H':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'D':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'S':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'I':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'A':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const attendanceLabel = (st: AttendanceStatusCode | 'Belum Tercatat') => {
    switch (st) {
      case 'H':
        return 'Hadir';
      case 'D':
        return 'Dispensasi';
      case 'S':
        return 'Sakit';
      case 'I':
        return 'Izin';
      case 'A':
        return 'Alpa';
      default:
        return 'Belum Tercatat';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <MonitorPlay className="w-6 h-6 text-cyan-600" />
            Input Penggunaan Komputer (Check-In / Check-Out)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan otomatis dengan zona waktu Asia/Jakarta (WIB), terintegrasi dengan Absensi Kelas, Inventaris Komputer, dan Buku Tamu.
          </p>
        </div>

        <div className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs gap-1">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeTab === 'checkin'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Mulai Penggunaan (Check-In)
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Sedang Digunakan
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500 text-slate-950 font-extrabold">
              {activeSessions.length}
            </span>
          </button>
        </div>
      </div>

      {!canRecord && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          Peran Anda saat ini hanya memiliki izin lihat. Hubungi Administrator bila memerlukan izin mencatat penggunaan komputer.
        </div>
      )}

      {/* TAB 1: CHECK-IN FORM */}
      {activeTab === 'checkin' && (
        <form onSubmit={handleStartSubmit} className="space-y-6">
          {/* Baris Info Transaksi & Waktu WIB */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3 text-xs">
                <span className="px-3 py-1 rounded-xl bg-slate-900 text-cyan-300 font-mono font-bold">
                  {transactionPreview}
                </span>
                <span className="text-slate-500 font-medium">
                  Waktu Sistem: <strong className="text-slate-900">{jakartaNow.displayDateTime}</strong>
                </span>
              </div>

              {isAdmin && computerUsageSettings.allowManualTimeOverrideForAdmin && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualTimeEnabled}
                    onChange={(e) => setManualTimeEnabled(e.target.checked)}
                    className="rounded accent-cyan-600"
                  />
                  Koreksi Tanggal/Jam Manual (Khusus Admin)
                </label>
              )}
            </div>

            {manualTimeEnabled && isAdmin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
                <div>
                  <label className="font-bold text-amber-950 block mb-1">Tanggal Penggunaan (Koreksi Admin)</label>
                  <input
                    type="date"
                    value={usageDate}
                    onChange={(e) => setUsageDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-amber-950 block mb-1">Jam Mulai (WIB)</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 font-bold"
                  />
                </div>
              </div>
            )}

            {/* Pilih 4 Jenis Pengguna */}
            <div>
              <label className="text-xs font-bold text-slate-900 block mb-2">
                1. Pilih Jenis Pengguna Komputer *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['Siswa', 'Guru/Tendik', 'Teknisi/Laboran', 'Tamu'] as UsageUserType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setUserType(type)}
                    className={`px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer text-left flex items-center justify-between ${
                      userType === type
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{type}</span>
                    {userType === type && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* BAGIAN SISWA (INTEGRASI ABSENSI 9 KELAS) */}
            {userType === 'Siswa' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Pilih Kelas (9 Kelas Tetap) *</label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => {
                        setSelectedClassId(e.target.value);
                        setSelectedStudentIds([]);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                    >
                      {schoolClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} — {cls.majorFullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tanggal Absensi Referensi</label>
                    <input
                      type="date"
                      value={usageDate}
                      onChange={(e) => setUsageDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Cari Nama / NIS Siswa</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Ketik nama atau NIS..."
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-cyan-50/70 border border-cyan-200 rounded-xl px-3 py-2 text-cyan-950">
                  <span>
                    Siswa <strong>Hadir (H)</strong> diprioritaskan di atas. Pilih <strong>1 siswa</strong> atau lebih untuk penggunaan kelompok (maks {computerUsageSettings.maxGroupSize} siswa).
                  </span>
                  <span className="font-bold">Terpilih: {selectedStudentIds.length} Siswa</span>
                </div>

                {studentsWithAttendance.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                    Belum ada siswa aktif pada kelas {selectedClassObj?.name}. Tambahkan siswa pada menu ABSENSI KELAS → Manajemen Data Siswa.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                    {studentsWithAttendance.map(({ student, attendanceStatus }) => {
                      const isChecked = selectedStudentIds.includes(student.id);
                      const isNonPresent = attendanceStatus === 'S' || attendanceStatus === 'I' || attendanceStatus === 'A';
                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => toggleStudentSelection(student.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2 ${
                            isChecked
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : isNonPresent
                              ? 'bg-amber-50/60 border-amber-200 text-slate-700 hover:bg-amber-50'
                              : 'bg-white border-slate-200 text-slate-800 hover:border-cyan-400'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">{student.fullName}</div>
                            <div className={`text-[10px] font-mono ${isChecked ? 'text-slate-300' : 'text-slate-500'}`}>
                              NIS: {student.nis}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[9px] font-bold shrink-0 ${
                              isChecked ? 'bg-cyan-400 text-slate-950 border-cyan-300' : attendanceBadge(attendanceStatus)
                            }`}
                          >
                            {attendanceLabel(attendanceStatus)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* BAGIAN GURU / TENDIK ATAU TEKNISI / LABORAN */}
            {(userType === 'Guru/Tendik' || userType === 'Teknisi/Laboran') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Pilih Akun {userType} Terdaftar
                  </label>
                  <select
                    value={staffUserId}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setStaffUserId(uid);
                      const found = systemUsers.find((u) => u.uid === uid);
                      if (found) setStaffName(found.displayName);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    <option value="">-- Pilih dari daftar akun atau ketik manual --</option>
                    {systemUsers
                      .filter((u) => u.isActive)
                      .map((u) => (
                        <option key={u.uid} value={u.uid}>
                          {u.displayName} ({u.subject || u.role})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nama Lengkap {userType} *
                  </label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder={`Masukkan nama ${userType}...`}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  />
                </div>
              </div>
            )}

            {/* BAGIAN TAMU / PIHAK EKSTERNAL */}
            {userType === 'Tamu' && (
              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                {externalUsers.length > 0 && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Pilih Tamu Eksternal Sebelumnya (Opsional)
                    </label>
                    <select
                      value={selectedExtId}
                      onChange={(e) => {
                        const eid = e.target.value;
                        setSelectedExtId(eid);
                        const found = externalUsers.find((eu) => eu.id === eid);
                        if (found) {
                          setExtName(found.fullName);
                          setExtInstitution(found.institution);
                          setExtContact(found.identityOrContact || '');
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <option value="">-- Input Tamu Baru --</option>
                      {externalUsers.map((eu) => (
                        <option key={eu.id} value={eu.id}>
                          {eu.fullName} — {eu.institution} ({eu.totalVisits} kunjungan)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap Tamu *</label>
                    <input
                      type="text"
                      required
                      value={extName}
                      onChange={(e) => setExtName(e.target.value)}
                      placeholder="Contoh: Bpk. Hendra Wijaya"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Asal Instansi / Lembaga *</label>
                    <input
                      type="text"
                      required
                      value={extInstitution}
                      onChange={(e) => setExtInstitution(e.target.value)}
                      placeholder="Contoh: LSP / Pengawas Dinas / Mitra Industri"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">No. Identitas / Kontak (Opsional)</label>
                    <input
                      type="text"
                      value={extContact}
                      onChange={(e) => setExtContact(e.target.value)}
                      placeholder="NIK / NIP / No. HP"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Guru Pendamping / Mapel / Ruangan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Guru Pendamping / Penanggung Jawab</label>
                <input
                  type="text"
                  value={companionName}
                  onChange={(e) => setCompanionName(e.target.value)}
                  placeholder="Nama guru / petugas pendamping"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mata Pelajaran / Kegiatan</label>
                <input
                  type="text"
                  value={subjectOrActivity}
                  onChange={(e) => setSubjectOrActivity(e.target.value)}
                  placeholder="Contoh: Desain Grafis / UKK / ANBK"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ruangan Laboratorium</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                >
                  {laboratories.map((lab) => (
                    <option key={lab.id} value={lab.id}>
                      {lab.name} ({lab.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. PILIH UNIT KOMPUTER */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-900 block">
                  2. Pilih Unit Komputer yang Digunakan *
                </label>
                <span className="text-[11px] text-slate-500">
                  Unit yang sedang dipakai atau rusak (mis. PC-9) otomatis terkunci
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 font-bold text-[11px]">
                  Terpilih: {effectiveSelectedComputerIds.length} Unit PC
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = !multiPcMode;
                    setMultiPcMode(nextMode);
                    if (nextMode && selectedComputerId && !selectedComputerIds.includes(selectedComputerId)) {
                      setSelectedComputerIds([selectedComputerId]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-colors ${
                    multiPcMode
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {multiPcMode ? 'Mode Banyak PC Aktif' : 'Mode Pilih Banyak PC'}
                </button>
                {multiPcMode && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedComputerIds(usableComputerIds)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold cursor-pointer hover:bg-emerald-100"
                    >
                      Pilih Semua Tersedia ({usableComputerIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedComputerIds([])}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold cursor-pointer hover:bg-slate-200"
                    >
                      Kosongkan
                    </button>
                  </>
                )}
              </div>
            </div>

            {timeOverlapConflicts.length > 0 && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Peringatan Bentrok Jam Penggunaan</div>
                  {timeOverlapConflicts.map(({ pc, clash }) => (
                    <div key={pc.id}>
                      <strong>{pc.computerCode}</strong> sudah memiliki catatan penggunaan oleh{' '}
                      <strong>{clash.userName}</strong> pada {clash.usageDate} ({clash.startTime}
                      {clash.endTime ? ` - ${clash.endTime}` : ''}).
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {sortedComputers.map((pc) => {
                const avail = pcAvailabilityMap.get(pc.id);
                const status =
                  avail?.status ||
                  resolveComputerOperationalStatus(pc, computerUsages, computerDamageReports);
                const meta = getStatusVisualMeta(status);
                const isSelected = effectiveSelectedComputerIds.includes(pc.id);
                const isUnavailable = !avail?.usable;

                return (
                  <button
                    key={pc.id}
                    type="button"
                    disabled={isUnavailable}
                    title={avail?.reason || `${pc.computerCode} - ${status}`}
                    onClick={() => togglePcSelection(pc.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-cyan-500/40 cursor-pointer'
                        : isUnavailable
                        ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                        : `${meta.cardBorderClass} bg-white cursor-pointer`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-xs">{pc.computerCode}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${meta.dotColorClass}`} />
                    </div>
                    <div className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {pc.deviceName}
                    </div>
                    <div className={`text-[9px] font-bold mt-1.5 uppercase ${isSelected ? 'text-cyan-300' : 'text-slate-600'}`}>
                      {status}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. TUJUAN & CEK KONDISI SEBELUM PENGGUNAAN (9 KOMPONEN) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-900">
                3. Pemeriksaan Kondisi Sebelum Penggunaan (9 Komponen)
              </label>
              <button
                type="button"
                onClick={() => setChecklistBefore(createDefaultConditionChecklist('Baik'))}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold cursor-pointer hover:bg-emerald-100"
              >
                Tandai Semua Komponen Baik
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {CONDITION_COMPONENT_ITEMS.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <span className="font-semibold text-slate-800">{item.label}</span>
                  <select
                    value={checklistBefore[item.key]}
                    onChange={(e) =>
                      setChecklistBefore({
                        ...checklistBefore,
                        [item.key]: e.target.value as 'Baik' | 'Bermasalah' | 'Rusak',
                      })
                    }
                    className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${
                      checklistBefore[item.key] === 'Baik'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : checklistBefore[item.key] === 'Bermasalah'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <option value="Baik">Baik</option>
                    <option value="Bermasalah">Bermasalah</option>
                    <option value="Rusak">Rusak</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tujuan / Keperluan Penggunaan *
                </label>
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Contoh: Praktikum Desain Grafis CorelDRAW / Input Nilai / Pemeliharaan PC"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Catatan Kondisi Awal / Keterangan Tambahan
                </label>
                <input
                  type="text"
                  value={conditionBeforeNotes}
                  onChange={(e) => setConditionBeforeNotes(e.target.value)}
                  placeholder="Opsional: catatan kondisi awal unit atau perangkat pendukung"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {onSelectMenu && (
                  <button
                    type="button"
                    onClick={() => onSelectMenu('usage_damage')}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Laporkan Kerusakan
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  disabled={!canRecord || isSubmitting || effectiveSelectedComputerIds.length === 0 || timeOverlapConflicts.length > 0}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-cyan-400" />
                  {isSubmitting
                    ? 'Memproses...'
                    : effectiveSelectedComputerIds.length > 1
                    ? `Mulai Penggunaan (${effectiveSelectedComputerIds.length} Unit PC)`
                    : 'Mulai Penggunaan'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: SEDANG DIGUNAKAN / CHECK-OUT */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeSessions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="font-bold text-slate-900 text-sm">Tidak Ada Sesi Penggunaan yang Sedang Aktif</div>
              <p className="text-xs text-slate-500">
                Semua komputer yang berstatus TERSEDIA siap digunakan kembali.
              </p>
              <button
                onClick={() => setActiveTab('checkin')}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                + Mulai Penggunaan Baru
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-3xl border border-cyan-300 p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-cyan-300 font-mono text-[10px] font-bold">
                        {session.usageId}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 mt-1.5">
                        {session.computerCode} — {session.computerName}
                      </h3>
                      <div className="text-[11px] font-mono text-slate-400">{session.inventoryCode}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-cyan-100 text-cyan-900 text-[10px] font-extrabold">
                      SEDANG DIGUNAKAN
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <UserCheck className="w-3.5 h-3.5 text-cyan-600" />
                      {session.userName} ({session.userType})
                    </div>
                    {session.studentClass && (
                      <div className="text-slate-600">
                        Kelas: <strong>{session.studentClass}</strong> • NIS: {session.studentNis}
                        {session.isGroupUsage && ` • Kelompok (${session.memberCount} siswa)`}
                      </div>
                    )}
                    {session.externalInstitution && (
                      <div className="text-slate-600">Instansi: {session.externalInstitution}</div>
                    )}
                    <div className="text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Mulai: <strong>{session.usageDate} {session.startTime} WIB</strong> • Kondisi Awal: <strong>{session.conditionBefore}</strong>
                    </div>
                    <div className="text-slate-600">Tujuan: {session.purpose}</div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setAdminActionTarget({ usage: session, resolution: 'Dibatalkan' });
                            setAdminReason('');
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold cursor-pointer"
                        >
                          Batalkan Sesi (Admin)
                        </button>
                      </>
                    )}
                    {canRecord && (
                      <button
                        onClick={() => openCheckoutModal(session)}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Selesaikan Penggunaan (Check-Out)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL CHECK-OUT */}
      {checkoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden border border-slate-200 shadow-2xl my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  Selesaikan Penggunaan — {checkoutTarget.computerCode}
                </h3>
                <div className="text-[11px] text-cyan-300 font-mono">
                  {checkoutTarget.usageId} • {checkoutTarget.userName}
                </div>
              </div>
              <button
                onClick={() => setCheckoutTarget(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCheckout} className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Mulai: <strong>{checkoutTarget.usageDate} {checkoutTarget.startTime} WIB</strong>
                </span>
                <span>
                  Jam Selesai (WIB):{' '}
                  {isAdmin && manualTimeEnabled ? (
                    <input
                      type="time"
                      value={checkoutEndTime}
                      onChange={(e) => setCheckoutEndTime(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-amber-300 bg-white font-bold"
                    />
                  ) : (
                    <strong>{getJakartaNow().timeStr} WIB (Otomatis)</strong>
                  )}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900">
                    Pemeriksaan Kondisi Sesudah Penggunaan (9 Komponen) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setCheckoutChecklist(createDefaultConditionChecklist('Baik'))}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px] cursor-pointer"
                  >
                    Semua Baik
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {CONDITION_COMPONENT_ITEMS.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <span className="font-semibold">{item.label}</span>
                      <select
                        value={checkoutChecklist[item.key]}
                        onChange={(e) => {
                          const val = e.target.value as 'Baik' | 'Bermasalah' | 'Rusak';
                          const next = { ...checkoutChecklist, [item.key]: val };
                          setCheckoutChecklist(next);
                          if (deriveOverallChecklistCondition(next) !== 'Baik') {
                            setHasProblemAfter(true);
                          }
                        }}
                        className="px-2 py-1 rounded-lg border border-slate-300 bg-white font-bold text-[11px]"
                      >
                        <option value="Baik">Baik</option>
                        <option value="Bermasalah">Bermasalah</option>
                        <option value="Rusak">Rusak</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-amber-200 bg-amber-50/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasProblemAfter || deriveOverallChecklistCondition(checkoutChecklist) !== 'Baik'}
                  onChange={(e) => setHasProblemAfter(e.target.checked)}
                  className="rounded accent-rose-600"
                />
                <span className="font-bold text-amber-950">
                  Apakah ada masalah atau kerusakan setelah penggunaan? (Jika ya, sistem otomatis menandai PC & membuat laporan pemeriksaan)
                </span>
              </label>

              {(hasProblemAfter || deriveOverallChecklistCondition(checkoutChecklist) !== 'Baik') && (
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3">
                  <div className="font-bold text-rose-900 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4" /> Detail Laporan Masalah / Kerusakan Pasca Pakai
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Jenis Masalah *</label>
                      <input
                        type="text"
                        required
                        value={dmgType}
                        onChange={(e) => setDmgType(e.target.value)}
                        placeholder="Contoh: Monitor Mati / OS Error / Mouse Rusak"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Tingkat Keparahan *</label>
                      <select
                        value={dmgSeverity}
                        onChange={(e) => setDmgSeverity(e.target.value as DamageSeverity)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 font-bold"
                      >
                        <option value="Ringan">Ringan</option>
                        <option value="Sedang">Sedang</option>
                        <option value="Berat">Berat</option>
                        <option value="Kritis">Kritis</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Deskripsi Masalah *</label>
                    <textarea
                      required
                      rows={2}
                      value={dmgDesc}
                      onChange={(e) => setDmgDesc(e.target.value)}
                      placeholder="Jelaskan kondisi yang ditemukan setelah penggunaan..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Tindakan Awal</label>
                      <input
                        type="text"
                        value={dmgInitialAction}
                        onChange={(e) => setDmgInitialAction(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Foto Bukti (Opsional)</label>
                      <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-rose-200 cursor-pointer">
                        <Camera className="w-4 h-4 text-rose-600" />
                        <span className="truncate">{dmgPhotoFile ? dmgPhotoFile.name : 'Pilih foto kondisi...'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setDmgPhotoFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="text-[10px] text-rose-800 italic">
                    * Sistem mencatat {checkoutTarget.userName} secara kronologis sebagai referensi pemakai terakhir, bukan penuduhan penyebab kerusakan.
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Kondisi Sesudah & Keterangan</label>
                <input
                  type="text"
                  value={checkoutConditionNotes}
                  onChange={(e) => setCheckoutConditionNotes(e.target.value)}
                  placeholder="Catatan kondisi komputer sesudah dipakai..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCheckoutTarget(null)}
                  className="px-4 py-2 font-semibold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {isSubmitting ? 'Menyimpan...' : 'Selesaikan Penggunaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN FORCE RESOLVE / CANCEL */}
      {adminActionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl text-xs">
            <h3 className="font-extrabold text-sm text-slate-900">
              {adminActionTarget.resolution === 'Dibatalkan'
                ? 'Batalkan Sesi Penggunaan (Khusus Admin)'
                : 'Selesaikan Sesi Secara Paksa'}
            </h3>
            <p className="text-slate-600">
              Transaksi <strong>{adminActionTarget.usage.usageId}</strong> pada <strong>{adminActionTarget.usage.computerCode}</strong> akan ditandai sebagai <strong>{adminActionTarget.resolution}</strong> dan status komputer dipulihkan ke TERSEDIA.
            </p>
            <div>
              <label className="font-bold text-slate-800 block mb-1">Alasan Pembatalan / Audit *</label>
              <textarea
                rows={3}
                required
                value={adminReason}
                onChange={(e) => setAdminReason(e.target.value)}
                placeholder="Wajib isi alasan pembatalan untuk catatan audit..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdminActionTarget(null)}
                className="px-4 py-2 text-slate-600 font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!adminReason.trim()}
                onClick={async () => {
                  await cancelOrForceResolveUsage({
                    usageId: adminActionTarget.usage.id,
                    resolution: adminActionTarget.resolution,
                    reason: adminReason,
                  });
                  setAdminActionTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 cursor-pointer"
              >
                Konfirmasi {adminActionTarget.resolution}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
