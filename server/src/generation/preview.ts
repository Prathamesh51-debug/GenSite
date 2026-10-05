import { sanitizeHtml } from '@/core/sanitize.js';
import { placeholderImages } from '@/generation/images.js';

const SHOW_ANIMATED = '<style>[data-aos]{opacity:1!important;transform:none!important}</style>';
const FOLLOW_BUILD = '<script>addEventListener("load",function(){setTimeout(function(){scrollTo(0,document.body.scrollHeight)},150)})</script>';

const count = (html: string, pattern: RegExp): number => (html.match(pattern) ?? []).length;

export const previewSnapshot = (raw: string): string | null => {
    const unfenced = raw.replace(/```+[a-z]*\n?/gi, '');
    const start = unfenced.search(/<!doctype html|<html[\s>]/i);
    if (start === -1) return null;

    let html = unfenced
        .slice(start)
        .replace(/<[^>]*$/, '')
        .replace(/<script\b(?![^>]*@tailwindcss\/browser)[^>]*>[\s\S]*?(?:<\/script\s*>|$)/gi, '');

    if (!/<body[\s>]/i.test(html)) return null;
    if (count(html, /<style\b/gi) > count(html, /<\/style>/gi)) html += '</style>';

    html = placeholderImages(sanitizeHtml(html));
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (tag) => tag + SHOW_ANIMATED) : SHOW_ANIMATED + html;
    return html + FOLLOW_BUILD;
};
