export type EditIntent = 'edit' | 'new-site';

export interface EditSummary {
    intent: EditIntent | null;
    changes: string[];
}

const SUMMARY_BLOCK = /<!--\s*intent:([\s\S]*?)-->/i;

export const parseEditSummary = (raw?: string | null): EditSummary => {
    const match = (raw || '').match(SUMMARY_BLOCK);
    if (!match) return { intent: null, changes: [] };

    const [firstLine, ...rest] = match[1].split('\n');
    const label = firstLine.trim().toLowerCase();
    const intent: EditIntent | null = /^new[\s_-]?site/.test(label) ? 'new-site' : /^edit/.test(label) ? 'edit' : null;

    const changes = rest
        .map((line) => line.trim())
        .filter((line) => /^[-*•]\s+\S/.test(line))
        .map((line) => line.replace(/^[-*•]\s+/, '').slice(0, 140))
        .slice(0, 6);

    return { intent, changes };
};

export const stripEditSummary = (html: string): string =>
    html.replace(new RegExp(SUMMARY_BLOCK.source, 'gi'), '').trim();

export const describeChanges = (changes: string[]): string =>
    changes.length
        ? `Here's what I changed:\n${changes.map((change) => `• ${change}`).join('\n')}`
        : "I've made the changes to your website. You can preview it now.";

export const formatEditHistory = (
    conversation: { role: string; content: string }[],
    limit = 8,
): string => {
    const recent = conversation.slice(-limit);
    if (!recent.length) return '';
    const lines = recent.map((m) => `${m.role === 'user' ? 'User' : 'You'}: ${m.content.slice(0, 400)}`);
    return `EARLIER IN THIS SESSION (oldest to newest):\n${lines.join('\n')}\n\n`;
};
