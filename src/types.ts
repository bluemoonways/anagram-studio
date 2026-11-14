export interface AnagramResult {
  word: string;
  definition?: string;
  partOfSpeech?: string;
  length: number;
  score: number;
}
export interface CreativeAnagramPhrase {
  phrase: string;
  theme?: string;
  note?: string;
}
export type ToolMode = 'solver' | 'generator' | 'challenge' | 'visualizer';