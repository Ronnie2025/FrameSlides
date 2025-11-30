
import React from 'react';
import { SlideContent, SlideType } from '../types';
import { RefreshCw, Maximize2, Edit2, AlertCircle } from 'lucide-react';

interface SlidePreviewProps {
  slide: SlideContent;
  isActive: boolean;
  onRegenerateImage: (slideId: string) => void;
  onEditSlide: (slideId: string) => void;
}

const SlidePreview: React.FC<SlidePreviewProps> = ({ slide, isActive, onRegenerateImage, onEditSlide }) => {
  return (
    <div
      className={`relative w-full aspect-video bg-gray-200 rounded-xl overflow-hidden shadow-lg transition-all duration-500 ${isActive ? 'ring-4 ring-brand-400 scale-[1.01]' : 'opacity-90 hover:opacity-100 scale-100'}`}
    >
      {/* Image / HTML Layer */}
      {slide.htmlContent ? (
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-white">
          <div
            className="origin-top-left"
            style={{
              width: '1280px',
              height: '720px',
              transform: 'scale(var(--scale-factor, 0.25))'
            }}
            ref={(el) => {
              if (el && el.parentElement) {
                const updateScale = () => {
                  const parentWidth = el.parentElement!.offsetWidth;
                  const scale = parentWidth / 1280;
                  el.style.setProperty('--scale-factor', scale.toString());
                };
                new ResizeObserver(updateScale).observe(el.parentElement);
                updateScale();
              }
            }}
          >
            <iframe
              srcDoc={slide.htmlContent}
              className="w-full h-full border-none"
              title={slide.title}
              sandbox="allow-scripts"
            />
          </div>
        </div>
      ) : slide.imageUrl ? (
        <img
          src={slide.imageUrl}
          alt={slide.visualDescription}
          className="absolute inset-0 w-full h-full object-contain bg-white"
        />
      ) : (
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-colors duration-300 ${slide.error ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-800'}`}>
          {slide.isGenerating ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin"></div>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-lg animate-pulse">正在设计幻灯片...</p>
                <p className="text-sm text-brand-600/70 max-w-md">"{slide.title}"</p>
              </div>
            </div>
          ) : slide.error ? (
            <div className="flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="font-semibold">生成失败</p>
              <p className="text-xs text-red-500/80 max-w-xs">{slide.error}</p>
              <button
                onClick={() => onRegenerateImage(slide.id)}
                className="mt-2 px-4 py-2 bg-white text-red-600 text-xs font-bold rounded-full shadow-sm hover:bg-red-50 border border-red-100"
              >
                重试
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-50">
              <span className="text-4xl font-bold text-brand-200">{(slide.id.split('-').pop() || '0')}</span>
              <span className="font-medium">等待开始</span>
            </div>
          )}
        </div>
      )}

      {/* Hover Controls */}
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-20">
        {slide.imageUrl && (
          <button
            onClick={(e) => { e.stopPropagation(); onEditSlide(slide.id); }}
            disabled={slide.isGenerating || slide.isRegenerating}
            className="p-2 bg-white/90 hover:bg-brand-50 text-brand-700 rounded-full shadow-lg backdrop-blur-sm transition-transform hover:scale-110 disabled:opacity-50"
            title="修改 / 编辑幻灯片"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onRegenerateImage(slide.id); }}
          disabled={slide.isGenerating || slide.isRegenerating}
          className="p-2 bg-white/90 hover:bg-brand-50 text-brand-700 rounded-full shadow-lg backdrop-blur-sm transition-transform hover:scale-110 disabled:opacity-50"
          title="重新生成"
        >
          <RefreshCw className={`w-4 h-4 ${slide.isRegenerating ? 'animate-spin' : ''}`} />
        </button>
        {slide.imageUrl && (
          <button
            className="p-2 bg-white/90 hover:bg-brand-50 text-gray-700 rounded-full shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
            title="全屏查看"
            onClick={() => window.open(slide.imageUrl, '_blank')}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Info Badge */}
      <div className="absolute bottom-4 left-6 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">
        {slide.type === SlideType.COVER ? '封面' : '内容页'}
      </div>
    </div>
  );
};

export default SlidePreview;
