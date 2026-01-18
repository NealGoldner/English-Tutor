
import React, { useState, useEffect } from 'react';
import { SessionHistory } from '../types.ts';
import { speakText } from '../services/ttsService.ts';

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
          </button>
        ))}
      </div>

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
                <div className={`p-4 rounded-2xl max-w-[80%] text-sm ${entry.role === 'user' ? 'bg-[#6B8E6B] text-white' : 'bg-[#FDFBF7] border border-[#E8E2D6] text-[#4A5D4A]'}`}>
                  {entry.text}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
            <p className="text-sm font-bold tracking-widest uppercase">请选择一个笔记进行复盘</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorySection;
