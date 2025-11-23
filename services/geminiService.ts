import { GoogleGenAI, Schema, Type, Modality } from "@google/genai";
import { VoiceName, CastMember } from '../types';

// Constants for the native multi-speaker keys.
const SPEAKER_FEMALE_KEY = "Lady";
const SPEAKER_MALE_KEY = "Gentleman";

/**
 * Stage 1: The Casting Director
 */
export const analyzeCast = async (text: string): Promise<CastMember[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const analysisPrompt = `
      You are an expert Audio Casting Director.
      The production has a strict constraint: ONLY TWO VOICE ACTORS are available.
      
      Voice 1: ${VoiceName.Kore} (Female, Soothing)
      Voice 2: ${VoiceName.Fenrir} (Male, Deep/Commanding)

      Your Task:
      1. Identify the Narrator and all speaking characters.
      2. Assign EVERY character to either '${VoiceName.Kore}' or '${VoiceName.Fenrir}'.
      3. CRITICAL: Assign a distinct 'tone' to each character. 
         - If two characters share a voice (e.g., 2 Males), you MUST give them OPPOSITE tones (e.g., "Raspy/Fast" vs "Deep/Slow").
      
      Text Sample: "${text.substring(0, 10000)}..."
    `;

    const schema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the character" },
          voice: { type: Type.STRING, enum: [VoiceName.Kore, VoiceName.Fenrir], description: "Assigned voice" },
          tone: { type: Type.STRING, description: "Vocal style (e.g. 'Gruff', 'Whispering', 'High-pitched')" },
          description: { type: Type.STRING, description: "Role description" }
        },
        required: ["name", "voice", "tone"]
      }
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text || "[]";
    const cast: CastMember[] = JSON.parse(jsonText);
    
    if (!cast.find(c => c.name === 'Narrator')) {
      cast.unshift({ name: 'Narrator', voice: VoiceName.Kore, tone: 'Neutral', description: 'Default Narrator' });
    }

    return cast;
  } catch (error) {
    console.error("Cast analysis failed:", error);
    return [{ name: 'Narrator', voice: VoiceName.Kore, tone: 'Calm', description: 'Fallback Cast' }];
  }
};

/**
 * Stage 2: The Scriptwriter (Full Text)
 */
export const convertToScript = async (fullText: string, cast: CastMember[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const castInstructions = cast.map(c => 
    `- ${c.name}: Voice=${c.voice}, Base Tone="${c.tone}"`
  ).join("\n");
  
  const prompt = `
    You are a Hollywood Script Adaptor transforming a novel into a Full-Cast Audio Drama.
    
    CAST LIST:
    ${castInstructions}
    
    STRICT RULES:
    1. EVERY SINGLE LINE of text must be prefixed with a character name from the list above.
    2. If the text is descriptive (not spoken), use "Narrator:".
    3. DO NOT leave any text floating without a name prefix.
    4. CONSISTENCY IS KEY: Use the Context of the entire story to ensure the same character is always identified correctly.
    
    NATURALNESS & EMOTION (Gemini 3 Direction):
    1. Add parenthetical directions for *every* line to guide the tone.
       Example: "John: (Whispering anxiously) I don't think we should go in there."
       Example: "Narrator: (Slow, ominous) The door creaked open."
    2. Keep contractions and natural speech flow.
    
    INPUT TEXT:
    "${fullText}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return response.text || `Narrator: (Neutral) ${fullText}`;
  } catch (error) {
    console.warn("Script conversion failed", error);
    return `Narrator: (Neutral) ${fullText}`;
  }
};

// Helpers for safe Base64 manipulation to prevent 'atob' errors on concatenated strings
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Stage 3: The Performer (Full Script -> Audio)
 * Internally chunks the request if script is too long to prevent API cutoff,
 * but returns a single cohesive audio stream.
 */
export const generateMultiSpeakerSpeech = async (
  script: string, 
  cast: CastMember[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let processedScript = script;
  const sortedCast = [...cast].sort((a, b) => b.name.length - a.name.length);

  // 1. Normalize Script Labels
  sortedCast.forEach(member => {
    const targetKey = member.voice === VoiceName.Fenrir ? SPEAKER_MALE_KEY : SPEAKER_FEMALE_KEY;
    const pattern = `(?:^|\\n)\\s*\\**${escapeRegExp(member.name)}\\**:\\s*`;
    const regex = new RegExp(pattern, 'gim');
    processedScript = processedScript.replace(regex, `\n${targetKey}: `);
  });

  // 2. Fallback for unlabelled lines
  const narrator = cast.find(c => c.name === 'Narrator') || cast[0];
  const narratorKey = narrator.voice === VoiceName.Fenrir ? SPEAKER_MALE_KEY : SPEAKER_FEMALE_KEY;
  
  const lines = processedScript.split('\n');
  const cleanedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith(SPEAKER_FEMALE_KEY + ':') || trimmed.startsWith(SPEAKER_MALE_KEY + ':')) {
      return line;
    }
    return `${narratorKey}: ${trimmed}`;
  });
  processedScript = cleanedLines.join('\n');

  // 3. Batch Processing
  // The Gemini output token limit (approx 8192) can be exceeded by long audio.
  // We split the script safely to ensure successful generation.
  const CHUNK_SIZE = 4000; // Characters ~ 3-4 mins of audio
  const scriptChunks = splitScriptSafely(processedScript, CHUNK_SIZE);
  
  const audioParts: Uint8Array[] = [];

  for (const chunk of scriptChunks) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ role: 'user', parts: [{ text: chunk }] }],
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: SPEAKER_FEMALE_KEY,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: VoiceName.Kore } }
              },
              {
                speaker: SPEAKER_MALE_KEY,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: VoiceName.Fenrir } }
              }
            ]
          }
        },
      },
    });

    const base64Part = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Part) {
      // Decode immediately to handle padding correctly later
      audioParts.push(base64ToUint8Array(base64Part));
    }
  }

  if (audioParts.length === 0) throw new Error("No audio generated.");

  // 4. Concatenate Byte Arrays
  // We must concatenate the raw bytes, not the base64 strings, to avoid invalid padding in the middle.
  const totalLength = audioParts.reduce((acc, part) => acc + part.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of audioParts) {
    combined.set(part, offset);
    offset += part.length;
  }

  // 5. Return a single valid Base64 string
  return uint8ArrayToBase64(combined);
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitScriptSafely(script: string, maxLength: number): string[] {
  const chunks: string[] = [];
  const lines = script.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    if ((currentChunk.length + line.length) > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  
  return chunks;
}