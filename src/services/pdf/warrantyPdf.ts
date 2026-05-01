import jsPDF from 'jspdf';
import type { Product } from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { getWarrantyStatus } from '@/utils/warrantyCalculator';

/** Tailwind-aligned palette */
const COL = {
  pageBg: [243, 244, 246] as [number, number, number],
  blue: [37, 99, 235] as [number, number, number],
  blueLight: [96, 165, 250] as [number, number, number],
  blueSoft: [219, 234, 254] as [number, number, number],
  blueLabel: [37, 99, 235] as [number, number, number],
  purple: [124, 58, 237] as [number, number, number],
  purpleLight: [167, 139, 250] as [number, number, number],
  purpleSoft: [237, 233, 254] as [number, number, number],
  purpleLabel: [109, 40, 217] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  greenHi: [34, 197, 94] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [17, 24, 39] as [number, number, number],
  divider: [229, 231, 235] as [number, number, number],
  shadow: [209, 213, 219] as [number, number, number],
  expiredBg: [255, 228, 230] as [number, number, number],
  expiredText: [185, 28, 28] as [number, number, number],
  validBg: [220, 252, 231] as [number, number, number],
  validText: [22, 101, 52] as [number, number, number],
  noneBg: [243, 244, 246] as [number, number, number],
  noneText: [75, 85, 99] as [number, number, number],
  footer: [156, 163, 175] as [number, number, number],
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load warranty image'));
    img.src = url;
  });
}

/** Normalize blob/http images to PNG for reliable jsPDF embedding. */
async function warrantyImageToPngDataUrl(url: string): Promise<{ dataUrl: string; w: number; h: number }> {
  const img = await loadImage(url);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.drawImage(img, 0, 0);
  return { dataUrl: canvas.toDataURL('image/png'), w, h };
}

function drawHeaderWave(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  rgb: [number, number, number],
  lighter: [number, number, number]
) {
  pdf.setFillColor(...rgb);
  pdf.rect(x, y, w, h, 'F');
  pdf.setFillColor(...lighter);
  pdf.ellipse(x + w * 0.78, y + h * 0.15, w * 0.35, h * 0.9, 'F');
  pdf.setFillColor(rgb[0] + 15, Math.min(255, rgb[1] + 25), Math.min(255, rgb[2] + 30));
  pdf.ellipse(x + w * 0.92, y + h * 0.55, w * 0.22, h * 0.75, 'F');
}

function drawWhiteCircleIcon(
  pdf: jsPDF,
  cx: number,
  cy: number,
  r: number,
  innerStroke: [number, number, number]
) {
  pdf.setFillColor(...COL.white);
  pdf.circle(cx, cy, r, 'F');
  pdf.setDrawColor(...innerStroke);
  pdf.setLineWidth(0.35);
  pdf.circle(cx, cy, r * 0.72, 'S');
}

function drawProductIconCube(pdf: jsPDF, cx: number, cy: number, s: number) {
  const b = COL.blue;
  pdf.setDrawColor(...b);
  pdf.setLineWidth(0.45);
  const k = s * 0.35;
  pdf.line(cx - k, cy - k * 0.3, cx + k * 0.2, cy - k * 0.9);
  pdf.line(cx + k * 0.2, cy - k * 0.9, cx + k, cy - k * 0.2);
  pdf.line(cx + k, cy - k * 0.2, cx - k * 0.2, cy + k * 0.5);
  pdf.line(cx - k * 0.2, cy + k * 0.5, cx - k, cy - k * 0.3);
  pdf.line(cx - k, cy - k * 0.3, cx - k * 0.2, cy + k * 0.1);
  pdf.line(cx - k * 0.2, cy + k * 0.1, cx + k * 0.85, cy - k * 0.05);
  pdf.line(cx + k * 0.85, cy - k * 0.05, cx + k, cy - k * 0.2);
}

