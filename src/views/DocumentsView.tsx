import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LabDocument, LabDocType, Guest } from '../types';
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Printer,
  Trash2,
  Edit2,
  X,
  UserCheck,
  CheckCircle2,
  Clock,
  MapPin,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { MasterKopSurat } from '../components/MasterKopSurat';

export const DocumentsView: React.FC = () => {
  const {
    documents,
    guests,
    saveDocument,
    deleteDocument,
    saveGuest,
    deleteGuest,
    hasPermission,
    settings,
    laboratories,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'docs' | 'guests'>('docs');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [previewDoc, setPreviewDoc] = useState<LabDocument | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LabDocument | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Guestbook modal state
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestForm, setGuestForm] = useState<Partial<Guest>>({
    visitorName: '',
    roleOrClass: 'Siswa',
    institution: 'SMKN 15 Pandeglang',
    purpose: 'Praktikum Komputer Mandiri',
    labRoom: laboratories[0]?.name || 'Laboratorium Komputer',
    computerUsed: 'PC-01',
    notes: '',
  });

  const canManage = hasPermission('manageActivitiesDocs') || hasPermission('crudAllData');

  const docTypes: LabDocType[] = [
    'Tata Tertib',
    'SOP Penggunaan Komputer',
    'SOP Peminjaman',
    'SOP Pemeliharaan',
    'Jadwal Pemeliharaan',
    'Berita Acara',
    'Form Pemeriksaan',
    'Daftar Kebutuhan',
    'Lainnya',
  ];

  const [formData, setFormData] = useState<Partial<LabDocument>>({
    title: '',
    docType: 'Tata Tertib',
    documentNumber: '',
    publishDate: new Date().toISOString().split('T')[0],
    content: '',
    author: 'Kepala Laboratorium Komputer',
    status: 'Aktif',
  });

  const filteredDocs = documents.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = d.title.toLowerCase().includes(q) || (d.documentNumber && d.documentNumber.toLowerCase().includes(q));
    const matchType = selectedType === 'all' || d.docType === selectedType;
    return matchSearch && matchType;
  });

  const handleOpenAdd = () => {
    setFormData({
      title: '',
      docType: 'SOP Penggunaan Komputer',
      documentNumber: `SMKN15/LAB/SOP/${new Date().getFullYear()}/${String(documents.length + 1).padStart(3, '0')}`,
      publishDate: new Date().toISOString().split('T')[0],
      content: '',
      author: settings.headOfLabName || 'Kepala Laboratorium',
      status: 'Aktif',
    });
    setEditingDoc(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    await saveDocument({
      id: editingDoc ? editingDoc.id : 'doc-' + Date.now(),
      title: formData.title,
      docType: (formData.docType as LabDocType) || 'Tata Tertib',
      documentNumber: formData.documentNumber || `SMKN15/DOC/${Date.now()}`,
      publishDate: formData.publishDate || new Date().toISOString().split('T')[0],
      content: formData.content,
      author: formData.author || 'Kepala Lab',
      status: formData.status as any || 'Aktif',
    });

    setIsFormOpen(false);
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestForm.visitorName) return;

    await saveGuest({
      id: 'gst-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      visitorName: guestForm.visitorName,
      roleOrClass: guestForm.roleOrClass || 'Siswa',
      institution: guestForm.institution || 'SMKN 15 Pandeglang',
      purpose: guestForm.purpose || 'Praktikum',
      labRoom: guestForm.labRoom || 'Laboratorium Komputer',
      computerUsed: guestForm.computerUsed || '-',
      notes: guestForm.notes || '',
    });

    setIsGuestModalOpen(false);
    setGuestForm({
      visitorName: '',
      roleOrClass: 'Siswa',
      institution: 'SMKN 15 Pandeglang',
      purpose: '',
      labRoom: laboratories[0]?.name || 'Laboratorium Komputer',
      computerUsed: '',
      notes: '',
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await deleteDocument(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-cyan-600" />
            Administrasi Laboratorium Komputer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan Tata Tertib, SOP Penggunaan & Peminjaman, Berita Acara, Formulir Pemeriksaan, dan Buku Tamu/Kunjungan Siswa.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsGuestModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            Isi Buku Tamu / Kunjungan
          </button>
          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              Buat Dokumen / SOP
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('docs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'docs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Dokumen SOP & Regulasi ({documents.length})
        </button>
        <button
          onClick={() => setActiveTab('guests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'guests'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Buku Tamu & Penggunaan Lab ({guests.length})
        </button>
      </div>

      {/* TAB 1: Documents & SOPs */}
      {activeTab === 'docs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari judul dokumen atau nomor surat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
            >
              <option value="all">Semua Jenis Dokumen</option>
              {docTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.map((docItem) => (
              <div
                key={docItem.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-100">
                      {docItem.docType}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{docItem.publishDate}</span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{docItem.title}</h3>
                    {docItem.documentNumber && (
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {docItem.documentNumber}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {docItem.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-4 text-xs">
                  <span className="text-[10px] text-slate-500">Penyusun: {docItem.author}</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewDoc(docItem)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px]"
                    >
                      Buka Dokumen
                    </button>
                    {canManage && (
                      <button
                        onClick={() => setDeleteTargetId(docItem.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Guestbook & Usage Logs */}
      {activeTab === 'guests' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Buku Kunjungan & Presensi Praktik Mandiri</h3>
            <span className="text-xs text-slate-500">{guests.length} kunjungan tercatat</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-3 px-4 font-bold text-center w-12">No</th>
                  <th className="py-3 px-4 font-bold">Waktu & Tanggal</th>
                  <th className="py-3 px-4 font-bold">Nama Pengunjung</th>
                  <th className="py-3 px-4 font-bold">Kelas / Instansi</th>
                  <th className="py-3 px-4 font-bold">Ruangan & PC</th>
                  <th className="py-3 px-4 font-bold">Keperluan</th>
                  {canManage && <th className="py-3 px-4 font-bold text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guests.length > 0 ? (
                  guests.map((g, idx) => (
                    <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{g.date}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{g.time} WIB</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{g.visitorName}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {g.roleOrClass} {g.institution ? `(${g.institution})` : ''}
                      </td>
                      <td className="py-3 px-4 font-semibold text-cyan-800">
                        {g.labRoom} {g.computerUsed ? `• ${g.computerUsed}` : ''}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{g.purpose}</td>
                      {canManage && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => deleteGuest(g.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                      Belum ada pengunjung yang mengisi buku tamu lab.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Document Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-cyan-400">{previewDoc.docType}</span>
                <h3 className="font-bold text-base">{previewDoc.title}</h3>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official School Letterhead and Text Content */}
            <div className="max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible">
              <div className="printable-document p-6 sm:p-8 space-y-6 text-xs bg-white">
                <MasterKopSurat />

                <div className="text-center">
                  <h2 className="text-sm font-bold uppercase tracking-wider">{previewDoc.title}</h2>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Nomor: {previewDoc.documentNumber || '-'} | Berlaku: {previewDoc.publishDate}
                  </div>
                </div>

                <div className="whitespace-pre-line text-slate-800 leading-relaxed font-sans text-xs bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  {previewDoc.content}
                </div>

                <div className="grid grid-cols-2 text-center pt-8 text-xs">
                  <div>
                    <div>Mengetahui,</div>
                    <div className="font-semibold">Kepala SMKN 15 Pandeglang</div>
                    <div className="mt-14 font-bold underline">{settings.principalName}</div>
                    <div className="text-[10px] text-slate-500">NIP. {settings.principalNip}</div>
                  </div>
                  <div>
                    <div>Pandeglang, {previewDoc.publishDate}</div>
                    <div className="font-semibold">{previewDoc.author}</div>
                    <div className="mt-14 font-bold underline">{settings.headOfLabName}</div>
                    <div className="text-[10px] text-slate-500">NIP. {settings.headOfLabNip}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-2 text-xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                Cetak Dokumen
              </button>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Tambah / Edit Dokumen Administrasi Lab
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Dokumen *</label>
                  <select
                    value={formData.docType || 'Tata Tertib'}
                    onChange={(e) => setFormData({ ...formData, docType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    {docTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nomor Dokumen / Surat</label>
                  <input
                    type="text"
                    value={formData.documentNumber || ''}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Judul Dokumen *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Standar Operasional Prosedur Pemeliharaan PC"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Isi Dokumen / Butir Pasal / Prosedur *</label>
                <textarea
                  rows={8}
                  required
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Tuliskan butir tata tertib, langkah SOP, atau berita acara..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 leading-relaxed font-mono text-[11px]"
                />
              </div>

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
                  Simpan Dokumen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guest Check-in Modal */}
      {isGuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-cyan-800 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-cyan-300" />
                Buku Tamu / Presensi Praktik Mandiri
              </h3>
              <button onClick={() => setIsGuestModalOpen(false)} className="text-cyan-200 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuestSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap Pengunjung *</label>
                <input
                  type="text"
                  required
                  value={guestForm.visitorName || ''}
                  onChange={(e) => setGuestForm({ ...guestForm, visitorName: e.target.value })}
                  placeholder="Nama Siswa / Guru / Tamu Instansi"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kelas / Jabatan</label>
                  <input
                    type="text"
                    value={guestForm.roleOrClass || ''}
                    onChange={(e) => setGuestForm({ ...guestForm, roleOrClass: e.target.value })}
                    placeholder="XII RPL 1 / Guru"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Asal Sekolah/Instansi</label>
                  <input
                    type="text"
                    value={guestForm.institution || ''}
                    onChange={(e) => setGuestForm({ ...guestForm, institution: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ruangan Lab</label>
                  <select
                    value={guestForm.labRoom || ''}
                    onChange={(e) => setGuestForm({ ...guestForm, labRoom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  >
                    {laboratories.map((l) => (
                      <option key={l.id} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nomor PC Digunakan</label>
                  <input
                    type="text"
                    value={guestForm.computerUsed || ''}
                    onChange={(e) => setGuestForm({ ...guestForm, computerUsed: e.target.value })}
                    placeholder="PC-12"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tujuan / Keperluan Kunjungan</label>
                <input
                  type="text"
                  value={guestForm.purpose || ''}
                  onChange={(e) => setGuestForm({ ...guestForm, purpose: e.target.value })}
                  placeholder="Praktikum mandiri coding / Penelusuran materi"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGuestModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-cyan-700 hover:bg-cyan-800 rounded-xl"
                >
                  Simpan Kunjungan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Hapus Dokumen Administrasi?"
        message="Dokumen ini akan dihapus dari arsip administrasi laboratorium."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
