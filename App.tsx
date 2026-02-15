import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Track, InstrumentLayer } from './types';
import { INITIAL_GREETING } from './constants';
import { analyzeStem, composeAccompaniment, generateCoverArt } from './services/geminiService';
import { audioEngine } from './services/audioEngine';
import { Button } from './components/Button';
import { TrackCard } from './components/TrackCard';
import { Visualizer } from './components/Visualizer';

interface CreationState {
  step: 'idle' | 'analyzing' | 'genre-selection' | 'generating' | 'complete';
  userStem?: {
    file?: File;
    instrument: string;
    bpm: number;
    key: string;
    suggestedGenres: string[];
  };
}

interface CompositionSettings {
  emotion: string;
  timeSignature: string;
  duration: string;
}

type AppMode = 'remix' | 'generate';

export default function App() {
  const [mode, setMode] = useState<AppMode>('generate'); // Default to Generate (Suno style)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'ai', content: INITIAL_GREETING }
  ]);
  const [creationState, setCreationState] = useState<CreationState>({ step: 'idle' });
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(""); 
  
  const [compSettings, setCompSettings] = useState<CompositionSettings>({
    emotion: "Dynamic",
    timeSignature: "4/4",
    duration: "02:30"
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync Audio Engine State
  useEffect(() => {
    if (isPlaying) {
      if (currentTrack) {
        audioEngine.setBpm(currentTrack.metadata.bpm);
        audioEngine.setLayers(currentTrack.layers);
        audioEngine.start();
      }
    } else {
      audioEngine.stop();
    }
  }, [isPlaying, currentTrack]);

  // Handle Layer Updates (Mute/Volume) live
  useEffect(() => {
    if (currentTrack) {
      audioEngine.setLayers(currentTrack.layers);
    }
  }, [currentTrack]);

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

  const getAudioMimeType = (file: File): string => {
    if (file.type && file.type.startsWith('audio/')) {
       if (file.type === 'audio/x-m4a') return 'audio/mp4';
       return file.type;
    }
    return 'audio/mpeg';
  };

  // HANDLE MODE SWITCHING
  const handleModeSwitch = (newMode: AppMode) => {
    setMode(newMode);
    setCreationState({ step: 'idle' });
    setMessages([]);
    // If switching to Generate mode, immediately go to genre selection
    if (newMode === 'generate') {
       setCreationState({
         step: 'genre-selection',
         userStem: {
           instrument: "None (Text-to-Music)",
           bpm: 120, // Default
           key: "C Major", // Default
           suggestedGenres: ["Pop", "Lofi", "Synthwave", "Cinematic"]
         }
       });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Load into Engine for playback/editing
    await audioEngine.loadUserAudio(file);

    setMode('remix');
    setCreationState({ step: 'analyzing' });
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: `Uploaded Stem: ${file.name}`
    }]);

    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      content: "Analyzing audio structure..."
    }]);

    try {
      let analysis;
      if (file.size < 19 * 1024 * 1024) {
         const base64 = await fileToBase64(file);
         const mimeType = getAudioMimeType(file);
         analysis = await analyzeStem(base64, mimeType);
      } else {
         analysis = {
            instrument: "Large Audio File",
            bpm: 120,
            key: "C Major",
            suggestedGenres: ["Pop", "Electronic"]
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
        content: `Analysis Complete.\nDetected: ${analysis.instrument} | ${analysis.bpm} BPM | ${analysis.key}`
      }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: "Error analyzing file." }]);
      setCreationState({ step: 'idle' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateMusic = async (genre: string) => {
    if (creationState.step !== 'genre-selection' || !creationState.userStem) return;

    setCreationState({ ...creationState, step: 'generating' });
    
    const userMsg = customPrompt 
      ? `Prompt: ${customPrompt} (Style: ${genre})` 
      : `Generate ${genre} music`;

    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      role: 'user', 
      content: userMsg 
    }]);
    
    setMessages(prev => [...prev, { 
      id: (Date.now() + 1).toString(), 
      role: 'ai', 
      content: `Composing... \n${mode === 'generate' ? 'Generating from scratch' : 'Harmonizing with stem'}` 
    }]);

    try {
      const stem = creationState.userStem;
      
      const composition = await composeAccompaniment(
        mode === 'remix' ? stem.instrument : null, 
        genre, 
        stem.bpm, 
        stem.key,
        customPrompt,
        compSettings
      );

      const coverArt = await generateCoverArt(`${genre} ${composition.mood} music`);
      const compositionLayers = composition.layers || [];

      // Create tracks
      const layers: InstrumentLayer[] = [];
      
      // If Remix mode, add the user audio
      if (mode === 'remix') {
         layers.push({
          id: 'user-stem',
          name: `Audio Input`,
          type: 'user',
          instrument: stem.instrument,
          description: 'Original Audio (Remixable)',
          isActive: true, // Active by default now that we can mix it
          volume: 90,
          fx: { playbackRate: 1, reverb: 0, filterFreq: 20000 } // Default FX
        });
      }

      // Add AI Layers
      compositionLayers.forEach((l, i) => {
        layers.push({
          id: `ai-layer-${i}`,
          name: l.name,
          type: 'ai' as const,
          instrument: l.instrument,
          description: l.description,
          isActive: true,
          volume: 75,
          notes: l.notes
        });
      });

      const newTrack: Track = {
        id: Date.now().toString(),
        metadata: {
          title: composition.title,
          genre: genre,
          bpm: composition.bpm, // Use AI refined BPM
          key: composition.key, // Use AI refined Key
          mood: composition.mood,
          description: composition.description,
          customPrompt: customPrompt,
          timeSignature: composition.timeSignature,
          duration: composition.duration
        },
        coverArtUrl: coverArt,
        layers: layers,
        createdAt: Date.now(),
      };

      setCurrentTrack(newTrack);
      setCreationState({ step: 'complete' });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: `✅ ${composition.title} is ready.`
      }]);
      setCustomPrompt(""); 

    } catch (error) {
      console.error(error);
      setCreationState({ ...creationState, step: 'genre-selection' });
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: "Composition failed." }]);
    }
  };

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

  // Handle FX Changes (User Audio)
  const handleFxChange = (id: string, fxType: 'playbackRate' | 'filterFreq' | 'reverb', value: number) => {
    if (!currentTrack) return;
    const updatedLayers = currentTrack.layers.map(l => {
        if (l.id === id) {
            return {
                ...l,
                fx: { ...l.fx, [fxType]: value }
            };
        }
        return l;
    });
    setCurrentTrack({ ...currentTrack, layers: updatedLayers });
  };

  const handleDownload = async () => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: "Exporting MIDI..." }]);
  };

  const handleMintNFT = () => {
    if (!currentTrack) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'ai',
      content: `Minting NFT...`
    }]);

    setTimeout(() => {
       const updatedTrack: Track = {
         ...currentTrack,
         nft: {
           minted: true,
           contractAddress: "0x7a2...3f9c",
           tokenId: Math.floor(Math.random() * 10000).toString(),
           owner: "0xUserWallet..."
         }
       };
       setCurrentTrack(updatedTrack);
       setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: `✅ NFT MINTED: #${updatedTrack.nft?.tokenId}`
      }]);
    }, 1500);
  };

  const handleSubmitReview = (rating: number, comment: string) => {
    if (!currentTrack) return;
    const updatedTrack: Track = {
      ...currentTrack,
      review: { rating, comment, timestamp: Date.now() }
    };
    setCurrentTrack(updatedTrack);
  };

  // On first load, default to text mode
  useEffect(() => {
    if (creationState.step === 'idle') {
      handleModeSwitch('generate');
    }
  }, []);

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-72 border-r border-zinc-800 bg-zinc-900 hidden md:flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-indigo-500">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
            <span className="font-bold text-xl tracking-tight text-white">SonicStudio</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">Gen-AI Music Engine</p>
        </div>
        
        {/* MODE SWITCHER */}
        <div className="p-4">
           <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button 
                onClick={() => handleModeSwitch('generate')}
                className={`text-xs font-bold py-2 rounded-md transition-all ${mode === 'generate' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
              >
                Text-to-Music
              </button>
              <button 
                onClick={() => handleModeSwitch('remix')}
                className={`text-xs font-bold py-2 rounded-md transition-all ${mode === 'remix' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
              >
                Audio Remix
              </button>
           </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
           {/* COMMAND GUIDE */}
           <div className="mb-6">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Prompt Commands</h4>
              <div className="space-y-2 text-xs font-mono text-zinc-400">
                 <div className="bg-zinc-800/50 p-2 rounded border border-zinc-800">
                    <span className="text-indigo-400 font-bold">/bpm [num]</span>
                    <p className="opacity-70">Set Tempo (e.g. /bpm 140)</p>
                 </div>
                 <div className="bg-zinc-800/50 p-2 rounded border border-zinc-800">
                    <span className="text-indigo-400 font-bold">/key [name]</span>
                    <p className="opacity-70">Set Scale (e.g. /key F Minor)</p>
                 </div>
                 <div className="bg-zinc-800/50 p-2 rounded border border-zinc-800">
                    <span className="text-indigo-400 font-bold">/instrument [name]</span>
                    <p className="opacity-70">Force instrument type</p>
                 </div>
              </div>
           </div>

           <div className="p-3 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-lg border border-indigo-500/20">
             <h4 className="text-xs font-bold text-indigo-300 mb-2 uppercase">Audio Engine 2.0</h4>
             <ul className="text-xs text-zinc-500 space-y-1">
               <li>✓ 4-Layer Synthesis</li>
               <li>✓ Real-time Audio FX</li>
               <li>✓ Upload & Edit Stems</li>
             </ul>
           </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="md:hidden h-16 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-900">
          <span className="font-bold">SonicStudio</span>
          <div className="flex gap-2">
             <button onClick={() => handleModeSwitch('generate')} className={`text-xs px-2 py-1 rounded ${mode === 'generate' ? 'bg-indigo-600' : 'bg-zinc-800'}`}>Gen</button>
             <button onClick={() => handleModeSwitch('remix')} className={`text-xs px-2 py-1 rounded ${mode === 'remix' ? 'bg-indigo-600' : 'bg-zinc-800'}`}>Remix</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-40 scroll-smooth">
          
          {/* Messages / Output */}
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 border border-zinc-700 text-zinc-200'}`}>
                   <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {/* GENERATION UI */}
            {creationState.step === 'genre-selection' && creationState.userStem && (
              <div className="flex justify-start animate-fade-in-up w-full">
                 <div className="bg-zinc-900/80 backdrop-blur border border-zinc-700/50 rounded-2xl p-6 w-full max-w-3xl shadow-2xl">
                    
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
                       <span className="text-2xl">🎵</span>
                       <div>
                         <h3 className="font-bold text-white text-lg">
                           {mode === 'generate' ? 'Create from Scratch' : 'AI Accompaniment'}
                         </h3>
                         <p className="text-xs text-zinc-400">
                           {mode === 'generate' ? 'Use prompts to define style, mood, and instruments.' : 'Analyzing your uploaded stem to create backing tracks.'}
                         </p>
                       </div>
                    </div>

                    {/* Controls */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                       <div>
                         <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-2">Key</label>
                         {mode === 'remix' ? (
                            <div className="bg-zinc-950 px-3 py-2 rounded border border-zinc-800 text-sm text-zinc-300">{creationState.userStem.key} (Fixed)</div>
                         ) : (
                           <input 
                             type="text"
                             placeholder="Auto (or C Minor)"
                             className="w-full bg-zinc-950 px-3 py-2 rounded border border-zinc-800 text-sm text-white focus:border-indigo-500 outline-none"
                           />
                         )}
                       </div>
                       <div>
                         <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-2">Time Signature</label>
                         <select 
                            value={compSettings.timeSignature}
                            onChange={(e) => setCompSettings({...compSettings, timeSignature: e.target.value})}
                            className="w-full bg-zinc-950 px-3 py-2 rounded border border-zinc-800 text-sm text-white focus:border-indigo-500 outline-none"
                         >
                           <option value="4/4">4/4 Common</option>
                           <option value="3/4">3/4 Waltz</option>
                         </select>
                       </div>
                       <div>
                         <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-2">Emotion</label>
                         <select 
                            value={compSettings.emotion}
                            onChange={(e) => setCompSettings({...compSettings, emotion: e.target.value})}
                            className="w-full bg-zinc-950 px-3 py-2 rounded border border-zinc-800 text-sm text-white focus:border-indigo-500 outline-none"
                         >
                           <option value="Dynamic">Dynamic</option>
                           <option value="Epic">Epic</option>
                           <option value="Melancholic">Melancholic</option>
                           <option value="Cyberpunk">Cyberpunk</option>
                         </select>
                       </div>
                    </div>

                    <div className="mb-6">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 block">
                        Describe your song
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input 
                            type="text"
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="e.g. A fast techno track /bpm 145 /key F Minor"
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-4 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <div className="absolute right-2 top-2.5 text-[10px] text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5">
                             Try /bpm 128
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleGenerateMusic("Custom")} 
                          disabled={!customPrompt}
                          className="px-6"
                        >
                          Generate
                        </Button>
                      </div>
                    </div>

                    <p className="text-[10px] text-zinc-500 mb-2 uppercase font-bold">Or Pick a Style:</p>
                    <div className="flex flex-wrap gap-2">
                       {creationState.userStem.suggestedGenres?.map(g => (
                         <button 
                           key={g}
                           onClick={() => handleGenerateMusic(g)}
                           className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full text-xs font-bold transition-all hover:scale-105"
                         >
                           {g}
                         </button>
                       ))}
                       
                       {/* Custom Genre Input */}
                       <div className="relative">
                          <input 
                              type="text"
                              placeholder="Type custom style..."
                              className="pl-4 pr-8 py-2 bg-zinc-900/50 border border-zinc-700 rounded-full text-xs text-white placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all w-36 focus:w-48"
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                      const val = e.currentTarget.value.trim();
                                      if (val) handleGenerateMusic(val);
                                  }
                              }}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                              ↵
                          </div>
                       </div>
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
                  onFxChange={handleFxChange}
                  onDownload={handleDownload}
                  onSubmitReview={handleSubmitReview}
                  onMintNFT={handleMintNFT}
                />
             </div>
          )}
        </div>

        {/* BOTTOM FLOATING PLAYER / UPLOAD */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-950/90 backdrop-blur border-t border-zinc-800">
           <div className="max-w-4xl mx-auto">
             <div className={`transition-all duration-500 overflow-hidden ${isPlaying ? 'h-24 mb-4' : 'h-0'}`}>
                <Visualizer isPlaying={isPlaying} />
             </div>

             <div className="flex items-center gap-4 justify-center">
                {creationState.step === 'idle' && mode === 'remix' ? (
                  <>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload}
                      accept="audio/*,.mp3,.wav,.aac,.flac,.ogg,.m4a,.webm" 
                      className="hidden" 
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      className="w-full md:w-auto py-4 text-lg shadow-xl shadow-indigo-900/20"
                      icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                    >
                      Upload Audio Stem to Remix
                    </Button>
                  </>
                ) : null}

                {creationState.step === 'idle' && mode === 'generate' && (
                   <p className="text-zinc-500 text-sm">Select a style or type a prompt above to start composing.</p>
                )}

                {creationState.step === 'generating' && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-zinc-400 text-sm">Composing Track (Gemini Engine)...</p>
                  </div>
                )}
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}