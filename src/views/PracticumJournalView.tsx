import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { StudentAttendance, LessonJournal } from '../types';
import { compressImageFileToDataUrl } from '../utils/imageUtils';
import {
  ClipboardCheck,
  Plus,
  Search,
  Star,
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Users,
  Trash2,
  Edit2,
  X,
  ArrowLeftRight,
  BookOpen,
  Image as ImageIcon,
  Eye,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface PracticumJournalViewProps {
  onSelectMenu?: (menuId: string) => void;
}

export const PracticumJournalView: React.FC<PracticumJournalViewProps> = ({ onSelectMenu }) => {
  const {
    studentAttendances,
    lessonJournals,
    schedules,
    laboratories,
    userProfile,
    hasPermission,
    saveStudentAttendance,
    deleteStudentAttendance,
    saveLessonJournal,
    deleteLessonJournal,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'attendance' | 'journal'>('attendance');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Attendance modal state
  const [isAttendanceFormOpen, setIsAttendanceFormOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<StudentAttendance | null>(null);
  const [deleteAttId, setDeleteAttId] = useState<string | null>(null);

  // Journal modal state
  const [isJournalFormOpen, setIsJournalFormOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState<LessonJournal | null>(null);
  const [deleteJournalId, setDeleteJournalId] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);

  const canInput = hasPermission('inputPracticumJournal') || hasPermission('crudAllData');
  const canDelete = hasPermission('crudAllData') || hasPermission('manageSchedules') || hasPermission('inputPracticumJournal');

  const [attForm, setAttForm] = useState<Partial<StudentAttendance>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '07:30',
    endTime: '10:00',
    teacherName: userProfile?.displayName || '',
    subject: userProfile?.subject || '',
    classGrade: 'XI TKJ 2',
    labName: laboratories[0]?.name || 'Laboratorium Komputer',
    totalStudents: 20,
    presentCount: 20,
    sickCount: 0,
    permissionCount: 0,
    absentCount: 0,
    absentStudentNames: '',
    notes: '',
  });

  const [journalForm, setJournalForm] = useState<Partial<LessonJournal>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '07:30',
    endTime: '10:00',
    teacherName: userProfile?.displayName || '',
    subject: userProfile?.subject || '',
    classGrade: 'XI TKJ 2',
    labName: laboratories[0]?.name || 'Laboratorium Komputer',
    topic: '',
    incidentCategory: 'Kondusif / Normal',
    incidentNotes: '',
    comfortRating: 5,
    comfortFeedback: '',
    photoUrl: '',
    photoCaption: '',
  });

  // Metrics
  const totalSessions = studentAttendances.length;
  const totalPresentStudents = studentAttendances.reduce((acc, a) => acc + (a.presentCount || 0), 0);
  const totalJournals = lessonJournals.length;
  const avgComfortRating =
    lessonJournals.length > 0
      ? (lessonJournals.reduce((acc, j) => acc + (j.comfortRating || 0), 0) / lessonJournals.length).toFixed(1)
      : '0.0';
  const incidentCount = lessonJournals.filter((j) => j.incidentCategory !== 'Kondusif / Normal').length;
  const photosCount = lessonJournals.filter((j) => Boolean(j.photoUrl)).length;

  // Filters
  const filteredAttendances = studentAttendances.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      a.subject.toLowerCase().includes(q) ||
      a.teacherName.toLowerCase().includes(q) ||
      a.classGrade.toLowerCase().includes(q);
    const matchDate = !selectedDate || a.date === selectedDate;
    return matchSearch && matchDate;
  });

  const filteredJournals = lessonJournals.filter((j) => {
    const q = search.toLowerCase();
    const matchSearch =
      j.subject.toLowerCase().includes(q) ||
      j.teacherName.toLowerCase().includes(q) ||
      j.classGrade.toLowerCase().includes(q) ||
      j.topic.toLowerCase().includes(q) ||
      j.incidentNotes.toLowerCase().includes(q);
    const matchDate = !selectedDate || j.date === selectedDate;
    return matchSearch && matchDate;
  });

  const handleOpenAddAttendance = () => {
    setAttForm({
      date: new Date().toISOString().split('T')[0],
      startTime: '07:30',
      endTime: '10:00',
      teacherName: userProfile?.displayName || '',
      subject: userProfile?.subject || '',
      classGrade: 'XI DKV 1',
      labName: laboratories[0]?.name || 'Laboratorium Komputer',
      totalStudents: 20,
      presentCount: 20,
      sickCount: 0,
      permissionCount: 0,
      absentCount: 0,
      absentStudentNames: '',
      notes: '',
    });
    setEditingAttendance(null);
    setIsAttendanceFormOpen(true);
  };

  const handleApplyScheduleToAtt = (scheduleId: string) => {
    const sch = schedules.find((s) => s.id === scheduleId);
    if (!sch) return;
    setAttForm((prev) => ({
      ...prev,
      date: sch.date,
      startTime: sch.startTime,
      endTime: sch.endTime,
      teacherName: sch.teacherName,
      subject: sch.subject,
      classGrade: sch.classGrade,
      labName: sch.labName,
      totalStudents: sch.studentCount || 20,
      presentCount: sch.studentCount || 20,
    }));
  };

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attForm.teacherName || !attForm.subject || !attForm.classGrade) return;

    const present = Number(attForm.presentCount) || 0;
    const sick = Number(attForm.sickCount) || 0;
    const permission = Number(attForm.permissionCount) || 0;
    const absent = Number(attForm.absentCount) || 0;
    const total = Number(attForm.totalStudents) || present + sick + permission + absent;

    await saveStudentAttendance({
      id: editingAttendance ? editingAttendance.id : 'att-' + Date.now(),
      date: attForm.date || new Date().toISOString().split('T')[0],
      startTime: attForm.startTime || '07:30',
      endTime: attForm.endTime || '10:00',
      teacherName: attForm.teacherName,
      subject: attForm.subject,
      classGrade: attForm.classGrade,
      labName: attForm.labName || 'Laboratorium Komputer',
      totalStudents: total,
      presentCount: present,
      sickCount: sick,
      permissionCount: permission,
      absentCount: absent,
      absentStudentNames: attForm.absentStudentNames || '-',
      notes: attForm.notes || '',
    });
    setIsAttendanceFormOpen(false);
  };

  const handleOpenAddJournal = () => {
    setJournalForm({
      date: new Date().toISOString().split('T')[0],
      startTime: '07:30',
      endTime: '10:00',
      teacherName: userProfile?.displayName || '',
      subject: userProfile?.subject || '',
      classGrade: 'XI DKV 1',
      labName: laboratories[0]?.name || 'Laboratorium Komputer',
      topic: '',
      incidentCategory: 'Kondusif / Normal',
      incidentNotes: '',
      comfortRating: 5,
      comfortFeedback: '',
      photoUrl: '',
      photoCaption: '',
    });
    setEditingJournal(null);
    setIsJournalFormOpen(true);
  };

  const handleApplyScheduleToJournal = (scheduleId: string) => {
    const sch = schedules.find((s) => s.id === scheduleId);
    if (!sch) return;
    setJournalForm((prev) => ({
      ...prev,
      date: sch.date,
      startTime: sch.startTime,
      endTime: sch.endTime,
      teacherName: sch.teacherName,
      subject: sch.subject,
      classGrade: sch.classGrade,
      labName: sch.labName,
      topic: sch.purpose || prev.topic,
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 960, 0.72);
      setJournalForm((prev) => ({ ...prev, photoUrl: dataUrl }));
      addToast('success', 'Foto Siap Diunggah', 'Foto praktikum berhasil dikompres dan siap disimpan.');
    } catch (err: any) {
      addToast('error', 'Gagal Memuat Foto', err.message || 'Gunakan file JPG/PNG yang valid.');
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSubmitJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalForm.teacherName || !journalForm.subject || !journalForm.incidentNotes) return;

    await saveLessonJournal({
      id: editingJournal ? editingJournal.id : 'jrn-' + Date.now(),
      date: journalForm.date || new Date().toISOString().split('T')[0],
      startTime: journalForm.startTime || '07:30',
      endTime: journalForm.endTime || '10:00',
      teacherName: journalForm.teacherName,
      subject: journalForm.subject,
      classGrade: journalForm.classGrade || '-',
      labName: journalForm.labName || 'Laboratorium Komputer',
      topic: journalForm.topic || 'Praktikum Komputer',
      incidentCategory: journalForm.incidentCategory || 'Kondusif / Normal',
      incidentNotes: journalForm.incidentNotes,
      comfortRating: Number(journalForm.comfortRating) || 5,
      comfortFeedback: journalForm.comfortFeedback || '',
      photoUrl: journalForm.photoUrl || '',
      photoCaption: journalForm.photoCaption || '',
    });
    setIsJournalFormOpen(false);
  };

  const comfortLabels: Record<number, string> = {
    1: '1 - Sangat Kurang Nyaman',
    2: '2 - Kurang Nyaman',
    3: '3 - Cukup Nyaman',
    4: '4 - Nyaman',
    5: '5 - Sangat Nyaman & Kondusif',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <ClipboardCheck className="w-6 h-6 text-cyan-600" />
            Jurnal Pembelajaran, Absensi & Praktikum Guru
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Modul Guru Mata Pelajaran untuk input absensi siswa, catatan peristiwa pembelajaran, umpan balik kenyamanan (bintang 1–5), dan upload foto praktikum.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSelectMenu && (
            <button
              onClick={() => onSelectMenu('borrowings')}
              className="px-3.5 py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4 text-cyan-700" />
              Input Peminjaman Alat
            </button>
          )}
          {canInput && (
            <>
              <button
                onClick={handleOpenAddAttendance}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-cyan-400" />
                Input Absensi Siswa
              </button>
              <button
                onClick={handleOpenAddJournal}
                className="px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Catat Kejadian, Rating & Foto
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Sesi Absensi Tercatat</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalSessions}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">{totalPresentStudents} Total Kehadiran Siswa</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Rating Kenyamanan Lab</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1 flex items-center gap-1.5">
            {avgComfortRating}
            <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Skala 1–5 dari {totalJournals} ulasan guru</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Catatan Kejadian / Kendala</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{incidentCount}</div>
          <div className="text-[11px] text-amber-600 font-semibold mt-0.5">Perlu perhatian / evaluasi teknis</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Foto Praktikum Terunggah</div>
          <div className="text-2xl font-extrabold text-cyan-700 mt-1">{photosCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Dokumentasi kegiatan belajar</div>
        </div>
      </div>

      {/* Navigation Tabs + Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-cyan-400" />
            Absensi Siswa ({studentAttendances.length})
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'journal'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            Jurnal Kejadian, Rating 1–5 & Foto ({lessonJournals.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari mapel, guru, kelas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-xs text-cyan-700 font-bold hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: STUDENT ATTENDANCE TABLE */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white border-b border-slate-800">
                  <th className="py-3 px-4 font-bold text-center w-12">No</th>
                  <th className="py-3 px-4 font-bold">Tanggal & Jam</th>
                  <th className="py-3 px-4 font-bold">Guru Pengampu & Mapel</th>
                  <th className="py-3 px-4 font-bold">Kelas</th>
                  <th className="py-3 px-4 font-bold text-center">Hadir</th>
                  <th className="py-3 px-4 font-bold text-center">S / I / A</th>
                  <th className="py-3 px-4 font-bold">Ket. Siswa Tidak Hadir & Catatan</th>
                  {canInput && <th className="py-3 px-4 font-bold text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendances.length > 0 ? (
                  filteredAttendances.map((att, idx) => (
                    <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{att.date}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {att.startTime} - {att.endTime} WIB
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{att.subject}</div>
                        <div className="text-[11px] text-cyan-700 font-semibold">{att.teacherName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px]">
                          {att.classGrade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold">
                          {att.presentCount} / {att.totalStudents}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[11px] font-semibold text-slate-600">
                        {att.sickCount} / {att.permissionCount} / {att.absentCount}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-700">{att.absentStudentNames || '-'}</div>
                        {att.notes && <div className="text-[10px] text-slate-400 mt-0.5">{att.notes}</div>}
                      </td>
                      {canInput && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingAttendance(att);
                                setAttForm(att);
                                setIsAttendanceFormOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              title="Edit Absensi"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => setDeleteAttId(att.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Hapus Absensi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                      Belum ada data absensi siswa praktikum.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LESSON JOURNALS (INCIDENTS, 1-5 STAR RATING, PHOTOS) */}
      {activeTab === 'journal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredJournals.length > 0 ? (
            filteredJournals.map((j) => {
              let catBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
              if (j.incidentCategory === 'Kendala Teknis') catBadge = 'bg-amber-50 text-amber-800 border-amber-200';
              if (j.incidentCategory === 'Insiden / Perlu Perhatian') catBadge = 'bg-rose-50 text-rose-800 border-rose-200';

              return (
                <div
                  key={j.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Photo Header if uploaded */}
                    {j.photoUrl ? (
                      <div
                        className="relative h-52 bg-slate-900 overflow-hidden cursor-pointer group"
                        onClick={() => setPreviewPhotoUrl(j.photoUrl || null)}
                      >
                        <img
                          src={j.photoUrl}
                          alt={j.photoCaption || j.topic}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${catBadge}`}>
                            {j.incidentCategory}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 text-amber-300 text-xs font-extrabold flex items-center gap-1 border border-slate-700">
                          {j.comfortRating} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                          <span className="text-[11px] font-medium truncate">
                            {j.photoCaption || 'Foto Kegiatan Praktikum'}
                          </span>
                          <span className="text-[10px] bg-white/20 backdrop-blur px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                            <Eye className="w-3 h-3" /> Perbesar
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 pt-5 flex items-center justify-between">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${catBadge}`}>
                          {j.incidentCategory}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= j.comfortRating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Body */}
                    <div className="p-5 space-y-3 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {j.date}
                          {j.startTime && ` • ${j.startTime}-${j.endTime}`}
                        </span>
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {j.classGrade}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900">{j.subject}</h3>
                        <div className="text-[11px] text-cyan-700 font-semibold">
                          Guru: {j.teacherName} • Topik: {j.topic || '-'}
                        </div>
                      </div>

                      {/* Incident Notes */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                          {j.incidentCategory === 'Kondusif / Normal' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          Peristiwa / Kejadian Pembelajaran
                        </div>
                        <p className="text-slate-700 leading-relaxed">{j.incidentNotes}</p>
                      </div>

                      {/* 1-5 Star Comfort Feedback */}
                      <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-amber-800 uppercase">
                            Umpan Balik Kenyamanan Belajar
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= j.comfortRating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-700 leading-relaxed">
                          {j.comfortFeedback || comfortLabels[j.comfortRating]}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  {canInput && (
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                      <button
                        onClick={() => {
                          setEditingJournal(j);
                          setJournalForm(j);
                          setIsJournalFormOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-200 font-semibold flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setDeleteJournalId(j.id)}
                          className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-14 text-center bg-white rounded-3xl border border-slate-200">
              <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700">Belum Ada Jurnal Pembelajaran & Foto Praktikum</div>
              <div className="text-xs text-slate-400 mt-1">
                Klik tombol &ldquo;Catat Kejadian, Rating &amp; Foto&rdquo; untuk mengisi jurnal praktikum.
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: INPUT ABSENSI SISWA */}
      {isAttendanceFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                {editingAttendance ? 'Edit Absensi Siswa Praktikum' : 'Input Absensi Siswa Praktikum'}
              </h3>
              <button onClick={() => setIsAttendanceFormOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAttendance} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Quick Schedule Fill */}
              {schedules.length > 0 && !editingAttendance && (
                <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-100">
                  <label className="font-bold text-cyan-900 block mb-1">Isi Cepat Dari Jadwal Lab (Opsional):</label>
                  <select
                    onChange={(e) => handleApplyScheduleToAtt(e.target.value)}
                    defaultValue=""
                    className="w-full px-3 py-2 rounded-xl bg-white border border-cyan-200 font-semibold text-slate-700"
                  >
                    <option value="">-- Pilih Jadwal Praktikum --</option>
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.date} ({s.startTime}-{s.endTime}) • {s.classGrade} - {s.subject} ({s.teacherName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={attForm.date || ''}
                    onChange={(e) => setAttForm({ ...attForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jam Mulai *</label>
                  <input
                    type="time"
                    required
                    value={attForm.startTime || '07:30'}
                    onChange={(e) => setAttForm({ ...attForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jam Selesai *</label>
                  <input
                    type="time"
                    required
                    value={attForm.endTime || '10:00'}
                    onChange={(e) => setAttForm({ ...attForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Guru Mapel *</label>
                  <input
                    type="text"
                    required
                    value={attForm.teacherName || ''}
                    onChange={(e) => setAttForm({ ...attForm, teacherName: e.target.value })}
                    placeholder="Ahmad Fauzi, S.T."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kelas *</label>
                  <input
                    type="text"
                    required
                    value={attForm.classGrade || ''}
                    onChange={(e) => setAttForm({ ...attForm, classGrade: e.target.value })}
                    placeholder="XI DKV 1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mata Pelajaran *</label>
                <input
                  type="text"
                  required
                  value={attForm.subject || ''}
                  onChange={(e) => setAttForm({ ...attForm, subject: e.target.value })}
                  placeholder="Desain Grafis Percetakan / Pemrograman Web"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-5 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total</label>
                  <input
                    type="number"
                    min={0}
                    value={attForm.totalStudents ?? 20}
                    onChange={(e) => setAttForm({ ...attForm, totalStudents: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="font-semibold text-emerald-700 block mb-1">Hadir</label>
                  <input
                    type="number"
                    min={0}
                    value={attForm.presentCount ?? 20}
                    onChange={(e) => setAttForm({ ...attForm, presentCount: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 font-bold text-center text-emerald-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-amber-700 block mb-1">Sakit</label>
                  <input
                    type="number"
                    min={0}
                    value={attForm.sickCount ?? 0}
                    onChange={(e) => setAttForm({ ...attForm, sickCount: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-amber-50 border border-amber-200 font-bold text-center text-amber-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-blue-700 block mb-1">Izin</label>
                  <input
                    type="number"
                    min={0}
                    value={attForm.permissionCount ?? 0}
                    onChange={(e) => setAttForm({ ...attForm, permissionCount: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-blue-50 border border-blue-200 font-bold text-center text-blue-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-rose-700 block mb-1">Alfa</label>
                  <input
                    type="number"
                    min={0}
                    value={attForm.absentCount ?? 0}
                    onChange={(e) => setAttForm({ ...attForm, absentCount: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-rose-50 border border-rose-200 font-bold text-center text-rose-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Daftar Nama Siswa Tidak Hadir (S/I/A)</label>
                <input
                  type="text"
                  value={attForm.absentStudentNames || ''}
                  onChange={(e) => setAttForm({ ...attForm, absentStudentNames: e.target.value })}
                  placeholder="Contoh: Budi Santoso (Sakit), Siti (Izin) — kosongkan jika hadir semua"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={attForm.notes || ''}
                  onChange={(e) => setAttForm({ ...attForm, notes: e.target.value })}
                  placeholder="Keterangan pelaksanaan absensi di laboratorium..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAttendanceFormOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
                >
                  Simpan Absensi Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INPUT JURNAL KEJADIAN, BINTANG 1-5 & UPLOAD FOTO PRAKTIKUM */}
      {isJournalFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-cyan-400" />
                {editingJournal ? 'Edit Jurnal Pembelajaran & Foto' : 'Jurnal Kejadian, Kenyamanan (1–5 Bintang) & Foto Praktikum'}
              </h3>
              <button onClick={() => setIsJournalFormOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitJournal} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Quick Schedule Fill */}
              {schedules.length > 0 && !editingJournal && (
                <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-100">
                  <label className="font-bold text-cyan-900 block mb-1">Ambil Data Dari Jadwal Lab (Opsional):</label>
                  <select
                    onChange={(e) => handleApplyScheduleToJournal(e.target.value)}
                    defaultValue=""
                    className="w-full px-3 py-2 rounded-xl bg-white border border-cyan-200 font-semibold text-slate-700"
                  >
                    <option value="">-- Pilih Jadwal Praktikum --</option>
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.date} ({s.startTime}-{s.endTime}) • {s.classGrade} - {s.subject}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={journalForm.date || ''}
                    onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Guru *</label>
                  <input
                    type="text"
                    required
                    value={journalForm.teacherName || ''}
                    onChange={(e) => setJournalForm({ ...journalForm, teacherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kelas *</label>
                  <input
                    type="text"
                    required
                    value={journalForm.classGrade || ''}
                    onChange={(e) => setJournalForm({ ...journalForm, classGrade: e.target.value })}
                    placeholder="XI DKV 1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mata Pelajaran *</label>
                  <input
                    type="text"
                    required
                    value={journalForm.subject || ''}
                    onChange={(e) => setJournalForm({ ...journalForm, subject: e.target.value })}
                    placeholder="Desain Komunikasi Visual"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Materi / Topik Praktikum</label>
                  <input
                    type="text"
                    value={journalForm.topic || ''}
                    onChange={(e) => setJournalForm({ ...journalForm, topic: e.target.value })}
                    placeholder="Praktikum CorelDRAW & Layout Poster"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              {/* Peristiwa / Kejadian Pembelajaran */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="font-bold text-slate-900">Catatan Peristiwa / Kejadian Saat Pembelajaran *</label>
                  <select
                    value={journalForm.incidentCategory || 'Kondusif / Normal'}
                    onChange={(e) => setJournalForm({ ...journalForm, incidentCategory: e.target.value as any })}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold text-xs"
                  >
                    <option value="Kondusif / Normal">Kondusif / Normal</option>
                    <option value="Kendala Teknis">Kendala Teknis</option>
                    <option value="Insiden / Perlu Perhatian">Insiden / Perlu Perhatian</option>
                  </select>
                </div>
                <textarea
                  rows={3}
                  required
                  value={journalForm.incidentNotes || ''}
                  onChange={(e) => setJournalForm({ ...journalForm, incidentNotes: e.target.value })}
                  placeholder="Tuliskan peristiwa penting, kendala PC/jaringan, atau kejadian selama proses belajar mengajar di laboratorium..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                />
              </div>

              {/* 1-5 Star Comfort Feedback */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-amber-950 block">Umpan Balik Kenyamanan Belajar (Bintang 1–5) *</label>
                    <span className="text-[11px] text-amber-800">
                      {comfortLabels[journalForm.comfortRating || 5]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= (journalForm.comfortRating || 5);
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setJournalForm({ ...journalForm, comfortRating: star })}
                          className="p-1.5 rounded-xl bg-white border border-amber-200 hover:scale-110 transition-transform cursor-pointer"
                          title={`Beri ${star} Bintang`}
                        >
                          <Star
                            className={`w-6 h-6 ${
                              active ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={journalForm.comfortFeedback || ''}
                  onChange={(e) => setJournalForm({ ...journalForm, comfortFeedback: e.target.value })}
                  placeholder="Ulasan kenyamanan suhu AC, kebersihan ruangan, kelayakan PC, dan fasilitas lab..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-amber-200"
                />
              </div>

              {/* Upload Foto Praktikum */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900">Upload Foto Saat Praktikum</label>
                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    {isUploadingPhoto ? 'Memproses Foto...' : 'Pilih / Ambil Foto'}
                  </button>
                </div>

                {journalForm.photoUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 h-44">
                    <img
                      src={journalForm.photoUrl}
                      alt="Preview Praktikum"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setJournalForm({ ...journalForm, photoUrl: '' })}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold"
                    >
                      Hapus Foto
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Atau Tempel URL Foto</label>
                    <input
                      type="text"
                      value={journalForm.photoUrl?.startsWith('data:') ? '' : journalForm.photoUrl || ''}
                      onChange={(e) => setJournalForm({ ...journalForm, photoUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Keterangan Foto</label>
                    <input
                      type="text"
                      value={journalForm.photoCaption || ''}
                      onChange={(e) => setJournalForm({ ...journalForm, photoCaption: e.target.value })}
                      placeholder="Contoh: Siswa XI DKV 1 praktik CorelDRAW"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsJournalFormOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
                >
                  Simpan Jurnal & Foto Praktikum
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-cyan-400 flex items-center gap-1 text-xs font-bold"
            >
              <X className="w-5 h-5" /> Tutup
            </button>
            <img
              src={previewPhotoUrl}
              alt="Foto Praktikum"
              className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Confirm Deletions */}
      <ConfirmModal
        isOpen={!!deleteAttId}
        title="Hapus Data Absensi Siswa?"
        message="Catatan absensi siswa praktikum ini akan dihapus permanen."
        onConfirm={async () => {
          if (deleteAttId) {
            await deleteStudentAttendance(deleteAttId);
            setDeleteAttId(null);
          }
        }}
        onCancel={() => setDeleteAttId(null)}
      />

      <ConfirmModal
        isOpen={!!deleteJournalId}
        title="Hapus Jurnal Pembelajaran?"
        message="Catatan kejadian, umpan balik bintang, dan foto praktikum ini akan dihapus permanen."
        onConfirm={async () => {
          if (deleteJournalId) {
            await deleteLessonJournal(deleteJournalId);
            setDeleteJournalId(null);
          }
        }}
        onCancel={() => setDeleteJournalId(null)}
      />
    </div>
  );
};
