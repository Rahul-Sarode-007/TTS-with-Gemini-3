
/**
 * Decodes a base64 string into a Uint8Array
 */
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM audio data into an AudioBuffer.
 */
export async function decodeAudioData(
  base64Data: string,
  audioContext: AudioContext,
  sampleRate: number = 24000
): Promise<AudioBuffer> {
  const bytes = decodeBase64(base64Data);
  
  const alignedLength = bytes.length % 2 === 0 ? bytes.length : bytes.length - 1;
  const alignedBytes = bytes.subarray(0, alignedLength);

  const dataInt16 = new Int16Array(alignedBytes.buffer);
  
  const numChannels = 1;
  const frameCount = dataInt16.length / numChannels;
  
  const buffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);
  
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  
  return buffer;
}

export const getAudioContext = (): AudioContext => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  return new AudioContextClass({ sampleRate: 24000 });
};