function drawShieldCheck(pdf: jsPDF, cx: number, cy: number, s: number, stroke: [number, number, number]) {
  pdf.setDrawColor(...stroke);
  pdf.setLineWidth(0.4);
  const w = s * 0.55;
  const h = s * 0.65;
  const topY = cy - h * 0.45;
  pdf.lines(
    [
      [-w * 0.5, h * 0.35],
      [0, h * 0.55],
      [w * 0.55, -h * 0.85],
    ],
    cx,
    topY,
    [1, 1],
    'S',
    true
  );
  pdf.setLineWidth(0.35);
  const t = s * 0.12;
  pdf.line(cx - t * 0.2, cy + t * 0.1, cx - t * 0.5, cy - t * 0.2);
  pdf.line(cx - t * 0.2, cy + t * 0.1, cx + t * 0.85, cy - t * 0.55);
}

function drawSmallIconCircle(pdf: jsPDF, cx: number, cy: number, draw: (x: number, y: number) => void) {
  pdf.setFillColor(...COL.blueSoft);
  pdf.circle(cx, cy, 3.2, 'F');
  pdf.setDrawColor(...COL.blue);
  pdf.setLineWidth(0.25);
  pdf.circle(cx, cy, 3.2, 'S');
  draw(cx, cy);
}

function drawTagGlyph(cx: number, cy: number, pdf: jsPDF) {
  pdf.setDrawColor(...COL.blue);
  pdf.setLineWidth(0.35);
  const k = 1.8;
  pdf.line(cx - k * 0.3, cy - k * 0.4, cx + k * 0.5, cy + k * 0.35);
  pdf.circle(cx + k * 0.35, cy - k * 0.35, k * 0.18, 'S');
}

function drawHeadphonesGlyph(cx: number, cy: number, pdf: jsPDF) {
  pdf.setDrawColor(...COL.blue);
  pdf.setLineWidth(0.3);
  pdf.ellipse(cx - 1.4, cy + 0.1, 0.85, 1.05, 'S');
  pdf.ellipse(cx + 1.4, cy + 0.1, 0.85, 1.05, 'S');
  pdf.line(cx - 0.55, cy - 0.95, cx + 0.55, cy - 0.95);
}

function drawGridGlyph(cx: number, cy: number, pdf: jsPDF) {
  pdf.setDrawColor(...COL.blue);
  pdf.setLineWidth(0.3);
  const g = 0.9;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      pdf.rect(cx - g + j * g, cy - g + i * g, g * 0.85, g * 0.85, 'S');
    }
  }
}

function drawCalendarGlyph(cx: number, cy: number, pdf: jsPDF) {
  pdf.setDrawColor(...COL.blue);
  pdf.setLineWidth(0.3);
  pdf.rect(cx - 2, cy - 1.2, 4, 3.2, 'S');
  pdf.line(cx - 2, cy - 0.2, cx + 2, cy - 0.2);
  pdf.line(cx - 0.8, cy - 1.8, cx - 0.8, cy - 1.2);
  pdf.line(cx + 0.8, cy - 1.8, cx + 0.8, cy - 1.2);
}

function drawPurpleSmallCircle(pdf: jsPDF, cx: number, cy: number, draw: (x: number, y: number) => void) {
  pdf.setFillColor(...COL.purpleSoft);
  pdf.circle(cx, cy, 3.2, 'F');
  pdf.setDrawColor(...COL.purple);
  pdf.setLineWidth(0.25);
  pdf.circle(cx, cy, 3.2, 'S');
  draw(cx, cy);
}

function drawGlobeGlyph(cx: number, cy: number, pdf: jsPDF) {
  pdf.setDrawColor(...COL.purple);
  pdf.setLineWidth(0.3);
  pdf.circle(cx, cy, 2, 'S');
  pdf.line(cx - 2, cy, cx + 2, cy);
  pdf.lines([[0, -1.6], [0, 1.6]], cx, cy, [1, 1], 'S');
}

function drawCalendarPurple(cx: number, cy: number, pdf: jsPDF) {
  pdf.setDrawColor(...COL.purple);
  pdf.setLineWidth(0.3);
  pdf.rect(cx - 2, cy - 1.2, 4, 3.2, 'S');
  pdf.line(cx - 2, cy - 0.2, cx + 2, cy - 0.2);
}

function drawShieldSmall(cx: number, cy: number, pdf: jsPDF) {
  pdf.setDrawColor(...COL.purple);
  pdf.setLineWidth(0.35);
  const w = 1.6;
  const h = 2.2;
  pdf.lines(
    [
      [-w, h * 0.35],
      [0, h * 0.55],
      [w * 1.1, -h * 0.85],
    ],
    cx,
    cy - h * 0.25,
    [1, 1],
    'S',
    true
  );
}

