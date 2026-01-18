
import React from 'react';
import { AppStatus, TutorConfig, TUTOR_TOPICS } from '../types';

interface ControlPanelProps {
  status: AppStatus;
  config: TutorConfig;
  setConfig: React.Dispatch<React.SetStateAction<TutorConfig>>;
  onStart: () => void;
  onStop: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  status, 
  config, 
  setConfig, 
  onStart, 
  onStop 
}) => {
  const isConnecting = status === AppStatus.CONNECTING;
  const isActive = status === AppStatus.ACTIVE;

  return (
    <div className="bg-[#FFFFFF]/80 backdrop-blur-xl border-t border-[#E8E2D6] p-6 pb-8 md:p-8 sticky bottom-0 shadow-[0_-10px_30px_rgba(74,93,74,0.05)] z-50">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        
        {!isActive && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Topic Selector */}
              <div>
                <label className="block text-[10px] font-bold text-[#8BA888] uppercase tracking-[0.2em] mb-2 ml-1">练习话题</label>
                <select 
                  disabled={isActive || isConnecting}
                  value={config.topic}
                  onChange={(e) => setConfig(prev => ({ ...prev, topic: e.target.value }))}
                  className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-2xl px-4 py-4 text-sm focus:ring-2 focus:ring-[#6B8E6B] outline-none transition-all appearance-none text-[#4A5D4A]"
                >
                  {TUTOR_TOPICS.map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-[10px] font-bold text-[#8BA888] uppercase tracking-[0.2em] mb-2 ml-1">语言等级</label>
                <div className="flex bg-[#FDFBF7] border border-[#E8E2D6] rounded-2xl p-1.5">
                  {(['入门', '进阶', '专业'] as const).map((level) => (
                    <button
                      key={level}
                      disabled={isActive || isConnecting}
                      onClick={() => setConfig(prev => ({ ...prev, difficulty: level }))}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 开关组件 */}
              {[
                { label: '中英双语', sub: '实时同步翻译', key: 'isTranslationMode', activeColor: 'bg-[#6B8E6B]' },
                { label: '深度纠错', sub: '精修语法发音', key: 'isCorrectionMode', activeColor: 'bg-[#C48B4D]' }
              ].map((toggle) => (
                <div key={toggle.key} className="flex items-center justify-between bg-[#FDFBF7] p-4 rounded-2xl border border-[#E8E2D6]">
                  <div>
                    <span className="text-sm font-bold text-[#4A5D4A]">{toggle.label}</span>
                    <p className="text-[10px] text-[#8BA888] font-medium">{toggle.sub}</p>
                  </div>
                  <button 
                    onClick={() => setConfig(prev => ({...prev, [toggle.key]: !prev[toggle.key as keyof TutorConfig]}))}
                    className={`w-12 h-6 rounded-full transition-all duration-300 relative ${config[toggle.key as keyof TutorConfig] ? toggle.activeColor : 'bg-[#E8E2D6]'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${config[toggle.key as keyof TutorConfig] ? 'translate-x-6' : ''}`}></div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div>
          {isActive ? (
            <button 
              onClick={onStop}
              className="group w-full bg-[#E38B7D] hover:bg-[#D47A6C] text-white font-bold py-6 rounded-3xl shadow-xl shadow-[#E38B7D]/20 flex flex-col items-center justify-center gap-1 transition-all transform active:scale-[0.98]"
            >
              <span className="flex items-center gap-2 text-lg">
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                完成学习
              </span>
              <span className="text-[10px] opacity-70 font-medium tracking-widest">休息一下，眼睛也需要放松</span>
            </button>
          ) : (
            <button 
              onClick={onStart}
              disabled={isConnecting}
              className={`w-full font-bold py-6 rounded-3xl shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] ${
                isConnecting 
                  ? 'bg-[#E8E2D6] text-[#8BA888] cursor-not-allowed' 
                  : 'bg-[#6B8E6B] hover:bg-[#5A7A5A] text-white shadow-[#6B8E6B]/20'
              }`}
            >
              {isConnecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>连接精灵中...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                    <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.75 6.75 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.75 6.75 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                  </svg>
                  <span>开启今日练习</span>
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
