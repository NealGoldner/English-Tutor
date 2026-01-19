
import React, { useEffect, useRef } from 'react';
import { AppStatus } from '../types.ts';

interface VisualizerProps {
  status: AppStatus;
  audioContext: AudioContext | null;
}

const Visualizer: React.FC<VisualizerProps> = ({ status, audioContext }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const isWorking = status === AppStatus.ACTIVE || status === AppStatus.CONNECTING;
    if (!isWorking || !audioContext) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const render = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = 60;
      
      const mainColor = status === AppStatus.CONNECTING ? '249, 115, 22' : '107, 142, 107'; 
      
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const pulse = Math.sin(phase + i * Math.PI / 2) * 20;
        const radius = baseRadius + pulse;
        const opacity = 0.2 - i * 0.05;
        
        ctx.strokeStyle = `rgba(${mainColor}, ${opacity})`;
        ctx.lineWidth = 3;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      ctx.beginPath();
      ctx.fillStyle = `rgb(${mainColor})`;
      ctx.arc(centerX, centerY, baseRadius - 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let x = -30; x <= 30; x += 6) {
        const y = Math.sin((x + phase * 60) / 12) * 12;
        if (x === -30) ctx.moveTo(centerX + x, centerY + y);
        else ctx.lineTo(centerX + x, centerY + y);
      }
      ctx.stroke();

      phase += 0.04;
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [status, audioContext]);

  return (
    <div className="relative w-56 h-56 flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        width={250} 
        height={250} 
        className="max-w-full h-auto drop-shadow-2xl"
      />
      {(status === AppStatus.IDLE || status === AppStatus.ERROR) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-[#E8E2D6] shadow-sm">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-10 h-10 ${status === AppStatus.ERROR ? 'text-red-400' : 'text-[#6B8E6B]/40'}`}>
              <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
              <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.75 6.75 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.75 6.75 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visualizer;
