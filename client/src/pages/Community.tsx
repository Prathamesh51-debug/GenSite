import React, { useEffect, useState } from "react";
import type { Project } from "../types";
import { Loader2Icon, PlusIcon, TrashIcon } from "lucide-react";
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
      const {data} = await api.get('/api/project/published');
      setProjects(data.projects);
      setLoading(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message)
      console.error(error)
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <>
      <div className="px-4 md:px-16 lg:px-24 xl:px-32">
        {loading ? (
          <div className="flex items-center justify-center h-[80vh]">
            <Loader2Icon className="size-7 animate-spin text-indigo-200" />
          </div>
        ) : projects.length > 0 ? (
          <div className="py-10 min-h-[80vh] animate-fade-in-up">
            <div className="flex items-center justify-between mb-12 animate-fade-in-down">
              <h1 className="text-2xl font-medium text-white">
                Published projects
              </h1>
            </div>

            <div className="flex flex-wrap gap-3.5">
              {projects.map((project, idx) => (
                <Link
                  key={project.id}
                  to={`/view/${project.id}`}
                  target="_blank"
                  className={`w-72 max-sm:mx-auto cursor-pointer bg-gray-900/60 border border-gray-700 rounded-lg overflow-hidden group hover:border-indigo-800/80 hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/20 smooth-transition animate-scale-in`}
                  style={{animationDelay: `${Math.min(idx * 0.1, 1)}s`}}
                >
                  <div
                    className="relative w-full h-40 bg-gray-900
                  overflow-hidden border-b border-gray-800"
                  >
                    {project.current_code ? (
                      <iframe
                        srcDoc={project.current_code}
                        className="absolute top-0 left-0 w-[1200px] h-[800px]
                       origin-top-left pointer-events-none"
                        sandbox="allow-scripts allow-same-origin"
                        style={{ transform: "scale(0.25)" }}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center h-full 
                      text-gray-500"
                      >
                        <p>No Preview</p>
                      </div>
                    )}
                  </div>
                  {/*contents */}
                  <div
                    className="p-4 text-white bg-gradient-to-b
                 from-transparent group-hover:from-indigo-950/50
                 to-transparent smooth-transition"
                  >
                    <div className="flex items-start justify-between">
                      <h2
                        className="text-lg font-medium
                  line-clamp-2"
                      >
                        {project.name}
                      </h2>
                      <span
                        className="ml-2 px-4 py-1 rounded-full bg-[#242a38] text-white/70 border border-[#3c4250] text-xs font-semibold shadow-lg transition-all"
                        style={{ letterSpacing: "0.02em" }}
                      >
                        Website
                      </span>
                    </div>
                    <p
                      className="text-gray-400 mt-1 text-sm
                  line-clamp-2"
                    >
                      {project.initial_prompt}
                    </p>

                    <div
                      className="flex justify-between items-center
                  mt-6"
                    >
                      <span className="text-xs text-gray-500">
                        {new Date(project.createdAt).toLocaleDateString()}{" "}
                      </span>
                      <div className="flex  gap-3 text-white text-sm">
                        <button
                          className="px-3 py-1.5 bg-white/10
                      hover:bg-white/15 rounded-md
                      smooth-transition flex 
                      items-center gap-2"
                        >
                          <span
                            className="bg-gray-200 size-4.5
                        rounded-full text-black font-semibold
                        flex items-center justify-center"
                          >
                            {project.user?.name?.slice(0, 1)}
                          </span>
                          {project.user?.name}
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[80vh] animate-fade-in-up">
            <h1 className="text-3xl font-semibold text-gray-300">
              You have no project yet!
            </h1>
            <button
              onClick={() => navigate("/")}
              className="text-white px-5 py-2 mt-5 rounded-md 
          bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 active:scale-95 smooth-transition hover:shadow-lg hover:shadow-indigo-500/50"
            >
              Create New
            </button>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Community;
