import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { GradeLevel, Student, VocationalMajor } from '../../types';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  ArrowRightLeft,
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Save,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';
import { StudentDetailModal } from './StudentDetailModal';

const GRADE_OPTIONS: GradeLevel[] = ['X', 'XI', 'XII'];
const MAJOR_OPTIONS: { code: VocationalMajor; fullName: string }[] = [
  { code: 'AKL', fullName: 'Akuntansi dan Keuangan Lembaga' },
  { code: 'DKV', fullName: 'Desain Komunikasi Visual' },
  { code: 'ATPH', fullName: 'Agribisnis Tanaman Pangan dan Hortikultura' },
];

export const AttendanceStudentsView: React.FC = () => {
  const {
    accessibleClasses,
    schoolClasses,
    students,
    academicYears,
    attendanceSettings,
    hasPermission,
    saveStudent,
    deleteStudent,
    batchImportStudents,
    moveStudentsClass,
    addToast,
  } = useApp();

  // Workspace Tab: 'list' vs 'form' (Form Input Siswa Manual)
  const [activeView, setActiveView] = useState<'list' | 'form'>('list');

  // Search, Filters, Sorting, Pagination
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState<'all' | GradeLevel>('all');
  const [filterMajor, setFilterMajor] = useState<'all' | VocationalMajor>('all');
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Aktif' | 'Tidak Aktif'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'nis_asc'>('name_asc');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Bulk Move Class & Delete/Detail Modals
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveTargetClassId, setMoveTargetClassId] = useState<string>(
    schoolClasses[0]?.id || 'x-akl'
  );
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);

  const importInputRef = useRef<HTMLInputElement>(null);
  const nisInputRef = useRef<HTMLInputElement>(null);

  const canManage = hasPermission('manageAttendanceStudents') || hasPermission('crudAllData');

  // Form Input Siswa Manual State (12 fields)
  const defaultClass = accessibleClasses[0] || schoolClasses[0];
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [nis, setNis] = useState('');
  const [nisn, setNisn] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [grade, setGrade] = useState<GradeLevel>(defaultClass?.gradeLevel || 'X');
  const [majorCode, setMajorCode] = useState<VocationalMajor>(defaultClass?.major || 'AKL');
  const [academicYear, setAcademicYear] = useState(
    attendanceSettings.activeAcademicYear || '2026/2027'
  );
  const [homeroomTeacher, setHomeroomTeacher] = useState(
    defaultClass?.homeroomTeacherName || ''
  );
  const [address, setAddress] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [status, setStatus] = useState<'Aktif' | 'Tidak Aktif'>('Aktif');
  const [isSaving, setIsSaving] = useState(false);

  // Automatic Class resolution from Tingkat (grade) + Jurusan (majorCode)
  const resolvedClass = useMemo(() => {
    return (
      schoolClasses.find((c) => c.gradeLevel === grade && c.major === majorCode) ||
      schoolClasses[0]
    );
  }, [schoolClasses, grade, majorCode]);

  const isResolvedClassAccessible = useMemo(
    () =>
      !resolvedClass ||
      accessibleClasses.some((c) => c.id === resolvedClass.id),
    [accessibleClasses, resolvedClass]
  );

  // Update homeroomTeacher automatically when changing class (if not editing or if homeroom was empty / matched previous class)
  const handleGradeOrMajorChange = (newGrade: GradeLevel, newMajor: VocationalMajor) => {
    const prevCls = schoolClasses.find((c) => c.gradeLevel === grade && c.major === majorCode);
    const nextCls = schoolClasses.find((c) => c.gradeLevel === newGrade && c.major === newMajor);
    setGrade(newGrade);
    setMajorCode(newMajor);
    if (
      nextCls &&
      (!homeroomTeacher.trim() || homeroomTeacher === prevCls?.homeroomTeacherName)
    ) {
      setHomeroomTeacher(nextCls.homeroomTeacherName || '');
    }
  };

  const accessibleIds = useMemo(
    () => new Set(accessibleClasses.map((c) => c.id)),
    [accessibleClasses]
  );

  const scopedStudents = useMemo(
    () => students.filter((s) => accessibleIds.has(s.classId)),
    [students, accessibleIds]
  );

  // Live Duplicate NIS Detection in Form
  const duplicateNisMatch = useMemo(() => {
    const clean = nis.trim().toLowerCase();
    if (!clean) return null;
    return students.find(
      (s) => s.nis.trim().toLowerCase() === clean && s.id !== editingStudent?.id
    );
  }, [students, nis, editingStudent]);

  // Dashboard Statistics (Actual DB Counts)
  const dashboardStats = useMemo(() => {
    const byGrade: Record<GradeLevel, number> = { X: 0, XI: 0, XII: 0 };
    const byMajor: Record<VocationalMajor, number> = { AKL: 0, DKV: 0, ATPH: 0 };
    const byClass: Record<string, { total: number; active: number }> = {};

    for (const cls of accessibleClasses) {
      byClass[cls.id] = { total: 0, active: 0 };
    }

    let totalActive = 0;
    let totalInactive = 0;

    for (const st of scopedStudents) {
      if (st.status === 'Aktif') totalActive++;
      else totalInactive++;

      const cls = schoolClasses.find((c) => c.id === st.classId);
      const stGrade = st.grade || cls?.gradeLevel;
      const stMajor = st.majorCode || cls?.major;

      if (stGrade && byGrade[stGrade] !== undefined) byGrade[stGrade]++;
      if (stMajor && byMajor[stMajor] !== undefined) byMajor[stMajor]++;
      if (!byClass[st.classId]) byClass[st.classId] = { total: 0, active: 0 };
      byClass[st.classId].total++;
      if (st.status === 'Aktif') byClass[st.classId].active++;
    }

    return {
      total: scopedStudents.length,
      totalActive,
      totalInactive,
      byGrade,
      byMajor,
      byClass,
    };
  }, [scopedStudents, accessibleClasses, schoolClasses]);

  // Filtered & Sorted Student List
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = scopedStudents.filter((s) => {
      const cls = schoolClasses.find((c) => c.id === s.classId);
      const stGrade = s.grade || cls?.gradeLevel;
      const stMajor = s.majorCode || cls?.major;

      if (filterGrade !== 'all' && stGrade !== filterGrade) return false;
      if (filterMajor !== 'all' && stMajor !== filterMajor) return false;
      if (filterClassId !== 'all' && s.classId !== filterClassId) return false;
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;

      if (q) {
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          (s.nisn || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name_desc') return b.fullName.localeCompare(a.fullName);
      if (sortBy === 'nis_asc') return a.nis.localeCompare(b.nis, undefined, { numeric: true });
      return a.fullName.localeCompare(b.fullName);
    });
  }, [
    scopedStudents,
    schoolClasses,
    filterGrade,
    filterMajor,
    filterClassId,
    filterStatus,
    searchQuery,
    sortBy,
  ]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterGrade, filterMajor, filterClassId, filterStatus, searchQuery, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, safePage, pageSize]);

  const resetFormFields = (keepClassSelection = false) => {
    setEditingStudent(null);
    setNis('');
    setNisn('');
    setFullName('');
    setGender('L');
    setAddress('');
    setParentPhone('');
    setStatus('Aktif');
    if (!keepClassSelection) {
      const cls =
        filterClassId !== 'all'
          ? schoolClasses.find((c) => c.id === filterClassId)
          : accessibleClasses[0] || schoolClasses[0];
      if (cls) {
        setGrade(cls.gradeLevel);
        setMajorCode(cls.major);
        setHomeroomTeacher(cls.homeroomTeacherName || '');
      }
      setAcademicYear(attendanceSettings.activeAcademicYear || '2026/2027');
    }
  };

  const handleOpenAddForm = () => {
    resetFormFields(false);
    setActiveView('form');
    setTimeout(() => nisInputRef.current?.focus(), 60);
  };

  const handleOpenEditForm = (st: Student) => {
    const cls = schoolClasses.find((c) => c.id === st.classId);
    setEditingStudent(st);
    setNis(st.nis);
    setNisn(st.nisn || '');
    setFullName(st.fullName);
    setGender(st.gender === 'P' ? 'P' : 'L');
    setGrade(st.grade || cls?.gradeLevel || 'X');
    setMajorCode(st.majorCode || cls?.major || 'AKL');
    setAcademicYear(st.academicYear || attendanceSettings.activeAcademicYear || '2026/2027');
    setHomeroomTeacher(st.homeroomTeacher ?? cls?.homeroomTeacherName ?? '');
    setAddress(st.address || '');
    setParentPhone(st.parentPhone || '');
    setStatus(st.status === 'Tidak Aktif' ? 'Tidak Aktif' : 'Aktif');
    setActiveView('form');
    setTimeout(() => nisInputRef.current?.focus(), 60);
  };

  const handleSaveStudentForm = async (addAnother: boolean) => {
    if (!canManage) return;
    if (!nis.trim() || !fullName.trim()) {
      addToast('error', 'Data Belum Lengkap', 'NIS dan Nama Lengkap siswa wajib diisi.');
      return;
    }
    if (!isResolvedClassAccessible) {
      addToast('error', 'Kelas Di Luar Wewenang', 'Anda hanya dapat mengelola siswa pada kelas tanggung jawab Anda.');
      return;
    }
    if (duplicateNisMatch) {
      addToast(
        'error',
        'NIS Duplikat',
        `NIS ${nis.trim()} sudah digunakan oleh ${duplicateNisMatch.fullName} (${duplicateNisMatch.className}).`
      );
      return;
    }

    setIsSaving(true);
    try {
      const targetCls = resolvedClass;
      const result = await saveStudent({
        id: editingStudent?.id || '',
        studentId: editingStudent?.id || '',
        nis: nis.trim(),
        nisn: nisn.trim(),
        fullName: fullName.trim(),
        name: fullName.trim(),
        gender,
        classId: targetCls.id,
        className: targetCls.name,
        grade: targetCls.gradeLevel,
        major: targetCls.majorFullName,
        majorCode: targetCls.major,
        academicYear: academicYear.trim() || attendanceSettings.activeAcademicYear || '2026/2027',
        homeroomTeacher: homeroomTeacher.trim(),
        address: address.trim(),
        parentPhone: parentPhone.trim(),
        status,
        createdAt: editingStudent?.createdAt,
      });

      if (!result.success) return;

      if (addAnother && !editingStudent) {
        resetFormFields(true);
        setTimeout(() => nisInputRef.current?.focus(), 50);
      } else {
        setFilterClassId(targetCls.id);
        setFilterGrade('all');
        setFilterMajor('all');
        resetFormFields(false);
        setActiveView('list');
      }
    } catch {
      // Toast already handled in AppContext
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const toggleSelectOne = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = paginatedStudents.map((s) => s.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleActiveStatus = async (st: Student) => {
    try {
      await saveStudent({
        ...st,
        status: st.status === 'Aktif' ? 'Tidak Aktif' : 'Aktif',
      });
    } catch {
      // Toast already handled in AppContext
    }
  };

  // Excel Template, Export, Import
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const templateRows = [
      [
        'NIS',
        'NISN',
        'Nama Lengkap',
        'Jenis Kelamin (L/P)',
        'Kelas',
        'Program Keahlian',
        'Tahun Pelajaran',
        'Wali Kelas',
        'Alamat',
        'No Telp Orang Tua',
        'Status (Aktif/Tidak Aktif)',
      ],
      [
        '2601099',
        '0089911223',
        'Contoh Nama Siswa',
        'L',
        'X AKL',
        'Akuntansi dan Keuangan Lembaga',
        attendanceSettings.activeAcademicYear || '2026/2027',
        'Rina Marlina, S.Pd.',
        'Pandeglang, Banten',
        '081234567890',
        'Aktif',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Template Data Siswa');
    XLSX.writeFile(wb, 'Template_Import_Data_Siswa_SMKN15.xlsx');
    addToast('success', 'Template Diunduh', 'Template Excel data siswa berhasil diunduh.');
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      [
        'No',
        'NIS',
        'NISN',
        'Nama Lengkap',
        'Jenis Kelamin',
        'Tingkat',
        'Jurusan',
        'Kelas',
        'Tahun Pelajaran',
        'Wali Kelas',
        'Alamat',
        'No Telp Orang Tua',
        'Status',
      ],
      ...filteredStudents.map((s, idx) => [
        idx + 1,
        s.nis,
        s.nisn || '-',
        s.fullName,
        s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        s.grade || '-',
        s.majorCode || s.major,
        s.className,
        s.academicYear,
        s.homeroomTeacher || '-',
        s.address || '-',
        s.parentPhone || '-',
        s.status,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    XLSX.writeFile(
      wb,
      `Data_Siswa_SMKN15_${filterClassId === 'all' ? 'Semua_Kelas' : filterClassId}.xlsx`
    );
    addToast('success', 'Export Berhasil', `${filteredStudents.length} data siswa diekspor ke Excel.`);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      const mapped: Partial<Student>[] = jsonRows.map((row) => {
        const rowNis = String(row['NIS'] || row['nis'] || '').trim();
        const rowNisn = String(row['NISN'] || row['nisn'] || '').trim();
        const rowName = String(
          row['Nama Lengkap'] || row['Nama'] || row['fullName'] || row['name'] || ''
        ).trim();
        const genderRaw = String(
          row['Jenis Kelamin (L/P)'] || row['L/P'] || row['Jenis Kelamin'] || 'L'
        )
          .trim()
          .toUpperCase();
        const rowClassName = String(row['Kelas'] || row['className'] || 'X AKL').trim();
        const rowMajor = String(row['Program Keahlian'] || row['major'] || '').trim();
        const rowYear = String(
          row['Tahun Pelajaran'] || row['academicYear'] || attendanceSettings.activeAcademicYear
        ).trim();
        const rowHomeroom = String(row['Wali Kelas'] || row['homeroomTeacher'] || '').trim();
        const rowAddress = String(row['Alamat'] || row['address'] || '').trim();
        const statusRaw = String(
          row['Status (Aktif/Tidak Aktif)'] || row['Status'] || 'Aktif'
        ).trim();
        const rowPhone = String(
          row['No Telp Orang Tua'] || row['Telepon Orang Tua'] || ''
        ).trim();

        return {
          nis: rowNis,
          nisn: rowNisn,
          fullName: rowName,
          name: rowName,
          gender: genderRaw.startsWith('P') ? 'P' : 'L',
          className: rowClassName,
          major: rowMajor,
          academicYear: rowYear,
          homeroomTeacher: rowHomeroom,
          address: rowAddress,
          status: statusRaw.toLowerCase().includes('tidak') ? 'Tidak Aktif' : 'Aktif',
          parentPhone: rowPhone,
        };
      });

      const importedCount = await batchImportStudents(mapped);
      if (importedCount === 0) {
        addToast(
          'warning',
          'Tidak Ada Data Baru Diimpor',
          'Pastikan kolom NIS (unik) dan Nama Lengkap terisi sesuai template.'
        );
      }
    } catch {
      addToast('error', 'Gagal Membaca Excel', 'Pastikan file berformat .xlsx atau .xls yang valid.');
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const yearOptions = Array.from(
    new Set([
      ...academicYears.map((y) => y.year),
      attendanceSettings.activeAcademicYear || '2026/2027',
    ])
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-cyan-700 mb-0.5">
            Absensi Kelas · SMKN 15 Pandeglang
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-600" />
            Manajemen Data Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Input data siswa secara manual berdasarkan tingkat kelas & jurusan, kelola pindah kelas tanpa menghapus riwayat absensi, dan sinkronisasi otomatis ke modul Input Absensi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Template Excel
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-cyan-600" />
            Export Excel
          </button>
          {canManage && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportExcel}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                Import Excel
              </button>
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 text-cyan-400" />
                Tambah Siswa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mode Switch Tabs */}
      {canManage && (
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 inline-flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveView('list')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'list'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Daftar & Dashboard Siswa ({dashboardStats.total})
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeView !== 'form') handleOpenAddForm();
            }}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'form'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {editingStudent ? `Edit Siswa: ${editingStudent.fullName}` : 'Form Input Siswa Manual'}
          </button>
        </div>
      )}

      {/* ======================================================= */}
      {/* DEDICATED MANUAL STUDENT INPUT FORM VIEW */}
      {/* ======================================================= */}
      {activeView === 'form' && canManage && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                {editingStudent
                  ? `Edit Data Siswa — ${editingStudent.fullName}`
                  : 'Form Input Data Siswa Manual'}
              </h2>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Pilih Tingkat Kelas dan Jurusan; kelas terbentuk otomatis dan langsung terhubung ke menu Input Absensi.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-extrabold whitespace-nowrap self-start sm:self-auto">
              Kelas Otomatis: {resolvedClass?.name || `${grade} ${majorCode}`}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveStudentForm(false);
            }}
            className="p-6 space-y-6 text-xs"
          >
            {/* Section A: Identitas Pokok Siswa */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                Identitas Siswa
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    1. Nomor Induk Siswa (NIS) *
                  </label>
                  <input
                    ref={nisInputRef}
                    type="text"
                    required
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    placeholder="Contoh: 2601008"
                    className={`w-full px-3 py-2.5 rounded-xl bg-slate-50 border font-mono font-bold focus:outline-none ${
                      duplicateNisMatch
                        ? 'border-rose-500 bg-rose-50 text-rose-900'
                        : 'border-slate-200 focus:border-cyan-500'
                    }`}
                  />
                  {duplicateNisMatch && (
                    <div className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      NIS sudah terdaftar: {duplicateNisMatch.fullName} ({duplicateNisMatch.className})
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    2. NISN
                  </label>
                  <input
                    type="text"
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    placeholder="Contoh: 0081234567"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    3. Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama lengkap sesuai Dapodik / Ijazah"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    4. Jenis Kelamin *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'L' | 'P')}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    5. Tingkat Kelas *
                  </label>
                  <select
                    value={grade}
                    onChange={(e) =>
                      handleGradeOrMajorChange(e.target.value as GradeLevel, majorCode)
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        Kelas {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    6. Jurusan / Program Keahlian *
                  </label>
                  <select
                    value={majorCode}
                    onChange={(e) =>
                      handleGradeOrMajorChange(grade, e.target.value as VocationalMajor)
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    {MAJOR_OPTIONS.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.code} — {m.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    7. Kelas Terbentuk Otomatis
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={resolvedClass?.name || `${grade} ${majorCode}`}
                    className={`w-full px-3 py-2.5 rounded-xl border font-extrabold text-center ${
                      isResolvedClassAccessible
                        ? 'bg-cyan-50 border-cyan-300 text-cyan-900'
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                  />
                  {!isResolvedClassAccessible && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      Anda tidak memiliki akses pada kelas {resolvedClass?.name}.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section B: Akademik, Wali Kelas, Kontak & Status */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                Informasi Akademik & Kontak
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    8. Tahun Pelajaran *
                  </label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    9. Nama Wali Kelas (Opsional)
                  </label>
                  <input
                    type="text"
                    value={homeroomTeacher}
                    onChange={(e) => setHomeroomTeacher(e.target.value)}
                    placeholder="Otomatis dari data kelas..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    11. No. Telepon Orang Tua (Opsional)
                  </label>
                  <input
                    type="text"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="0812..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    12. Status Siswa *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Aktif' | 'Tidak Aktif')}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  10. Alamat Siswa (Opsional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Kampung / Desa / Kecamatan / Kabupaten..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              {editingStudent && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  Mengedit nama, NIS/NISN, status keaktifan, atau memindahkan kelas siswa ini <strong>tidak akan menghapus atau mengubah</strong> riwayat absensi siswa sebelumnya.
                </div>
              )}
            </div>

            {/* Form Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => resetFormFields(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Form
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetFormFields(false);
                    setActiveView('list');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!editingStudent && (
                  <button
                    type="button"
                    disabled={isSaving || !!duplicateNisMatch || !isResolvedClassAccessible}
                    onClick={() => handleSaveStudentForm(true)}
                    className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    Simpan dan Tambah Lagi
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving || !!duplicateNisMatch || !isResolvedClassAccessible}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-cyan-400" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================= */}
      {/* DASHBOARD STATISTIK + DAFTAR SISWA VIEW */}
      {/* ======================================================= */}
      {activeView === 'list' && (
        <>
          {/* Section 8: Dashboard Data Siswa (Calculated Dynamically from Firestore) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-300">Total Siswa</div>
              <div className="text-2xl font-extrabold text-cyan-400 mt-1 tabular-nums">
                {dashboardStats.total}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 tabular-nums">
                {dashboardStats.totalActive} Aktif · {dashboardStats.totalInactive} Nonaktif
              </div>
            </div>

            {(['X', 'XI', 'XII'] as GradeLevel[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setFilterGrade(filterGrade === g ? 'all' : g);
                  setFilterClassId('all');
                }}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  filterGrade === g
                    ? 'bg-cyan-50 border-cyan-500'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-500">Siswa Kelas {g}</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                  {dashboardStats.byGrade[g]}
                </div>
                <div className="text-[10px] text-cyan-700 font-semibold mt-1">
                  Klik untuk filter
                </div>
              </button>
            ))}

            {(['AKL', 'DKV', 'ATPH'] as VocationalMajor[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setFilterMajor(filterMajor === m ? 'all' : m);
                  setFilterClassId('all');
                }}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  filterMajor === m
                    ? 'bg-cyan-50 border-cyan-500'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-500">Jurusan {m}</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                  {dashboardStats.byMajor[m]}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  X, XI & XII {m}
                </div>
              </button>
            ))}
          </div>

          {/* Rekap Jumlah Siswa Masing-masing Kelas (9 Kelas) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Rekap Jumlah Siswa per Kelas ({accessibleClasses.length} Kelas)
              </span>
              {(filterClassId !== 'all' || filterGrade !== 'all' || filterMajor !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterClassId('all');
                    setFilterGrade('all');
                    setFilterMajor('all');
                  }}
                  className="text-cyan-700 font-bold hover:underline cursor-pointer"
                >
                  Tampilkan Semua Kelas
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              {accessibleClasses.map((cls) => {
                const counts = dashboardStats.byClass[cls.id] || { total: 0, active: 0 };
                const active = filterClassId === cls.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => {
                      setFilterClassId(active ? 'all' : cls.id);
                      setFilterGrade('all');
                      setFilterMajor('all');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{cls.name}</div>
                    <div
                      className={`text-lg font-extrabold tabular-nums mt-0.5 ${
                        active ? 'text-cyan-400' : 'text-slate-900'
                      }`}
                    >
                      {counts.total}
                    </div>
                    <div
                      className={`text-[10px] tabular-nums ${
                        active ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {counts.active} aktif
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search, Filter Tingkat, Jurusan, Kelas, Sort */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="Cari nama siswa, NIS, atau NISN..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                Cari Siswa
              </button>
              {canManage && selectedStudentIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Pindah Kelas ({selectedStudentIds.length})
                </button>
              )}
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Filter Tingkat
                </label>
                <select
                  value={filterGrade}
                  onChange={(e) => {
                    setFilterGrade(e.target.value as 'all' | GradeLevel);
                    setFilterClassId('all');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700"
                >
                  <option value="all">Semua Tingkat</option>
                  <option value="X">Kelas X</option>
                  <option value="XI">Kelas XI</option>
                  <option value="XII">Kelas XII</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Filter Jurusan
                </label>
                <select
                  value={filterMajor}
                  onChange={(e) => {
                    setFilterMajor(e.target.value as 'all' | VocationalMajor);
                    setFilterClassId('all');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700"
                >
                  <option value="all">Semua Jurusan</option>
                  <option value="AKL">AKL</option>
                  <option value="DKV">DKV</option>
                  <option value="ATPH">ATPH</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Filter Kelas
                </label>
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700"
                >
                  <option value="all">Semua Kelas ({accessibleClasses.length})</option>
                  {accessibleClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Status Siswa
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value as 'all' | 'Aktif' | 'Tidak Aktif')
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700"
                >
                  <option value="all">Semua Status</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Urutkan Data
                </label>
                <div className="relative">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as 'name_asc' | 'name_desc' | 'nis_asc')
                    }
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700"
                  >
                    <option value="name_asc">Nama A–Z</option>
                    <option value="name_desc">Nama Z–A</option>
                    <option value="nis_asc">Urut NIS</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Student Directory Table (Desktop) + Card List (Mobile) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Mobile Card View (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-slate-400 space-y-2">
                  <div>Tidak ada data siswa ditemukan untuk filter saat ini.</div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={handleOpenAddForm}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-cyan-400" />
                      Tambah Siswa Manual
                    </button>
                  )}
                </div>
              ) : (
                paginatedStudents.map((st, idx) => {
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  return (
                    <div key={st.id} className="p-4 space-y-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {canManage && (
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(st.id)}
                              onChange={() => toggleSelectOne(st.id)}
                              className="mt-1 rounded accent-cyan-600 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                                #{rowNum}
                              </span>
                              <button
                                type="button"
                                onClick={() => setDetailStudent(st)}
                                className="font-bold text-slate-900 text-sm text-left underline decoration-slate-300"
                              >
                                {st.fullName}
                              </button>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              NIS: {st.nis} · NISN: {st.nisn || '-'}
                            </div>
                          </div>
                        </div>

                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => handleToggleActiveStatus(st)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-bold text-[10px] shrink-0 ${
                              st.status === 'Aktif'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {st.status}
                          </button>
                        ) : (
                          <span className="font-bold text-[11px] text-slate-700">{st.status}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600">
                        <div>
                          <span className="font-bold text-slate-800">{st.className}</span> ·{' '}
                          {st.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(st)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-bold inline-flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit Data
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTargetId(st.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-bold inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Hapus Data
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    {canManage && (
                      <th className="py-3 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={
                            paginatedStudents.length > 0 &&
                            paginatedStudents.every((s) => selectedStudentIds.includes(s.id))
                          }
                          onChange={toggleSelectAllVisible}
                          className="rounded accent-cyan-500"
                        />
                      </th>
                    )}
                    <th className="py-3 px-3 font-bold text-center w-12">No</th>
                    <th className="py-3 px-3 font-bold">NIS</th>
                    <th className="py-3 px-3 font-bold">NISN</th>
                    <th className="py-3 px-3 font-bold">Nama Siswa</th>
                    <th className="py-3 px-3 font-bold">Jenis Kelamin</th>
                    <th className="py-3 px-3 font-bold">Kelas</th>
                    <th className="py-3 px-3 font-bold text-center">Status</th>
                    {canManage && <th className="py-3 px-3 font-bold text-center">Edit</th>}
                    {canManage && <th className="py-3 px-3 font-bold text-center">Hapus</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 10 : 7} className="py-12 text-center text-slate-400">
                        <div className="space-y-2">
                          <div>Tidak ada data siswa ditemukan untuk filter saat ini.</div>
                          {canManage && (
                            <button
                              type="button"
                              onClick={handleOpenAddForm}
                              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-cyan-400" />
                              Tambah Siswa Manual
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((st, idx) => {
                      const rowNum = (safePage - 1) * pageSize + idx + 1;
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                          {canManage && (
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.includes(st.id)}
                                onChange={() => toggleSelectOne(st.id)}
                                className="rounded accent-cyan-600"
                              />
                            </td>
                          )}
                          <td className="py-3 px-3 text-center font-bold text-slate-400 tabular-nums">
                            {rowNum}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-800">
                            {st.nis}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">
                            {st.nisn || '-'}
                          </td>
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => setDetailStudent(st)}
                              className="font-bold text-slate-900 hover:text-cyan-700 underline decoration-slate-300 hover:decoration-cyan-500 text-left cursor-pointer"
                            >
                              {st.fullName}
                            </button>
                            {st.parentPhone && (
                              <div className="text-[11px] text-slate-400 font-mono">
                                Ortu: {st.parentPhone}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-700">
                            {st.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{st.className}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                              {st.major} · TP {st.academicYear}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {canManage ? (
                              <button
                                type="button"
                                onClick={() => handleToggleActiveStatus(st)}
                                title="Klik untuk ubah status Aktif/Nonaktif tanpa menghapus riwayat absensi"
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-bold text-[10px] cursor-pointer ${
                                  st.status === 'Aktif'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                }`}
                              >
                                {st.status === 'Aktif' ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                {st.status}
                              </button>
                            ) : (
                              <span className="font-bold text-slate-700">{st.status}</span>
                            )}
                          </td>
                          {canManage && (
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenEditForm(st)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                title="Edit Data Siswa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit Data
                              </button>
                            </td>
                          )}
                          {canManage && (
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setDeleteTargetId(st.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                title="Hapus Data Siswa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Hapus Data
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-slate-600">
                <span className="tabular-nums">
                  Menampilkan{' '}
                  <strong>
                    {filteredStudents.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–
                    {Math.min(safePage * pageSize, filteredStudents.length)}
                  </strong>{' '}
                  dari <strong>{filteredStudents.length}</strong> siswa
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-700"
                >
                  <option value={10}>10 / hal</option>
                  <option value={25}>25 / hal</option>
                  <option value={50}>50 / hal</option>
                  <option value={100}>100 / hal</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <span className="px-3 py-1.5 font-bold text-slate-700 tabular-nums">
                  Hal {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Move Class Modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Pindah Kelas Siswa</h3>
              <button
                onClick={() => setIsMoveModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-600">
              Pindahkan <strong>{selectedStudentIds.length} siswa</strong> terpilih ke kelas tujuan. Riwayat absensi sebelumnya tetap tersimpan.
            </p>
            <select
              value={moveTargetClassId}
              onChange={(e) => setMoveTargetClassId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold"
            >
              {schoolClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.majorFullName})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMoveModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await moveStudentsClass(selectedStudentIds, moveTargetClassId);
                    setSelectedStudentIds([]);
                  } catch {
                    // Toast already handled in AppContext
                  } finally {
                    setIsMoveModalOpen(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
              >
                Konfirmasi Pindah Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Hapus Data Siswa?"
        message="Data siswa akan dihapus dari daftar aktif kelas. Jika hanya ingin menonaktifkan siswa tanpa menghilangkan daftar siswa dan riwayat absensinya, gunakan tombol status Aktif/Tidak Aktif."
        onConfirm={async () => {
          if (deleteTargetId) {
            try {
              await deleteStudent(deleteTargetId);
            } catch {
              // Toast already handled in AppContext
            } finally {
              setDeleteTargetId(null);
            }
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />

      <StudentDetailModal student={detailStudent} onClose={() => setDetailStudent(null)} />
    </div>
  );
};
