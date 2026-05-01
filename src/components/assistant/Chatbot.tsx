import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Mic, MicOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { productDb } from '@/services/database/db';
import { Product } from '@/types';
import { getWarrantyStatus } from '@/utils/warrantyCalculator';
import { formatDate } from '@/utils/dateUtils';
import { generateItemCode } from '@/utils/itemCodeGenerator';
import { generateQRCodeUrl } from '@/utils/qrCodeUrl';
import { generateUUID } from '@/utils/uuid';
import { playBeep } from '@/utils/sounds';
import toast from 'react-hot-toast';

interface ChatbotProps {
  onProductSelect?: (product: Product) => void;
}

interface ChatMessage {
  type: 'user' | 'bot';
  text: string;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'outline';
  }>;
  product?: Product;
}

export function Chatbot({ onProductSelect: _onProductSelect }: ChatbotProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { type: 'bot', text: 'Hello! I can help you find products, check warranties, and answer questions. Try asking: "Show me my TV" or "Is my refrigerator under warranty?"' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [productData, setProductData] = useState<{ name?: string; category?: string; barcode?: string }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isListening, transcript, startListening, stopListening, error: voiceError } = useVoiceInput();

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
      handleSend(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (text?: string) => {
    const userMessage = text || input.trim();
    if (!userMessage) return;

    // Handle product addition flow
    if (addingProduct) {
      await handleProductAdditionStep(userMessage);
      return;
    }

    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await processMessage(userMessage);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      setMessages(prev => [...prev, { type: 'bot', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProductAdditionStep = async (userInput: string) => {
    const lowerInput = userInput.toLowerCase().trim();
    
    if (!productData.name) {
      // Ask for product name
      setProductData({ name: userInput });
      setMessages(prev => [...prev, 
        { type: 'user', text: userInput },
        { type: 'bot', text: `Great! Product name: "${userInput}". What category is it? (e.g., TV, Mobile, Refrigerator, Laptop, etc.)` }
      ]);
    } else if (!productData.category) {
      // Ask for category
      setProductData(prev => ({ ...prev, category: userInput }));
      setMessages(prev => [...prev, 
        { type: 'user', text: userInput },
        { type: 'bot', text: `Category: "${userInput}". Do you have a barcode? (Type the barcode number or say "no" to skip)` }
      ]);
    } else if (productData.barcode === undefined) {
      // Ask for barcode
      if (lowerInput === 'no' || lowerInput === 'skip' || lowerInput === 'n') {
        await saveProductFromChat();
      } else {
        setProductData(prev => ({ ...prev, barcode: userInput }));
        setMessages(prev => [...prev, { type: 'user', text: userInput }]);
        await saveProductFromChat();
      }
    }
  };

  const saveProductFromChat = async () => {
    try {
      setIsProcessing(true);
      const itemCode = await generateItemCode(productData.category || 'Other');
      const qrValue = generateQRCodeUrl(itemCode);

      const newProduct: Product = {
        id: generateUUID(),
        itemCode,
        name: productData.name!,
        category: productData.category || 'Other',
        barcode: productData.barcode,
        qrValue,
        createdAt: new Date(),
      };

      await productDb.add(newProduct);
      playBeep('success');
      
      setMessages(prev => [...prev, {
        type: 'bot',
        text: `✅ Product added successfully!\n\n• Name: ${newProduct.name}\n• Item Code: ${newProduct.itemCode}\n• Category: ${newProduct.category}\n\nWould you like to view the product details or add warranty information?`,
        product: newProduct,
        actions: [
          {
            label: 'View Product',
            action: () => {
              navigate(`/product/${itemCode}`);
              setIsOpen(false);
            },
            variant: 'primary'
          },
          {
            label: 'Add Warranty',
            action: () => {
              navigate(`/product/${itemCode}`);
              setIsOpen(false);
            },
            variant: 'outline'
          }
        ]
      }]);
      
      toast.success('Product added successfully!');
      setAddingProduct(false);
      setProductData({});
    } catch (error) {
      console.error('Error adding product:', error);
      setMessages(prev => [...prev, { type: 'bot', text: 'Sorry, I couldn\'t add the product. Please try again or use the Add Product page.' }]);
      toast.error('Failed to add product');
    } finally {
      setIsProcessing(false);
    }
  };

  const processMessage = async (message: string): Promise<ChatMessage> => {
    const lowerMessage = message.toLowerCase().trim();
    const allProducts = await productDb.getAll();

    // Helper function to search products by name/term
    const searchProducts = (query: string): Product[] => {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
      return allProducts.filter(p => {
        const name = p.name.toLowerCase();
        const category = p.category.toLowerCase();
        const itemCode = p.itemCode.toLowerCase();
        
        // Check if all search terms match
        return searchTerms.every(term => 
          name.includes(term) || 
          category.includes(term) || 
          itemCode.includes(term) ||
          name.split(' ').some(word => word.includes(term)) ||
          term.length >= 2 && name.includes(term.substring(0, 2))
        );
      });
    };

    // Extract product name from warranty queries
    const extractProductFromWarrantyQuery = (msg: string): string | null => {
      const warrantyKeywords = ['warranty', 'guarantee', 'get', 'my', 'of', 'for', 'the'];
      const words = msg.toLowerCase().split(' ');
      const productWords = words.filter(w => !warrantyKeywords.includes(w) && w.length > 1);
      return productWords.length > 0 ? productWords.join(' ') : null;
    };

    // 1. Add product requests
    if (lowerMessage.includes('add') && (lowerMessage.includes('product') || lowerMessage.includes('item'))) {
      return {
        type: 'bot',
        text: 'I can help you add a product! You can either:\n\n1. Go to the Add Product page (recommended for scanning barcodes)\n2. Add it through me by telling me the details\n\nWhat would you like to do?',
        actions: [
          {
            label: 'Go to Add Product Page',
            action: () => {
              navigate('/add');
              setIsOpen(false);
            },
            variant: 'primary'
          },
          {
            label: 'Add Through Chat',
            action: () => {
              setAddingProduct(true);
              setProductData({});
              setMessages(prev => [...prev, {
                type: 'bot',
                text: 'Great! Let\'s add a product. What is the product name?'
              }]);
            },
            variant: 'outline'
          }
        ]
      };
    }

    // 2. Warranty queries - check this FIRST before general product search
    if (lowerMessage.includes('warranty') || lowerMessage.includes('guarantee') || 
        lowerMessage.includes('get my warranty') || lowerMessage.includes('warranty of')) {
      const productQuery = extractProductFromWarrantyQuery(message);
      
      if (productQuery) {
        const found = searchProducts(productQuery);
        if (found.length > 0) {
          const product = found[0]; // Use first match
          const status = getWarrantyStatus(product.warrantyEnd);
          
          if (status === 'valid') {
            return {
              type: 'bot',
              text: `✅ Your ${product.name} (${product.itemCode}) is under warranty until ${formatDate(product.warrantyEnd!)}.\n\n• Warranty Start: ${product.warrantyStart ? formatDate(product.warrantyStart) : 'Not set'}\n• Warranty End: ${formatDate(product.warrantyEnd!)}\n• Status: Valid ✅`,
              product,
              actions: [
                {
                  label: 'Get Warranty PDF',
                  action: () => {
                    navigate(`/warranty`);
                    setIsOpen(false);
                  },
                  variant: 'primary'
                },
                {
                  label: 'View Product',
                  action: () => {
                    navigate(`/product/${product.itemCode}`);
                    setIsOpen(false);
                  },
                  variant: 'outline'
                }
              ]
            };
          } else if (status === 'expired') {
            return {
              type: 'bot',
              text: `❌ Your ${product.name} (${product.itemCode}) warranty expired on ${formatDate(product.warrantyEnd!)}.\n\n• Warranty Start: ${product.warrantyStart ? formatDate(product.warrantyStart) : 'Not set'}\n• Warranty End: ${formatDate(product.warrantyEnd!)}\n• Status: Expired ❌`,
              product,
              actions: [
                {
                  label: 'View Product',
                  action: () => {
                    navigate(`/product/${product.itemCode}`);
                    setIsOpen(false);
                  },
                  variant: 'primary'
                }
              ]
            };
          } else {
            return {
              type: 'bot',
              text: `Your ${product.name} (${product.itemCode}) doesn't have warranty information yet. Upload the warranty card to track it!`,
              product,
              actions: [
                {
                  label: 'Add Warranty',
                  action: () => {
                    navigate(`/product/${product.itemCode}`);
                    setIsOpen(false);
                  },
                  variant: 'primary'
                },
                {
                  label: 'View Product',
                  action: () => {
                    navigate(`/product/${product.itemCode}`);
                    setIsOpen(false);
                  },
                  variant: 'outline'
                }
              ]
            };
          }
        } else {
          return {
            type: 'bot',
            text: `I couldn't find a product matching "${productQuery}". Try saying the product name, or ask me to show all your products.`
          };
        }
      }
      
      // General warranty status
      const productsWithWarranty = allProducts.filter(p => p.warrantyEnd);
      if (productsWithWarranty.length === 0) {
        return {
          type: 'bot',
          text: 'No products with warranty information found. Upload warranty cards to track warranty status.',
          actions: [
            {
              label: 'Add Product',
              action: () => {
                navigate('/add');
                setIsOpen(false);
              },
              variant: 'primary'
            }
          ]
        };
      }
      
      const valid = productsWithWarranty.filter(p => getWarrantyStatus(p.warrantyEnd) === 'valid').length;
      const expired = productsWithWarranty.length - valid;
      
      return {
        type: 'bot',
        text: `Warranty Status:\n• ${valid} product(s) with valid warranty ✅\n• ${expired} product(s) with expired warranty ❌\n\nAsk about a specific product like "warranty of boat earphone" for details.`
      };
    }

    // 3. Show all products requests
    if (lowerMessage.includes('show') && (lowerMessage.includes('all') || lowerMessage.includes('products') || lowerMessage.includes('everything'))) {
      if (allProducts.length === 0) {
        return {
          type: 'bot',
          text: 'You don\'t have any products yet. Add your first product by scanning a barcode!',
          actions: [
            {
              label: 'Add Product',
              action: () => {
                navigate('/add');
                setIsOpen(false);
              },
              variant: 'primary'
            }
          ]
        };
      }
      
      const productList = allProducts.map((p, idx) => {
        const warrantyStatus = getWarrantyStatus(p.warrantyEnd);
        const statusIcon = warrantyStatus === 'valid' ? '✅' : warrantyStatus === 'expired' ? '❌' : '⚪';
        return `${idx + 1}. ${p.name} (${p.itemCode}) - ${p.category} ${statusIcon}`;
      }).join('\n');
      
      return {
        type: 'bot',
        text: `Here are all your ${allProducts.length} product(s):\n\n${productList}\n\nAsk about a specific product for more details!`,
        actions: [
          {
            label: 'View All Products',
            action: () => {
              navigate('/inventory');
              setIsOpen(false);
            },
            variant: 'outline'
          }
        ]
      };
    }

    // 4. Direct product name search (like "tv", "boat earphone")
    // Remove common stop words and check if it's a product search
    const stopWords = ['show', 'me', 'my', 'find', 'search', 'list', 'the', 'a', 'an', 'is', 'are', 'can', 'you', 'please', 'pls', 'help'];
    const cleanMessage = lowerMessage.split(' ').filter(w => !stopWords.includes(w)).join(' ');
    
    if (cleanMessage.length > 0 && cleanMessage.length < 50) {
      const found = searchProducts(cleanMessage);
      
      if (found.length > 0) {
        if (found.length === 1) {
          const p = found[0];
          const warrantyStatus = getWarrantyStatus(p.warrantyEnd);
          const statusIcon = warrantyStatus === 'valid' ? '✅' : warrantyStatus === 'expired' ? '❌' : '⚪';
          const statusText = warrantyStatus === 'valid' ? `Warranty valid until ${formatDate(p.warrantyEnd!)}` : 
                           warrantyStatus === 'expired' ? `Warranty expired on ${formatDate(p.warrantyEnd!)}` : 
                           'No warranty info';
          
          return {
            type: 'bot',
            text: `Found: ${p.name}\n\n• Item Code: ${p.itemCode}\n• Category: ${p.category}${p.barcode ? `\n• Barcode: ${p.barcode}` : ''}\n• Warranty: ${statusText} ${statusIcon}${p.warrantyStart ? `\n• Warranty Start: ${formatDate(p.warrantyStart)}` : ''}${p.warrantyEnd ? `\n• Warranty End: ${formatDate(p.warrantyEnd)}` : ''}\n• Created: ${formatDate(p.createdAt)}`,
            product: p,
            actions: [
              {
                label: 'View Details',
                action: () => {
                  navigate(`/product/${p.itemCode}`);
                  setIsOpen(false);
                },
                variant: 'primary'
              },
              {
                label: 'Get Warranty',
                action: () => {
                  navigate(`/warranty`);
                  setIsOpen(false);
                },
                variant: 'outline'
              }
            ]
          };
        } else {
          const productList = found.map(p => {
            const warrantyStatus = getWarrantyStatus(p.warrantyEnd);
            const statusIcon = warrantyStatus === 'valid' ? '✅' : warrantyStatus === 'expired' ? '❌' : '⚪';
            return `• ${p.name} (${p.itemCode}) - ${p.category} ${statusIcon}`;
          }).join('\n');
          return {
            type: 'bot',
            text: `I found ${found.length} product(s) matching "${cleanMessage}":\n\n${productList}\n\nWhich one would you like to know more about? Say the product name or item code.`
          };
        }
      }
    }

    // 5. Help requests
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do') || lowerMessage === 'pls' || lowerMessage === 'please') {
      return {
        type: 'bot',
        text: `I can help you with:\n\n• Finding products: Just say the product name like "tv" or "boat earphone"\n• Checking warranty: "warranty of boat earphone" or "get my warranty"\n• Showing all products: "show all products"\n• Adding products: "add product" or "add item"\n\nTry asking me anything!`
      };
    }

    // 6. Polite responses
    if (lowerMessage === 'yes' || lowerMessage === 'ok' || lowerMessage === 'okay') {
      return {
        type: 'bot',
        text: 'Great! What would you like to know? You can ask me about your products, warranties, or how to add new items.'
      };
    }

    // 7. Default - try to search anyway
    if (cleanMessage.length > 0) {
      const found = searchProducts(cleanMessage);
      if (found.length > 0) {
        const productList = found.map(p => `• ${p.name} (${p.itemCode})`).join('\n');
        return {
          type: 'bot',
          text: `I found ${found.length} product(s):\n\n${productList}\n\nWould you like to know more about any of these?`
        };
      }
    }

    // Final default response
    return {
      type: 'bot',
      text: 'I can help you find products, check warranties, and answer questions. Try:\n• "tv" or "boat earphone" - to find products\n• "warranty of boat earphone" - to check warranty\n• "show all products" - to see everything\n• "add product" - to add a new item'
    };
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-full shadow-2xl hover:shadow-3xl flex items-center justify-center z-50 hover:scale-110 transition-all duration-300 border-2 border-yellow-400"
        aria-label="Open chatbot"
        aria-expanded="false"
      >
        <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8" />
      </button>
    );
  }

  return (
    <div 
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-w-[calc(100vw-2rem)] sm:max-w-md h-[calc(100vh-8rem)] sm:h-[600px] max-h-[calc(100vh-8rem)] sm:max-h-[600px] bg-white rounded-2xl shadow-2xl border-4 border-blue-500 flex flex-col z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chatbot-title"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white p-3 sm:p-4 rounded-t-xl flex items-center justify-between border-b-2 border-yellow-400">
        <div className="flex items-center gap-2">
          <div className="bg-white bg-opacity-20 rounded-full p-1.5">
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h3 id="chatbot-title" className="text-lg sm:text-xl font-bold bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent">
            Assistant
          </h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          aria-label="Close chatbot"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2.5 sm:p-3 text-base sm:text-lg ${
                msg.type === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-white text-gray-800 border-2 border-gray-200'
              }`}
            >
              {msg.type === 'bot' && <span className="font-semibold">🤖 </span>}
              <div className="whitespace-pre-line break-words">{msg.text}</div>
            </div>
            {msg.actions && msg.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 max-w-[80%]">
                {msg.actions.map((action, actionIdx) => (
                  <button
                    key={actionIdx}
                    onClick={action.action}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      action.variant === 'primary'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {action.variant === 'primary' && <ExternalLink className="w-4 h-4 inline mr-1" />}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-3">
              <span className="font-semibold">🤖 </span>
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t-2 border-gray-200 bg-white rounded-b-xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isProcessing) {
                handleSend();
              }
            }}
            placeholder={
              addingProduct
                ? !productData.name
                  ? 'Enter product name'
                  : !productData.category
                    ? 'Enter category'
                    : 'Enter barcode or "no"'
                : 'Ask me anything...'
            }
            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-base sm:text-lg border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
            disabled={isProcessing}
            autoFocus
            aria-label="Chat input"
            aria-describedby="chat-input-help"
          />
          <Button
            onClick={handleVoiceToggle}
            variant={isListening ? 'danger' : 'outline'}
            size="sm"
            className="px-2 sm:px-3"
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            title={isListening ? 'Stop listening' : 'Voice input'}
          >
            {isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
          </Button>
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isProcessing}
            size="sm"
            className="px-2 sm:px-3"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
        {voiceError && (
          <p className="text-sm text-red-600 mt-2">{voiceError}</p>
        )}
        {isListening && (
          <p className="text-sm text-blue-600 mt-2">🎤 Listening... Speak now</p>
        )}
      </div>
    </div>
  );
}

