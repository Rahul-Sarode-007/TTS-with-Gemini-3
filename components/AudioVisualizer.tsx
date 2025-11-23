import React from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying }) => {
  // Generate random heights for the bars
  const bars = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div className="flex items-center justify-center gap-1 h-12 w-full overflow-hidden">
      {bars.map((i) => (
        <div
          key={i}
          className={`visualizer-bar w-1.5 bg-indigo-400 rounded-full ${
            isPlaying ? 'animate-pulse' : 'h-1'
          }`}
          style={{
            height: isPlaying ? `${Math.max(15, Math.random() * 100)}%` : '4px',
            opacity: isPlaying ? 0.8 : 0.3,
            animationDuration: `${0.5 + Math.random() * 0.5}s`
          }}
        />
      ))}
    </div>
  );
};
