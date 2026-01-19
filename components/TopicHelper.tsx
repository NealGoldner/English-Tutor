
import React from 'react';
import { TopicResource } from '../types.ts';
import { speakText } from '../services/ttsService.ts';

interface TopicHelperProps {
  topic: string;
  voice: string;
  disabled?: boolean;
  dynamicSuggestions: TopicResource[];
  isGenerating?: boolean;
  error?: string | null;
  autoSuggest?: boolean;
  onToggleAuto?: () => void;
  onManualRefresh?: () => void;
}

const TopicHelper: React.FC<TopicHelperProps> = ({ 
  voice, 
  disabled, 
  dynamicSuggestions,
  isGenerating,
  error,
  autoSuggest,
  onToggleAuto,
  onManualRefresh
}) => {
  const isLive = dynamicSuggestions.length > 0;
  
  const handlePlayPhrase = (phrase: string) => {
    speakText(phrase, voice);
  };

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case '地道俚语': return 'bg-amber-50 text-amber-600 border-amber-100';
      case '继续追问': return 'bg-blue-50 text-blue-600 border-blue-100';
      case '情绪回应': return 'bg-orange-50 text-orange-600 border-orange-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  return (
    <div className={`w-full flex flex-col gap-4 transition-all duration-500 ${disabled ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[10px] font-bold text-[#6B8E6B] uppercase tracking-[0.2em] flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-orange-400 animate-pulse' : 'bg-[#E8E2D6]'}`}></span>
          {isLive ? '实时助攻' : '助攻面板'}
        </h4>
        <div className="flex items-center gap-3">
          <button 
            onClick={onToggleAuto}
            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all ${autoSuggest ? 'bg-[#6B8E6B] text-white border-[#6B8E6B]' : 'bg-white text-[#8BA888] border-[#E8E2D6]'}`}
          >
            {autoSuggest ? '自动' : '手动'}
          </button>
          {onManualRefresh && !disabled && (
            <button 
              onClick={onManualRefresh}
              className={`p-1 text-[#8BA888] hover:text-[#6B8E6B] transition-colors ${isGenerating ? 'animate-spin' : ''}`}
              title="刷新建议"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-col gap-3 min-h-[300px]">
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-orange-50/50 rounded-3xl border border-dashed border-orange-200">
            <p className="text-[10px] text-orange-600 font-bold mb-2 uppercase">配额超限</p>
            <p className="text-[11px] text-orange-500 leading-relaxed mb-4">API 免费额度暂时用完。您可以关闭“自动”并手动刷新，或稍等几分钟。</p>
            <button onClick={onManualRefresh} className="px-4 py-2 bg-white border border-orange-200 text-orange-600 rounded-full text-[10px] font-bold shadow-sm">手动尝试刷新</button>
          </div>
        ) : isLive ? (
          dynamicSuggestions.map((item, idx) => (
            <button
              key={`suggest-${idx}`}
              onClick={() => handlePlayPhrase(item.phrase)}
              className="group w-full text-left bg-white border border-[#E8E2D6] p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-[#6B8E6B] transition-all transform active:scale-[0.98] animate-in slide-in-from-right duration-500"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${getCategoryStyle(item.category)}`}>
                  {item.category}
                </span>
                <div className="w-4 h-4 text-[#6B8E6B] opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-bold text-[#4A5D4A] mb-1 group-hover:text-[#6B8E6B] transition-colors">{item.phrase}</p>
              <p className="text-[11px] text-[#8BA888] font-medium italic">{item.translation}</p>
            </button>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-white/20 rounded-3xl border border-dashed border-[#E8E2D6]">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-5 h-5 border-2 border-[#6B8E6B]/20 border-t-[#6B8E6B] rounded-full animate-spin"></div>
                <p className="text-[10px] text-[#8BA888] font-bold uppercase">Genie 正在通过 Lite 模型构思...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 opacity-40">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
                <p className="text-[10px] font-bold uppercase tracking-widest">请开始练习</p>
                <p className="text-[9px]">我会根据内容为您提供建议，避免冷场</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicHelper;
