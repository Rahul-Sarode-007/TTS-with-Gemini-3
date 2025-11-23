import React from 'react';
import { VoiceName, VOICE_OPTIONS } from '../types';
import { Mic2 } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onSelect: (voice: VoiceName) => void;
  disabled: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onSelect, disabled }) => {
  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
        <Mic2 className="w-4 h-4" />
        Narrator Voice
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {VOICE_OPTIONS.map((voice) => (
          <button
            key={voice.name}
            onClick={() => onSelect(voice.name)}
            disabled={disabled}
            className={`
              relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200
              ${selectedVoice === voice.name 
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="font-semibold text-sm">{voice.label}</span>
            <span className="text-[10px] opacity-70 mt-1">{voice.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
