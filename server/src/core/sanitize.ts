const ALLOWED_SCRIPT_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com'];

const START_TAG = /<[a-zA-Z][a-zA-Z0-9-]*(?:\s(?:[^>"']|"[^"]*"|'[^']*')*)?\/?>/g;

const URL_ATTR = /(\s(?:href|src|action|formaction|xlink:href)\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/gi;

const DANGEROUS_SCHEME = /^(?:javascript|vbscript|data:text\/html)/i;

const EXTERNAL_SCRIPT = /<script\b[^>]*\bsrc\s*=\s*["']?\s*(?:https?:)?\/\/([^/"'\s>]+)[^>]*>[\s\S]*?<\/script\s*>/gi;

const isDangerousUrl = (raw: string): boolean => {
    const unquoted = raw.replace(/^["']|["']$/g, '');
    const normalized = unquoted
        .replace(/&#x?0*(?:9|a|d|10|13);?/gi, '')
        .replace(/[\u0000- ]/g, '');
    return DANGEROUS_SCHEME.test(normalized);
};

const neutralizeUrls = (tag: string): string =>
    tag.replace(URL_ATTR, (whole, prefix: string, value: string) =>
        isDangerousUrl(value) ? `${prefix}"#"` : whole);

export const sanitizeHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return '';

    const withoutForeignScripts = html.replace(EXTERNAL_SCRIPT, (whole, host: string) =>
        ALLOWED_SCRIPT_HOSTS.includes(host.toLowerCase()) ? whole : '');

    return withoutForeignScripts.replace(START_TAG, neutralizeUrls);
};
