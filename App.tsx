
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Visualizer from './components/Visualizer';
import TranscriptionView from './components/TranscriptionView';
import ControlPanel from './components/ControlPanel';
import DictionarySection from './components/DictionarySection';
import HistorySection from './components/HistorySection';
import TopicHelper from './components/TopicHelper';
import CameraOverlay from './components/CameraOverlay';
import { 
  AppStatus, 
  MainMode, 
  TutorConfig, 
  TUTOR_TOPICS, 
  TranscriptionEntry, 
  SessionHistory,
  TopicResource
} from './types';
import { startLiveSession, stopLiveSession, sendImageFrame } from './services/geminiLiveService';
import { generateLiveSuggestions } from './services/suggestionService';

// Main application component for FluentGenie
const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [mainMode, setMainMode] = useState<MainMode>(MainMode.PRACTICE);
  const [config, setConfig] = useState<TutorConfig>({
    topic: TUTOR_TOPICS[0],
    difficulty: '入门',
    voice: 'Zephyr',
    personality: '幽默达人',
    isTranslationMode: true,
    isCorrectionMode: true,
    showTranscription: true
  });
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [audioContexts, setAudioContexts] = useState<{
    inputContext: AudioContext | null;
    outputContext: AudioContext | null;
  }>({ inputContext: null, outputContext: null });
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<TopicResource[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // Handle transcriptions from the service
  const onTranscription = useCallback((role: 'user' | 'model', text: string) => {
    setTranscriptions(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        return [...prev.slice(0, -1), { ...last, text: last.text + text }];
      }
      return [...prev, { id: Date.now().toString(), role, text, timestamp: Date.now() }];
    });
  }, []);

  // Generate suggestions when transcription updates
  useEffect(() => {
    if (status === AppStatus.ACTIVE && transcriptions.length > 0) {
      const lastEntry = transcriptions[transcriptions.length - 1];
      if (lastEntry.role === 'model') {
        const timer = setTimeout(async () => {
          setIsGeneratingSuggestions(true);
          const suggestions = await generateLiveSuggestions(config.topic, config.difficulty, transcriptions);
          setDynamicSuggestions(suggestions);
          setIsGeneratingSuggestions(false);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [transcriptions, status, config.topic, config.difficulty]);

  const handleStart = async () => {
    setStatus(AppStatus.CONNECTING);
    setError(null);
    try {
      const contexts = await startLiveSession({
        config,
        onTranscription,
        onClose: () => setStatus(AppStatus.IDLE),
        onError: (msg: string) => {
          setError(msg);
          setStatus(AppStatus.ERROR);
        }
      });
      setAudioContexts(contexts);
      setStatus(AppStatus.ACTIVE);
    } catch (err: any) {
      setError(err.message || "连接失败");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleStop = () => {
    stopLiveSession();
    setStatus(AppStatus.IDLE);
    setAudioContexts({ inputContext: null, outputContext: null });
  };

  const handleSaveHistory = () => {
    if (transcriptions.length === 0) return;
    const history: SessionHistory = {
      id: Date.now().toString(),
      title: `${config.topic} - ${new Date().toLocaleDateString()}`,
      date: new Date().toLocaleString(),
      topic: config.topic,
      entries: transcriptions
    };
    const saved = JSON.parse(localStorage.getItem('fluent_genie_history') || '[]');
    localStorage.setItem('fluent_genie_history', JSON.stringify([history, ...saved]));
    alert('会话已保存到历史笔记');
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#4A5D4A] flex flex-col font-sans selection:bg-[#6B8E6B]/20 overflow-x-hidden">
      <Header />
      
      {/* Navigation for different modes */}
      <nav className="max-w-6xl mx-auto w-full px-6 py-4 flex gap-4 sticky top-[73px] z-40 bg-[#F9F7F2]/60 backdrop-blur-sm">
        {(['PRACTICE', 'DICTIONARY', 'HISTORY'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setMainMode(MainMode[mode])}
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
              mainMode === MainMode[mode] 
                ? 'bg-[#6B8E6B] text-white shadow-md' 
                : 'bg-white text-[#8BA888] border border-[#E8E2D6] hover:border-[#6B8E6B] hover:text-[#6B8E6B]'
            }`}
          >
            {mode === 'PRACTICE' ? '口语实战' : mode === 'DICTIONARY' ? '万能词典' : '复盘笔记'}
          </button>
        ))}
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 pb-24 flex flex-col gap-6 overflow-hidden">
        {mainMode === MainMode.PRACTICE && (
          <div className="flex-1 flex flex-col md:flex-row gap-6 h-full min-h-0">
            {/* Main Visualizer and Chat View */}
            <div className="flex-1 flex flex-col bg-white/40 rounded-[2.5rem] border border-[#E8E2D6] overflow-hidden shadow-sm backdrop-blur-sm">
              <div className="h-48 shrink-0 flex items-center justify-center border-b border-[#E8E2D6]/50 bg-gradient-to-b from-white/20 to-transparent relative">
                <Visualizer status={status} audioContext={audioContexts.outputContext} />
                {status === AppStatus.ACTIVE && (
                  <button 
                    onClick={() => setIsCameraOpen(true)}
                    className="absolute top-4 right-4 p-3 bg-white/80 hover:bg-white rounded-full text-[#6B8E6B] shadow-sm border border-[#E8E2D6] transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                    </svg>
                  </button>
                )}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 backdrop-blur-md px-6 text-center">
                    <p className="text-red-500 text-xs font-bold leading-relaxed">{error}</p>
                  </div>
                )}
              </div>
              <TranscriptionView entries={transcriptions} showText={config.showTranscription} voice={config.voice} />
              
              {transcriptions.length > 0 && status === AppStatus.IDLE && (
                <div className="p-4 border-t border-[#E8E2D6] flex justify-center">
                  <button 
                    onClick={handleSaveHistory}
                    className="text-[10px] font-bold text-[#6B8E6B] hover:text-[#5A7A5A] flex items-center gap-2 uppercase tracking-widest px-6 py-2 rounded-full bg-white border border-[#E8E2D6] shadow-sm transition-all"
                  >
                    保存本次对话笔记
                  </button>
                </div>
              )}
            </div>

            {/* AI Suggestions and Helpers */}
            <div className="w-full md:w-80 flex flex-col gap-4">
              <TopicHelper 
                topic={config.topic} 
                voice={config.voice} 
                disabled={status === AppStatus.IDLE}
                dynamicSuggestions={dynamicSuggestions}
                isGenerating={isGeneratingSuggestions}
              />
            </div>
          </div>
        )}

        {mainMode === MainMode.DICTIONARY && <DictionarySection />}
        {mainMode === MainMode.HISTORY && <HistorySection />}
      </main>

      {mainMode === MainMode.PRACTICE && (
        <ControlPanel 
          status={status} 
          config={config} 
          setConfig={setConfig} 
          onStart={handleStart} 
          onStop={handleStop}
        />
      )}

      {isCameraOpen && (
        <CameraOverlay 
          onCapture={(b64) => { sendImageFrame(b64); setIsCameraOpen(false); }} 
          onClose={() => setIsCameraOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
