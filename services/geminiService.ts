import { GoogleGenAI, Type } from "@google/genai";
import { TrackMetadata, InstrumentLayer } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const checkApiKey = (): boolean => !!apiKey;

const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return clean;
};

export const analyzeStem = async (base64Audio: string, mimeType: string): Promise<{
  instrument: string;
  bpm: number;
  key: string;
  suggestedGenres: string[];
}> => {
  if (!apiKey) throw new Error("API Key missing");

  const model = "gemini-3-flash-preview";
  
  const promptText = `
    Listen to this audio file carefully. You are an expert music producer agent.
    1. Identify the primary instrument or sound source.
    2. Estimate the BPM.
    3. Detect the Musical Key.
    4. Suggest 3 music genres.

    Return ONLY raw JSON:
    { "instrument": "string", "bpm": number, "key": "string", "suggestedGenres": ["string", "string", "string"] }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Audio } },
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 1024,
      }
    });

    const text = cleanJson(response.text || "{}");
    const parsed = JSON.parse(text);
    
    return {
      instrument: parsed.instrument || "Detected Audio",
      bpm: Number(parsed.bpm) || 120,
      key: parsed.key || "C Major",
      suggestedGenres: Array.isArray(parsed.suggestedGenres) ? parsed.suggestedGenres : ["Pop", "Electronic", "Ambient"]
    };

  } catch (e) {
    console.error("Analysis failed", e);
    return {
      instrument: "Detected Audio",
      bpm: 120,
      key: "C Major",
      suggestedGenres: ["Lo-Fi", "Pop", "Ambient"]
    };
  }
};

export const composeAccompaniment = async (
  userInstrument: string | null, // Null means Text-to-Music mode
  genre: string, 
  bpm: number, 
  key: string,
  customInstruction?: string,
  settings?: { duration: string; timeSignature: string; emotion: string }
): Promise<{
  title: string;
  mood: string;
  description: string;
  timeSignature: string;
  duration: string;
  bpm: number;
  key: string;
  layers: Array<{ name: string; instrument: string; description: string; notes: any[] }>;
}> => {
  if (!apiKey) throw new Error("API Key missing");

  const model = "gemini-3-flash-preview";

  // Handle Slash Commands extraction from customInstruction
  let finalBpm = bpm;
  let finalKey = key;
  let instruction = customInstruction || "";

  // Simple regex parsing for overrides in prompt
  const bpmMatch = instruction.match(/\/bpm\s+(\d+)/i);
  if (bpmMatch) finalBpm = parseInt(bpmMatch[1]);

  const keyMatch = instruction.match(/\/key\s+([a-zA-Z#]+\s*(?:Major|Minor)?)/i);
  if (keyMatch) finalKey = keyMatch[1];

  const mode = userInstrument ? "Remix/Backing Track" : "Text-to-Song Generation";
  const inputContext = userInstrument 
    ? `- User Input Stem: ${userInstrument}` 
    : `- Mode: GENERATE FROM SCRATCH (No audio input)`;

  const emotion = settings?.emotion || "Dynamic";
  const timeSig = settings?.timeSignature || "4/4";

  // STRICTER PROMPT FOR MUSICALITY
  const prompt = `
    You are 'Suno-Agent', a generative music AI.
    
    Configuration:
    ${inputContext}
    - Genre/Style: ${genre}
    - Target BPM: ${finalBpm}
    - Target Key: ${finalKey}
    - Time Sig: ${timeSig}
    - Emotion: ${emotion}
    - User Prompt: ${instruction}

    Task:
    Compose a rich 4-layer arrangement (2 bars, 8 beats).
    
    Rules for MIDI Generation:
    1. STRICTLY follow the Scale of ${finalKey}.
    2. Quantize startTimes to 0.0, 0.25, 0.5, 0.75.
    3. If 'Text-to-Song', create a Lead Melody layer.
    4. "Bass": Root notes (Pitch 36-48).
    5. "Harmony": Triads/Chords (Pitch 48-64).
    6. "Drums": Kick(36), Snare(38), HiHat(42).
    7. "Lead": Melody (Pitch 60-84).

    Return JSON:
    {
      "title": "Song Title",
      "mood": "Mood",
      "description": "Short description",
      "timeSignature": "${timeSig}",
      "duration": "02:30",
      "bpm": ${finalBpm},
      "key": "${finalKey}",
      "layers": [
        { 
          "name": "Bass", 
          "instrument": "Bass", 
          "description": " sawtooth",
          "notes": [ { "pitch": 36, "startTime": 0.0, "duration": 0.5, "velocity": 100 } ]
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192, 
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            mood: { type: Type.STRING },
            description: { type: Type.STRING },
            timeSignature: { type: Type.STRING },
            duration: { type: Type.STRING },
            bpm: { type: Type.NUMBER },
            key: { type: Type.STRING },
            layers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  instrument: { type: Type.STRING },
                  description: { type: Type.STRING },
                  notes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        pitch: { type: Type.NUMBER },
                        startTime: { type: Type.NUMBER },
                        duration: { type: Type.NUMBER },
                        velocity: { type: Type.NUMBER }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      const text = cleanJson(response.text);
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (parseError) {
        throw new Error("Invalid JSON response from AI");
      }

      const layers = Array.isArray(parsed.layers) ? parsed.layers : [];
      
      return {
        title: parsed.title || "Untitled Composition",
        mood: parsed.mood || emotion,
        description: parsed.description || "Generated by SonicStudio",
        timeSignature: parsed.timeSignature || "4/4",
        duration: parsed.duration || "02:30",
        bpm: parsed.bpm || finalBpm,
        key: parsed.key || finalKey,
        layers: layers
      };
    }
  } catch (error) {
    console.error("Composition failed", error);
  }

  // Fallback
  return {
    title: "Untitled Session",
    mood: "Deep Focus",
    description: "AI arrangement generated by SonicStudio.",
    timeSignature: "4/4",
    duration: "02:00",
    bpm: finalBpm,
    key: finalKey,
    layers: [
        { name: "Bass", instrument: "Bass", description: "Fallback Bass", notes: [{pitch: 36, startTime: 0, duration: 1, velocity: 100}] },
    ]
  };
};

export const generateCoverArt = async (prompt: string): Promise<string> => {
  const query = encodeURIComponent(prompt.split(' ').slice(0, 3).join(' '));
  return `https://source.unsplash.com/random/800x800/?abstract,music,${query}`;
};
