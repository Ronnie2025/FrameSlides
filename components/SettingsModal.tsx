import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import { Settings } from '../types';
import * as SettingsService from '../services/settingsService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSettingsChanged: (settings: Settings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSettingsChanged }) => {
    const [settings, setSettings] = useState<Settings>(SettingsService.defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const load = async () => {
                const loaded = await SettingsService.loadSettings();
                setSettings(loaded);
                setIsLoading(false);
            };
            load();
        }
    }, [isOpen]);

    const handleSave = async () => {
        await SettingsService.saveSettings(settings);
        onSettingsChanged(settings);
        onClose();
    };

    const handleReset = () => {
        if (confirm('确定要恢复默认设置吗？')) {
            setSettings(SettingsService.defaultSettings);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-slate-800">设置</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-900"></div>
                        </div>
                    ) : (
                        <>
                            {/* API Key */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">Gemini API Key (API 密钥)</label>
                                <input
                                    type="password"
                                    value={settings.apiKey || ''}
                                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                                    placeholder="输入您的 Gemini API Key（如果使用 Google 登录可不填）"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 focus:border-transparent outline-none transition-all"
                                />
                                <p className="text-xs text-slate-500">
                                    留空则使用默认环境密钥或 Google 登录（如可用）。
                                </p>
                            </div>



                            {/* Analysis Prompt */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 whitespace-nowrap">分析提示词</label>
                                <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-900 transition-all">
                                    <textarea
                                        value={settings.analysisPrompt || ''}
                                        onChange={(e) => setSettings({ ...settings, analysisPrompt: e.target.value })}
                                        className="w-full h-40 px-4 py-3 border-none outline-none font-mono text-xs leading-relaxed resize-none block"
                                    />
                                    <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 text-[10px] font-mono flex items-center gap-2">
                                        <span className="text-slate-400">Available Variables:</span>
                                        <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{'{{userInput}}'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Prompt Section */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 whitespace-nowrap">
                                    {settings.generationMode === 'html' ? 'HTML 设计提示词 (HTML Design Prompt)' : '生图提示词 (Image Generation Prompt)'}
                                </label>
                                <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-900 transition-all">
                                    <textarea
                                        value={settings.generationMode === 'html' ? (settings.htmlPrompt || '') : (settings.imagePrompt || '')}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            [settings.generationMode === 'html' ? 'htmlPrompt' : 'imagePrompt']: e.target.value
                                        })}
                                        className="w-full h-40 px-4 py-3 border-none outline-none font-mono text-xs leading-relaxed resize-none block"
                                    />
                                    <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 text-[10px] font-mono flex flex-wrap items-center gap-2">
                                        <span className="text-slate-400">Available Variables:</span>
                                        <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{'{{globalStyle}}'}</span>
                                        <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{'{{visualDescription}}'}</span>
                                        <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{'{{title}}'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Concurrency Limit */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-semibold text-slate-700">并行生成数量 (Concurrency)</label>
                                    <span className="text-sm font-bold text-brand-900">{settings.concurrencyLimit || 3}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="1"
                                    value={settings.concurrencyLimit || 3}
                                    onChange={(e) => setSettings({ ...settings, concurrencyLimit: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-900"
                                />
                                <p className="text-xs text-slate-500">
                                    同时生成的幻灯片数量 (1-5)。数值越高速度越快，但可能触发 API 限制。
                                </p>
                            </div>

                            {/* Generation Mode */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">生成模式 (Generation Mode)</label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setSettings({ ...settings, generationMode: 'image' })}
                                        className={`flex-1 py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 ${settings.generationMode === 'image' || !settings.generationMode
                                            ? 'bg-brand-50 border-brand-200 text-brand-900 ring-2 ring-brand-900 ring-offset-1'
                                            : 'bg-white border-gray-200 text-slate-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="font-medium">Image Mode</span>
                                        <span className="text-xs opacity-70">(Default)</span>
                                    </button>
                                    <button
                                        onClick={() => setSettings({ ...settings, generationMode: 'html' })}
                                        className={`flex-1 py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 ${settings.generationMode === 'html'
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-900 ring-2 ring-indigo-900 ring-offset-1'
                                            : 'bg-white border-gray-200 text-slate-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="font-medium">HTML Mode</span>
                                        <span className="text-xs opacity-70">(Pro)</span>
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Image Mode 生成图片 (Gemini Image)，HTML Mode 生成可编辑代码 (Gemini Pro)。
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-sm font-medium"
                    >
                        <RotateCcw className="w-4 h-4" />
                        恢复默认
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 text-slate-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-2 bg-brand-900 hover:bg-brand-800 text-white rounded-lg transition-colors font-medium shadow-lg shadow-gray-200"
                        >
                            <Save className="w-4 h-4" />
                            保存更改
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SettingsModal;
