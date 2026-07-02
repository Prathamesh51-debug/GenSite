import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom";
import { Loader2Icon } from "lucide-react";
import ProjectPreview from "@/features/editor/ProjectPreview";
import type { Project } from "@/types";
import api from "@/shared/api/axios";
import { toast } from "sonner";
import { authClient } from "@/shared/api/auth-client";


const Preview = () => {

  const { data: session, isPending } = authClient.useSession()
  const navigate = useNavigate()
  const { projectId, versionId } = useParams();
  const [code, setCode] = useState('');
  const [files, setFiles] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCode = async () => {
    try {
      if (versionId) {
        // A specific version's full body (code + multi-page files) is fetched lazily
        // — the preview list only carries version metadata now.
        const { data } = await api.get(`/api/project/version/${projectId}/${versionId}`)
        setCode(data.code || '')
        setFiles(data.files ?? null)
      } else {
        const { data } = await api.get(`/api/project/preview/${projectId}`)
        setCode(data.project.current_code || '')
        setFiles(data.project.files ?? null)
      }
      setLoading(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message)
      console.error(error)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isPending) return
    if (session?.user) {
      fetchCode()
    } else {
      // Owner-only view — send anonymous visitors to sign in instead of leaving
      // them on a dead "Nothing to preview yet" screen.
      navigate('/auth/signin')
    }
  }, [isPending, session?.user?.id, projectId, versionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2Icon className="size-7 animate-spin text-indigo-200" />
      </div>
    )
  }
  return (
    <div className="h-screen">
      {code ? (
        <ProjectPreview project={{ current_code: code, files } as Project}
          isGenerating={false} showEditorPanel={false} />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          Nothing to preview yet.
        </div>
      )}
    </div>
  )
}

export default Preview