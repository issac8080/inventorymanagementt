import { useState, useRef } from 'react';
import { Upload, Download, Plus, Trash2, FileSpreadsheet, Table } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { ProgressBar } from '@/components/common/ProgressBar';
import { productDb } from '@/services/database/localDb';
import { useProductStore } from '@/stores/productStore';
import { Product } from '@/types';
import { generateItemCode } from '@/utils/itemCodeGenerator';
import { generateUUID } from '@/utils/uuid';
import { validateProduct, BulkImportRowSchema } from '@/utils/validation';
import { handleError } from '@/utils/errorHandler';
import { playBeep } from '@/utils/sounds';
import { calculateWarrantyEnd, parseWarrantyDate } from '@/utils/warrantyCalculator';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface BulkImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ProductRow {
  name: string;
  category: string;
  barcode?: string;
  warrantyStart?: string; // Date string from input
  warrantyEnd?: string; // Date string from input
  warrantyDuration?: string; // Duration in months as string
}

export function BulkImport({ isOpen, onClose, onImportComplete }: BulkImportProps) {
  const { addProduct } = useProductStore();
  const [mode, setMode] = useState<'upload' | 'table'>('upload');
  const [tableRows, setTableRows] = useState<ProductRow[]>([{ 
    name: '', 
    category: '', 
    barcode: '',
    warrantyStart: '',
    warrantyEnd: '',
    warrantyDuration: ''
  }]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadSampleExcel = () => {
    // Create sample data with warranty fields
    const sampleData = [
      {
        'Product Name': 'Samsung 55" Smart TV',
        'Category': 'TV',
        'Barcode': '8806092291234',
        'Warranty Start Date': '2024-01-15',
        'Warranty End Date': '2027-01-15',
        'Warranty Duration (Months)': '36'
      },
      {
        'Product Name': 'Boat Rockerz 450',
        'Category': 'Electronics',
        'Barcode': '8901030891234',
        'Warranty Start Date': '2024-06-01',
        'Warranty End Date': '',
        'Warranty Duration (Months)': '12'
      },
      {
        'Product Name': 'LG Refrigerator',
        'Category': 'Refrigerator',
        'Barcode': '',
        'Warranty Start Date': '',
        'Warranty End Date': '',
        'Warranty Duration (Months)': ''
      }
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Product Name
      { wch: 15 }, // Category
      { wch: 20 }, // Barcode
      { wch: 20 }, // Warranty Start Date
      { wch: 20 }, // Warranty End Date
      { wch: 25 }  // Warranty Duration
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'Product_Import_Template.xlsx');
    
    playBeep('success');
    toast.success('Sample Excel template downloaded!');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

      // Map Excel columns to our format
      const products: ProductRow[] = jsonData.map((row: any) => {
        // Handle different possible column names
        const name = row['Product Name'] || row['Name'] || row['Product'] || row['product name'] || row['name'] || '';
        const category = row['Category'] || row['category'] || row['Type'] || row['type'] || 'Other';
        const barcode = row['Barcode'] || row['barcode'] || row['Barcode Number'] || row['barcode number'] || '';
        
        // Warranty fields - handle multiple column name variations
        const warrantyStart = row['Warranty Start Date'] || row['Warranty Start'] || row['warranty start'] || row['Start Date'] || '';
        const warrantyEnd = row['Warranty End Date'] || row['Warranty End'] || row['warranty end'] || row['End Date'] || '';
        const warrantyDuration = row['Warranty Duration (Months)'] || row['Warranty Duration'] || row['Duration'] || row['warranty duration'] || '';

        return {
          name: String(name).trim(),
          category: String(category).trim(),
          barcode: String(barcode).trim() || undefined,
          warrantyStart: String(warrantyStart).trim() || undefined,
          warrantyEnd: String(warrantyEnd).trim() || undefined,
          warrantyDuration: String(warrantyDuration).trim() || undefined
        };
      }).filter(p => p.name && p.category); // Filter out empty rows

      if (products.length === 0) {
        toast.error('No valid products found in the Excel file. Please check the format.');
        setImporting(false);
        return;
      }

      setTableRows(products);
      setMode('table');
      toast.success(`Loaded ${products.length} product(s) from Excel file!`);
      playBeep('success');
    } catch (error) {
      console.error('Error reading Excel file:', error);
      toast.error('Failed to read Excel file. Please check the format.');
      playBeep('error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const addTableRow = () => {
    setTableRows([...tableRows, { 
      name: '', 
      category: '', 
      barcode: '',
      warrantyStart: '',
      warrantyEnd: '',
      warrantyDuration: ''
    }]);
  };

  const removeTableRow = (index: number) => {
    setTableRows(tableRows.filter((_, i) => i !== index));
  };

  const updateTableRow = (index: number, field: keyof ProductRow, value: string) => {
    const updated = [...tableRows];
    updated[index] = { ...updated[index], [field]: value };
    setTableRows(updated);
  };

  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr || !dateStr.trim()) return undefined;
    
    // Try parsing common date formats
    const date = parseWarrantyDate(dateStr);
    if (date) return date;
    
    // Try standard ISO format
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    
    return undefined;
  };

  const calculateWarrantyFields = (
    startStr?: string,
    endStr?: string,
    durationStr?: string
  ): { warrantyStart?: Date; warrantyEnd?: Date; warrantyDuration?: number } => {
    const warrantyStart = startStr ? parseDate(startStr) : undefined;
    const warrantyEnd = endStr ? parseDate(endStr) : undefined;
    const warrantyDuration = durationStr ? parseInt(durationStr, 10) : undefined;

    // If we have start date and duration, calculate end date
    if (warrantyStart && warrantyDuration && !warrantyEnd) {
      return {
        warrantyStart,
        warrantyEnd: calculateWarrantyEnd(warrantyStart, warrantyDuration),
        warrantyDuration
      };
    }

    // If we have start date and end date, calculate duration
    if (warrantyStart && warrantyEnd && !warrantyDuration) {
      const months = Math.round(
        (warrantyEnd.getTime() - warrantyStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );
      return {
        warrantyStart,
        warrantyEnd,
        warrantyDuration: months > 0 ? months : undefined
      };
    }

    // If we have end date and duration, calculate start date
    if (warrantyEnd && warrantyDuration && !warrantyStart) {
      const start = new Date(warrantyEnd);
      start.setMonth(start.getMonth() - warrantyDuration);
      return {
        warrantyStart: start,
        warrantyEnd,
        warrantyDuration
      };
    }

    // Return what we have
    return {
      warrantyStart,
      warrantyEnd,
      warrantyDuration
    };
  };

  const handleImport = async () => {
    // Validate all rows
    const validRows = tableRows.filter(row => {
      const validation = BulkImportRowSchema.safeParse(row);
      return validation.success && row.name.trim() && row.category.trim();
    });
    
    if (validRows.length === 0) {
      toast.error('Please add at least one product with name and category');
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: validRows.length });
    
    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        setImportProgress({ current: i + 1, total: validRows.length });
        
        try {
          // Validate row data
          const validation = BulkImportRowSchema.safeParse(row);
          if (!validation.success) {
            errorCount++;
            continue;
          }

          const itemCode = await generateItemCode(row.category);
          
          // Calculate warranty fields
          const warranty = calculateWarrantyFields(
            row.warrantyStart,
            row.warrantyEnd,
            row.warrantyDuration
          );

          const newProduct: Product = {
            id: generateUUID(),
            itemCode,
            name: row.name.trim(),
            category: row.category.trim(),
            barcode: row.barcode?.trim() || undefined,
            qrValue: itemCode,
            warrantyStart: warranty.warrantyStart,
            warrantyEnd: warranty.warrantyEnd,
            warrantyDuration: warranty.warrantyDuration,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await addProduct(newProduct);
          successCount++;
        } catch (error) {
          const appError = handleError(error, `Import product ${i + 1}`);
          console.error('Error adding product:', appError);
          errorCount++;
        }
      }

      playBeep('success');
      toast.success(`Successfully imported ${successCount} product(s)${errorCount > 0 ? `. ${errorCount} failed.` : '!'}`);
      
      // Reset
      setTableRows([{ 
        name: '', 
        category: '', 
        barcode: '',
        warrantyStart: '',
        warrantyEnd: '',
        warrantyDuration: ''
      }]);
      setMode('upload');
      setImportProgress({ current: 0, total: 0 });
      onImportComplete();
      onClose();
    } catch (error) {
      const appError = handleError(error, 'Bulk import');
      toast.error(appError.userMessage);
      playBeep('error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Import Products" size="xl">
      <div className="space-y-6">
        {/* Mode Selection */}
        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => setMode('upload')}
            variant={mode === 'upload' ? 'primary' : 'outline'}
            fullWidth
            size="lg"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Upload Excel File
          </Button>
          <Button
            onClick={() => setMode('table')}
            variant={mode === 'table' ? 'primary' : 'outline'}
            fullWidth
            size="lg"
          >
            <Table className="w-5 h-5 mr-2" />
            Manual Entry (Table)
          </Button>
        </div>

        {mode === 'upload' && (
          <div className="space-y-4">
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 p-6">
              <h3 className="text-xl font-bold mb-4">📥 Upload Excel File</h3>
              <p className="text-lg text-gray-700 mb-4">
                Download the sample template, fill it with your products, and upload it here.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={downloadSampleExcel}
                  variant="outline"
                  fullWidth
                  size="lg"
                  className="bg-white"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Sample Excel Template
                </Button>

                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label
                    htmlFor="excel-upload"
                    className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg cursor-pointer hover:from-green-600 hover:to-emerald-600 transition-colors text-lg font-semibold"
                  >
                    <Upload className="w-5 h-5" />
                    {importing ? 'Reading File...' : 'Choose Excel File to Upload'}
                  </label>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">📋 Excel Format Requirements:</p>
                  <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                    <li><strong>Required:</strong> Product Name, Category</li>
                    <li><strong>Optional:</strong> Barcode, Warranty Start Date, Warranty End Date, Warranty Duration (Months)</li>
                    <li><strong>Date Format:</strong> YYYY-MM-DD (e.g., 2024-01-15) or DD-MM-YYYY (e.g., 15-01-2024)</li>
                    <li><strong>Warranty:</strong> Provide either (Start Date + Duration) OR (Start Date + End Date) OR (End Date + Duration)</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}

        {mode === 'table' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold">📝 Manual Entry Table</h3>
                <Button
                  onClick={addTableRow}
                  variant="outline"
                  size="md"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Row
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Enter product details manually. Item codes will be auto-generated. Warranty fields are optional.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-gray-300 text-sm">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="border-2 border-gray-300 px-2 py-2 text-left font-bold text-xs">Product Name *</th>
                    <th className="border-2 border-gray-300 px-2 py-2 text-left font-bold text-xs">Category *</th>
                    <th className="border-2 border-gray-300 px-2 py-2 text-left font-bold text-xs">Barcode</th>
                    <th className="border-2 border-gray-300 px-2 py-2 text-left font-bold text-xs">Warranty Start</th>
                    <th className="border-2 border-gray-300 px-2 py-2 text-left font-bold text-xs">Warranty End</th>
                    <th className="border-2 border-gray-300 px-2 py-2 text-left font-bold text-xs">Duration (Months)</th>
                    <th className="border-2 border-gray-300 px-2 py-2 text-center font-bold text-xs w-16">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border-2 border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateTableRow(index, 'name', e.target.value)}
                          placeholder="e.g., Samsung TV"
                          className="w-full px-2 py-1.5 text-sm border-2 border-gray-300 rounded focus:border-blue-600 focus:outline-none"
                        />
                      </td>
                      <td className="border-2 border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={row.category}
                          onChange={(e) => updateTableRow(index, 'category', e.target.value)}
                          placeholder="e.g., TV"
                          className="w-full px-2 py-1.5 text-sm border-2 border-gray-300 rounded focus:border-blue-600 focus:outline-none"
                        />
                      </td>
                      <td className="border-2 border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={row.barcode || ''}
                          onChange={(e) => updateTableRow(index, 'barcode', e.target.value)}
                          placeholder="Optional"
                          className="w-full px-2 py-1.5 text-sm border-2 border-gray-300 rounded focus:border-blue-600 focus:outline-none font-mono"
                        />
                      </td>
                      <td className="border-2 border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={row.warrantyStart || ''}
                          onChange={(e) => updateTableRow(index, 'warrantyStart', e.target.value)}
                          placeholder="YYYY-MM-DD"
                          className="w-full px-2 py-1.5 text-sm border-2 border-gray-300 rounded focus:border-blue-600 focus:outline-none"
                        />
                      </td>
                      <td className="border-2 border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={row.warrantyEnd || ''}
                          onChange={(e) => updateTableRow(index, 'warrantyEnd', e.target.value)}
                          placeholder="YYYY-MM-DD"
                          className="w-full px-2 py-1.5 text-sm border-2 border-gray-300 rounded focus:border-blue-600 focus:outline-none"
                        />
                      </td>
                      <td className="border-2 border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={row.warrantyDuration || ''}
                          onChange={(e) => updateTableRow(index, 'warrantyDuration', e.target.value)}
                          placeholder="e.g., 12"
                          className="w-full px-2 py-1.5 text-sm border-2 border-gray-300 rounded focus:border-blue-600 focus:outline-none"
                        />
                      </td>
                      <td className="border-2 border-gray-300 px-2 py-2 text-center">
                        {tableRows.length > 1 && (
                          <button
                            onClick={() => removeTableRow(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Note:</strong> * Required fields. Item codes will be auto-generated.
              </p>
              <p className="text-xs text-blue-700">
                <strong>Warranty:</strong> Enter any two of (Start Date, End Date, Duration) and the third will be calculated automatically. 
                Date format: YYYY-MM-DD or DD-MM-YYYY (e.g., 2024-01-15 or 15-01-2024)
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {importing && importProgress.total > 0 && (
          <div className="pt-4 border-t-2 border-gray-200">
            <ProgressBar
              value={importProgress.current}
              max={importProgress.total}
              label="Importing products"
              showPercentage={true}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 border-t-2 border-gray-200">
          <Button
            onClick={onClose}
            variant="outline"
            fullWidth
            disabled={importing}
          >
            Cancel
          </Button>
          {mode === 'table' && (
            <Button
              onClick={handleImport}
              fullWidth
              disabled={importing || tableRows.filter(r => r.name && r.category).length === 0}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {importing ? `Importing ${importProgress.current}/${importProgress.total}...` : `Import ${tableRows.filter(r => r.name && r.category).length} Product(s)`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

