export interface TrackMetadata {
  title: string;
  genre: string;
  bpm: number;
  key: string;
  mood: string;
  description: string;
}

// Represents a single instrument track (e.g., User's Bass, AI's Drums)
export interface InstrumentLayer {
  id: string;
  name: string; // e.g., "User Bass", "AI Drums"
  type: 'user' | 'ai';
  instrument: string; // e.g., "bass", "drums", "synth"
  description: string; // generated description of what this layer plays
  isActive: boolean;
  volume: number; // 0-100
}

export interface Track {
  id: string;
  metadata: TrackMetadata;
  coverArtUrl?: string;
  audioUrl?: string; // The "Full Mix" audio
  layers: InstrumentLayer[]; // The separate stems
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  relatedTrackId?: string;
}