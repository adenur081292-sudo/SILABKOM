import React, { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import {
  FIREBASE_HOSTING_DEFAULT_URL,
  copyTextSafely,
  resolveOfficialLoginUrl,
  sanitizeProductionUrl,
  testSilabkomHostingLive,
} from '../utils/authUtils';
import {
  Share2,
  Copy,
  Check,
  QrCode,
  MessageCircle,
  Link2,
  X,
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Globe,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Settings2,
} from 'lucide-react';

interface ShareLoginLinkCardProps {
  compact?: boolean;
}

export const ShareLoginLinkCard: React.FC<ShareLoginLinkCardProps> = ({ compact = false }) => {
  const { addToast, settings, saveSettings, logActivity, hasPermission, isSuperAdmin } = useApp();
  const [copied, setCopied] = useState(false);
  const [manualCopyHint, setManualCopyHint] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [urlInput, setUrlInput] = useState(settings.productionLoginUrl || FIREBASE_HOSTING_DEFAULT_URL);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [probeStatus, setProbeStatus] = useState<{
    checked: boolean;
    ok: boolean;
    message: string;
  } | null>(null);

  const qrCanvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const linkInputRef = useRef<HTMLInputElement | null>(null);

  const canConfigureUrl = isSuperAdmin || hasPermission('manageSettings') || hasPermission('manageUsers');

  useEffect(() => {
    if (settings.productionLoginUrl) {
      setUrlInput(settings.productionLoginUrl);
    }
  }, [settings.productionLoginUrl]);

  const resolved = useMemo(
    () => resolveOfficialLoginUrl(settings.productionLoginUrl),
    [settings.productionLoginUrl]
  );

  const loginUrl = resolved.url;

  const shareMessage = useMemo(() => {
    if (!loginUrl) return '';
    return (
      `SILABKOM SMKN 15 PANDEGLANG\n\n` +
      `Silakan buka aplikasi SILABKOM melalui link berikut:\n\n` +
      `${loginUrl}\n\n` +
      `Login menggunakan email dan kata sandi yang telah diberikan administrator.`
    );
  }, [loginUrl]);

  const whatsappHref = useMemo(
    () => (shareMessage ? `https://wa.me/?text=${encodeURIComponent(shareMessage)}` : '#'),
    [shareMessage]
  );

  const ensureProductionUrlAvailable = (): boolean => {
    if (loginUrl) return true;
    setIsConfigOpen(true);
    addToast(
      'warning',
      'URL Produksi Belum Aktif',
      'Anda sedang di mode preview AI Studio (ais-dev). Publikasikan ke Firebase Hosting lalu uji/simpan URL produksi HTTPS terlebih dahulu agar link bisa dibuka dari HP.'
    );
    return false;
  };

  const handleCopyLink = async () => {
    if (!ensureProductionUrlAvailable()) return;
    const ok = await copyTextSafely(loginUrl);
    if (ok) {
      setCopied(true);
      setManualCopyHint(false);
      addToast('success', 'LINK BERHASIL DISALIN', `URL login resmi siap ditempel di WhatsApp: ${loginUrl}`);
      logActivity('COPY_LOGIN_LINK', 'Berbagi Link Login', `Menyalin link login resmi: ${loginUrl}`);
      setTimeout(() => setCopied(false), 2800);
    } else {
      setManualCopyHint(true);
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
      addToast(
        'warning',
        'Salin Manual Diperlukan',
        'Browser membatasi clipboard otomatis. Tekan dan tahan URL di kotak tautan lalu pilih Salin.'
      );
    }
  };

  const handleWebShare = async () => {
    if (!ensureProductionUrlAvailable()) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'SILABKOM SMKN 15 PANDEGLANG',
          text: shareMessage,
          url: loginUrl,
        });
        logActivity('SHARE_LOGIN_LINK', 'Berbagi Link Login', `Membagikan link login melalui Web Share: ${loginUrl}`);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    await handleCopyLink();
  };

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ensureProductionUrlAvailable()) {
      e.preventDefault();
      return;
    }
    logActivity('SHARE_WHATSAPP_LINK', 'Berbagi Link Login', `Membuka bagikan link login ke WhatsApp (${loginUrl})`);
  };

  const handleOpenQr = () => {
    if (!ensureProductionUrlAvailable()) return;
    setIsQrOpen(true);
  };

  const handleProbeAndSaveUrl = async (saveAfterTest: boolean) => {
    const check = sanitizeProductionUrl(urlInput);
    if (!check.valid) {
      setProbeStatus({
        checked: true,
        ok: false,
        message: check.error || 'Format URL tidak valid.',
      });
      return;
    }

    setIsTestingUrl(true);
    const probe = await testSilabkomHostingLive(check.url);
    setIsTestingUrl(false);

    if (probe.ok) {
      setProbeStatus({
        checked: true,
        ok: true,
        message: `Domain ${check.url} aktif, online (HTTPS), dan menyajikan halaman login SILABKOM.`,
      });
      if (saveAfterTest && canConfigureUrl) {
        await saveSettings({
          ...settings,
          productionLoginUrl: check.url,
        });
        setUrlInput(check.url);
        setIsConfigOpen(false);
        addToast('success', 'URL Produksi Disimpan', `Link resmi SILABKOM sekarang menggunakan ${check.url}`);
      }
    } else {
      setProbeStatus({
        checked: true,
        ok: false,
        message: probe.reason || 'Domain belum merespons aplikasi SILABKOM.',
      });
    }
  };

  const handleForceSaveUrl = async () => {
    const check = sanitizeProductionUrl(urlInput);
    if (!check.valid) {
      addToast('error', 'URL Tidak Valid', check.error || 'Masukkan URL HTTPS yang valid.');
      return;
    }
    await saveSettings({
      ...settings,
      productionLoginUrl: check.url,
    });
    setUrlInput(check.url);
    setIsConfigOpen(false);
    addToast('success', 'URL Produksi Disimpan', `URL login resmi disimpan: ${check.url}`);
  };

  const handleDownloadQrPng = () => {
    const canvas = qrCanvasWrapperRef.current?.querySelector('canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = 'QR-Login-SILABKOM-SMKN15-Pandeglang.png';
    a.click();
    addToast('success', 'QR Code Diunduh', 'Gambar QR Code login berhasil diunduh.');
  };

  const handlePrintQr = () => {
    window.print();
  };

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-cyan-400 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                  BERBAGI LINK LOGIN SILABKOM
                </h2>
                {resolved.isProductionReady ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Domain Produksi HTTPS Aktif
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Perlu Domain Produksi Publik
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Bagikan satu tautan login resmi berbasis HTTPS agar dapat dibuka langsung dari HP, WhatsApp, maupun komputer tanpa perlu masuk Google AI Studio.
              </p>
            </div>
          </div>

          {canConfigureUrl && (
            <button
              type="button"
              onClick={() => setIsConfigOpen((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-cyan-600" />
              <span>{isConfigOpen ? 'Tutup Pengaturan URL' : 'Atur & Uji URL Produksi'}</span>
            </button>
          )}
        </div>

        {/* Warning when opened on AI Studio dev/shared preview without active public domain */}
        {resolved.warning && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <div className="font-bold">Peringatan Kompatibilitas Link HP &amp; WhatsApp</div>
              <p>{resolved.warning}</p>
            </div>
          </div>
        )}

        {/* Link Box + Action Buttons */}
        <div className={`flex flex-col ${compact ? 'lg:flex-row' : 'md:flex-row'} items-stretch md:items-center gap-3`}>
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
            <Globe className={`w-4 h-4 shrink-0 ${loginUrl ? 'text-cyan-600' : 'text-amber-500'}`} />
            <input
              ref={linkInputRef}
              type="text"
              readOnly
              value={loginUrl || 'Belum ada URL produksi HTTPS (klik "Atur & Uji URL Produksi")'}
              onClick={(e) => {
                if (loginUrl) (e.target as HTMLInputElement).select();
              }}
              className={`w-full bg-transparent text-xs font-mono font-semibold focus:outline-none truncate ${
                loginUrl ? 'text-slate-800' : 'text-amber-700 italic'
              }`}
              aria-label="Link Login Resmi SILABKOM"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copied ? 'LINK TERSALIN' : 'Salin Link'}</span>
            </button>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Bagikan via WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleWebShare}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Bagikan Link</span>
            </button>

            <button
              type="button"
              onClick={handleOpenQr}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-slate-700" />
              <span>QR Code Login</span>
            </button>
          </div>
        </div>

        {/* Manual Copy Fallback if clipboard API blocked */}
        {manualCopyHint && loginUrl && (
          <div className="p-3 rounded-2xl bg-slate-100 border border-slate-300 text-xs space-y-1.5">
            <div className="font-bold text-slate-800">Salin Manual (Clipboard diblokir browser):</div>
            <p className="text-slate-600">Pilih seluruh teks di bawah lalu salin secara manual:</p>
            <input
              type="text"
              readOnly
              value={loginUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 select-all"
            />
          </div>
        )}

        {/* Admin Production URL Configuration & Deployment Diagnostics Panel */}
        {isConfigOpen && canConfigureUrl && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-cyan-600" />
                  Konfigurasi &amp; Uji URL Produksi Resmi (Firebase Hosting / Custom Domain)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Masukkan URL publik HTTPS hasil publikasi Firebase Hosting (<span className="font-mono font-bold text-slate-700">{FIREBASE_HOSTING_DEFAULT_URL}</span>) atau domain resmi sekolah.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUrlInput(FIREBASE_HOSTING_DEFAULT_URL)}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 self-start cursor-pointer"
              >
                Gunakan Domain Firebase Hosting
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setProbeStatus(null);
                }}
                placeholder="https://driven-elf-nxq1s.web.app"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                disabled={isTestingUrl}
                onClick={() => handleProbeAndSaveUrl(true)}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingUrl ? 'animate-spin' : ''}`} />
                <span>{isTestingUrl ? 'Menguji Domain...' : 'Uji & Simpan URL'}</span>
              </button>
              <button
                type="button"
                onClick={handleForceSaveUrl}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0 cursor-pointer"
              >
                Simpan URL
              </button>
            </div>

            {probeStatus && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  probeStatus.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {probeStatus.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1.5 leading-relaxed">
                  <div className="font-bold">{probeStatus.message}</div>
                  {!probeStatus.ok && (
                    <div className="text-[11px] text-rose-800 space-y-1">
                      <div>Pastikan langkah publikasi Firebase Hosting telah dijalankan:</div>
                      <code className="block bg-white/80 border border-rose-200 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-slate-800">
                        firebase login &amp;&amp; npm run build &amp;&amp; firebase deploy --only hosting
                      </code>
                      <div>
                        Lalu tambahkan domain tersebut di{' '}
                        <strong>Firebase Console → Authentication → Settings → Authorized domains</strong>.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {loginUrl && (
              <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                <span>Uji buka langsung di tab baru untuk memastikan halaman login termuat normal.</span>
                <a
                  href={loginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-cyan-700 hover:underline shrink-0"
                >
                  <span>Buka URL</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {isQrOpen && loginUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto print:bg-white">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2.5">
                <QrCode className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-sm">QR Code Login SILABKOM</h3>
                  <p className="text-[11px] text-slate-400">Pindai melalui kamera HP untuk membuka login</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQrOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="space-y-1">
                <div className="font-extrabold text-sm text-slate-900">
                  SILABKOM — {settings.schoolName || 'SMKN 15 PANDEGLANG'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Sistem Informasi Laboratorium Komputer
                </div>
              </div>

              <div className="inline-flex p-5 rounded-3xl bg-white border-2 border-slate-200 shadow-inner">
                <QRCodeSVG value={loginUrl} size={210} level="M" includeMargin={false} />
              </div>

              {/* Hidden high-res canvas for PNG download */}
              <div ref={qrCanvasWrapperRef} className="hidden">
                <QRCodeCanvas value={loginUrl} size={512} level="H" includeMargin={true} />
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 break-all">
                {loginUrl}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                QR Code ini hanya berisi alamat halaman login resmi (tanpa kata sandi maupun data akun). Pengguna tetap wajib memasukkan Email dan Kata Sandi masing-masing.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 print:hidden">
                <button
                  type="button"
                  onClick={handleDownloadQrPng}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  Unduh PNG
                </button>
                <button
                  type="button"
                  onClick={handlePrintQr}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak QR
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Salin Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
