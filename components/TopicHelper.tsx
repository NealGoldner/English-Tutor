
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
  onManualRefresh?: () => void;
}

const TopicHelper: React.FC<TopicHelperProps> = ({ 
  voice, 
  disabled, 
  dynamicSuggestions,
  isGenerating,
  error,
  onManualRefresh
}) => {
  const isLive = dynamicSuggestions.length > 0;
  const resources = dynamicSuggestions;

  const handlePlayPhrase = (phrase: string) => {
    speakText(phrase, voice);
  };

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case '深层表达': return 'bg-purple-100 text-purple-600 border-purple-200';
      case '逻辑追问': return 'bg-blue-100 text-blue-600 border-blue-200';
      case '地道俚语': return 'bg-orange-100 text-orange-600 border-orange-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className={`w-full h-full flex flex-col transition-all duration-700 ${disabled ? 'opacity-40 grayscale blur-[1px]' : 'opacity-100'}`}>
      <div className="flex items-center justify-between mb-4 px-1">
        <h4 className="text-[10px] font-bold text-[#6B8E6B] uppercase tracking-[0.2em] flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-orange-400 animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.6)]' : 'bg-[#6B8E6B]'}`}></span>
          {isLive ? '实时助攻' : '准备开始'}
        </h4>
        <div className="flex items-center gap-2">
          {isGenerating && (
            <span className="text-[9px] text-[#6B8E6B] font-bold animate-pulse">思考中...</span>
          )}
          {!disabled && onManualRefresh && !isGenerating && (
            <button onClick={onManualRefresh} className="p-1 text-[#8BA888] hover:text-[#6B8E6B] transition-colors" title="重试">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 no-scrollbar">
        {error ? (
          <div className="py-8 flex flex-col items-center justify-center text-center px-4 bg-orange-50 rounded-3xl border border-dashed border-orange-200">
            <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest mb-2">配额已耗尽</p>
            <p className="text-[9px] text-orange-400 mb-3">您的 API 账号请求过于频繁，建议功能暂时锁定</p>
            <button onClick={onManualRefresh} className="text-[9px] bg-white text-orange-600 px-3 py-1.5 rounded-full border border-orange-200 font-bold shadow-sm">点击重试</button>
          </div>
        ) : resources.length > 0 ? (
          resources.map((item, idx) => (
            <button
              key={`live-${idx}-${item.phrase.substring(0, 10)}`}
              onClick={() => handlePlayPhrase(item.phrase)}
              className="group w-full text-left bg-white border border-[#E8E2D6] p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-[#6B8E6B] active:scale-[0.98] transition-all animate-in fade-in slide-in-from-right-4 duration-500"
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${getCategoryStyle(item.category)}`}>
                  {item.category}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#6B8E6B] opacity-0 group-hover:opacity-100 transition-opacity">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-[#4A5D4A] leading-relaxed mb-1 group-hover:text-[#6B8E6B] transition-colors">
                {item.phrase}
              </p>
              <p className="text-[11px] text-[#8BA888] font-medium italic">
                {item.translation}
              </p>
            </button>
          ))
        ) : !isGenerating ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4 bg-white/30 rounded-3xl border border-dashed border-[#E8E2D6]">
            <p className="text-[10px] text-[#8BA888] font-bold uppercase tracking-widest">等待导师发言...</p>
            <p className="text-[9px] text-[#8BA888] mt-1 opacity-60">Genie 将根据对话内容为您实时定制高情商回复</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TopicHelper;
