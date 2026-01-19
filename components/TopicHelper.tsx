
import React from 'react';
import { speakText } from '../services/ttsService.ts';

interface TopicHelperProps {
  topic: string;
  voice: string;
  disabled?: boolean;
  dynamicSuggestions: any[];
}

const TopicHelper: React.FC<TopicHelperProps> = ({ 
  topic,
  voice, 
  disabled 
}) => {
  return (
    <div className={`flex-1 flex flex-col gap-4 transition-opacity ${disabled ? 'opacity-40' : 'opacity-100'}`}>
      <div className="bg-white/50 border border-[#E8E2D6] rounded-[2rem] p-6 flex flex-col gap-4 h-full">
        <h4 className="text-[10px] font-bold text-[#6B8E6B] uppercase tracking-[0.2em]">练习话题</h4>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-bold text-[#4A5D4A]">{topic}</p>
        </div>
        
        <div className="mt-auto p-4 bg-[#6B8E6B]/5 rounded-2xl border border-[#6B8E6B]/10">
          <p className="text-[10px] text-[#6B8E6B] font-bold uppercase mb-2">小贴士</p>
          <p className="text-[11px] text-[#4A5D4A] leading-relaxed">
            点击对话中的蓝色气泡可以重复听导师的发言。如果遇到听不懂的内容，可以直接看底部的中文翻译。
          </p>
        </div>
      </div>
    </div>
  );
};

export default TopicHelper;
