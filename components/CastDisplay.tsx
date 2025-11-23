
import React from 'react';
import { CastMember, VOICE_OPTIONS } from '../types';
import { Users, User, Mic } from 'lucide-react';

interface CastDisplayProps {
  cast: CastMember[];
}

export const CastDisplay: React.FC<CastDisplayProps> = ({ cast }) => {
  if (!cast || cast.length === 0) return null;

  return (
    <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
        <Users className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-slate-200">Detected Cast & Voices</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {cast.map((member, idx) => {
          const voiceDetails = VOICE_OPTIONS.find(v => v.name === member.voice);
          return (
            <div key={idx} className="flex items-center gap-3 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${member.name === 'Narrator' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-slate-700 text-slate-300'}`}>
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate" title={member.name}>{member.name}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Mic className="w-3 h-3" />
                  <span>{member.voice}</span>
                  {voiceDetails && <span className="opacity-50">({voiceDetails.gender})</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
