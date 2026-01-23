import  { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Project } from '../types';
import { iframeScript } from '../assets/assets';
import EditorPanel from './EditorPanel';
import LoaderSteps from './LoaderSteps';

interface ProjectPreviewProps {
    project: Project;
    isGenerating: boolean;
    device?: 'phone' | 'tablet' | 'desktop';
    showEditorPanel?: boolean;
}

export interface ProjectPreviewRef {
    getCode: () => string | undefined;
}

const ProjectPreview = forwardRef<ProjectPreviewRef, ProjectPreviewProps>(
    ({ project, isGenerating, device = 'desktop', showEditorPanel = true }, ref) => {
        const iframeRef = useRef<HTMLIFrameElement>(null);
        const [selectedElement, setSelectedElement] = useState<any>(null);

        const resolutions: Record<string, string> = {
            phone: 'w-[412px]',
            tablet: 'w-[768px]',
            desktop: 'w-full'
        };

        useImperativeHandle(ref, () => ({
            getCode: () => {
                const doc = iframeRef.current?.contentDocument;
                if (!doc) return undefined;

                // Remove selection highlights before getting HTML
                doc
                    .querySelectorAll('.ai-selected-element,[data-ai-selected]')
                    .forEach((el) => {
                        el.classList.remove('ai-selected-element');
                        el.removeAttribute('data-ai-selected');
                        (el as HTMLElement).style.outline = '';
                    });

                // Remove injected preview style or script if present
                const previewStyle = doc.getElementById('ai-preview-style');
                if (previewStyle) previewStyle.parentNode?.removeChild(previewStyle);

                const previewScript = doc.getElementById('ai-preview-script');
                if (previewScript) previewScript.parentNode?.removeChild(previewScript);

                // Check for document root existence
                if (doc.documentElement) {
                    return doc.documentElement.outerHTML;
                }
                return undefined;
            },
        }));

        useEffect(() => {
            const handleMessage = (event: MessageEvent) => {
                // Make sure message comes from the expected iframe if possible
                // (skip origin check for dev for simplicity)
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

        // Defensive: If html is not a string or empty don't proceed
        const injectPreview = (html: string) => {
            if (!html || typeof html !== 'string') return "";
            if (!showEditorPanel) return html;

            // Only inject once, avoid duplicate script
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
                            // Add sandbox for safety
                            sandbox="allow-scripts allow-same-origin"
                            // Make sure iframe is not cached
                            key={device + (project.id || '')}
                            title="project-preview"
                        />
                        {showEditorPanel && selectedElement && (
                            <EditorPanel
                                selectedElement={selectedElement}
                                onUpdate={handleUpdate}
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
                ) : isGenerating ? (
                    <LoaderSteps />
                ) : null}
            </div>
        );
    }
);

export default ProjectPreview