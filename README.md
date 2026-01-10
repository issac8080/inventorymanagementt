# Initra – Home Inventory Management App

**by Issac**

A mobile-first Progressive Web App (PWA) for managing home products and warranty cards, optimized for elderly users (50-60 age group) with offline-first architecture.

## 🎯 Features

### Core Features
- **📷 Barcode Scanning**: Scan product barcodes to automatically fetch product details from multiple APIs
- **📱 QR Code Generation**: Auto-generate QR codes for easy product identification
- **🛡️ Warranty Management**: Store warranty card images with optional OCR text extraction
- **💾 Offline-First**: All data stored locally in IndexedDB - works completely offline
- **🔍 Inventory Audit**: Scan QR codes to verify product presence
- **📄 PDF Generation**: Print QR codes as stickers or A4 sheets, generate warranty PDFs
- **📊 Bulk Import**: Import products via Excel or manual table entry with warranty information
- **💬 AI Assistant**: Natural language chatbot for product search and warranty queries
- **🎤 Voice Input**: Voice commands for hands-free operation
- **📤 Data Export/Import**: Backup and restore your data

### User Experience
- **👴 Elder-Friendly UI**: Large buttons, high contrast, simple language
- **📱 Mobile-Optimized**: Fully responsive design with touch-friendly interfaces
- **🎨 Colorful Design**: Vibrant, kid-friendly interface
- **🔊 Audio Feedback**: Beep sounds for user actions
- **♿ Accessible**: WCAG 2.1 compliant with keyboard navigation

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript** - Modern, type-safe UI
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing

### State & Data
- **Zustand** - Lightweight state management
- **IndexedDB** (via **Dexie.js**) - Local offline database
- **Database Migrations** - Version-controlled schema updates

### Core Libraries
- **html5-qrcode** - QR/Barcode scanning
- **Tesseract.js** - Client-side OCR for warranty cards
- **jsPDF** + **qrcode** - PDF generation
- **xlsx** - Excel file parsing
- **Web Speech API** - Voice recognition
- **date-fns** - Date utilities

### Quality & Testing
- **Vitest** - Unit testing framework
- **Testing Library** - Component testing
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Zod** - Schema validation

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd projectt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Preview production build**
   ```bash
   npm run preview
   ```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## 📝 Code Quality

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint
```

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── assistant/       # Chatbot/Voice assistant
│   ├── bulk/           # Bulk import components
│   ├── common/          # Reusable UI components
│   ├── qrcode/          # QR code generation
│   ├── scanner/         # Barcode/QR scanning
│   └── warranty/        # Warranty management
├── hooks/               # Custom React hooks
├── pages/               # Page components
├── services/            # Business logic
│   ├── barcode/         # Product lookup APIs
│   ├── database/        # IndexedDB operations
│   ├── ocr/             # OCR processing
│   └── pdf/             # PDF generation
├── stores/              # Zustand state stores
├── types/               # TypeScript definitions
└── utils/               # Utility functions
    ├── errorHandler.ts  # Error handling
    ├── validation.ts    # Input validation
    └── ...
```

## 🔑 Key Features Implementation

### Product Addition
- Scan barcode using camera
- Auto-fetch product details from multiple APIs (UPCitemdb, Open Product Data, EAN Data)
- Auto-generate item codes (TV-001, FRIDGE-002, etc.)
- Auto-generate QR codes
- Manual barcode entry option
- Bulk import via Excel or table

### Warranty Management
- Upload warranty card images (camera or file picker)
- Store images as Blobs in IndexedDB
- Optional OCR to extract warranty dates
- Auto-calculate warranty expiry
- Generate warranty PDFs with product details

### QR Code System
- QR codes contain only itemCode
- Scan QR to instantly view product details
- Works completely offline
- Generate printable PDFs

### Bulk Import
- Excel file upload with warranty fields
- Manual table entry
- Automatic warranty date calculation
- Sample template download

### Data Management
- Export database as JSON
- Import database from backup
- Clear database option
- Automatic migrations

## 🎨 Design Principles

1. **Elder-Friendly**: Large fonts, high contrast, minimal typing
2. **Mobile-First**: Responsive design, touch-friendly
3. **Offline-First**: Core functionality works without internet
4. **Error-Proof**: Comprehensive error handling and validation
5. **Accessible**: WCAG 2.1 compliant

## 🔒 Security Features

- Input sanitization to prevent XSS
- File type and size validation
- Content Security Policy (CSP)
- Secure IndexedDB storage
- No external data transmission (except product lookup APIs)

## 📱 PWA Features

- Installable on mobile devices
- Offline support
- App-like experience
- Service worker caching

## 🚀 Performance Optimizations

- Code splitting with lazy loading
- Image compression before storage
- Debounced search inputs
- Memoized components
- Optimized bundle size

## 🧩 Architecture Patterns

- **Service Layer**: Business logic separated from UI
- **Repository Pattern**: Database operations abstracted
- **Error Boundaries**: Graceful error handling
- **State Management**: Zustand for global state
- **Validation**: Zod schemas for type safety

## 📊 Database Schema

### Products Table
- `id`: Unique identifier
- `itemCode`: Readable code (TV-001)
- `name`: Product name
- `category`: Product category
- `barcode`: Optional barcode
- `qrValue`: QR code value
- `warrantyStart`: Warranty start date
- `warrantyEnd`: Warranty end date
- `warrantyDuration`: Duration in months
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### Warranty Documents Table
- `id`: Unique identifier
- `productId`: Reference to product
- `imageBlob`: Warranty card image
- `extractedText`: OCR result (optional)
- `createdAt`: Creation timestamp

## 🔄 Database Migrations

The app uses Dexie.js with versioned migrations. When schema changes:
1. Increment version number
2. Add new store definitions
3. Implement upgrade logic in `.upgrade()` callback

## 🐛 Error Handling

- **Error Boundaries**: Catch React component errors
- **Centralized Error Handler**: Consistent error processing
- **Retry Logic**: Automatic retry with exponential backoff
- **User-Friendly Messages**: Clear error messages for users

## 📈 Analytics

Privacy-friendly local analytics tracks:
- Page views
- Product actions
- Feature usage
- Error events

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

[Add your license here]

## 🙏 Acknowledgments

- Built with React, Vite, and Tailwind CSS
- Uses Dexie.js for IndexedDB management
- OCR powered by Tesseract.js
- Product data from UPCitemdb, Open Product Data, and EAN Data APIs

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Version**: 1.0.0  
**Last Updated**: 2024
