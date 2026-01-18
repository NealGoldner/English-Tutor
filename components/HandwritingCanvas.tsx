
import React, { useRef, useEffect, useState } from 'react';

interface HandwritingCanvasProps {
  onConfirm: (base64: string) => void;
  onCancel: () => void;
}

const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({ onConfirm, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#4A5D4A';
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      onConfirm(base64);
    }
  };

  return (
    <div className="bg-[#FDFBF7] border border-[#E8E2D6] rounded-3xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-bold text-[#8BA888] uppercase tracking-widest">手写板</span>
        <button onClick={handleClear} className="text-[10px] text-[#6B8E6B] font-bold hover:underline">清空笔迹</button>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={250}
        className="w-full bg-white rounded-2xl touch-none cursor-crosshair border border-[#F0EDE6]"
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        onTouchStart={startDrawing}
        onTouchEnd={stopDrawing}
        onTouchMove={draw}
      />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-3 bg-[#E8E2D6] text-[#4A5D4A] rounded-xl font-bold text-sm">取消</button>
        <button onClick={handleConfirm} className="flex-2 py-3 bg-[#6B8E6B] text-white rounded-xl font-bold text-sm px-8">识别并查询</button>
      </div>
    </div>
  );
};

export default HandwritingCanvas;
