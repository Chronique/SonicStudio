import React, { useState } from 'react';
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
  onFxChange?: (id: string, fxType: 'playbackRate' | 'filterFreq' | 'reverb', value: number) => void;
  isProcessing?: boolean;
  // New Actions
  onDownload: () => void;
  onSubmitReview: (rating: number, comment: string) => void;
  onMintNFT: () => void;
}

export const TrackCard: React.FC<TrackCardProps> = ({ 
  track, 
  isActive, 
  onPlay, 
  onToggleLayer,
  onVolumeChange,
  onFxChange,
  onDownload,
  onSubmitReview,
  onMintNFT,
  isProcessing 
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmitReview(rating, comment);
    }
  };

  return (
    <div className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${isActive ? 'border-indigo-500 bg-zinc-800/80 ring-1 ring-indigo-500' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}>
      
      {/* NFT Verified Badge */}
      {track.nft?.minted && (
        <div className="absolute top-0 right-0 z-10 bg-gradient-to-l from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-lg flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          MINTED ON CHAIN
        </div>
      )}

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
              
              <div className="hidden md:flex gap-2">
                 {/* NFT Mint Button */}
                 {!track.nft?.minted && (
                   <Button 
                      variant="ghost" 
                      onClick={onMintNFT}
                      className="border border-purple-500/50 text-purple-400 hover:bg-purple-900/20"
                      icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
                   >
                     Mint NFT
                   </Button>
                 )}
                 <Button 
                  variant="secondary" 
                  onClick={onDownload}
                  icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                >
                  Download
                </Button>
              </div>
            </div>
            
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">{track.metadata.description}</p>
            {track.metadata.customPrompt && (
              <p className="mt-1 text-xs text-indigo-300 italic">User prompt: "{track.metadata.customPrompt}"</p>
            )}
            
            <div className="mt-4 flex flex-wrap gap-2">
               <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold mr-2 self-center">Lyria Layers:</span>
              {/* Optional chaining ?. to prevent crash */}
              {track.layers?.map((layer, i) => (
                <span key={i} className={`rounded-md px-2 py-1 text-xs border ${
                  layer.type === 'user' ? 'bg-indigo-900/30 text-indigo-300 border-indigo-700' : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}>
                  {layer.instrument}
                </span>
              ))}
            </div>
          </div>

           {/* Mobile Buttons */}
           <div className="mt-4 md:hidden flex gap-2">
              <Button 
                variant="secondary" 
                onClick={onDownload}
                className="flex-1"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
              >
                Download
              </Button>
              {!track.nft?.minted && (
                <Button variant="ghost" onClick={onMintNFT} className="border border-purple-500 text-purple-400">Mint</Button>
              )}
           </div>
        </div>
      </div>

      {/* Embedded Studio Editor */}
      {onToggleLayer && onVolumeChange && (
        <div className="px-6 pb-6 border-t border-zinc-800/50 pt-6">
           <StudioEditor 
              metadata={track.metadata} 
              layers={track.layers}
              onToggleLayer={onToggleLayer}
              onVolumeChange={onVolumeChange}
              onFxChange={onFxChange}
              isPlaying={isActive}
           />
        </div>
      )}

      {/* Review Section */}
      <div className="px-6 pb-6 bg-zinc-950/30 border-t border-zinc-800">
        <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 pt-6">Session Review</h4>
        
        {track.review ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
             <div className="flex items-center gap-2 mb-2">
                <div className="flex text-yellow-500">
                  {[1,2,3,4,5].map(star => (
                    <svg key={star} className={`w-4 h-4 ${star <= track.review!.rating ? 'fill-current' : 'text-zinc-600 fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={star <= track.review!.rating ? 0 : 2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                  ))}
                </div>
                <span className="text-green-400 text-xs font-medium">Review Submitted</span>
             </div>
             <p className="text-zinc-300 text-sm italic">"{track.review.comment}"</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
               <span className="text-sm text-zinc-400">Rate this generation:</span>
               <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                 {[1,2,3,4,5].map(star => (
                   <button
                     key={star}
                     onClick={() => setRating(star)}
                     onMouseEnter={() => setHoverRating(star)}
                     className="focus:outline-none transition-transform hover:scale-110"
                   >
                     <svg 
                        className={`w-6 h-6 ${star <= (hoverRating || rating) ? 'text-yellow-500 fill-current' : 'text-zinc-600'}`} 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={star <= (hoverRating || rating) ? 0 : 1.5}
                      >
                       <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                     </svg>
                   </button>
                 ))}
               </div>
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Bagaimana hasil aransemennya? (Opsional)"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <Button onClick={handleSubmit} disabled={rating === 0} size="sm">
                Submit Review
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
