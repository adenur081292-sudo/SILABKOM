import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Menu,
  ShieldCheck,
  LogOut,
  Database,
  HelpCircle,
  Bell,
  ChevronDown,
  UserCog,
  UserCircle2,
  Briefcase,
} from 'lucide-react';

interface NavbarProps {
  currentMenu: string;
  onToggleSidebar: () => void;
  onOpenGuide: () => void;
  onSelectMenu: (menuId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenGuide,
  onSelectMenu,
}) => {
  const {
    currentUser,
    userProfile,
    currentRole,
    activeRoleObject,
    isSuperAdmin,
    logout,
    isLoggingOut,
    isOnlineDb,
    damageReports,
    computerDamageReports,
    canAccessMenu,
    settings,
  } = useApp();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const pendingDamageCount = damageReports.filter((d) => d.status === 'Menunggu Verifikasi').length;
  const openUsageDamageCount = computerDamageReports.filter((d) => d.followUpStatus !== 'Selesai Diperbaiki').length;
  const totalNotifications = pendingDamageCount + openUsageDamageCount;

  const roleDisplayName = isSuperAdmin
    ? 'Super Administrator'
    : activeRoleObject?.name || currentRole;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Sidebar Toggle & School Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="font-extrabold text-sm sm:text-base text-slate-900 truncate tracking-tight">
            {settings.appName || 'SILABKOM'} — {settings.schoolName || 'SMKN 15 Pandeglang'}
          </div>
          <div className="text-[11px] text-slate-500 hidden sm:block truncate">
            Sistem Informasi Manajemen Laboratorium Komputer · Tahun Pelajaran {settings.academicYear || '2026/2027'}
          </div>
        </div>
      </div>

      {/* Right: Sync Badge, Notifications, Guide, Authenticated Account Menu */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Sync Status Badge */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
            isOnlineDb
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
          title={isOnlineDb ? 'Tersinkronisasi otomatis ke Cloud Firestore' : 'Mode penyimpanan lokal'}
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isOnlineDb ? 'Cloud Firestore Aktif' : 'Mode Lokal'}</span>
        </div>

        {/* Pending Damage Notifications */}
        {(canAccessMenu('damage_reports') || canAccessMenu('usage_damage')) && (
          <button
            onClick={() => onSelectMenu(openUsageDamageCount > 0 ? 'usage_damage' : 'damage_reports')}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Lihat Laporan Kerusakan"
          >
            <Bell className="w-5 h-5" />
            {totalNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {totalNotifications}
              </span>
            )}
          </button>
        )}

        {/* Help / Guide Button */}
        <button
          onClick={onOpenGuide}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          title="Panduan Penggunaan Aplikasi"
        >
          <HelpCircle className="w-4 h-4 text-cyan-600" />
          <span>Panduan</span>
        </button>

        {/* User Profile Dropdown (No Role Switcher) */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
          >
            {(userProfile?.avatarUrl || currentUser?.photoURL) ? (
              <img
                src={userProfile?.avatarUrl || currentUser?.photoURL || ''}
                alt={userProfile?.displayName || 'User'}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-lg object-cover border border-slate-700"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold text-xs">
                {activeRoleObject?.code || 'U'}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold leading-tight truncate max-w-[130px]">
                {userProfile?.displayName?.split(',')[0] || 'Pengguna'}
              </div>
              <div className="text-[10px] text-cyan-300 leading-tight truncate max-w-[130px]">
                {roleDisplayName}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isProfileMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-2xl p-2 z-50">
                <div className="px-3 py-2.5 border-b border-slate-100 space-y-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {userProfile?.displayName || 'Pengguna SILABKOM'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {userProfile?.email}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 text-cyan-300 text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3" />
                      {roleDisplayName}
                    </span>
                    {userProfile?.position && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        <Briefcase className="w-3 h-3 text-slate-500" />
                        {userProfile.position}
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onSelectMenu('profile');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                  >
                    <UserCircle2 className="w-4 h-4 text-cyan-600" />
                    <span>Profil Saya &amp; Kata Sandi</span>
                  </button>

                  {canAccessMenu('access_management') && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onSelectMenu('access_management');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                    >
                      <UserCog className="w-4 h-4 text-cyan-600" />
                      <span>Manajemen Akun &amp; Link Login</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isLoggingOut}
                    onClick={async () => {
                      setIsProfileMenuOpen(false);
                      await logout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isLoggingOut ? 'Keluar Sistem...' : 'Keluar Sistem'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
