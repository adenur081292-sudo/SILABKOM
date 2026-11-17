import React from 'react';
import { AlertTriangle, RefreshCw, Home, Copy } from 'lucide-react';
import { copyTextSafely } from '../utils/authUtils';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Terjadi kendala saat memuat halaman aplikasi.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('SILABKOM ErrorBoundary caught error:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyCurrentUrl = async () => {
    await copyTextSafely(window.location.origin);
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h1 className="font-extrabold text-base">Halaman Tidak Dapat Dimuat</h1>
              <p className="text-xs text-slate-400">SILABKOM SMKN 15 Pandeglang</p>
            </div>
          </div>

          <div className="p-6 space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 leading-relaxed">
              {this.state.errorMessage}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1.5 leading-relaxed">
              <div className="font-bold text-slate-800">Langkah Penanganan:</div>
              <p>1. Pastikan koneksi internet (Wi-Fi / data seluler) pada HP atau komputer aktif.</p>
              <p>2. Jika Anda membuka link langsung dari aplikasi WhatsApp, coba buka melalui browser Chrome (Android) atau Safari (iPhone).</p>
              <p>3. Tekan tombol Muat Ulang di bawah.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span>Muat Ulang</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Beranda</span>
              </button>
              <button
                type="button"
                onClick={this.handleCopyCurrentUrl}
                className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                title="Salin URL halaman"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin URL</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
