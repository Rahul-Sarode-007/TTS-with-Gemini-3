import React, { useState } from 'react';
import { Sparkles, AlertCircle, Loader2, BookOpen, UserCircle2 } from 'lucide-react';
import { AppStatus, CastMember } from './types';
import { analyzeCast, convertToScript, generateMultiSpeakerSpeech } from './services/geminiService';
import { decodeAudioData, getAudioContext } from './utils/audioUtils';
import { InputSection } from './components/InputSection';
import { CastDisplay } from './components/CastDisplay';
import { AudioPlayer } from './components/AudioPlayer';

const App: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Audio State
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  // Main Entry Point
  const handleGenerateAndRead = async () => {
    if (!text.trim()) return;

    setAudioBuffer(null);
    setErrorMsg(null);
    setCast([]);
    
    try {
      // 1. Analyze Cast
      setStatus(AppStatus.Analyzing);
      const detectedCast = await analyzeCast(text);
      setCast(detectedCast);
      
      // 2. Scripting (Full Text for Consistency)
      setStatus(AppStatus.Scripting);
      const fullScript = await convertToScript(text, detectedCast);

      // 3. Audio Generation (Batched internally for safety, presented as one)
      setStatus(AppStatus.Generating);
      const audioBase64 = await generateMultiSpeakerSpeech(fullScript, detectedCast);
      
      // 4. Decode & Prepare
      const ctx = getAudioContext();
      const buffer = await decodeAudioData(audioBase64, ctx);
      setAudioBuffer(buffer);

      // 5. Ready to Play (Component handles auto-play)
      setStatus(AppStatus.Playing);

    } catch (err: any) {
      console.error("App Error:", err);
      setStatus(AppStatus.Error);
      setErrorMsg(err.message || "An unexpected error occurred.");
    }
  };

  const handleClosePlayer = () => {
    setAudioBuffer(null);
    setStatus(AppStatus.Ready);
  };

  const getStatusMessage = () => {
    switch (status) {
      case AppStatus.Analyzing: return "Auditioning cast & assigning voices...";
      case AppStatus.Scripting: return "Writing script & directing tone...";
      case AppStatus.Generating: return "Recording final audio production...";
      case AppStatus.Playing: return "Now Playing";
      default: return "Ready";
    }
  };

  const isProcessing = [AppStatus.Analyzing, AppStatus.Scripting, AppStatus.Generating].includes(status);
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-8 font-sans">
      
      <header className="w-full max-w-4xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BookOpen className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              EmotiVoice Reader
            </h1>
            <p className="text-slate-400 text-sm">Full-Context AI Audio Production</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 rounded-full border border-slate-800 shadow-sm">
           <span className={`w-2 h-2 rounded-full ${status === AppStatus.Playing ? 'bg-green-500' : 'bg-slate-500'} animate-pulse`}></span>
           <span className="text-xs font-medium text-slate-300">
             {getStatusMessage()}
           </span>
        </div>
      </header>

      <main className="w-full max-w-3xl space-y-6">
        
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
          
          {(cast.length > 0 || status === AppStatus.Analyzing) && (
             <div className="mb-6">
                {status === AppStatus.Analyzing ? (
                   <div className="w-full h-24 bg-slate-800/30 rounded-xl animate-pulse flex items-center justify-center border border-slate-800 border-dashed">
                      <div className="flex items-center gap-3 text-indigo-400">
                        <UserCircle2 className="w-5 h-5 animate-bounce" />
                        <span className="text-sm">Casting roles...</span>
                      </div>
                   </div>
                ) : (
                   <CastDisplay cast={cast} />
                )}
             </div>
          )}

          <InputSection 
            text={text} 
            setText={setText} 
            disabled={status !== AppStatus.Idle && status !== AppStatus.Ready && status !== AppStatus.Error}
            isPlaying={status === AppStatus.Playing}
          />

          <div className="min-h-[3rem] mt-6 flex flex-col justify-end">
            {isProcessing && (
               <div className="flex flex-col gap-3 items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  <p className="text-sm text-slate-400 animate-pulse">{getStatusMessage()}</p>
                  
                  {/* Progress indicators for the phases */}
                  <div className="flex gap-2 mt-1">
                    <div className={`h-1.5 w-12 rounded-full transition-colors ${status === AppStatus.Analyzing ? 'bg-indigo-500 animate-pulse' : (status === AppStatus.Scripting || status === AppStatus.Generating ? 'bg-indigo-500' : 'bg-slate-800')}`} />
                    <div className={`h-1.5 w-12 rounded-full transition-colors ${status === AppStatus.Scripting ? 'bg-indigo-500 animate-pulse' : (status === AppStatus.Generating ? 'bg-indigo-500' : 'bg-slate-800')}`} />
                    <div className={`h-1.5 w-12 rounded-full transition-colors ${status === AppStatus.Generating ? 'bg-indigo-500 animate-pulse' : 'bg-slate-800'}`} />
                  </div>
               </div>
            )}

            {status === AppStatus.Error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-3 rounded-lg border border-red-500/20">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm break-words">{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Action Area */}
          <div className="mt-6">
             {audioBuffer && status === AppStatus.Playing ? (
               <AudioPlayer audioBuffer={audioBuffer} onClose={handleClosePlayer} />
             ) : (
               <div className="flex justify-end">
                 <button
                   onClick={handleGenerateAndRead}
                   disabled={isProcessing || !text}
                   className={`
                     relative overflow-hidden group w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all
                     ${isProcessing || !text 
                       ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                       : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:scale-[1.02] hover:shadow-indigo-500/25 border border-indigo-500/50'
                     }
                   `}
                 >
                   <span className="relative z-10 flex items-center justify-center gap-2">
                     {isProcessing ? (
                       <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                       </>
                     ) : (
                       <>
                        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform text-indigo-200" />
                        Generate Audio
                       </>
                     )}
                   </span>
                 </button>
               </div>
             )}
          </div>
        </div>
      </main>
      
      <footer className="mt-12 text-slate-600 text-xs text-center max-w-lg">
        <p>EmotiVoice uses <strong>Gemini 3 Pro</strong> for full-context scripting and <strong>Gemini 2.5</strong> for high-fidelity audio synthesis.</p>
      </footer>
    </div>
  );
};

export default App;