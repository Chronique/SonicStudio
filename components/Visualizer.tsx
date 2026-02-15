import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isPlaying: boolean;
  color?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isPlaying, color = '#6366f1' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bars = 60;
    const barWidth = canvas.width / bars;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < bars; i++) {
        // Simulate frequency data
        const height = isPlaying 
          ? Math.random() * canvas.height * 0.8 + 10 
          : 5;
        
        const x = i * barWidth;
        const y = canvas.height - height;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, '#a855f7'); // purple-500

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 2, height);
      }

      if (isPlaying) {
        animationId = requestAnimationFrame(render);
      } else {
        // Draw one static frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < bars; i++) {
          const height = 5;
          const x = i * barWidth;
          const y = canvas.height - height;
          ctx.fillStyle = '#3f3f46'; // zinc-700
          ctx.fillRect(x, y, barWidth - 2, height);
        }
      }
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={100} 
      className="w-full h-24 rounded-lg bg-black/20 backdrop-blur-sm"
    />
  );
};
