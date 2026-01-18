
import React, { useEffect, useRef, useState } from 'react';
import { TranscriptionEntry } from '../types';
import { speakText } from '../services/ttsService';

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
        <div className="w-20 h-20 bg-[#6B8E6B]/5 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 opacity-30">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
        </div>
        <p className="text-sm font-bold tracking-widest opacity-40">暂无通话记录</p>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef} 
      className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
    >
      {entries.map((entry) => (
        <div 
          key={entry.id} 
          className={`flex flex-col ${entry.role === 'user' ? 'items-end' : 'items-start'} transition-all duration-500 animate-in fade-in slide-in-from-bottom-2`}
        >
          <div className="flex items-center gap-2 group max-w-[90%]">
            {entry.role === 'model' && (
              <button 
                onClick={() => handlePlay(entry)}
                className={`p-2 rounded-full transition-all ${playingId === entry.id ? 'bg-[#6B8E6B] text-white animate-pulse' : 'bg-[#E8E2D6] text-[#4A5D4A] hover:bg-[#6B8E6B] hover:text-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            <div className={`rounded-[1.5rem] px-5 py-4 shadow-sm text-sm leading-relaxed ${
              entry.role === 'user' 
                ? 'bg-[#6B8E6B] text-white rounded-tr-none' 
                : 'bg-white text-[#4A5D4A] border border-[#E8E2D6] rounded-tl-none'
            }`}>
              {showText ? (
                <p className="whitespace-pre-wrap font-medium">{entry.text}</p>
              ) : (
                <div className="flex gap-1 py-1">
                  {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 bg-current opacity-20 rounded-full animate-bounce" style={{animationDelay: `${i*0.2}s`}}></div>)}
                  <span className="ml-2 text-[10px] opacity-40">点击左侧播放听力</span>
                </div>
              )}
            </div>

            {entry.role === 'user' && (
              <button 
                onClick={() => handlePlay(entry)}
                className={`p-2 rounded-full transition-all ${playingId === entry.id ? 'bg-white text-[#6B8E6B] animate-pulse' : 'bg-white/20 text-white hover:bg-white hover:text-[#6B8E6B]'}`}
              >
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          <span className="text-[9px] font-bold text-[#8BA888] mt-2 px-1 uppercase tracking-tighter">
            {entry.role === 'user' ? 'YOU' : 'GENIE'} · {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
};

export default TranscriptionView;
