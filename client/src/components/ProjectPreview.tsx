import  { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Project } from '../types';
import { iframeScript } from '../assets/assets';
import EditorPanel from './EditorPanel';
import LoaderSteps from './LoaderSteps';
import api from '@/configs/axios';
import { toast } from 'sonner';

interface ProjectPreviewProps {
    project: Project;
    isGenerating: boolean;
    device?: 'phone' | 'tablet' | 'desktop';
    showEditorPanel?: boolean;
    streamingHtml?: string;
}

export interface ProjectPreviewRef {
    getCode: () => string | undefined;
}

const ProjectPreview = forwardRef<ProjectPreviewRef, ProjectPreviewProps>(
    ({ project, isGenerating, device = 'desktop', showEditorPanel = true, streamingHtml = '' }, ref) => {
        const iframeRef = useRef<HTMLIFrameElement>(null);
        const [selectedElement, setSelectedElement] = useState<any>(null);
        const [aiLoading, setAiLoading] = useState(false);

        const resolutions: Record<string, string> = {
            phone: 'w-[412px]',
            tablet: 'w-[768px]',
            desktop: 'w-full'
        };

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
            return '<!DOCTYPE html>\n' + clone.outerHTML;
        };

        useImperativeHandle(ref, () => ({
            getCode: readCleanCode,
        }));

        useEffect(() => {
            const handleMessage = (event: MessageEvent) => {
                if (!event.data || typeof event.data !== 'object') return;
                if ('type' in event.data) {
                    if (event.data.type === 'ELEMENT_SELECTED') {
                        setSelectedElement(event.data.payload);
                    } else if (event.data.type === 'CLEAR_SELECTION') {
                        setSelectedElement(null);
                    }
                }
            };
            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }, []);

        const handleUpdate = (updates: any) => {
            if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage(
                    {
                        type: 'UPDATE_ELEMENT',
                        payload: updates
                    },
                    '*'
                );
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
                setTimeout(async () => {
                    const code = readCleanCode();
                    if (code) {
                        try {
                            await api.put(`/api/project/save/${project.id}`, { code });
                        } catch {
                            
                        }
                    }
                }, 250);
                toast.success('Section updated');
            } catch (error: any) {
                toast.error(error?.response?.data?.message || error.message);
            } finally {
                setAiLoading(false);
            }
        };

        const injectPreview = (html: string) => {
            if (!html || typeof html !== 'string') return "";
            if (!showEditorPanel) return html;

            if (html.includes('<script') && html.includes('ai-preview-script')) {
                return html;
            }

            if (html.includes('</body>')) {
                return html.replace('</body>', iframeScript + '</body>');
            } else {
                return html + iframeScript;
            }
        };

        return (
            <div
                className="relative h-full bg-gray-900 flex-1 rounded-xl overflow-hidden max-sm:ml-2"
            >
                {project.current_code ? (
                    <>
                        <iframe
                            ref={iframeRef}
                            srcDoc={injectPreview(project.current_code)}
                            className={`h-full max-sm:w-full ${resolutions[device]} mx-auto transition-all`}
                            sandbox="allow-scripts allow-same-origin"
                            key={device + (project.id || '') + (project.current_version_index || '') + (project.current_code?.length || 0)}
                            title="project-preview"
                        />
                        {showEditorPanel && selectedElement && (
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
                    </>
                ) : streamingHtml ? (
                    <div className="relative h-full">
                        <iframe
                            srcDoc={streamingHtml}
                            className="h-full w-full"
                            sandbox="allow-scripts allow-same-origin"
                            title="generating-preview"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/70 backdrop-blur px-3 py-1.5 text-xs text-white border border-white/10">
                            <span className="size-2 rounded-full bg-indigo-400 animate-pulse" /> Building your site…
                        </div>
                    </div>
                ) : isGenerating ? (
                    <LoaderSteps />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6 text-gray-400">
                        <p className="text-sm">Your preview will appear here once generation finishes.</p>
                        <p className="text-xs text-gray-500 max-w-sm">If nothing generated, check the chat on the left — your credits are refunded on failure. Send a new request to try again.</p>
                    </div>
                )}
            </div>
        );
    }
);

export default ProjectPreview