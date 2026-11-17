import React from 'react';
import { MASTER_KOP_DATA } from '../utils/masterKopSurat';

interface MasterKopSuratProps {
  className?: string;
}

/**
 * KOMPONEN MASTER KOP SURAT RESMI SMKN 15 PANDEGLANG
 * Dibuat sama persis secara visual dengan FOTO 1 (Master Template Absolut).
 * - Font: Tahoma, Verdana, Arial, sans-serif (hitam murni #000000)
 * - Logo Kiri: LOGO PROVINSI BANTEN ASLI (FOTO 2)
 * - Logo Kanan: LOGO SMKN 15 PANDEGLANG ASLI (FOTO 3)
 * - Garis Bawah: Garis tebal di atas + celah + garis tipis di bawah
 */
export const MasterKopSurat: React.FC<MasterKopSuratProps> = ({ className = '' }) => {
  return (
    <div
      className={`w-full bg-white text-black select-none ${className}`}
      style={{ fontFamily: MASTER_KOP_DATA.fontFamily }}
    >
      {/* Container responsif menjaga proporsi internal agar logo & teks tidak terdistorsi pada layar kecil */}
      <div className="w-full overflow-x-auto sm:overflow-visible print:overflow-visible">
        <div className="min-w-[540px] sm:min-w-0 print:min-w-0 w-full">
          {/* Baris Utama: Logo Kiri - Blok Teks Tengah - Logo Kanan */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 px-1 sm:px-2 pb-1.5">
            {/* Logo Kiri: Provinsi Banten (FOTO 2) */}
            <div className="shrink-0 flex items-center justify-start">
              <img
                src={MASTER_KOP_DATA.leftLogoPath}
                alt="Logo Provinsi Banten"
                className="h-[72px] sm:h-[88px] lg:h-[96px] print:h-[88px] w-auto object-contain"
              />
            </div>

            {/* Blok Teks Tengah Resmi */}
            <div className="flex-1 text-center text-black leading-tight">
              <div className="text-[12.5px] sm:text-[15px] lg:text-[17px] print:text-[14pt] font-normal tracking-[0.02em] leading-[1.2]">
                {MASTER_KOP_DATA.line1}
              </div>
              <div className="text-[15.5px] sm:text-[19px] lg:text-[22px] print:text-[17.5pt] font-bold tracking-[0.01em] leading-[1.15]">
                {MASTER_KOP_DATA.line2}
              </div>
              <div className="text-[15.5px] sm:text-[19px] lg:text-[22px] print:text-[17.5pt] font-bold tracking-[0.01em] leading-[1.15]">
                {MASTER_KOP_DATA.line3}
              </div>
              <div className="mt-1 text-[8.5px] sm:text-[10px] lg:text-[11px] print:text-[9pt] font-normal leading-[1.3]">
                {MASTER_KOP_DATA.addressLine1}
              </div>
              <div className="text-[8.5px] sm:text-[10px] lg:text-[11px] print:text-[9pt] font-normal leading-[1.3]">
                {MASTER_KOP_DATA.addressLine2}
              </div>
              <div className="text-[8.5px] sm:text-[10px] lg:text-[11px] print:text-[9pt] font-normal leading-[1.3]">
                <span>{MASTER_KOP_DATA.websiteLabel}</span>
                <a
                  href={MASTER_KOP_DATA.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0563C1] underline decoration-[#0563C1]"
                >
                  {MASTER_KOP_DATA.websiteUrl}
                </a>
                <span>{MASTER_KOP_DATA.emailSeparator}</span>
                <a
                  href={`mailto:${MASTER_KOP_DATA.emailAddress}`}
                  className="text-[#0563C1] underline decoration-[#0563C1]"
                >
                  {MASTER_KOP_DATA.emailAddress}
                </a>
              </div>
            </div>

            {/* Logo Kanan: SMKN 15 Pandeglang (FOTO 3) */}
            <div className="shrink-0 flex items-center justify-end">
              <img
                src={MASTER_KOP_DATA.rightLogoPath}
                alt="Logo SMKN 15 Pandeglang"
                className="h-[72px] sm:h-[88px] lg:h-[96px] print:h-[88px] w-auto object-contain"
              />
            </div>
          </div>

          {/* Garis Pembatas Ganda Resmi: Atas Tebal + Celah + Bawah Tipis */}
          <div className="w-full pt-[2px]">
            <div className="w-full h-[3px] bg-black" />
            <div className="w-full h-[2px] bg-white" />
            <div className="w-full h-[1px] bg-black" />
          </div>
        </div>
      </div>
    </div>
  );
};
