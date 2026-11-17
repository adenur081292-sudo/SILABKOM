import React, { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { GuideModal } from './components/GuideModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WifiOff } from 'lucide-react';

// Views
import { LoginView } from './views/LoginView';
import { ProfileView } from './views/ProfileView';
import { DashboardView } from './views/DashboardView';
import { PracticumJournalView } from './views/PracticumJournalView';
import { LabsView } from './views/LabsView';
import { ComputersView } from './views/ComputersView';
import { EquipmentView } from './views/EquipmentView';
import { SchedulesView } from './views/SchedulesView';
import { BorrowingView } from './views/BorrowingView';
import { MaintenanceView } from './views/MaintenanceView';
import { DamageReportsView } from './views/DamageReportsView';
import { UsersLabView } from './views/UsersLabView';
import { ActivitiesView } from './views/ActivitiesView';
import { GalleryView } from './views/GalleryView';
import { DocumentsView } from './views/DocumentsView';
import { RulesView } from './views/RulesView';
import { ReportsView } from './views/ReportsView';
import { AnalyticsView } from './views/AnalyticsView';
import { AccessManagementView } from './views/AccessManagementView';
import { SettingsView } from './views/SettingsView';
import { AttendanceDashboardView } from './views/attendance/AttendanceDashboardView';
import { AttendanceStudentsView } from './views/attendance/AttendanceStudentsView';
import { AttendanceInputView } from './views/attendance/AttendanceInputView';
import { AttendanceRecapView } from './views/attendance/AttendanceRecapView';
import { AttendanceChartsView } from './views/attendance/AttendanceChartsView';
import { AttendanceReportsView } from './views/attendance/AttendanceReportsView';
import { AttendanceSettingsView } from './views/attendance/AttendanceSettingsView';
import { UsageDashboardView } from './views/usage/UsageDashboardView';
import { UsageInputView } from './views/usage/UsageInputView';
import { UsageHistoryView } from './views/usage/UsageHistoryView';
import { UsageStatusView } from './views/usage/UsageStatusView';
import { UsageReportsView } from './views/usage/UsageReportsView';
import { UsageDamageView } from './views/usage/UsageDamageView';
import { UsageSettingsView } from './views/usage/UsageSettingsView';

const KNOWN_MENU_IDS = new Set([
  'dashboard',
  'profile',
  'practicum_journal',
  'laboratories',
  'computers',
  'equipment',
  'schedules',
  'borrowings',
  'maintenance',
  'damage_reports',
  'users_lab',
  'activities',
  'gallery',
  'documents',
  'rules',
  'reports',
  'analytics',
  'access_management',
  'settings',
  'attendance_dashboard',
  'attendance_students',
  'attendance_input',
  'attendance_recap',
  'attendance_charts',
  'attendance_reports',
  'attendance_settings',
  'usage_dashboard',
  'usage_input',
  'usage_history',
  'usage_status',
  'usage_reports',
  'usage_damage',
  'usage_settings',
]);

const extractMenuFromUrl = (): string | null => {
  try {
    const params = new URLSearchParams(window.location.search);
    const paramMenu = params.get('menu') || params.get('view') || params.get('tab');
    if (paramMenu) return paramMenu;
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    if (rawHash) return rawHash;
    const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '').trim();
    if (rawPath && rawPath !== 'index.html' && rawPath !== 'login') {
      return rawPath;
    }
  } catch {
    // Ignore URL parsing issues
  }
  return null;
};

