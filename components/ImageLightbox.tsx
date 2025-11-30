
import React, { useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ imageUrl, onClose }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (imageUrl) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // Prevent scrolling background
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in-up">
      <div className="absolute top-4 right-4 flex gap-4 z-10">
        <a 
          href={imageUrl} 
          download="slide.png"
          className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
          title="Download Image"
        >
          <Download className="w-6 h-6" />
        </a>
        <button 
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-red-500/50 text-white rounded-full transition-colors backdrop-blur-md"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <img 
        src={imageUrl} 
        alt="Fullscreen Slide" 
        className="max-w-[95vw] max-h-[95vh] object-contain shadow-2xl rounded-md select-none"
      />
    </div>
  );
};

export default ImageLightbox;
