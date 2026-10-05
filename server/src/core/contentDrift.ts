export interface ContentDrift {
    textChanged: number;
    linesChanged: number;
    titleChanged: boolean;
}

const visibleWords = (html: string): Set<string> => {
    const text = html
        .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z0-9#]+;/gi, ' ')
        .toLowerCase();
    return new Set(text.match(/[\p{L}\p{N}]{3,}/gu) ?? []);
};

const markupLines = (html: string): string[] =>
    html.replace(/>\s*</g, '>\n<').split('\n').map((line) => line.trim()).filter(Boolean);

const title = (html: string): string =>
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim().toLowerCase();

const share = (part: number, whole: number): number => (whole ? Math.round((part / whole) * 100) / 100 : 0);

export const measureContentDrift = (before: string, after: string): ContentDrift => {
    const oldWords = visibleWords(before);
    const newWords = [...visibleWords(after)];
    const oldLines = new Set(markupLines(before));
    const newLines = markupLines(after);

    return {
        textChanged: share(newWords.filter((w) => !oldWords.has(w)).length, newWords.length),
        linesChanged: share(newLines.filter((l) => !oldLines.has(l)).length, newLines.length),
        titleChanged: title(before) !== title(after),
    };
};
