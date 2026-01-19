
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import Visualizer from './components/Visualizer';
import TranscriptionView from './components/TranscriptionView';
import TopicHelper from './components/TopicHelper';
import CameraOverlay from './components/CameraOverlay';
import DictionarySection from './components/DictionarySection';
import HistorySection from './components/HistorySection';
import { AppStatus, MainMode, TranscriptionEntry, TutorConfig, SessionHistory } from './types';
import { startLiveSession, stopLiveSession, sendImageFrame } from './services/geminiLiveService';
import { generateLiveSuggestions } from './services/suggestionService';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [mainMode, setMainMode] = useState<MainMode>(MainMode.PRACTICE);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioContexts, setAudioContexts] = useState<{
    inputContext: AudioContext | null;
    outputContext: AudioContext | null;
  }>({ inputContext: null, outputContext: null });
  
  const [config, setConfig] = useState<TutorConfig>({
    topic: '日常对话',
    difficulty: '入门',
    voice: 'Zephyr',
    personality: '幽默达人',
    isTranslationMode: true,
    isCorrectionMode: true,
    showTranscription: true
  });

  const [dynamicSuggestions, setDynamicSuggestions] = useState<any[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const transcriptionsRef = useRef(transcriptions);
  const lastSuggestionRef = useRef<number>(0);
  const reconnectCountRef = useRef(0);

  useEffect(() => { transcriptionsRef.current = transcriptions; }, [transcriptions]);

  const handleTranscription = useCallback((role: 'user' | 'model', text: string) => {
    setTranscriptions(prev => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.role === role && (Date.now() - last.timestamp < 3000)) {
          const updated = [...prev];
          updated[prev.length - 1] = {
            ...last,
            text: last.text + text,
            timestamp: Date.now()
          };
          return updated;
        }
      }
      return [...prev, {
        id: Math.random().toString(36).substring(7),
        role,
        text,
        timestamp: Date.now()
      }];
    });
  }, []);

  const handleStart = async () => {
    setStatus(AppStatus.CONNECTING);
    setError(null);
    setTranscriptions([]);
    setDynamicSuggestions([]);
    setSuggestionError(null);
    
    try {
      const contexts = await startLiveSession({
        config,
        onTranscription: handleTranscription,
        onClose: () => {
          if (reconnectCountRef.current < 3) {
             setStatus(AppStatus.RECONNECTING);
             setTimeout(handleStart, Math.pow(2, reconnectCountRef.current) * 1000);
             reconnectCountRef.current++;
          } else {
             setStatus(AppStatus.IDLE);
             reconnectCountRef.current = 0;
          }
        },
        onError: (msg: string) => {
          setError(msg);
          setStatus(AppStatus.ERROR);
        }
      });
      setAudioContexts(contexts);
      setStatus(AppStatus.ACTIVE);
      reconnectCountRef.current = 0;
    } catch (err: any) {
      setError(err.message || "连接失败");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleStop = () => {
    reconnectCountRef.current = 0;
    stopLiveSession();
    setStatus(AppStatus.IDLE);
  };

  const handleCapture = (base64: string) => {
    sendImageFrame(base64);
    setIsCameraOpen(false);
  };

  // 触发建议生成
  const triggerSuggestions = async () => {
    if (isGeneratingSuggestions) return;
    
    const currentLast = transcriptionsRef.current[transcriptionsRef.current.length - 1];
    if (!currentLast || currentLast.role !== 'model') return;

    setIsGeneratingSuggestions(true);
    setSuggestionError(null);
    lastSuggestionRef.current = Date.now();
    
    try {
      const suggestions = await generateLiveSuggestions(
        config.topic, 
        config.difficulty, 
        config.personality, 
        transcriptionsRef.current
      );
      if (suggestions && suggestions.length > 0) {
        setDynamicSuggestions(suggestions);
      }
    } catch (e: any) {
      if (e.message === "QUOTA_LIMIT") {
        setSuggestionError("API 配额超限，建议功能暂不可用");
      }
      console.error("Suggestions update error:", e);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  useEffect(() => {
    if (status === AppStatus.ACTIVE && transcriptions.length > 0) {
      const lastEntry = transcriptions[transcriptions.length - 1];
      if (lastEntry.role === 'model') {
        const timer = setTimeout(() => {
          const now = Date.now();
          if (now - lastSuggestionRef.current < 5000) return;
          triggerSuggestions();
        }, 800); 
        return () => clearTimeout(timer);
      }
    }
  }, [transcriptions, status, config.topic, config.difficulty, config.personality]);

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#4A5D4A] flex flex-col font-sans selection:bg-[#6B8E6B]/20 overflow-x-hidden">
      <Header />
      
      <nav className="max-w-6xl mx-auto w-full px-4 md:px-6 mt-6 flex gap-4 overflow-x-auto no-scrollbar">
        {(['PRACTICE', 'DICTIONARY', 'HISTORY'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMainMode(MainMode[m])}
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              mainMode === MainMode[m]
                ? 'bg-[#6B8E6B] text-white shadow-md'
                : 'bg-white text-[#8BA888] border border-[#E8E2D6] hover:text-[#4A5D4A]'
            }`}
          >
            {m === 'PRACTICE' ? '口语练习' : m === 'DICTIONARY' ? '智能词典' : '复盘笔记'}
          </button>
        ))}
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 pb-24 flex flex-col gap-6 overflow-hidden mt-6">
        {mainMode === MainMode.PRACTICE && (
          <>
            <div className="flex-1 flex flex-col md:flex-row gap-6 h-full min-h-0">
              <div className="flex-1 flex flex-col bg-white/40 rounded-[2.5rem] border border-[#E8E2D6] overflow-hidden shadow-sm backdrop-blur-sm relative">
                <div className="h-40 shrink-0 flex items-center justify-center border-b border-[#E8E2D6]/50 bg-gradient-to-b from-white/20 to-transparent relative">
                  <Visualizer status={status} audioContext={audioContexts.outputContext} />
                  {status === AppStatus.ACTIVE && (
                    <button onClick={() => setIsCameraOpen(true)} className="absolute top-4 right-4 p-3 bg-white/80 hover:bg-white rounded-full text-[#6B8E6B] shadow-sm border border-[#E8E2D6]">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                    </button>
                  )}
                  {status === AppStatus.ERROR && error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 backdrop-blur-md px-6 text-center z-10">
                      <div className="flex flex-col items-center">
                        <span className="text-red-600 font-bold mb-1">通话中断</span>
                        <p className="text-red-500 text-[10px] leading-relaxed max-w-[200px] mb-3">{error}</p>
                        <button onClick={handleStart} className="px-4 py-1.5 bg-red-500 text-white rounded-full text-[10px] font-bold">重新连接</button>
                      </div>
                    </div>
                  )}
                  {status === AppStatus.RECONNECTING && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#F9F7F2]/80 backdrop-blur-md z-10">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 border-2 border-[#6B8E6B]/20 border-t-[#6B8E6B] rounded-full animate-spin mb-2"></div>
                        <span className="text-[#6B8E6B] text-[10px] font-bold">正在自动重连...</span>
                      </div>
                    </div>
                  )}
                </div>
                <TranscriptionView entries={transcriptions} showText={config.showTranscription} voice={config.voice} />
              </div>
              <div className="w-full md:w-80 flex flex-col gap-4">
                <TopicHelper 
                  topic={config.topic} voice={config.voice} disabled={status === AppStatus.IDLE}
                  dynamicSuggestions={dynamicSuggestions} isGenerating={isGeneratingSuggestions}
                  error={suggestionError}
                  onManualRefresh={triggerSuggestions}
                />
              </div>
            </div>
            <ControlPanel status={status} config={config} setConfig={setConfig} onStart={handleStart} onStop={handleStop} />
          </>
        )}
        {mainMode === MainMode.DICTIONARY && <DictionarySection />}
        {mainMode === MainMode.HISTORY && <HistorySection />}
      </main>
      {isCameraOpen && <CameraOverlay onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
    </div>
  );
};

export default App;
