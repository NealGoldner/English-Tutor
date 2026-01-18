
import React, { useState, useRef } from 'react';
import { dictionaryAction } from '../services/geminiDictionaryService.ts';
import HandwritingCanvas from './HandwritingCanvas.tsx';
import CameraOverlay from './CameraOverlay.tsx';

const DictionarySection: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'handwriting' | 'image' | 'camera'>('text');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (textOverride?: string) => {
    const textToSearch = textOverride || query;
    if (!textToSearch.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await dictionaryAction({ text: textToSearch, mode: 'translate' });
      setResult(res || '');
    } catch (err) {
      setResult("查询失败，请检查网络。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImage(file);
  };

  const processImage = async (fileOrBase64: File | string) => {
    setIsLoading(true);
    setResult("Genie 正在通过视觉能力分析内容...");
    
    if (typeof fileOrBase64 === 'string') {
      try {
        const res = await dictionaryAction({ 
          image: fileOrBase64, 
          mode: 'ocr' 
        });
        setResult(res || '');
      } catch (err) {
        setResult("识别失败，请重试。");
      } finally {
        setIsLoading(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const res = await dictionaryAction({ 
            image: base64, 
            mimeType: (fileOrBase64 as File).type,
            mode: 'ocr' 
          });
          setResult(res || '');
        } catch (err) {
          setResult("识别失败，请重试。");
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(fileOrBase64 as File);
    }
  };

  const handleHandwritingConfirm = async (base64: string) => {
    setIsLoading(true);
    setInputMode('text');
    setResult("正在识别您的手写内容...");
    try {
      const res = await dictionaryAction({ image: base64, mode: 'handwriting' });
      setResult(res || '');
    } catch (err) {
      setResult("无法识别，请写得清楚一些。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCameraCapture = (base64: string) => {
    setIsCameraOpen(false);
    processImage(base64);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden">
      <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] p-6 border border-[#E8E2D6] shadow-sm shrink-0">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入单词、短语或句子..."
              className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-2xl pl-5 pr-24 py-4 text-sm focus:ring-2 focus:ring-[#6B8E6B] outline-none text-[#4A5D4A]"
            />
            <div className="absolute right-2 top-2 flex gap-1">
               <button 
                onClick={() => handleSearch()}
                className="bg-[#6B8E6B] text-white px-5 py-2 rounded-xl font-bold text-xs"
               >
                 查询
               </button>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            <button 
              onClick={() => setIsCameraOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#E8F0E8] text-[#6B8E6B] rounded-full text-[10px] font-bold whitespace-nowrap"
            >
              即时拍摄
            </button>
            <button 
              onClick={() => setInputMode('handwriting')}
              className="flex items-center gap-2 px-4 py-2 bg-[#F9F1E7] text-[#C48B4D] rounded-full text-[10px] font-bold whitespace-nowrap"
            >
              手写查词
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-[#E8F0E8] text-[#6B8E6B] rounded-full text-[10px] font-bold whitespace-nowrap"
            >
              本地文件
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
          </div>
        </div>
      </div>

      {inputMode === 'handwriting' && (
        <HandwritingCanvas 
          onConfirm={handleHandwritingConfirm}
          onCancel={() => setInputMode('text')}
        />
      )}

      <div className="flex-1 bg-white/40 rounded-[2rem] border border-[#E8E2D6] p-8 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#6B8E6B]/20 border-t-[#6B8E6B] rounded-full animate-spin"></div>
            <p className="text-xs text-[#8BA888] font-bold">Genie 正在查阅典籍...</p>
          </div>
        ) : result ? (
          <div className="prose prose-stone max-w-none prose-sm text-[#4A5D4A]">
             <div className="whitespace-pre-wrap">{result}</div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-30">
            <p className="text-sm font-bold tracking-[0.2em] uppercase">智能字典就绪</p>
          </div>
        )}
      </div>

      {isCameraOpen && (
        <CameraOverlay 
          onCapture={handleCameraCapture} 
          onClose={() => setIsCameraOpen(false)} 
        />
      )}
    </div>
  );
};

export default DictionarySection;
