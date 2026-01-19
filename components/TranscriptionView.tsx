
import React, { useEffect, useRef, useState } from 'react';
import { TranscriptionEntry } from '../types.ts';
import { speakText } from '../services/ttsService.ts';

interface TranscriptionViewProps {
  entries: TranscriptionEntry[];
  showText?: boolean;
  voice?: string;
}

const TranscriptionView: React.FC<TranscriptionViewProps> = ({ entries, showText = true, voice = 'Zephyr' }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const handlePlay = async (entry: TranscriptionEntry) => {
    setPlayingId(entry.id);
    await speakText(entry.text, voice);
    setPlayingId(null);
  };

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#8BA888] p-10 animate-pulse">
        <p className="text-sm font-bold tracking-widest opacity-40">暂无通话记录</p>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef} 
      className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth"
    >
      {entries.map((entry) => (
        <div 
          key={entry.id} 
          className={`flex flex-col ${entry.role === 'user' ? 'items-end' : 'items-start'} transition-all duration-500 animate-in fade-in slide-in-from-bottom-2`}
        >
          {/* 元数据标签：现在更精简且靠近气泡 */}
          <div className={`flex items-center gap-2 mb-1 px-1 text-[9px] font-bold text-[#8BA888] uppercase tracking-tighter ${entry.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <span>{entry.role === 'user' ? 'YOU' : 'GENIE'}</span>
            <span className="opacity-50">·</span>
            <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className={`flex items-start gap-2 group max-w-[85%] ${entry.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* 播放按钮 */}
            {entry.role === 'model' && (
              <button 
                onClick={() => handlePlay(entry)}
                className={`mt-2 p-2 rounded-full transition-all shrink-0 ${playingId === entry.id ? 'bg-[#6B8E6B] text-white animate-pulse' : 'bg-[#E8E2D6] text-[#4A5D4A] hover:bg-[#6B8E6B] hover:text-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            {/* 气泡内容：横向宽度增加，内边距优化 */}
            <div className={`rounded-[1.2rem] px-4 py-3 shadow-sm text-sm leading-relaxed ${
              entry.role === 'user' 
                ? 'bg-[#6B8E6B] text-white rounded-tr-none' 
                : 'bg-white text-[#4A5D4A] border border-[#E8E2D6] rounded-tl-none'
            }`}>
              {showText ? (
                <p className="whitespace-pre-wrap font-medium tracking-wide">
                  {entry.text}
                </p>
              ) : (
                <span className="text-[10px] opacity-40 italic">点击播放听力...</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TranscriptionView;
