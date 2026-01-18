
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-[#F9F7F2]/80 backdrop-blur-md border-b border-[#E8E2D6] py-4 px-6 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6B8E6B] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#6B8E6B]/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#4A5D4A]">
              FluentGenie
            </h1>
            <p className="text-[10px] text-[#8BA888] font-bold tracking-widest uppercase">静心练习 · 智能纠错</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-1 text-xs font-medium text-[#6B8E6B] bg-[#6B8E6B]/10 px-3 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-[#6B8E6B] rounded-full animate-pulse"></div>
            护眼模式已开启
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
