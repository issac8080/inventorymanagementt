import { createWorker } from 'tesseract.js';

let worker: any = null;

export async function initializeOCR(): Promise<void> {
  if (!worker) {
    worker = await createWorker('eng');
  }
}

export async function extractTextFromImage(imageBlob: Blob): Promise<string> {
  try {
    await initializeOCR();
    
    const imageUrl = URL.createObjectURL(imageBlob);
    const { data: { text } } = await worker.recognize(imageUrl);
    
    URL.revokeObjectURL(imageUrl);
    return text;
  } catch (error) {
    console.error('OCR error:', error);
    return '';
  }
}

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

