
/**
 * Splits text into chunks. 
 * Increased default length to 4000.
 * Larger chunks provide better context for the AI to identify speakers correctly (solving "Narrator drift").
 * Since we pipeline the generation, the user only waits for the first chunk.
 */
export function chunkText(text: string, targetLength: number = 4000): string[] {
  // Regex to match sentence endings (. ? ! followed by space or newline)
  const sentenceRegex = /[^.!?\n]+[.!?\n]+\s*/g;
  
  const sentences = text.match(sentenceRegex);
  
  // If no sentences found just return the text as one chunk
  if (!sentences) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    // If adding this sentence would exceed the target length...
    if (currentChunk.length + sentence.length > targetLength && currentChunk.length > 0) {
      // Push the current accumulated chunk
      chunks.push(currentChunk.trim());
      // Start a new chunk with the current sentence
      currentChunk = sentence;
    } else {
      // Otherwise, add sentence to current chunk
      currentChunk += sentence;
    }
  }

  // Add any remaining text
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
