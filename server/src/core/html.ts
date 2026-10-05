import { sanitizeHtml } from './sanitize.js';

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

    const extracted = s.trim();
    return looksLikeHtml(extracted) ? sanitizeHtml(extracted) : extracted;
};

export const looksLikeHtml = (s: string): boolean =>
    !!s && s.length > 30 && /<[a-z!]/i.test(s);

export interface SectionDescriptor {
    id: string;
    tag: string;
    outerHtml: string;
}

export const extractSections = (html: string): SectionDescriptor[] => {
    const sections: SectionDescriptor[] = [];
    const sectionRegex = /<(section|header|footer|nav|main|article)([^>]*)>([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null;

    while ((match = sectionRegex.exec(html)) !== null) {
        const tag = match[1].toLowerCase();
        const attrs = match[2];
        const idMatch = attrs.match(/data-section-id=["']([^"']+)["']/i) || attrs.match(/id=["']([^"']+)["']/i);
        const id = idMatch ? idMatch[1] : `${tag}-${sections.length + 1}`;
        sections.push({
            id,
            tag,
            outerHtml: match[0],
        });
    }

    return sections;
};

export const replaceSectionById = (fullHtml: string, sectionId: string, newSectionHtml: string): string => {
    if (!fullHtml || !sectionId || !newSectionHtml) return fullHtml;

    const dataIdRegex = new RegExp(`<(section|header|footer|nav|main|article)[^>]*data-section-id=["']${sectionId}["'][^>]*>[\\s\\S]*?<\\/\\1>`, 'i');
    if (dataIdRegex.test(fullHtml)) {
        return fullHtml.replace(dataIdRegex, newSectionHtml);
    }

    const idRegex = new RegExp(`<(section|header|footer|nav|main|article)[^>]*id=["']${sectionId}["'][^>]*>[\\s\\S]*?<\\/\\1>`, 'i');
    if (idRegex.test(fullHtml)) {
        return fullHtml.replace(idRegex, newSectionHtml);
    }

    return fullHtml;
};

export const tagSectionsIfMissing = (html: string): string => {
    if (!html) return html;
    let index = 0;
    return html.replace(/<(section|header|footer|nav|main|article)(?![^>]*data-section-id=)([^>]*)>/gi, (_match, tag, attrs) => {
        index++;
        const idMatch = attrs.match(/id=["']([^"']+)["']/i);
        const sectionId = idMatch ? idMatch[1] : `${tag.toLowerCase()}-${index}`;
        return `<${tag}${attrs} data-section-id="${sectionId}">`;
    });
};
