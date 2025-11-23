
import React, { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface InputSectionProps {
  text: string;
  setText: (text: string) => void;
  disabled: boolean;
  isPlaying: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ 
  text, 
  setText, 
  disabled, 
  isPlaying
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const truncated = content.slice(0, 50000); // Support larger files now
        setText(truncated);
        setFileName(file.name);
      };
      reader.readAsText(file);
    } else {
      alert("Please upload a .txt or .md file");
    }
  };

  const clearFile = () => {
    setText('');
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
          {isPlaying ? (
            <>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Reading in Progress
            </>
          ) : (
            <>Content to Narrate</>
          )}
        </label>
        {!isPlaying && (
          <span className="text-xs text-slate-500">
            {text.length}/50000 characters
          </span>
        )}
      </div>

      <div className="relative group h-64 md:h-80">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || isPlaying}
          placeholder="Paste a story chapter, a dialogue, or a poem here... Or upload a text file."
          className={`
            w-full h-full bg-slate-900 border border-slate-700 rounded-2xl p-4 
            text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent 
            outline-none resize-none transition-all placeholder:text-slate-600 
            font-mono text-sm leading-relaxed
            ${isPlaying ? 'opacity-75 cursor-not-allowed bg-slate-900/50' : ''}
          `}
          maxLength={50000}
        />
        
        {/* Floating Upload Button - Only show when not playing */}
        {!isPlaying && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            {fileName ? (
               <div className="flex items-center gap-2 bg-indigo-900/50 border border-indigo-500/50 px-3 py-1.5 rounded-full text-indigo-300 text-xs font-medium">
                 <FileText className="w-3 h-3" />
                 <span className="max-w-[100px] truncate">{fileName}</span>
                 <button onClick={clearFile} className="hover:text-white"><X className="w-3 h-3" /></button>
               </div>
            ) : (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".txt,.md"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-600 transition-colors shadow-lg"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Text File
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
