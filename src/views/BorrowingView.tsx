import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Borrowing, BorrowingStatus } from '../types';
import {
  ArrowLeftRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const BorrowingView: React.FC = () => {
  const {
    borrowings,
    saveBorrowing,
    deleteBorrowing,
    hasPermission,
    userProfile,
    equipment,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBorrowing, setEditingBorrowing] = useState<Borrowing | null>(null);
  const [returnModalItem, setReturnModalItem] = useState<Borrowing | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const canManage = hasPermission('manageBorrowings') || hasPermission('crudAllData');

  const [formData, setFormData] = useState<Partial<Borrowing>>({
    transactionNumber: '',
    borrowDate: new Date().toISOString().split('T')[0],
    borrowerName: '',
    borrowerRole: 'Guru',
    itemName: '',
    quantity: 1,
    initialCondition: 'Baik dan Lengkap',
    returnDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    officerName: 'Rizki Pratama, A.Md.',
    status: 'Dipinjam',
    notes: '',
  });

  const [returnFormData, setReturnFormData] = useState({
    actualReturnDate: new Date().toISOString().split('T')[0],
    returnedCondition: 'Baik dan Berfungsi Normal',
    status: 'Sudah Dikembalikan' as BorrowingStatus,
    officerName: 'Rizki Pratama, A.Md.',
    notes: '',
  });

  const filteredBorrowings = borrowings.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      b.borrowerName.toLowerCase().includes(q) ||
      b.itemName.toLowerCase().includes(q) ||
      b.transactionNumber.toLowerCase().includes(q);

    const matchStatus = selectedStatus === 'all' || b.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const handleOpenAdd = () => {
    const tx = `PINJAM/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(borrowings.length + 1).padStart(3, '0')}`;
    setFormData({
      transactionNumber: tx,
      borrowDate: new Date().toISOString().split('T')[0],
      borrowerName: '',
      borrowerRole: 'Guru Kejuruan',
      itemName: equipment[0]?.name || 'Proyektor Epson',
      quantity: 1,
      initialCondition: 'Baik dan Lengkap Kabel + Remote',
      returnDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      officerName: 'Rizki Pratama, A.Md.',
      status: 'Dipinjam',
      notes: '',
    });
    setEditingBorrowing(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.borrowerName || !formData.itemName) return;

    await saveBorrowing({
      id: editingBorrowing ? editingBorrowing.id : 'bor-' + Date.now(),
      transactionNumber: formData.transactionNumber || `PINJAM/${Date.now()}`,
      borrowDate: formData.borrowDate || new Date().toISOString().split('T')[0],
      borrowerName: formData.borrowerName,
      borrowerRole: formData.borrowerRole || 'Guru',
      itemName: formData.itemName,
      quantity: Number(formData.quantity) || 1,
      initialCondition: formData.initialCondition || 'Baik',
      returnDate: formData.returnDate || '',
      officerName: formData.officerName || 'Petugas Lab',
      status: (formData.status as BorrowingStatus) || 'Dipinjam',
      notes: formData.notes || '',
    });

    setIsFormOpen(false);
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalItem) return;

    await saveBorrowing({
      ...returnModalItem,
      actualReturnDate: returnFormData.actualReturnDate,
      returnedCondition: returnFormData.returnedCondition,
      status: returnFormData.status,
      officerName: returnFormData.officerName,
      notes: returnFormData.notes
        ? `${returnModalItem.notes ? returnModalItem.notes + ' | ' : ''}Catatan Kembali: ${returnFormData.notes}`
        : returnModalItem.notes,
    });

    setReturnModalItem(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await deleteBorrowing(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <ArrowLeftRight className="w-6 h-6 text-cyan-600" />
            Peminjaman & Pengembalian Perangkat
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan sirkulasi peminjaman alat laboratorium (proyektor, kabel tester, router portable) dengan status pengembalian tertib.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            Catat Peminjaman Baru
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama peminjam, barang, nomor transaksi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
        >
          <option value="all">Semua Status ({borrowings.length})</option>
          <option value="Dipinjam">Sedang Dipinjam ({borrowings.filter((b) => b.status === 'Dipinjam').length})</option>
          <option value="Sudah Dikembalikan">Sudah Dikembalikan ({borrowings.filter((b) => b.status === 'Sudah Dikembalikan').length})</option>
          <option value="Terlambat">Terlambat</option>
          <option value="Rusak">Rusak / Bermasalah</option>
        </select>
      </div>

      {/* Borrowing Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-800">
                <th className="py-3 px-4 font-bold text-center w-12">No</th>
                <th className="py-3 px-4 font-bold">No. Transaksi & Tgl</th>
                <th className="py-3 px-4 font-bold">Peminjam</th>
                <th className="py-3 px-4 font-bold">Barang & Kuantitas</th>
                <th className="py-3 px-4 font-bold">Batas Kembali</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold">Petugas</th>
                <th className="py-3 px-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBorrowings.length > 0 ? (
                filteredBorrowings.map((b, idx) => {
                  let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (b.status === 'Dipinjam') statusBadge = 'bg-amber-50 text-amber-800 border-amber-200';
                  if (b.status === 'Sudah Dikembalikan') statusBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  if (b.status === 'Terlambat') statusBadge = 'bg-rose-50 text-rose-800 border-rose-200';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{b.transactionNumber}</div>
                        <div className="text-[10px] text-slate-400">Pinjam: {b.borrowDate}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{b.borrowerName}</div>
                        <div className="text-[10px] text-slate-500">{b.borrowerRole}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{b.itemName}</div>
                        <div className="text-[10px] text-slate-500">
                          {b.quantity} Unit • Kondisi Awal: {b.initialCondition}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{b.returnDate}</div>
                        {b.actualReturnDate && (
                          <div className="text-[10px] text-emerald-700 font-bold">
                            Kembali: {b.actualReturnDate}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{b.officerName}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {b.status === 'Dipinjam' && canManage && (
                            <button
                              onClick={() => {
                                setReturnModalItem(b);
                                setReturnFormData({
                                  actualReturnDate: new Date().toISOString().split('T')[0],
                                  returnedCondition: 'Baik dan Lengkap',
                                  status: 'Sudah Dikembalikan',
                                  officerName: 'Rizki Pratama, A.Md.',
                                  notes: '',
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                              title="Proses Pengembalian Barang"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Kembalikan
                            </button>
                          )}
                          {canManage && (
                            <button
                              onClick={() => setDeleteTargetId(b.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                              title="Hapus Data Transaksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                    Belum ada data peminjaman barang.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Borrowing Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                Catat Transaksi Peminjaman Barang
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. Transaksi *</label>
                  <input
                    type="text"
                    required
                    value={formData.transactionNumber || ''}
                    onChange={(e) => setFormData({ ...formData, transactionNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Pinjam *</label>
                  <input
                    type="date"
                    required
                    value={formData.borrowDate || ''}
                    onChange={(e) => setFormData({ ...formData, borrowDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Peminjam *</label>
                  <input
                    type="text"
                    required
                    value={formData.borrowerName || ''}
                    onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
                    placeholder="Nama Guru / Siswa / Staf"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jabatan / Status</label>
                  <input
                    type="text"
                    value={formData.borrowerRole || ''}
                    onChange={(e) => setFormData({ ...formData, borrowerRole: e.target.value })}
                    placeholder="Guru Kejuruan / Siswa"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Barang Yang Dipinjam *</label>
                  <input
                    type="text"
                    required
                    value={formData.itemName || ''}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    placeholder="Contoh: Proyektor Portable Epson"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jumlah</label>
                  <input
                    type="number"
                    value={formData.quantity || 1}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kondisi Awal</label>
                  <input
                    type="text"
                    value={formData.initialCondition || ''}
                    onChange={(e) => setFormData({ ...formData, initialCondition: e.target.value })}
                    placeholder="Baik dan Berfungsi Normal"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Rencana Kembali *</label>
                  <input
                    type="date"
                    required
                    value={formData.returnDate || ''}
                    onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Petugas Penyerah</label>
                <input
                  type="text"
                  value={formData.officerName || ''}
                  onChange={(e) => setFormData({ ...formData, officerName: e.target.value })}
                  placeholder="Rizki Pratama, A.Md."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keperluan / Catatan</label>
                <input
                  type="text"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Digunakan untuk presentasi pameran di aula..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
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
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-400" />
                Verifikasi Pengembalian Barang
              </h3>
              <button onClick={() => setReturnModalItem(null)} className="text-emerald-200 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900">{returnModalItem.itemName} ({returnModalItem.quantity} Unit)</div>
                <div className="text-slate-500">Peminjam: {returnModalItem.borrowerName} ({returnModalItem.borrowerRole})</div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Pengembalian Aktual</label>
                <input
                  type="date"
                  required
                  value={returnFormData.actualReturnDate}
                  onChange={(e) => setReturnFormData({ ...returnFormData, actualReturnDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kondisi Barang Setelah Dikembalikan</label>
                <select
                  value={returnFormData.returnedCondition}
                  onChange={(e) => setReturnFormData({ ...returnFormData, returnedCondition: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                >
                  <option value="Baik dan Berfungsi Normal">Baik dan Berfungsi Normal (Lengkap)</option>
                  <option value="Rusak Ringan">Rusak Ringan (Ada Bagian Bermasalah)</option>
                  <option value="Rusak Berat">Rusak Berat (Tidak Berfungsi)</option>
                  <option value="Aksesoris Kurang">Aksesoris Tidak Lengkap</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Petugas Penerima</label>
                <input
                  type="text"
                  required
                  value={returnFormData.officerName}
                  onChange={(e) => setReturnFormData({ ...returnFormData, officerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Pengembalian</label>
                <input
                  type="text"
                  value={returnFormData.notes}
                  onChange={(e) => setReturnFormData({ ...returnFormData, notes: e.target.value })}
                  placeholder="Kabel HDMI dan remote sudah dicek lengkap..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReturnModalItem(null)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl"
                >
                  Konfirmasi Kembali
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Hapus Data Transaksi Peminjaman?"
        message="Catatan peminjaman ini akan dihapus dari riwayat transaksi."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
