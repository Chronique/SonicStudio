export interface TrackMetadata {
  title: string;
  genre: string;
  bpm: number;
  key: string;
  mood: string;
  description: string;
  customPrompt?: string; 
  timeSignature?: string;
  duration?: string;
}

export interface Note {
  pitch: number; 
  startTime: number; 
  duration: number; 
  velocity: number; 
}

export interface FxConfig {
  playbackRate?: number; // Speed/Pitch for audio files
  reverb?: number; // 0-1 wet level
  filterFreq?: number; // Lowpass cutoff Hz
  distortion?: number; // 0-100 amount
}

export interface InstrumentLayer {
  id: string;
  name: string; 
  type: 'user' | 'ai';
  instrument: string; 
  description: string; 
  isActive: boolean;
  volume: number; 
  notes?: Note[]; 
  fx?: FxConfig; // New: Audio Effects settings
}

export interface Review {
  rating: number; 
  comment: string;
  timestamp: number;
}

export interface Track {
  id: string;
  metadata: TrackMetadata;
  coverArtUrl?: string;
  audioUrl?: string; 
  layers: InstrumentLayer[]; 
  createdAt: number;
  review?: Review; 
  nft?: { 
    minted: boolean;
    contractAddress?: string;
    tokenId?: string;
    owner?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  relatedTrackId?: string;
}