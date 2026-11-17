import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LabUser } from '../types';
import {
  Users,
  Plus,
  Search,
  UserCheck,
  Edit2,
  Trash2,
  GraduationCap,
  Wrench,
  X,
  Phone,
  Mail,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const UsersLabView: React.FC = () => {
  const { usersLab, saveLabUser, deleteLabUser, hasPermission } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<LabUser | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const canManage = hasPermission('manageUsers') || hasPermission('manageInventory') || hasPermission('crudAllData');

  const categories: LabUser['category'][] = [
    'Guru',
    'Teknisi',
    'Laboran',
    'Siswa',
    'Kepala Sekolah',
    'Lainnya',
  ];

  const [formData, setFormData] = useState<Partial<LabUser>>({
    name: '',
    identifier: '',
    category: 'Guru',
    classOrDept: '',
    email: '',
    phone: '',
    gender: 'L',
  });

  const filteredUsers = usersLab.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      u.name.toLowerCase().includes(q) ||
      u.identifier.toLowerCase().includes(q) ||
      (u.classOrDept && u.classOrDept.toLowerCase().includes(q));

    const matchCat = selectedCategory === 'all' || u.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      identifier: '',
      category: 'Guru',
      classOrDept: '',
      email: '',
      phone: '',
      gender: 'L',
    });
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (u: LabUser) => {
    setEditingUser(u);
    setFormData(u);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    await saveLabUser({
      id: editingUser ? editingUser.id : 'usr-' + Date.now(),
      name: formData.name,
      identifier: formData.identifier || '-',
      category: formData.category || 'Guru',
      classOrDept: formData.classOrDept || '',
      email: formData.email || '',
      phone: formData.phone || '',
      gender: formData.gender as any || 'L',
    });

    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await deleteLabUser(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-cyan-600" />
            Data Pengguna Laboratorium Komputer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Direktori Guru Pengampu Praktikum, Teknisi IT, Laboran, Siswa Kejuruan, dan Kepala Sekolah.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            Tambah Pengguna Lab
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, NIP/NISN, atau kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
        >
          <option value="all">Semua Kategori ({usersLab.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c} ({usersLab.filter((u) => u.category === c).length})
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-800">
                <th className="py-3 px-4 font-bold text-center w-12">No</th>
                <th className="py-3 px-4 font-bold">Nama Lengkap</th>
                <th className="py-3 px-4 font-bold">Nomor Identitas (NIP/NISN)</th>
                <th className="py-3 px-4 font-bold">Kategori</th>
                <th className="py-3 px-4 font-bold">Kelas / Bidang Tugas</th>
                <th className="py-3 px-4 font-bold">Kontak</th>
                {canManage && <th className="py-3 px-4 font-bold text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[10px] text-slate-400">Gender: {u.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-700">
                      {u.identifier || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-800 font-semibold text-[10px] border border-cyan-100">
                        {u.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{u.classOrDept || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{u.phone || '-'}</div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1 rounded-lg text-slate-600 hover:text-slate-900"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(u.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    Belum ada data pengguna laboratorium pada filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                {editingUser ? 'Edit Pengguna Lab' : 'Tambah Pengguna Lab'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Ade Nur, S.Kom."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">NIP / NISN / NIK</label>
                  <input
                    type="text"
                    value={formData.identifier || ''}
                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                    placeholder="19870520..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={formData.category || 'Guru'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kelas / Jurusan / Unit</label>
                  <input
                    type="text"
                    value={formData.classOrDept || ''}
                    onChange={(e) => setFormData({ ...formData, classOrDept: e.target.value })}
                    placeholder="XII RPL 1 / Guru Kejuruan"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.gender || 'L'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="081288..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@smkn15..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
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
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Hapus Pengguna Laboratorium?"
        message="Data pengguna ini akan dihapus dari direktori laboratorium."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
