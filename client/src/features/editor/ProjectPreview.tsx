import  { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Project } from '@/types';
import { iframeScript } from '@/assets/assets';
import EditorPanel from './EditorPanel';
import LoaderSteps from '@/shared/components/LoaderSteps';
import api from '@/shared/api/axios';
import { toast } from 'sonner';
import { emitCreditsChanged } from '@/features/billing/credits-bus';
import { SparklesIcon } from 'lucide-react';

// Injected into every previewed page so clicks on internal *.html links switch the
// active page IN-PLACE (postMessage to the parent) rather than trying to navigate the
// sandboxed srcDoc iframe, which has no real sibling files.
const navScript = `<script id="__nav">(function(){document.addEventListener('click',function(e){var el=e.target;while(el&&el.tagName!=='A')el=el.parentElement;if(!el)return;var href=el.getAttribute('href')||'';if(href.slice(-5).toLowerCase()==='.html'&&href.indexOf('://')===-1){e.preventDefault();var p=href;if(p.charAt(0)==='.'&&p.charAt(1)==='/')p=p.slice(2);else if(p.charAt(0)==='/')p=p.slice(1);parent.postMessage({type:'NAVIGATE',path:p},'*');}},true);})();<\/script>`;

interface ProjectPreviewProps {
    project: Project;
    isGenerating: boolean;
    device?: 'phone' | 'tablet' | 'desktop';
    showEditorPanel?: boolean;
    streamingHtml?: string;
    statusText?: string;
    // Optionally control the active page from the parent (so it survives a revision
    // and can be sent with chat edits). When omitted, the component manages it itself.
    activeFile?: string;
    onActiveFileChange?: (path: string) => void;
    onGenerate?: () => void;
    onCancel?: () => void;
}

export interface ProjectPreviewRef {
    getCode: () => string | undefined;
    save: () => Promise<any>;
}

