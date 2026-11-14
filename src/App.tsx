import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Shuffle,
  Copy,
  Check,
  Trophy,
  Brain,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Layers,
  HelpCircle,
  Download,
  Flame,
  Award,
  BookOpen
} from 'lucide-react';
import { findLocalAnagrams, shuffleWord, sortWordLetters, LETTER_SCORES } from './anagramUtils';
import { FAMOUS_ANAGRAMS, COMMON_DICTIONARY } from './dictionary';
import { AnagramResult, ToolMode } from './types';

function getRemainingSortedLetters(sourceCounts: Record<string, number>, word: string): string | null {
  const rem: Record<string, number> = { ...sourceCounts };
  for (const ch of word) {
    if (!rem[ch] || rem[ch] <= 0) return null;
    rem[ch]--;
  }
  let leftover = '';
  for (const ch of Object.keys(rem).sort()) {
    leftover += ch.repeat(rem[ch]);
  }
  return leftover;
}

export default function App() {
  // Navigation / Modes
  const [activeMode, setActiveMode] = useState<ToolMode>('solver');
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Solver State
  const [solverInput, setSolverInput] = useState<string>('cinema');
  const [solverSearchType, setSolverSearchType] = useState<'exact' | 'subwords'>('subwords');
  const [minLength, setMinLength] = useState<number>(3);
  const [copiedWord, setCopiedWord] = useState<string | null>(null);

  // Creative Anagrams Generator State
  const [creativeInput, setCreativeInput] = useState<string>('dormitory');
  const [creativeTheme, setCreativeTheme] = useState<string>('witty and ironic');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiAnagrams, setAiAnagrams] = useState<Array<{ phrase: string; explanation: string }>>([
    { phrase: 'dirty room', explanation: 'Classic dorm room condition using all 9 letters' }
  ]);

  // Challenge / Quiz Game State
  const [gameScore, setGameScore] = useState<number>(0);
  const [gameStreak, setGameStreak] = useState<number>(0);
  const [targetSecretWord, setTargetSecretWord] = useState<string>('planet');
  const [scrambledLetters, setScrambledLetters] = useState<string[]>(['p', 'l', 'a', 'n', 'e', 't']);
  const [userGuess, setUserGuess] = useState<string>('');
  const [gameStatus, setGameStatus] = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle');
  const [gameHint, setGameHint] = useState<string>('');
  const [isGeneratingHint, setIsGeneratingHint] = useState<boolean>(false);

  // Visualizer / Tile Scrambler State
  const [scramblePhrase, setScramblePhrase] = useState<string>('ASTRO NOMER');
  const [tileLetters, setTileLetters] = useState<Array<{ id: number; char: string; origPos: number }>>([]);
  const [draggedTileIdx, setDraggedTileIdx] = useState<number | null>(null);

  // Initialize Tile Visualizer
  useEffect(() => {
    const chars = scramblePhrase.toUpperCase().split('');
    setTileLetters(chars.map((char, idx) => ({ id: idx, char, origPos: idx })));
  }, [scramblePhrase]);

  // Setup initial challenge word
  const initNewChallenge = (target?: string) => {
    let word = target;
    if (!word) {
      const candidates = COMMON_DICTIONARY.filter(w => w.length >= 5 && w.length <= 8 && /^[a-z]+$/.test(w));
      word = candidates[Math.floor(Math.random() * candidates.length)] || 'wonder';
    }
    setTargetSecretWord(word);
    const scrambled = shuffleWord(word).split('');
    setScrambledLetters(scrambled);
    setUserGuess('');
    setGameStatus('idle');
    setGameHint('');
  };

  useEffect(() => {
    initNewChallenge('planet');
  }, []);

  // Compute local anagram results
  const solverResults = useMemo(() => {
    const list = findLocalAnagrams(solverInput, solverSearchType);
    return list.filter(item => item.length >= minLength);
  }, [solverInput, solverSearchType, minLength]);

  // Group anagrams by length for clear layout
  const groupedResults = useMemo(() => {
    const map = new Map<number, AnagramResult[]>();
    for (const item of solverResults) {
      const arr = map.get(item.length) || [];
      arr.push(item);
      map.set(item.length, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [solverResults]);

  // Copy word helper
  const handleCopy = (word: string) => {
    navigator.clipboard.writeText(word);
    setCopiedWord(word);
    setTimeout(() => setCopiedWord(null), 1800);
  };

  // Offline Phrase & Multi-Word Anagram Generator
  const generateAiAnagrams = () => {
    const clean = creativeInput.toLowerCase().replace(/[^a-z]/g, '');
    if (!clean) return;

    setIsAiGenerating(true);
    setTimeout(() => {
      const results: Array<{ phrase: string; explanation: string }> = [];
      const seen = new Set<string>([clean]);
      const sortedTarget = sortWordLetters(clean);

      // 1. Check famous historical anagrams first
      for (const item of FAMOUS_ANAGRAMS) {
        const origClean = item.original.toLowerCase().replace(/[^a-z]/g, '');
        const anaClean = item.anagram.toLowerCase().replace(/[^a-z]/g, '');
        if (origClean === clean && !seen.has(anaClean)) {
          seen.add(anaClean);
          results.push({ phrase: item.anagram, explanation: item.note });
        } else if (anaClean === clean && !seen.has(origClean)) {
          seen.add(origClean);
          results.push({ phrase: item.original, explanation: item.note });
        }
      }

      // 2. Build dictionary map for exact single & two-word phrase anagrams
      const sourceCounts: Record<string, number> = {};
      for (const ch of clean) {
        sourceCounts[ch] = (sourceCounts[ch] || 0) + 1;
      }

      const bySorted = new Map<string, string[]>();
      const validSubwords: string[] = [];

      for (const rawWord of COMMON_DICTIONARY) {
        const w = rawWord.toLowerCase().trim();
        if (w.length < 2 || w.length > clean.length || !/^[a-z]+$/.test(w)) continue;
        const rem = getRemainingSortedLetters(sourceCounts, w);
        if (rem !== null) {
          validSubwords.push(w);
          const s = sortWordLetters(w);
          const arr = bySorted.get(s) || [];
          if (!arr.includes(w)) arr.push(w);
          bySorted.set(s, arr);
        }
      }

      // Exact single-word anagrams
      const exactWords = bySorted.get(sortedTarget) || [];
      for (const w of exactWords) {
        if (!seen.has(w) && results.length < 6) {
          seen.add(w);
          results.push({
            phrase: w,
            explanation: `Exact ${clean.length}-letter anagram (${creativeTheme})`
          });
        }
      }

      // Exact two-word phrase anagrams
      for (const w1 of validSubwords) {
        if (results.length >= 6) break;
        const leftover = getRemainingSortedLetters(sourceCounts, w1);
        if (!leftover || leftover.length < 2) continue;
        const partners = bySorted.get(leftover) || [];
        for (const w2 of partners) {
          const pairKey = [w1, w2].sort().join('|');
          if (!seen.has(pairKey)) {
            seen.add(pairKey);
            results.push({
              phrase: `${w1} ${w2}`,
              explanation: `Two-word rearrangement using all ${clean.length} letters (${creativeTheme})`
            });
            break;
          }
        }
      }

      if (results.length > 0) {
        setAiAnagrams(results.slice(0, 6));
      } else {
        setAiAnagrams([
          {
            phrase: shuffleWord(clean),
            explanation: `No exact dictionary phrase found for "${creativeInput}" — try a preset or shorter phrase.`
          }
        ]);
      }
      setIsAiGenerating(false);
    }, 200);
  };

  // Smart Clue Generator for Quiz mode
  const getAiGameHint = () => {
    if (gameHint || isGeneratingHint) return;
    setIsGeneratingHint(true);
    const vowels = targetSecretWord.match(/[aeiou]/gi)?.length || 0;
    const first = targetSecretWord[0].toUpperCase();
    const last = targetSecretWord[targetSecretWord.length - 1].toUpperCase();
    setGameHint(
      `Starts with "${first}", ends with "${last}", has ${targetSecretWord.length} letters and ${vowels} vowel${vowels === 1 ? '' : 's'}.`
    );
    setIsGeneratingHint(false);
  };

  // Handle Challenge submit
  const handleCheckGuess = () => {
    if (!userGuess.trim()) return;
    const cleanGuess = userGuess.trim().toLowerCase();
    if (cleanGuess === targetSecretWord.toLowerCase()) {
      setGameStatus('correct');
      setGameScore(s => s + 10 + targetSecretWord.length * 2);
      setGameStreak(s => s + 1);
    } else {
      if (sortWordLetters(cleanGuess) === sortWordLetters(targetSecretWord) && COMMON_DICTIONARY.includes(cleanGuess)) {
        setGameStatus('correct');
        setGameScore(s => s + 8 + targetSecretWord.length * 2);
        setGameStreak(s => s + 1);
      } else {
        setGameStatus('wrong');
        setGameStreak(0);
      }
    }
  };

  // Export current anagram list to plain text file
  const handleExportList = () => {
    const textContent =
      `Anagram Studio Export for "${solverInput}"\n` +
      `Generated: ${new Date().toLocaleString()}\n` +
      `Total Anagrams Found: ${solverResults.length}\n\n` +
      solverResults.map(r => `${r.word.toUpperCase()} (${r.length} letters, ${r.score} pts)`).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anagrams_${solverInput.toLowerCase().replace(/[^a-z]/g, '') || 'words'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Tile visualizer shuffle
  const shuffleTiles = () => {
    setTileLetters(prev => {
      const copy = [...prev];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
  };

  // Swap tile positions for drag and drop visualizer
  const handleTileDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedTileIdx === null || draggedTileIdx === targetIdx) return;
    const newTiles = [...tileLetters];
    const [moved] = newTiles.splice(draggedTileIdx, 1);
    newTiles.splice(targetIdx, 0, moved);
    setTileLetters(newTiles);
    setDraggedTileIdx(targetIdx);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0f17] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-amber-500/30 overflow-hidden">
      {/* Top Navigation & Brand Strip */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#141724] border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-black text-base tracking-tighter">
            A⇄
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wide text-white">ANAGRAM STUDIO</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                PRO SOLVER & LAB
              </span>
            </div>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 bg-[#0d0f17] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveMode('solver')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'solver'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Search size={14} />
            <span>Solver</span>
          </button>
          <button
            onClick={() => setActiveMode('generator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'generator'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles size={14} />
            <span>Phrase Lab</span>
          </button>
          <button
            onClick={() => setActiveMode('challenge')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'challenge'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Trophy size={14} />
            <span>Challenge</span>
          </button>
          <button
            onClick={() => setActiveMode('visualizer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'visualizer'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers size={14} />
            <span>Tiles</span>
          </button>
        </div>

        {/* Right Aux CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInfoModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-colors"
            title="About Anagram Studio"
          >
            <HelpCircle size={14} />
            <span className="hidden sm:inline">Guide</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        {/* MODE 1: SOLVER */}
        {activeMode === 'solver' && (
          <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
            {/* Search Bar & Controls */}
            <div className="p-4 md:p-5 rounded-2xl bg-[#141724] border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    value={solverInput}
                    onChange={(e) => setSolverInput(e.target.value)}
                    placeholder="Enter letters or word (e.g. cinema, silent, creative)..."
                    className="w-full pl-10 pr-24 py-3 bg-[#0d0f17] border border-slate-700 rounded-xl text-white font-medium placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-base"
                  />
                  <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
                    <button
                      onClick={() => setSolverInput(shuffleWord(solverInput || 'anagram'))}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Scramble input"
                    >
                      <Shuffle size={16} />
                    </button>
                    {solverInput && (
                      <button
                        onClick={() => setSolverInput('')}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const presets = ['orchestra', 'conversation', 'astronomer', 'signature', 'danger', 'triangle', 'creative', 'listen'];
                      const pick = presets[Math.floor(Math.random() * presets.length)];
                      setSolverInput(pick);
                    }}
                    className="flex items-center gap-1.5 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors whitespace-nowrap"
                  >
                    <Shuffle size={14} className="text-amber-400" />
                    <span>Random Word</span>
                  </button>
                  <button
                    onClick={handleExportList}
                    disabled={solverResults.length === 0}
                    className="flex items-center gap-1.5 px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors whitespace-nowrap"
                    title="Export results"
                  >
                    <Download size={14} className="text-amber-400" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Filters & Options */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-[#0d0f17] p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setSolverSearchType('subwords')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        solverSearchType === 'subwords' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'hover:text-white'
                      }`}
                    >
                      All Valid Words (Subwords)
                    </button>
                    <button
                      onClick={() => setSolverSearchType('exact')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        solverSearchType === 'exact' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'hover:text-white'
                      }`}
                    >
                      Exact Length Anagrams
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Min Length:</span>
                    <div className="flex items-center gap-1">
                      {[2, 3, 4, 5].map(len => (
                        <button
                          key={len}
                          onClick={() => setMinLength(len)}
                          className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                            minLength === len ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {len}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="font-medium">Letters:</span>
                  <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {solverInput.toLowerCase().replace(/[^a-z]/g, '').length} chars
                  </span>
                  <span className="font-medium ml-2">Total matches:</span>
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {solverResults.length} words
                  </span>
                </div>
              </div>
            </div>

            {/* Letter frequency badges for source */}
            {solverInput && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mr-1">Letter Bank:</span>
                {solverInput.toLowerCase().replace(/[^a-z]/g, '').split('').map((char, i) => (
                  <div
                    key={i}
                    className="relative w-8 h-9 rounded-lg bg-[#1a1e2e] border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-base shadow-sm"
                  >
                    {char.toUpperCase()}
                    <span className="absolute bottom-0.5 right-1 text-[8px] font-mono text-slate-400">
                      {LETTER_SCORES[char] || 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Results Grid by Word Length */}
            {solverResults.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#141724]/60 border border-dashed border-slate-800 space-y-3">
                <Brain className="mx-auto text-slate-600" size={40} />
                <h3 className="text-base font-semibold text-slate-300">No anagram matches found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try typing common English words, adding more letters, or lowering the minimum letter filter.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedResults.map(([len, words]) => (
                  <div key={len} className="space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {len}-Letter Words
                        </span>
                        <span className="text-xs text-slate-500">
                          {words.length} {words.length === 1 ? 'word' : 'words'} found
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">Click word to copy</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {words.map((item) => {
                        const isCopied = copiedWord === item.word;
                        return (
                          <button
                            key={item.word}
                            onClick={() => handleCopy(item.word)}
                            className="group relative flex items-center justify-between p-2.5 rounded-xl bg-[#141724] hover:bg-[#1c2236] border border-slate-800 hover:border-amber-500/40 text-left transition-all hover:scale-[1.02] shadow-sm"
                          >
                            <div>
                              <span className="block font-bold text-sm tracking-wide text-slate-200 group-hover:text-amber-300 uppercase">
                                {item.word}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {item.score} pts
                              </span>
                            </div>
                            <div className="text-slate-500 group-hover:text-amber-400 transition-colors">
                              {isCopied ? (
                                <Check size={14} className="text-emerald-400" />
                              ) : (
                                <Copy size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODE 2: CREATIVE PHRASE LAB */}
        {activeMode === 'generator' && (
          <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
            {/* Header & Controls */}
            <div className="p-5 rounded-2xl bg-[#141724] border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-400" size={20} />
                <h2 className="text-base font-bold text-white tracking-wide">
                  Creative Phrase & Poetic Anagrams
                </h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Transform any name, title, or phrase into clever exact-letter phrase anagrams from our built-in lexicon.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Base Phrase / Subject</label>
                  <input
                    type="text"
                    value={creativeInput}
                    onChange={(e) => setCreativeInput(e.target.value)}
                    placeholder="e.g. dormitory, astronomer, the eyes, conversation"
                    className="w-full px-3.5 py-2.5 bg-[#0d0f17] border border-slate-700 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Tone & Literary Style</label>
                  <select
                    value={creativeTheme}
                    onChange={(e) => setCreativeTheme(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0d0f17] border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="witty and ironic">Witty & Ironic</option>
                    <option value="philosophical and deep">Philosophical & Deep</option>
                    <option value="poetic and mystical">Poetic & Mystical</option>
                    <option value="humorous satire">Humorous Satire</option>
                    <option value="fantasy and rpg">Fantasy & Adventure</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={generateAiAnagrams}
                    disabled={isAiGenerating || !creativeInput.trim()}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    {isAiGenerating ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Solving...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
                <span className="text-slate-500">Inspiring presets:</span>
                {[
                  'the eyes',
                  'the morse code',
                  'astronomer',
                  'conversation',
                  'slot machines',
                  'election results'
                ].map(preset => (
                  <button
                    key={preset}
                    onClick={() => {
                      setCreativeInput(preset);
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Results */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Generated Phrase Anagrams
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiAnagrams.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#141724] border border-slate-800 hover:border-amber-500/40 space-y-2 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                          Anagram #{idx + 1}
                        </span>
                        <h4 className="text-lg font-extrabold text-white tracking-wide uppercase">
                          {item.phrase}
                        </h4>
                      </div>
                      <button
                        onClick={() => handleCopy(item.phrase)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                        title="Copy phrase"
                      >
                        {copiedWord === item.phrase ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                    {item.explanation && (
                      <p className="text-xs text-slate-400 italic">
                        "{item.explanation}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Legendary Classic Anagrams Showcase */}
            <div className="p-5 rounded-2xl bg-[#141724]/80 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Famous Historical & Literary Anagrams
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {FAMOUS_ANAGRAMS.map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#0d0f17] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-400 uppercase">{item.original}</span>
                      <ArrowRight size={12} className="text-amber-400" />
                      <span className="text-amber-300 font-bold uppercase">{item.anagram}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: ANAGRAM CHALLENGE & QUIZ */}
        {activeMode === 'challenge' && (
          <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
            {/* Game Scoreboard */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#141724] border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Award size={22} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Score</span>
                  <div className="text-2xl font-black text-white font-mono">{gameScore} pts</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <Flame size={16} className="text-orange-400" />
                  <span className="text-xs font-bold text-white">{gameStreak} Streak</span>
                </div>
                <button
                  onClick={() => initNewChallenge()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                >
                  <RefreshCw size={13} />
                  <span>Next Word</span>
                </button>
              </div>
            </div>

            {/* Scrambled Word Board */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-[#141724] to-[#0f111a] border border-slate-800 text-center space-y-6 shadow-2xl">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400 block mb-1">
                  Unscramble the Letters
                </span>
                <p className="text-xs text-slate-400">
                  Rearrange the tiles into a legitimate English word or click tiles to populate your guess.
                </p>
              </div>

              {/* Tiles Display */}
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                {scrambledLetters.map((char, idx) => (
                  <button
                    key={idx}
                    onClick={() => setUserGuess(prev => prev + char)}
                    className="w-12 h-14 sm:w-14 sm:h-16 rounded-2xl bg-gradient-to-b from-slate-700 to-slate-800 border-2 border-slate-600 hover:border-amber-400 text-white font-black text-2xl shadow-lg hover:-translate-y-1 transition-transform flex items-center justify-center select-none"
                  >
                    {char.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Input Guess Box */}
              <div className="max-w-md mx-auto space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userGuess}
                    onChange={(e) => setUserGuess(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheckGuess()}
                    placeholder="Type unscrambled word..."
                    className="flex-1 px-4 py-3 bg-[#0d0f17] border border-slate-700 rounded-xl text-center text-xl font-bold uppercase tracking-widest text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleCheckGuess}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-md shadow-amber-500/20"
                  >
                    Check
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <button
                    onClick={() => setUserGuess('')}
                    className="text-slate-400 hover:text-white"
                  >
                    Clear letters
                  </button>
                  <button
                    onClick={() => setScrambledLetters(shuffleWord(targetSecretWord).split(''))}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Shuffle size={12} />
                    <span>Shuffle tiles</span>
                  </button>
                </div>
              </div>

              {/* Status Outcome */}
              {gameStatus === 'correct' && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-center gap-2 font-bold animate-bounce">
                  <Check size={20} />
                  <span>Brilliant! You cracked the anagram! (+{10 + targetSecretWord.length * 2} pts)</span>
                </div>
              )}
              {gameStatus === 'wrong' && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-center gap-2 font-semibold">
                  <span>Not quite! Check letter counts or try another permutation.</span>
                </div>
              )}
              {gameStatus === 'revealed' && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                  The word was: <span className="font-bold text-white uppercase text-base ml-1">{targetSecretWord}</span>
                </div>
              )}

              {/* Clue Section */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={getAiGameHint}
                  disabled={isGeneratingHint || Boolean(gameHint)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
                >
                  <Lightbulb size={14} className="text-amber-400" />
                  <span>{isGeneratingHint ? 'Generating clue...' : gameHint ? 'Clue Revealed' : 'Get Word Clue'}</span>
                </button>
                <button
                  onClick={() => setGameStatus('revealed')}
                  className="text-xs text-slate-500 hover:text-slate-300 underline"
                >
                  Give up & show word
                </button>
              </div>
              {gameHint && (
                <p className="text-xs text-amber-200/90 italic bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 max-w-lg mx-auto">
                  💡 Clue: {gameHint}
                </p>
              )}
            </div>
          </div>
        )}

        {/* MODE 4: INTERACTIVE TILE SCRAMBLER & VISUALIZER */}
        {activeMode === 'visualizer' && (
          <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
            <div className="p-5 rounded-2xl bg-[#141724] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white tracking-wide">
                    Interactive Tile Scrambler & Anagram Board
                  </h2>
                  <p className="text-xs text-slate-400">
                    Type words or phrases and drag or randomize letters visually on the magnetic board.
                  </p>
                </div>
                <button
                  onClick={shuffleTiles}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
                >
                  <Shuffle size={14} />
                  <span>Scramble Board</span>
                </button>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Custom Word or Phrase</label>
                <input
                  type="text"
                  value={scramblePhrase}
                  onChange={(e) => setScramblePhrase(e.target.value)}
                  placeholder="Type anything (e.g. MOON STARER, SILENT)..."
                  className="w-full px-4 py-3 bg-[#0d0f17] border border-slate-700 rounded-xl text-white font-bold tracking-widest text-base focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Magnetic Board */}
            <div className="p-8 rounded-3xl bg-[#101320] border-2 border-slate-800 min-h-[220px] flex items-center justify-center flex-wrap gap-2.5 shadow-inner">
              {tileLetters.map((tile, idx) => (
                <div
                  key={tile.id}
                  draggable
                  onDragStart={() => setDraggedTileIdx(idx)}
                  onDragOver={(e) => handleTileDragOver(e, idx)}
                  onDragEnd={() => setDraggedTileIdx(null)}
                  className={`relative select-none cursor-grab active:cursor-grabbing w-12 h-14 sm:w-14 sm:h-16 rounded-xl flex items-center justify-center font-black text-2xl transition-all shadow-md ${
                    tile.char === ' '
                      ? 'w-6 h-14 bg-transparent border border-dashed border-slate-700/60'
                      : 'bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 hover:scale-105 active:scale-95'
                  }`}
                >
                  {tile.char !== ' ' ? tile.char : ''}
                  {tile.char !== ' ' && (
                    <span className="absolute bottom-1 right-1.5 text-[9px] font-mono font-bold text-slate-900/70">
                      {LETTER_SCORES[tile.char.toLowerCase()] || 1}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Letter Count & Analysis */}
            <div className="p-4 rounded-xl bg-[#141724] border border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Current Rearrangement:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {tileLetters.map(t => t.char).join('')}
                </span>
              </div>
              <button
                onClick={() => handleCopy(tileLetters.map(t => t.char).join(''))}
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
              >
                <Copy size={13} />
                <span>Copy Current Sequence</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Guide / About Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#141724] border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center">
                  A⇄
                </div>
                <h3 className="font-bold text-base text-white">About Anagram Studio</h3>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>Anagram Studio</strong> is a complete suite for word enthusiasts, Scrabble players, crossword solvers, and creative writers.
              </p>
              <div className="space-y-2 pt-1">
                <div className="p-2.5 rounded-lg bg-[#0d0f17] border border-slate-800">
                  <span className="font-bold text-amber-400">🔍 Anagram Solver:</span> Instant offline search through an extensive English vocabulary dictionary with letter scoring, subword filters, and plain-text export.
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d0f17] border border-slate-800">
                  <span className="font-bold text-amber-400">✨ Phrase Lab:</span> Multi-word anagram generator that crafts exact-letter phrase combinations from your built-in dictionary.
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d0f17] border border-slate-800">
                  <span className="font-bold text-amber-400">🏆 Challenge Mode:</span> Interactive word scramble game with streak scoring and smart word clues.
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d0f17] border border-slate-800">
                  <span className="font-bold text-amber-400">🔤 Tile Board:</span> Drag-and-drop magnetic letters to brainstorm and explore rearrangements by hand.
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
