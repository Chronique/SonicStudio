import React, { useState } from 'react';
import { InstrumentLayer, TrackMetadata } from '../types';
import { Button } from './Button';
import { PianoRoll } from './PianoRoll';

interface StudioEditorProps {
  metadata: TrackMetadata;
  layers: InstrumentLayer[];
  onToggleLayer: (id: string) => void;
  onVolumeChange: (id: string, vol: number) => void;
  onFxChange?: (id: string, fxType: 'playbackRate' | 'filterFreq' | 'reverb', value: number) => void;
  isPlaying: boolean;
}

export const StudioEditor: React.FC<StudioEditorProps> = ({ 
  metadata, 
  layers, 
  onToggleLayer, 
  onVolumeChange,
  onFxChange,
  isPlaying 
}) => {
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);

  const formatFreq = (val: number) => val > 1000 ? `${(val/1000).toFixed(1)}kHz` : `${val}Hz`;

  return (
    <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden shadow-2xl mt-4">
      {/* Studio Header */}
      <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
           <span className="text-xs font-mono text-zinc-400 uppercase">AIVA-STYLE COMPOSER</span>
        </div>
        <div className="text-right flex flex-col items-end">
           <div className="text-xs font-bold text-white tracking-wider">{metadata.genre.toUpperCase()}</div>
           <div className="text-[10px] text-zinc-500 font-mono flex gap-2">
             <span>{metadata.bpm} BPM</span>
             <span>{metadata.key}</span>
             <span>{metadata.timeSignature || "4/4"}</span>
           </div>
        </div>
      </div>

      <div className="p-0">
        {layers?.map((layer, index) => (
          <div key={layer.id} className="flex flex-col border-b border-zinc-800/50">
            <div 
              className={`p-4 transition-colors flex items-center gap-4 ${
                layer.type === 'user' ? 'bg-indigo-900/10' : 'bg-zinc-900/30'
              } ${!layer.isActive ? 'opacity-50 grayscale' : ''}`}
            >
              {/* Mute/Active Toggle */}
              <button 
                onClick={() => onToggleLayer(layer.id)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  layer.isActive 
                    ? layer.type === 'user' ? 'bg-indigo-500 text-white' : 'bg-emerald-600 text-white'
                    : 'bg-zinc-700 text-zinc-400'
                }`}
              >
                {layer.name.charAt(0)}
              </button>

              {/* Track Info */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedLayerId(expandedLayerId === layer.id ? null : layer.id)}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white truncate">{layer.name}</span>
                  {layer.type === 'user' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      AUDIO INPUT
                    </span>
                  )}
                  {layer.type === 'ai' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      MIDI GENERATED
                    </span>
                  )}
                  <svg className={`w-3 h-3 text-zinc-500 transform transition-transform ${expandedLayerId === layer.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">{layer.description}</p>
              </div>

              {/* Volume Slider */}
              <div className="w-24 hidden md:block">
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={layer.volume}
                  onChange={(e) => onVolumeChange(layer.id, parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-400"
                />
              </div>
            </div>
            
            {/* EXPANDED EDITOR AREA */}
            {expandedLayerId === layer.id && (
              <div className="bg-zinc-950 p-4 border-t border-zinc-800 animate-fade-in-up">
                 
                 {/* IF USER AUDIO: SHOW FX EDITOR */}
                 {layer.type === 'user' && onFxChange && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Playback Speed */}
                        <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                           <div className="flex justify-between mb-2">
                             <span className="text-[10px] uppercase font-bold text-indigo-400">Playback Speed</span>
                             <span className="text-[10px] font-mono text-white">{layer.fx?.playbackRate || 1}x</span>
                           </div>
                           <input 
                              type="range" min="0.5" max="2.0" step="0.1"
                              value={layer.fx?.playbackRate || 1}
                              onChange={(e) => onFxChange(layer.id, 'playbackRate', parseFloat(e.target.value))}
                              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                           />
                        </div>

                        {/* Filter Cutoff */}
                        <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                           <div className="flex justify-between mb-2">
                             <span className="text-[10px] uppercase font-bold text-pink-400">Filter (LPF)</span>
                             <span className="text-[10px] font-mono text-white">{formatFreq(layer.fx?.filterFreq || 20000)}</span>
                           </div>
                           <input 
                              type="range" min="200" max="20000" step="100"
                              value={layer.fx?.filterFreq || 20000}
                              onChange={(e) => onFxChange(layer.id, 'filterFreq', parseFloat(e.target.value))}
                              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                           />
                        </div>

                        {/* Reverb */}
                        <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                           <div className="flex justify-between mb-2">
                             <span className="text-[10px] uppercase font-bold text-cyan-400">Reverb</span>
                             <span className="text-[10px] font-mono text-white">{Math.round((layer.fx?.reverb || 0) * 100)}%</span>
                           </div>
                           <input 
                              type="range" min="0" max="1" step="0.05"
                              value={layer.fx?.reverb || 0}
                              onChange={(e) => onFxChange(layer.id, 'reverb', parseFloat(e.target.value))}
                              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                           />
                        </div>
                    </div>
                 )}

                 {/* IF AI MIDI: SHOW PIANO ROLL */}
                 {layer.type === 'ai' && layer.notes && (
                   <div>
                     <div className="flex justify-between items-center mb-1 px-2">
                        <span className="text-[10px] font-mono text-zinc-500">MIDI REGION: 2 BARS</span>
                        <span className="text-[10px] font-mono text-zinc-500">QUANTIZE: 1/16</span>
                     </div>
                     <PianoRoll 
                        notes={layer.notes} 
                        color={layer.instrument.toLowerCase().includes('drum') ? '#f43f5e' : '#10b981'} 
                        height={80}
                     />
                   </div>
                 )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
