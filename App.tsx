import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Track, InstrumentLayer } from './types';
import { DEMO_AUDIO_URL, INITIAL_GREETING } from './constants';
import { analyzeStem, composeAccompaniment, generateCoverArt } from './services/geminiService';
import { Button } from './components/Button';
import { TrackCard } from './components/TrackCard';
import { Visualizer } from './components/Visualizer';

// Intermediate state for the creation wizard
interface CreationState {
  step: 'idle' | 'analyzing' | 'genre-selection' | 'generating' | 'complete';
  userStem?: {
    file: File;
    instrument: string;
    bpm: number;
    key: string;
    suggestedGenres: string[];
  };
}

export default function App() {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'ai', content: INITIAL_GREETING }
  ]);
  const [creationState, setCreationState] = useState<CreationState>({ step: 'idle' });
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Audio Refs
  const audioRef = useRef<HTMLAudioElement>(new Audio(DEMO_AUDIO_URL));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Audio Playback
  useEffect(() => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.play().catch(e => {
        console.error("Audio play failed", e);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // STEP 1: Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCreationState({ step: 'analyzing' });
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: `Uploaded: ${file.name}`
    }]);

    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      content: "Mendengarkan ide musik Anda... Mengidentifikasi melodi dasar, tempo, dan nada."
    }]);

    try {
      // Analyze with Gemini
      let analysis;
      if (file.size < 9 * 1024 * 1024) {
         const base64 = await fileToBase64(file);
         analysis = await analyzeStem(base64, file.type);
      } else {
         // Mock fallback for huge files
         analysis = {
            instrument: "Vocal Melody",
            bpm: 120,
            key: "C Major",
            suggestedGenres: ["Pop", "Acoustic", "Lo-Fi"]
         };
      }

      setCreationState({
        step: 'genre-selection',
        userStem: {
          file,
          ...analysis
        }
      });

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: `Saya menangkap: "${analysis.instrument}" di nada ${analysis.key}.\n\nIngin mengubah ide ini menjadi lagu genre apa?`
      }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: "Gagal menganalisis file. Coba lagi dengan file audio yang jelas." }]);
      setCreationState({ step: 'idle' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // STEP 2: Handle Genre Selection & Generation
  const handleGenreSelect = async (genre: string) => {
    if (creationState.step !== 'genre-selection' || !creationState.userStem) return;

    setCreationState({ ...creationState, step: 'generating' });
    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      role: 'user', 
      content: `Buatkan aransemen ${genre}!` 
    }]);
    
    setMessages(prev => [...prev, { 
      id: (Date.now() + 1).toString(), 
      role: 'ai', 
      content: `Siap! Sedang menyusun Drum, Bass, dan Harmoni bertema ${genre} untuk melengkapi melodi Anda...` 
    }]);

    try {
      const stem = creationState.userStem;
      
      // 1. Compose Band Arrangement with Gemini
      const composition = await composeAccompaniment(stem.instrument, genre, stem.bpm, stem.key);

      // 2. Generate Art
      const coverArt = await generateCoverArt(`${genre} music production ${composition.mood} abstract art`);

      // 3. Construct Layers
      const layers: InstrumentLayer[] = [
        {
          id: 'user-stem',
          name: `Ide Anda (${stem.instrument})`,
          type: 'user',
          instrument: stem.instrument,
          description: 'Original Idea',
          isActive: true,
          volume: 90
        },
        ...composition.layers.map((l, i) => ({
          id: `ai-layer-${i}`,
          name: l.name,
          type: 'ai' as const,
          instrument: l.instrument,
          description: l.description,
          isActive: true,
          volume: 75
        }))
      ];

      const newTrack: Track = {
        id: Date.now().toString(),
        metadata: {
          title: composition.title,
          genre: genre,
          bpm: stem.bpm,
          key: stem.key,
          mood: composition.mood,
          description: composition.description
        },
        coverArtUrl: coverArt,
        audioUrl: DEMO_AUDIO_URL, // In a real app, this would be the merged audio
        layers: layers,
        createdAt: Date.now(),
      };

      setCurrentTrack(newTrack);
      setCreationState({ step: 'complete' });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: `Selesai! Ide sederhana Anda telah berkembang menjadi "${composition.title}". Cek Studio Player di atas untuk mengatur volume tiap instrumen.`
      }]);

    } catch (error) {
      console.error(error);
      setCreationState({ ...creationState, step: 'genre-selection' }); // Go back
    }
  };

  // Studio Layer Handlers
  const handleToggleLayer = (id: string) => {
    if (!currentTrack) return;
    const updatedLayers = currentTrack.layers.map(l => 
      l.id === id ? { ...l, isActive: !l.isActive } : l
    );
    setCurrentTrack({ ...currentTrack, layers: updatedLayers });
  };

  const handleVolumeChange = (id: string, vol: number) => {
    if (!currentTrack) return;
    const updatedLayers = currentTrack.layers.map(l => 
      l.id === id ? { ...l, volume: vol } : l
    );
    setCurrentTrack({ ...currentTrack, layers: updatedLayers });
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-900 hidden md:flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-indigo-500">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
            <span className="font-bold text-xl tracking-tight text-white">SonicStudio</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">AI Music Arranger</p>
        </div>
        <div className="flex-1 p-4 space-y-2">
           {creationState.step === 'analyzing' || creationState.step === 'generating' ? (
             <div className="bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-lg animate-pulse">
                <p className="text-xs text-indigo-300 font-bold">Sedang Mengomposisi...</p>
                <p className="text-[10px] text-zinc-400 mt-1">Menganalisis harmoni & ritme</p>
             </div>
           ) : null}
           
           <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
             <h4 className="text-xs font-bold text-zinc-400 mb-2 uppercase">Cara Kerja</h4>
             <ul className="text-xs text-zinc-500 space-y-2">
               <li className="flex gap-2">
                 <span className="text-indigo-400">1.</span> Upload nada/humming
               </li>
               <li className="flex gap-2">
                 <span className="text-indigo-400">2.</span> Pilih Genre
               </li>
               <li className="flex gap-2">
                 <span className="text-indigo-400">3.</span> AI membuat Band Pengiring
               </li>
             </ul>
           </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="md:hidden h-16 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-900">
          <span className="font-bold">SonicStudio</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-32 scroll-smooth">
          
          {/* Chat */}
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-zinc-800 border border-zinc-700'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {/* Genre Selection UI */}
            {creationState.step === 'genre-selection' && creationState.userStem && (
              <div className="flex justify-start animate-fade-in-up">
                 <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 w-full max-w-md">
                    <p className="text-sm text-zinc-400 mb-3">Genre yang cocok untuk "{creationState.userStem.instrument}" Anda:</p>
                    <div className="flex flex-wrap gap-2">
                       {creationState.userStem.suggestedGenres.map(g => (
                         <button 
                           key={g}
                           onClick={() => handleGenreSelect(g)}
                           className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-sm font-bold transition-colors"
                         >
                           {g}
                         </button>
                       ))}
                       <button onClick={() => handleGenreSelect("Experimental")} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-full text-sm transition-colors">Lainnya</button>
                    </div>
                 </div>
              </div>
            )}
          </div>

          {/* Current Track & Multi-track Studio */}
          {currentTrack && (
             <div className="max-w-4xl mx-auto mt-8 animate-fade-in-up">
                <TrackCard 
                  track={currentTrack} 
                  isActive={isPlaying}
                  onPlay={() => setIsPlaying(!isPlaying)}
                  onToggleLayer={handleToggleLayer}
                  onVolumeChange={handleVolumeChange}
                />
             </div>
          )}
        </div>

        {/* Bottom Input / Upload Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-950/90 backdrop-blur border-t border-zinc-800">
           <div className="max-w-4xl mx-auto">
             <div className={`transition-all duration-500 overflow-hidden ${isPlaying ? 'h-24 mb-4' : 'h-0'}`}>
                <Visualizer isPlaying={isPlaying} />
             </div>

             {/* Only show upload if not currently working on a track, or allow reset */}
             <div className="flex items-center gap-4 justify-center">
                {creationState.step === 'idle' || creationState.step === 'complete' ? (
                  <>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload}
                      accept="audio/*" 
                      className="hidden" 
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      className="w-full md:w-auto py-4 text-lg shadow-xl shadow-indigo-900/20"
                      icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                    >
                      {creationState.step === 'complete' ? 'Mulai Proyek Baru' : 'Upload Senandung / Nada Dasar'}
                    </Button>
                  </>
                ) : (
                  <p className="text-zinc-500 text-sm animate-pulse">AI Agent sedang bekerja...</p>
                )}
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}