
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
      <div className="flex-1 flex flex-col items-center justify-center text-[#8BA888] p-10 opacity-40">
        <div className="w-12 h-12 mb-4">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
           </svg>
        </div>
        <p className="text-xs font-bold tracking-widest uppercase">准备好开始对话了吗？</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 scroll-smooth no-scrollbar">
      {entries.map((entry, index) => {
        const isPrevSameRole = index > 0 && entries[index-1].role === entry.role;
        
        return (
          <div 
            key={entry.id} 
            className={`flex flex-col ${entry.role === 'user' ? 'items-end' : 'items-start'} transition-all animate-in fade-in duration-300`}
          >
            {/* 只有角色切换时才显示角色名称和时间 */}
            {!isPrevSameRole && (
              <div className={`flex items-center gap-2 mb-1 px-1 text-[9px] font-black text-[#8BA888] uppercase tracking-tighter ${entry.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <span>{entry.role === 'user' ? 'YOU' : 'GENIE'}</span>
                <span className="opacity-30">·</span>
                <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}

            <div className={`flex items-start gap-2 group max-w-[90%] ${entry.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Genie 的消息显示播放按钮，如果是连续消息则缩小间距 */}
              {entry.role === 'model' && (
                <div className="w-6 shrink-0 flex justify-center">
                  {!isPrevSameRole && (
                    <button 
                      onClick={() => handlePlay(entry)}
                      className={`mt-1 p-1.5 rounded-full transition-all ${playingId === entry.id ? 'bg-[#6B8E6B] text-white animate-pulse' : 'bg-[#E8E2D6] text-[#4A5D4A] hover:bg-[#6B8E6B] hover:text-white'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              
              <div className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed ${
                entry.role === 'user' 
                  ? `bg-[#6B8E6B] text-white ${!isPrevSameRole ? 'rounded-tr-none' : ''}` 
                  : `bg-white text-[#4A5D4A] border border-[#E8E2D6] ${!isPrevSameRole ? 'rounded-tl-none' : ''}`
              }`}>
                {showText ? (
                  <p className="whitespace-pre-wrap font-medium">
                    {entry.text}
                  </p>
                ) : (
                  <span className="text-[10px] opacity-40 italic">点击播放听力...</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TranscriptionView;
