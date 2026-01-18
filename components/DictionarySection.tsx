
import React, { useState, useRef } from 'react';
import { dictionaryAction } from '../services/geminiDictionaryService';
import HandwritingCanvas from './HandwritingCanvas';
import CameraOverlay from './CameraOverlay';

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

  const handleVoiceInput = () => {
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setQuery(speechToText);
      handleSearch(speechToText);
    };
    recognition.start();
  };

  const handleCameraCapture = (base64: string) => {
    setIsCameraOpen(false);
    processImage(base64);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden">
      {/* 搜索栏 */}
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
                onClick={handleVoiceInput}
                className="p-2.5 text-[#6B8E6B] hover:bg-[#6B8E6B]/10 rounded-xl transition-colors"
                title="语音输入"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                   <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                   <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.75 6.75 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.75 6.75 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                 </svg>
               </button>
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
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
              即时拍摄
            </button>
            <button 
              onClick={() => setInputMode('handwriting')}
              className="flex items-center gap-2 px-4 py-2 bg-[#F9F1E7] text-[#C48B4D] rounded-full text-[10px] font-bold whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
              手写查词
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-[#E8F0E8] text-[#6B8E6B] rounded-full text-[10px] font-bold whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
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

      {/* 结果展示 */}
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
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="text-sm font-bold tracking-[0.2em] uppercase">智能字典就绪</p>
            <p className="text-[10px] mt-1">支持手写识别、OCR 翻译及视觉搜索</p>
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
