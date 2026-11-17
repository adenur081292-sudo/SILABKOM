import jsPDF from 'jspdf';
import {
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  VerticalAlign,
  ImageRun,
  ISectionOptions,
} from 'docx';

/**
 * MASTER TEMPLATE DATA KOP SURAT RESMI SMKN 15 PANDEGLANG
 * Dibuat sama persis dengan FOTO 1 (Master Template Absolut).
 * Jangan mengubah teks, ejaan, kapitalisasi, alamat, maupun logo.
 */
export const MASTER_KOP_DATA = {
  line1: 'PEMERINTAH PROVINSI BANTEN',
  line2: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
  line3: 'SMKN 15 PANDEGLANG',
  addressLine1: 'Jalan Jaksa Agung R. Soeprapto KM.6, Kp. Tapen RT.001 RW.003, Desa Cadasari,',
  addressLine2: 'Kecamatan Cadasari, Kabupaten Pandeglang, Provinsi Banten, Kode Pos: 42251',
  websiteLabel: 'Website: ',
  websiteUrl: 'https://smkn15pandeglang.sch.id/',
  emailSeparator: ', Email: ',
  emailAddress: 'smkn15pandeglang@gmail.com',
  leftLogoPath: '/assets/aistudio/LOGO_PROVINSI_BANTEN_ec8256ed.png',
  rightLogoPath: '/assets/aistudio/LOGO_FIX_SMKN_15_2022_bdddecc6.png',
  leftLogoAspect: 1545 / 1600, // 0.965625
  rightLogoAspect: 1000 / 1535, // 0.6514658
  fontFamily: "'Tahoma', 'Verdana', Arial, sans-serif",
} as const;

const cachedDataUrls = new Map<string, string>();
const cachedBytes = new Map<string, Uint8Array>();