function hLine(pdf: jsPDF, x1: number, x2: number, y: number) {
  pdf.setDrawColor(...COL.divider);
  pdf.setLineWidth(0.2);
  pdf.line(x1, y, x2, y);
}

/**
 * Single-page warranty certificate matching the product UI reference layout.
 */
export async function generateWarrantyCertificatePdf(
  product: Product,
  warrantyImageUrl: string | null
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  const mx = 12;
  const cardW = W - mx * 2;
  const rx = 3.5;
  let y = 10;

  pdf.setFillColor(...COL.pageBg);
  pdf.rect(0, 0, W, H, 'F');

  const warrantyStatus = getWarrantyStatus(product.warrantyEnd);
  const brandType = (product.category || '').trim() || '-';
  const startStr = product.warrantyStart ? formatDate(product.warrantyStart) : '-';
  const endStr = product.warrantyEnd ? formatDate(product.warrantyEnd) : '-';
  const periodStr =
    product.warrantyStart && product.warrantyEnd ? `${startStr} - ${endStr}` : '-';

  /* ─── Section 1: Product details card ─── */
  const s1HeaderH = 22;
  const innerL = mx + 7;
  const innerR = mx + cardW - 7;
  const midX = mx + cardW / 2;
  const nameLinesPreview = pdf.splitTextToSize(product.name || '-', midX - innerL - 16);
  const nameBlockH = Math.max(12, nameLinesPreview.length * 4.2 + 6);
  const s1BodyH =
    6 +
    10 +
    7 +
    nameBlockH +
    6 +
    11 +
    5 +
    14 +
    5 +
    9 +
    7 +
    14 +
    10;
  const s1TotalH = s1HeaderH + s1BodyH;

  pdf.setFillColor(...COL.shadow);
  pdf.roundedRect(mx + 0.35, y + 0.35, cardW, s1TotalH, rx, rx, 'F');

  pdf.setFillColor(...COL.white);
  pdf.roundedRect(mx, y, cardW, s1TotalH, rx, rx, 'F');

  drawHeaderWave(pdf, mx, y, cardW, s1HeaderH, COL.blue, COL.blueLight);

  const iconCx = mx + 11;
  const iconCy1 = y + s1HeaderH / 2;
  drawWhiteCircleIcon(pdf, iconCx, iconCy1, 5.2, COL.blue);
  drawProductIconCube(pdf, iconCx, iconCy1, 4.5);

  pdf.setTextColor(...COL.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('Product Details', mx + 20, y + 9.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text('Complete information about your product', mx + 20, y + 15);

  let cy = y + s1HeaderH + 6;

  const ic = innerL + 4;
  drawSmallIconCircle(pdf, ic, cy, (cx, cyy) => drawTagGlyph(cx, cyy, pdf));
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...COL.blueLabel);
  pdf.text('ITEM CODE', innerL + 10, cy - 1.2);
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COL.text);
  pdf.text(product.itemCode || '-', innerL + 10, cy + 3.5);
  cy += 10;
  hLine(pdf, innerL, innerR, cy);
  cy += 7;

  const col2X = midX + 4;
  drawSmallIconCircle(pdf, ic, cy + 2, (cx, cyy) => drawHeadphonesGlyph(cx, cyy, pdf));
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...COL.blueLabel);
  pdf.text('PRODUCT NAME', innerL + 10, cy);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...COL.text);
  const nameLines = nameLinesPreview;
  pdf.text(nameLines, innerL + 10, cy + 4);

  const ic2 = midX + 4;
  drawSmallIconCircle(pdf, ic2, cy + 2, (cx, cyy) => drawGridGlyph(cx, cyy, pdf));
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...COL.blueLabel);
  pdf.text('CATEGORY', col2X + 6, cy);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...COL.text);
  pdf.text(product.category || '-', col2X + 6, cy + 4);

  cy += nameBlockH;
  hLine(pdf, innerL, innerR, cy);
  cy += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...COL.blueLabel);
  pdf.text('BRAND / TYPE', innerL + 2, cy);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...COL.text);
  pdf.text(brandType, innerL + 2, cy + 4.5);
  cy += 11;

  pdf.setDrawColor(...COL.blue);
  pdf.setLineWidth(0.85);
  pdf.line(innerL, cy, innerR, cy);
  cy += 5;

  const banH = 14;
  const banW = innerR - innerL;
  pdf.setFillColor(...COL.greenHi);
  pdf.roundedRect(innerL, cy, banW, banH, 2, 2, 'F');
  pdf.setFillColor(...COL.green);
  pdf.roundedRect(innerL, cy + banH * 0.45, banW, banH * 0.55, 0, 0, 'F');
  pdf.setFillColor(187, 247, 208);
  pdf.ellipse(innerL + banW * 0.82, cy + banH * 0.5, 9, 11, 'F');

  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(0.45);
  const sx = innerL + 5;
  const sy = cy + banH / 2;
  pdf.lines(
    [
      [-2.2, 2.8],
      [0, 4.6],
      [3.8, -4.2],
    ],
    sx,
    sy - 1.2,
    [1, 1],
    'S',
    true
  );

  pdf.setTextColor(...COL.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Warranty Information', innerL + 11, cy + 5.2);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.8);
  pdf.text('Your product is covered under our warranty policy.', innerL + 11, cy + 9.8);
  cy += banH + 5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...COL.blueLabel);
  pdf.text('STATUS', innerL + 2, cy);

  let badgeW = 22;
  const badgeLabel =
    warrantyStatus === 'valid' ? 'Valid' : warrantyStatus === 'expired' ? 'Expired' : 'No warranty';
  if (warrantyStatus === 'none') badgeW = 28;
  pdf.setFontSize(8);
  const bx = innerL + 22;
  const by = cy - 3.2;
  let statusRgb: [number, number, number];
  if (warrantyStatus === 'valid') {
    pdf.setFillColor(...COL.validBg);
    statusRgb = COL.validText;
  } else if (warrantyStatus === 'expired') {
    pdf.setFillColor(...COL.expiredBg);
    statusRgb = COL.expiredText;
  } else {
    pdf.setFillColor(...COL.noneBg);
    statusRgb = COL.noneText;
  }
  pdf.roundedRect(bx, by, badgeW, 6.2, 1.2, 1.2, 'F');
  pdf.setFillColor(...statusRgb);
  pdf.circle(bx + 2.35, cy - 0.85, 0.42, 'F');
  pdf.setTextColor(...statusRgb);
  pdf.setFont('helvetica', 'bold');
  pdf.text(badgeLabel, bx + 4.6, cy);

  cy += 9;
  hLine(pdf, innerL, innerR, cy);
  cy += 7;

  drawSmallIconCircle(pdf, ic, cy + 2, (cx, cyy) => drawCalendarGlyph(cx, cyy, pdf));
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...COL.blueLabel);
  pdf.text('START DATE', innerL + 10, cy);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...COL.text);
  pdf.text(startStr, innerL + 10, cy + 5);

  drawSmallIconCircle(pdf, ic2, cy + 2, (cx, cyy) => drawCalendarGlyph(cx, cyy, pdf));
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...COL.blueLabel);
  pdf.text('END DATE', col2X + 6, cy);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...COL.text);
  pdf.text(endStr, col2X + 6, cy + 5);

  cy += 14;
  y += s1TotalH + 8;

  /* ─── Section 2: Warranty card ─── */
  const s2HeaderH = 22;
  let s2BodyH = 78;
  const reservedFooter = 14;
  if (y + s2HeaderH + s2BodyH + reservedFooter > H - 8) {
    s2BodyH = Math.max(52, H - y - s2HeaderH - reservedFooter - 8);
  }

  const s2TotalH = s2HeaderH + s2BodyH;
  pdf.setFillColor(...COL.shadow);
  pdf.roundedRect(mx + 0.35, y + 0.35, cardW, s2TotalH, rx, rx, 'F');
  pdf.setFillColor(...COL.white);
  pdf.roundedRect(mx, y, cardW, s2TotalH, rx, rx, 'F');

  drawHeaderWave(pdf, mx, y, cardW, s2HeaderH, COL.purple, COL.purpleLight);

  const iconCy2 = y + s2HeaderH / 2;
  drawWhiteCircleIcon(pdf, iconCx, iconCy2, 5.2, COL.purple);
  drawShieldCheck(pdf, iconCx, iconCy2, 5.5, COL.purple);

  pdf.setTextColor(...COL.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('Warranty Card', mx + 20, y + 9.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text('Your warranty document', mx + 20, y + 15);

  const bodyTop = y + s2HeaderH + 4;
  const imgColW = cardW * 0.42;
  const gap = 5;
  const textColX = mx + imgColW + gap + 4;
  const textColW = cardW - imgColW - gap - 14;

  const imgBoxH = s2BodyH - 10;
  const imgBoxX = mx + 6;
  const imgBoxY = bodyTop;
  const imgBoxW = imgColW - 2;

  pdf.setDrawColor(...COL.divider);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 2, 2, 'S');

  if (warrantyImageUrl) {
    try {
      const { dataUrl: pngDataUrl, w: iw0, h: ih0 } = await warrantyImageToPngDataUrl(warrantyImageUrl);
      const pad = 1.2;
      const maxW = imgBoxW - pad * 2;
      const maxH = imgBoxH - pad * 2;
      let iw = iw0;
      let ih = ih0;
      const scale = Math.min(maxW / iw, maxH / ih, 1);
      iw *= scale;
      ih *= scale;
      const ix = imgBoxX + (imgBoxW - iw) / 2;
      const iy = imgBoxY + (imgBoxH - ih) / 2;
      pdf.addImage(pngDataUrl, 'PNG', ix, iy, iw, ih);
    } catch {
      pdf.setFontSize(8);
      pdf.setTextColor(...COL.noneText);
      pdf.text('No image', imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2, { align: 'center' });
    }
  } else {
    pdf.setFontSize(8);
    pdf.setTextColor(...COL.noneText);
    pdf.text('No document', imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2, { align: 'center' });
  }

  let ty = bodyTop + 2;
  drawPurpleSmallCircle(pdf, textColX + 3.2, ty + 2.2, (cx, cyy) => drawGlobeGlyph(cx, cyy, pdf));
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.2);
  pdf.setTextColor(...COL.purpleLabel);
  pdf.text('REGISTERED PRODUCT', textColX + 9, ty);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...COL.text);
  const regLine = warrantyImageUrl ? 'Screenshot / Proof of Purchase' : 'Not uploaded';
  pdf.text(regLine, textColX + 9, ty + 4.5);
  ty += 14;

  drawPurpleSmallCircle(pdf, textColX + 3.2, ty + 2.2, (cx, cyy) => drawCalendarPurple(cx, cyy, pdf));
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.2);
  pdf.setTextColor(...COL.purpleLabel);
  pdf.text('WARRANTY PERIOD', textColX + 9, ty);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  const perLines = pdf.splitTextToSize(periodStr, textColW - 10);
  pdf.text(perLines, textColX + 9, ty + 4.5);
  ty += 8 + (perLines.length - 1) * 4;

  drawPurpleSmallCircle(pdf, textColX + 3.2, ty + 2.2, (cx, cyy) => drawShieldSmall(cx, cyy, pdf));
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.2);
  pdf.setTextColor(...COL.purpleLabel);
  pdf.text('COVERAGE', textColX + 9, ty);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.text('Manufacturing Defects', textColX + 9, ty + 4.5);
  ty += 14;

  const noteH = 18;
  pdf.setFillColor(...COL.purpleSoft);
  pdf.roundedRect(textColX - 2, ty - 1, textColW + 4, noteH, 2, 2, 'F');
  pdf.setFillColor(...COL.purple);
  pdf.circle(textColX + 3, ty + 4, 2.2, 'F');
  pdf.setTextColor(...COL.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('i', textColX + 2.55, ty + 5.1);
  pdf.setTextColor(...COL.purpleLabel);
  pdf.setFontSize(7.5);
  pdf.text('Note', textColX + 7, ty + 3.8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 48, 163);
  const noteBody =
    'This warranty is valid only with proof of purchase and is non-transferable.';
  const noteLines = pdf.splitTextToSize(noteBody, textColW - 14);
  pdf.text(noteLines, textColX + 7, ty + 8);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...COL.footer);
  const foot = 'Thank you for choosing our product.  |  For support, contact our customer care.';
  pdf.text(foot, W / 2, H - 10, { align: 'center' });

  const fileName = `Warranty_${product.itemCode}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}
