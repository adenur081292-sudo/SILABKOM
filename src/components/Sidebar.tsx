import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Building2,
  Monitor,
  Cpu,
  CalendarCheck2,
  ArrowLeftRight,
  Wrench,
  AlertOctagon,
  Users,
  Image as ImageIcon,
  Images,
  FileSpreadsheet,
  BarChart3,
  Settings,
  X,
  BookOpen,
  ShieldCheck,
  ClipboardCheck,
  UserCog,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  TrendingUp,
  MonitorPlay,
  History,
  MonitorCheck,
  Laptop,
  UserCircle2,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  currentMenu: string;
  onSelectMenu: (menuId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMenu,
  onSelectMenu,
  isOpen,
  onClose,
}) => {
  const {
    userProfile,
    isSuperAdmin,
    activeRoleObject,
    canAccessMenu,
    logout,
    isLoggingOut,
    computers,
    laboratories,
    damageReports,
    schedules,
    borrowings,
    lessonJournals,
    students,
    galleryImages,
    computerUsages,
    computerDamageReports,
    settings,
  } = useApp();

  const [isAttendanceOpen, setIsAttendanceOpen] = React.useState<boolean>(true);
  const [isUsageOpen, setIsUsageOpen] = React.useState<boolean>(true);

  const pendingDamageCount = damageReports.filter((d) => d.status === 'Menunggu Verifikasi').length;
  const activeSchedulesCount = schedules.filter(
    (s) => s.status === 'Disetujui' || s.status === 'Sedang Berlangsung'
  ).length;
  const activeBorrowingsCount = borrowings.filter((b) => b.status === 'Dipinjam').length;
  const activeStudentsCount = students.filter((s) => s.status === 'Aktif').length;

  const attendanceSubmenus = [
    { id: 'attendance_dashboard', label: 'Dashboard Absensi', icon: LayoutDashboard, badge: null },
    {
      id: 'attendance_students',
      label: 'Manajemen Data Siswa',
      icon: Users,
      badge: activeStudentsCount > 0 ? activeStudentsCount : null,
    },
    { id: 'attendance_input', label: 'Input Absensi', icon: ClipboardCheck, badge: null },
    { id: 'attendance_recap', label: 'Rekap Absensi', icon: ClipboardList, badge: null },
    { id: 'attendance_charts', label: 'Grafik Kehadiran', icon: TrendingUp, badge: null },
    { id: 'attendance_reports', label: 'Laporan Absensi', icon: FileSpreadsheet, badge: '14' },
    { id: 'attendance_settings', label: 'Pengaturan Absensi', icon: Settings, badge: null },
  ];

  const allowedAttendanceSubmenus = attendanceSubmenus.filter((s) => canAccessMenu(s.id));
  const isAttendanceMenuActive = currentMenu.startsWith('attendance_');

  const activeUsageSessionsCount = computerUsages.filter((u) => u.usageStatus === 'Sedang Digunakan').length;
  const openUsageDamagesCount = computerDamageReports.filter((d) => d.followUpStatus !== 'Selesai Diperbaiki').length;

  const usageSubmenus = [
    { id: 'usage_dashboard', label: 'Dashboard Penggunaan', icon: LayoutDashboard, badge: null },
    {
      id: 'usage_input',
      label: 'Input Penggunaan Komputer',
      icon: MonitorPlay,
      badge: activeUsageSessionsCount > 0 ? activeUsageSessionsCount : null,
    },
    { id: 'usage_history', label: 'Riwayat Penggunaan', icon: History, badge: null },
    { id: 'usage_status', label: 'Status Komputer', icon: MonitorCheck, badge: null },
    { id: 'usage_reports', label: 'Laporan Penggunaan', icon: FileSpreadsheet, badge: '18' },
    {
      id: 'usage_damage',
      label: 'Laporan Kerusakan Penggunaan',
      icon: AlertOctagon,
      badge: openUsageDamagesCount > 0 ? openUsageDamagesCount : null,
    },
    { id: 'usage_settings', label: 'Pengaturan Penggunaan', icon: Settings, badge: null },
  ];

  const allowedUsageSubmenus = usageSubmenus.filter((s) => canAccessMenu(s.id));
  const isUsageMenuActive = currentMenu.startsWith('usage_');

  const menuGroups = [
    {
      title: 'Utama',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
        {
          id: 'practicum_journal',
          label: 'Jurnal & Absensi Praktikum',
          icon: ClipboardCheck,
          badge: lessonJournals.length > 0 ? lessonJournals.length : null,
        },
      ],
    },
    {
      title: 'Inventaris & Ruang',
      items: [
        { id: 'laboratories', label: 'Data Laboratorium', icon: Building2, badge: laboratories.length || null },
        { id: 'computers', label: 'Inventaris Komputer', icon: Monitor, badge: computers.length || null },
        { id: 'equipment', label: 'Perangkat Pendukung', icon: Cpu, badge: null },
      ],
    },
    {
      title: 'Operasional Lab',
      items: [
        {
          id: 'schedules',
          label: 'Jadwal Penggunaan',
          icon: CalendarCheck2,
          badge: activeSchedulesCount > 0 ? activeSchedulesCount : null,
        },
        {
          id: 'borrowings',
          label: 'Peminjaman & Kembali',
          icon: ArrowLeftRight,
          badge: activeBorrowingsCount > 0 ? activeBorrowingsCount : null,
        },
        { id: 'maintenance', label: 'Pemeliharaan & Servis', icon: Wrench, badge: null },
        {
          id: 'damage_reports',
          label: 'Laporan Kerusakan',
          icon: AlertOctagon,
          badge: pendingDamageCount > 0 ? pendingDamageCount : null,
          isAlert: pendingDamageCount > 0,
        },
      ],
    },
    {
      title: 'Administrasi & Laporan',
      items: [
        { id: 'users_lab', label: 'Pengguna Laboratorium', icon: Users, badge: null },
        { id: 'activities', label: 'Dokumentasi Kegiatan', icon: ImageIcon, badge: null },
        {
          id: 'gallery',
          label: 'Galeri Laboratorium',
          icon: Images,
          badge: galleryImages.length > 0 ? galleryImages.length : null,
        },
        { id: 'documents', label: 'Administrasi & SOP', icon: BookOpen, badge: null },
        { id: 'rules', label: 'Tata Tertib Lab', icon: ShieldCheck, badge: null },
        { id: 'reports', label: 'Pusat Laporan Otomatis', icon: FileSpreadsheet, badge: '23' },
        { id: 'analytics', label: 'Grafik & Statistik', icon: BarChart3, badge: null },
      ],
    },
    {
      title: 'Pengaturan Sistem',
      items: [
        { id: 'access_management', label: 'Akun & Hak Akses', icon: UserCog, badge: null },
        { id: 'settings', label: 'Pengaturan Aplikasi', icon: Settings, badge: null },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="px-4 py-4 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div
            onClick={() => {
              onSelectMenu('dashboard');
              onClose();
            }}
            className="flex items-center gap-3 min-w-0 cursor-pointer"
          >
            <img
              src={settings.logoUrl || '/assets/aistudio/LOGO_FIX_SMKN_15_2022_bdddecc6.png'}
              alt="Logo SMKN 15 Pandeglang"
              referrerPolicy="no-referrer"
              className="w-10 h-10 object-contain shrink-0 bg-white/10 rounded-xl p-1"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/assets/aistudio/LOGO_FIX_SMKN_15_2022_bdddecc6.png';
              }}
            />
            <div className="min-w-0">
              <div className="font-extrabold text-base tracking-tight text-white">
                SILAB<span className="text-cyan-400">KOM</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Laboratorium Komputer
              </div>
              <div className="text-[10px] font-bold text-cyan-400 truncate">
                SMKN 15 Pandeglang
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {/* Utama */}
          {menuGroups[0].items.some((i) => canAccessMenu(i.id)) && (
            <div className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {menuGroups[0].title}
              </div>
              {menuGroups[0].items
                .filter((item) => canAccessMenu(item.id))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectMenu(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-cyan-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== null && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            isActive ? 'bg-slate-900 text-cyan-300' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          )}

          {/* Modul ABSENSI KELAS */}
          {allowedAttendanceSubmenus.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setIsAttendanceOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isAttendanceMenuActive
                    ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <GraduationCap className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span className="truncate">ABSENSI KELAS</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 text-[10px] font-bold">
                    9 Kelas
                  </span>
                  {isAttendanceOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {isAttendanceOpen && (
                <div className="ml-3 pl-2.5 border-l border-slate-800 space-y-1">
                  {allowedAttendanceSubmenus.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = currentMenu === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          onSelectMenu(sub.id);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
                          isSubActive
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-slate-950' : 'text-cyan-400'}`} />
                          <span className="truncate">{sub.label}</span>
                        </div>
                        {sub.badge !== null && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              isSubActive ? 'bg-slate-900 text-cyan-300' : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {sub.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Modul PENGGUNAAN KOMPUTER */}
          {allowedUsageSubmenus.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setIsUsageOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isUsageMenuActive
                    ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Laptop className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span className="truncate">PENGGUNAAN KOMPUTER</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 text-[10px] font-bold">
                    {activeUsageSessionsCount > 0 ? `${activeUsageSessionsCount} Aktif` : `${computers.length} PC`}
                  </span>
                  {isUsageOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {isUsageOpen && (
                <div className="ml-3 pl-2.5 border-l border-slate-800 space-y-1">
                  {allowedUsageSubmenus.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = currentMenu === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          onSelectMenu(sub.id);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
                          isSubActive
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-slate-950' : 'text-cyan-400'}`} />
                          <span className="truncate">{sub.label}</span>
                        </div>
                        {sub.badge !== null && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              isSubActive
                                ? 'bg-slate-900 text-cyan-300'
                                : sub.id === 'usage_damage'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {sub.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Remaining Menu Groups */}
          {menuGroups.slice(1).map((group) => {
            const visibleItems = group.items.filter((i) => canAccessMenu(i.id));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {group.title}
                </div>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectMenu(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-cyan-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== null && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            isActive
                              ? 'bg-slate-900 text-cyan-300'
                              : (item as any).isAlert
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-3 py-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 shrink-0 space-y-2">
          <button
            type="button"
            onClick={() => {
              onSelectMenu('profile');
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
              currentMenu === 'profile'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
            }`}
          >
            <UserCircle2 className={`w-4 h-4 shrink-0 ${currentMenu === 'profile' ? 'text-slate-950' : 'text-cyan-400'}`} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold truncate">
                {userProfile?.displayName?.split(',')[0] || 'Profil Saya'}
              </div>
              <div className={`text-[10px] truncate ${currentMenu === 'profile' ? 'text-slate-900' : 'text-cyan-400'}`}>
                Level: {isSuperAdmin ? 'Super Administrator' : activeRoleObject?.name || 'Pengguna'}
              </div>
            </div>
          </button>
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={async () => {
              onClose();
              await logout();
            }}
            className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 disabled:opacity-50 text-rose-200 border border-rose-500/30 font-bold text-[11px] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>{isLoggingOut ? 'Mengakhiri Sesi...' : 'Keluar Akun'}</span>
          </button>
          <div className="px-1 font-semibold text-slate-500 text-[10px] truncate">
            SILABKOM SMKN 15 Pandeglang
          </div>
        </div>
      </aside>
    </>
  );
};
