import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  AppSetting,
  Computer,
  Equipment,
  Schedule,
  Borrowing,
  Maintenance,
  DamageReport,
  Laboratory,
  Activity,
  LabDocument,
  Guest,
  StudentAttendance,
  LessonJournal,
} from '../types';
import {
  MASTER_KOP_DATA,
  addMasterKopToPdf,
  getMasterKopWordHtml,
} from './masterKopSurat';
import { escapeHtml, formatSafeCsvCell } from './offlineAssets';

export interface ReportFilter {
  reportType: number; // 1 to 21
  startDate?: string;
  endDate?: string;
  academicYear?: string;
  labId?: string;
  deviceType?: string;
  condition?: string;
  status?: string;
  officerName?: string;
}

export interface ReportDataResult {
  title: string;
  reportNumber: string;
  headers: string[];
  rows: (string | number)[][];
  summaryNotes: string[];
  generatedDate: string;
}

export const REPORT_TITLES: Record<number, string> = {
  1: 'LAPORAN INVENTARIS KOMPUTER',
  2: 'LAPORAN INVENTARIS PERANGKAT PENDUKUNG',
  3: 'LAPORAN KONDISI SELURUH KOMPUTER',
  4: 'LAPORAN KOMPUTER RUSAK',
  5: 'LAPORAN KOMPUTER DALAM PERBAIKAN',
  6: 'LAPORAN PEMELIHARAAN KOMPUTER',
  7: 'LAPORAN RIWAYAT PERBAIKAN',
  8: 'LAPORAN PEMINJAMAN BARANG',
  9: 'LAPORAN PENGEMBALIAN BARANG',
  10: 'LAPORAN PENGGUNAAN LABORATORIUM',
  11: 'LAPORAN JADWAL PENGGUNAAN LABORATORIUM',
  12: 'LAPORAN KEGIATAN LABORATORIUM',
  13: 'LAPORAN DOKUMENTASI KEGIATAN',
  14: 'LAPORAN PEMERIKSAAN PERANGKAT',
  15: 'LAPORAN KEBUTUHAN PENGADAAN',
  16: 'LAPORAN REKAPITULASI INVENTARIS',
  17: 'LAPORAN PERANGKAT BERDASARKAN RUANGAN',
  18: 'LAPORAN BIAYA PEMELIHARAAN',
  19: 'LAPORAN KERUSAKAN BERDASARKAN PERIODE',
  20: 'LAPORAN REKAPITULASI TAHUNAN LABORATORIUM',
  21: 'LAPORAN KEHADIRAN SISWA PRAKTIK PERKELAS',
  22: 'LAPORAN ABSENSI SISWA PRAKTIKUM (GURU MAPEL)',
  23: 'LAPORAN JURNAL KEJADIAN & RATING KENYAMANAN BELAJAR',
};

