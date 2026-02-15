import { GoogleGenAI, Type } from "@google/genai";
import { TrackMetadata, InstrumentLayer } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to validate if API key is present
export const checkApiKey = (): boolean => !!apiKey;

/**
 * 1. Analyzes the User's Uploaded Stem (Bass, Guitar, Voice, etc.)
 */
export const analyzeStem = async (base64Audio: string, mimeType: string): Promise<{
  instrument: string;
  bpm: number;
  key: string;
  suggestedGenres: string[];
}> => {
  if (!apiKey) throw new Error("API Key missing");

  const model = "gemini-2.5-flash-native-audio-preview-12-2025";
  
  const systemInstruction = `
    You are an expert Music Producer and Composer. 
    The user will upload an audio file. It might be a professional instrument stem, OR it might be a rough voice memo, humming, whistling, or a simple melody idea.
    
    Your task:
    1. Identify the source (e.g., "User Humming", "Rough Guitar Riff", "Piano Melody").
    2. Estimate the BPM and Musical Key (Major/Minor).
    3. Suggest 3 music genres that would turn this simple idea into a hit song.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Audio } },
        { text: "Analyze this musical idea. Is it a full instrument or just a rough melody? Suggest genres." }
      ]
    },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          instrument: { type: Type.STRING, description: "e.g. 'Vocal Hum', 'Acoustic Guitar'" },
          bpm: { type: Type.INTEGER },
          key: { type: Type.STRING },
          suggestedGenres: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["instrument", "bpm", "key", "suggestedGenres"]
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text);
  }
  
  throw new Error("Failed to analyze stem");
};

/**
 * 2. Composes the Accompaniment (The rest of the band)
 */
export const composeAccompaniment = async (
  userInstrument: string, 
  genre: string, 
  bpm: number, 
  key: string
): Promise<{
  title: string;
  mood: string;
  description: string;
  layers: Array<{ name: string; instrument: string; description: string }>;
}> => {
  if (!apiKey) throw new Error("API Key missing");

  const model = "gemini-3-flash-preview";

  const prompt = `
    The user has provided a basic musical idea: "${userInstrument}".
    Target Genre: ${genre}.
    BPM: ${bpm}, Key: ${key}.

    Act as a full band arranger. Your job is to turn this simple input into a full, rich song.
    
    1. Create a catchy Title.
    2. Describe the Mood.
    3. Create 3-4 AI Accompaniment Layers to support the user's input. 
       - If the user uploaded a melody/hum, you need Chords (Piano/Synth) and Rhythm (Drums/Bass).
       - If the user uploaded drums, you need Melody and Bass.
       
    Output JSON.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          mood: { type: Type.STRING },
          description: { type: Type.STRING },
          layers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Creative name, e.g. 'Deep Bassline'" },
                instrument: { type: Type.STRING, description: "Category, e.g. 'Bass'" },
                description: { type: Type.STRING, description: "What this layer adds to the user's idea" }
              }
            }
          }
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text);
  }

  throw new Error("Failed to compose accompaniment");
};

/**
 * Generates Cover Art
 */
export const generateCoverArt = async (prompt: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");
  const model = "gemini-2.5-flash-image";
  const response = await ai.models.generateContent({
    model,
    contents: `Album cover art for a song: ${prompt}. High quality, abstract, artistic, 4k resolution.`,
  });
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("No image generated");
};