export async function loadImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image')) return url;
  if (cachedDataUrls.has(url)) return cachedDataUrls.get(url) || null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (dataUrl) cachedDataUrls.set(url, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

export async function loadImageAsUint8Array(url: string): Promise<Uint8Array | null> {
  if (!url) return null;
  if (cachedBytes.has(url)) return cachedBytes.get(url) || null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const arr = new Uint8Array(buffer);
    cachedBytes.set(url, arr);
    return arr;
  } catch {
    return null;
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Merender Master Kop Surat ke Canvas beresolusi tinggi (~250-300 DPI)
 * dengan font Tahoma asli, posisi logo proporsional FOTO 2 & FOTO 3,
 * link Website/Email biru bergaris bawah, dan garis ganda tebal+tipis
 * yang 100% identik dengan FOTO 1.
 */
export async function renderMasterKopCanvasDataUrl(contentWidthMm: number): Promise<{
  dataUrl: string | null;
  heightMm: number;
}> {
  const heightMm = 37;
  if (typeof document === 'undefined') {
    return { dataUrl: null, heightMm };
  }

  const pxPerMm = 10; // ~254 DPI crisp output
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(contentWidthMm * pxPerMm);
  canvas.height = Math.round(heightMm * pxPerMm);
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: null, heightMm };

  // Solid white paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Load both official logos via dataUrl so canvas never taints
  const [leftDataUrl, rightDataUrl] = await Promise.all([
    loadImageAsDataUrl(MASTER_KOP_DATA.leftLogoPath),
    loadImageAsDataUrl(MASTER_KOP_DATA.rightLogoPath),
  ]);

  const [leftImg, rightImg] = await Promise.all([
    leftDataUrl ? loadHtmlImage(leftDataUrl) : Promise.resolve(null),
    rightDataUrl ? loadHtmlImage(rightDataUrl) : Promise.resolve(null),
  ]);

  const logoH = 27.5 * pxPerMm;
  const logoTop = 2.0 * pxPerMm;
  const sideInset = 2.5 * pxPerMm;

  if (leftImg) {
    const leftW = logoH * MASTER_KOP_DATA.leftLogoAspect;
    ctx.drawImage(leftImg, sideInset, logoTop, leftW, logoH);
  }

  if (rightImg) {
    const rightW = logoH * MASTER_KOP_DATA.rightLogoAspect;
    ctx.drawImage(rightImg, canvas.width - sideInset - rightW, logoTop, rightW, logoH);
  }

  // Center text block in pure black Tahoma
  const centerX = canvas.width / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000000';

  // Line 1: PEMERINTAH PROVINSI BANTEN (normal weight)
  ctx.font = `400 ${4.8 * pxPerMm}px Tahoma, Verdana, Arial, sans-serif`;
  ctx.fillText(MASTER_KOP_DATA.line1, centerX, 6.4 * pxPerMm);

  // Line 2: DINAS PENDIDIKAN DAN KEBUDAYAAN (bold)
  ctx.font = `700 ${6.1 * pxPerMm}px Tahoma, Verdana, Arial, sans-serif`;
  ctx.fillText(MASTER_KOP_DATA.line2, centerX, 12.7 * pxPerMm);

  // Line 3: SMKN 15 PANDEGLANG (bold)
  ctx.font = `700 ${6.1 * pxPerMm}px Tahoma, Verdana, Arial, sans-serif`;
  ctx.fillText(MASTER_KOP_DATA.line3, centerX, 19.1 * pxPerMm);

  // Line 4 & 5: Alamat
  ctx.font = `400 ${3.15 * pxPerMm}px Tahoma, Verdana, Arial, sans-serif`;
  ctx.fillText(MASTER_KOP_DATA.addressLine1, centerX, 23.7 * pxPerMm);
  ctx.fillText(MASTER_KOP_DATA.addressLine2, centerX, 27.5 * pxPerMm);

  // Line 6: Website + Email with blue underlined URLs
  const line6Y = 31.3 * pxPerMm;
  ctx.font = `400 ${3.15 * pxPerMm}px Tahoma, Verdana, Arial, sans-serif`;
  const seg1 = MASTER_KOP_DATA.websiteLabel;
  const seg2 = MASTER_KOP_DATA.websiteUrl;
  const seg3 = MASTER_KOP_DATA.emailSeparator;
  const seg4 = MASTER_KOP_DATA.emailAddress;

  const w1 = ctx.measureText(seg1).width;
  const w2 = ctx.measureText(seg2).width;
  const w3 = ctx.measureText(seg3).width;
  const w4 = ctx.measureText(seg4).width;
  const totalW = w1 + w2 + w3 + w4;

  let curX = centerX - totalW / 2;
  ctx.textAlign = 'left';

  ctx.fillStyle = '#000000';
  ctx.fillText(seg1, curX, line6Y);
  curX += w1;

  ctx.fillStyle = '#0563C1';
  ctx.fillText(seg2, curX, line6Y);
  ctx.fillRect(curX, line6Y + 0.35 * pxPerMm, w2, 0.22 * pxPerMm);
  curX += w2;

  ctx.fillStyle = '#000000';
  ctx.fillText(seg3, curX, line6Y);
  curX += w3;

  ctx.fillStyle = '#0563C1';
  ctx.fillText(seg4, curX, line6Y);
  ctx.fillRect(curX, line6Y + 0.35 * pxPerMm, w4, 0.22 * pxPerMm);

  // Garis pemisah horizontal ganda: ATAS TEBAL + BAWAH TIPIS
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 33.4 * pxPerMm, canvas.width, 0.95 * pxPerMm);
  ctx.fillRect(0, 35.0 * pxPerMm, canvas.width, 0.32 * pxPerMm);

  try {
    return { dataUrl: canvas.toDataURL('image/png'), heightMm };
  } catch {
    return { dataUrl: null, heightMm };
  }
}

/**
 * Menyematkan Master Kop Surat Resmi SMKN 15 Pandeglang ke dalam dokumen jsPDF.
 * Mengembalikan koordinat Y berikutnya untuk judul laporan.
 */
