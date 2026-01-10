import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'outline';
  cancelVariant?: 'primary' | 'danger' | 'outline';
}

/**
 * Confirmation dialog component
 * Provides accessible confirmation dialogs with keyboard support
 */
export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  cancelVariant = 'outline',
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="bg-red-100 rounded-full p-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-lg text-gray-700 flex-1">{message}</p>
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            onClick={onClose}
            variant={cancelVariant}
            fullWidth
            size="lg"
            aria-label={cancelText}
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            variant={confirmVariant}
            fullWidth
            size="lg"
            aria-label={confirmText}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
