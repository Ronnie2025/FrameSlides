
import React, { useState, useRef, useEffect } from 'react';
import { Send, StopCircle, Play, Sparkles, Layout, Download, FileImage, Key, History, Plus, MessageSquare, Trash2, Menu, X, ImageOff, ChevronLeft, ChevronRight, Settings as SettingsIcon, Copy } from 'lucide-react';
import { jsPDF } from "jspdf";
import { SlideContent, AppState, ChatMessage, Session, Settings } from './types';
import * as GeminiService from './services/geminiService';
import * as StorageService from './services/storageService';
import * as SettingsService from './services/settingsService';
import SlidePreview from './components/SlidePreview';
import ProgressBar from './components/ProgressBar';
import EditDialog from './components/EditDialog';
import SettingsModal from './components/SettingsModal';
import LoginButton from './components/LoginButton';
import ErrorBoundary from './components/ErrorBoundary';
import ImageLightbox from './components/ImageLightbox';

// New "Frame" Logo (FrameSlides)
const FrameSlidesLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

const AppContent: React.FC = () => {
  // API Key State
  const [hasApiKey, setHasApiKey] = useState(false);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(SettingsService.defaultSettings);
  const [user, setUser] = useState<any>(null);

  // Session & History State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Desktop State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // Mobile State
  const [chatWidth, setChatWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);

  // App State
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState<number>(-1);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);

  // Modals / Overlays
  const [editDialogSlideId, setEditDialogSlideId] = useState<string | null>(null);
  const [viewingImageSlideId, setViewingImageSlideId] = useState<string | null>(null);

  // Refs
  const shouldStopRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  // Sync Ref with State
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  // --- Initialization ---

  useEffect(() => {
    const checkKey = async () => {
      const win = window as any;
      if (win.aistudio) {
        const hasSelected = await win.aistudio.hasSelectedApiKey();
        setHasApiKey(hasSelected);
      } else {
        setHasApiKey(!!process.env.API_KEY);
      }
    };
    checkKey();

    // Initialize Sidebar based on screen size
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }

    // Load History & Settings
    const loadData = async () => {
      const savedSessions = await StorageService.loadSessions();
      if (savedSessions.length > 0) {
        setSessions(savedSessions);
      }
      const savedSettings = await SettingsService.loadSettings();
      setSettings(savedSettings);
    };
    loadData();
  }, []);

  // Persist History
  useEffect(() => {
    if (sessions.length === 0) return;

    const saveHistory = async () => {
      // We can now save everything including images
      const safeSessions = sessions.map(session => ({
        ...session,
        slides: session.slides.map(slide => ({
          ...slide,
          isGenerating: false,
          isRegenerating: false
        }))
      }));
      // Keep more sessions since we have more space
      const truncated = safeSessions.slice(0, 50);
      await StorageService.saveSessions(truncated);
    };
    saveHistory();
  }, [sessions]);

  // Sync Current Session
  useEffect(() => {
    if (currentSessionId) {
      setSessions(prev => prev.map(s =>
        s.id === currentSessionId
          ? { ...s, messages, slides, lastModified: Date.now() }
          : s
      ));
    }
  }, [messages, slides, currentSessionId]);

  const handleConnectKey = async () => {
    const win = window as any;
    if (win.aistudio) {
      try {
        await win.aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (e) {
        console.error("Failed to select key", e);
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Session Management ---

  const createNewSession = () => {
    // Check if the current session is already empty/new
    if (currentSessionId) {
      const currentSession = sessions.find(s => s.id === currentSessionId);
      if (currentSession &&
        currentSession.title === '新建演示文稿' &&
        currentSession.messages.length <= 1 &&
        currentSession.slides.length === 0) {
        // Already on a new session, just return it
        setIsMobileSidebarOpen(false);
        return currentSession.id;
      }
    }

    const newSession: Session = {
      id: Date.now().toString(),
      title: '新建演示文稿',
      lastModified: Date.now(),
      messages: [{
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是 FrameSlides。请告诉我您的演示文稿主题，我将为您设计一套风格统一的精美幻灯片。',
        timestamp: Date.now()
      }],
      slides: []
    };

    setSessions(prev => [newSession, ...prev]);
    loadSession(newSession);
    setIsMobileSidebarOpen(false);
    return newSession.id;
  };

  const loadSession = (session: Session) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages || []);
    setSlides(session.slides || []);
    setAppState(AppState.IDLE);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
      setMessages([]);
      setSlides([]);
      setAppState(AppState.IDLE);
    }
  };

  // --- Core Logic ---

  const handleSend = async () => {
    if (!input.trim()) return;

    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      activeSessionId = createNewSession();
    }

    // Update title if it's the default one
    if (activeSessionId && sessions.find(s => s.id === activeSessionId)?.title === '新建演示文稿') {
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: input.substring(0, 30) } : s));
    }

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userText, timestamp: Date.now() }]);

    setAppState(AppState.ANALYZING);
    setSlides([]);
    setCurrentGeneratingIndex(-1);
    setActiveSlideId(null);

    try {
      setMessages(prev => [...prev, { id: 'analyzing', role: 'assistant', content: '正在分析内容并设计风格...', timestamp: Date.now() }]);

      // Step 1: Analyze content & extract style
      // Get API Key from settings or env
      const apiKey = settings.apiKey || process.env.API_KEY;

      const plannedSlides = await GeminiService.analyzeAndPlanSlides(userText, apiKey, settings.analysisPrompt);

      // CRITICAL: Check if we are still in the same session
      if (currentSessionIdRef.current !== activeSessionId) {
        console.log("Session changed during analysis, aborting update.");
        return;
      }

      setSlides(plannedSlides);
      setMessages(prev => [
        ...prev.filter(m => m.id !== 'analyzing'),
        { id: Date.now().toString(), role: 'assistant', content: `已规划 ${plannedSlides.length} 页幻灯片，风格：“${plannedSlides[0].globalStyle}”。正在生成视觉设计...`, timestamp: Date.now() }
      ]);

      setAppState(AppState.GENERATING);
      generateImagesLoop(plannedSlides, apiKey, activeSessionId);

    } catch (error: any) {
      // Only show error if we are still in the same session
      if (currentSessionIdRef.current === activeSessionId) {
        console.error("Error in handleSend:", error);
        setAppState(AppState.IDLE);
        setMessages(prev => [
          ...prev.filter(m => m.id !== 'analyzing'),
          { id: Date.now().toString(), role: 'assistant', content: `出错了: ${error.message}`, timestamp: Date.now() }
        ]);
      }
    }
  };

  const generateImagesLoop = async (initialSlides: SlideContent[], apiKey?: string, sessionId?: string) => {
    shouldStopRef.current = false;
    const limit = settings.concurrencyLimit || 3;

    let currentIndex = 0;
    const activePromises: Promise<void>[] = [];

    // Helper to generate a single slide
    const generateSingleSlide = async (index: number) => {
      const slideId = initialSlides[index].id;

      // Update state to generating
      setSlides(prev => prev.map(s => s.id === slideId ? { ...s, isGenerating: true, error: undefined } : s));

      try {
        // Small stagger to avoid hitting rate limits instantly if limit is high
        await new Promise(r => setTimeout(r, index * 200));

        if (settings.generationMode === 'html') {
          const htmlContent = await GeminiService.generateSlideHtml(initialSlides[index], apiKey, settings.htmlPrompt);
          if (sessionId && currentSessionIdRef.current !== sessionId) return;
          if (shouldStopRef.current) return;

          setSlides(prev => prev.map(s =>
            s.id === slideId ? { ...s, htmlContent, isGenerating: false } : s
          ));
        } else {
          const imageUrl = await GeminiService.generateSlideImage(initialSlides[index], undefined, apiKey, settings.imagePrompt);
          if (sessionId && currentSessionIdRef.current !== sessionId) return;
          if (shouldStopRef.current) return;

          setSlides(prev => prev.map(s =>
            s.id === slideId ? { ...s, imageUrl, isGenerating: false } : s
          ));
        }
      } catch (err: any) {
        if (sessionId && currentSessionIdRef.current !== sessionId) return;
        console.error(`Failed slide ${index}`, err);
        setSlides(prev => prev.map(s =>
          s.id === slideId ? { ...s, isGenerating: false, error: err.message || "Generation failed" } : s
        ));
      }
    };

    // Main Loop
    while (currentIndex < initialSlides.length || activePromises.length > 0) {
      // Check stop/session conditions
      if (sessionId && currentSessionIdRef.current !== sessionId) {
        console.log("Session changed, aborting.");
        return;
      }
      if (shouldStopRef.current) {
        setAppState(AppState.PAUSED);
        setCurrentGeneratingIndex(currentIndex); // Approximate resume point
        return;
      }

      // Fill the pool
      while (activePromises.length < limit && currentIndex < initialSlides.length) {
        if (shouldStopRef.current) break;

        const promise = generateSingleSlide(currentIndex).then(() => {
          // Remove self from activePromises when done
          const idx = activePromises.indexOf(promise);
          if (idx > -1) activePromises.splice(idx, 1);
        });

        activePromises.push(promise);
        setCurrentGeneratingIndex(currentIndex); // Track progress
        setActiveSlideId(initialSlides[currentIndex].id);
        currentIndex++;
      }

      // Wait for at least one to finish before looping again to refill
      if (activePromises.length > 0) {
        await Promise.race(activePromises);
      }
    }

    // Final check
    if (sessionId && currentSessionIdRef.current !== sessionId) return;

    setAppState(AppState.COMPLETED);
    setCurrentGeneratingIndex(-1);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '演示文稿已准备就绪！点击图片可放大查看或导出PDF。', timestamp: Date.now() }]);
  };

  const handleResume = () => {
    if (appState !== AppState.PAUSED) return;
    setAppState(AppState.GENERATING);
    const remainingSlides = slides.filter(s => !s.imageUrl);
    if (remainingSlides.length > 0) {
      const apiKey = settings.apiKey || process.env.API_KEY;
      generateImagesLoop(slides, apiKey, currentSessionId || undefined);
    }
  };

  const handleStop = () => {
    shouldStopRef.current = true;
    setAppState(AppState.PAUSED);
  };

  const handleRegenerateSlideImage = async (slideId: string, instruction?: string) => {
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;

    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, isRegenerating: true, error: undefined } : s));

    try {
      const apiKey = settings.apiKey || process.env.API_KEY;
      const newUrl = await GeminiService.generateSlideImage(slide, instruction, apiKey, settings.imagePrompt);
      setSlides(prev => prev.map(s => s.id === slideId ? { ...s, imageUrl: newUrl, isRegenerating: false } : s));
    } catch (e: any) {
      setSlides(prev => prev.map(s => s.id === slideId ? { ...s, isRegenerating: false, error: e.message } : s));
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "px", format: [1920, 1080] });
    let pagesAdded = 0;
    slides.forEach((slide) => {
      if (slide.imageUrl) {
        if (pagesAdded > 0) doc.addPage();
        doc.addImage(slide.imageUrl, "PNG", 0, 0, 1920, 1080);
        pagesAdded++;
      }
    });

    if (pagesAdded === 0) {
      alert("暂无生成的幻灯片可导出！");
      return;
    }
    doc.save(`${sessions.find(s => s.id === currentSessionId)?.title || 'presentation'}.pdf`);
  };

  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const stopResizing = () => setIsResizing(false);
    const resize = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX - (isSidebarOpen ? 260 : 0);
        if (newWidth > 280 && newWidth < 600) {
          setChatWidth(newWidth);
        }
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, isSidebarOpen]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // --- Render ---

  if (!user) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen w-full font-sans text-slate-800 p-4 transition-colors duration-500 ${settings.generationMode === 'html' ? 'bg-indigo-50' : 'bg-[#F7F7F8]'}`}>
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center space-y-8 border border-gray-100 animate-fade-in-up">
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-slate-200 transition-colors duration-500 ${settings.generationMode === 'html' ? 'bg-indigo-900' : 'bg-slate-900'}`}>
            <FrameSlidesLogo className="w-14 h-14 text-white" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">FrameSlides</h1>
            <p className="text-base text-slate-500 font-medium">
              让思维显化，为灵感成帧
            </p>
          </div>

          <div className="pt-4 flex flex-col items-center gap-3">
            <LoginButton
              settings={settings}
              onLoginSuccess={setUser}
              onLogout={() => { }}
              user={null}
            />
            <button
              onClick={() => setUser({
                name: 'Guest User',
                email: 'guest@example.com',
                picture: 'https://ui-avatars.com/api/?name=Guest+User&background=random'
              })}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors border-b border-transparent hover:border-slate-300 pb-0.5"
            >
              游客试用 (Guest Login)
            </button>
          </div>

          <div className="text-xs text-slate-400 pt-4 border-t border-gray-100">
            <p>请使用 Google 账号登录以继续</p>
          </div>
        </div>
      </div>
    );
  }

  const activeSession = sessions.find(s => s.id === currentSessionId);
  const completedCount = slides.filter(s => !s.isGenerating && !s.error && s.imageUrl).length;
  const currentSlideForEdit = editDialogSlideId ? slides.find(s => s.id === editDialogSlideId) : null;
  const currentImageForLightbox = viewingImageSlideId ? slides.find(s => s.id === viewingImageSlideId)?.imageUrl : null;

  return (
    <div className={`flex h-screen font-sans text-slate-900 overflow-hidden transition-colors duration-500 ${settings.generationMode === 'html' ? 'bg-indigo-50' : 'bg-[#F7F7F8]'}`}>

      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* Sidebar (History) */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-40 bg-[#F7F7F8] border-r border-gray-200 text-slate-700 flex flex-col transition-all duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isMobileSidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full md:translate-x-0'}
        ${isSidebarOpen ? 'md:w-[260px]' : 'md:w-0 md:opacity-0 md:overflow-hidden'}
      `}>
        <div className="p-4 flex flex-col min-w-[260px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-900 font-bold text-xl">
              <FrameSlidesLogo className="w-8 h-8 text-slate-900" />
              <span>FrameSlides</span>
            </div>
            <button onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden text-slate-500">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="px-3 pb-2 min-w-[260px] space-y-2">

          <button
            onClick={createNewSession}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 text-slate-700 hover:text-brand-900 hover:border-brand-200 hover:shadow-md rounded-xl transition-all shadow-sm group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform text-brand-600" />
            <span className="font-medium">新建演示文稿</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-w-[260px]">
          <div className="text-xs font-semibold text-slate-500 px-4 py-2 uppercase tracking-wider">历史记录</div>
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => { loadSession(session); if (window.innerWidth < 768) setIsMobileSidebarOpen(false); }}
              className={`group flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all relative pr-10 ${currentSessionId === session.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-gray-200/50' : 'hover:bg-gray-200/50 text-slate-500 hover:text-slate-700'}`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <div className="truncate text-sm font-medium">{session.title}</div>
              <button
                onClick={(e) => deleteSession(e, session.id)}
                className="absolute right-2 p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Settings Button (Bottom of Sidebar) */}
        <div className="p-4 border-t border-slate-300/50 min-w-[260px]">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 hover:bg-gray-200/50 rounded-xl transition-all"
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="font-medium">设置</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">

        {/* Top Header */}
        <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0 z-20 relative">
          <div className="flex items-center gap-3">
            {/* Mobile Menu */}
            <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600">
              <Menu className="w-6 h-6" />
            </button>

            {/* Desktop Toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex p-2 hover:bg-gray-100 rounded-lg text-slate-500 transition-colors"
              title={isSidebarOpen ? "关闭侧边栏" : "打开侧边栏"}
            >
              {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>

            {!isSidebarOpen && (
              <FrameSlidesLogo className="w-8 h-8 text-brand-900 hidden md:block animate-fade-in-up" />
            )}

            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 truncate max-w-[200px] md:max-w-md">
                {activeSession?.title || "新建演示文稿"}
              </span>
              {activeSession && (
                <span className="text-[10px] text-slate-400">
                  {slides.length > 0 ? `${slides.length} 页` : '空'}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {slides.some(s => s.imageUrl) && (
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-50 text-slate-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg transition-colors font-medium border border-gray-200 hover:border-brand-200"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">导出 PDF</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

          {/* Chat/Controls Column */}
          <div
            style={{ width: isMobileSidebarOpen ? '100%' : `${chatWidth}px` }}
            className="hidden md:flex flex-col border-r border-gray-100 bg-white z-10 shrink-0"
          >
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group/msg`}>
                  <div
                    className={`max-w-[90%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm relative ${msg.role === 'user'
                      ? settings.generationMode === 'html' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-brand-900 text-white rounded-br-sm'
                      : 'bg-gray-50 border border-gray-100 text-slate-700 rounded-bl-sm'
                      }`}
                  >
                    {msg.content}
                    <button
                      onClick={() => copyToClipboard(msg.content)}
                      className={`absolute ${msg.role === 'user' ? `-left-8 top-2 text-slate-300 ${settings.generationMode === 'html' ? 'hover:text-indigo-600' : 'hover:text-brand-900'}` : '-right-8 top-2 text-slate-300 hover:text-brand-900'} opacity-0 group-hover/msg:opacity-100 transition-opacity p-1`}
                      title="复制"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Progress Area */}
            {slides.length > 0 && (
              <div className="px-4 py-3 bg-white border-t border-gray-100">
                <ProgressBar
                  total={slides.length}
                  current={completedCount}
                  status={
                    appState === AppState.ANALYZING ? "分析内容中..." :
                      appState === AppState.GENERATING ? "正在生成视觉设计..." :
                        appState === AppState.PAUSED ? "已暂停" :
                          "生成完成"
                  }
                />
                <div className="flex gap-2 mt-2">
                  {appState === AppState.GENERATING && (
                    <button onClick={handleStop} className="flex-1 py-2 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100">停止生成</button>
                  )}
                  {appState === AppState.PAUSED && (
                    <button onClick={handleResume} className="flex-1 py-2 text-xs font-bold text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100">继续生成</button>
                  )}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="描述您的演示文稿主题..."
                  disabled={appState === AppState.GENERATING || appState === AppState.ANALYZING}
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm transition-all outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || appState === AppState.GENERATING}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-900 text-white rounded-lg hover:bg-brand-800 disabled:opacity-50 transition-all shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Drag Handle */}
          <div
            className="hidden md:block w-1 bg-transparent hover:bg-brand-200 cursor-col-resize absolute z-20 h-full transition-colors"
            style={{ left: `${chatWidth}px` }}
            onMouseDown={startResizing}
          />

          {/* Slides View / Workspace */}
          <div className="flex-1 bg-gray-50 overflow-y-auto p-4 md:p-8 scroll-smooth">
            {!currentSessionId || slides.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6 animate-fade-in-up">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-gray-200 ring-1 ring-gray-100">
                  <FrameSlidesLogo className="w-16 h-16 text-brand-900" />
                </div>
                <div className="text-center max-w-md px-4">
                  <h3 className="text-xl font-bold text-slate-700 mb-2">FrameSlides</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    在对话框中输入主题，即可生成风格统一、专业精美的演示文稿。
                  </p>
                </div>
                {/* Mobile Chat Input Hint */}
                <div className="md:hidden w-full max-w-sm px-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="输入主题..."
                      className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl shadow-sm"
                    />
                    <button onClick={handleSend} className="absolute right-2 top-2 p-1.5 bg-brand-900 text-white rounded-lg">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto space-y-8 pb-24">
                {slides.some(s => !s.imageUrl && !s.isGenerating && !s.error) && (
                  <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm flex items-center gap-2 mb-4 border border-blue-100">
                    <ImageOff className="w-4 h-4" />
                    <span>历史记录中的图片已过期？点击幻灯片上的“重试”或“修改”按钮重新生成。</span>
                  </div>
                )}

                {slides.map((slide, idx) => (
                  <div key={slide.id} id={slide.id} className="group relative pl-0 md:pl-8">
                    <div className="absolute left-0 top-6 text-sm font-bold text-brand-300 font-mono select-none hidden xl:block">
                      {(idx + 1).toString().padStart(2, '0')}
                    </div>

                    <div onClick={() => { if (slide.imageUrl) setViewingImageSlideId(slide.id); }}>
                      <SlidePreview
                        slide={slide}
                        isActive={activeSlideId === slide.id}
                        onRegenerateImage={(id) => handleRegenerateSlideImage(id)}
                        onEditSlide={(id) => setEditDialogSlideId(id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditDialog
        isOpen={!!editDialogSlideId}
        title={currentSlideForEdit?.title || '幻灯片'}
        onClose={() => setEditDialogSlideId(null)}
        onSubmit={(instruction) => {
          if (editDialogSlideId) handleRegenerateSlideImage(editDialogSlideId, instruction);
        }}
      />

      {/* Lightbox */}
      {
        viewingImageSlideId && (
          <ImageLightbox
            imageUrl={currentImageForLightbox || null}
            onClose={() => setViewingImageSlideId(null)}
          />
        )
      }

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChanged={setSettings}
      />

    </div >
  );
};

// Wrap App with ErrorBoundary
const App = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;
