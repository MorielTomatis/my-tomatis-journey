import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, Map as MapIcon, BookOpen, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

interface Resource {
  id: string;
  title: string;
  youtube_url: string;
  category: string;
  sort_order: number;
}

const CATEGORIES = [
  { key: "שימוש באוזניות", emoji: "🎧" },
  { key: "עבודה עם המיקרופון", emoji: "🎤" },
  { key: "תרגילים לגוף, למוח ולנפש", emoji: "🌟" },
  { key: "טיפים כלליים", emoji: "💡" },
];

const extractYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const GuidePage = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchResources = async () => {
      const { data } = await supabase
        .from("resources")
        .select("id, title, youtube_url, category, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      setResources((data as Resource[]) ?? []);
      setLoading(false);
    };
    fetchResources();
  }, []);

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main className="max-w-md mx-auto min-h-svh flex flex-col" dir="rtl">
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Header */}
        <header className="py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">מדריך</h1>
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors" title="התנתק">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* Section 1: Infographic */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">מדריך שימוש באוזניות</h2>
          <div className="rounded-xl overflow-hidden border border-border shadow-soft">
            <img
              src="https://tomatis-harish.com/wp-content/uploads/Infographic-Maestro-guide-1.webp"
              alt="מדריך שימוש באוזניות"
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
        </section>

        {/* Section 2: Video Library */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">ספריית סרטונים</h2>

          {loading ? (
            <p className="text-muted-foreground text-sm">טוען...</p>
          ) : (
            <div className="space-y-3">
              {CATEGORIES.map(({ key, emoji }) => {
                const categoryResources = resources.filter((r) => r.category === key);
                const isOpen = openCategories[key] ?? false;

                return (
                  <Collapsible key={key} open={isOpen} onOpenChange={() => toggleCategory(key)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between bg-card rounded-xl p-4 shadow-soft border border-border hover:bg-muted/50 transition-colors">
                        <span className="flex items-center gap-2 font-bold text-foreground">
                          <span className="text-xl">{emoji}</span>
                          {key}
                          {categoryResources.length > 0 && (
                            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold">
                              {categoryResources.length}
                            </span>
                          )}
                        </span>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-3 pt-2">
                        {categoryResources.length === 0 ? (
                          <p className="text-sm text-muted-foreground px-4">אין סרטונים בקטגוריה זו</p>
                        ) : (
                          categoryResources.map((resource) => {
                            const videoId = extractYouTubeId(resource.youtube_url);
                            return (
                              <motion.div
                                key={resource.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-card rounded-xl overflow-hidden border border-border shadow-soft"
                              >
                                <p className="font-bold text-sm text-foreground p-3 pb-2">{resource.title}</p>
                                {videoId && (
                                  <div className="aspect-video">
                                    <iframe
                                      src={`https://www.youtube.com/embed/${videoId}`}
                                      title={resource.title}
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                      className="w-full h-full"
                                    />
                                  </div>
                                )}
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Bottom Nav */}
      <nav className="flex justify-around py-4 border-t border-border bg-background">
        <button onClick={() => navigate("/")} className="flex flex-col items-center gap-1 text-muted-foreground">
          <span className="text-xl">🏠</span>
          <span className="text-xs">בית</span>
        </button>
        <button onClick={() => navigate("/journey")} className="flex flex-col items-center gap-1 text-muted-foreground">
          <MapIcon className="h-5 w-5" />
          <span className="text-xs">מפת המסע</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-primary">
          <BookOpen className="h-5 w-5" />
          <span className="text-xs font-bold">מדריך</span>
        </button>
      </nav>
    </main>
  );
};

export default GuidePage;
