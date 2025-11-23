
export enum VoiceName {
  Kore = 'Kore',
  Fenrir = 'Fenrir',
}

export interface VoiceOption {
  name: VoiceName;
  label: string;
  description: string;
  gender: 'Male' | 'Female';
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { name: VoiceName.Kore, label: 'Kore', description: 'Soothing, Storyteller', gender: 'Female' },
  { name: VoiceName.Fenrir, label: 'Fenrir', description: 'Intense, Commanding', gender: 'Male' },
];

export enum AppStatus {
  Idle = 'idle',
  Analyzing = 'analyzing', // Analyzing cast
  Scripting = 'scripting', // Converting prose to script
  Generating = 'generating', // Generating audio
  Ready = 'ready',
  Playing = 'playing',
  Error = 'error',
}

export interface CastMember {
  name: string;
  voice: VoiceName;
  tone?: string; // Added to distinguishing characters with the same voice
  description?: string; 
}
