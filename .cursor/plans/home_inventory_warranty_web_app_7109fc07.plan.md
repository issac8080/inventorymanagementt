---
name: Home Inventory Warranty Web App
overview: Build a mobile-first Progressive Web App (PWA) for home inventory and warranty management, optimized for elderly users (50-60 age group) with offline-first architecture, barcode scanning, OCR warranty extraction, QR code generation, and voice-enabled search.
todos: []
---

# Home Inv

entory & Warranty Management Web App

## Technology Stack

### Frontend

- **React 18** with **TypeScript** - Modern, type-safe, large ecosystem
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS for rapid, responsive UI development
- **PWA** - Progressive Web App capabilities for offline-first experience

### State Management & Data

- **Zustand** - Lightweight state management
- **IndexedDB** (via **Dexie.js**) - Local offline database
- **Firebase Firestore** - Cloud database for sync
- **Firebase Storage** - Warranty document storage

### Core Features Libraries

- **html5-qrcode** - QR code scanning in browser
- **QuaggaJS** or **ZXing** - Barcode scanning
- **Tesseract.js** - Client-side OCR for warranty card text extraction
- **jsPDF** + **qrcode** - PDF generation with QR codes
- **Web Speech API** - Built-in browser voice recognition
- **Open Product Data API** / **UPCitemdb** - Product information lookup

### UI/UX Libraries

- **React Router** - Navigation
- **React Hook Form** - Form handling
- **Sonner** or **React Hot Toast** - User-friendly notifications
- **Lucide React** - Accessible icon library

## Project Structure

```javascript
projectt/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── service-worker.js      # Offline caching
│   └── icons/                 # PWA icons
├── src/
│   ├── components/
│   │   ├── common/            # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ConfirmationDialog.tsx
│   │   ├── scanner/           # Barcode/QR scanning
│   │   │   ├── BarcodeScanner.tsx
│   │   │   └── QRScanner.tsx
│   │   ├── product/           # Product management
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductList.tsx
│   │   │   └── ProductDetail.tsx
│   │   ├── warranty/          # Warranty management
│   │   │   ├── WarrantyUpload.tsx
│   │   │   ├── WarrantyCard.tsx
│   │   │   └── OCRProcessor.tsx
│   │   ├── qrcode/            # QR code features
│   │   │   ├── QRCodeGenerator.tsx
│   │   │   └── QRCodePDF.tsx
│   │   ├── audit/             # Inventory audit
│   │   │   └── AuditMode.tsx
│   │   └── assistant/         # Chatbot/Voice
│   │       ├── Chatbot.tsx
│   │       └── VoiceInput.tsx
│   ├── services/
│   │   ├── database/
│   │   │   ├── localDb.ts     # IndexedDB (Dexie)
│   │   │   └── firebase.ts    # Firestore sync
│   │   ├── storage/
│   │   │   └── firebaseStorage.ts
│   │   ├── ocr/
│   │   │   └── tesseractService.ts
│   │   ├── barcode/
│   │   │   └── productLookup.ts
│   │   ├── pdf/
│   │   │   └── qrCodePdf.ts
│   │   └── sync/
│   │       └── syncService.ts
│   ├── stores/
│   │   ├── productStore.ts    # Zustand store
│   │   └── syncStore.ts
│   ├── utils/
│   │   ├── itemCodeGenerator.ts
│   │   ├── warrantyCalculator.ts
│   │   ├── dateUtils.ts
│   │   └── accessibility.ts
│   ├── hooks/
│   │   ├── useBarcodeScanner.ts
│   │   ├── useVoiceInput.ts
│   │   ├── useOfflineSync.ts
│   │   └── usePWA.ts
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── AddProduct.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── Inventory.tsx
│   │   ├── Audit.tsx
│   │   └── PrintCodes.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```



## Data Models

### Product Schema

```typescript
interface Product {
  id: string;                    // UUID
  itemCode: string;              // Readable: TV-001, FRIDGE-002
  name: string;
  category: string;              // Auto-detected or manual
  barcode?: string;              // Original barcode
  qrValue: string;               // Maps to itemCode only
  warrantyStart?: Date;
  warrantyEnd?: Date;
  warrantyDuration?: number;    // Months
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;               // Cloud sync status
}
```



### Document Schema

```typescript
interface Document {
  id: string;
  productId: string;
  type: 'warranty' | 'invoice' | 'manual';
  fileUrl: string;               // Firebase Storage URL
  localPath?: string;            // IndexedDB blob URL
  ocrData?: {
    warrantyStart?: Date;
    warrantyDuration?: number;
    extractedText: string;
  };
  createdAt: Date;
}
```



## Core Features Implementation

### 1. Product Addition Flow

**User Journey:**

1. Tap "Add Product" button (large, high contrast)
2. Camera opens for barcode scan
3. System auto-fetches product details
4. Auto-generates item code (CATEGORY-XXX)
5. For electronics: Mandatory warranty upload
6. Save locally first, sync to cloud in background

**Key Files:**

- `src/pages/AddProduct.tsx` - Main product addition page
- `src/components/scanner/BarcodeScanner.tsx` - Camera-based scanning
- `src/services/barcode/productLookup.ts` - API integration
- `src/utils/itemCodeGenerator.ts` - Item code generation logic

