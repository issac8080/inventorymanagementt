import { useState } from 'react';
import { Download, Upload, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { downloadDatabaseExport, importDatabase, clearDatabase } from '@/utils/databaseExport';
import { validateFile } from '@/utils/validation';
import { isUsingLocalDatabase } from '@/services/database/db';
import toast from 'react-hot-toast';
import { playBeep } from '@/utils/sounds';

export default function Settings() {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    try {
      await downloadDatabaseExport();
      playBeep('success');
    } catch (error) {
      playBeep('error');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file, {
      maxSizeMB: 10,
      allowedTypes: ['application/json'],
    });

    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    setImporting(true);
    try {
      const result = await importDatabase(file);
      if (result.success) {
        playBeep('success');
        toast.success(
          `Successfully imported ${result.imported.products} products and ${result.imported.warranties} warranty documents!`
        );
        // Reload page to refresh data
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (error) {
      playBeep('error');
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleClear = async () => {
    try {
      await clearDatabase();
      setShowClearDialog(false);
      playBeep('success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      playBeep('error');
    }
  };

  return (
    <div className="min-h-screen p-3 sm:p-4 max-w-4xl mx-auto pt-16">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-lg text-gray-600">Manage your app settings and data</p>
      </div>

      <div className="space-y-6">
        {isUsingLocalDatabase() && (
          <Card className="border-2 border-amber-300 bg-amber-50">
            <h2 className="text-xl font-bold text-amber-900 mb-2">On-device mode</h2>
            <p className="text-lg text-amber-900">
              Your inventory is stored in this browser only. Export backups regularly from this page. To sync across
              devices, configure Firebase (see .env.example), deploy Firestore rules, and sign in with your account.
            </p>
          </Card>
        )}
        {/* Data Management */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <h2 className="text-2xl font-bold mb-4">Data Management</h2>
          
          <div className="space-y-4">
            {/* Export */}
            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <h3 className="text-xl font-semibold mb-2">Export Data</h3>
              <p className="text-gray-600 mb-4">
                Download a backup of all your products and warranty documents as a JSON file.
              </p>
              <Button
                onClick={handleExport}
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Download className="w-5 h-5 mr-2" />
                Export Database
              </Button>
            </div>

            {/* Import */}
            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <h3 className="text-xl font-semibold mb-2">Import Data</h3>
              <p className="text-gray-600 mb-4">
                Restore your data from a previously exported backup file.
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={importing}
                  className="hidden"
                  id="import-file"
                />
                <label htmlFor="import-file">
                  <Button
                    variant="outline"
                    size="lg"
                    disabled={importing}
                    className="w-full sm:w-auto cursor-pointer"
                    as="span"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    {importing ? 'Importing...' : 'Import Database'}
                  </Button>
                </label>
              </div>
            </div>

            {/* Clear */}
            <div className="bg-white rounded-lg p-4 border-2 border-red-200">
              <h3 className="text-xl font-semibold mb-2 text-red-600">Clear All Data</h3>
              <p className="text-gray-600 mb-4">
                Permanently delete all products and warranty documents. This action cannot be undone.
              </p>
              <Button
                onClick={() => setShowClearDialog(true)}
                variant="danger"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Clear Database
              </Button>
            </div>
          </div>
        </Card>

        {/* App Information */}
        <Card>
          <h2 className="text-2xl font-bold mb-4">App Information</h2>
          <div className="space-y-2 text-gray-600">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Storage:</strong> IndexedDB (Local)</p>
            <p><strong>Offline Support:</strong> Yes</p>
          </div>
        </Card>
      </div>

      <ConfirmationDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClear}
        title="Clear All Data"
        message="Are you sure you want to delete all products and warranty documents? This action cannot be undone."
        confirmText="Delete All"
        confirmVariant="danger"
      />
    </div>
  );
}

