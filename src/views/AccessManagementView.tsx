import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { AccessRole, UserProfile, PermissionKey } from '../types';
import { ALL_MENU_DEFINITIONS, PERMISSION_DEFINITIONS } from '../utils/initialData';
import {
  FIREBASE_HOSTING_DEFAULT_URL,
  copyTextSafely,
  formatLoginTimestamp,
  generateSecureInitialPassword,
  resolveOfficialLoginUrl,
} from '../utils/authUtils';
import { ShareLoginLinkCard } from '../components/ShareLoginLinkCard';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  ShieldCheck,
  UserCog,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Users,
  Lock,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Search,
  KeyRound,
  Power,
  ShieldAlert,
  Info,
  Copy,
  Sparkles,
  History,
  UserX,
  Sliders,
} from 'lucide-react';

const emptyPermissions = (): Record<PermissionKey, boolean> => ({
  manageUsers: false,
  manageRoles: false,
  crudAllData: false,
  manageInventory: false,
  manageSchedules: false,
  manageBorrowings: false,
  manageMaintenance: false,
  manageDamage: false,
  manageReports: false,
  manageSettings: false,
  inputPracticumJournal: false,
  manageActivitiesDocs: false,
  manageGallery: false,
  viewClassAttendance: false,
  inputClassAttendance: false,
  manageAttendanceStudents: false,
  manageAttendanceReports: false,
  manageAttendanceSettings: false,
  viewComputerUsage: false,
  recordComputerUsage: false,
  manageComputerUsage: false,
  manageComputerDamageFollowUp: false,
});

