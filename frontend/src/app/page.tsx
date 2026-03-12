"use client";

import { useState, useEffect } from "react";
import { Send, Sparkles, User, FileText, ChevronRight, BarChart, Trash2, Sun, Moon, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";

export default function Home() {
  const [entry, setEntry] = useState("");
  const [ambience, setAmbience] = useState("forest");
  const [userId, setUserId] = useState("arvyax_user_01"); // Mock user ID
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // The FastAPI backend runs on 8000 by default (from uvicorn)
  const API_URL = "http://localhost:8000/api/journal";

  const fetchInsights = async () => {
    try {
      const res = await fetch(`${API_URL}/insights/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (e) {
      console.error("Failed to fetch insights", e);
    }
  };

  const fetchEntries = async () => {
    try {
      const res = await fetch(`${API_URL}/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setRecentEntries(data.slice(-5).reverse()); // Get last 5
      }
    } catch (e) {
      console.error("Failed to fetch entries", e);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchInsights();
  }, [userId]);

  const handleDelete = async (entryId: string) => {
    try {
      const res = await fetch(`${API_URL}/entries/${entryId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchEntries();
        fetchInsights();
      }
    } catch (e) {
      console.error("Failed to delete entry", e);
    }
  };

  const handleAnalyzeAndSave = async () => {
    if (!entry.trim()) return;

    setIsAnalyzing(true);
    let emotionData = { emotion: "", keywords: [], summary: "" };

    // 1. Analyze with Gemini
    try {
      const analyzeRes = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: entry }),
      });

      if (analyzeRes.ok) {
        emotionData = await analyzeRes.json();
      } else {
        console.error("Analysis failed");
      }
    } catch (e) {
      console.error("Error calling analyze API", e);
    }

    setIsAnalyzing(false);
    setIsSaving(true);

    // 2. Save to Supabase
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          ambience,
          text: entry,
          emotion: emotionData.emotion,
          keywords: emotionData.keywords,
          summary: emotionData.summary
        }),
      });
      
      setEntry("");
      fetchEntries();
      fetchInsights();
    } catch (e) {
      console.error("Error saving entry", e);
    }

    setIsSaving(false);
  };

  const ambiences = ["forest", "ocean", "space", "rain", "cafe"];

  // Dynamic styling mapping based on ambience
  const ambienceStyles: Record<string, { bg1: string, bg2: string, button: string, text: string }> = {
    forest: { bg1: "bg-emerald-300/40 dark:bg-emerald-600/20", bg2: "bg-green-300/40 dark:bg-blue-600/20", button: "from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/30 dark:shadow-emerald-900/40 text-white", text: "text-emerald-700 dark:text-emerald-400" },
    ocean: { bg1: "bg-cyan-300/40 dark:bg-cyan-600/20", bg2: "bg-blue-300/40 dark:bg-blue-700/20", button: "from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/30 dark:shadow-cyan-900/40 text-white", text: "text-cyan-700 dark:text-cyan-400" },
    space: { bg1: "bg-purple-300/40 dark:bg-purple-600/20", bg2: "bg-indigo-300/40 dark:bg-indigo-600/20", button: "from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 shadow-purple-500/30 dark:shadow-purple-900/40 text-white", text: "text-purple-700 dark:text-purple-400" },
    rain: { bg1: "bg-slate-300/50 dark:bg-slate-600/30", bg2: "bg-blue-300/40 dark:bg-blue-900/20", button: "from-slate-500 to-blue-600 hover:from-slate-400 hover:to-blue-500 shadow-slate-500/30 dark:shadow-slate-900/40 text-white", text: "text-slate-700 dark:text-slate-400" },
    cafe: { bg1: "bg-orange-300/40 dark:bg-orange-700/20", bg2: "bg-amber-300/40 dark:bg-amber-900/20", button: "from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 shadow-orange-500/30 dark:shadow-orange-900/40 text-white", text: "text-orange-700 dark:text-orange-400" },
  };

  const currentStyle = ambienceStyles[ambience] || ambienceStyles.forest;

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-500/20 transition-colors duration-700 relative z-0">
      
      {/* Base background that covers everything behind gradients */}
      <div className="fixed inset-0 -z-30 bg-[#f8fafc] dark:bg-[#0f111a] transition-colors duration-1000" />

      {/* Decorative background gradients */}
      <div className="fixed inset-0 overflow-hidden -z-20 pointer-events-none transition-all duration-1000">
        <div className={`absolute top-[-20%] left-[-10%] w-[70%] h-[70%] ${currentStyle.bg1} blur-[120px] rounded-full transition-colors duration-1000 opacity-60 dark:opacity-40 mix-blend-multiply dark:mix-blend-screen saturate-150`} />
        <div className={`absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] ${currentStyle.bg2} blur-[120px] rounded-full transition-colors duration-1000 opacity-60 dark:opacity-40 mix-blend-multiply dark:mix-blend-screen saturate-150`} />
      </div>

      <header className="border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl sticky top-0 z-10 transition-colors duration-500">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-6 h-6 transition-colors duration-500 ${currentStyle.text}`} />
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent tracking-tight">
              ArvyaX Journal
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-300"
                aria-label="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
            <div className="flex items-center gap-3 bg-white dark:bg-white/5 px-4 py-1.5 rounded-full border border-black/10 dark:border-white/10 shadow-sm dark:shadow-none text-sm">
              <User className={`w-4 h-4 transition-colors duration-500 ${currentStyle.text}`} />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{userId}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Editor */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white/70 dark:bg-[#151822]/80 border border-white dark:border-white/10 rounded-3xl p-7 backdrop-blur-2xl shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden transition-all duration-300">
            
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                <FileText className={`w-5 h-5 transition-colors duration-500 ${currentStyle.text}`} />
                New Entry
              </h2>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">Ambience</span>
                <select 
                  value={ambience}
                  onChange={(e) => setAmbience(e.target.value)}
                  className="bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-sm font-medium outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer text-slate-700 dark:text-slate-200"
                >
                  {ambiences.map(a => (
                    <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="What's on your mind today? Let the words flow..."
              className="w-full bg-white/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/5 rounded-2xl p-5 min-h-[300px] outline-none focus:bg-white focus:dark:bg-black/60 focus:border-slate-300 focus:dark:border-white/20 transition-all duration-300 resize-y text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-lg leading-relaxed shadow-inner"
            />

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAnalyzeAndSave}
                disabled={!entry.trim() || isAnalyzing || isSaving}
                className={`group relative flex items-center gap-2 bg-gradient-to-r text-white px-8 py-3.5 rounded-2xl font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-500 ${currentStyle.button}`}
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-spin" />
                    Analyzing Emotion...
                  </>
                ) : isSaving ? (
                  <>
                    <Send className="w-5 h-5 opacity-70" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Analyze & Save
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recent Entries List */}
          <div className="mt-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 px-2 tracking-tight">Recent Sessions</h3>
            <div className="grid gap-4">
              {recentEntries.length === 0 ? (
                <div className="text-slate-500 px-2 py-4 italic text-sm border-l-2 border-slate-200 dark:border-white/10 ml-2">No entries yet. Start writing!</div>
              ) : (
                recentEntries.map((item, idx) => (
                  <div key={item.id || idx} className="bg-white/70 dark:bg-[#151822]/80 border border-white dark:border-white/5 rounded-2xl p-6 hover:bg-white dark:hover:bg-[#1a1e2b]/90 transition-all shadow-md shadow-slate-200/50 dark:shadow-none relative group backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-2">
                        <span className="bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 text-xs px-2.5 py-1.5 rounded-full font-bold border border-slate-100 dark:border-white/10 flex items-center gap-1.5 shadow-sm">
                          <span className={`w-1.5 h-1.5 rounded-full bg-current ${currentStyle.text}`}></span>
                          {item.emotion || 'Unanalyzed'}
                        </span>
                        <span className="bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs px-2.5 py-1.5 rounded-full font-bold border border-slate-100 dark:border-white/10">
                          {item.ambience}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedEntryId(expandedEntryId === item.id ? null : item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all flex items-center gap-1"
                          aria-label="View AI Analysis"
                        >
                          <span className="text-xs font-semibold px-1">Analysis</span>
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedEntryId === item.id ? 'rotate-180' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                          aria-label="Delete Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed mb-3 line-clamp-3">{item.text}</p>
                    
                    {/* Collapsible Analysis Section */}
                    {expandedEntryId === item.id && item.summary && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-100/50 dark:bg-black/30 border border-slate-200 dark:border-white/5 animate-in slide-in-from-top-2 fade-in duration-300">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className={`w-4 h-4 ${currentStyle.text}`} />
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">AI Analysis</h4>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {item.summary}
                        </p>
                      </div>
                    )}
                    
                    {item.keywords && item.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {item.keywords.map((kw: string, i: number) => (
                          <span key={i} className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-black/40 text-slate-500 dark:text-slate-400 rounded-md border border-slate-200 dark:border-white/5">#{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Insights */}
        <div className="lg:col-span-4">
          <div className="bg-white/70 dark:bg-[#151822]/80 border border-white dark:border-white/10 rounded-3xl p-7 sticky top-24 shadow-xl shadow-slate-200/50 dark:shadow-none backdrop-blur-xl">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 tracking-tight border-b border-black/5 dark:border-white/10 pb-4">
              <BarChart className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              Mindset Insights
            </h3>

             <div className="space-y-4">
                <div className="bg-white/60 dark:bg-black/30 rounded-2xl p-5 border border-white dark:border-white/5 shadow-sm dark:shadow-none">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">Total Sessions</div>
                  <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{insights?.totalEntries || 0}</div>
                </div>

                <div className="bg-white/60 dark:bg-black/30 rounded-2xl p-5 border border-white dark:border-white/5 shadow-sm dark:shadow-none">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">Top Emotion</div>
                  <div className={`text-2xl font-black tracking-tight capitalize transition-colors duration-500 ${currentStyle.text}`}>
                    {insights?.topEmotion || "N/A"}
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-black/30 rounded-2xl p-5 border border-white dark:border-white/5 shadow-sm dark:shadow-none">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">Preferred Ambience</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200 tracking-tight capitalize">
                    {insights?.mostUsedAmbience || "N/A"}
                  </div>
                </div>

                {insights?.recentKeywords && insights.recentKeywords.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-3">Recurring Themes</div>
                    <div className="flex flex-wrap gap-2">
                      {insights.recentKeywords.map((kw: string, i: number) => (
                        <span key={i} className="text-xs font-semibold px-3 py-1 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-500/20">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>

      </main>
    </div>
  );
}
