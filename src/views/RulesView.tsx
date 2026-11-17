import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  Download,
  Printer,
  Maximize2,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Power,
  Sparkles,
  BookOpen,
  Info,
  CheckSquare,
  Square,
  RotateCcw,
  Eye,
  X,
  FileText,
} from 'lucide-react';
import { MasterKopSurat } from '../components/MasterKopSurat';

export const RulesView: React.FC = () => {
  const { settings, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'poster' | 'interactive' | 'checklist' | 'sanctions'>('interactive');
  const [search, setSearch] = useState('');
  const [selectedSection, setSelectedSection] = useState<'all' | 'A' | 'B' | 'C'>('all');
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);

  // Teacher briefing checklist state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const rulesData = {
    sectionA: {
      code: 'A',
      title: 'Sebelum Masuk dan Memulai Praktik',
      subtitle: 'Ketentuan dan persiapan sebelum peserta didik masuk dan menghidupkan komputer',
      icon: Clock,
      color: 'blue',
      items: [
        { no: 1, text: 'Hadir tepat waktu sesuai jadwal praktik.' },
        { no: 2, text: 'Berpakaian rapi dan sesuai ketentuan sekolah.' },
        { no: 3, text: 'Masuk laboratorium dengan tertib dan mengikuti arahan guru/laboran.' },
        { no: 4, text: 'Simpan tas dan barang pribadi di tempat yang telah ditentukan.' },
        { no: 5, text: 'Dilarang membawa makanan dan minuman ke dalam laboratorium.' },
        { no: 6, text: 'Jaga kebersihan dan ketenangan sebelum praktik dimulai.' },
        { no: 7, text: 'Duduk sesuai tempat atau nomor komputer yang telah ditentukan.' },
        { no: 8, text: 'Periksa kondisi komputer dan perangkat sebelum digunakan.' },
        { no: 9, text: 'Segera laporkan kerusakan atau masalah perangkat kepada guru/laboran.' },
        { no: 10, text: 'Nyalakan komputer hanya setelah mendapat instruksi.' },
      ],
    },
    sectionB: {
      code: 'B',
      title: 'Selama Berada di Ruangan Lab.',
      subtitle: 'Etika pemakaian komputer, jaringan internet, dan keselamatan kerja saat praktikum',
      icon: ShieldCheck,
      color: 'amber',
      items: [
        { no: 1, text: 'Jaga ketenangan dan suasana belajar; dilarang berisik, bercanda berlebihan, berteriak, atau mengganggu konsentrasi orang lain.' },
        { no: 2, text: 'Gunakan komputer sesuai nomor dan kebutuhan pembelajaran.' },
        { no: 3, text: 'Dilarang memindahkan, mencabut, atau mengubah perangkat tanpa izin.' },
        { no: 4, text: 'Gunakan internet hanya untuk kepentingan pembelajaran.' },
        { no: 5, text: 'Dilarang bermain game atau mengakses konten yang tidak berkaitan dengan pembelajaran.' },
        { no: 6, text: 'Dilarang menginstal atau menghapus aplikasi tanpa izin.' },
        { no: 7, text: 'Jaga kerahasiaan username, password, dan data pengguna.' },
        { no: 8, text: 'Dilarang membuka, mengubah, atau menghapus data milik orang lain.' },
        { no: 9, text: 'Gunakan peralatan listrik dengan aman dan jangan menyentuh kabel/perangkat yang rusak.' },
        { no: 10, text: 'Ikuti seluruh instruksi guru/laboran selama kegiatan praktik.' },
      ],
    },
    sectionC: {
      code: 'C',
      title: 'Setelah Selesai Praktik',
      subtitle: 'Prosedur mematikan perangkat, perapihan laboratorium, dan ketertiban saat keluar',
      icon: Power,
      color: 'emerald',
      items: [
        { no: 1, text: 'Simpan pekerjaan pada lokasi yang telah ditentukan.' },
        { no: 2, text: 'Logout dari akun yang digunakan.' },
        { no: 3, text: 'Matikan komputer sesuai prosedur yang benar.' },
        { no: 4, text: 'Pastikan monitor dan perangkat lainnya telah dimatikan sesuai instruksi.' },
        { no: 5, text: 'Rapikan keyboard, mouse, headset, dan perangkat lainnya.' },
        { no: 6, text: 'Kembalikan kursi ke posisi semula.' },
        { no: 7, text: 'Bersihkan meja dan area kerja dari sampah.' },
        { no: 8, text: 'Pastikan tidak ada barang pribadi yang tertinggal.' },
        { no: 9, text: 'Laporkan kerusakan atau masalah yang terjadi selama praktik kepada guru/laboran.' },
        { no: 10, text: 'Tinggalkan laboratorium dengan tertib setelah mendapat izin dari guru/laboran.' },
      ],
    },
  };

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetChecklist = () => {
    setCheckedItems({});
    addToast('info', 'Checklist Direset', 'Seluruh poin checklist verifikasi pra-praktik telah dikosongkan.');
  };

  const checkAll = () => {
    const all: Record<string, boolean> = {};
    ['A', 'B', 'C'].forEach((sec) => {
      for (let i = 1; i <= 10; i++) {
        all[`${sec}-${i}`] = true;
      }
    });
    setCheckedItems(all);
    addToast('success', 'Semua Terverifikasi', 'Semua butir tata tertib berhasil ditandai selesai diperiksa.');
  };

  const handlePrintDocument = () => {
    window.print();
  };

  const handleDownloadPoster = () => {
    const link = document.createElement('a');
    link.href = '/assets/aistudio/Tata_Tertib_Laboratorium_Komputer_e6a33d85.png';
    link.download = 'Tata_Tertib_Laboratorium_Komputer_SMKN15_Pandeglang.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'Poster Diunduh', 'Berkas poster Tata Tertib Laboratorium Komputer berhasil diunduh.');
  };

  // Filter rules based on search & section
  const filterSectionItems = (sectionCode: 'A' | 'B' | 'C', items: { no: number; text: string }[]) => {
    if (selectedSection !== 'all' && selectedSection !== sectionCode) return [];
    if (!search.trim()) return items;
    return items.filter((item) =>
      item.text.toLowerCase().includes(search.toLowerCase()) ||
      String(item.no).includes(search)
    );
  };

  const filteredA = filterSectionItems('A', rulesData.sectionA.items);
  const filteredB = filterSectionItems('B', rulesData.sectionB.items);
  const filteredC = filterSectionItems('C', rulesData.sectionC.items);

  const totalFilteredCount = filteredA.length + filteredB.length + filteredC.length;
  const totalCheckedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Standar Operasional Prosedur & Disiplin Lab Komputer
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            Tata Tertib Laboratorium Komputer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            SMK Negeri 15 Pandeglang • &ldquo;Disiplin Hari Ini, Masa Depan Esok!&rdquo;
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <button
            onClick={() => setIsPosterModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Lihat poster infografis dalam ukuran penuh"
          >
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            <span>Lihat Poster</span>
          </button>

          <button
            onClick={handleDownloadPoster}
            className="px-3 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Unduh file gambar poster asli (PNG)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600" />
            <span>Unduh Poster</span>
          </button>

          <button
            onClick={handlePrintDocument}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            title="Cetak Tata Tertib Resmi ke Printer / PDF"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cetak Dokumen Resmi</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-2xl w-fit text-xs font-semibold print:hidden">
        <button
          onClick={() => setActiveTab('interactive')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'interactive'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>Butir Tata Tertib (30 Poin)</span>
        </button>

        <button
          onClick={() => setActiveTab('poster')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'poster'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
          <span>Poster Infografis Resmi</span>
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'checklist'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
          <span>Checklist Briefing Guru</span>
          {totalCheckedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {totalCheckedCount}/30
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sanctions')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'sanctions'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Sanksi Pelanggaran</span>
        </button>
      </div>

      {/* ==================== TAB 1: INTERACTIVE 30 RULES ==================== */}
      {activeTab === 'interactive' && (
        <div className="space-y-6">
          {/* Search and Section Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kata kunci: makanan, internet, game, listrik, kursi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Filter Bagian:</span>
              <div className="flex gap-1">
                {(['all', 'A', 'B', 'C'] as const).map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setSelectedSection(sec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSection === sec
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {sec === 'all' ? 'Semua (A+B+C)' : `Bagian ${sec}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section A: Sebelum Masuk */}
          {filteredA.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                    A
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight">SEBELUM MASUK DAN MEMULAI PRAKTIK</h2>
                    <p className="text-xs text-blue-200 mt-0.5">Ketentuan persiapan dan disiplin sebelum menyalakan workstation</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold bg-white/10 px-3 py-1 rounded-full border border-white/20 self-start sm:self-auto">
                  {filteredA.length} Butir Tata Tertib
                </span>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredA.map((rule) => (
                  <div
                    key={`A-${rule.no}`}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-200 transition-all group"
                  >
                    <div className="w-7 h-7 rounded-xl bg-blue-900 text-white font-extrabold text-xs flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      {rule.no}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 leading-relaxed pt-0.5">
                      {rule.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section B: Selama Berada di Ruangan Lab */}
          {filteredB.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-900 via-blue-900 to-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                    B
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight">SELAMA BERADA DI RUANGAN LAB.</h2>
                    <p className="text-xs text-cyan-200 mt-0.5">Etika pemakaian komputer, jaringan internet, dan keselamatan kelistrikan</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold bg-white/10 px-3 py-1 rounded-full border border-white/20 self-start sm:self-auto">
                  {filteredB.length} Butir Tata Tertib
                </span>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredB.map((rule) => (
                  <div
                    key={`B-${rule.no}`}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 hover:bg-cyan-50/60 border border-slate-200/80 hover:border-cyan-200 transition-all group"
                  >
                    <div className="w-7 h-7 rounded-xl bg-cyan-800 text-white font-extrabold text-xs flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      {rule.no}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 leading-relaxed pt-0.5">
                      {rule.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section C: Setelah Selesai Praktik */}
          {filteredC.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                    C
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight">SETELAH SELESAI PRAKTIK</h2>
                    <p className="text-xs text-emerald-200 mt-0.5">Prosedur shutdown, perapihan perangkat, kebersihan meja, dan ketertiban</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold bg-white/10 px-3 py-1 rounded-full border border-white/20 self-start sm:self-auto">
                  {filteredC.length} Butir Tata Tertib
                </span>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredC.map((rule) => (
                  <div
                    key={`C-${rule.no}`}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-200 transition-all group"
                  >
                    <div className="w-7 h-7 rounded-xl bg-emerald-800 text-white font-extrabold text-xs flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      {rule.no}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 leading-relaxed pt-0.5">
                      {rule.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalFilteredCount === 0 && (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <div className="font-bold text-slate-800 text-sm">Tidak ditemukan aturan yang cocok</div>
              <p className="text-xs text-slate-500 mt-1">Gunakan kata kunci pencarian yang lain atau reset filter bagian.</p>
              <button
                onClick={() => { setSearch(''); setSelectedSection('all'); }}
                className="mt-3 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Reset Pencarian
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: POSTER INFOGRAFIS RESMI ==================== */}
      {activeTab === 'poster' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center gap-8">
            {/* Poster Preview */}
            <div className="w-full lg:w-1/2 flex flex-col items-center">
              <div
                onClick={() => setIsPosterModalOpen(true)}
                className="relative group cursor-zoom-in rounded-2xl overflow-hidden border-2 border-slate-300 hover:border-cyan-500 shadow-lg transition-all max-w-md w-full bg-slate-900"
              >
                <img
                  src="/assets/aistudio/Tata_Tertib_Laboratorium_Komputer_e6a33d85.png"
                  alt="Poster Tata Tertib Laboratorium Komputer SMKN 15 Pandeglang"
                  className="w-full h-auto object-contain group-hover:opacity-95 transition-opacity"
                />
                <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs backdrop-blur-xs">
                  <Maximize2 className="w-5 h-5 text-cyan-300" />
                  <span>Klik untuk Perbesar Layar Penuh</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Format Asli: Poster Infografis Vertikal Resmi SMKN 15 Pandeglang
              </p>
            </div>

            {/* Poster Description & Quick Print/Download */}
            <div className="w-full lg:w-1/2 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                Desain Resmi Poster Laboratorium
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                Poster Tata Tertib Laboratorium Komputer SMKN 15 Pandeglang
              </h2>

              <p className="text-xs text-slate-600 leading-relaxed">
                Poster infografis ini wajib dipasang di setiap pintu masuk dan dinding utama ruangan Laboratorium Komputer
                SMK Negeri 15 Pandeglang. Memuat 3 tahapan disiplin siswa dengan ilustrasi visual yang mudah dipahami.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-3 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0">
                    A
                  </div>
                  <div>
                    <span className="font-bold">10 Aturan Pra-Praktik:</span> Kehadiran, pakaian rapi, larangan makanan/minuman, penempatan barang.
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
                    B
                  </div>
                  <div>
                    <span className="font-bold">10 Aturan Saat Praktik:</span> Menjaga ketenangan, larangan game/merusak file, keselamatan listrik.
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                    C
                  </div>
                  <div>
                    <span className="font-bold">10 Aturan Pasca-Praktik:</span> Simpan hasil kerja, logout akun, shutdown prosedur, merapikan meja & kursi.
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => setIsPosterModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                >
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>Pratinjau Layar Penuh</span>
                </button>

                <button
                  onClick={handleDownloadPoster}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File Gambar (PNG)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: TEACHER BRIEFING CHECKLIST ==================== */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                Lembar Verifikasi & Briefing Tata Tertib oleh Guru / Laboran
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Gunakan checklist ini sebelum atau sesudah sesi praktikum untuk memastikan kepatuhan peserta didik.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={checkAll}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Centang Semua
              </button>

              <button
                onClick={resetChecklist}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Checklist A */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-6 h-6 rounded-lg bg-blue-900 text-white font-bold text-xs flex items-center justify-center">
                  A
                </div>
                <h3 className="font-bold text-xs text-slate-900">Pra-Praktik (10 Poin)</h3>
              </div>
              <div className="space-y-2">
                {rulesData.sectionA.items.map((item) => {
                  const key = `A-${item.no}`;
                  const isChecked = !!checkedItems[key];
                  return (
                    <div
                      key={key}
                      onClick={() => toggleCheck(key)}
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-blue-50/80 border-blue-200 text-blue-950 font-medium'
                          : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="leading-snug">{item.no}. {item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checklist B */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-6 h-6 rounded-lg bg-cyan-800 text-white font-bold text-xs flex items-center justify-center">
                  B
                </div>
                <h3 className="font-bold text-xs text-slate-900">Selama Praktik (10 Poin)</h3>
              </div>
              <div className="space-y-2">
                {rulesData.sectionB.items.map((item) => {
                  const key = `B-${item.no}`;
                  const isChecked = !!checkedItems[key];
                  return (
                    <div
                      key={key}
                      onClick={() => toggleCheck(key)}
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-cyan-50/80 border-cyan-200 text-cyan-950 font-medium'
                          : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                      <span className="leading-snug">{item.no}. {item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checklist C */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-800 text-white font-bold text-xs flex items-center justify-center">
                  C
                </div>
                <h3 className="font-bold text-xs text-slate-900">Pasca-Praktik (10 Poin)</h3>
              </div>
              <div className="space-y-2">
                {rulesData.sectionC.items.map((item) => {
                  const key = `C-${item.no}`;
                  const isChecked = !!checkedItems[key];
                  return (
                    <div
                      key={key}
                      onClick={() => toggleCheck(key)}
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-medium'
                          : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="leading-snug">{item.no}. {item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: SANKSI PELANGGARAN ==================== */}
      {activeTab === 'sanctions' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Ketentuan & Sanksi Pelanggaran Tata Tertib Laboratorium
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Diberlakukan guna menjaga kelangsungan sarana prasarana sekolah dan keselamatan seluruh warga SMKN 15 Pandeglang.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h3 className="font-extrabold text-xs text-amber-950">Pelanggaran Ringan</h3>
                </div>
                <p className="text-xs text-amber-900">
                  Berisik, tidak merapikan kursi, lupa logout, atau terlambat masuk tanpa alasan sah.
                </p>
                <div className="pt-2 border-t border-amber-200/60">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Sanksi:</span>
                  <span className="text-xs text-amber-950 font-semibold">Teguran lisan & merapikan laboratorium.</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-orange-50/60 border border-orange-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h3 className="font-extrabold text-xs text-orange-950">Pelanggaran Sedang</h3>
                </div>
                <p className="text-xs text-orange-900">
                  Membawa makanan/minuman, bermain game saat jam pelajaran, mengubah pengaturan PC, atau menginstal software tanpa izin.
                </p>
                <div className="pt-2 border-t border-orange-200/60">
                  <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block">Sanksi:</span>
                  <span className="text-xs text-orange-950 font-semibold">Surat peringatan teknisi & skorsing 1 sesi praktikum.</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <h3 className="font-extrabold text-xs text-rose-950">Pelanggaran Berat</h3>
                </div>
                <p className="text-xs text-rose-900">
                  Merusak hardware/komputer, mencuri periferal (mouse/keyboard), membongkar PC tanpa izin, atau membuka konten terlarang.
                </p>
                <div className="pt-2 border-t border-rose-200/60">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Sanksi:</span>
                  <span className="text-xs text-rose-950 font-semibold">Ganti rugi perangkat 100%, panggilan orang tua, & skorsing.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PRINTABLE DOCUMENT TEMPLATE (VISIBLE IN PRINT PREVIEW) ==================== */}
      <div className="hidden print:block printable-document space-y-6 text-slate-900 bg-white p-4">
        {/* Official Master Kop Surat FOTO 1 */}
        <MasterKopSurat />

        <div className="text-center space-y-1 pt-2">
          <h2 className="text-sm font-black uppercase tracking-wide underline">TATA TERTIB LABORATORIUM KOMPUTER</h2>
          <p className="text-[11px] font-semibold">Tahun Ajaran {settings.academicYear || '2026/2027'}</p>
        </div>

        {/* Section A */}
        <div className="space-y-1 text-xs">
          <h3 className="font-bold uppercase text-[11px] bg-slate-100 p-1 rounded">A. SEBELUM MASUK DAN MEMULAI PRAKTIK</h3>
          <ol className="list-decimal pl-5 space-y-0.5 text-[10px]">
            {rulesData.sectionA.items.map((i) => (
              <li key={`pr-A-${i.no}`}>{i.text}</li>
            ))}
          </ol>
        </div>

        {/* Section B */}
        <div className="space-y-1 text-xs pt-1">
          <h3 className="font-bold uppercase text-[11px] bg-slate-100 p-1 rounded">B. SELAMA BERADA DI RUANGAN LAB.</h3>
          <ol className="list-decimal pl-5 space-y-0.5 text-[10px]">
            {rulesData.sectionB.items.map((i) => (
              <li key={`pr-B-${i.no}`}>{i.text}</li>
            ))}
          </ol>
        </div>

        {/* Section C */}
        <div className="space-y-1 text-xs pt-1">
          <h3 className="font-bold uppercase text-[11px] bg-slate-100 p-1 rounded">C. SETELAH SELESAI PRAKTIK</h3>
          <ol className="list-decimal pl-5 space-y-0.5 text-[10px]">
            {rulesData.sectionC.items.map((i) => (
              <li key={`pr-C-${i.no}`}>{i.text}</li>
            ))}
          </ol>
        </div>

        {/* Signatures */}
        <div className="pt-6 grid grid-cols-2 text-center text-xs">
          <div>
            <p className="text-[10px]">Mengetahui,</p>
            <p className="text-[10px] font-bold">Kepala Sekolah</p>
            <div className="h-14" />
            <p className="font-bold underline text-xs">{settings.principalName}</p>
            <p className="text-[10px] text-slate-600">NIP. {settings.principalNip}</p>
          </div>
          <div>
            <p className="text-[10px]">Pandeglang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="text-[10px] font-bold">Kepala Laboratorium Komputer</p>
            <div className="h-14" />
            <p className="font-bold underline text-xs">{settings.headOfLabName}</p>
            <p className="text-[10px] text-slate-600">NIP. {settings.headOfLabNip}</p>
          </div>
        </div>
      </div>

      {/* ==================== POSTER FULLSCREEN PREVIEW MODAL ==================== */}
      {isPosterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full max-h-[92vh] bg-slate-900 rounded-3xl overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-xs">Poster Tata Tertib Lab Komputer SMKN 15 Pandeglang</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPoster}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
                <button
                  onClick={() => setIsPosterModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Image */}
            <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-slate-950">
              <img
                src="/assets/aistudio/Tata_Tertib_Laboratorium_Komputer_e6a33d85.png"
                alt="Tata Tertib Laboratorium Komputer"
                className="max-h-[80vh] w-auto object-contain rounded-xl shadow-lg border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