const MainLayout: React.FC = () => {
  const {
    authReady,
    currentUser,
    userProfile,
    canAccessMenu,
    logUnauthorizedAccess,
    addToast,
  } = useApp();

  const [currentMenu, setCurrentMenu] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Ensure document dark class is removed if previously set
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    const onOnline = () => setIsBrowserOnline(true);
    const onOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const isAuthenticated = Boolean(authReady && currentUser && userProfile && userProfile.isActive);

  // Enforce Login URL & block Browser Back / hash / query navigation when unauthenticated or logged out
  useEffect(() => {
    if (!authReady || isAuthenticated) return;

    const enforceLoginScreenAndUrl = () => {
      setCurrentMenu('dashboard');
      setIsSidebarOpen(false);
      setIsGuideOpen(false);
      if (
        window.location.search ||
        window.location.hash ||
        (window.location.pathname !== '/' && window.location.pathname !== '/login')
      ) {
        try {
          window.history.replaceState({ silabkomAuth: 'logged_out' }, '', '/');
        } catch {
          // Ignore history restrictions
        }
      }
    };

    const handleBlockedBackNavigation = () => {
      enforceLoginScreenAndUrl();
      try {
        window.history.pushState({ silabkomAuth: 'login_guard' }, '', '/');
      } catch {
        // Ignore history restrictions
      }
    };

    enforceLoginScreenAndUrl();
    window.addEventListener('popstate', handleBlockedBackNavigation);
    window.addEventListener('hashchange', handleBlockedBackNavigation);
    return () => {
      window.removeEventListener('popstate', handleBlockedBackNavigation);
      window.removeEventListener('hashchange', handleBlockedBackNavigation);
    };
  }, [authReady, isAuthenticated]);

  const handleSelectMenu = useCallback(
    (menuId: string) => {
      if (!authReady || !currentUser || !userProfile || !userProfile.isActive) {
        setCurrentMenu('dashboard');
        if (window.location.search || window.location.hash || window.location.pathname !== '/') {
          window.history.replaceState({ silabkomAuth: 'logged_out' }, '', '/');
        }
        return;
      }

      if (!KNOWN_MENU_IDS.has(menuId) || !canAccessMenu(menuId)) {
        addToast(
          'error',
          KNOWN_MENU_IDS.has(menuId) ? 'Akses Ditolak' : 'Halaman Tidak Ditemukan (404)',
          KNOWN_MENU_IDS.has(menuId)
            ? `Anda tidak memiliki hak akses untuk membuka halaman "${menuId}".`
            : `Halaman "${menuId}" tidak ditemukan. Anda dialihkan ke Dashboard.`
        );
        logUnauthorizedAccess(menuId);
        setCurrentMenu('dashboard');
        if (window.location.search || window.location.hash || window.location.pathname !== '/') {
          window.history.replaceState({}, '', '/');
        }
        return;
      }
      setCurrentMenu(menuId);
    },
    [authReady, currentUser, userProfile, canAccessMenu, addToast, logUnauthorizedAccess]
  );

  // Enforce URL parameter/hash/path RBAC & 404 protection
  useEffect(() => {
    if (!authReady || !currentUser || !userProfile?.isActive) {
      return;
    }

    const syncFromUrl = () => {
      const requested = extractMenuFromUrl();
      if (!requested) return;
      if (!KNOWN_MENU_IDS.has(requested) || !canAccessMenu(requested)) {
        addToast(
          'error',
          KNOWN_MENU_IDS.has(requested) ? 'Akses URL Ditolak' : 'Halaman Tidak Ditemukan (404)',
          KNOWN_MENU_IDS.has(requested)
            ? 'Anda tidak memiliki izin mengakses halaman yang diminta pada URL.'
            : 'Alamat halaman yang diminta tidak ditemukan. Anda dialihkan ke Dashboard.'
        );
        logUnauthorizedAccess(`URL:${requested}`);
        setCurrentMenu('dashboard');
        window.history.replaceState({}, '', '/');
      } else {
        setCurrentMenu(requested);
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('hashchange', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('hashchange', syncFromUrl);
    };
  }, [authReady, currentUser, userProfile?.isActive, canAccessMenu, addToast, logUnauthorizedAccess]);

  // Redirect to dashboard immediately if active role/permissions no longer allow currentMenu
  useEffect(() => {
    if (!authReady || !currentUser || !userProfile?.isActive) return;
    if (currentMenu !== 'dashboard' && currentMenu !== 'profile' && !canAccessMenu(currentMenu)) {
      setCurrentMenu('dashboard');
    }
  }, [authReady, currentUser, userProfile?.isActive, currentMenu, canAccessMenu]);

  // Reset menu to dashboard on sign out
  useEffect(() => {
    if (authReady && !currentUser) {
      setCurrentMenu('dashboard');
    }
  }, [authReady, currentUser]);

  // Auth Loading Gate
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-xl">
          <img
            src="/assets/aistudio/LOGO_FIX_SMKN_15_2022_bdddecc6.png"
            alt="Logo SMKN 15 Pandeglang"
            className="w-11 h-11 object-contain"
          />
        </div>
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
        <div className="text-sm font-bold tracking-wide text-slate-200">
          Memverifikasi Sesi SILABKOM...
        </div>
        <div className="text-xs text-slate-400 mt-1">
          SMKN 15 Pandeglang — Autentikasi Terpusat
        </div>
      </div>
    );
  }

  // Centralized Official Login Gate (Unauthenticated or Deactivated)
  if (!currentUser || !userProfile || !userProfile.isActive) {
    return (
      <>
        <LoginView />
        <ToastContainer />
      </>
    );
  }

  const renderActiveView = () => {
    if (!authReady || !currentUser || !userProfile || !userProfile.isActive) {
      return null;
    }

    if (currentMenu !== 'dashboard' && currentMenu !== 'profile' && !canAccessMenu(currentMenu)) {
      return <DashboardView onSelectMenu={handleSelectMenu} />;
    }

    switch (currentMenu) {
      case 'dashboard':
        return <DashboardView onSelectMenu={handleSelectMenu} />;
      case 'profile':
        return <ProfileView />;
      case 'practicum_journal':
        return <PracticumJournalView onSelectMenu={handleSelectMenu} />;
      case 'laboratories':
        return <LabsView />;
      case 'computers':
        return <ComputersView />;
      case 'equipment':
        return <EquipmentView />;
      case 'schedules':
        return <SchedulesView />;
      case 'borrowings':
        return <BorrowingView />;
      case 'maintenance':
        return <MaintenanceView />;
      case 'damage_reports':
        return <DamageReportsView />;
      case 'users_lab':
        return <UsersLabView />;
      case 'activities':
        return <ActivitiesView />;
      case 'gallery':
        return <GalleryView />;
      case 'documents':
        return <DocumentsView />;
      case 'rules':
        return <RulesView />;
      case 'reports':
        return <ReportsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'access_management':
        return <AccessManagementView />;
      case 'settings':
        return <SettingsView />;
      case 'attendance_dashboard':
        return <AttendanceDashboardView onSelectMenu={handleSelectMenu} />;
      case 'attendance_students':
        return <AttendanceStudentsView />;
      case 'attendance_input':
        return <AttendanceInputView />;
      case 'attendance_recap':
        return <AttendanceRecapView />;
      case 'attendance_charts':
        return <AttendanceChartsView />;
      case 'attendance_reports':
        return <AttendanceReportsView />;
      case 'attendance_settings':
        return <AttendanceSettingsView />;
      case 'usage_dashboard':
        return <UsageDashboardView onSelectMenu={handleSelectMenu} />;
      case 'usage_input':
        return <UsageInputView onSelectMenu={handleSelectMenu} />;
      case 'usage_history':
        return <UsageHistoryView />;
      case 'usage_status':
        return <UsageStatusView onSelectMenu={handleSelectMenu} />;
      case 'usage_reports':
        return <UsageReportsView />;
      case 'usage_damage':
        return <UsageDamageView />;
      case 'usage_settings':
        return <UsageSettingsView />;
      default:
        return <DashboardView onSelectMenu={handleSelectMenu} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 antialiased selection:bg-cyan-500 selection:text-white">
      {/* Left Navigation Sidebar */}
      <Sidebar
        currentMenu={currentMenu}
        onSelectMenu={handleSelectMenu}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Right Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <Navbar
          currentMenu={currentMenu}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenGuide={() => setIsGuideOpen(true)}
          onSelectMenu={handleSelectMenu}
        />

        {/* Offline Connectivity Banner */}
        {!isBrowserOnline && (
          <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Koneksi internet terputus. Perubahan mungkin belum tersinkronisasi sampai jaringan kembali aktif.</span>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{renderActiveView()}</div>
        </main>
      </div>

      {/* Floating Toasts */}
      <ToastContainer />

      {/* Interactive Guide Modal */}
      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}
