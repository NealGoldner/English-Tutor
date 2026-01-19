
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import Visualizer from './components/Visualizer';
import TranscriptionView from './components/TranscriptionView';
import TopicHelper from './components/TopicHelper';
import CameraOverlay from './components/CameraOverlay';
import { AppStatus, TranscriptionEntry, TutorConfig } from './types';
import { startLiveSession, stopLiveSession, sendImageFrame } from './services/geminiLiveService';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [diagMsg, setDiagMsg] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [audioContexts, setAudioContexts] = useState<{
    outputContext: AudioContext | null;
  }>({ outputContext: null });
  
  const [config, setConfig] = useState<TutorConfig>({
    topic: '日常对话',
    difficulty: '入门',
    voice: 'Zephyr',
    personality: '幽默达人',
    isTranslationMode: true,
    showTranscription: true
  });

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
    setDiagMsg("正在建立 WebSocket 安全通道...");
    
    try {
      const contexts = await startLiveSession({
        config,
        onTranscription: handleTranscription,
        onClose: () => {
          setStatus(AppStatus.IDLE);
          setDiagMsg("会话已结束");
        },
        onError: (msg: string, detail?: string) => {
          setError(msg);
          setDiagMsg(detail || null);
          setStatus(AppStatus.ERROR);
        }
      });
      setAudioContexts(contexts);
      setStatus(AppStatus.ACTIVE);
      setDiagMsg("连接成功：Gemini 2.5 Flash Native Audio");
    } catch (err: any) {
      setError("无法连接到练习室");
      setDiagMsg(err.message);
      setStatus(AppStatus.ERROR);
    }
  };

  const handleStop = () => {
    stopLiveSession();
    setStatus(AppStatus.IDLE);
    setDiagMsg("已手动断开连接");
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#4A5D4A] flex flex-col font-sans selection:bg-[#6B8E6B]/20 overflow-hidden">
      <Header />
      
      {/* 诊断条：仅在非 IDLE 状态下显示关键连接反馈 */}
      {(status !== AppStatus.IDLE || diagMsg) && (
        <div className={`text-[10px] py-1 px-4 text-center font-bold uppercase tracking-widest transition-colors ${
          status === AppStatus.ERROR ? 'bg-red-500 text-white' : 'bg-[#E8E2D6] text-[#8BA888]'
        }`}>
          {status === AppStatus.ERROR ? `❌ ERROR: ${error}` : `📡 STATUS: ${diagMsg}`}
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 flex flex-col gap-6 mt-6 overflow-hidden">
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          
          {/* 左侧：核心对话区 */}
          <div className="flex-1 flex flex-col bg-white/70 rounded-[2.5rem] border border-[#E8E2D6] overflow-hidden shadow-sm relative">
            <div className="h-40 shrink-0 flex items-center justify-center border-b border-[#E8E2D6]/40 bg-[#FDFBF7]/50 relative">
              <Visualizer status={status} audioContext={audioContexts.outputContext} />
              
              {status === AppStatus.ACTIVE && (
                <button 
                  onClick={() => setIsCameraOpen(true)}
                  className="absolute top-4 right-4 p-3 bg-white hover:bg-[#F9F7F2] rounded-2xl text-[#6B8E6B] shadow-sm border border-[#E8E2D6] transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                </button>
              )}

              {status === AppStatus.ERROR && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
                   <p className="text-red-500 text-xs font-bold mb-4">{diagMsg || "未知错误，请检查网络设置"}</p>
                   <button onClick={handleStart} className="px-6 py-2 bg-[#6B8E6B] text-white rounded-full text-xs font-bold shadow-md hover:scale-105 transition-transform">立即尝试重连</button>
                </div>
              )}
            </div>

            <TranscriptionView 
              entries={transcriptions} 
              showText={config.showTranscription} 
              voice={config.voice} 
            />
          </div>

          {/* 右侧：话题建议 */}
          <div className="w-full md:w-72 flex flex-col">
            <TopicHelper 
              topic={config.topic} 
              voice={config.voice} 
              disabled={status !== AppStatus.ACTIVE}
              dynamicSuggestions={[]} // 这里可以后续按需开启
            />
          </div>
        </div>

        <ControlPanel 
          status={status} 
          config={config} 
          setConfig={setConfig} 
          onStart={handleStart} 
          onStop={handleStop} 
        />
      </main>

      {isCameraOpen && (
        <CameraOverlay 
          onCapture={(b) => { sendImageFrame(b); setIsCameraOpen(false); }} 
          onClose={() => setIsCameraOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
