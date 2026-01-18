
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppStatus, TranscriptionEntry, TutorConfig, MainMode } from './types';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import TranscriptionView from './components/TranscriptionView';
import Visualizer from './components/Visualizer';
import CameraOverlay from './components/CameraOverlay';
import DictionarySection from './components/DictionarySection';
import HistorySection from './components/HistorySection';
import { startLiveSession, stopLiveSession, sendImageFrame } from './services/geminiLiveService';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<MainMode>(MainMode.PRACTICE);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [config, setConfig] = useState<TutorConfig>({
    topic: "日常对话",
    difficulty: "入门",
    voice: "Zephyr",
    isTranslationMode: true,
    isCorrectionMode: true,
    showTranscription: true
  });
  
  const audioContextRef = useRef<{
    input: AudioContext | null;
    output: AudioContext | null;
  }>({ input: null, output: null });

  // 手机端手势交互优化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        audioContextRef.current.input?.resume();
        audioContextRef.current.output?.resume();
      }
    };
    
    // 防止手机浏览器回弹效果干扰练习
    document.body.style.overscrollBehavior = 'none';

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
      alert("连接失败。请确保您使用的是 HTTPS 链接，且手机网络稳定。");
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
    <div className="min-h-screen flex flex-col bg-[#F9F7F2] overflow-x-hidden">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-4 max-w-4xl flex flex-col gap-5 overflow-hidden">
        {/* 移动端优化导航 */}
        <div className="flex bg-white/60 p-1.5 rounded-2xl border border-[#E8E2D6] self-center w-full max-w-sm shadow-sm">
           <button 
            onClick={() => setActiveMode(MainMode.PRACTICE)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeMode === MainMode.PRACTICE ? 'bg-[#6B8E6B] text-white shadow-md' : 'text-[#8BA888]'}`}
           >
             口语练习
           </button>
           <button 
            onClick={() => setActiveMode(MainMode.DICTIONARY)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeMode === MainMode.DICTIONARY ? 'bg-[#6B8E6B] text-white shadow-md' : 'text-[#8BA888]'}`}
           >
             字典查询
           </button>
           <button 
            onClick={() => setActiveMode(MainMode.HISTORY)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeMode === MainMode.HISTORY ? 'bg-[#6B8E6B] text-white shadow-md' : 'text-[#8BA888]'}`}
           >
             复盘笔记
           </button>
        </div>

        {activeMode === MainMode.PRACTICE ? (
          <>
            {/* 核心可视化区域 */}
            <div className="bg-[#FFFFFF]/80 backdrop-blur-sm rounded-[2.5rem] shadow-sm border border-[#E8E2D6] p-8 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-700">
              <div className="absolute top-0 left-0 w-60 h-60 bg-[#6B8E6B]/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
              
              <Visualizer 
                status={status} 
                audioContext={audioContextRef.current.input} 
              />
              
              <div className="text-center mt-6 z-10">
                <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-[#6B8E6B]/10 rounded-full text-[9px] font-bold text-[#6B8E6B] border border-[#6B8E6B]/20 uppercase tracking-tight">
                    <div className="w-1.5 h-1.5 bg-[#6B8E6B] rounded-full animate-pulse"></div>
                    人声增强模式
                  </span>
                  <span className="px-3 py-1 bg-[#8BA888]/10 rounded-full text-[9px] font-bold text-[#8BA888] border border-[#8BA888]/20 uppercase tracking-tight">
                    全量代理加密
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#4A5D4A]">
                  {status === AppStatus.IDLE && "准备好开口了吗？"}
                  {status === AppStatus.CONNECTING && "正在接入免梯节点..."}
                  {status === AppStatus.ACTIVE && "精灵正在聆听..."}
                  {status === AppStatus.ERROR && "连接暂时中断"}
                </h2>
                <p className="text-[#8BA888] mt-2 text-xs font-medium px-4">
                  {status === AppStatus.IDLE && "我们的代理已为您打通网络，直接对话即可。"}
                  {status === AppStatus.ACTIVE && (config.showTranscription ? "文字流同步中..." : "纯听力挑战模式：专注于声音")}
                </p>
              </div>

              {status === AppStatus.ACTIVE && (
                <button 
                  onClick={() => setIsCameraOpen(true)}
                  className="mt-8 z-20 w-16 h-16 bg-[#6B8E6B] text-white rounded-3xl flex items-center justify-center shadow-xl shadow-[#6B8E6B]/30 active:scale-90 transition-all duration-300"
                  aria-label="拍照教学"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                </button>
              )}
            </div>

            {/* 记录区域 */}
            <div className="flex-1 flex flex-col min-h-0 bg-white/40 rounded-[2rem] border border-[#E8E2D6] overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#E8E2D6] bg-white/50 flex items-center justify-between">
                <h3 className="font-bold text-[#4A5D4A] flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 bg-[#6B8E6B] rounded-full"></span>
                  即时反馈
                </h3>
                <div className="flex items-center gap-1.5">
                  {!config.showTranscription && <span className="text-[9px] font-bold px-2 py-0.5 bg-[#6B8E6B]/10 text-[#6B8E6B] rounded-full">听力挑战</span>}
                  <span className="text-[9px] font-bold text-[#8BA888] uppercase tracking-widest border border-[#E8E2D6] px-2 py-0.5 rounded-full">Proxy Native</span>
                </div>
              </div>
              <TranscriptionView 
                entries={transcriptions} 
                showText={config.showTranscription}
                voice={config.voice}
              />
            </div>
          </>
        ) : activeMode === MainMode.DICTIONARY ? (
          <DictionarySection />
        ) : (
          <HistorySection />
        )}
      </main>

      {activeMode === MainMode.PRACTICE && (
        <ControlPanel 
          status={status}
          config={config}
          setConfig={setConfig}
          onStart={handleStart}
          onStop={handleStop}
          transcriptions={transcriptions}
        />
      )}

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
