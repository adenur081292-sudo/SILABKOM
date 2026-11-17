import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ALL_MENU_DEFINITIONS, PERMISSION_DEFINITIONS } from '../utils/initialData';
import { formatLoginTimestamp } from '../utils/authUtils';
import {
  UserCircle2,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Briefcase,
  CheckCircle2,
  KeyRound,
  Save,
  Eye,
  EyeOff,
  Clock,
  AlertCircle,
  LogOut,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const {
    userProfile,
    activeRoleObject,
    schoolClasses,
    isSuperAdmin,
    hasPermission,
    canAccessMenu,
    updateOwnProfile,
    changeOwnPassword,
    sendPasswordReset,
    addToast,
    logout,
    isLoggingOut,
  } = useApp();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [nip, setNip] = useState(userProfile?.nip || '');
  const [subject, setSubject] = useState(userProfile?.subject || '');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhone(userProfile.phone || '');
      setNip(userProfile.nip || '');
      setSubject(userProfile.subject || '');
      setAvatarUrl(userProfile.avatarUrl || '');
    }
  }, [userProfile]);

  if (!userProfile) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    await updateOwnProfile({ displayName, phone, nip, subject, avatarUrl });
    setIsSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    if (newPass.length < 6) {
      setPassError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    setIsChangingPass(true);
    const res = await changeOwnPassword(currentPass, newPass);
    setIsChangingPass(false);
    if (res.success) {
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      setPassError(res.error || 'Gagal mengganti kata sandi.');
    }
  };

  const handleSendResetLink = async () => {
    const res = await sendPasswordReset(userProfile.email);
    if (res.success) {
      addToast('success', 'Email Reset Terkirim', `Tautan reset kata sandi dikirim ke ${userProfile.email}.`);
    } else {
      addToast('error', 'Gagal Mengirim Reset', res.error || 'Terjadi kesalahan.');
    }
  };

  const allowedMenuItems = ALL_MENU_DEFINITIONS.filter((m) => canAccessMenu(m.id));
  const activePerms = PERMISSION_DEFINITIONS.filter((p) => hasPermission(p.key));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <UserCircle2 className="w-6 h-6 text-cyan-600" />
          Profil Pengguna &amp; Hak Akses Akun
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Informasi identitas akun dan otoritas akses Anda di SILABKOM SMKN 15 Pandeglang. Role, Jabatan, Status, dan Hak Akses dikunci oleh Administrator.
        </p>
      </div>

      {/* Top Profile Summary Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          {userProfile.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.displayName}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-cyan-400 font-extrabold text-xl flex items-center justify-center shrink-0">
              {(userProfile.displayName || 'U').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-slate-900 truncate">{userProfile.displayName}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                <CheckCircle2 className="w-3 h-3" /> {userProfile.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{userProfile.email}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-cyan-300 text-[11px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Role: {isSuperAdmin ? 'Super Administrator' : activeRoleObject?.name || userProfile.role}
              </span>
              {userProfile.position && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  {userProfile.position}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs space-y-1.5 shrink-0 min-w-[220px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Status Sesi Keamanan
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <Clock className="w-3.5 h-3.5 text-cyan-600" />
            <span>Login Terakhir:</span>
          </div>
          <div className="text-slate-600 font-mono text-[11px]">
            {formatLoginTimestamp(userProfile.lastLoginAt)}
          </div>
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={logout}
            className="w-full mt-2 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isLoggingOut ? 'Mengakhiri Sesi...' : 'Keluar Akun'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editable Safe Profile Fields */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900">Informasi Pribadi</h3>
            <span className="text-[11px] text-slate-400">Field hak akses dikunci sistem</span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Nama Lengkap *</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">NIP / NUPTK</label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="-"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">No. HP / WhatsApp</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Mata Pelajaran / Unit Tugas</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="-"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Read-only Locked Institutional Fields */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Data Terkunci oleh Administrator (Tidak Dapat Diubah Sendiri)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <div className="text-slate-400">Email Login</div>
                <div className="font-bold text-slate-800 truncate">{userProfile.email}</div>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <div className="text-slate-400">Jabatan Resmi</div>
                <div className="font-bold text-slate-800 truncate">{userProfile.position || '-'}</div>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <div className="text-slate-400">Role Sistem</div>
                <div className="font-bold text-cyan-700 truncate">
                  {isSuperAdmin ? 'Super Administrator' : activeRoleObject?.name || userProfile.role}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <div className="text-slate-400">Status Akun</div>
                <div className="font-bold text-emerald-700">{userProfile.isActive ? 'Aktif' : 'Nonaktif'}</div>
              </div>
            </div>
            {userProfile.assignedClassIds && userProfile.assignedClassIds.length > 0 && (
              <div className="pt-1">
                <div className="text-[10px] text-slate-500 mb-1">Kelas Tanggung Jawab:</div>
                <div className="flex flex-wrap gap-1">
                  {userProfile.assignedClassIds.map((cid) => (
                    <span
                      key={cid}
                      className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 text-[10px] font-bold"
                    >
                      {schoolClasses.find((c) => c.id === cid)?.name || cid}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4 text-cyan-400" />
            <span>{isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}</span>
          </button>
        </form>

        {/* Password Security & Account Permissions */}
        <div className="space-y-6">
          <form onSubmit={handleChangePassword} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-600" />
                Keamanan Kata Sandi
              </h3>
              <button
                type="button"
                onClick={handleSendResetLink}
                className="text-[11px] font-bold text-cyan-700 hover:underline cursor-pointer"
              >
                Kirim Link Reset ke Email
              </button>
            </div>

            {passError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1">Kata Sandi Saat Ini</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Masukkan kata sandi aktif"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kata Sandi Baru</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ulangi Kata Sandi Baru</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Konfirmasi kata sandi"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPass}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isChangingPass ? 'Memperbarui...' : 'Perbarui Kata Sandi'}</span>
            </button>
          </form>

          {/* Effective Permissions Summary */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3 text-xs">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Menu &amp; Kewenangan Akun Anda
            </h3>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Menu Diizinkan ({allowedMenuItems.length} Modul)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allowedMenuItems.map((m) => (
                  <span
                    key={m.id}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold"
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Izin Aksi Aktif ({activePerms.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activePerms.map((p) => (
                  <span
                    key={p.key}
                    className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold"
                  >
                    {p.label}
                  </span>
                ))}
                {activePerms.length === 0 && (
                  <span className="text-[11px] text-slate-400 italic">Akses lihat data sesuai modul yang diizinkan</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
