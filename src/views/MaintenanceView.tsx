import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Maintenance, MaintenanceStatus } from '../types';
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Coins,
  Calendar,
  Trash2,
  Edit2,
  X,
  FileText,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const MaintenanceView: React.FC = () => {
  const {
    maintenanceList,
    saveMaintenance,
    deleteMaintenance,
    hasPermission,
    computers,
    equipment,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Maintenance | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const canManage = hasPermission('manageMaintenance') || hasPermission('crudAllData');

  const totalCost = maintenanceList.reduce((sum, m) => sum + (m.cost || 0), 0);
  const completedCount = maintenanceList.filter((m) => m.status === 'Selesai').length;

  const [formData, setFormData] = useState<Partial<Maintenance>>({
    workOrderNumber: '',
    checkDate: new Date().toISOString().split('T')[0],
    deviceName: '',
    deviceType: 'Komputer',
    inventoryNumber: '',
    damageType: '',
    damageAnalysis: '',
    repairAction: '',
    technicianName: 'Rizki Pratama, A.Md.',
    cost: 0,
    spareParts: '',
    completedDate: '',
    status: 'Dalam Pengerjaan',
    photoBeforeUrl: '',
    photoAfterUrl: '',
    notes: '',
  });

  const filteredList = maintenanceList.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      m.deviceName.toLowerCase().includes(q) ||
      m.workOrderNumber.toLowerCase().includes(q) ||
      m.damageType.toLowerCase().includes(q) ||
      m.technicianName.toLowerCase().includes(q);

    const matchStatus = selectedStatus === 'all' || m.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const handleOpenAdd = () => {
    const wo = `WO/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(maintenanceList.length + 1).padStart(3, '0')}`;
    const defaultPC = computers[0];
    setFormData({
      workOrderNumber: wo,
      checkDate: new Date().toISOString().split('T')[0],
      deviceName: defaultPC ? `${defaultPC.computerCode} (${defaultPC.deviceName})` : 'PC Workstation',
      deviceType: 'Komputer',
      inventoryNumber: defaultPC?.inventoryNumber || '',
      damageType: '',
      damageAnalysis: '',
      repairAction: '',
      technicianName: 'Rizki Pratama, A.Md.',
      cost: 0,
      spareParts: '',
      status: 'Dalam Pengerjaan',
      notes: '',
    });
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (m: Maintenance) => {
    setEditingItem(m);
    setFormData(m);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deviceName || !formData.damageType) return;

    await saveMaintenance({
      id: editingItem ? editingItem.id : 'mnt-' + Date.now(),
      workOrderNumber: formData.workOrderNumber || `WO/${Date.now()}`,
      checkDate: formData.checkDate || new Date().toISOString().split('T')[0],
      deviceName: formData.deviceName,
      deviceType: formData.deviceType as any || 'Komputer',
      inventoryNumber: formData.inventoryNumber || '',
      damageType: formData.damageType,
      damageAnalysis: formData.damageAnalysis || '',
      repairAction: formData.repairAction || '',
      technicianName: formData.technicianName || 'Tim Teknisi',
      cost: Number(formData.cost) || 0,
      spareParts: formData.spareParts || '',
      completedDate: formData.status === 'Selesai' ? (formData.completedDate || new Date().toISOString().split('T')[0]) : formData.completedDate,
      status: (formData.status as MaintenanceStatus) || 'Dalam Pengerjaan',
      photoBeforeUrl: formData.photoBeforeUrl || '',
      photoAfterUrl: formData.photoAfterUrl || '',
      notes: formData.notes || '',
    });

    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await deleteMaintenance(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-cyan-600" />
            Pemeliharaan & Perbaikan Perangkat
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan Surat Perintah Kerja (Work Order), diagnosa teknisi, penggantian spare part, estimasi & realisasi biaya servis.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            Catat Pemeliharaan Baru
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Work Order</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{maintenanceList.length} Pekerjaan</div>
          <div className="text-xs text-slate-500 mt-0.5">{completedCount} Selesai Diperbaiki</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-cyan-700">Akumulasi Biaya Perbaikan</span>
          <div className="text-xl font-extrabold text-cyan-800 font-mono mt-1">
            Rp {totalCost.toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Realisasi pembelian spare parts</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-700">Dalam Pengerjaan</span>
          <div className="text-xl font-extrabold text-amber-800 mt-1">
            {maintenanceList.filter((m) => m.status === 'Dalam Pengerjaan' || m.status === 'Menunggu Suku Cadang').length} Unit
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Sedang ditangani tim teknisi</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari perangkat, No. WO, jenis kerusakan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
        >
          <option value="all">Semua Status</option>
          <option value="Dalam Pengerjaan">Dalam Pengerjaan</option>
          <option value="Menunggu Suku Cadang">Menunggu Suku Cadang</option>
          <option value="Selesai">Selesai</option>
          <option value="Tidak Dapat Diperbaiki">Tidak Dapat Diperbaiki</option>
        </select>
      </div>

      {/* Maintenance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredList.length > 0 ? (
          filteredList.map((item) => {
            let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200';
            if (item.status === 'Selesai') statusBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            if (item.status === 'Dalam Pengerjaan') statusBadge = 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse';
            if (item.status === 'Menunggu Suku Cadang') statusBadge = 'bg-amber-50 text-amber-800 border-amber-200';

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-cyan-800">{item.workOrderNumber}</span>
                      <span className="text-[10px] text-slate-400 block">Tgl Pemeriksaan: {item.checkDate}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                      {item.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{item.deviceName}</h3>
                    {item.inventoryNumber && (
                      <span className="text-[10px] text-slate-400 font-mono">{item.inventoryNumber}</span>
                    )}
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Jenis & Analisa Kerusakan:</span>
                      <span className="font-semibold text-rose-800">{item.damageType}</span>
                      {item.damageAnalysis && (
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.damageAnalysis}</p>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Tindakan Perbaikan:</span>
                      <p className="text-[11px] text-slate-700 font-medium">{item.repairAction || 'Sedang proses perbaikan'}</p>
                    </div>

                    {item.spareParts && (
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Suku Cadang Diganti:</span>
                        <span className="text-slate-800 font-mono text-[11px]">{item.spareParts}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Teknisi:</span>
                      <span className="font-bold text-slate-800">{item.technicianName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Biaya Servis:</span>
                      <span className="font-mono font-extrabold text-slate-900 text-sm">
                        Rp {(item.cost || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 mt-4 text-xs">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                    >
                      Update / Edit
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(item.id)}
                      className="p-1 rounded-xl text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Belum ada catatan pekerjaan pemeliharaan.
          </div>
        )}
      </div>

      {/* Add / Edit Maintenance Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Wrench className="w-5 h-5 text-cyan-400" />
                {editingItem ? 'Update Catatan Pemeliharaan' : 'Work Order Pemeliharaan Baru'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. Work Order *</label>
                  <input
                    type="text"
                    required
                    value={formData.workOrderNumber || ''}
                    onChange={(e) => setFormData({ ...formData, workOrderNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Pemeriksaan *</label>
                  <input
                    type="date"
                    required
                    value={formData.checkDate || ''}
                    onChange={(e) => setFormData({ ...formData, checkDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Perangkat & Kode *</label>
                <input
                  type="text"
                  required
                  value={formData.deviceName || ''}
                  onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                  placeholder="PC-01 (Lenovo Neo 50t)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jenis Perangkat</label>
                  <select
                    value={formData.deviceType || 'Komputer'}
                    onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  >
                    <option value="Komputer">Komputer PC / Laptop</option>
                    <option value="Perangkat Pendukung">Perangkat Pendukung (Printer/Proyektor)</option>
                    <option value="Jaringan">Jaringan (Switch / Router / Kabel)</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Pekerjaan *</label>
                  <select
                    value={formData.status || 'Dalam Pengerjaan'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    <option value="Dijadwalkan">Dijadwalkan</option>
                    <option value="Dalam Pengerjaan">Dalam Pengerjaan</option>
                    <option value="Menunggu Suku Cadang">Menunggu Suku Cadang</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Tidak Dapat Diperbaiki">Tidak Dapat Diperbaiki</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Gejala / Jenis Kerusakan *</label>
                <input
                  type="text"
                  required
                  value={formData.damageType || ''}
                  onChange={(e) => setFormData({ ...formData, damageType: e.target.value })}
                  placeholder="Contoh: Power supply korslet, blue screen terus-menerus..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Analisa Kerusakan Teknis</label>
                <textarea
                  rows={2}
                  value={formData.damageAnalysis || ''}
                  onChange={(e) => setFormData({ ...formData, damageAnalysis: e.target.value })}
                  placeholder="Hasil pengecekan voltase motherboard drop..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tindakan Perbaikan</label>
                <textarea
                  rows={2}
                  value={formData.repairAction || ''}
                  onChange={(e) => setFormData({ ...formData, repairAction: e.target.value })}
                  placeholder="Penggantian PSU 500W dan running benchmark test..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Teknisi</label>
                  <input
                    type="text"
                    value={formData.technicianName || ''}
                    onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Biaya Perbaikan (Rp)</label>
                  <input
                    type="number"
                    value={formData.cost || 0}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    placeholder="450000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Suku Cadang Diganti</label>
                  <input
                    type="text"
                    value={formData.spareParts || ''}
                    onChange={(e) => setFormData({ ...formData, spareParts: e.target.value })}
                    placeholder="PSU 500W 80+"
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
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Hapus Catatan Pemeliharaan?"
        message="Data riwayat perbaikan ini akan dihapus permanen dari sistem."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
