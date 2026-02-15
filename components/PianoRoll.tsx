import React, { useRef, useEffect } from 'react';
import { Note } from '../types';

interface PianoRollProps {
  notes: Note[];
  color: string;
  height?: number;
}

export const PianoRoll: React.FC<PianoRollProps> = ({ notes, color, height = 100 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Background Grid
    ctx.fillStyle = '#18181b'; // zinc-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#27272a'; // zinc-800
    ctx.lineWidth = 1;
    
    // Vertical grid (beats)
    const beats = 8; // 2 bars of 4/4
    const pixelsPerBeat = canvas.width / beats;
    
    for(let i=0; i<=beats; i++) {
        ctx.beginPath();
        ctx.moveTo(i * pixelsPerBeat, 0);
        ctx.lineTo(i * pixelsPerBeat, canvas.height);
        ctx.stroke();
    }

    // Horizontal grid (pitch)
    const pitchRange = 24; // 2 octaves
    const pixelsPerPitch = canvas.height / pitchRange;

    for(let i=0; i<=pitchRange; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * pixelsPerPitch);
        ctx.lineTo(canvas.width, i * pixelsPerPitch);
        ctx.stroke();
    }

    // Draw Notes
    if (!notes || notes.length === 0) {
        ctx.fillStyle = '#3f3f46';
        ctx.font = '10px sans-serif';
        ctx.fillText("No MIDI Data", 10, 20);
        return;
    }

    // Find min/max pitch to center the view
    const pitches = notes.map(n => n.pitch);
    const minPitch = Math.min(...pitches) - 2;
    const maxPitch = Math.max(...pitches) + 2;
    const range = Math.max(12, maxPitch - minPitch);
    
    const noteHeight = canvas.height / range;

    notes.forEach(note => {
      // Normalize X: assume loop is 8 beats max for display
      const x = (note.startTime / 8) * canvas.width;
      const w = (note.duration / 8) * canvas.width;
      
      // Normalize Y: High pitch = Low Y value
      const normalizedPitch = note.pitch - minPitch;
      const y = canvas.height - (normalizedPitch * noteHeight) - noteHeight;

      // Glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      
      ctx.fillStyle = color;
      // Subtract 1 from width/height for separation
      ctx.fillRect(x, y, Math.max(2, w - 1), Math.max(2, noteHeight - 1));
      
      ctx.shadowBlur = 0;
    });

  }, [notes, color, height]);

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={height} 
      className="w-full rounded border border-zinc-800 bg-zinc-900/50"
    />
  );
};
