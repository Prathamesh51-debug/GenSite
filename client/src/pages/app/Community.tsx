import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Project } from "@/types";
import { ExternalLinkIcon, LayoutGridIcon, Loader2Icon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Footer from '@/shared/components/layout/Footer';
import Seo from '@/shared/components/layout/Seo';
import api from "@/shared/api/axios";
import { toast } from "sonner";
import { SketchUnderline } from '@/shared/components/ui/HandDrawn';

// Lazy thumbnail: only fetches a published site's HTML when the card scrolls near
// the viewport, then renders it in a SCRIPTS-ONLY sandbox. Keeps the grid light —
// the list endpoint no longer ships every project's full body.
const CommunityThumbnail = ({ projectId, name }: { projectId: string; name: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); } },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || code !== null) return;
    let cancelled = false;
    api.get(`/api/project/published/${projectId}`)
      .then(({ data }) => { if (!cancelled) setCode(data.code || ""); })
      .catch(() => { if (!cancelled) setCode(""); });
    return () => { cancelled = true; };
  }, [visible, projectId, code]);

  return (
    <div
      ref={ref}
      className="relative w-full h-40 bg-secondary overflow-hidden border-b border-border"
      // Let the browser skip layout/paint for cards scrolled out of view — the grid
      // can hold many script-running preview iframes, so this keeps scrolling smooth.
      style={{ contentVisibility: "auto", containIntrinsicSize: "160px" } as CSSProperties}
    >
      {code ? (
        <iframe
          srcDoc={code}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute top-0 left-0 w-[1200px] h-[800px] origin-top-left pointer-events-none"
          sandbox="allow-scripts"
          style={{ transform: "scale(0.25)" }}
          title={`Preview of ${name}`}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>{code === "" ? "No Preview" : ""}</p>
        </div>
      )}
    </div>
  );
};

const Community = () => {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const navigate = useNavigate();

  const fetchPage = async (p: number) => {
    try {
      if (p === 1) setLoading(true); else setLoadingMore(true);
      const { data } = await api.get(`/api/project/published?page=${p}`);
      setProjects((prev) => (p === 1 ? data.projects : [...prev, ...data.projects]));
      setHasMore(Boolean(data.hasMore));
      setPage(p);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
  }, []);

  return (
    <div className="relative text-foreground overflow-hidden">
      <Seo title="Community" path="/community" description="Explore responsive websites the GenSite community generated from a single prompt." />
      {}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-primary/10 blur-[130px]" />
      </div>

      <div className="px-4 md:px-16 lg:px-24 xl:px-32 min-h-[80vh]">
        {}
        <div className="pt-16 text-center animate-fade-in-down">
          <p className="text-eyebrow">From the community</p>
          <h1 className="font-display text-[44px] md:text-[66px] leading-[1.04] font-bold tracking-tight mt-3 text-foreground">
            One sentence, a thousand{' '}
            <span className="relative inline-block whitespace-nowrap text-primary">
              sites
              <SketchUnderline className="text-clay" />
            </span>.
          </h1>
          <p className="max-w-lg mx-auto mt-6 text-[17px] md:text-[18px] text-muted-foreground">
            Real pages people built from a single sentence. Tap any one to see it live.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 py-14">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-organic overflow-hidden animate-pulse">
                <div className="h-40 bg-secondary" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-2/3 rounded bg-secondary" />
                  <div className="h-3 w-full rounded bg-secondary/70" />
                  <div className="h-3 w-1/2 rounded bg-secondary/70" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 py-14 animate-fade-in-up">
              {projects.map((project, idx) => (
                <Link
                  key={project.id}
                  to={`/view/${project.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative bg-card border border-border rounded-organic overflow-hidden hover:border-primary/50 hover:-translate-y-1.5 hover:shadow-sticker smooth-transition animate-scale-in"
                  style={{ animationDelay: `${Math.min(idx * 0.07, 1)}s` }}
                >
                  {}
                  <div className="relative">
                    <CommunityThumbnail projectId={project.id} name={project.name} />
                    {}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 smooth-transition flex items-end justify-center pb-3">
                      <span className="flex items-center gap-1.5 text-xs font-medium bg-card text-foreground border border-border px-3 py-1.5 rounded-full translate-y-2 group-hover:translate-y-0 smooth-transition">
                        <ExternalLinkIcon className="size-3.5" /> View live
                      </span>
                    </div>
                  </div>

                  {}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-base font-semibold line-clamp-1 text-foreground">{project.name}</h2>
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-primary/12 text-primary border border-primary/25 text-[11px] font-medium">
                        Website
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1.5 text-sm line-clamp-2 min-h-[2.5rem]">
                      {project.initial_prompt}
                    </p>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary size-6 rounded-full text-primary-foreground text-xs font-semibold flex items-center justify-center">
                          {project.user?.name?.slice(0, 1)?.toUpperCase()}
                        </span>
                        <span className="text-xs text-foreground/90">{project.user?.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pb-16">
                <button
                  onClick={() => fetchPage(page + 1)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-organic-sm bg-card border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:border-primary/50 active:scale-95 smooth-transition disabled:opacity-60"
                >
                  {loadingMore ? <><Loader2Icon className="size-4 animate-spin" /> Loading…</> : "Load more"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-28 animate-fade-in-up">
            <div className="flex items-center justify-center size-16 rounded-organic bg-card border border-border shadow-sticker mb-6">
              <LayoutGridIcon className="size-7 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">No published projects yet</h2>
            <p className="text-muted-foreground mt-2 max-w-sm">Be the first to share something — build a site and publish it to the community.</p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 flex items-center gap-2 text-primary-foreground px-6 py-2.5 rounded-organic-sm bg-primary shadow-sticker-strong tilt-right hover:brightness-105 active:scale-95 smooth-transition"
            >
              Create your first site
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Community;
