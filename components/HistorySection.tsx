
import React, { useState, useEffect } from 'react';
import { SessionHistory } from '../types';
import { speakText } from '../services/ttsService';

const HistorySection: React.FC = () => {
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionHistory | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('fluent_genie_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const handleDelete = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('fluent_genie_history', JSON.stringify(newHistory));
    if (selectedSession?.id === id) setSelectedSession(null);
  };

  return (
    <div className="flex-1 flex gap-6 overflow-hidden animate-in fade-in duration-500">
      {/* 列表 */}
      <div className="w-1/3 bg-white/40 rounded-[2rem] border border-[#E8E2D6] overflow-y-auto p-4 flex flex-col gap-3">
        <h3 className="px-4 py-2 text-[10px] font-bold text-[#8BA888] uppercase tracking-widest">历史笔记</h3>
        {history.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[#8BA888] opacity-50 text-xs italic p-4 text-center">
            练习结束后点击“保存会话”即可在此复盘
          </div>
        ) : history.map(session => (
          <button
            key={session.id}
            onClick={() => setSelectedSession(session)}
            className={`p-4 rounded-2xl text-left transition-all border ${selectedSession?.id === session.id ? 'bg-white border-[#6B8E6B] shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
          >
            <p className="text-xs font-bold text-[#4A5D4A] mb-1">{session.title}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#8BA888]">{session.date}</span>
              <span className="text-[9px] px-2 py-0.5 bg-[#6B8E6B]/10 text-[#6B8E6B] rounded-full font-bold">{session.topic}</span>
            </div>
          </button>
        ))}
      </div>

      {/* 详情回放 */}
      <div className="flex-1 bg-white/60 rounded-[2rem] border border-[#E8E2D6] p-8 overflow-y-auto flex flex-col">
        {selectedSession ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#E8E2D6] pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-[#4A5D4A]">{selectedSession.title}</h2>
                <p className="text-xs text-[#8BA888]">{selectedSession.date} · {selectedSession.entries.length} 条记录</p>
              </div>
              <button 
                onClick={() => handleDelete(selectedSession.id)}
                className="text-xs text-red-400 font-bold hover:underline"
              >
                删除笔记
              </button>
            </div>
            {selectedSession.entries.map(entry => (
              <div key={entry.id} className={`flex gap-4 items-start ${entry.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <button 
                  onClick={() => speakText(entry.text)}
                  className="mt-1 p-2 bg-[#FDFBF7] rounded-full text-[#6B8E6B] hover:bg-[#6B8E6B] hover:text-white transition-colors border border-[#E8E2D6]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                    <path d="M15.934 7.756a.75.75 0 0 1 1.06 0 4.5 4.5 0 0 1 0 6.364.75.75 0 0 1-1.06-1.06 3 3 0 0 0 0-4.242.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
                <div className={`p-4 rounded-2xl max-w-[80%] text-sm ${entry.role === 'user' ? 'bg-[#6B8E6B] text-white' : 'bg-[#FDFBF7] border border-[#E8E2D6] text-[#4A5D4A]'}`}>
                  {entry.text}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-20 h-20 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="text-sm font-bold tracking-widest uppercase">请选择一个笔记进行复盘</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorySection;
