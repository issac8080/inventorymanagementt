import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Product } from '@/types';

export interface PDFOptions {
  layout: 'sticker' | 'a4';
  products: Product[];
  title?: string;
}

export async function generateQRCodePDF(options: PDFOptions): Promise<void> {
  const { layout, products, title = 'Product QR Codes' } = options;
  
  const pdf = new jsPDF({
    orientation: layout === 'a4' ? 'portrait' : 'portrait',
    unit: 'mm',
    format: layout === 'a4' ? 'a4' : [100, 50] // Sticker size
  });

  if (layout === 'a4') {
    await generateA4Layout(pdf, products, title);
  } else {
    await generateStickerLayout(pdf, products);
  }

  pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
}

async function generateA4Layout(
  pdf: jsPDF,
  products: Product[],
  title: string
): Promise<void> {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const qrSize = 30;
  const spacing = 5;
  const itemsPerRow = 5;
  const itemsPerCol = 7;
  const itemWidth = (pageWidth - 2 * margin) / itemsPerRow;
  const itemHeight = 50;

  let currentPage = 0;
  let yPos = margin + 20;

  // Add title
  pdf.setFontSize(16);
  pdf.text(title, margin, margin + 10);

  for (let i = 0; i < products.length; i++) {
    if (i > 0 && i % (itemsPerRow * itemsPerCol) === 0) {
      pdf.addPage();
      currentPage++;
      yPos = margin + 20;
    }

    const row = Math.floor((i % (itemsPerRow * itemsPerCol)) / itemsPerRow);
    const col = i % itemsPerRow;
    const xPos = margin + col * itemWidth;
    const currentY = margin + 20 + row * itemHeight;

    const product = products[i];
    
    // Generate QR code
    const qrDataUrl = await QRCode.toDataURL(product.qrValue, {
      width: qrSize * 3.779527559, // Convert mm to pixels
      margin: 1
    });

    // Add QR code
    pdf.addImage(qrDataUrl, 'PNG', xPos + 5, currentY, qrSize, qrSize);

    // Add item code text
    pdf.setFontSize(10);
    pdf.text(product.itemCode, xPos + 5, currentY + qrSize + 5);

    // Add product name (truncated)
    pdf.setFontSize(8);
    const name = product.name.length > 20 
      ? product.name.substring(0, 20) + '...' 
      : product.name;
    pdf.text(name, xPos + 5, currentY + qrSize + 10);
  }
}

async function generateStickerLayout(
  pdf: jsPDF,
  products: Product[]
): Promise<void> {
  for (const product of products) {
    const qrSize = 30;
    
    // Generate QR code
    const qrDataUrl = await QRCode.toDataURL(product.qrValue, {
      width: qrSize * 3.779527559,
      margin: 1
    });

    // Add QR code
    pdf.addImage(qrDataUrl, 'PNG', 10, 5, qrSize, qrSize);

    // Add item code
    pdf.setFontSize(12);
    pdf.text(product.itemCode, 10, qrSize + 10);

    // Add product name
    pdf.setFontSize(10);
    const name = product.name.length > 25 
      ? product.name.substring(0, 25) + '...' 
      : product.name;
    pdf.text(name, 10, qrSize + 15);

    if (products.indexOf(product) < products.length - 1) {
      pdf.addPage();
    }
  }
}