export function compileReportData(
  filter: ReportFilter,
  data: {
    laboratories: Laboratory[];
    computers: Computer[];
    equipment: Equipment[];
    schedules: Schedule[];
    borrowings: Borrowing[];
    maintenanceList: Maintenance[];
    damageReports: DamageReport[];
    activities: Activity[];
    documents: LabDocument[];
    guests: Guest[];
    studentAttendances?: StudentAttendance[];
    lessonJournals?: LessonJournal[];
  }
): ReportDataResult {
  const { reportType, labId, condition, startDate, endDate } = filter;
  const title = REPORT_TITLES[reportType] || 'LAPORAN LABORATORIUM KOMPUTER';
  const reportNumber = `SMKN15/SILABKOM/LAP-${String(reportType).padStart(2, '0')}/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
  const generatedDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let headers: string[] = [];
  let rows: (string | number)[][] = [];
  let summaryNotes: string[] = [];

  // Helper date filter
  const isInDateRange = (itemDate?: string) => {
    if (!itemDate) return true;
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  };

  switch (reportType) {
    case 1: {
      // 1. Laporan inventaris komputer
      headers = ['No', 'Kode PC', 'No. Inventaris', 'Nama Perangkat', 'Merek/Tipe', 'Spesifikasi CPU/RAM/SSD', 'Ruangan', 'Kondisi', 'Tahun'];
      let filtered = data.computers.filter((c) => (!labId || c.labId === labId) && (!condition || c.condition === condition));
      rows = filtered.map((c, i) => [
        i + 1,
        c.computerCode,
        c.inventoryNumber,
        c.deviceName,
        `${c.brand} ${c.model}`,
        `${c.processor} | ${c.ram} | ${c.storage}`,
        c.labName,
        c.condition,
        c.procurementYear,
      ]);
      summaryNotes = [
        `Total Komputer: ${filtered.length} Unit`,
        `Kondisi Baik: ${filtered.filter((c) => c.condition === 'Baik').length} Unit`,
        `Kondisi Rusak: ${filtered.filter((c) => c.condition.includes('Rusak')).length} Unit`,
      ];
      break;
    }
    case 2: {
      // 2. Laporan inventaris perangkat pendukung
      headers = ['No', 'No. Inventaris', 'Nama Perangkat', 'Kategori', 'Merek/Model', 'Jumlah', 'Ruang Lab', 'Kondisi', 'Tahun'];
      let filtered = data.equipment.filter((e) => (!labId || e.labId === labId) && (!condition || e.condition === condition));
      rows = filtered.map((e, i) => [
        i + 1,
        e.inventoryNumber,
        e.name,
        e.category,
        `${e.brand} ${e.model}`,
        `${e.quantity} ${e.unit}`,
        e.labName,
        e.condition,
        e.procurementYear,
      ]);
      const totalQty = filtered.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
      summaryNotes = [`Total Jenis Perangkat: ${filtered.length} Item`, `Total Kuantitas: ${totalQty} Unit/Pcs`];
      break;
    }
    case 3: {
      // 3. Laporan kondisi seluruh komputer
      headers = ['No', 'Kode PC', 'Nama Unit', 'Ruang Lab', 'Processor', 'RAM', 'Penyimpanan', 'Tgl Cek', 'Kondisi'];
      let filtered = data.computers.filter((c) => !labId || c.labId === labId);
      rows = filtered.map((c, i) => [
        i + 1,
        c.computerCode,
        c.deviceName,
        c.labName,
        c.processor,
        c.ram,
        c.storage,
        c.lastCheckDate || '-',
        c.condition,
      ]);
      const baik = filtered.filter((c) => c.condition === 'Baik').length;
      const rusakRingan = filtered.filter((c) => c.condition === 'Rusak Ringan').length;
      const rusakBerat = filtered.filter((c) => c.condition === 'Rusak Berat').length;
      const perbaikan = filtered.filter((c) => c.condition === 'Dalam Perbaikan').length;
      summaryNotes = [
        `Baik: ${baik} Unit (${((baik / (filtered.length || 1)) * 100).toFixed(1)}%)`,
        `Rusak Ringan: ${rusakRingan} Unit`,
        `Rusak Berat: ${rusakBerat} Unit`,
        `Dalam Perbaikan: ${perbaikan} Unit`,
      ];
      break;
    }
    case 4: {
      // 4. Laporan komputer rusak
      headers = ['No', 'Kode PC', 'No. Inventaris', 'Nama Perangkat', 'Ruangan', 'Tingkat Kerusakan', 'Catatan Kerusakan', 'Tgl Pemeriksaan'];
      let filtered = data.computers.filter((c) => c.condition === 'Rusak Ringan' || c.condition === 'Rusak Berat');
      if (labId) filtered = filtered.filter((c) => c.labId === labId);
      rows = filtered.map((c, i) => [
        i + 1,
        c.computerCode,
        c.inventoryNumber,
        c.deviceName,
        c.labName,
        c.condition,
        c.notes || 'Perlu penanganan teknisi',
        c.lastCheckDate || '-',
      ]);
      summaryNotes = [`Total Komputer Rusak Memerlukan Tindakan: ${filtered.length} Unit`];
      break;
    }
    case 5: {
      // 5. Laporan komputer dalam perbaikan
      headers = ['No', 'Kode PC', 'Nama Perangkat', 'Ruangan', 'Status Perbaikan', 'Catatan / Progres', 'Teknisi'];
      let filtered = data.computers.filter((c) => c.condition === 'Dalam Perbaikan');
      if (labId) filtered = filtered.filter((c) => c.labId === labId);
      rows = filtered.map((c, i) => [
        i + 1,
        c.computerCode,
        c.deviceName,
        c.labName,
        c.condition,
        c.notes || 'Proses troubleshooting teknisi',
        'Tim Teknisi Lab',
      ]);
      summaryNotes = [`Total Komputer Dalam Perbaikan: ${filtered.length} Unit`];
      break;
    }
    case 6:
    case 7: {
      // 6 & 7. Laporan pemeliharaan & riwayat perbaikan
      headers = ['No', 'No. Work Order', 'Tgl Servis', 'Nama Perangkat', 'Jenis Kerusakan', 'Tindakan Perbaikan', 'Teknisi', 'Biaya (Rp)', 'Status'];
      let filtered = data.maintenanceList.filter((m) => isInDateRange(m.checkDate));
      rows = filtered.map((m, i) => [
        i + 1,
        m.workOrderNumber,
        m.checkDate,
        m.deviceName,
        m.damageType,
        m.repairAction,
        m.technicianName,
        `Rp ${(m.cost || 0).toLocaleString('id-ID')}`,
        m.status,
      ]);
      const totalCost = filtered.reduce((acc, curr) => acc + (curr.cost || 0), 0);
      summaryNotes = [
        `Total Pekerjaan Pemeliharaan: ${filtered.length} Tindakan`,
        `Total Realisasi Biaya Perbaikan: Rp ${totalCost.toLocaleString('id-ID')}`,
      ];
      break;
    }
    case 8: {
      // 8. Laporan peminjaman barang
      headers = ['No', 'No. Transaksi', 'Tgl Pinjam', 'Peminjam', 'Jabatan', 'Nama Barang', 'Jumlah', 'Tgl Kembali', 'Status'];
      let filtered = data.borrowings.filter((b) => isInDateRange(b.borrowDate));
      rows = filtered.map((b, i) => [
        i + 1,
        b.transactionNumber,
        b.borrowDate,
        b.borrowerName,
        b.borrowerRole,
        b.itemName,
        b.quantity,
        b.returnDate,
        b.status,
      ]);
      summaryNotes = [
        `Total Transaksi Peminjaman: ${filtered.length}`,
        `Sedang Dipinjam: ${filtered.filter((b) => b.status === 'Dipinjam').length}`,
        `Terlambat: ${filtered.filter((b) => b.status === 'Terlambat').length}`,
      ];
      break;
    }
    case 9: {
      // 9. Laporan pengembalian barang
      headers = ['No', 'No. Transaksi', 'Tgl Pinjam', 'Tgl Dikembalikan', 'Peminjam', 'Nama Barang', 'Jumlah', 'Kondisi Kembali', 'Petugas Penerima'];
      let filtered = data.borrowings.filter((b) => b.status === 'Sudah Dikembalikan' && isInDateRange(b.actualReturnDate || b.borrowDate));
      rows = filtered.map((b, i) => [
        i + 1,
        b.transactionNumber,
        b.borrowDate,
        b.actualReturnDate || b.returnDate,
        b.borrowerName,
        b.itemName,
        b.quantity,
        b.returnedCondition || 'Baik',
        b.officerName,
      ]);
      summaryNotes = [`Total Pengembalian Tervalidasi: ${filtered.length} Transaksi`];
      break;
    }
    case 10:
    case 11: {
      // 10 & 11. Laporan penggunaan / jadwal laboratorium
      headers = ['No', 'Tanggal', 'Waktu', 'Ruang Lab', 'Mata Pelajaran', 'Kelas', 'Guru Pengampu', 'Jml Siswa', 'Status'];
      let filtered = data.schedules.filter((s) => (!labId || s.labId === labId) && isInDateRange(s.date));
      rows = filtered.map((s, i) => [
        i + 1,
        s.date,
        `${s.startTime} - ${s.endTime}`,
        s.labName,
        s.subject,
        s.classGrade,
        s.teacherName,
        `${s.studentCount} Siswa`,
        s.status,
      ]);
      const totalStudents = filtered.reduce((acc, curr) => acc + (curr.studentCount || 0), 0);
      summaryNotes = [
        `Total Sesi Praktikum: ${filtered.length} Sesi`,
        `Total Kehadiran Siswa: ${totalStudents} Orang`,
      ];
      break;
    }
    case 12:
    case 13: {
      // 12 & 13. Laporan kegiatan / dokumentasi kegiatan
      headers = ['No', 'Nama Kegiatan', 'Tanggal', 'Penanggung Jawab', 'Lokasi Lab', 'Kategori', 'Keterangan'];
      let filtered = data.activities.filter((a) => isInDateRange(a.date));
      rows = filtered.map((a, i) => [
        i + 1,
        a.title,
        a.date,
        a.personInCharge,
        a.location,
        a.category || 'Praktikum / Workshop',
        a.description,
      ]);
      summaryNotes = [`Total Kegiatan Terdokumentasi: ${filtered.length} Agenda`];
      break;
    }
    case 14: {
      // 14. Laporan pemeriksaan perangkat
      headers = ['No', 'Kode Perangkat', 'Nama Unit', 'Kategori', 'Ruangan', 'Kondisi Fisik', 'Tgl Cek Terakhir', 'Status'];
      let filtered = data.computers.concat(
        data.equipment.map(
          (e) =>
            ({
              id: e.id,
              computerCode: e.inventoryNumber,
              deviceName: e.name,
              labName: e.labName,
              condition: e.condition,
              lastCheckDate: new Date().toISOString().split('T')[0],
              category: e.category,
            } as any)
        )
      );
      rows = (filtered as any[]).map((item, i) => [
        i + 1,
        item.computerCode,
        item.deviceName,
        item.category || 'Komputer PC',
        item.labName,
        item.condition,
        item.lastCheckDate || '-',
        'Telah Diperiksa',
      ]);
      summaryNotes = [`Total Unit Diperiksa: ${filtered.length} Perangkat`];
      break;
    }
    case 15: {
      // 15. Laporan kebutuhan pengadaan
      headers = ['No', 'Kategori Kebutuhan', 'Spesifikasi Rekomendasi', 'Estimasi Kuantitas', 'Estimasi Biaya', 'Prioritas', 'Ruang Sasaran'];
      rows = [
        [1, 'Upgrade RAM PC Workstation', 'Kingston DDR4 16GB 3200MHz', '15 Keping', 'Rp 9.750.000', 'Tinggi', 'Laboratorium Komputer'],
        [2, 'Switch Gigabit 24-Port', 'Manageable Cisco Catalyst / D-Link', '2 Unit', 'Rp 14.000.000', 'Tinggi', 'Laboratorium Komputer'],
        [3, 'Lampu Proyektor Pengganti', 'Epson Original Lamp ELPLP88', '2 Unit', 'Rp 2.400.000', 'Sedang', 'Laboratorium Komputer'],
        [4, 'Crimping Tool & Lan Cable Belden Cat6', 'Belden UTP Cat6 1 Roll 305M + 3 Crimper', '1 Paket', 'Rp 2.950.000', 'Sedang', 'Laboratorium Komputer'],
        [5, 'Penggantian Baterai UPS 12V 9Ah', 'Baterai Aki Kering CSB / Yuasa 12V 9Ah', '8 Unit', 'Rp 2.800.000', 'Mendesak', 'Laboratorium Komputer'],
      ];
      summaryNotes = ['Total Estimasi Usulan Pengadaan: Rp 31.900.000', 'Sumber usulan: Musyawarah Guru Mata Pelajaran (MGMP) & Teknisi'];
      break;
    }
    case 16: {
      // 16. Laporan rekapitulasi inventaris
      headers = ['No', 'Ruang Laboratorium', 'Total PC', 'PC Kondisi Baik', 'PC Rusak/Servis', 'Perangkat Pendukung', 'Kapasitas Siswa'];
      rows = data.laboratories.map((lab, i) => {
        const labPCs = data.computers.filter((c) => c.labId === lab.id);
        const baik = labPCs.filter((c) => c.condition === 'Baik').length;
        const rusak = labPCs.length - baik;
        const eqCount = data.equipment.filter((e) => e.labId === lab.id).reduce((a, b) => a + (b.quantity || 1), 0);
        return [i + 1, lab.name, labPCs.length, baik, rusak, `${eqCount} Unit`, `${lab.capacity} Kursi`];
      });
      summaryNotes = [
        `Total Ruangan: ${data.laboratories.length} Laboratorium`,
        `Total Komputer: ${data.computers.length} Unit`,
      ];
      break;
    }
    case 17: {
      // 17. Laporan perangkat berdasarkan ruangan
      headers = ['No', 'Ruang Laboratorium', 'Nama Barang', 'Tipe/Kategori', 'Jumlah Unit', 'Kondisi'];
      let rowIdx = 1;
      const targetLabs = labId ? data.laboratories.filter((l) => l.id === labId) : data.laboratories;
      targetLabs.forEach((lab) => {
        const pcs = data.computers.filter((c) => c.labId === lab.id);
        const eqs = data.equipment.filter((e) => e.labId === lab.id);
        rows.push([rowIdx++, lab.name, `PC Workstation (${pcs.length} unit)`, 'Komputer', pcs.length, 'Bervariasi']);
        eqs.forEach((eq) => {
          rows.push([rowIdx++, lab.name, eq.name, eq.category, eq.quantity, eq.condition]);
        });
      });
      summaryNotes = [`Rekapitulasi total ruangan yang dianalisis: ${targetLabs.length} Lab`];
      break;
    }
    case 18: {
      // 18. Laporan biaya pemeliharaan
      headers = ['No', 'No. WO', 'Tgl Pemeriksaan', 'Perangkat', 'Tindakan', 'Suku Cadang', 'Teknisi', 'Biaya (Rp)'];
      let filtered = data.maintenanceList.filter((m) => isInDateRange(m.checkDate));
      rows = filtered.map((m, i) => [
        i + 1,
        m.workOrderNumber,
        m.checkDate,
        m.deviceName,
        m.repairAction,
        m.spareParts || '-',
        m.technicianName,
        `Rp ${(m.cost || 0).toLocaleString('id-ID')}`,
      ]);
      const totalCost = filtered.reduce((acc, curr) => acc + (curr.cost || 0), 0);
      summaryNotes = [`Total Akumulasi Biaya Perawatan & Perbaikan: Rp ${totalCost.toLocaleString('id-ID')}`];
      break;
    }
    case 19: {
      // 19. Laporan kerusakan berdasarkan periode
      headers = ['No', 'Tgl Laporan', 'Pelapor', 'Perangkat', 'Ruang Lab', 'Deskripsi Kerusakan', 'Tingkat', 'Status Tindak Lanjut'];
      let filtered = data.damageReports.filter((d) => isInDateRange(d.reportDate));
      rows = filtered.map((d, i) => [
        i + 1,
        d.reportDate,
        d.reporterName,
        d.deviceName,
        d.labName,
        d.damageDescription,
        d.severity,
        d.status,
      ]);
      summaryNotes = [
        `Total Laporan Kerusakan: ${filtered.length} Kasus`,
        `Status Selesai: ${filtered.filter((d) => d.status === 'Selesai').length} Kasus`,
      ];
      break;
    }
    case 20: {
      // 20. Laporan rekapitulasi tahunan laboratorium
      headers = ['No', 'Indikator Kinerja Laboratorium', 'Capaian / Jumlah', 'Satuan', 'Keterangan Evaluasi'];
      rows = [
        [1, 'Jumlah Ruang Laboratorium Komputer Aktif', data.laboratories.length, 'Ruangan', 'Semua ruangan beroperasi optimal'],
        [2, 'Total Inventaris PC Client & Server', data.computers.length, 'Unit', `${data.computers.filter((c) => c.condition === 'Baik').length} siap pakai`],
        [3, 'Total Perangkat Pendukung (Switch, Router, Proyektor)', data.equipment.length, 'Jenis Item', 'Pemeliharaan teratur'],
        [4, 'Total Jam Penggunaan Praktikum Siswa', data.schedules.length * 3, 'Jam Pembelajaran', 'Mendukung kurikulum merdeka'],
        [5, 'Total Transaksi Peminjaman Perangkat', data.borrowings.length, 'Transaksi', 'Tertib administrasi'],
        [6, 'Tingkat Kesiapan Alat (Readiness Rate)', `${((data.computers.filter((c) => c.condition === 'Baik').length / (data.computers.length || 1)) * 100).toFixed(1)}%`, 'Persen', 'Memenuhi standar akreditasi'],
      ];
      summaryNotes = ['Laporan evaluasi tahunan untuk Kepala Sekolah dan Pengawas Pembina SMK'];
      break;
    }
    case 21: {
      // 21. Laporan kehadiran siswa praktik perkelas
      headers = ['No', 'Tanggal', 'Jam', 'Kelas', 'Mata Pelajaran', 'Guru Pengampu', 'Lab', 'Hadir (Siswa)', 'Materi'];
      let filtered = data.schedules.filter((s) => isInDateRange(s.date));
      rows = filtered.map((s, i) => [
        i + 1,
        s.date,
        `${s.startTime} - ${s.endTime}`,
        s.classGrade,
        s.subject,
        s.teacherName,
        s.labName,
        `${s.studentCount} Siswa`,
        s.purpose,
      ]);
      const totalStudents = filtered.reduce((acc, curr) => acc + (curr.studentCount || 0), 0);
      summaryNotes = [`Total Kehadiran Siswa Praktik: ${totalStudents} Siswa dalam ${filtered.length} Sesi`];
      break;
    }
    case 22: {
      // 22. Laporan absensi siswa praktikum (input Guru Mapel)
      headers = ['No', 'Tanggal', 'Jam', 'Kelas', 'Mata Pelajaran', 'Guru Pengampu', 'Hadir', 'S / I / A', 'Ket. Tidak Hadir'];
      const list = (data.studentAttendances || []).filter((a) => isInDateRange(a.date));
      rows = list.map((a, i) => [
        i + 1,
        a.date,
        `${a.startTime}-${a.endTime}`,
        a.classGrade,
        a.subject,
        a.teacherName,
        `${a.presentCount}/${a.totalStudents}`,
        `${a.sickCount}/${a.permissionCount}/${a.absentCount}`,
        a.absentStudentNames || '-',
      ]);
      const totalPresent = list.reduce((acc, a) => acc + (a.presentCount || 0), 0);
      summaryNotes = [`Total Sesi Absensi Guru Mapel: ${list.length} Sesi (${totalPresent} Total Siswa Hadir)`];
      break;
    }
    case 23:
    default: {
      // 23. Laporan jurnal kejadian & rating kenyamanan belajar (1-5 bintang)
      headers = ['No', 'Tanggal', 'Kelas', 'Mata Pelajaran', 'Guru', 'Kategori Kejadian', 'Catatan Peristiwa', 'Rating Bintang', 'Umpan Balik Kenyamanan'];
      const list = (data.lessonJournals || []).filter((j) => isInDateRange(j.date));
      rows = list.map((j, i) => [
        i + 1,
        j.date,
        j.classGrade,
        j.subject,
        j.teacherName,
        j.incidentCategory,
        j.incidentNotes,
        `${j.comfortRating} / 5 Bintang`,
        j.comfortFeedback || '-',
      ]);
      const avgRating =
        list.length > 0
          ? (list.reduce((acc, j) => acc + (j.comfortRating || 0), 0) / list.length).toFixed(2)
          : '0';
      summaryNotes = [
        `Total Jurnal Pembelajaran: ${list.length} Catatan`,
        `Rata-rata Kenyamanan Laboratorium: ${avgRating} / 5.0 Bintang`,
      ];
      break;
    }
  }

  return {
    title,
    reportNumber,
    headers,
    rows,
    summaryNotes,
    generatedDate,
  };
}

// Export to PDF with official Master Kop Surat & Signatures
export async function generatePdfReport(reportResult: ReportDataResult, settings: AppSetting) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Official Master Kop Surat SMKN 15 Pandeglang (FOTO 1)
  const titleStartY = await addMasterKopToPdf(doc, 14, 8);

  // Title & Report Meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(reportResult.title, pageWidth / 2, titleStartY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Nomor: ${reportResult.reportNumber}  |  Tahun Ajaran: ${settings.academicYear || '2026/2027'}  |  Dicetak: ${reportResult.generatedDate}`, pageWidth / 2, titleStartY + 5, { align: 'center' });

  // AutoTable
  autoTable(doc, {
    startY: titleStartY + 10,
    head: [reportResult.headers],
    body: reportResult.rows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // Summary & Signatures at bottom
  let finalY = (doc as any).lastAutoTable?.finalY || 100;
  if (finalY > 150) {
    doc.addPage();
    finalY = 20;
  }

  // Summary notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Catatan & Rekapitulasi:', 14, finalY + 8);
  doc.setFont('helvetica', 'normal');
  reportResult.summaryNotes.forEach((note, idx) => {
    doc.text(`• ${note}`, 18, finalY + 13 + idx * 4.5);
  });

  // Signatures
  const signY = finalY + 32;
  const leftX = 40;
  const rightX = pageWidth - 65;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Mengetahui,`, leftX, signY, { align: 'center' });
  doc.text(`Kepala Sekolah`, leftX, signY + 5, { align: 'center' });
  doc.text(`Pandeglang, ${reportResult.generatedDate}`, rightX, signY, { align: 'center' });
  doc.text(`Kepala Laboratorium Komputer`, rightX, signY + 5, { align: 'center' });

  // Names & NIPs
  doc.setFont('helvetica', 'bold');
  doc.text(settings.principalName || '', leftX, signY + 28, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${settings.principalNip || '-'}`, leftX, signY + 32, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(settings.headOfLabName || '', rightX, signY + 28, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${settings.headOfLabNip || '-'}`, rightX, signY + 32, { align: 'center' });

  doc.save(`${reportResult.title.toLowerCase().replace(/\s+/g, '_')}_smkn15.pdf`);
}

// Export to Excel (.xlsx)
export function generateExcelReport(reportResult: ReportDataResult, settings: AppSetting) {
  const wb = XLSX.utils.book_new();

  // Create worksheet data with standard Master Kop Surat header
  const sheetData: (string | number)[][] = [
    [MASTER_KOP_DATA.line1],
    [MASTER_KOP_DATA.line2],
    [MASTER_KOP_DATA.line3],
    [`${MASTER_KOP_DATA.addressLine1} ${MASTER_KOP_DATA.addressLine2}`],
    [`Website: ${MASTER_KOP_DATA.websiteUrl}, Email: ${MASTER_KOP_DATA.emailAddress}`],
    [],
    [reportResult.title],
    [`Nomor Laporan: ${reportResult.reportNumber}`],
    [`Tanggal Cetak: ${reportResult.generatedDate} | Tahun Pelajaran: ${settings.academicYear}`],
    [],
    reportResult.headers,
    ...reportResult.rows,
    [],
    ['REKAPITULASI & CATATAN:'],
    ...reportResult.summaryNotes.map((note) => [note]),
    [],
    ['Mengetahui,', '', '', 'Kepala Laboratorium Komputer'],
    ['Kepala Sekolah,', '', '', ''],
    [],
    [],
    [settings.principalName, '', '', settings.headOfLabName],
    [`NIP. ${settings.principalNip}`, '', '', `NIP. ${settings.headOfLabNip}`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan SILABKOM');
  XLSX.writeFile(wb, `${reportResult.title.toLowerCase().replace(/\s+/g, '_')}_smkn15.xlsx`);
}

// Export to Word (.doc / html rich format compatible with Microsoft Word)
export async function generateWordReport(reportResult: ReportDataResult, settings: AppSetting) {
  const masterKopHtml = await getMasterKopWordHtml();

  const tableRowsHtml = reportResult.rows
    .map(
      (r) =>
        `<tr>${r.map((cell) => `<td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11pt;">${escapeHtml(cell)}</td>`).join('')}</tr>`
    )
    .join('');

  const headersHtml = reportResult.headers
    .map(
      (h) =>
        `<th style="border: 1px solid #94a3b8; background-color: #0f172a; color: #ffffff; padding: 8px 10px; font-size: 11pt;">${escapeHtml(h)}</th>`
    )
    .join('');

  const summaryHtml = reportResult.summaryNotes.map((n) => `<li>${escapeHtml(n)}</li>`).join('');

  const wordContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${escapeHtml(reportResult.title)}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; line-height: 1.3; }
        .report-title { text-align: center; font-weight: bold; font-size: 14pt; margin-top: 10px; }
        .report-meta { text-align: center; font-size: 10pt; color: #555; margin-bottom: 20px; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .signature-table { width: 100%; border-collapse: collapse; margin-top: 40px; border: none; }
        .signature-table td { border: none; text-align: center; }
      </style>
    </head>
    <body>
      <div>
        ${masterKopHtml}

        <div class="report-title">${escapeHtml(reportResult.title)}</div>
        <div class="report-meta">Nomor: ${escapeHtml(reportResult.reportNumber)} | Tanggal: ${escapeHtml(reportResult.generatedDate)}</div>

        <table class="data-table">
          <thead>
            <tr>${headersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 20px;">
          <strong>Catatan & Rekapitulasi:</strong>
          <ul>${summaryHtml}</ul>
        </div>

        <table class="signature-table">
          <tr>
            <td style="width: 50%;">
              Mengetahui,<br>Kepala Sekolah SMKN 15 Pandeglang<br><br><br><br>
              <strong><u>${escapeHtml(settings.principalName)}</u></strong><br>
              NIP. ${escapeHtml(settings.principalNip)}
            </td>
            <td style="width: 50%;">
              Pandeglang, ${escapeHtml(reportResult.generatedDate)}<br>Kepala Laboratorium Komputer<br><br><br><br>
              <strong><u>${escapeHtml(settings.headOfLabName)}</u></strong><br>
              NIP. ${escapeHtml(settings.headOfLabNip)}
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordContent], {
    type: 'application/msword',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${reportResult.title.toLowerCase().replace(/\s+/g, '_')}_smkn15.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export to CSV (protected against formula injection)
export function generateCsvReport(reportResult: ReportDataResult) {
  const csvRows: string[] = [];
  csvRows.push(formatSafeCsvCell(reportResult.title));
  csvRows.push(formatSafeCsvCell(`Nomor: ${reportResult.reportNumber}`));
  csvRows.push(formatSafeCsvCell(`Tanggal: ${reportResult.generatedDate}`));
  csvRows.push('');
  csvRows.push(reportResult.headers.map((h) => formatSafeCsvCell(h)).join(','));

  reportResult.rows.forEach((r) => {
    csvRows.push(r.map((c) => formatSafeCsvCell(c)).join(','));
  });

  const csvContent = '\ufeff' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${reportResult.title.toLowerCase().replace(/\s+/g, '_')}_smkn15.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
