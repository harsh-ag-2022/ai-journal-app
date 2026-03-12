"use client";

import { useState, useEffect } from "react";
import { Send, Sparkles, User, FileText, ChevronRight, BarChart } from "lucide-react";

export default function Home() {
  const [entry, setEntry] = useState("");
  const [ambience, setAmbience] = useState("forest");
  const [userId, setUserId] = useState("arvyax_user_01"); // Mock user ID
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

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
    forest: { bg1: "bg-emerald-600/20", bg2: "bg-blue-600/20", button: "from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-900/40", text: "text-emerald-400" },
    ocean: { bg1: "bg-cyan-600/20", bg2: "bg-blue-700/20", button: "from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-900/40", text: "text-cyan-400" },
    space: { bg1: "bg-purple-600/20", bg2: "bg-indigo-600/20", button: "from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 shadow-purple-900/40", text: "text-purple-400" },
    rain: { bg1: "bg-slate-600/30", bg2: "bg-blue-900/20", button: "from-slate-500 to-blue-700 hover:from-slate-400 hover:to-blue-600 shadow-slate-900/40", text: "text-slate-400" },
    cafe: { bg1: "bg-orange-700/20", bg2: "bg-amber-900/20", button: "from-orange-500 to-amber-700 hover:from-orange-400 hover:to-amber-600 shadow-orange-900/40", text: "text-orange-400" },
  };

  const currentStyle = ambienceStyles[ambience] || ambienceStyles.forest;

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-200 font-sans selection:bg-white/10 transition-colors duration-700">
      
      {/* Decorative background gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none transition-all duration-1000">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] ${currentStyle.bg1} blur-[120px] rounded-full transition-colors duration-1000`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] ${currentStyle.bg2} blur-[120px] rounded-full transition-colors duration-1000`} />
      </div>

      <header className="border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-6 h-6 transition-colors duration-500 ${currentStyle.text}`} />
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
              ArvyaX Journal
            </h1>
          </div>
          <div className="flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 text-sm">
            <User className={`w-4 h-4 transition-colors duration-500 ${currentStyle.text}`} />
            <span className="opacity-80 font-medium">{userId}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Editor */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-sm shadow-2xl relative overflow-hidden group transition-all duration-300 hover:border-white/15">
            
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
                <FileText className={`w-5 h-5 transition-colors duration-500 ${currentStyle.text}`} />
                New Entry
              </h2>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ambience</span>
                <select 
                  value={ambience}
                  onChange={(e) => setAmbience(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
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
              className="w-full bg-black/20 border border-white/5 rounded-2xl p-5 min-h-[300px] outline-none focus:bg-black/40 focus:border-white/30 transition-all duration-300 resize-y text-slate-200 placeholder:text-slate-600 text-lg leading-relaxed shadow-inner"
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
            <h3 className="text-lg font-semibold text-white mb-4 px-2 tracking-tight">Recent Sessions</h3>
            <div className="grid gap-4">
              {recentEntries.length === 0 ? (
                <div className="text-slate-500 px-2 py-4 italic text-sm border-l-2 border-white/10 ml-2">No entries yet. Start writing!</div>
              ) : (
                recentEntries.map((item, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.04] transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2 mb-2">
                        <span className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-full font-medium border border-white/20 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full bg-current ${currentStyle.text}`}></span>
                          {item.emotion || 'Unanalyzed'}
                        </span>
                        <span className="bg-white/5 text-slate-300 text-xs px-2.5 py-1 rounded-full font-medium border border-white/10">
                          {item.ambience}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-3 line-clamp-2">{item.text}</p>
                    
                    {item.keywords && item.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.keywords.map((kw: string, i: number) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 bg-black/40 text-slate-400 rounded-md border border-white/5">#{kw}</span>
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
          <div className="bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 rounded-3xl p-6 sticky top-24">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2 tracking-tight">
              <BarChart className="w-5 h-5 text-blue-400" />
              Mindset Insights
            </h3>

             <div className="space-y-6">
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Total Sessions</div>
                  <div className="text-3xl font-bold text-white tracking-tighter">{insights?.totalEntries || 0}</div>
                </div>

                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Top Emotion</div>
                  <div className={`text-2xl font-bold tracking-tight capitalize transition-colors duration-500 ${currentStyle.text}`}>
                    {insights?.topEmotion || "N/A"}
                  </div>
                </div>

                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Preferred Ambience</div>
                  <div className="text-lg font-medium text-slate-200 tracking-tight capitalize">
                    {insights?.mostUsedAmbience || "N/A"}
                  </div>
                </div>

                {insights?.recentKeywords && insights.recentKeywords.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Recurring Themes</div>
                    <div className="flex flex-wrap gap-2">
                      {insights.recentKeywords.map((kw: string, i: number) => (
                        <span key={i} className="text-xs px-3 py-1 bg-blue-500/10 text-blue-300 rounded-lg border border-blue-500/20">
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
