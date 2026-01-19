
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import Visualizer from './components/Visualizer';
import TranscriptionView from './components/TranscriptionView';
import TopicHelper from './components/TopicHelper';
import CameraOverlay from './components/CameraOverlay';
import { AppStatus, TranscriptionEntry, TutorConfig } from './types';
import { startLiveSession, stopLiveSession, sendImageFrame } from './services/geminiLiveService';
import { generateLiveSuggestions } from './services/suggestionService';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<string | null>(null);
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
    showTranscription: true
  });

  const [dynamicSuggestions, setDynamicSuggestions] = useState<any[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const transcriptionsRef = useRef(transcriptions);
  const lastSuggestionRef = useRef<number>(0);

  useEffect(() => { transcriptionsRef.current = transcriptions; }, [transcriptions]);

  const handleTranscription = useCallback((role: 'user' | 'model', text: string) => {
    setTranscriptions(prev => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.role === role && (Date.now() - last.timestamp < 3000)) {
          const updated = [...prev];
          updated[prev.length - 1] = { ...last, text: last.text + text, timestamp: Date.now() };
          return updated;
        }
      }
      return [...prev, { id: Math.random().toString(36).substring(7), role, text, timestamp: Date.now() }];
    });
  }, []);

  const handleStart = async () => {
    setStatus(AppStatus.CONNECTING);
    setError(null);
    setDetailedError(null);
    
    try {
      const contexts = await startLiveSession({
        config,
        onTranscription: handleTranscription,
        onClose: () => setStatus(AppStatus.IDLE),
        onError: (msg: string, detail?: string) => {
          setError(msg);
          setDetailedError(detail || null);
          setStatus(AppStatus.ERROR);
        }
      });
      setAudioContexts(contexts);
      setStatus(AppStatus.ACTIVE);
    } catch (err: any) {
      setError("系统初始化异常");
      setDetailedError(err.message);
      setStatus(AppStatus.ERROR);
    }
  };

  const handleStop = () => {
    stopLiveSession();
    setStatus(AppStatus.IDLE);
  };

  const triggerSuggestions = async () => {
    if (isGeneratingSuggestions || status !== AppStatus.ACTIVE) return;
    const now = Date.now();
    if (now - lastSuggestionRef.current < 5000) return;

    setIsGeneratingSuggestions(true);
    lastSuggestionRef.current = now;
    try {
      const suggestions = await generateLiveSuggestions(config.topic, config.difficulty, config.personality, transcriptionsRef.current);
      if (suggestions?.length) setDynamicSuggestions(suggestions);
    } catch (e) {} finally {
      setIsGeneratingSuggestions(false);
    }
  };

  useEffect(() => {
    if (autoSuggest && status === AppStatus.ACTIVE && transcriptions.length > 0) {
      const lastEntry = transcriptions[transcriptions.length - 1];
      if (lastEntry.role === 'model') {
        const timer = setTimeout(triggerSuggestions, 2000); 
        return () => clearTimeout(timer);
      }
    }
  }, [transcriptions, status, autoSuggest]);

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#4A5D4A] flex flex-col font-sans selection:bg-[#6B8E6B]/20">
      <Header />
      
      {detailedError && (
        <div className="bg-orange-500 text-white text-[10px] py-1 px-4 text-center font-bold tracking-wider">
          连接反馈: {detailedError}
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 flex flex-col gap-6 mt-8 overflow-hidden">
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          {/* 左侧：对话主屏 */}
          <div className="flex-1 flex flex-col bg-white/60 rounded-[3rem] border border-[#E8E2D6] overflow-hidden shadow-sm relative">
            <div className="h-44 shrink-0 flex items-center justify-center border-b border-[#E8E2D6]/50 bg-white/20 relative">
              <Visualizer status={status} audioContext={audioContexts.outputContext} />
              {status === AppStatus.ACTIVE && (
                <button onClick={() => setIsCameraOpen(true)} className="absolute top-6 right-6 p-3 bg-white hover:bg-white/90 rounded-2xl text-[#6B8E6B] shadow-sm border border-[#E8E2D6] transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                </button>
              )}
              {status === AppStatus.ERROR && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/95 backdrop-blur-md px-10 text-center animate-in fade-in">
                  <span className="text-red-600 font-bold mb-2 text-sm">呼叫未建立</span>
                  <p className="text-red-500 text-[11px] leading-relaxed mb-4">{error}</p>
                  <button onClick={handleStart} className="px-8 py-2 bg-red-600 text-white rounded-full text-xs font-bold shadow-lg shadow-red-200 hover:scale-105 transition-all">尝试重新拨号</button>
                </div>
              )}
            </div>
            <TranscriptionView entries={transcriptions} showText={config.showTranscription} voice={config.voice} />
          </div>

          {/* 右侧：助攻与建议 */}
          <div className="w-full md:w-80 flex flex-col gap-4">
            <TopicHelper 
              topic={config.topic} voice={config.voice} disabled={status === AppStatus.IDLE}
              dynamicSuggestions={dynamicSuggestions} isGenerating={isGeneratingSuggestions}
              autoSuggest={autoSuggest} onToggleAuto={() => setAutoSuggest(!autoSuggest)}
              onManualRefresh={triggerSuggestions}
            />
          </div>
        </div>
        
        <ControlPanel status={status} config={config} setConfig={setConfig} onStart={handleStart} onStop={handleStop} />
      </main>

      {isCameraOpen && <CameraOverlay onCapture={(b) => { sendImageFrame(b); setIsCameraOpen(false); }} onClose={() => setIsCameraOpen(false)} />}
    </div>
  );
};

export default App;
