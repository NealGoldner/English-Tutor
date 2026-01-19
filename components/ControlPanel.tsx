
import React;
import { AppStatus, TutorConfig, TUTOR_TOPICS, TranscriptionEntry } from '../types.ts';

interface ControlPanelProps {
  status: AppStatus;
  config: TutorConfig;
  setConfig: React.Dispatch<React.SetStateAction<TutorConfig>>;
  onStart: () => void;
  onStop: () => void;
  transcriptions?: TranscriptionEntry[];
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  status, 
  config, 
  setConfig, 
  onStart, 
  onStop,
}) => {
  // Fix: AppStatus.RECONNECTING does not exist, using AppStatus.CONNECTING
  const isConnecting = status === AppStatus.CONNECTING;
  const isActive = status === AppStatus.ACTIVE;

  return (
    <div className="bg-[#FFFFFF]/90 backdrop-blur-2xl border-t border-[#E8E2D6] p-4 pb-8 md:p-8 sticky bottom-0 shadow-[0_-15px_40px_rgba(74,93,74,0.08)] z-50 rounded-t-[2.5rem]">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        
        {/* Fix: AppStatus.RECONNECTING does not exist, simplifying condition to hide config when active or connecting */}
        {(!isActive && !isConnecting) && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 顶层：性格选择器 - 新增 */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-[#6B8E6B] uppercase tracking-[0.2em] ml-1">导师性格 · Personality</label>
              <div className="flex bg-[#F9F7F2] border border-[#E8E2D6] rounded-2xl p-1 gap-1">
                {(['幽默达人', '电影编剧', '严厉教官'] as const).map((p) => (
                  <button
                    key={p}
                    disabled={isConnecting}
                    onClick={() => setConfig(prev => ({ ...prev, personality: p }))}
                    className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${
                      config.personality === p 
                        ? 'bg-white text-[#6B8E6B] shadow-sm scale-[1.02]' 
                        : 'text-[#8BA888] hover:text-[#4A5D4A]'
                    }`}
                  >
                    {p === '幽默达人' ? '✨ 幽默达人' : p === '电影编剧' ? '🎬 电影编剧' : '💂 严厉教官'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[#8BA888] uppercase tracking-[0.2em] ml-1">练习话题</label>
                <select 
                  disabled={isConnecting}
                  value={config.topic}
                  onChange={(e) => setConfig(prev => ({ ...prev, topic: e.target.value }))}
                  className="w-full bg-white border border-[#E8E2D6] rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#6B8E6B] outline-none transition-all appearance-none text-[#4A5D4A] shadow-sm font-medium"
                >
                  {TUTOR_TOPICS.map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[#8BA888] uppercase tracking-[0.2em] ml-1">语言等级</label>
                <div className="flex bg-white border border-[#E8E2D6] rounded-2xl p-1 shadow-sm">
                  {(['入门', '进阶', '专业'] as const).map((level) => (
                    <button
                      key={level}
                      disabled={isConnecting}
                      onClick={() => setConfig(prev => ({ ...prev, difficulty: level }))}
                      className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-300 ${
                        config.difficulty === level 
                          ? 'bg-[#6B8E6B] text-white shadow-md' 
                          : 'text-[#8BA888] hover:text-[#4A5D4A]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          {/* Fix: AppStatus.RECONNECTING does not exist, simplifying condition to show stop button when active */}
          {isActive ? (
            <button 
              onClick={onStop}
              className="group flex-1 bg-[#E38B7D] hover:bg-[#D47A6C] text-white font-bold py-7 rounded-[2rem] shadow-xl shadow-[#E38B7D]/20 flex flex-col items-center justify-center gap-1 transition-all transform active:scale-[0.96]"
            >
              <span className="flex items-center gap-2 text-lg">
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                结束本次有趣的交流
              </span>
            </button>
          ) : (
            <button 
              onClick={onStart}
              disabled={isConnecting}
              className={`flex-2 grow font-bold py-7 rounded-[2rem] shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.96] ${
                isConnecting 
                  ? 'bg-[#E8E2D6] text-[#8BA888] cursor-not-allowed' 
                  : 'bg-[#6B8E6B] hover:bg-[#5A7A5A] text-white shadow-[#6B8E6B]/30'
              }`}
            >
              {isConnecting ? (
                <>
                  <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span className="text-lg">正在呼叫精灵...</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                          <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                      </svg>
                  </div>
                  <span className="text-xl">开始这场奇妙对话</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
