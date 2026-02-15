import React from 'react';
import { Button } from './Button';

interface StudioControlsProps {
  onApplyEffect: (effectName: string) => void;
  isProcessing: boolean;
}

export const StudioControls: React.FC<StudioControlsProps> = ({ onApplyEffect, isProcessing }) => {
  const effects = [
    { name: 'AI Mastering', icon: '✨', desc: 'Auto-balance EQ & Levels' },
    { name: 'Bass Boost', icon: '🔊', desc: 'Enhance low frequencies' },
    { name: 'Vocal Clarity', icon: '🎤', desc: 'De-ess & Presence' },
    { name: 'Lofi Vibe', icon: '☕', desc: 'Add tape crackle & warp' },
  ];

  return (
    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Studio FX Rack</h4>
        <span className="text-xs text-indigo-400">Powered by Gemini</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {effects.map((effect) => (
          <button
            key={effect.name}
            onClick={() => onApplyEffect(effect.name)}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-indigo-500 transition-all group disabled:opacity-50"
          >
            <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">{effect.icon}</span>
            <span className="text-sm font-medium text-white">{effect.name}</span>
            <span className="text-[10px] text-zinc-500 mt-1">{effect.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
