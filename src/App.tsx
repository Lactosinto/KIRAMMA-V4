import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Copy, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Wand2, 
  Type as TypeIcon,
  RotateCcw,
  Languages,
  Info,
  Image as ImageIcon,
  Upload,
  X,
  MessageSquare,
  Terminal,
  Activity,
  Cpu,
  Moon,
  Sun,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { analyzeAndOptimizePrompt, generatePromptFromImage, generatePersonalPromptFromImage, getRealtimeAssistance, type PromptAnalysis, type AnalysisMode, type RealtimeAssistance } from './services/geminiService';
import { analyzePromptStrength, type StrengthResult } from './utils/promptAnalyzer';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [input, setInput] = useState('');
  const [additionalIdea, setAdditionalIdea] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('translator');
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [realtimeAssistance, setRealtimeAssistance] = useState<RealtimeAssistance | null>(null);
  const [isRealtimeLoading, setIsRealtimeLoading] = useState(false);
  const [strength, setStrength] = useState<StrengthResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'optimized' | 'translated'>('optimized');
  const [personalInputType, setPersonalInputType] = useState<'text' | 'image'>('text');
  const [auditorInputType, setAuditorInputType] = useState<'text' | 'image'>('text');
  const [hasSelectedApiKey, setHasSelectedApiKey] = useState(false);
  const [quotaError, setQuotaError] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setHasSelectedApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setHasSelectedApiKey(true);
      setQuotaError(false);
    }
  };

  const isImageInput = (mode === 'vision' || (mode === 'personal' && personalInputType === 'image') || (mode === 'auditor' && auditorInputType === 'image'));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedImage({
        data: base64String,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    setIsRealtimeLoading(false);
    if (isImageInput) {
      if (!selectedImage) return;
      setIsAnalyzing(true);
      try {
        const result = (mode === 'vision' || (mode === 'auditor' && auditorInputType === 'image'))
          ? await generatePromptFromImage(selectedImage.data, selectedImage.mimeType, additionalIdea)
          : await generatePersonalPromptFromImage(selectedImage.data, selectedImage.mimeType, additionalIdea);
        setAnalysis(result);
        setStrength(analyzePromptStrength(result.optimizedPrompt));
        setActiveTab('optimized');
        setQuotaError(false);
      } catch (error: any) {
        if (error.message?.includes('quota') || error.message?.includes('429')) {
          setQuotaError(true);
        }
        console.error(`${mode} analysis failed:`, error);
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    if (!input.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeAndOptimizePrompt(input, mode, additionalIdea);
      setAnalysis(result);
      setStrength(analyzePromptStrength(result.optimizedPrompt));
      setActiveTab('optimized');
      setQuotaError(false);
    } catch (error: any) {
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        setQuotaError(true);
      }
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoFix = () => {
    if (!analysis) return;
    let fixed = analysis.translatedPrompt;
    analysis.typos.forEach(typo => {
      const regex = new RegExp(`\\b${typo.original}\\b`, 'gi');
      fixed = fixed.replace(regex, typo.correction);
    });
    setAnalysis({
      ...analysis,
      translatedPrompt: fixed,
      typos: []
    });
    setStrength(analyzePromptStrength(fixed));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setInput('');
    setAdditionalIdea('');
    setSelectedImage(null);
    setAnalysis(null);
    setStrength(null);
    setRealtimeAssistance(null);
    setIsRealtimeLoading(false);
    setPersonalInputType('text');
    setAuditorInputType('text');
  };

  const lastProcessedInput = React.useRef('');

  // Real-time assistance debouncing
  useEffect(() => {
    const isInputTooShort = !input.trim() || input.length < 5;
    const isImageMode = mode === 'vision' || (mode === 'personal' && personalInputType === 'image') || (mode === 'auditor' && auditorInputType === 'image');
    const isDuplicateInput = input === lastProcessedInput.current;

    if (isImageMode || isInputTooShort || isDuplicateInput) {
      setIsRealtimeLoading(false);
      if (isImageMode || isInputTooShort) {
        setRealtimeAssistance(null);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setIsRealtimeLoading(true);
      try {
        const result = await getRealtimeAssistance(input);
        setRealtimeAssistance(result);
        lastProcessedInput.current = input;
        setQuotaError(false);
      } catch (error: any) {
        if (error.message?.includes('quota') || error.message?.includes('429')) {
          setQuotaError(true);
        }
        console.error("Realtime assistance failed:", error);
      } finally {
        setIsRealtimeLoading(false);
      }
    }, 800); // Increased debounce to 800ms to save quota

    return () => clearTimeout(timer);
  }, [input, mode]);

  // Handle paste events for images in vision or personal image mode
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const isImageMode = mode === 'vision' || (mode === 'personal' && personalInputType === 'image') || (mode === 'auditor' && auditorInputType === 'image');
      if (!isImageMode) return;
      
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64String = (e.target?.result as string).split(',')[1];
              setSelectedImage({
                data: base64String,
                mimeType: file.type
              });
            };
            reader.readAsDataURL(file);
          }
          break; // Only handle the first image
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [mode, personalInputType, auditorInputType]);

  const applyRecommendation = (rec: string) => {
    setInput(prev => {
      const trimmedPrev = prev.trimEnd();
      const lowerPrev = trimmedPrev.toLowerCase();
      const lowerRec = rec.toLowerCase().trim();

      // If the recommendation is already there at the end, don't add it again
      if (lowerPrev.endsWith(lowerRec)) return prev;

      // If the recommendation starts with the current input, it's a completion
      // e.g. "standing on the" -> "standing on the beach"
      if (lowerRec.startsWith(lowerPrev) && lowerPrev.length > 0) {
        return rec;
      }

      // Determine separator: use comma only if the input already ends with one
      if (trimmedPrev.endsWith(',')) {
        return trimmedPrev + ' ' + rec;
      }

      // Otherwise use a space for natural continuation
      // This fixes the issue where a comma was being added in the middle of a phrase
      const separator = (prev.length > 0 && !prev.endsWith(' ')) ? ' ' : '';
      return prev + separator + rec;
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] pt-24 pb-12 sm:py-12 px-4 sm:px-8 font-sans selection:bg-[#FACC15] selection:text-black transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-8">
        <AnimatePresence>
          {quotaError && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center">
                  <AlertCircle className="text-rose-500" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Quota Exceeded</h3>
                  <p className="text-xs text-rose-400/80">The shared API quota has been reached. Please use your own API key to continue.</p>
                </div>
              </div>
              <button 
                onClick={handleSelectKey}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all"
              >
                Set API Key
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* System Header / Navigation Bar - Top on Mobile and Desktop */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 bg-[#141414] p-1.5 sm:p-1.5 rounded-none sm:rounded-2xl border-b sm:border border-[#2A2A2A] fixed sm:sticky top-0 sm:top-4 left-0 right-0 sm:left-auto sm:right-auto z-50 shadow-2xl backdrop-blur-md bg-opacity-90 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-tight text-sm sm:text-base text-white">KIRAMMA</span>
            <div className="h-4 w-px bg-[#2A2A2A] hidden md:block" />
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[8px] font-mono text-[#9CA3AF] uppercase font-bold tracking-widest">Engine</span>
              <span className="text-[8px] font-mono font-bold bg-[#1A1A1A] px-1.5 py-0.5 rounded-lg text-white border border-[#2A2A2A]">GEMINI_3_FLASH</span>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto scrollbar-hide p-1 bg-[#0B0B0B] rounded-xl border border-[#2A2A2A] mx-auto sm:mx-0">
            <button onClick={() => setMode('translator')} className={cn("pill-tab py-1.5 px-3 sm:px-4", mode === 'translator' && "active")}>
              <Languages size={14} className="sm:w-[13px] sm:h-[13px]" /> 
              <span className="hidden sm:inline text-[10px]">TRANSLATOR</span>
            </button>
            <button onClick={() => setMode('auditor')} className={cn("pill-tab py-1.5 px-3 sm:px-4", mode === 'auditor' && "active")}>
              <AlertCircle size={14} className="sm:w-[13px] sm:h-[13px]" /> 
              <span className="hidden sm:inline text-[10px]">AUDITOR</span>
            </button>
            <button onClick={() => setMode('troubleshooter')} className={cn("pill-tab py-1.5 px-3 sm:px-4", mode === 'troubleshooter' && "active")}>
              <MessageSquare size={14} className="sm:w-[13px] sm:h-[13px]" /> 
              <span className="hidden sm:inline text-[10px]">CONSULT</span>
            </button>
            <button onClick={() => setMode('personal')} className={cn("pill-tab py-1.5 px-3 sm:px-4", mode === 'personal' && "active")}>
              <LayoutGrid size={14} className="sm:w-[13px] sm:h-[13px]" /> 
              <span className="hidden sm:inline text-[10px]">PERSONAL</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FACC15] animate-pulse" />
              <span className="text-[8px] font-mono text-[#9CA3AF] uppercase font-bold tracking-widest">SYSTEM_ONLINE</span>
            </div>
            <div className="h-4 w-px bg-[#2A2A2A] hidden sm:block" />
            
            <button onClick={reset} className="p-1.5 text-[#9CA3AF] hover:text-white transition-colors bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
              <RotateCcw size={14} className="sm:w-[13px] sm:h-[13px]" />
            </button>
          </div>
        </div>

        {/* Main Workspace Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-4">
            <div className="tech-card">
              <div className="tech-header">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-[#1A1A1A] rounded-lg flex items-center justify-center border border-[#2A2A2A]">
                    <TypeIcon size={14} className="#9CA3AF" />
                  </div>
                  <div>
                    <span className="text-[12px] font-bold text-white block leading-none">Entry</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[#9CA3AF] font-mono uppercase tracking-wider">{mode}</span>
                    </div>
                  </div>
                </div>

                {(mode === 'personal' || mode === 'auditor') && (
                  <div className="flex bg-[#0B0B0B] p-1 rounded-xl border border-[#2A2A2A]">
                    <button 
                      onClick={() => mode === 'personal' ? setPersonalInputType('text') : setAuditorInputType('text')}
                      className={cn(
                        "px-2 sm:px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2",
                        (mode === 'personal' ? personalInputType === 'text' : auditorInputType === 'text') ? "bg-[#FACC15] text-black" : "text-[#9CA3AF] hover:text-white"
                      )}
                    >
                      <TypeIcon size={12} />
                      <span className="hidden sm:inline">TEXT</span>
                    </button>
                    <button 
                      onClick={() => mode === 'personal' ? setPersonalInputType('image') : setAuditorInputType('image')}
                      className={cn(
                        "px-2 sm:px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2",
                        (mode === 'personal' ? personalInputType === 'image' : auditorInputType === 'image') ? "bg-[#FACC15] text-black" : "text-[#9CA3AF] hover:text-white"
                      )}
                    >
                      <ImageIcon size={12} />
                      <span className="hidden sm:inline">IMAGE</span>
                    </button>
                  </div>
                )}
              </div>

              {mode === 'vision' || (mode === 'personal' && personalInputType === 'image') || (mode === 'auditor' && auditorInputType === 'image') ? (
                <div className="p-6 bg-[#0B0B0B]/30">
                  <div className={cn(
                    "h-[320px] border border-[#2A2A2A] rounded-2xl flex flex-col items-center justify-center transition-all relative group overflow-hidden bg-[#141414]",
                    !selectedImage && "border-dashed hover:border-[#404040]"
                  )}>
                    {selectedImage ? (
                      <>
                        <img 
                          src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} 
                          alt="Selected" 
                          className="w-full h-full object-contain p-6"
                        />
                        <button 
                          onClick={() => setSelectedImage(null)}
                          className="absolute top-6 right-6 p-2.5 bg-[#1A1A1A]/90 backdrop-blur border border-[#2A2A2A] rounded-xl text-[#9CA3AF] hover:text-rose-500 transition-all z-10"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                        <Upload size={28} className="text-[#2A2A2A] mb-4" />
                        <p className="text-sm font-semibold text-[#9CA3AF]">Drop or Paste reference image</p>
                        <p className="text-[11px] text-[#404040] mt-2">MAX 10MB • PNG/JPG • CTRL+V</p>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                  <div className="flex flex-col">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Enter raw prompt or idea..."
                      className="tech-input h-[320px] border-b border-[#2A2A2A] focus:bg-white/[0.01]"
                    />
                  </div>
              )}

              <div className="p-6 bg-[#1A1A1A]/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="tech-label">Prompt Expansion</span>
                </div>
                <textarea
                  value={additionalIdea}
                  onChange={(e) => setAdditionalIdea(e.target.value)}
                  placeholder="Add technical modifiers, lighting, or specific styles..."
                  className="w-full p-4 bg-[#141414] border border-[#2A2A2A] rounded-2xl text-[13px] font-mono focus:border-[#404040] outline-none transition-all h-24 resize-none text-white placeholder:text-[#404040]"
                />
              </div>

              <div className="p-6 bg-[#141414] border-t border-[#2A2A2A] flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || (isImageInput ? !selectedImage : !input.trim())}
                  className="btn-tech w-full sm:w-auto min-w-0 sm:min-w-[180px] p-3 sm:px-6 sm:py-2.5"
                >
                  {isAnalyzing ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Wand2 size={16} />
                      <span className="hidden sm:inline">Execute Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-6">
              <div className="tech-card p-4">
                <span className="tech-label block mb-2">Length</span>
                <span className="text-lg font-mono font-bold text-white">{input.length}</span>
              </div>
              <div className="tech-card p-4">
                <span className="tech-label block mb-2">Words</span>
                <span className="text-lg font-mono font-bold text-white">{input.trim() ? input.trim().split(/\s+/).length : 0}</span>
              </div>
              <div className="tech-card p-4">
                <span className="tech-label block mb-2">Status</span>
                <span className="text-[11px] font-bold text-[#FACC15] uppercase tracking-widest">Active</span>
              </div>
            </div>
          </div>

          {/* Output Panel */}
          <div className="space-y-6">
            <div className="tech-card min-h-[420px] flex flex-col">
              <div className="tech-header">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-[#FACC15] rounded-lg flex items-center justify-center">
                    <Wand2 size={14} className="text-black" />
                  </div>
                  <div>
                    <span className="text-[12px] font-bold text-white block leading-none">Output</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[#9CA3AF] font-mono uppercase tracking-wider">V2.0</span>
                      <span className="w-1 h-1 bg-[#2A2A2A] rounded-full" />
                      <span className="text-[10px] text-[#9CA3AF] font-mono uppercase tracking-wider">STABLE_DIFFUSION</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-8 font-mono text-[14px] text-[#9CA3AF] leading-relaxed break-words bg-[#0B0B0B]/20 relative group border-b border-[#2A2A2A]">
                {analysis ? (
                  <div className="space-y-8">
                    <div className="p-6 bg-[#141414] border border-[#2A2A2A] rounded-2xl">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles size={14} className="text-[#FACC15]" />
                        <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">AI Summary</span>
                      </div>
                      <p className="whitespace-pre-wrap text-white">
                        {analysis.optimizedPrompt}
                      </p>
                    </div>
                    
                    {analysis.suggestions.length > 0 && (
                      <div className="space-y-4">
                        <span className="tech-label block">Recommended_Tokens</span>
                        <div className="flex flex-wrap gap-2">
                          {analysis.suggestions.map((s, idx) => (
                            <button 
                              key={idx} 
                              onClick={() => copyToClipboard(s.tokens)}
                              className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-[11px] font-medium text-[#9CA3AF] hover:border-white hover:text-white transition-all"
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-[#404040] py-24">
                    <div className="w-20 h-20 border border-[#2A2A2A] rounded-2xl flex items-center justify-center mb-6 relative group">
                      <div className="absolute inset-0 bg-[#FACC15]/5 rounded-2xl animate-pulse" />
                      <Terminal size={32} className="text-[#2A2A2A] group-hover:text-[#FACC15] transition-colors" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[11px] font-mono font-bold tracking-[0.3em] text-[#2A2A2A] uppercase">System_Idle</span>
                      <span className="text-[10px] font-mono text-[#404040] uppercase tracking-widest">Awaiting_Input_Buffer...</span>
                    </div>
                  </div>
                )}

                {analysis && (
                  <button
                    onClick={() => copyToClipboard(analysis.optimizedPrompt)}
                    className="absolute top-6 right-6 p-2.5 bg-[#1A1A1A]/90 backdrop-blur border border-[#2A2A2A] rounded-xl text-[#9CA3AF] hover:text-white transition-all"
                  >
                    {copied ? <Check size={18} className="text-[#FACC15]" /> : <Copy size={18} />}
                  </button>
                )}
              </div>

              {strength && (
                <div className="p-6 bg-[#1A1A1A]/50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="tech-label">Prompt_Integrity_Index</span>
                    <span className="text-xs font-mono font-bold text-white">{strength.score}%</span>
                  </div>
                  <div className="w-full bg-[#0B0B0B] h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${strength.score}%` }}
                      className={cn("h-full transition-all duration-1000", strength.color.replace('text-', 'bg-'))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Technical Feedback Card */}
            <AnimatePresence>
              {analysis && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="tech-card p-6 space-y-6 bg-[#141414] border-[#2A2A2A]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FACC15]" />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-white">Analysis_Report</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#404040]">ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {analysis.typos.length > 0 && (
                      <div className="text-[12px] font-mono p-4 bg-[#0B0B0B] rounded-2xl border border-[#2A2A2A]">
                        <span className="text-[#FACC15] font-bold block mb-3">ERR_TYPO_DETECTED:</span>
                        <div className="space-y-2">
                          {analysis.typos.map((t, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <span className="text-[#404040] line-through">{t.original}</span>
                              <ArrowRight size={12} className="text-[#2A2A2A]" />
                              <span className="text-white font-bold">{t.correction}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.redundancies && analysis.redundancies.length > 0 && (
                      <div className="text-[12px] font-mono p-4 bg-[#0B0B0B] rounded-2xl border border-[#2A2A2A]">
                        <span className="text-rose-500 font-bold block mb-3">ERR_REDUNDANCY:</span>
                        <div className="flex flex-wrap gap-2">
                          {analysis.redundancies.map((r, idx) => (
                            <span key={idx} className="bg-[#1A1A1A] px-2 py-1 rounded-lg border border-rose-900/30 text-rose-400">[{r}]</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.troubleshooting && (
                      <div className="text-[12px] font-mono p-4 bg-[#0B0B0B] rounded-2xl border border-[#2A2A2A]">
                        <span className="text-emerald-500 font-bold block mb-3">AI_OPTIMIZATION_LOG:</span>
                        <p className="text-[#9CA3AF] leading-relaxed italic">
                          "{analysis.troubleshooting}"
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <footer className="pt-16 pb-8 text-center">
          <p className="text-[11px] font-bold text-[#404040] uppercase tracking-[0.4em]">
            PromptCraft SD • Technical Dashboard • v2.1.0
          </p>
        </footer>
      </div>
    </div>
  );
}
