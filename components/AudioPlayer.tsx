import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Rewind, FastForward, X, Volume2 } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';

interface AudioPlayerProps {
  audioBuffer: AudioBuffer;
  onClose: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioBuffer, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = audioBuffer.duration;
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0); // AudioContext time when play started
  const offsetRef = useRef<number>(0); // Offset in buffer when play started
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
    
    // Auto-play on mount
    play(0);

    return () => {
      stop();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const play = (offset: number) => {
    if (!audioCtxRef.current) return;
    
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch(e) {}
    }

    const source = audioCtxRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtxRef.current.destination);
    source.start(0, offset);
    
    startTimeRef.current = audioCtxRef.current.currentTime;
    offsetRef.current = offset;
    sourceRef.current = source;
    
    setIsPlaying(true);
    
    source.onended = () => {
        // Check if we reached the end naturally
        if (audioCtxRef.current) {
            const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
            if (offset + elapsed >= duration - 0.1) {
                 setIsPlaying(false);
                 setCurrentTime(duration);
            }
        }
    };
  };

  const stop = () => {
    if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch(e) {}
        sourceRef.current = null;
    }
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const pause = () => {
    stop();
    // Ensure UI reflects the exact stop time
    if (audioCtxRef.current) {
       // Current time is handled by the loop, but just in case
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      // If we are at the end, restart
      if (currentTime >= duration - 0.1) {
          setCurrentTime(0);
          play(0);
      } else {
          play(currentTime);
      }
    }
  };

  const seek = (time: number) => {
    const wasPlaying = isPlaying;
    stop();
    
    const newTime = Math.max(0, Math.min(time, duration));
    setCurrentTime(newTime);
    offsetRef.current = newTime; // Update offset reference

    if (wasPlaying) {
      play(newTime);
    }
  };

  const skip = (delta: number) => {
    seek(currentTime + delta);
  };

  // Animation Loop for smooth UI updates
  useEffect(() => {
    const loop = () => {
      if (isPlaying && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        const elapsed = now - startTimeRef.current;
        const realTime = offsetRef.current + elapsed;
        
        if (realTime >= duration) {
          setCurrentTime(duration);
          setIsPlaying(false); // Stop loop
        } else {
          setCurrentTime(realTime);
          rafRef.current = requestAnimationFrame(loop);
        }
      }
    };

    if (isPlaying) {
        rafRef.current = requestAnimationFrame(loop);
    }
    
    return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
  }, [isPlaying, duration]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
      
      {/* Visualizer Area */}
      <div className="mb-6 flex justify-center items-center bg-slate-950/50 rounded-xl p-4 h-24 border border-slate-800/50 shadow-inner">
         <div className="w-full max-w-lg">
            <AudioVisualizer isPlaying={isPlaying} />
         </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-3 mb-6 px-1">
        <span className="text-xs text-slate-400 font-mono w-10 text-right">{formatTime(currentTime)}</span>
        <div className="relative flex-1 h-2 group cursor-pointer">
           {/* Background Track */}
           <div className="absolute inset-0 bg-slate-800 rounded-full overflow-hidden">
              {/* Progress Fill */}
              <div 
                className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-75 ease-linear" 
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
           </div>
           {/* Thumb Interaction Zone */}
           <input 
             type="range" 
             min={0} 
             max={duration} 
             step={0.01}
             value={currentTime}
             onChange={(e) => seek(parseFloat(e.target.value))}
             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
           />
        </div>
        <span className="text-xs text-slate-400 font-mono w-10">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-8 relative">
         <button onClick={() => skip(-10)} className="group p-2 text-slate-400 hover:text-white transition-colors flex flex-col items-center gap-1">
            <div className="p-2 rounded-full group-hover:bg-slate-800 transition-colors">
               <Rewind className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 left-0 w-full text-center">-10s</span>
         </button>
         
         <button 
           onClick={togglePlay}
           className="p-5 bg-white text-slate-950 rounded-full hover:scale-105 hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all active:scale-95"
         >
            {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
         </button>

         <button onClick={() => skip(10)} className="group p-2 text-slate-400 hover:text-white transition-colors flex flex-col items-center gap-1">
             <div className="p-2 rounded-full group-hover:bg-slate-800 transition-colors">
               <FastForward className="w-5 h-5" />
             </div>
             <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 right-0 w-full text-center">+10s</span>
         </button>

         <button 
            onClick={onClose} 
            className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-600 hover:text-red-400 p-2 rounded-full hover:bg-red-900/10 transition-colors"
            title="Close Player"
         >
             <X className="w-5 h-5" />
         </button>
      </div>
    </div>
  );
};