### 2. Warranty Management

**OCR Flow:**

1. User uploads warranty card photo
2. Tesseract.js processes image client-side
3. Extract warranty start date and duration using regex patterns
4. Auto-calculate expiry date
5. Store document in IndexedDB + Firebase Storage

**Key Files:**

- `src/components/warranty/WarrantyUpload.tsx` - Upload interface
- `src/components/warranty/OCRProcessor.tsx` - OCR processing component
- `src/services/ocr/tesseractService.ts` - OCR service wrapper
- `src/utils/warrantyCalculator.ts` - Date calculation logic

### 3. QR Code System

**Architecture:**

- QR code contains only `itemCode` (e.g., "TV-001")
- Scanning QR opens product detail page
- Local database lookup first (offline support)
- Fallback to cloud if local miss

**Key Files:**

- `src/components/qrcode/QRCodeGenerator.tsx` - QR generation
- `src/components/scanner/QRScanner.tsx` - QR scanning
- `src/pages/ProductDetail.tsx` - Product detail view

### 4. PDF Generation

**Features:**

- Generate PDF with QR codes
- Layouts: Sticker mode (small), A4 sheet mode
- Filter by category or selection
- Download or print directly

**Key Files:**

- `src/components/qrcode/QRCodePDF.tsx` - PDF generation UI
- `src/services/pdf/qrCodePdf.ts` - PDF creation service

### 5. Inventory Audit

**Flow:**

1. Enable audit mode
2. Scan QR codes of existing products
3. Track found vs missing items
4. Export summary report

**Key Files:**

- `src/pages/Audit.tsx` - Audit interface
- `src/components/audit/AuditMode.tsx` - Audit logic

### 6. Voice Assistant / Chatbot

**Capabilities:**

- Natural language product search
- Warranty queries ("Is my TV under warranty?")
- Voice commands for actions
- Simple rule-based responses (can be enhanced with AI later)

**Key Files:**

- `src/components/assistant/Chatbot.tsx` - Chat interface
- `src/components/assistant/VoiceInput.tsx` - Voice recognition
- `src/hooks/useVoiceInput.ts` - Web Speech API wrapper

## Offline-First Architecture

### Data Flow

```javascript
User Action → Local DB (IndexedDB) → Immediate UI Update
                                    ↓
                            Background Sync Queue
                                    ↓
                            Firebase (when online)
```



### Sync Strategy

- **Local-first**: All operations work offline
- **Background sync**: Queue changes when offline, sync when online
- **Conflict resolution**: Last-write-wins (simple for MVP)

**Key Files:**

- `src/services/database/localDb.ts` - IndexedDB operations
- `src/services/sync/syncService.ts` - Cloud sync logic
- `src/hooks/useOfflineSync.ts` - Sync hook

## Elder-Friendly UX Design

### Design Principles

1. **Large touch targets** (min 48x48px)
2. **High contrast colors** (WCAG AAA)
3. **Simple language** (no technical jargon)
4. **Minimal steps** (max 3 taps per action)
5. **Clear feedback** (loading states, confirmations)
6. **Voice-first** where possible

### UI Components

- Large buttons with icons
- Clear typography (min 16px, prefer 18-20px)
- Confirmation dialogs for destructive actions
- Progress indicators for long operations
- Error messages in plain language

## PWA Configuration

### Service Worker

- Cache app shell and assets
- Cache API responses for offline access
- Background sync for data uploads

### Manifest

- App name, icons, theme colors
- Display mode: standalone
- Offline support enabled

## Firebase Setup

### Firestore Collections

- `products` - Product data
- `documents` - Warranty documents metadata
- `sync_queue` - Pending sync operations

### Storage Buckets

- `warranty-cards/` - Warranty document images
- `product-images/` - Product photos

## Development Phases

### Phase 1: Core Infrastructure

- Project setup (React + TypeScript + Vite)
- Database setup (IndexedDB + Firebase)
- Basic routing and navigation
- PWA configuration

### Phase 2: Product Management

- Barcode scanning
- Product addition flow
- Product listing and search
- Item code generation

### Phase 3: Warranty Features

- Warranty upload
- OCR processing
- Warranty expiry calculation
- Warranty display

### Phase 4: QR Code System

- QR code generation
- QR code scanning
- Product detail view
- PDF generation

### Phase 5: Advanced Features

- Inventory audit
- Voice assistant
- Chatbot
- Cloud sync

### Phase 6: Polish & Testing

- Elder-friendly UI refinements
- Accessibility testing
- Offline testing
- Performance optimization

## Success Metrics Implementation

- **Product add time < 30s**: Optimize scanning and form flow
- **Max 3 taps per action**: Streamline navigation
- **Warranty retrieval < 10s**: Local DB + efficient queries
- **Zero dependency on physical cards**: Digital-first design

## Security Considerations

- Firebase Authentication (optional, for multi-device sync)
- Secure document storage (Firebase Storage rules)
- Local data encryption (IndexedDB encryption wrapper)
- Input validation and sanitization

## Deployment