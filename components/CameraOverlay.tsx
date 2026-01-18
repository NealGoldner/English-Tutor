
import React, { useRef, useEffect, useState } from 'react';

interface CameraOverlayProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

const CameraOverlay: React.FC<CameraOverlayProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' }, 
          audio: false 
        });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error("无法访问摄像头", err);
        onClose();
      }
    }
    setupCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        onCapture(base64);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-lg aspect-[3/4] rounded-3xl overflow-hidden bg-slate-900 shadow-2xl border border-white/10">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* UI Overlays */}
        <div className="absolute inset-x-0 bottom-8 flex justify-center items-center gap-8">
          <button 
            onClick={onClose}
            className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          
          <button 
            onClick={handleCapture}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-white/30 active:scale-90 transition-transform"
          >
            <div className="w-16 h-16 bg-white border-2 border-slate-200 rounded-full"></div>
          </button>
          
          <div className="w-12 h-12"></div> {/* Spacer */}
        </div>

        <div className="absolute top-6 left-6 right-6 text-center">
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest drop-shadow-md">拍摄物体，让我来教你相关单词</p>
        </div>
      </div>
    </div>
  );
};

export default CameraOverlay;
