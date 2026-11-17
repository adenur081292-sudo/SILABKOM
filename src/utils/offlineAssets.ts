/**
 * Offline-safe SVG placeholder assets and security sanitization helpers
 * for SILABKOM SMKN 15 Pandeglang.
 */

const buildSvgDataUri = (svgContent: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent.trim())}`;

export const OFFLINE_PC_PHOTO = buildSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#bg)"/>
  <rect x="170" y="65" width="300" height="185" rx="14" fill="#020617" stroke="#38bdf8" stroke-width="4"/>
  <rect x="186" y="81" width="268" height="153" rx="6" fill="#0f172a"/>
  <path d="M250 155 L295 190 L390 120" fill="none" stroke="#22d3ee" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="295" y="250" width="50" height="28" fill="#334155"/>
  <rect x="240" y="276" width="160" height="12" rx="6" fill="#475569"/>
  <text x="320" y="325" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="16" font-weight="700">WORKSTATION LAB KOMPUTER SMKN 15</text>
</svg>
`);

export const OFFLINE_LAB_PHOTO = '/assets/aistudio/WhatsApp_Image_2026-11-14_at_09.42.03_944f001f.jpeg';

export const OFFLINE_ACTIVITY_PHOTO = buildSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="actBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#0e7490"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#actBg)"/>
  <circle cx="320" cy="145" r="52" fill="#164e63" stroke="#22d3ee" stroke-width="3"/>
  <rect x="292" y="125" width="56" height="40" rx="6" fill="#22d3ee" opacity="0.25" stroke="#22d3ee" stroke-width="3"/>
  <text x="320" y="245" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="20" font-weight="800">DOKUMENTASI KEGIATAN LAB</text>
  <text x="320" y="275" text-anchor="middle" fill="#bae6fd" font-family="system-ui,sans-serif" font-size="14">SILABKOM SMKN 15 PANDEGLANG</text>
</svg>
`);

/**
 * Escapes HTML special characters to prevent XSS in generated HTML/Word documents.
 */
export function escapeHtml(input: string | number | null | undefined): string {
  const str = String(input ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Prevents CSV/Spreadsheet formula injection (e.g., =CMD(), +1+1, -1+1, @SUM())
 * while leaving valid negative numbers untouched.
 */
export function sanitizeSpreadsheetCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  const str = String(value);
  if (str.length === 0) return '';
  // Allow plain negative numbers like "-15" or "-3.5"
  if (/^-\d+(\.\d+)?$/.test(str.trim())) {
    return str;
  }
  const firstChar = str.charAt(0);
  if (firstChar === '=' || firstChar === '+' || firstChar === '-' || firstChar === '@' || firstChar === '\t' || firstChar === '\r') {
    return `'${str}`;
  }
  return str;
}

/**
 * Formats a safe RFC-4180 CSV cell with spreadsheet formula sanitization.
 */
export function formatSafeCsvCell(value: string | number | null | undefined): string {
  const safe = sanitizeSpreadsheetCell(value);
  return `"${safe.replace(/"/g, '""')}"`;
}
