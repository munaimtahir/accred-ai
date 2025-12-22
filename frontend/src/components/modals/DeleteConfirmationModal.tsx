import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  type: 'project' | 'evidence';
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmationModal({ 
  type, 
  onClose, 
  onConfirm 
}: DeleteConfirmationModalProps) {
  const title = type === 'project' ? 'Delete Project' : 'Delete Evidence';
  const message = type === 'project' 
    ? 'Are you sure you want to delete this project? All indicators and evidence associated with this project will be permanently deleted. This action cannot be undone.'
    : 'Are you sure you want to delete this evidence? This action cannot be undone.';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-slate-600">{message}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
