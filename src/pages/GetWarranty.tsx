import { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, FileText, Download } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { QRScanner } from '@/components/scanner/QRScanner';
import { productDb, warrantyDb } from '@/services/database/db';
import { Product } from '@/types';
import { getWarrantyStatus } from '@/utils/warrantyCalculator';
import { formatDate } from '@/utils/dateUtils';
import { extractItemCodeFromQR } from '@/utils/qrCodeUrl';
import { playBeep } from '@/utils/sounds';
import toast from 'react-hot-toast';
import { generateWarrantyCertificatePdf } from '@/services/pdf/warrantyPdf';

export default function GetWarranty() {
  const [searchMethod, setSearchMethod] = useState<'itemCode' | 'barcode' | 'name' | 'qr'>('itemCode');
  const [searchInput, setSearchInput] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [warrantyImageUrl, setWarrantyImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Cleanup warranty image URL on unmount or when product changes
  useEffect(() => {
    return () => {
      if (warrantyImageUrl) {
        URL.revokeObjectURL(warrantyImageUrl);
      }
    };
  }, [warrantyImageUrl]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    if (showResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showResults]);

  // Real-time search for name method
  const handleSearchInputChange = async (value: string) => {
    setSearchInput(value);
    
    if (searchMethod === 'name' && value.trim().length > 0) {
      const allProducts = await productDb.getAll();
      const query = value.toLowerCase().trim();
      
      // Dynamic fuzzy search - matches any part of name
      const filtered = allProducts.filter(p => {
        const name = p.name.toLowerCase();
        const category = p.category.toLowerCase();
        const itemCode = p.itemCode.toLowerCase();
        
        // Check if query matches any part of name, category, or item code
        return name.includes(query) || 
               category.includes(query) || 
               itemCode.includes(query) ||
               // Check if any word in query matches any word in product name
               query.split(' ').some(qWord => name.includes(qWord)) ||
               name.split(' ').some(pWord => pWord.includes(query));
      });
      
      setSearchResults(filtered);
      setShowResults(filtered.length > 0);
      setProduct(null);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSearch = useCallback(async (searchValue?: string, methodOverride?: 'itemCode' | 'barcode' | 'name' | 'qr') => {
    const searchTerm = (searchValue || searchInput.trim() || '').toString();
    
    if (!searchTerm) {
      toast.error('Please enter search term');
      return;
    }

    setLoading(true);
    setShowResults(false);
    playBeep('scan');

    try {
      let foundProduct: Product | undefined;
      // Use methodOverride if provided, otherwise use current searchMethod
      // When searchValue is provided (like from dropdown), use the current searchMethod
      const currentMethod = methodOverride || searchMethod;

      switch (currentMethod) {
        case 'itemCode':
        case 'qr':
          // Try both uppercase and original case
          foundProduct = await productDb.getByItemCode(searchTerm.trim());
          if (!foundProduct && searchTerm.trim() !== searchTerm.trim().toUpperCase()) {
            foundProduct = await productDb.getByItemCode(searchTerm.trim().toUpperCase());
          }
          break;
        case 'barcode':
          const allProducts = await productDb.getAll();
          foundProduct = allProducts.find(p => p.barcode === searchTerm);
          break;
        case 'name':
          // Always search all products for name method
          const allProductsForName = await productDb.getAll();
          const searchQuery = searchTerm.toLowerCase().trim();
          
          console.log('Name search - Total products:', allProductsForName.length, 'Query:', searchQuery);
          
          if (allProductsForName.length === 0) {
            console.log('No products in database');
            foundProduct = undefined;
            break;
          }
          
          // Enhanced fuzzy search - more lenient matching
          const nameResults = allProductsForName.filter(p => {
            if (!p.name) {
              console.log('Product without name:', p);
              return false;
            }
            
            const name = p.name.toLowerCase().trim();
            const category = (p.category || '').toLowerCase().trim();
            const itemCode = (p.itemCode || '').toLowerCase().trim();
            
            // Exact match
            if (name === searchQuery || itemCode === searchQuery) {
              return true;
            }
            
            // Contains match (most common case)
            if (name.includes(searchQuery) || category.includes(searchQuery) || itemCode.includes(searchQuery)) {
              return true;
            }
            
            // Word-by-word match - check if any word in search matches any word in name
            const searchWords = searchQuery.split(/\s+/).filter(w => w.length > 0);
            const nameWords = name.split(/\s+/);
            
            if (searchWords.length > 0) {
              // Check if any search word is found in any name word
              if (searchWords.some(sw => nameWords.some(nw => nw.includes(sw) || sw.includes(nw)))) {
                return true;
              }
              
              // Check if all search words are found somewhere in the name
              if (searchWords.every(sw => name.includes(sw))) {
                return true;
              }
            }
            
            // Partial word match - check if search is a substring of any word
            if (nameWords.some(nw => nw.startsWith(searchQuery) || searchQuery.startsWith(nw))) {
              return true;
            }
            
            return false;
          });
          
          console.log('Name search results:', nameResults.length, 'matches');
          if (nameResults.length > 0) {
            console.log('Matching products:', nameResults.map(p => p.name));
          }
          
          if (nameResults.length > 0) {
            // Find best match (exact first, then contains, then first result)
            foundProduct = nameResults.find(p => 
              p.name.toLowerCase().trim() === searchQuery
            ) || nameResults.find(p => 
              p.name.toLowerCase().includes(searchQuery)
            ) || nameResults[0];
            
            console.log('Selected product:', foundProduct?.name, foundProduct?.itemCode);
          } else {
            console.log('No matching products found for:', searchQuery);
            foundProduct = undefined;
          }
          break;
      }

      if (foundProduct) {
        setProduct(foundProduct);
        
        // Load warranty document
        try {
          const doc = await warrantyDb.getByProductId(foundProduct.id);
          if (doc) {
            try {
              const imageUrl = URL.createObjectURL(doc.imageBlob);
              setWarrantyImageUrl(imageUrl);
            } catch (blobError) {
              console.error('Error creating image URL from blob:', blobError);
              setWarrantyImageUrl(null);
            }
          } else {
            setWarrantyImageUrl(null);
          }
        } catch (warrantyError) {
          console.error('Error loading warranty document:', warrantyError);
          setWarrantyImageUrl(null);
          // Don't fail the whole search if warranty loading fails
          toast.error('Product found, but warranty document could not be loaded');
        }
        
        playBeep('success');
        toast.success('Product found!');
      } else {
        setProduct(null);
        setWarrantyImageUrl(null);
        playBeep('error');
        toast.error('Product not found. Please check your search term.');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      playBeep('error');
      
      // Provide more specific error messages
      let errorMessage = 'Failed to search product';
      if (error?.message) {
        if (error.message.includes('not authenticated') || error.message.includes('User not authenticated')) {
          errorMessage = 'Please login to search for products';
        } else if (error.message.includes('Database not configured')) {
          errorMessage = 'Database connection error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      setProduct(null);
      setWarrantyImageUrl(null);
    } finally {
      setLoading(false);
    }
  }, [searchInput, searchMethod]);

  const handleQRScan = useCallback((qrCode: string) => {
    if (!qrCode || !qrCode.trim()) {
      toast.error('Invalid QR code scanned');
      setShowQRScanner(false);
      return;
    }
    setShowQRScanner(false);
    // Extract itemCode from QR code (handles both URL and plain itemCode)
    const itemCode = extractItemCodeFromQR(qrCode);
    if (!itemCode) {
      toast.error('Could not extract product code from QR code');
      return;
    }
    setSearchInput(itemCode);
    setSearchMethod('itemCode');
    // Search immediately with the extracted itemCode
    handleSearch(itemCode).catch(err => {
      console.error('Search error in QR scan:', err);
      toast.error('Failed to search product. Please try again.');
    });
  }, [handleSearch]);

  const generateWarrantyPDF = async () => {
    if (!product) {
      toast.error('No product selected');
      return;
    }

    try {
      await generateWarrantyCertificatePdf(product, warrantyImageUrl);
      playBeep('success');
      toast.success('Warranty PDF generated successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      playBeep('error');
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="min-h-screen p-3 sm:p-4 max-w-4xl mx-auto pt-16">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Get Warranty Card</h1>
        <p className="text-base sm:text-lg text-gray-600 mt-2">Search for a product to view and download warranty details</p>
      </div>

      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      <div className="space-y-6">
        {/* Search Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Search Product</h2>
            
              {/* Search Method Selection */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 sm:mb-4">
              <Button
                onClick={() => {
                  setSearchMethod('itemCode');
                  setSearchInput('');
                  setProduct(null);
                }}
                variant={searchMethod === 'itemCode' ? 'primary' : 'outline'}
                size="md"
                fullWidth
              >
                Item Code
              </Button>
              <Button
                onClick={() => {
                  setSearchMethod('qr');
                  setShowQRScanner(true);
                }}
                variant={searchMethod === 'qr' ? 'primary' : 'outline'}
                size="md"
                fullWidth
              >
                <QrCode className="w-4 h-4 mr-1" />
                Scan QR
              </Button>
              <Button
                onClick={() => {
                  setSearchMethod('barcode');
                  setSearchInput('');
                  setProduct(null);
                }}
                variant={searchMethod === 'barcode' ? 'primary' : 'outline'}
                size="md"
                fullWidth
              >
                Barcode
              </Button>
              <Button
                onClick={() => {
                  setSearchMethod('name');
                  setSearchInput('');
                  setProduct(null);
                  setSearchResults([]);
                  setShowResults(false);
                }}
                variant={searchMethod === 'name' ? 'primary' : 'outline'}
                size="md"
                fullWidth
              >
                Name
              </Button>
            </div>

            {/* Search Input */}
            {searchMethod === 'qr' ? (
              <div className="text-center py-4">
                <p className="text-lg text-gray-600 mb-4">Click the button below to scan QR code</p>
                <Button
                  onClick={() => setShowQRScanner(true)}
                  fullWidth
                  size="lg"
                  className="text-xl py-4 bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  <QrCode className="w-6 h-6 mr-2" />
                  Scan QR Code
                </Button>
              </div>
            ) : (
              <div className="space-y-2 relative" ref={searchRef}>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleSearch();
                    }
                  }}
                  onFocus={() => {
                    if (searchMethod === 'name' && searchInput.trim().length > 0) {
                      setShowResults(true);
                    }
                  }}
                    placeholder={
                      searchMethod === 'itemCode' ? 'Enter item code (e.g., TV-001)' :
                      searchMethod === 'barcode' ? 'Enter barcode number' :
                      'Type product name (e.g., boat, earphone) - results appear as you type'
                    }
                    className="w-full px-3 sm:px-4 py-3 sm:py-4 text-lg sm:text-xl border-2 border-blue-600 rounded-lg focus:border-blue-700 focus:outline-none"
                    autoFocus
                  />
                
                {/* Dynamic Search Results Dropdown */}
                {showResults && searchResults.length > 0 && searchMethod === 'name' && (
                  <div className="absolute z-10 w-full mt-2 bg-white border-2 border-blue-300 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSearchInput(p.name);
                          setShowResults(false);
                          handleSearch(p.name, 'name');
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-200 last:border-b-0 transition-colors"
                      >
                        <div className="font-bold text-lg text-gray-900">{p.name}</div>
                        <div className="text-sm text-gray-600">{p.itemCode} • {p.category}</div>
                      </button>
                    ))}
                  </div>
                )}
                
                {showResults && searchResults.length === 0 && searchMethod === 'name' && searchInput.trim().length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-4">
                    <p className="text-gray-600">No products found matching "{searchInput}"</p>
                  </div>
                )}

                <Button
                  onClick={() => handleSearch()}
                  fullWidth
                  size="lg"
                  disabled={loading || !searchInput.trim()}
                  className="text-xl py-4 bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {loading ? '🔍 Searching...' : '🔍 Search Product'}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Product Details */}
        {product && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">Product Found</h2>
              
              <div className="bg-white rounded-lg p-6 space-y-3">
                <div>
                  <span className="text-lg font-semibold text-gray-600">Item Code: </span>
                  <span className="text-2xl font-bold text-green-700">{product.itemCode}</span>
                </div>
                
                <div>
                  <span className="text-lg font-semibold text-gray-600">Product Name: </span>
                  <span className="text-xl font-bold">{product.name}</span>
                </div>
                
                <div>
                  <span className="text-lg font-semibold text-gray-600">Category: </span>
                  <span className="text-xl">{product.category}</span>
                </div>

                {product.barcode && (
                  <div>
                    <span className="text-lg font-semibold text-gray-600">Barcode: </span>
                    <span className="text-xl font-mono">{product.barcode}</span>
                  </div>
                )}

                <div className="pt-4 border-t-2 border-gray-200">
                  <h3 className="text-xl font-bold mb-3">Warranty Status</h3>
                  {getWarrantyStatus(product.warrantyEnd) === 'none' ? (
                    <p className="text-lg text-gray-600">No warranty information available</p>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <span className="text-lg font-semibold">Status: </span>
                        <span className={`text-xl font-bold ${
                          getWarrantyStatus(product.warrantyEnd) === 'valid'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {getWarrantyStatus(product.warrantyEnd) === 'valid' ? '✅ Valid' : '❌ Expired'}
                        </span>
                      </div>
                      {product.warrantyStart && (
                        <div>
                          <span className="text-lg font-semibold">Start Date: </span>
                          <span className="text-xl">{formatDate(product.warrantyStart)}</span>
                        </div>
                      )}
                      {product.warrantyEnd && (
                        <div>
                          <span className="text-lg font-semibold">End Date: </span>
                          <span className="text-xl">{formatDate(product.warrantyEnd)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {warrantyImageUrl && (
                <div className="bg-white rounded-lg p-4">
                  <h3 className="text-xl font-bold mb-3">Warranty Card Image</h3>
                  <img
                    src={warrantyImageUrl}
                    alt="Warranty card"
                    className="w-full rounded-lg border-2 border-gray-300 max-h-96 object-contain"
                  />
                </div>
              )}

              <Button
                onClick={generateWarrantyPDF}
                fullWidth
                size="lg"
                className="text-xl py-6 bg-gradient-to-r from-green-600 to-emerald-600"
              >
                <Download className="w-6 h-6 mr-2" />
                📄 Generate Warranty PDF
              </Button>
            </div>
          </Card>
        )}

        {!product && !loading && (
          <Card>
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl text-gray-600">
                Search for a product to view warranty details
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

