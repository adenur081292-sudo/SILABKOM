import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  buildAndroidChromeIntentUrl,
  classifyHostEnvironment,
  copyTextSafely,
  detectMobileEnvironment,
} from '../utils/authUtils';
import { testConnection } from '../firebase';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  Monitor,
  Loader2,
  WifiOff,
  ExternalLink,
  Copy,
  RefreshCw,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    loginWithEmailPassword,
    loginWithGoogle,
    sendPasswordReset,
    authNotice,
    clearAuthNotice,
    isOnlineDb,
    addToast,
    settings,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isFirebaseReachable, setIsFirebaseReachable] = useState<boolean>(isOnlineDb);
  const [isRetryingConn, setIsRetryingConn] = useState(false);

  const mobileInfo = useMemo(() => detectMobileEnvironment(), []);
  const hostEnv = useMemo(
    () =>
      classifyHostEnvironment(
        typeof window !== 'undefined' ? window.location.origin : ''
      ),
    []
  );

  useEffect(() => {
    setIsFirebaseReachable(isOnlineDb);
  }, [isOnlineDb]);

  useEffect(() => {
    const onOnline = () => setIsBrowserOnline(true);
    const onOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleRetryConnection = async () => {
    setIsRetryingConn(true);
    const ok = await testConnection();
    setIsFirebaseReachable(ok);
    setIsBrowserOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    setIsRetryingConn(false);
    if (ok) {
      addToast('success', 'Terhubung', 'Koneksi ke server Firebase berhasil dipulihkan.');
    } else {
      addToast('error', 'Masih Terputus', 'Layanan Firebase belum dapat dijangkau. Periksa jaringan internet Anda.');
    }
  };

  const handleCopyCurrentForBrowser = async () => {
    const targetUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const ok = await copyTextSafely(targetUrl);
    if (ok) {
      addToast('success', 'Link Disalin', 'Tempelkan URL di Google Chrome atau Safari untuk membuka SILABKOM.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBrowserOnline) {
      setErrorMsg('Koneksi internet terputus. Aktifkan Wi-Fi atau data seluler HP Anda lalu coba masuk kembali.');
      return;
    }

    setErrorMsg(null);
    clearAuthNotice();
    setIsSubmitting(true);

    const res = await loginWithEmailPassword(email, password, rememberMe);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Email atau kata sandi tidak valid.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBrowserOnline) {
      setErrorMsg('Koneksi internet terputus. Tidak dapat mengirim email pemulihan kata sandi.');
      return;
    }

    setErrorMsg(null);
    setResetSuccessMsg(null);
    clearAuthNotice();
    setIsSubmitting(true);

    const res = await sendPasswordReset(email);
    setIsSubmitting(false);

    if (res.success) {
      setResetSuccessMsg(
        `Tautan pemulihan kata sandi telah dikirim ke ${email.trim()}. Periksa kotak masuk atau folder spam email Anda.`
      );
    } else {
      setErrorMsg(res.error || 'Gagal mengirim email pemulihan kata sandi.');
    }
  };

  const handleGoogleLogin = async () => {
    if (!isBrowserOnline) {
      setErrorMsg('Koneksi internet terputus. Aktifkan jaringan internet Anda terlebih dahulu.');
      return;
    }

    setErrorMsg(null);
    clearAuthNotice();
    setIsGoogleLoading(true);
    const res = await loginWithGoogle();
    setIsGoogleLoading(false);
    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  const displayError = errorMsg || authNotice;
  const androidChromeIntent = buildAndroidChromeIntentUrl();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 font-sans antialiased selection:bg-cyan-500 selection:text-white">
      {/* Subtle Top Institutional Strip */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between px-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 font-semibold text-cyan-400">
          <Monitor className="w-3.5 h-3.5" />
          Portal Resmi Laboratorium Komputer
        </span>
        <span>TP {settings.academicYear || '2026/2027'}</span>
      </div>

      {/* Offline / Firebase Unreachable Alert */}
      {(!isBrowserOnline || !isFirebaseReachable) && (
        <div className="w-full max-w-md mb-3 p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/40 text-rose-100 text-xs flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-2.5">
            <WifiOff className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">
                {!isBrowserOnline ? 'Koneksi Internet Terputus' : 'Firebase Tidak Dapat Diakses'}
              </div>
              <p className="text-[11px] text-rose-200 leading-relaxed">
                {!isBrowserOnline
                  ? 'Perangkat HP/komputer Anda sedang offline. Nyalakan data seluler atau Wi-Fi untuk masuk.'
                  : 'Server autentikasi Firebase belum merespons. Periksa jaringan atau muat ulang halaman.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetryConnection}
            disabled={isRetryingConn}
            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isRetryingConn ? 'animate-spin' : ''}`} />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {/* WhatsApp / In-App Browser Compatibility Helper */}
      {(mobileInfo.isInAppBrowser || mobileInfo.isWhatsAppBrowser) && (
        <div className="w-full max-w-md mb-3 p-3.5 rounded-2xl bg-cyan-950/90 border border-cyan-500/40 text-cyan-50 text-xs space-y-2.5 shadow-lg">
          <div className="font-bold flex items-center gap-2 text-cyan-300">
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span>Dibuka dari Browser Internal WhatsApp</span>
          </div>
          <p className="text-[11px] text-cyan-100 leading-relaxed">
            Agar login lebih lancar, sesi tersimpan aman, dan unduhan/cetak laporan PDF berfungsi penuh, disarankan membuka halaman ini di browser utama HP Anda (Chrome / Safari).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {mobileInfo.isAndroid && androidChromeIntent !== '#' && (
              <a
                href={androidChromeIntent}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-[11px] inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka di Browser (Chrome)</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleCopyCurrentForBrowser}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{mobileInfo.isIOS ? 'Salin Link untuk Safari' : 'Salin Link'}</span>
            </button>
          </div>
          {mobileInfo.isIOS && (
            <p className="text-[10px] text-cyan-200">
              Pada iPhone, Anda juga dapat mengetuk ikon kompas (Safari) di pojok kanan bawah layar WhatsApp.
            </p>
          )}
        </div>
      )}

      {/* Private AI Studio Dev URL Hint for Admin */}
      {hostEnv === 'aistudio_dev' && (
        <div className="w-full max-w-md mb-3 px-3.5 py-2.5 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-100 text-[11px] leading-relaxed">
          <strong>Mode Pratinjau Pengembang AI Studio:</strong> Untuk membagikan akses login ke guru/staf via WhatsApp HP, masuk sebagai Administrator lalu salin link dari domain produksi Firebase Hosting pada menu <em>Berbagi Link Login</em>.
        </div>
      )}

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Institutional Header */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white px-6 py-7 text-center border-b border-slate-800">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/10 border border-white/15 p-2 flex items-center justify-center shadow-inner">
            <img
              src={settings.logoUrl || '/assets/aistudio/LOGO_FIX_SMKN_15_2022_bdddecc6.png'}
              alt="Logo SMKN 15 Pandeglang"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  '/assets/aistudio/LOGO_FIX_SMKN_15_2022_bdddecc6.png';
              }}
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            SILAB<span className="text-cyan-400">KOM</span>
          </h1>
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 mt-1">
            SISTEM INFORMASI LABORATORIUM KOMPUTER
          </p>
          <p className="text-xs font-extrabold text-slate-200 mt-0.5">
            SMKN 15 PANDEGLANG
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {displayError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{displayError}</div>
            </div>
          )}

          {resetSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{resetSuccessMsg}</div>
            </div>
          )}

          {mode === 'login' ? (
            <>
              <div className="text-center">
                <h2 className="text-base font-extrabold text-slate-900">Masuk ke Sistem</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gunakan email dan kata sandi resmi yang diberikan Administrator.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="text-xs font-bold text-slate-700 block mb-1.5">
                    Email Pengguna
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@smkn15pandeglang.sch.id"
                      className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="text-xs font-bold text-slate-700">
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMsg(null);
                        setResetSuccessMsg(null);
                        clearAuthNotice();
                      }}
                      className="text-xs font-bold text-cyan-700 hover:text-cyan-600 hover:underline py-1 cursor-pointer"
                    >
                      Lupa Kata Sandi?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className="w-full min-h-[46px] pl-10 pr-12 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded accent-cyan-600 w-4 h-4"
                  />
                  <span>Ingat sesi login secara aman pada perangkat ini</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleLoading}
                  className="w-full min-h-[48px] py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-extrabold text-sm sm:text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 text-cyan-400" />
                      <span>Masuk</span>
                    </>
                  )}
                </button>
              </form>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                  Atau
                </span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting || isGoogleLoading}
                className="w-full min-h-[44px] py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-cyan-600" />
                )}
                <span>Masuk dengan Akun Google (Akun Terdaftar)</span>
              </button>
            </>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setResetSuccessMsg(null);
                  }}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-cyan-600" />
                    Lupa Kata Sandi
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Masukkan email Anda untuk menerima tautan pemulihan kata sandi.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="forgot-email" className="text-xs font-bold text-slate-700 block mb-1.5">
                  Email Terdaftar
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@smkn15pandeglang.sch.id"
                    className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-extrabold text-sm sm:text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengirim Email Pemulihan...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Kirim Link Reset Kata Sandi</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setResetSuccessMsg(null);
                }}
                className="w-full py-2.5 text-center text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Kembali ke Halaman Masuk
              </button>
            </form>
          )}

          {/* Security Footer Notice */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-1">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Akun pengguna hanya dibuat oleh <strong className="text-slate-700">Administrator SILABKOM</strong>.
              Menu dan hak akses disesuaikan otomatis dengan otoritas akun Anda.
            </p>
            <p className="text-[10px] text-slate-400">
              SMKN 15 Pandeglang · Jl. Jaksa Agung R. Soeprapto KM.6, Cadasari
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
