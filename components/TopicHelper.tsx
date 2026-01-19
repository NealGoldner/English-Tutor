
import React from 'react';
import { TOPIC_RESOURCES, TopicResource } from '../types.ts';
import { speakText } from '../services/ttsService.ts';

interface TopicHelperProps {
  topic: string;
  voice: string;
  disabled?: boolean;
  dynamicSuggestions: TopicResource[];
  isGenerating?: boolean;
}

const TopicHelper: React.FC<TopicHelperProps> = ({ 
  topic, 
  voice, 
  disabled, 
  dynamicSuggestions,
  isGenerating 
}) => {
  const isLive = dynamicSuggestions.length > 0;
  const resources = isLive ? dynamicSuggestions : (TOPIC_RESOURCES[topic] || []);

  const handlePlayPhrase = (phrase: string) => {
    speakText(phrase, voice);
  };

  return (
    <div className={`w-full transition-all duration-500 ${disabled ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="text-[10px] font-bold text-[#6B8E6B] uppercase tracking-[0.2em] flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-orange-400 animate-pulse' : 'bg-[#6B8E6B]'}`}></span>
          {isLive ? '实时助攻 · 此时此刻你可以说' : `${topic} · 预设锦囊`}
        </h4>
        {isGenerating && (
          <span className="text-[9px] text-[#6B8E6B] font-bold animate-pulse">Genie 正在为你构思回答...</span>
        )}
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth snap-x min-h-[110px]">
        {resources.map((item, idx) => (
          <button
            key={`${isLive ? 'live' : 'static'}-${idx}`}
            onClick={() => handlePlayPhrase(item.phrase)}
            className={`flex-none w-64 snap-start group text-left border p-4 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95 animate-in fade-in slide-in-from-right-4 duration-500 delay-${idx * 100} ${
              isLive ? 'bg-white border-orange-100 hover:border-orange-300' : 'bg-white/60 hover:bg-white border-[#E8E2D6] hover:border-[#6B8E6B]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                item.category === '破冰' || item.category === '推荐回答' ? 'bg-blue-100 text-blue-600' : 
                item.category === '进阶' || item.category === '追问引导' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'
              }`}>
                {item.category}
              </span>
              <div className="flex items-center gap-1">
                {isLive && <span className="text-[8px] text-orange-400 font-bold">LIVE</span>}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#6B8E6B] opacity-0 group-hover:opacity-100 transition-opacity">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-bold text-[#4A5D4A] leading-snug mb-1 line-clamp-2">{item.phrase}</p>
            <p className="text-[11px] text-[#8BA888] font-medium line-clamp-1">{item.translation}</p>
          </button>
        ))}
        {resources.length === 0 && !isGenerating && (
          <div className="flex-none w-full flex items-center justify-center text-[10px] text-[#8BA888] font-bold py-8">
            等待对话开始以生成助攻建议...
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicHelper;
