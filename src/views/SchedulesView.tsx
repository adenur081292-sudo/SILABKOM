import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Schedule, ScheduleStatus } from '../types';
import {
  CalendarCheck2,
  Plus,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar,
  Filter,
  Search,
  X,
  Play,
  Check,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const SchedulesView: React.FC = () => {
  const {
    schedules,
    laboratories,
    saveSchedule,
    deleteSchedule,
    hasPermission,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedLabId, setSelectedLabId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canManage = hasPermission('manageSchedules') || hasPermission('crudAllData');

  const [formData, setFormData] = useState<Partial<Schedule>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '07:30',
    endTime: '09:45',
    teacherName: '',
    subject: '',
    classGrade: 'XII RPL 1',
    vocationalMajor: 'Rekayasa Perangkat Lunak',
    labId: laboratories[0]?.id || 'lab-komputer',
    labName: laboratories[0]?.name || 'Laboratorium Komputer',
    studentCount: 36,
    purpose: '',
    status: 'Disetujui',
    notes: '',
  });

  const filteredSchedules = schedules.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.subject.toLowerCase().includes(q) ||
      s.teacherName.toLowerCase().includes(q) ||
      s.classGrade.toLowerCase().includes(q) ||
      s.labName.toLowerCase().includes(q);

    const matchLab = selectedLabId === 'all' || s.labId === selectedLabId;
    const matchStatus = selectedStatus === 'all' || s.status === selectedStatus;
    const matchDate = !selectedDate || s.date === selectedDate;

    return matchSearch && matchLab && matchStatus && matchDate;
  });

  const handleOpenAdd = () => {
    const targetLab = laboratories[0];
    setFormData({
      date: new Date().toISOString().split('T')[0],
      startTime: '07:30',
      endTime: '10:00',
      teacherName: '',
      subject: '',
      classGrade: 'X RPL 1',
      vocationalMajor: 'Rekayasa Perangkat Lunak',
      labId: targetLab?.id || 'lab-komputer',
      labName: targetLab?.name || 'Laboratorium Komputer',
      studentCount: 20,
      purpose: 'Praktikum Komputer & Multimedia',
      status: 'Disetujui',
      notes: '',
    });
    setEditingSchedule(null);
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s: Schedule) => {
    setEditingSchedule(s);
    setFormData(s);
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.startTime || !formData.endTime || !formData.teacherName) return;

    if (formData.startTime >= formData.endTime) {
      setErrorMessage('Jam selesai harus lebih akhir dari jam mulai!');
      return;
    }

    const chosenLab = laboratories.find((l) => l.id === formData.labId);
    const labName = chosenLab ? chosenLab.name : formData.labName || 'Laboratorium Komputer';

    const res = await saveSchedule({
      id: editingSchedule ? editingSchedule.id : 'sch-' + Date.now(),
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      teacherName: formData.teacherName,
      subject: formData.subject || 'Praktikum Komputer',
      classGrade: formData.classGrade || 'XII',
      vocationalMajor: formData.vocationalMajor || 'Kejuruan',
      labId: formData.labId || 'lab-komputer',
      labName,
      studentCount: Number(formData.studentCount) || 30,
      purpose: formData.purpose || 'Praktikum Rutin',
      status: (formData.status as ScheduleStatus) || 'Disetujui',
      notes: formData.notes || '',
    });

    if (res.success) {
      setIsFormOpen(false);
      setErrorMessage(null);
    } else {
      setErrorMessage(res.error || 'Terjadi bentrok jadwal.');
    }
  };

  const handleQuickStatusChange = async (schedule: Schedule, newStatus: ScheduleStatus) => {
    await saveSchedule({ ...schedule, status: newStatus });
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await deleteSchedule(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <CalendarCheck2 className="w-6 h-6 text-cyan-600" />
            Jadwal Penggunaan Laboratorium
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Penjadwalan praktikum komputer antarkelas & guru dengan sistem pencegah bentrok waktu ruangan otomatis.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-cyan-400" />
          Ajukan / Tambah Jadwal
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari guru, mapel, kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Date filter */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="px-2 py-2 text-xs text-slate-400 hover:text-slate-600"
              title="Reset Tanggal"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Room filter */}
          <select
            value={selectedLabId}
            onChange={(e) => setSelectedLabId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
          >
            <option value="all">Semua Ruang Lab</option>
            {laboratories.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
          >
            <option value="all">Semua Status</option>
            <option value="Disetujui">Disetujui</option>
            <option value="Sedang Berlangsung">Sedang Berlangsung</option>
            <option value="Menunggu">Menunggu Verifikasi</option>
            <option value="Selesai">Selesai</option>
            <option value="Dibatalkan">Dibatalkan</option>
          </select>
        </div>
      </div>

      {/* Schedules List / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSchedules.length > 0 ? (
          filteredSchedules.map((sch) => {
            let statusColor = 'bg-slate-100 text-slate-700 border-slate-200';
            if (sch.status === 'Disetujui') statusColor = 'bg-blue-50 text-blue-800 border-blue-200';
            if (sch.status === 'Sedang Berlangsung') statusColor = 'bg-emerald-50 text-emerald-800 border-emerald-200 animate-pulse';
            if (sch.status === 'Menunggu') statusColor = 'bg-amber-50 text-amber-800 border-amber-200';
            if (sch.status === 'Selesai') statusColor = 'bg-slate-100 text-slate-600 border-slate-200';
            if (sch.status === 'Dibatalkan') statusColor = 'bg-rose-50 text-rose-800 border-rose-200';

            return (
              <div
                key={sch.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar with Time and Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-mono">
                      <Clock className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                      <span>{sch.startTime} - {sch.endTime} WIB</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}>
                      {sch.status}
                    </span>
                  </div>

                  {/* Date & Room */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sch.date}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1 font-semibold text-cyan-800 truncate">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{sch.labName}</span>
                    </div>
                  </div>

                  {/* Subject and Class */}
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{sch.subject}</h3>
                    <div className="text-xs font-semibold text-slate-700 mt-0.5">
                      {sch.classGrade} ({sch.vocationalMajor})
                    </div>
                  </div>

                  {/* Teacher & Students */}
                  <div className="bg-slate-50 p-3 rounded-2xl space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-400 text-[10px]">Guru Pengampu:</span>
                      <span className="font-bold">{sch.teacherName}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-400 text-[10px]">Peserta Praktik:</span>
                      <span className="font-bold flex items-center gap-1">
                        <Users className="w-3 h-3 text-cyan-600" />
                        {sch.studentCount} Siswa
                      </span>
                    </div>
                  </div>

                  {sch.purpose && (
                    <p className="text-[11px] text-slate-500 italic line-clamp-2">
                      Keperluan: {sch.purpose}
                    </p>
                  )}
                </div>

                {/* Quick Status Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-4 text-xs">
                  {canManage ? (
                    <div className="flex items-center gap-1">
                      {sch.status === 'Disetujui' && (
                        <button
                          onClick={() => handleQuickStatusChange(sch, 'Sedang Berlangsung')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Mulai
                        </button>
                      )}
                      {sch.status === 'Sedang Berlangsung' && (
                        <button
                          onClick={() => handleQuickStatusChange(sch, 'Selesai')}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Selesai
                        </button>
                      )}
                      {sch.status === 'Menunggu' && (
                        <button
                          onClick={() => handleQuickStatusChange(sch, 'Disetujui')}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[10px]"
                        >
                          Setujui
                        </button>
                      )}
                    </div>
                  ) : <div />}

                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(sch)}
                        className="text-slate-600 hover:text-slate-900 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(sch.id)}
                        className="text-rose-600 hover:text-rose-700 font-medium"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200">
            <CalendarCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">Belum Ada Jadwal Pada Filter Tersebut</div>
            <div className="text-xs text-slate-400 mt-1">Silakan ajukan atau tambahkan jadwal praktikum baru.</div>
          </div>
        )}
      </div>

      {/* Add / Edit Schedule Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-cyan-400" />
                {editingSchedule ? 'Edit Jadwal Praktikum' : 'Ajukan Jadwal Penggunaan Lab'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Praktikum *</label>
                  <input
                    type="date"
                    required
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jam Mulai *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime || '07:30'}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jam Selesai *</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime || '10:00'}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ruangan Laboratorium *</label>
                <select
                  value={formData.labId || ''}
                  onChange={(e) => {
                    const lab = laboratories.find((l) => l.id === e.target.value);
                    setFormData({
                      ...formData,
                      labId: e.target.value,
                      labName: lab ? lab.name : '',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                >
                  {laboratories.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Guru Pengampu *</label>
                  <input
                    type="text"
                    required
                    value={formData.teacherName || ''}
                    onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                    placeholder="Ade Nur, S.Kom."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mata Pelajaran *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject || ''}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Pemrograman Web & Mobile"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kelas *</label>
                  <input
                    type="text"
                    required
                    value={formData.classGrade || ''}
                    onChange={(e) => setFormData({ ...formData, classGrade: e.target.value })}
                    placeholder="XII RPL 1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Program Keahlian</label>
                  <input
                    type="text"
                    value={formData.vocationalMajor || ''}
                    onChange={(e) => setFormData({ ...formData, vocationalMajor: e.target.value })}
                    placeholder="RPL / TKJ / DKV"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jumlah Siswa</label>
                  <input
                    type="number"
                    value={formData.studentCount || 36}
                    onChange={(e) => setFormData({ ...formData, studentCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Materi / Keperluan Praktikum</label>
                <input
                  type="text"
                  value={formData.purpose || ''}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Praktikum Coding Express API dan Database..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              {canManage && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Persetujuan</label>
                  <select
                    value={formData.status || 'Disetujui'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    <option value="Disetujui">Disetujui</option>
                    <option value="Sedang Berlangsung">Sedang Berlangsung</option>
                    <option value="Menunggu">Menunggu Verifikasi</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Dibatalkan">Dibatalkan</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
                >
                  {editingSchedule ? 'Simpan Jadwal' : 'Simpan & Validasi Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Hapus Jadwal Penggunaan Lab?"
        message="Jadwal sesi praktikum ini akan dihapus dari sistem."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
