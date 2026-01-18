
import React, { useEffect, useRef } from 'react';
import { TranscriptionEntry } from '../types';

interface TranscriptionViewProps {
  entries: TranscriptionEntry[];
}

const TranscriptionView: React.FC<TranscriptionViewProps> = ({ entries }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

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
          <div className={`max-w-[90%] rounded-[1.5rem] px-5 py-4 shadow-sm text-sm leading-relaxed ${
            entry.role === 'user' 
              ? 'bg-[#6B8E6B] text-white rounded-tr-none' 
              : 'bg-white text-[#4A5D4A] border border-[#E8E2D6] rounded-tl-none'
          }`}>
            <p className="whitespace-pre-wrap font-medium">{entry.text}</p>
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