export async function addMasterKopToPdf(
  doc: jsPDF,
  marginX = 14,
  topY = 8
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - marginX * 2;

  const rendered = await renderMasterKopCanvasDataUrl(contentWidth);
  if (rendered.dataUrl) {
    try {
      doc.addImage(rendered.dataUrl, 'PNG', marginX, topY, contentWidth, rendered.heightMm);
      return topY + rendered.heightMm + 5;
    } catch {
      // Lanjut ke fallback vektor jika image embed gagal
    }
  }

  // Fallback vektor presisi (tetap memakai 2 logo PNG & teks exact FOTO 1)
  const [leftDataUrl, rightDataUrl] = await Promise.all([
    loadImageAsDataUrl(MASTER_KOP_DATA.leftLogoPath),
    loadImageAsDataUrl(MASTER_KOP_DATA.rightLogoPath),
  ]);

  const logoH = 27.5;
  if (leftDataUrl) {
    try {
      doc.addImage(leftDataUrl, 'PNG', marginX + 2.5, topY + 2, logoH * MASTER_KOP_DATA.leftLogoAspect, logoH);
    } catch {
      // ignore
    }
  }
  if (rightDataUrl) {
    const rightW = logoH * MASTER_KOP_DATA.rightLogoAspect;
    try {
      doc.addImage(rightDataUrl, 'PNG', pageWidth - marginX - 2.5 - rightW, topY + 2, rightW, logoH);
    } catch {
      // ignore
    }
  }

  const centerX = pageWidth / 2;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text(MASTER_KOP_DATA.line1, centerX, topY + 6.4, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16.5);
  doc.text(MASTER_KOP_DATA.line2, centerX, topY + 12.7, { align: 'center' });
  doc.text(MASTER_KOP_DATA.line3, centerX, topY + 19.1, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.text(MASTER_KOP_DATA.addressLine1, centerX, topY + 23.7, { align: 'center' });
  doc.text(MASTER_KOP_DATA.addressLine2, centerX, topY + 27.5, { align: 'center' });
  doc.text(
    `${MASTER_KOP_DATA.websiteLabel}${MASTER_KOP_DATA.websiteUrl}${MASTER_KOP_DATA.emailSeparator}${MASTER_KOP_DATA.emailAddress}`,
    centerX,
    topY + 31.3,
    { align: 'center' }
  );

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.95);
  doc.line(marginX, topY + 33.8, pageWidth - marginX, topY + 33.8);
  doc.setLineWidth(0.32);
  doc.line(marginX, topY + 35.1, pageWidth - marginX, topY + 35.1);

  return topY + 42;
}

/**
 * Menghasilkan blok HTML Master Kop Surat untuk ekspor Word (.doc) lengkap
 * dengan gambar logo base64 agar tetap tampil offline di Microsoft Word.
 */