export const AccessManagementView: React.FC = () => {
  const {
    accessRoles,
    systemUsers,
    schoolClasses,
    activityLogs,
    currentUser,
    isSuperAdmin,
    hasPermission,
    saveAccessRole,
    deleteAccessRole,
    createManagedUserAccount,
    saveSystemUser,
    toggleUserActiveStatus,
    deleteSystemUser,
    sendPasswordReset,
    addToast,
    settings,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'audit'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Role modal state
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AccessRole | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<string | null>(null);

  // User Create / Edit Profil modal state
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<UserProfile | null>(null);
  const [revokeUserTarget, setRevokeUserTarget] = useState<UserProfile | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserProfile | null>(null);

  // One-time credential handoff dialog after creating an account
  const [createdCredentialSummary, setCreatedCredentialSummary] = useState<{
    displayName: string;
    email: string;
    initialPassword: string;
    roleName: string;
    position: string;
    note?: string;
  } | null>(null);

  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [showInitialPassword, setShowInitialPassword] = useState(false);

  const canManageRoles = isSuperAdmin || hasPermission('manageRoles') || hasPermission('crudAllData');
  const canManageUsers = isSuperAdmin || hasPermission('manageUsers') || hasPermission('crudAllData');

  const [roleForm, setRoleForm] = useState<Partial<AccessRole>>({
    name: '',
    code: 'E',
    description: '',
    allowedMenus: ['dashboard', 'rules'],
    permissions: emptyPermissions(),
  });

  const [createForm, setCreateForm] = useState({
    displayName: '',
    email: '',
    initialPassword: '',
    position: '',
    role: 'guru_mapel',
    nip: '',
    subject: '',
    phone: '',
    assignedClassIds: [] as string[],
    isActive: true,
    hasCustomPermissions: false,
    customAllowedMenus: ['dashboard'] as string[],
    customPermissions: emptyPermissions(),
  });

  const [editProfileForm, setEditProfileForm] = useState({
    displayName: '',
    position: '',
    role: 'guru_mapel',
    nip: '',
    subject: '',
    phone: '',
    assignedClassIds: [] as string[],
    isActive: true,
  });

  const [permModalForm, setPermModalForm] = useState({
    role: 'guru_mapel',
    hasCustomPermissions: false,
    customAllowedMenus: ['dashboard'] as string[],
    customPermissions: emptyPermissions(),
    assignedClassIds: [] as string[],
  });

  const getRoleName = (roleId: string) =>
    accessRoles.find((r) => r.id === roleId)?.name || roleId;

  const getRoleObject = (roleId: string) =>
    accessRoles.find((r) => r.id === roleId);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return systemUsers.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (statusFilter === 'ACTIVE' && !u.isActive) return false;
      if (statusFilter === 'INACTIVE' && u.isActive) return false;
      if (!q) return true;
      return (
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.position || '').toLowerCase().includes(q) ||
        (u.nip || '').toLowerCase().includes(q) ||
        getRoleName(u.role).toLowerCase().includes(q)
      );
    });
  }, [systemUsers, searchQuery, roleFilter, statusFilter, accessRoles]);

  const securityLogs = useMemo(() => {
    const securityModules = ['Autentikasi', 'Keamanan Sistem', 'Keamanan & Akun', 'Manajemen Akun', 'Manajemen Hak Akses', 'Profil Pengguna'];
    return activityLogs.filter((l) => securityModules.includes(l.module)).slice(0, 100);
  }, [activityLogs]);

  // Role handlers
  const handleOpenAddRole = () => {
    setRoleForm({
      name: '',
      code: 'E',
      description: '',
      allowedMenus: ['dashboard', 'rules'],
      permissions: emptyPermissions(),
    });
    setEditingRole(null);
    setIsRoleFormOpen(true);
  };

  const handleOpenEditRole = (role: AccessRole) => {
    setEditingRole(role);
    setRoleForm({
      ...role,
      permissions: { ...emptyPermissions(), ...role.permissions },
      allowedMenus: [...role.allowedMenus],
    });
    setIsRoleFormOpen(true);
  };

  const toggleMenuInRoleForm = (menuId: string) => {
    const current = roleForm.allowedMenus || [];
    const next = current.includes(menuId)
      ? current.filter((m) => m !== menuId)
      : [...current, menuId];
    setRoleForm({ ...roleForm, allowedMenus: next });
  };

  const togglePermInRoleForm = (permKey: PermissionKey) => {
    const current = roleForm.permissions || emptyPermissions();
    setRoleForm({
      ...roleForm,
      permissions: {
        ...current,
        [permKey]: !current[permKey],
      },
    });
  };

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name) return;

    const generatedId = editingRole
      ? editingRole.id
      : roleForm.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '') || 'role_' + Date.now();

    await saveAccessRole({
      id: generatedId,
      name: roleForm.name,
      code: (roleForm.code || 'E').toUpperCase().slice(0, 3),
      description: roleForm.description || 'Hak akses kustom SILABKOM',
      allowedMenus: Array.from(new Set(['dashboard', ...(roleForm.allowedMenus || [])])),
      permissions: { ...emptyPermissions(), ...(roleForm.permissions || {}) },
      isSystem: editingRole?.isSystem || false,
    });
    setIsRoleFormOpen(false);
  };

  // Create User handlers
  const handleOpenCreateUser = () => {
    const defaultRoleObj = getRoleObject('guru_mapel');
    setCreateForm({
      displayName: '',
      email: '',
      initialPassword: generateSecureInitialPassword(10),
      position: 'Guru Mata Pelajaran',
      role: 'guru_mapel',
      nip: '',
      subject: '',
      phone: '',
      assignedClassIds: [],
      isActive: true,
      hasCustomPermissions: false,
      customAllowedMenus: defaultRoleObj?.allowedMenus || ['dashboard'],
      customPermissions: { ...emptyPermissions(), ...(defaultRoleObj?.permissions || {}) },
    });
    setShowInitialPassword(true);
    setIsCreateUserOpen(true);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.displayName.trim() || !createForm.email.trim() || createForm.initialPassword.length < 6) {
      addToast('warning', 'Lengkapi Data', 'Nama, Email valid, dan Kata Sandi awal minimal 6 karakter wajib diisi.');
      return;
    }

    setIsSubmittingUser(true);
    const res = await createManagedUserAccount({
      displayName: createForm.displayName,
      email: createForm.email,
      initialPassword: createForm.initialPassword,
      position: createForm.position || getRoleName(createForm.role),
      role: createForm.role,
      nip: createForm.nip,
      subject: createForm.subject,
      phone: createForm.phone,
      assignedClassIds: createForm.assignedClassIds,
      isActive: createForm.isActive,
      hasCustomPermissions: createForm.hasCustomPermissions,
      customAllowedMenus: createForm.customAllowedMenus,
      customPermissions: createForm.customPermissions,
    });
    setIsSubmittingUser(false);

    if (res.success) {
      setIsCreateUserOpen(false);
      setCreatedCredentialSummary({
        displayName: createForm.displayName.trim(),
        email: createForm.email.trim().toLowerCase(),
        initialPassword: res.alreadyInAuth ? '(Sudah ada di Firebase Auth)' : createForm.initialPassword,
        roleName: getRoleName(createForm.role),
        position: createForm.position || getRoleName(createForm.role),
        note: res.message,
      });
    }
  };

  // Edit User Profile handler
  const handleOpenEditProfile = (u: UserProfile) => {
    setEditingUser(u);
    setEditProfileForm({
      displayName: u.displayName || '',
      position: u.position || getRoleName(u.role),
      role: u.role,
      nip: u.nip || '',
      subject: u.subject || '',
      phone: u.phone || '',
      assignedClassIds: u.assignedClassIds || [],
      isActive: u.isActive,
    });
    setIsEditProfileOpen(true);
  };

  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editProfileForm.displayName.trim()) return;
    await saveSystemUser({
      ...editingUser,
      displayName: editProfileForm.displayName.trim(),
      position: editProfileForm.position.trim(),
      role: editProfileForm.role,
      nip: editProfileForm.nip.trim(),
      subject: editProfileForm.subject.trim(),
      phone: editProfileForm.phone.trim(),
      assignedClassIds: editProfileForm.assignedClassIds,
      isActive: editProfileForm.isActive,
    });
    setIsEditProfileOpen(false);
  };

  // Per-User Permission Modal handler
  const handleOpenPermissionModal = (u: UserProfile) => {
    const roleObj = getRoleObject(u.role);
    setEditingUser(u);
    setPermModalForm({
      role: u.role,
      hasCustomPermissions: Boolean(u.hasCustomPermissions),
      customAllowedMenus:
        u.hasCustomPermissions && u.customAllowedMenus?.length
          ? [...u.customAllowedMenus]
          : [...(roleObj?.allowedMenus || ['dashboard'])],
      customPermissions: {
        ...emptyPermissions(),
        ...(u.hasCustomPermissions ? u.customPermissions : roleObj?.permissions),
      },
      assignedClassIds: [...(u.assignedClassIds || [])],
    });
    setIsPermissionModalOpen(true);
  };

  const handlePermissionModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await saveSystemUser({
      ...editingUser,
      role: permModalForm.role,
      hasCustomPermissions: permModalForm.hasCustomPermissions,
      customAllowedMenus: Array.from(new Set(['dashboard', ...permModalForm.customAllowedMenus])),
      customPermissions: permModalForm.customPermissions,
      assignedClassIds: permModalForm.assignedClassIds,
    });
    setIsPermissionModalOpen(false);
  };

  const toggleClassSelection = (list: string[], cid: string, setter: (next: string[]) => void) => {
    setter(list.includes(cid) ? list.filter((x) => x !== cid) : [...list, cid]);
  };

  const handleCopyHandoff = async () => {
    if (!createdCredentialSummary) return;
    const resolved = resolveOfficialLoginUrl(settings.productionLoginUrl);
    const loginUrl = resolved.url || FIREBASE_HOSTING_DEFAULT_URL;
    const text =
      `Akun SILABKOM SMKN 15 Pandeglang\n` +
      `Nama: ${createdCredentialSummary.displayName}\n` +
      `Jabatan: ${createdCredentialSummary.position}\n` +
      `Role: ${createdCredentialSummary.roleName}\n` +
      `Link Login: ${loginUrl}\n` +
      `Email: ${createdCredentialSummary.email}\n` +
      `Kata Sandi Awal: ${createdCredentialSummary.initialPassword}\n\n` +
      `Harap segera login dan ganti kata sandi Anda melalui menu Profil Saya.`;
    const ok = await copyTextSafely(text);
    if (ok) {
      addToast('success', 'Info Akun Disalin', 'Kredensial sementara & link login berhasil disalin.');
    } else {
      addToast('warning', 'Salin Manual', 'Salin teks akun secara manual.');
    }
  };

  const availableRolesForAssignment = accessRoles.filter((r) => isSuperAdmin || r.id !== 'admin');

  if (!canManageUsers && !canManageRoles) {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-lg font-extrabold text-slate-900">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Halaman Manajemen Akun &amp; Hak Akses hanya dapat diakses oleh Administrator berwenang.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-cyan-600" />
            Manajemen Akun, Hak Akses &amp; Berbagi Link Login
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola akun pengguna terautentikasi Firebase, atur role dan hak akses spesifik, audit aktivitas login, serta bagikan link login resmi SILABKOM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'roles' && canManageRoles && (
            <button
              onClick={handleOpenAddRole}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              Tambah Level Hak Akses Baru
            </button>
          )}
          {activeTab === 'users' && canManageUsers && (
            <button
              onClick={handleOpenCreateUser}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              Buat Akun Pengguna Baru
            </button>
          )}
        </div>
      </div>

      {/* Share Official Login Link Panel */}
      {canManageUsers && <ShareLoginLinkCard />}

      {/* Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs inline-flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-cyan-400" />
          Akun Pengguna Sistem ({systemUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-4 h-4 text-cyan-400" />
          Level Hak Akses / Role ({accessRoles.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4 text-cyan-400" />
          Audit Aktivitas Login ({securityLogs.length})
        </button>
      </div>

      {/* TAB 1: SYSTEM USER ACCOUNTS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama pengguna, email, NIP, atau jabatan..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700"
            >
              <option value="ALL">Semua Role</option>
              {accessRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white border-b border-slate-800">
                    <th className="py-3 px-4 font-bold text-center w-12">No</th>
                    <th className="py-3 px-4 font-bold">Nama Pengguna</th>
                    <th className="py-3 px-4 font-bold">Email</th>
                    <th className="py-3 px-4 font-bold">Jabatan</th>
                    <th className="py-3 px-4 font-bold">Role</th>
                    <th className="py-3 px-4 font-bold text-center">Status Akun</th>
                    <th className="py-3 px-4 font-bold">Terakhir Login</th>
                    {canManageUsers && <th className="py-3 px-4 font-bold text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u, idx) => {
                    const isProtectedMaster = u.email.toLowerCase() === 'adenur081292@gmail.com';
                    const isSelf = u.uid === currentUser?.uid;
                    return (
                      <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{u.displayName}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            NIP: {u.nip || '-'} {isSelf && <span className="text-cyan-600 font-sans font-bold">• Anda</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{u.email}</div>
                          <div className="text-[10px] text-slate-400">
                            {u.authProvisioned ? 'Firebase Auth Aktif' : 'Akun Terdaftar'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {u.position || u.subject || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-cyan-300 font-bold text-[10px]">
                              {getRoleName(u.role)}
                            </span>
                            {u.hasCustomPermissions && (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold">
                                Izin Khusus
                              </span>
                            )}
                          </div>
                          {u.assignedClassIds && u.assignedClassIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {u.assignedClassIds.map((cid) => (
                                <span
                                  key={cid}
                                  className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 text-[9px] font-bold"
                                >
                                  {schoolClasses.find((c) => c.id === cid)?.name || cid}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                              <XCircle className="w-3 h-3" /> Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-600 font-mono">
                          {formatLoginTimestamp(u.lastLoginAt)}
                        </td>
                        {canManageUsers && (
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDetailUser(u)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 cursor-pointer"
                                title="Detail Akun"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditProfile(u)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                title="Edit Profil & Jabatan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenPermissionModal(u)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                                title="Atur Hak Akses & Role"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                              {!isProtectedMaster && !isSelf && (
                                <button
                                  type="button"
                                  onClick={() => toggleUserActiveStatus(u.uid, !u.isActive)}
                                  className={`p-1.5 rounded-lg cursor-pointer ${
                                    u.isActive
                                      ? 'text-amber-600 hover:bg-amber-50'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  title={u.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setResetPasswordTarget(u)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                                title="Reset Kata Sandi (Kirim Email)"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                              {!isProtectedMaster && !isSelf && (
                                <button
                                  type="button"
                                  onClick={() => setRevokeUserTarget(u)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title="Cabut Akses & Hapus Akun"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        Belum ada akun pengguna yang sesuai dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DYNAMIC ACCESS ROLES */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {accessRoles.map((role) => {
            const activePermCount = Object.values(role.permissions || {}).filter(Boolean).length;
            return (
              <div
                key={role.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-slate-900 text-cyan-400 font-extrabold text-base flex items-center justify-center shadow-sm">
                        {role.code || role.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-base text-slate-900">{role.name}</h3>
                          {role.isSystem ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Bawaan Sistem
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                              Ditambahkan Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {role.id}</div>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold shrink-0">
                      {systemUsers.filter((u) => u.role === role.id).length} Akun
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{role.description}</p>

                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Menu Diizinkan ({role.allowedMenus.length} Modul)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {role.allowedMenus.map((menuId) => {
                        const menuLabel = ALL_MENU_DEFINITIONS.find((m) => m.id === menuId)?.label || menuId;
                        return (
                          <span
                            key={menuId}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold"
                          >
                            {menuLabel}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Wewenang Aksi ({activePermCount} Izin Aktif)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PERMISSION_DEFINITIONS.filter((p) => role.permissions?.[p.key]).map((p) => (
                        <span
                          key={p.key}
                          className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          {p.label}
                        </span>
                      ))}
                      {activePermCount === 0 && (
                        <span className="text-[11px] text-slate-400 italic">Hanya akses lihat (Read-only)</span>
                      )}
                    </div>
                  </div>
                </div>

                {canManageRoles && (
                  <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                    {role.id !== 'admin' && (
                      <button
                        onClick={() => handleOpenEditRole(role)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Ubah Izin &amp; Menu
                      </button>
                    )}
                    {!role.isSystem && (
                      <button
                        onClick={() => setDeleteRoleTarget(role.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    )}
                    {role.id === 'admin' && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Otoritas penuh Super Administrator utama
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Log Audit Autentikasi &amp; Keamanan</h3>
              <p className="text-[11px] text-slate-500">
                Mencatat login, logout, reset kata sandi, perubahan akun/hak akses, dan percobaan akses ilegal.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-3 px-4 font-bold">Waktu</th>
                  <th className="py-3 px-4 font-bold">Pengguna</th>
                  <th className="py-3 px-4 font-bold">Role</th>
                  <th className="py-3 px-4 font-bold">Aksi</th>
                  <th className="py-3 px-4 font-bold">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {securityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {formatLoginTimestamp(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{log.userName}</td>
                    <td className="py-2.5 px-4 text-slate-600">{log.userRole}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          log.action.includes('UNAUTHORIZED') || log.action.includes('DISABLE') || log.action.includes('REVOKE')
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : log.action.includes('LOGIN')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{log.details}</td>
                  </tr>
                ))}
                {securityLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Belum ada catatan aktivitas keamanan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW USER ACCOUNT (FIREBASE AUTH + FIRESTORE) */}
      {isCreateUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserCog className="w-5 h-5 text-cyan-400" />
                Buat Akun Pengguna Baru (Firebase Auth)
              </h3>
              <button onClick={() => setIsCreateUserOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto scrollbar-thin">
              <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-950 text-[11px] leading-relaxed">
                Akun dibuat langsung di <strong>Firebase Authentication</strong> menggunakan sesi terisolasi sehingga sesi Administrator Anda tetap aktif. Kata sandi tidak disimpan di database Firestore.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={createForm.displayName}
                    onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                    placeholder="Contoh: Drs. H. Mulyadi, M.Pd."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jabatan Resmi *</label>
                  <input
                    type="text"
                    required
                    value={createForm.position}
                    onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
                    placeholder="Contoh: Kepala Sekolah / Wali Kelas X DKV"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email Login *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="nama@smkn15pandeglang.sch.id"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Kata Sandi Awal *</label>
                    <button
                      type="button"
                      onClick={() =>
                        setCreateForm({ ...createForm, initialPassword: generateSecureInitialPassword(10) })
                      }
                      className="text-[10px] font-bold text-cyan-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Acak Aman
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showInitialPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={createForm.initialPassword}
                      onChange={(e) => setCreateForm({ ...createForm, initialPassword: e.target.value })}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInitialPassword((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showInitialPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Role / Hak Akses *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => {
                      const nextRole = e.target.value;
                      const roleObj = getRoleObject(nextRole);
                      setCreateForm({
                        ...createForm,
                        role: nextRole,
                        customAllowedMenus: roleObj?.allowedMenus || ['dashboard'],
                        customPermissions: { ...emptyPermissions(), ...(roleObj?.permissions || {}) },
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    {availableRolesForAssignment.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">NIP / NUPTK</label>
                  <input
                    type="text"
                    value={createForm.nip}
                    onChange={(e) => setCreateForm({ ...createForm, nip: e.target.value })}
                    placeholder="1989..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="0812..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Class assignment */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  Kelas Tanggung Jawab (Khusus Wali Kelas / Petugas Absensi)
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  {schoolClasses.map((cls) => {
                    const checked = createForm.assignedClassIds.includes(cls.id);
                    return (
                      <label
                        key={cls.id}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] cursor-pointer ${
                          checked
                            ? 'bg-cyan-50 border-cyan-400 text-cyan-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleClassSelection(createForm.assignedClassIds, cls.id, (next) =>
                              setCreateForm({ ...createForm, assignedClassIds: next })
                            )
                          }
                          className="rounded accent-cyan-600"
                        />
                        <span>{cls.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                  className="rounded accent-cyan-600"
                />
                <span className="font-semibold text-slate-800">Aktifkan Akun Segera Setelah Dibuat</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-xl cursor-pointer"
                >
                  {isSubmittingUser ? 'Membuat Akun...' : 'Buat Akun Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONE-TIME CREDENTIAL HANDOFF DIALOG */}
      {createdCredentialSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Akun Pengguna Siap Digunakan</h3>
                <p className="text-[11px] text-slate-500">
                  Berikan kredensial ini secara pribadi kepada pengguna. Kata sandi tidak akan ditampilkan lagi setelah dialog ditutup.
                </p>
              </div>
            </div>

            {createdCredentialSummary.note && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                {createdCredentialSummary.note}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Nama:</span>
                <span className="font-bold text-slate-900 text-right">{createdCredentialSummary.displayName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Jabatan / Role:</span>
                <span className="font-bold text-slate-900 text-right">
                  {createdCredentialSummary.position} ({createdCredentialSummary.roleName})
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Email Login:</span>
                <span className="font-mono font-bold text-slate-900">{createdCredentialSummary.email}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Kata Sandi Awal:</span>
                <span className="font-mono font-extrabold text-cyan-700">{createdCredentialSummary.initialPassword}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyHandoff}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Salin Info Akun &amp; Link Login
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentialSummary(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER PROFILE */}
      {isEditProfileOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-cyan-400" />
                Edit Profil Pengguna
              </h3>
              <button onClick={() => setIsEditProfileOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditProfileSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email (Terkunci)</label>
                <input
                  type="email"
                  disabled
                  value={editingUser.email}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={editProfileForm.displayName}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, displayName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jabatan *</label>
                  <input
                    type="text"
                    required
                    value={editProfileForm.position}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">NIP / NUPTK</label>
                  <input
                    type="text"
                    value={editProfileForm.nip}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, nip: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    value={editProfileForm.phone}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mata Pelajaran / Unit Kerja</label>
                <input
                  type="text"
                  value={editProfileForm.subject}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Simpan Profil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN ROLE & CUSTOM PERMISSIONS FOR SPECIFIC USER */}
      {isPermissionModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                Atur Hak Akses: {editingUser.displayName}
              </h3>
              <button onClick={() => setIsPermissionModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePermissionModalSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto scrollbar-thin">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Role Dasar dari Database *</label>
                <select
                  value={permModalForm.role}
                  disabled={editingUser.email.toLowerCase() === 'adenur081292@gmail.com'}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    const roleObj = getRoleObject(nextRole);
                    setPermModalForm({
                      ...permModalForm,
                      role: nextRole,
                      ...(!permModalForm.hasCustomPermissions
                        ? {
                            customAllowedMenus: [...(roleObj?.allowedMenus || ['dashboard'])],
                            customPermissions: { ...emptyPermissions(), ...(roleObj?.permissions || {}) },
                          }
                        : {}),
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                >
                  {availableRolesForAssignment.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Kelas Tanggung Jawab (Opsional)</label>
                <div className="grid grid-cols-3 gap-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  {schoolClasses.map((cls) => {
                    const checked = permModalForm.assignedClassIds.includes(cls.id);
                    return (
                      <label
                        key={cls.id}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] cursor-pointer ${
                          checked
                            ? 'bg-cyan-50 border-cyan-400 text-cyan-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleClassSelection(permModalForm.assignedClassIds, cls.id, (next) =>
                              setPermModalForm({ ...permModalForm, assignedClassIds: next })
                            )
                          }
                          className="rounded accent-cyan-600"
                        />
                        <span>{cls.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permModalForm.hasCustomPermissions}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const roleObj = getRoleObject(permModalForm.role);
                    setPermModalForm({
                      ...permModalForm,
                      hasCustomPermissions: checked,
                      ...(checked && permModalForm.customAllowedMenus.length <= 1
                        ? {
                            customAllowedMenus: [...(roleObj?.allowedMenus || ['dashboard'])],
                            customPermissions: { ...emptyPermissions(), ...(roleObj?.permissions || {}) },
                          }
                        : {}),
                    });
                  }}
                  className="rounded accent-amber-600 mt-0.5"
                />
                <div>
                  <div className="font-bold text-amber-950">Gunakan Permission Khusus Per Akun (Override Role)</div>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    Jika diaktifkan, hak akses akun ini mengikuti daftar menu &amp; izin di bawah ini secara spesifik (tidak hanya mengikuti template role/nama jabatan).
                  </div>
                </div>
              </label>

              {permModalForm.hasCustomPermissions && (
                <div className="space-y-4 pt-2 border-t border-slate-200">
                  <div>
                    <label className="font-bold text-slate-900 block mb-2">Menu Khusus yang Diizinkan:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      {ALL_MENU_DEFINITIONS.map((m) => {
                        const checked = permModalForm.customAllowedMenus.includes(m.id);
                        return (
                          <label
                            key={m.id}
                            className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer ${
                              checked
                                ? 'bg-cyan-50 border-cyan-300 text-slate-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? permModalForm.customAllowedMenus.filter((x) => x !== m.id)
                                  : [...permModalForm.customAllowedMenus, m.id];
                                setPermModalForm({ ...permModalForm, customAllowedMenus: next });
                              }}
                              className="rounded accent-cyan-600"
                            />
                            <div>
                              <div className="text-xs">{m.label}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{m.group}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-900 block mb-2">Izin Aksi Khusus:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      {PERMISSION_DEFINITIONS.map((p) => {
                        const checked = Boolean(permModalForm.customPermissions[p.key]);
                        return (
                          <label
                            key={p.key}
                            className={`flex items-start gap-2 p-2 rounded-xl border cursor-pointer ${
                              checked
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setPermModalForm({
                                  ...permModalForm,
                                  customPermissions: {
                                    ...permModalForm.customPermissions,
                                    [p.key]: !checked,
                                  },
                                })
                              }
                              className="rounded accent-emerald-600 mt-0.5"
                            />
                            <div>
                              <div className="text-xs">{p.label}</div>
                              <div className="text-[10px] text-slate-500 font-normal">{p.desc}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPermissionModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Simpan Hak Akses Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: USER DETAIL */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                Detail Akun Pengguna
              </h3>
              <button onClick={() => setDetailUser(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-slate-400">Nama Lengkap</div>
                  <div className="font-bold text-slate-900">{detailUser.displayName}</div>
                </div>
                <div>
                  <div className="text-slate-400">Email</div>
                  <div className="font-semibold text-slate-800 break-all">{detailUser.email}</div>
                </div>
                <div>
                  <div className="text-slate-400">Jabatan</div>
                  <div className="font-semibold text-slate-800">{detailUser.position || '-'}</div>
                </div>
                <div>
                  <div className="text-slate-400">Role Sistem</div>
                  <div className="font-bold text-cyan-700">{getRoleName(detailUser.role)}</div>
                </div>
                <div>
                  <div className="text-slate-400">Status Akun</div>
                  <div className={`font-bold ${detailUser.isActive ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {detailUser.isActive ? 'Aktif' : 'Nonaktif'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Terakhir Login</div>
                  <div className="font-mono text-slate-700">{formatLoginTimestamp(detailUser.lastLoginAt)}</div>
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-700 mb-1.5">
                  Menu Aktif ({(detailUser.hasCustomPermissions ? detailUser.customAllowedMenus : getRoleObject(detailUser.role)?.allowedMenus)?.length || 0} Modul):
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {(detailUser.hasCustomPermissions
                    ? detailUser.customAllowedMenus || []
                    : getRoleObject(detailUser.role)?.allowedMenus || []
                  ).map((mid) => (
                    <span key={mid} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                      {ALL_MENU_DEFINITIONS.find((m) => m.id === mid)?.label || mid}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => setDetailUser(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ACCESS ROLE */}
      {isRoleFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                {editingRole ? `Edit Hak Akses: ${editingRole.name}` : 'Tambah Level Hak Akses Baru'}
              </h3>
              <button onClick={() => setIsRoleFormOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRole} className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="font-semibold text-slate-700 block mb-1">Nama Level Hak Akses *</label>
                  <input
                    type="text"
                    required
                    value={roleForm.name || ''}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="Contoh: Kepala Sekolah / Teknisi Lab / Wali Kelas"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kode</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={roleForm.code || 'E'}
                    onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value.toUpperCase() })}
                    placeholder="E"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi Wewenang</label>
                <input
                  type="text"
                  value={roleForm.description || ''}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Ringkasan tugas dan hak akses peran ini..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-900 block">Pilih Menu Sidebar yang Dapat Diakses:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  {ALL_MENU_DEFINITIONS.map((m) => {
                    const checked = (roleForm.allowedMenus || []).includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-cyan-50 border-cyan-300 text-slate-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMenuInRoleForm(m.id)}
                          className="rounded accent-cyan-600"
                        />
                        <div>
                          <div className="text-xs">{m.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{m.group}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-900 block">Pilih Izin Aksi / Operasi Data:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  {PERMISSION_DEFINITIONS.map((p) => {
                    const checked = Boolean(roleForm.permissions?.[p.key]);
                    return (
                      <label
                        key={p.key}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermInRoleForm(p.key)}
                          className="rounded accent-emerald-600 mt-0.5"
                        />
                        <div>
                          <div className="text-xs">{p.label}</div>
                          <div className="text-[10px] text-slate-500 font-normal">{p.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoleFormOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Simpan Level Hak Akses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={!!deleteRoleTarget}
        title="Hapus Level Hak Akses?"
        message="Level hak akses kustom ini akan dihapus dari sistem."
        onConfirm={async () => {
          if (deleteRoleTarget) {
            await deleteAccessRole(deleteRoleTarget);
            setDeleteRoleTarget(null);
          }
        }}
        onCancel={() => setDeleteRoleTarget(null)}
      />

      <ConfirmModal
        isOpen={!!revokeUserTarget}
        title="Cabut Akses Akun Pengguna?"
        message={`Akses untuk ${revokeUserTarget?.displayName || ''} (${revokeUserTarget?.email || ''}) akan segera dicabut dan pengguna tidak dapat masuk atau membaca data SILABKOM lagi.`}
        onConfirm={async () => {
          if (revokeUserTarget) {
            await deleteSystemUser(revokeUserTarget.uid);
            setRevokeUserTarget(null);
          }
        }}
        onCancel={() => setRevokeUserTarget(null)}
      />

      <ConfirmModal
        isOpen={!!resetPasswordTarget}
        title="Kirim Email Reset Kata Sandi?"
        message={`Sistem akan mengirimkan tautan pemulihan kata sandi resmi melalui Firebase Authentication ke email ${resetPasswordTarget?.email || ''}.`}
        confirmLabel="Kirim Email Reset"
        confirmVariant="primary"
        onConfirm={async () => {
          if (resetPasswordTarget) {
            const res = await sendPasswordReset(resetPasswordTarget.email);
            if (res.success) {
              addToast(
                'success',
                'Email Reset Terkirim',
                `Tautan atur ulang kata sandi telah dikirim ke ${resetPasswordTarget.email}.`
              );
            } else {
              addToast('error', 'Gagal Mengirim Reset', res.error || 'Gagal mengirim email reset.');
            }
            setResetPasswordTarget(null);
          }
        }}
        onCancel={() => setResetPasswordTarget(null)}
      />
    </div>
  );
};
