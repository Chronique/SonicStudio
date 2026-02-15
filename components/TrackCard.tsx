import React from 'react';
import { Track } from '../types';
import { Button } from './Button';
import { StudioEditor } from './StudioEditor';

interface TrackCardProps {
  track: Track;
  isActive: boolean;
  onPlay: () => void;
  // Studio Props
  onToggleLayer?: (id: string) => void;
  onVolumeChange?: (id: string, vol: number) => void;
  isProcessing?: boolean;
}

export const TrackCard: React.FC<TrackCardProps> = ({ 
  track, 
  isActive, 
  onPlay, 
  onToggleLayer,
  onVolumeChange,
  isProcessing 
}) => {
  return (
    <div className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${isActive ? 'border-indigo-500 bg-zinc-800/80 ring-1 ring-indigo-500' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}>
      <div className="flex flex-col md:flex-row gap-6 p-6">
        {/* Cover Art */}
        <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800 shadow-xl">
          {track.coverArtUrl ? (
            <img 
              src={track.coverArtUrl} 
              alt={track.metadata.title} 
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-600 bg-zinc-900">
              <svg className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span className="text-xs text-zinc-500">Processing Art...</span>
            </div>
          )}
          <button 
            onClick={onPlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg">
              {isActive ? (
                 <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="h-5 w-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </div>
          </button>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">{track.metadata.title}</h3>
                <p className="text-indigo-400">{track.metadata.genre} • {track.metadata.bpm} BPM • {track.metadata.key}</p>
              </div>
            </div>
            
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">{track.metadata.description}</p>
            
            <div className="mt-4 flex flex-wrap gap-2">
               <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold mr-2 self-center">Contains:</span>
              {track.layers.map((layer, i) => (
                <span key={i} className={`rounded-md px-2 py-1 text-xs border ${
                  layer.type === 'user' ? 'bg-indigo-900/30 text-indigo-300 border-indigo-700' : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}>
                  {layer.instrument}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Studio Editor */}
      {onToggleLayer && onVolumeChange && (
        <div className="px-6 pb-6">
           <StudioEditor 
              metadata={track.metadata} 
              layers={track.layers}
              onToggleLayer={onToggleLayer}
              onVolumeChange={onVolumeChange}
              isPlaying={isActive}
           />
        </div>
      )}
    </div>
  );
};