export async function getMasterKopWordHtml(): Promise<string> {
  const [leftDataUrl, rightDataUrl] = await Promise.all([
    loadImageAsDataUrl(MASTER_KOP_DATA.leftLogoPath),
    loadImageAsDataUrl(MASTER_KOP_DATA.rightLogoPath),
  ]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const leftSrc = leftDataUrl || `${origin}${MASTER_KOP_DATA.leftLogoPath}`;
  const rightSrc = rightDataUrl || `${origin}${MASTER_KOP_DATA.rightLogoPath}`;

  return `
    <table style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 4px;">
      <tr>
        <td style="width: 14%; text-align: left; vertical-align: middle; border: none; padding: 2px 6px;">
          <img src="${leftSrc}" width="82" height="85" alt="Logo Provinsi Banten" style="display: block;" />
        </td>
        <td style="width: 72%; text-align: center; vertical-align: middle; border: none; font-family: Tahoma, Verdana, Arial, sans-serif; color: #000000; padding: 2px 4px;">
          <div style="font-size: 13.5pt; font-weight: normal; letter-spacing: 0.3px; line-height: 1.2;">${MASTER_KOP_DATA.line1}</div>
          <div style="font-size: 16.5pt; font-weight: bold; line-height: 1.18;">${MASTER_KOP_DATA.line2}</div>
          <div style="font-size: 16.5pt; font-weight: bold; line-height: 1.18;">${MASTER_KOP_DATA.line3}</div>
          <div style="font-size: 9pt; font-weight: normal; line-height: 1.28; margin-top: 2px;">${MASTER_KOP_DATA.addressLine1}</div>
          <div style="font-size: 9pt; font-weight: normal; line-height: 1.28;">${MASTER_KOP_DATA.addressLine2}</div>
          <div style="font-size: 9pt; font-weight: normal; line-height: 1.28;">
            ${MASTER_KOP_DATA.websiteLabel}<a href="${MASTER_KOP_DATA.websiteUrl}" style="color: #0563C1; text-decoration: underline;">${MASTER_KOP_DATA.websiteUrl}</a>${MASTER_KOP_DATA.emailSeparator}<a href="mailto:${MASTER_KOP_DATA.emailAddress}" style="color: #0563C1; text-decoration: underline;">${MASTER_KOP_DATA.emailAddress}</a>
          </div>
        </td>
        <td style="width: 14%; text-align: right; vertical-align: middle; border: none; padding: 2px 6px;">
          <img src="${rightSrc}" width="57" height="87" alt="Logo SMKN 15 Pandeglang" style="display: inline-block;" />
        </td>
      </tr>
    </table>
    <div style="border-top: 3pt solid #000000; border-bottom: 1pt solid #000000; height: 2pt; margin: 2px 0 14px 0;"></div>
  `;
}

/**
 * Menghasilkan elemen Master Kop Surat untuk dokumen Word OOXML (.docx)
 * memakai kedua logo asli dan font Tahoma.
 */
export async function buildMasterKopDocxBlocks(): Promise<ISectionOptions['children']> {
  const [leftBytes, rightBytes] = await Promise.all([
    loadImageAsUint8Array(MASTER_KOP_DATA.leftLogoPath),
    loadImageAsUint8Array(MASTER_KOP_DATA.rightLogoPath),
  ]);

  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const leftCellChildren = leftBytes
    ? [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new ImageRun({
              data: leftBytes,
              transformation: { width: 76, height: Math.round(76 / MASTER_KOP_DATA.leftLogoAspect) },
              type: 'png',
            }),
          ],
        }),
      ]
    : [new Paragraph({ text: '' })];

  const rightCellChildren = rightBytes
    ? [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new ImageRun({
              data: rightBytes,
              transformation: { width: 52, height: Math.round(52 / MASTER_KOP_DATA.rightLogoAspect) },
              type: 'png',
            }),
          ],
        }),
      ]
    : [new Paragraph({ text: '' })];

  const kopTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorder,
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 14, type: WidthType.PERCENTAGE },
            children: leftCellChildren,
          }),
          new TableCell({
            borders: noBorder,
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 72, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: MASTER_KOP_DATA.line1,
                    font: 'Tahoma',
                    size: 26, // 13pt
                    color: '000000',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: MASTER_KOP_DATA.line2,
                    font: 'Tahoma',
                    bold: true,
                    size: 33, // 16.5pt
                    color: '000000',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({
                    text: MASTER_KOP_DATA.line3,
                    font: 'Tahoma',
                    bold: true,
                    size: 33, // 16.5pt
                    color: '000000',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 15 },
                children: [
                  new TextRun({
                    text: MASTER_KOP_DATA.addressLine1,
                    font: 'Tahoma',
                    size: 18, // 9pt
                    color: '000000',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 15 },
                children: [
                  new TextRun({
                    text: MASTER_KOP_DATA.addressLine2,
                    font: 'Tahoma',
                    size: 18, // 9pt
                    color: '000000',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({
                    text: MASTER_KOP_DATA.websiteLabel,
                    font: 'Tahoma',
                    size: 18,
                    color: '000000',
                  }),
                  new TextRun({
                    text: MASTER_KOP_DATA.websiteUrl,
                    font: 'Tahoma',
                    size: 18,
                    color: '0563C1',
                    underline: {},
                  }),
                  new TextRun({
                    text: MASTER_KOP_DATA.emailSeparator,
                    font: 'Tahoma',
                    size: 18,
                    color: '000000',
                  }),
                  new TextRun({
                    text: MASTER_KOP_DATA.emailAddress,
                    font: 'Tahoma',
                    size: 18,
                    color: '0563C1',
                    underline: {},
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders: noBorder,
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 14, type: WidthType.PERCENTAGE },
            children: rightCellChildren,
          }),
        ],
      }),
    ],
  });

  // Garis pemisah ganda: garis atas tebal + celah + garis bawah tipis
  const dividerParagraph = new Paragraph({
    spacing: { before: 20, after: 140 },
    border: {
      top: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 24 },
      bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [new TextRun({ text: '', size: 4 })],
  });

  return [kopTable, dividerParagraph];
}