const ProjectPreview = forwardRef<ProjectPreviewRef, ProjectPreviewProps>(
    ({ project, isGenerating, device = 'desktop', showEditorPanel = true, streamingHtml = '', statusText = '', activeFile: controlledActiveFile, onActiveFileChange, onGenerate, onCancel }, ref) => {
        const iframeRef = useRef<HTMLIFrameElement>(null);
        const saveTimer = useRef<number | null>(null);
        const [selectedElement, setSelectedElement] = useState<any>(null);
        const [aiLoading, setAiLoading] = useState(false);
        const [internalActiveFile, setInternalActiveFile] = useState('index.html');
        // Controlled by the parent when `activeFile` is provided, else self-managed.
        const activeFile = controlledActiveFile ?? internalActiveFile;
        const setActiveFile = (path: string) => {
            if (onActiveFileChange) onActiveFileChange(path);
            else setInternalActiveFile(path);
        };

        // Multi-page: the file set (or null for single-file / public views).
        const files = project.files || null;
        const pageNames = files ? Object.keys(files) : [];
        const isMulti = pageNames.length > 1;
        const activeHtml = (files && files[activeFile]) || project.current_code || '';
        // Per-file editing: every page is editable in the editor; the save targets the
        // active file.
        const editingActive = showEditorPanel;
        const filesRef = useRef(files);
        filesRef.current = files;

        // Reset to the home page when the project or version changes — but only when
        // UNcontrolled. A controlling parent decides when to reset (e.g. keeps you on
        // the page you just revised instead of snapping back to Home).
        useEffect(() => {
            if (controlledActiveFile === undefined) setInternalActiveFile('index.html');
        }, [project.id, project.current_version_index, controlledActiveFile]);

        // While a generation/revision is applying, close any open element editor and
        // stop treating the iframe as editable — otherwise a manual tweak made mid-run
        // is swallowed by the edit lock and then wiped when the fresh version loads.
        useEffect(() => { if (isGenerating) setSelectedElement(null); }, [isGenerating]);

        const resolutions: Record<string, string> = {
            phone: 'w-[412px]',
            tablet: 'w-[768px]',
            desktop: 'w-full'
        };

        // The editor needs `allow-same-origin` so the host can reach into the
        // iframe document (read its HTML, postMessage element selection). But
        // PUBLIC views (Preview/View, showEditorPanel=false) render OTHER users'
        // AI-generated, untrusted HTML+JS. Granting same-origin there would put
        // that script on our origin — free access to cookies, localStorage and a
        // credentialed path to our API (stored XSS). So public renders get
        // `allow-scripts` only, which runs the page in an opaque origin it can't
        // escape.
        const sandbox = showEditorPanel ? 'allow-scripts allow-same-origin' : 'allow-scripts';

        const readCleanCode = (): string | undefined => {
            const doc = iframeRef.current?.contentDocument;
            if (!doc?.documentElement) return undefined;
            const clone = doc.documentElement.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.ai-selected-element,[data-ai-selected]').forEach((el) => {
                el.classList.remove('ai-selected-element');
                el.removeAttribute('data-ai-selected');
                (el as HTMLElement).style.outline = '';
            });
            clone.querySelector('#ai-preview-style')?.remove();
            clone.querySelector('#ai-preview-script')?.remove();
            clone.querySelector('#__nav')?.remove();
            return '<!DOCTYPE html>\n' + clone.outerHTML;
        };

        // Save the ACTIVE page (multi-page aware). The server updates files[activeFile]
        // and keeps current_code mirroring the home page.
        const saveActive = async () => {
            const code = readCleanCode();
            if (!code || !project.id) return null;
            const { data } = await api.put(`/api/project/save/${project.id}`, { code, path: activeFile });
            return data;
        };

        // Persist a paid AI element edit with bounded retries. A 409 means an edit
        // lock is briefly held (autosave/revision in flight); a network error is
        // usually transient. Back off and retry a few times before asking the user to
        // hit Save, so a paid change reliably reaches the DB.
        const persistAfterAiEdit = async () => {
            const delays = [400, 1200, 3000];
            for (let attempt = 0; attempt <= delays.length; attempt++) {
                try {
                    await saveActive();
                    return;
                } catch (err: any) {
                    const status = err?.response?.status;
                    const retriable = status === 409 || status === undefined || status >= 500;
                    if (!retriable || attempt === delays.length) {
                        toast.error(err?.response?.data?.message || 'Could not save the change — please hit Save.');
                        return;
                    }
                    await new Promise((r) => setTimeout(r, delays[attempt]));
                }
            }
        };

        useImperativeHandle(ref, () => ({
            getCode: readCleanCode,
            save: saveActive,
        }));

        useEffect(() => {
            const handleMessage = (event: MessageEvent) => {
                // Only trust messages from OUR preview iframe — not any other frame
                // on the page (a sandboxed public site can't impersonate the editor).
                if (event.source !== iframeRef.current?.contentWindow) return;
                if (!event.data || typeof event.data !== 'object') return;
                if ('type' in event.data) {
                    if (event.data.type === 'ELEMENT_SELECTED') {
                        setSelectedElement(event.data.payload);
                    } else if (event.data.type === 'CLEAR_SELECTION') {
                        setSelectedElement(null);
                    } else if (event.data.type === 'NAVIGATE') {
                        const path = event.data.path;
                        if (filesRef.current && filesRef.current[path]) setActiveFile(path);
                    }
                }
            };
            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }, []);

        // Debounced persistence so MANUAL panel edits (text/class/padding/colour) are
        // saved too — previously only AI edits were persisted, so manual tweaks were
        // silently lost on reload unless the user happened to click Save.
        const scheduleSave = () => {
            if (!project.id) return;
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = window.setTimeout(async () => {
                try {
                    await saveActive();
                } catch (err: any) {
                    // 409 = another change is mid-flight; the autosave is transient,
                    // so don't alarm the user — the next edit (or explicit Save) persists it.
                    if (err?.response?.status === 409) return;
                    toast.error(err?.response?.data?.message || 'Could not save changes — please hit Save.');
                }
            }, 1000);
        };

        useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

        const handleUpdate = (updates: any) => {
            if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage(
                    {
                        type: 'UPDATE_ELEMENT',
                        payload: updates
                    },
                    '*'
                );
                scheduleSave();
            }
        };

        const handleAiEdit = async (prompt: string) => {
            if (!selectedElement?.outerHTML || !project.id) return;
            setAiLoading(true);
            try {
                const { data } = await api.post(`/api/project/edit-element/${project.id}`, {
                    html: selectedElement.outerHTML,
                    message: prompt,
                });
                iframeRef.current?.contentWindow?.postMessage(
                    { type: 'REPLACE_ELEMENT', html: data.html },
                    '*'
                );
                setSelectedElement(null);
                emitCreditsChanged(); // element edit cost 2 credits
                // The user just PAID 2 credits for this edit and it's live in the
                // preview — so the persist has to be resilient, not fire-and-forget. Let
                // the iframe apply REPLACE_ELEMENT across two frames, then save with a
                // couple of retries so a transient 409 (edit lock) or network blip
                // self-heals instead of stranding a paid change until the user notices.
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    void persistAfterAiEdit();
                }));
                toast.success('Section updated');
            } catch (error: any) {
                toast.error(error?.response?.data?.message || error.message);
            } finally {
                setAiLoading(false);
            }
        };

        const injectPreview = (html: string) => {
            if (!html || typeof html !== 'string') return "";
            let out = html;

            // In-preview page navigation (multi-page). Harmless for single-page sites,
            // which use #anchors, not *.html links.
            if (!out.includes('id="__nav"')) {
                out = out.includes('</body>') ? out.replace('</body>', navScript + '</body>') : out + navScript;
            }

            // Element-selection tooling — only on the editable (home) page.
            if (editingActive && !out.includes('ai-preview-script')) {
                out = out.includes('</body>') ? out.replace('</body>', iframeScript + '</body>') : out + iframeScript;
            }

            return out;
        };

        return (
            <div
                className="relative h-full bg-gray-900 flex-1 rounded-xl overflow-hidden max-sm:ml-2"
            >
                {project.current_code ? (
                    <div className="flex flex-col h-full">
                        {isMulti && (
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-gray-950/60 border-b border-white/10 px-2 py-1.5" role="tablist" aria-label="Pages">
                                {pageNames.map((name) => (
                                    <button
                                        key={name}
                                        type="button"
                                        role="tab"
                                        aria-selected={activeFile === name}
                                        onClick={() => setActiveFile(name)}
                                        className={`shrink-0 rounded px-2.5 py-1 text-xs font-medium transition-colors ${activeFile === name ? 'bg-indigo-500/30 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="relative flex-1 overflow-hidden">
                            <iframe
                                ref={iframeRef}
                                srcDoc={injectPreview(activeHtml)}
                                className={`h-full max-sm:w-full ${resolutions[device]} mx-auto transition-all ${isGenerating ? 'pointer-events-none' : ''}`}
                                sandbox={sandbox}
                                // Remount only on identity changes (device / project / version / page).
                                // Content edits flow through the srcDoc prop, which reloads the frame on
                                // its own — keying on content length risked a hash-collision showing a
                                // stale page.
                                key={device + '|' + (project.id || '') + '|' + (project.current_version_index || '') + '|' + activeFile}
                                title="project-preview"
                            />
                            {editingActive && selectedElement && !isGenerating && (
                                <EditorPanel
                                    selectedElement={selectedElement}
                                    onUpdate={handleUpdate}
                                    onAiEdit={handleAiEdit}
                                    aiLoading={aiLoading}
                                    onClose={() => {
                                        setSelectedElement(null);
                                        if (iframeRef.current?.contentWindow) {
                                            iframeRef.current.contentWindow.postMessage(
                                                { type: 'CLEAR_SELECTION_REQUEST' },
                                                '*'
                                            );
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>
                ) : streamingHtml ? (
                    <div className="relative h-full">
                        <iframe
                            srcDoc={streamingHtml}
                            className="h-full w-full"
                            sandbox={sandbox}
                            title="generating-preview"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/70 backdrop-blur px-3 py-1.5 text-xs text-white border border-white/10">
                            <span className="size-2 rounded-full bg-indigo-400 animate-pulse" /> Building your site…
                        </div>
                        {onCancel && (
                            <button onClick={onCancel} className="absolute top-3 right-3 rounded-full bg-black/70 backdrop-blur px-3 py-1.5 text-xs text-gray-200 border border-white/10 hover:bg-black/90 hover:text-white transition-colors">Cancel</button>
                        )}
                    </div>
                ) : isGenerating ? (
                    <div className="relative h-full">
                        <LoaderSteps />
                        {statusText && (
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/70 backdrop-blur px-4 py-1.5 text-xs text-gray-100 border border-white/10 max-w-[90%]">
                                <span className="size-2 shrink-0 rounded-full bg-indigo-400 animate-pulse" />
                                <span className="truncate">{statusText}</span>
                            </div>
                        )}
                        {onCancel && (
                            <button onClick={onCancel} className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 backdrop-blur px-4 py-1.5 text-xs text-gray-200 border border-white/10 hover:bg-white/20 hover:text-white transition-colors">Cancel generation</button>
                        )}
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6 text-gray-400">
                        <p className="text-sm">This project hasn’t been generated yet.</p>
                        {onGenerate && (
                            <button
                                onClick={() => onGenerate()}
                                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition active:scale-95 hover:shadow-lg hover:shadow-indigo-500/40"
                            >
                                <SparklesIcon className="size-4" /> Generate website · 5 credits
                            </button>
                        )}
                        <p className="text-xs text-gray-500 max-w-sm">Generation uses 5 credits. If it fails, your credits are refunded automatically.</p>
                    </div>
                )}
            </div>
        );
    }
);

export default ProjectPreview