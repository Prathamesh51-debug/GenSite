export const extractHtml = (raw?: string | null): string => {
    let s = (raw || '').trim();
    if (!s) return '';

    s = s.replace(/```+[a-z]*\n?/gi, '').replace(/```+/g, '').trim();

    const docStart = s.search(/<!doctype html|<html[\s>]/i);
    if (docStart > 0) {
        s = s.slice(docStart);
    } else if (docStart === -1) {
        const tagStart = s.search(/<[a-z][a-z0-9-]*(?:\s|>|\/)/i);
        if (tagStart > 0) s = s.slice(tagStart);
    }

    const htmlEnd = s.toLowerCase().lastIndexOf('</html>');
    if (htmlEnd !== -1) s = s.slice(0, htmlEnd + 7);

    return s.trim();
};

export const looksLikeHtml = (s: string): boolean =>
    !!s && s.length > 30 && /<[a-z!]/i.test(s);
