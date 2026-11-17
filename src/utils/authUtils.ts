export const FIREBASE_HOSTING_DEFAULT_URL = 'https://driven-elf-nxq1s.web.app';

export type HostEnvironment =
  | 'firebase_hosting'
  | 'custom_domain'
  | 'aistudio_shared'
  | 'aistudio_dev'
  | 'local';

export interface ResolvedLoginUrlResult {
  url: string;
  env: HostEnvironment;
  source: 'configured' | 'hosting' | 'aistudio_shared' | 'aistudio_dev' | 'local';
  isProductionReady: boolean;
  suggestedHostingUrl: string;
  warning?: string;
}

export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._+-]/g, '');
}

export function classifyHostEnvironment(urlOrOrigin: string): HostEnvironment {
  if (!urlOrOrigin) return 'local';
  const lower = urlOrOrigin.toLowerCase();
  if (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0')
  ) {
    return 'local';
  }
  if (lower.includes('ais-dev-')) {
    return 'aistudio_dev';
  }
  if (lower.includes('ais-pre-')) {
    return 'aistudio_shared';
  }
  if (lower.includes('.web.app') || lower.includes('.firebaseapp.com')) {
    return 'firebase_hosting';
  }
  return 'custom_domain';
}

/**
 * Normalizes a production URL to clean HTTPS origin (no spaces, trailing slash, query, or hash).
 * Rejects localhost and AI Studio private dev preview URLs (ais-dev-*).
 */
export function sanitizeProductionUrl(rawInput?: string): {
  valid: boolean;
  url: string;
  env?: HostEnvironment;
  error?: string;
} {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { valid: false, url: '', error: 'Alamat URL masih kosong.' };
  }

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        url: '',
        error: 'URL aplikasi resmi wajib menggunakan protokol HTTPS agar aman di HP & WhatsApp.',
      };
    }

    const env = classifyHostEnvironment(parsed.origin);
    if (env === 'local') {
      return {
        valid: false,
        url: '',
        error: 'URL localhost/IP lokal tidak dapat dibuka dari HP pengguna lain.',
      };
    }
    if (env === 'aistudio_dev') {
      return {
        valid: false,
        url: '',
        error: 'URL sesi pengembangan (ais-dev-) hanya dapat dibuka oleh pembuat aplikasi di Google AI Studio.',
      };
    }

    return {
      valid: true,
      url: parsed.origin,
      env,
    };
  } catch {
    return {
      valid: false,
      url: '',
      error: 'Format URL tidak valid. Contoh yang benar: https://driven-elf-nxq1s.web.app',
    };
  }
}

export function resolveOfficialLoginUrl(savedProductionUrl?: string): ResolvedLoginUrlResult {
  // 1. Admin-configured production URL in Firestore Settings
  const savedCheck = sanitizeProductionUrl(savedProductionUrl);
  if (savedCheck.valid && savedCheck.url) {
    const env = savedCheck.env || 'custom_domain';
    const isShared = env === 'aistudio_shared';
    return {
      url: savedCheck.url,
      env,
      source: isShared ? 'aistudio_shared' : 'configured',
      isProductionReady: !isShared,
      suggestedHostingUrl: FIREBASE_HOSTING_DEFAULT_URL,
      warning: isShared
        ? 'URL Shared AI Studio (ais-pre) memerlukan akses Share AI Studio dan pengecekan cookie browser. Untuk hasil terbaik di WhatsApp HP, gunakan domain Firebase Hosting.'
        : undefined,
    };
  }

  // 2. Build-time environment override if set
  const envPublicUrl =
    typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PUBLIC_APP_URL
      ? String((import.meta as any).env.VITE_PUBLIC_APP_URL)
      : '';
  const envCheck = sanitizeProductionUrl(envPublicUrl);
  if (envCheck.valid && envCheck.url) {
    const env = envCheck.env || 'custom_domain';
    return {
      url: envCheck.url,
      env,
      source: 'configured',
      isProductionReady: env === 'firebase_hosting' || env === 'custom_domain',
      suggestedHostingUrl: FIREBASE_HOSTING_DEFAULT_URL,
    };
  }

  // 3. Current runtime browser origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    const currentEnv = classifyHostEnvironment(origin);

    if (currentEnv === 'firebase_hosting' || currentEnv === 'custom_domain') {
      const originCheck = sanitizeProductionUrl(origin);
      if (originCheck.valid) {
        return {
          url: originCheck.url,
          env: currentEnv,
          source: 'hosting',
          isProductionReady: true,
          suggestedHostingUrl: originCheck.url,
        };
      }
    }

    if (currentEnv === 'aistudio_shared') {
      return {
        url: origin,
        env: 'aistudio_shared',
        source: 'aistudio_shared',
        isProductionReady: false,
        suggestedHostingUrl: FIREBASE_HOSTING_DEFAULT_URL,
        warning:
          'Aplikasi sedang berjalan pada tautan Shared Preview Google AI Studio. Jika dibuka dari WhatsApp HP gagal atau meminta login Google, publikasikan ke Firebase Hosting terlebih dahulu.',
      };
    }

    if (currentEnv === 'aistudio_dev') {
      return {
        url: '',
        env: 'aistudio_dev',
        source: 'aistudio_dev',
        isProductionReady: false,
        suggestedHostingUrl: FIREBASE_HOSTING_DEFAULT_URL,
        warning:
          'Link saat ini adalah alamat preview pengembangan pribadi AI Studio (ais-dev-...). Link ini PASTI ERROR jika dikirim ke WhatsApp atau HP lain. Publikasikan aplikasi ke Firebase Hosting atau masukkan URL produksi HTTPS aktif di bawah.',
      };
    }
  }

  return {
    url: '',
    env: 'local',
    source: 'local',
    isProductionReady: false,
    suggestedHostingUrl: FIREBASE_HOSTING_DEFAULT_URL,
    warning:
      'Aplikasi berjalan di lingkungan lokal. Publikasikan ke Firebase Hosting lalu simpan URL produksi HTTPS sebelum membagikan link.',
  };
}

