import { useEffect, useState } from "react";
import type { Project } from "../types";
import { ExternalLinkIcon, LayoutGridIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import api from "@/configs/axios";
import { toast } from "sonner";

const Community = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/api/project/published');
      setProjects(data.projects);
      setLoading(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div className="relative text-white overflow-hidden">
      {}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-indigo-600/15 blur-[130px] animate-aurora" />
      </div>

      <div className="px-4 md:px-16 lg:px-24 xl:px-32 min-h-[80vh]">
        {}
        <div className="pt-16 text-center animate-fade-in-down">
          <p className="text-indigo-400 text-sm font-medium tracking-wide uppercase">Community</p>
          <h1 className="text-shimmer text-4xl md:text-5xl font-semibold tracking-tight mt-3">
            Built with SiteBuilder
          </h1>
          <p className="text-shimmer max-w-md mx-auto mt-4">
            Explore websites the community created from a single prompt. Click any to view it live.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 py-14">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden animate-pulse">
                <div className="h-40 bg-white/5" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-2/3 rounded bg-white/10" />
                  <div className="h-3 w-full rounded bg-white/5" />
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 py-14 animate-fade-in-up">
            {projects.map((project, idx) => (
              <Link
                key={project.id}
                to={`/view/${project.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative glass rounded-2xl overflow-hidden hover:border-indigo-400/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/15 smooth-transition animate-scale-in"
                style={{ animationDelay: `${Math.min(idx * 0.07, 1)}s` }}
              >
                {}
                <div className="relative w-full h-40 bg-zinc-900 overflow-hidden border-b border-white/10">
                  {project.current_code ? (
                    <iframe
                      srcDoc={project.current_code}
                      className="absolute top-0 left-0 w-[1200px] h-[800px] origin-top-left pointer-events-none"
                      sandbox="allow-scripts allow-same-origin"
                      style={{ transform: "scale(0.25)" }}
                      title={`Preview of ${project.name}`}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-600">
                      <p>No Preview</p>
                    </div>
                  )}
                  {}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 smooth-transition flex items-end justify-center pb-3">
                    <span className="flex items-center gap-1.5 text-xs font-medium glass px-3 py-1.5 rounded-full translate-y-2 group-hover:translate-y-0 smooth-transition">
                      <ExternalLinkIcon className="size-3.5" /> View live
                    </span>
                  </div>
                </div>

                {}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold line-clamp-1">{project.name}</h2>
                    <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium">
                      Website
                    </span>
                  </div>
                  <p className="text-gray-400 mt-1.5 text-sm line-clamp-2 min-h-[2.5rem]">
                    {project.initial_prompt}
                  </p>
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="bg-gradient-to-br from-indigo-400 to-fuchsia-500 size-6 rounded-full text-white text-xs font-semibold flex items-center justify-center">
                        {project.user?.name?.slice(0, 1)?.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-300">{project.user?.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-28 animate-fade-in-up">
            <div className="flex items-center justify-center size-16 rounded-2xl glass mb-6">
              <LayoutGridIcon className="size-7 text-indigo-300" />
            </div>
            <h2 className="text-shimmer text-2xl font-semibold">No published projects yet</h2>
            <p className="text-gray-500 mt-2 max-w-sm">Be the first to share something — build a site and publish it to the community.</p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 flex items-center gap-2 text-white px-6 py-2.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/40 active:scale-95 smooth-transition animate-gradient"
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
