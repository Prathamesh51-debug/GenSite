import { useEffect, useRef, useState } from 'react';

interface StreamingPreviewProps {
    html: string;
    sandbox: string;
}

const SETTLE_MS = 200;

const StreamingPreview = ({ html, sandbox }: StreamingPreviewProps) => {
    const [frames, setFrames] = useState<[string, string]>(['', '']);
    const [front, setFront] = useState(0);
    const frontRef = useRef(0);
    const pending = useRef<number | null>(null);
    const timer = useRef<number | null>(null);

    useEffect(() => {
        const back = 1 - frontRef.current;
        pending.current = back;
        setFrames((prev) => (back === 0 ? [html, prev[1]] : [prev[0], html]));
    }, [html]);

    useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

    const handleLoad = (index: number) => {
        if (pending.current !== index) return;
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            if (pending.current !== index) return;
            pending.current = null;
            frontRef.current = index;
            setFront(index);
        }, SETTLE_MS);
    };

    return (
        <div className="absolute inset-0">
            {frames.map((srcDoc, index) => (
                <iframe
                    key={index}
                    srcDoc={srcDoc}
                    sandbox={sandbox}
                    onLoad={() => handleLoad(index)}
                    title={index === front ? 'generating-preview' : 'generating-preview-next'}
                    aria-hidden={index !== front}
                    className={`absolute inset-0 h-full w-full transition-opacity duration-150 ${index === front ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                />
            ))}
        </div>
    );
};

export default StreamingPreview;
