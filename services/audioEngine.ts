import { InstrumentLayer, Note, FxConfig } from "../types";

// Types for our internal scheduler
interface ScheduledNote {
  note: Note;
  layerId: string;
  instrument: string;
  absoluteTime: number; 
}

class SonicAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private layers: InstrumentLayer[] = [];
  private tempo: number = 120;
  
  // User Audio State
  private userAudioBuffer: AudioBuffer | null = null;
  private userSourceNode: AudioBufferSourceNode | null = null;
  private userGainNode: GainNode | null = null;
  private userFilterNode: BiquadFilterNode | null = null;
  private userReverbNode: ConvolverNode | null = null;
  private userReverbGain: GainNode | null = null; // Wet level

  // Scheduling variables
  private nextNoteTime: number = 0;
  private currentBeat: number = 0;
  private timerID: number | undefined;
  private lookahead: number = 25.0; 
  private scheduleAheadTime: number = 0.1; 

  // Master Chain
  private masterGain: GainNode | null = null;
  private masterDelay: DelayNode | null = null;
  private masterFeedback: GainNode | null = null;

  constructor() {
    // Initialize lazily
  }

  private initAudio() {
    if (!this.ctx) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Master FX Chain
      this.masterGain = this.ctx!.createGain();
      this.masterGain.gain.value = 0.4; 

      this.masterDelay = this.ctx!.createDelay();
      this.masterDelay.delayTime.value = 0.3; 
      this.masterFeedback = this.ctx!.createGain();
      this.masterFeedback.gain.value = 0.2; 

      this.masterGain.connect(this.ctx!.destination);
      this.masterGain.connect(this.masterDelay);
      this.masterDelay.connect(this.masterFeedback);
      this.masterFeedback.connect(this.masterDelay);
      this.masterDelay.connect(this.ctx!.destination);

      // Create Reverb Buffer (Impulse Response)
      this.createImpulseResponse();
    }
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Generate a simple impulse response for reverb
  private createImpulseResponse() {
    if (!this.ctx) return;
    const rate = this.ctx.sampleRate;
    const length = rate * 2.0; // 2 seconds
    const decay = 2.0;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const impulseL = impulse.getChannelData(0);
    const impulseR = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const n = i / length;
        impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
        impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
    }
    this.userReverbNode = this.ctx.createConvolver();
    this.userReverbNode.buffer = impulse;
  }

  public async loadUserAudio(file: File) {
    this.initAudio();
    if (!this.ctx) return;
    const arrayBuffer = await file.arrayBuffer();
    try {
        this.userAudioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    } catch(e) {
        console.error("Error decoding audio", e);
    }
  }

  public setLayers(layers: InstrumentLayer[]) {
    this.layers = layers;
    // Update live FX for user audio if playing
    const userLayer = layers.find(l => l.type === 'user');
    if (userLayer && this.isPlaying) {
        this.updateUserAudioFX(userLayer);
    }
  }

  public setBpm(bpm: number) {
    this.tempo = bpm;
  }

  public start() {
    this.initAudio();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.ctx!.currentTime + 0.1;

    // Start User Audio Loop
    this.startUserAudio();
    
    // Start MIDI Scheduler
    this.scheduler();
  }

  public stop() {
    this.isPlaying = false;
    window.clearTimeout(this.timerID);
    
    // Stop User Audio
    if (this.userSourceNode) {
        try { this.userSourceNode.stop(); } catch(e) {}
        this.userSourceNode = null;
    }
  }

  private startUserAudio() {
    if (!this.ctx || !this.userAudioBuffer) return;

    const userLayer = this.layers.find(l => l.type === 'user');
    if (!userLayer || !userLayer.isActive) return;

    this.userSourceNode = this.ctx.createBufferSource();
    this.userSourceNode.buffer = this.userAudioBuffer;
    this.userSourceNode.loop = true;

    // Create FX Chain for User Audio
    this.userGainNode = this.ctx.createGain();
    this.userFilterNode = this.ctx.createBiquadFilter();
    this.userFilterNode.type = 'lowpass';
    
    // Reverb send
    this.userReverbGain = this.ctx.createGain();

    // Connect: Source -> Filter -> Gain -> Master
    this.userSourceNode.connect(this.userFilterNode);
    this.userFilterNode.connect(this.userGainNode);
    this.userGainNode.connect(this.masterGain!); // Dry

    // Connect: Source -> Filter -> ReverbGain -> Reverb -> Master (Wet)
    this.userFilterNode.connect(this.userReverbGain);
    if (this.userReverbNode) {
        this.userReverbGain.connect(this.userReverbNode);
        this.userReverbNode.connect(this.masterGain!);
    }

    // Apply Initial Settings
    this.updateUserAudioFX(userLayer);

    this.userSourceNode.start(0); // Start immediately for demo sync
  }

  private updateUserAudioFX(layer: InstrumentLayer) {
    if (!this.ctx) return;

    // Volume
    if (this.userGainNode) {
        // Smooth transition
        const val = layer.isActive ? (layer.volume / 100) : 0;
        this.userGainNode.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
    }

    // FX: Playback Rate (Speed/Pitch)
    if (this.userSourceNode && layer.fx?.playbackRate) {
        this.userSourceNode.playbackRate.setTargetAtTime(layer.fx.playbackRate, this.ctx.currentTime, 0.1);
    }

    // FX: Filter Frequency
    if (this.userFilterNode) {
        const freq = layer.fx?.filterFreq || 20000;
        this.userFilterNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    }

    // FX: Reverb Wet Level
    if (this.userReverbGain) {
        const wet = layer.fx?.reverb || 0;
        this.userReverbGain.gain.setTargetAtTime(wet, this.ctx.currentTime, 0.1);
    }
  }

  // The scheduling loop (UNCHANGED for MIDI)
  private scheduler() {
    if (!this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNotesForBeat(this.currentBeat, this.nextNoteTime);
      this.nextNote();
    }
    if (this.isPlaying) {
      this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
    }
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; 
    this.currentBeat += 0.25;
    if (this.currentBeat >= 16) {
        this.currentBeat = 0;
    }
  }

  private scheduleNotesForBeat(beat: number, time: number) {
    this.layers.forEach(layer => {
      if (!layer.isActive || !layer.notes || layer.type === 'user') return; // User audio handled separately

      layer.notes.forEach(note => {
        if (Math.abs(note.startTime - beat) < 0.1) {
          this.playNote(note, layer.instrument, time, layer.volume);
        }
      });
    });
  }

  private playNote(note: Note, instrument: string, time: number, volume: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const type = instrument.toLowerCase();
    const freq = this.midiToFreq(note.pitch);
    osc.frequency.value = freq;
    const vol = (volume / 100) * (note.velocity / 127);

    // Synthesis Logic (Simplified for brevity as it was in previous version)
    if (type.includes("kick") || type.includes("drum")) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gainNode.gain.setValueAtTime(vol, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.start(time);
        osc.stop(time + 0.5);
    } 
    else if (type.includes("bass")) {
        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, time);
        gainNode.gain.setValueAtTime(vol, time);
        gainNode.gain.setTargetAtTime(0, time + note.duration * 0.4, 0.1);
        osc.start(time);
        osc.stop(time + (note.duration * (60/this.tempo))); 
    } 
    else {
        osc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, time);
        gainNode.gain.setValueAtTime(vol * 0.5, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.start(time);
        osc.stop(time + 1);
    }
  }

  private midiToFreq(m: number): number {
    return 440 * Math.pow(2, (m - 69) / 12);
  }
}

export const audioEngine = new SonicAudioEngine();
