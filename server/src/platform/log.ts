import { currentContext } from '@/platform/requestContext.js';

type Level = 'info' | 'warn' | 'error';

export const log = (event: string, fields: Record<string, unknown> = {}, level: Level = 'info'): void => {
    const line = JSON.stringify({ level, event, requestId: currentContext()?.requestId, ...fields });
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
};
