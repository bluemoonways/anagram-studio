import { COMMON_DICTIONARY } from './dictionary';
import { AnagramResult } from './types';
// Quick letter count map
export function getCharFrequency(str: string): Record<string, number> {
  const freq: Record<string, number> = {};
  const clean = str.toLowerCase().replace(/[^a-z]/g, '');
  for (const ch of clean) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  return freq;
}
export function sortWordLetters(str: string): string {
  return str.toLowerCase().replace(/[^a-z]/g, '').split('').sort().join('');
}
// Check if candidate can be formed using available letters (subset anagram)
export function canFormWord(candidate: string, sourceFreq: Record<string, number>): boolean {
  const candFreq: Record<string, number> = {};
  for (const ch of candidate) {
    candFreq[ch] = (candFreq[ch] || 0) + 1;
    if ((candFreq[ch] || 0) > (sourceFreq[ch] || 0)) {
      return false;
    }
  }
  return true;
}
// Scrabble style scoring
export const LETTER_SCORES: Record<string, number> = {
  a: 1, e: 1, i: 1, o: 1, u: 1, l: 1, n: 1, s: 1, t: 1, r: 1,
  d: 2, g: 2,
  b: 3, c: 3, m: 3, p: 3,
  f: 4, h: 4, v: 4, w: 4, y: 4,
  k: 5,
  j: 8, x: 8,
  q: 10, z: 10
};
export function calculateWordScore(word: string): number {
  return word.toLowerCase().split('').reduce((sum, ch) => sum + (LETTER_SCORES[ch] || 1), 0);
}
// Fast anagram search across local dictionary
export function findLocalAnagrams(query: string, mode: 'exact' | 'subwords' = 'exact'): AnagramResult[] {
  const clean = query.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return [];
  const querySorted = sortWordLetters(clean);
  const queryFreq = getCharFrequency(clean);
  const results: AnagramResult[] = [];
  const seen = new Set<string>();
  for (const word of COMMON_DICTIONARY) {
    if (word === clean) continue; // exclude exact identical word if looking for new forms
    if (seen.has(word)) continue;
    if (mode === 'exact') {
      if (word.length === clean.length && sortWordLetters(word) === querySorted) {
        seen.add(word);
        results.push({
          word,
          length: word.length,
          score: calculateWordScore(word),
        });
      }
    } else {
      // Subwords
      if (word.length <= clean.length && canFormWord(word, queryFreq)) {
        seen.add(word);
        results.push({
          word,
          length: word.length,
          score: calculateWordScore(word),
        });
      }
    }
  }
  // Sort by score or length descending
  return results.sort((a, b) => b.length - a.length || b.score - a.score || a.word.localeCompare(b.word));
}
// Shuffle letters helper
export function shuffleWord(word: string): string {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const res = arr.join('');
  return res === word && word.length > 1 ? shuffleWord(word) : res;
}