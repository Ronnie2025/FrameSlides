
import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface EditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (instruction: string) => void;
  title: string;
}

const EditDialog: React.FC<EditDialogProps> = ({ isOpen, onClose, onSubmit, title }) => {
  const [instruction, setInstruction] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (instruction.trim()) {
      onSubmit(instruction);
      setInstruction('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-brand-50/50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            修改幻灯片
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            您想如何修改 <span className="font-medium text-brand-600">"{title}"</span>？
          </p>
          <textarea
            autoFocus
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }}}
            placeholder="例如：把标题放大，背景改成深蓝色，添加一只猫的插画..."
            className="w-full h-32 p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-sm resize-none"
          />
        </div>

        <div className="p-4 bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!instruction.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-lg shadow-brand-200 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            重新生成
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDialog;
