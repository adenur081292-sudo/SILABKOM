import React from 'react';
import {
  HelpCircle,
  X,
  ShieldCheck,
  Monitor,
  CalendarCheck2,
  FileSpreadsheet,
  Database,
  Laptop,
} from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Panduan Penggunaan SILABKOM SMKN 15 Pandeglang</h3>
              <p className="text-xs text-slate-400">Petunjuk lengkap operasional Sistem Informasi Laboratorium Komputer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto leading-relaxed scrollbar-thin text-slate-700">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <ShieldCheck className="w-4 h-4 text-cyan-600" />
              <span>1. Tingkatan Pengguna & Hak Akses</span>
            </div>
            <p className="text-slate-600">
              SILABKOM mendukung sistem multi-peran yang dapat dipilih atau diatur melalui tombol Akun di sudut kanan atas:
            </p>
            <ul className="list-disc list-inside space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <li><strong>Administrator:</strong> Akses penuh seluruh menu, pengelolaan pengguna &amp; penambahan level hak akses, CRUD data, konfigurasi, serta ekspor semua laporan.</li>
              <li><strong>Kepala Laboratorium:</strong> Mengelola inventaris laboratorium, jadwal penggunaan, pemeliharaan, laporan kerusakan, dan laporan laboratorium.</li>
              <li><strong>Guru Mata Pelajaran:</strong> Menginput absensi siswa, peminjaman alat, mencatat jurnal/peristiwa pembelajaran, rating kenyamanan 1–5 bintang, serta upload foto praktikum.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Laptop className="w-4 h-4 text-cyan-600" />
              <span>2. Riwayat Penggunaan Komputer &amp; Pemakai Terakhir</span>
            </div>
            <p className="text-slate-600">
              Setiap sesi pemakaian komputer oleh Siswa, Guru/Tendik, Teknisi, maupun Tamu dicatat melalui mekanisme Check-In dan Check-Out lengkap dengan pemeriksaan 9 komponen serta riwayat pemakai terakhir pada tiap unit PC.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Monitor className="w-4 h-4 text-cyan-600" />
              <span>3. Pengelolaan Inventaris &amp; Import Excel</span>
            </div>
            <ul className="list-disc list-inside space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <li>Klik tombol <strong>Template Excel</strong> untuk mengunduh format isian massal.</li>
              <li>Upload file Excel melalui tombol <strong>Import Excel</strong> untuk memasukkan puluhan unit PC sekaligus.</li>
              <li>Klik ikon QR Code pada tabel komputer untuk mencetak kartu inventaris ber-QR Code.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <CalendarCheck2 className="w-4 h-4 text-cyan-600" />
              <span>4. Anti Bentrok Jadwal Praktikum</span>
            </div>
            <p className="text-slate-600">
              Saat membuat jadwal baru, sistem otomatis memeriksa ruangan, tanggal, dan rentang jam agar tidak terjadi bentrok jadwal antarkelas.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <FileSpreadsheet className="w-4 h-4 text-cyan-600" />
              <span>5. Pusat Laporan Otomatis (PDF, Excel, Word, CSV)</span>
            </div>
            <p className="text-slate-600">
              Buka menu <strong>Pusat Laporan Otomatis</strong> untuk menghasilkan berbagai laporan resmi lengkap dengan Kop Surat SMKN 15 Pandeglang dan kolom tanda tangan Kepala Lab &amp; Kepala Sekolah.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Database className="w-4 h-4 text-cyan-600" />
              <span>6. Database Cloud Firestore &amp; Backup JSON</span>
            </div>
            <p className="text-slate-600">
              Semua data tersinkronisasi otomatis ke Cloud Firestore. Gunakan fitur Export Backup JSON di menu Pengaturan Aplikasi sebagai arsip cadangan berkala.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-end border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-6 py-2.5 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl text-xs transition-colors"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
