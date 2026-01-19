
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppStatus, TranscriptionEntry, TutorConfig, MainMode, TopicResource } from './types.ts';
import Header from './components/Header.tsx';
import ControlPanel from './components/ControlPanel.tsx';
import TranscriptionView from './components/TranscriptionView.tsx';
import Visualizer from './components/Visualizer.tsx';
import CameraOverlay from './components/CameraOverlay.tsx';
import DictionarySection from './components/DictionarySection.tsx';
import HistorySection from './components/HistorySection.tsx';
import TopicHelper from './components/TopicHelper.tsx';
import { startLiveSession, stopLiveSession, sendImageFrame } from './services/geminiLiveService.ts';
import { generateLiveSuggestions } from './services/suggestionService.ts';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<MainMode>(MainMode.PRACTICE);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [liveSuggestions, setLiveSuggestions] = useState<TopicResource[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

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

  const statusRef = useRef<AppStatus>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // 实时建议生成逻辑
  useEffect(() => {
    if (status !== AppStatus.ACTIVE || transcriptions.length === 0) {
      if (status === AppStatus.IDLE) setLiveSuggestions([]);
      return;
    }

    const lastEntry = transcriptions[transcriptions.length - 1];
    if (lastEntry.role === 'model') {
      const timer = setTimeout(async () => {
        setIsGeneratingSuggestions(true);
        try {
          const suggestions = await generateLiveSuggestions(
            config.topic,
            config.difficulty,
            transcriptions
          );
          if (suggestions.length > 0) {
            setLiveSuggestions(suggestions);
          }
        } catch (e) {
          console.error("Failed to get suggestions", e);
        } finally {
          setIsGeneratingSuggestions(false);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [transcriptions, status, config.topic, config.difficulty]);

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

  const initiateSession = async (isRetry = false) => {
    try {
      setErrorMessage(null);
      setStatus(isRetry ? AppStatus.RECONNECTING : AppStatus.CONNECTING);
      
      const { inputContext, outputContext } = await startLiveSession({
        config,
        onTranscription: handleTranscription,
        onClose: (wasIntentional) => {
          if (!wasIntentional && statusRef.current === AppStatus.ACTIVE) {
            handleAutoRetry();
          } else if (statusRef.current !== AppStatus.RECONNECTING) {
            setStatus(AppStatus.IDLE);
          }
        },
        onError: (err) => {
          setErrorMessage(err);
          // 如果是明确的权限错误，不自动重试
          if (!err.includes("权限") && !err.includes("403")) handleAutoRetry();
          else setStatus(AppStatus.ERROR);
        }
      });
      
      audioContextRef.current = { input: inputContext, output: outputContext };
      setStatus(AppStatus.ACTIVE);
      setRetryCount(0);
    } catch (error: any) {
      const msg = error.message || "无法建立连接，请检查移动网络配置。";
      setErrorMessage(msg);
      if (!isRetry) setStatus(AppStatus.ERROR);
    }
  };

  const handleAutoRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setTimeout(() => initiateSession(true), 2500); // 增加间隔以等待网络波动
    } else {
      setStatus(AppStatus.ERROR);
    }
  };

  const handleStart = () => {
    setTranscriptions([]);
    setLiveSuggestions([]);
    setRetryCount(0);
    initiateSession();
  };

  const handleStop = () => {
    setStatus(AppStatus.IDLE);
    setErrorMessage(null);
    setLiveSuggestions([]);
    stopLiveSession();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F7F2] overflow-x-hidden">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-4 max-w-4xl flex flex-col gap-5 overflow-hidden">
        <div className="flex bg-white/60 p-1.5 rounded-2xl border border-[#E8E2D6] self-center w-full max-w-sm shadow-sm shrink-0">
           {(Object.values(MainMode)).map(mode => (
             <button 
               key={mode}
               onClick={() => setActiveMode(mode as MainMode)}
               className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeMode === mode ? 'bg-[#6B8E6B] text-white shadow-md' : 'text-[#8BA888]'}`}
             >
               {mode === MainMode.PRACTICE ? '口语练习' : mode === MainMode.DICTIONARY ? '字典查询' : '复盘笔记'}
             </button>
           ))}
        </div>

        {activeMode === MainMode.PRACTICE ? (
          <>
            <div className={`bg-[#FFFFFF]/80 backdrop-blur-sm rounded-[2.5rem] shadow-sm border p-8 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-700 shrink-0 ${status === AppStatus.ERROR ? 'border-red-200 shadow-red-50' : 'border-[#E8E2D6]'}`}>
              <Visualizer status={status} audioContext={audioContextRef.current.input} />
              
              <div className="text-center mt-6 z-10">
                <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold border uppercase tracking-tight ${status === AppStatus.RECONNECTING ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-[#6B8E6B]/10 text-[#6B8E6B] border-[#6B8E6B]/20'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${status === AppStatus.RECONNECTING ? 'bg-orange-500' : 'bg-[#6B8E6B]'}`}></div>
                    {status === AppStatus.RECONNECTING ? `尝试重连 (${retryCount}/${MAX_RETRIES})` : '全球免梯直连模式'}
                  </span>
                </div>
                <h2 className={`text-xl font-bold transition-colors ${status === AppStatus.ERROR ? 'text-red-500' : 'text-[#4A5D4A]'}`}>
                  {status === AppStatus.IDLE && "准备好开口了吗？"}
                  {status === AppStatus.CONNECTING && "正在建立安全隧道..."}
                  {status === AppStatus.RECONNECTING && "正在修复连接..."}
                  {status === AppStatus.ACTIVE && "精灵正在聆听..."}
                  {status === AppStatus.ERROR && "连接建立失败"}
                </h2>
                <div className="mt-3 px-4 max-w-xs mx-auto">
                   <p className={`text-[11px] font-medium leading-relaxed transition-all ${status === AppStatus.ERROR ? 'text-red-500 bg-red-50 p-3 rounded-2xl border border-red-100 shadow-sm' : 'text-[#8BA888]'}`}>
                    {errorMessage ? `诊断反馈: ${errorMessage}` : (status === AppStatus.IDLE ? "点击下方按钮开启对话，Genie 会根据您选择的话题进行引导。" : "Genie 正在通过云端节点进行握手，请保持网络稳定。")}
                  </p>
                </div>
              </div>

              {status === AppStatus.ACTIVE && (
                <button 
                  onClick={() => setIsCameraOpen(true)}
                  className="mt-8 z-20 w-16 h-16 bg-[#6B8E6B] text-white rounded-3xl flex items-center justify-center shadow-xl shadow-[#6B8E6B]/30 active:scale-90 transition-all duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                </button>
              )}
            </div>

            <TopicHelper 
              topic={config.topic} 
              voice={config.voice}
              disabled={status === AppStatus.IDLE || status === AppStatus.ERROR}
              dynamicSuggestions={liveSuggestions}
              isGenerating={isGeneratingSuggestions}
            />

            <div className="flex-1 flex flex-col min-h-0 bg-white/40 rounded-[2rem] border border-[#E8E2D6] overflow-hidden shadow-sm">
              <TranscriptionView entries={transcriptions} showText={config.showTranscription} voice={config.voice} />
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
        <CameraOverlay onCapture={(b64) => sendImageFrame(b64)} onClose={() => setIsCameraOpen(false)} />
      )}
    </div>
  );
};

export default App;
