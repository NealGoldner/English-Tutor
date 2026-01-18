
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppStatus, TranscriptionEntry, TutorConfig } from './types';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import TranscriptionView from './components/TranscriptionView';
import Visualizer from './components/Visualizer';
import CameraOverlay from './components/CameraOverlay';
import { startLiveSession, stopLiveSession, sendImageFrame } from './services/geminiLiveService';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [config, setConfig] = useState<TutorConfig>({
    topic: "日常对话",
    difficulty: "入门",
    voice: "Zephyr",
    isTranslationMode: true,
    isCorrectionMode: true
  });
  
  const audioContextRef = useRef<{
    input: AudioContext | null;
    output: AudioContext | null;
  }>({ input: null, output: null });

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        audioContextRef.current.input?.resume();
        audioContextRef.current.output?.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleTranscription = useCallback((role: 'user' | 'model', text: string) => {
    setTranscriptions(prev => {
      const lastEntry = prev[prev.length - 1];
      if (lastEntry && lastEntry.role === role) {
        return [...prev.slice(0, -1), { ...lastEntry, text: lastEntry.text + text }];
      }
      return [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        role,
        text,
        timestamp: Date.now()
      }];
    });
  }, []);

  const handleStart = async () => {
    try {
      setStatus(AppStatus.CONNECTING);
      setTranscriptions([]);
      const { inputContext, outputContext } = await startLiveSession({
        config,
        onTranscription: handleTranscription,
        onClose: () => setStatus(AppStatus.IDLE),
        onError: (err) => {
          console.error(err);
          setStatus(AppStatus.ERROR);
        }
      });
      audioContextRef.current = { input: inputContext, output: outputContext };
      setStatus(AppStatus.ACTIVE);
    } catch (error) {
      console.error("Failed to start session:", error);
      setStatus(AppStatus.ERROR);
    }
  };

  const handleStop = () => {
    stopLiveSession();
    setStatus(AppStatus.IDLE);
  };

  const handleCameraCapture = (base64: string) => {
    sendImageFrame(base64);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F7F2]">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl flex flex-col gap-6">
        {/* 核心可视化区域 */}
        <div className="bg-[#FFFFFF]/60 backdrop-blur-sm rounded-[2.5rem] shadow-sm border border-[#E8E2D6] p-10 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-700">
          <div className="absolute top-0 left-0 w-80 h-80 bg-[#6B8E6B]/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#D1C9BC]/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl"></div>
          
          <Visualizer 
            status={status} 
            audioContext={audioContextRef.current.input} 
          />
          
          <div className="text-center mt-8 z-10">
            <h2 className="text-2xl font-bold text-[#4A5D4A]">
              {status === AppStatus.IDLE && "欢迎回来，我的学生"}
              {status === AppStatus.CONNECTING && "正在为您准备课堂..."}
              {status === AppStatus.ACTIVE && "我在聆听，请大胆表达"}
              {status === AppStatus.ERROR && "信号出了点小问题"}
            </h2>
            <p className="text-[#8BA888] mt-2 text-sm font-medium">
              {status === AppStatus.IDLE && "今天的英语练习，我们从哪里开始？"}
              {status === AppStatus.ACTIVE && "您可以随时点击绿色相机，教我认识新事物。"}
            </p>
          </div>

          {status === AppStatus.ACTIVE && (
            <button 
              onClick={() => setIsCameraOpen(true)}
              className="mt-10 z-20 w-16 h-16 bg-[#6B8E6B] text-white rounded-2xl flex items-center justify-center shadow-xl shadow-[#6B8E6B]/30 hover:scale-110 active:scale-90 transition-all duration-300"
              aria-label="拍照教学"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
            </button>
          )}
        </div>

        {/* 记录区域 */}
        <div className="flex-1 flex flex-col min-h-0 bg-white/40 rounded-[2rem] border border-[#E8E2D6] overflow-hidden">
          <div className="p-4 border-b border-[#E8E2D6] bg-white/30 flex items-center justify-between">
            <h3 className="font-bold text-[#4A5D4A] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#6B8E6B] rounded-full"></span>
              练习记录
            </h3>
            <div className="flex items-center gap-2">
               {config.isCorrectionMode && <span className="text-[10px] font-bold px-2.5 py-1 bg-[#F9F1E7] text-[#C48B4D] rounded-full">精细纠错</span>}
               <span className="text-[10px] font-bold text-[#8BA888] uppercase tracking-widest">Live</span>
            </div>
          </div>
          <TranscriptionView entries={transcriptions} />
        </div>
      </main>

      <ControlPanel 
        status={status}
        config={config}
        setConfig={setConfig}
        onStart={handleStart}
        onStop={handleStop}
      />

      {isCameraOpen && (
        <CameraOverlay 
          onCapture={handleCameraCapture} 
          onClose={() => setIsCameraOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