/**
 * Probes whether a candidate SILABKOM HTTPS URL actually serves the built app assets (200)
 * vs returning a 404 Hosting Not Found page, without CORS restrictions.
 */
export function testSilabkomHostingLive(baseUrl: string): Promise<{ ok: boolean; reason?: string }> {
  const check = sanitizeProductionUrl(baseUrl);
  if (!check.valid) {
    return Promise.resolve({ ok: false, reason: check.error });
  }

  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve({ ok: false, reason: 'Lingkungan browser tidak mendukung pengujian aset.' });
      return;
    }
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve({
        ok: false,
        reason: 'Waktu habis saat menghubungi domain. Pastikan domain sudah dipublikasikan dan online.',
      });
    }, 6500);

    img.onload = () => {
      window.clearTimeout(timer);
      resolve({ ok: true });
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve({
        ok: false,
        reason:
          'Domain belum mempublikasikan aplikasi SILABKOM (404 / Site Not Found atau terhalang autentikasi AI Studio). Jalankan deployment Firebase Hosting terlebih dahulu.',
      });
    };
    img.src = `${check.url}/assets/aistudio/LOGO_FIX_SMKN_15_2022_bdddecc6.png?probe=${Date.now()}`;
  });
}

export async function copyTextSafely(text: string): Promise<boolean> {
  if (!text) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.style.fontSize = '16px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export interface MobileEnvironmentInfo {
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isWhatsAppBrowser: boolean;
  isInAppBrowser: boolean;
}

export function detectMobileEnvironment(): MobileEnvironmentInfo {
  if (typeof navigator === 'undefined') {
    return {
      isMobile: false,
      isAndroid: false,
      isIOS: false,
      isWhatsAppBrowser: false,
      isInAppBrowser: false,
    };
  }

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isAndroid || isIOS || /Mobile/i.test(ua);
  const isWhatsAppBrowser = /WhatsApp/i.test(ua);
  const isInAppBrowser =
    isWhatsAppBrowser ||
    /FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|; wv\)/i.test(ua);

  return {
    isMobile,
    isAndroid,
    isIOS,
    isWhatsAppBrowser,
    isInAppBrowser,
  };
}

export function buildAndroidChromeIntentUrl(targetUrl?: string): string {
  try {
    const urlStr = targetUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const parsed = new URL(urlStr);
    const hostAndPath = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
    const fallback = encodeURIComponent(parsed.href);
    return `intent://${hostAndPath}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
  } catch {
    return '#';
  }
}

export function generateSecureInitialPassword(length = 10): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%';
  const all = upper + lower + digits + symbols;

  const pick = (chars: string) => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return chars[arr[0] % chars.length];
  };

  const result = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (result.length < length) {
    result.push(pick(all));
  }

  for (let i = result.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.join('');
}

export function translateFirebaseAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email atau kata sandi salah. Periksa kembali kredensial yang diberikan Administrator.';
    case 'auth/invalid-email':
      return 'Format alamat email tidak valid.';
    case 'auth/user-disabled':
      return 'Akun ini telah dinonaktifkan pada sistem autentikasi. Hubungi Administrator.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan login yang gagal. Silakan tunggu beberapa menit lalu coba lagi.';
    case 'auth/network-request-failed':
      return 'Koneksi internet terganggu atau layanan Firebase tidak dapat dijangkau. Periksa Wi-Fi/data seluler HP Anda lalu coba lagi.';
    case 'auth/unauthorized-domain':
      return 'Domain website ini belum terdaftar pada Authorized Domains di Firebase Authentication. Hubungi Administrator untuk mendaftarkan domain ini di Firebase Console → Authentication → Settings → Authorized domains.';
    case 'auth/web-storage-unsupported':
      return 'Browser internal memblokir penyimpanan sesi login. Gunakan tombol "Buka di Browser" (Chrome atau Safari) lalu coba masuk kembali.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter kombinasi huruf dan angka.';
    case 'auth/email-already-in-use':
      return 'Email ini sudah terdaftar pada Firebase Authentication.';
    case 'auth/operation-not-allowed':
      return 'Metode login Email & Kata Sandi belum diaktifkan di Firebase Console (Authentication → Sign-in method → Email/Password). Hubungi Administrator sistem.';
    case 'auth/popup-closed-by-user':
      return 'Jendela login Google ditutup sebelum proses selesai.';
    case 'auth/popup-blocked':
      return 'Pop-up login diblokir oleh browser. Gunakan form Email & Kata Sandi di atas atau buka halaman ini langsung di Chrome / Safari.';
    case 'auth/requires-recent-login':
      return 'Sesi login Anda perlu diperbarui. Silakan keluar dan masuk kembali sebelum mengganti kata sandi.';
    case 'auth/missing-email':
      return 'Masukkan alamat email yang terdaftar.';
    case 'auth/internal-error':
      return 'Terjadi gangguan sementara pada layanan autentikasi. Periksa koneksi internet dan muat ulang halaman.';
    default:
      return error?.message || 'Terjadi kesalahan saat proses autentikasi. Silakan coba lagi.';
  }
}

export function formatLoginTimestamp(iso?: string): string {
  if (!iso) return 'Belum pernah login';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Belum pernah login';
    return (
      d.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
    );
  } catch {
    return 'Belum pernah login';
  }
}
