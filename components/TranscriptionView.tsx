
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
                <span className="ml-2 text-[10px] opacity-40">点击左侧播放听力</span>
              )}
            </div>
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
