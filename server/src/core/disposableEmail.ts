const DISPOSABLE_DOMAINS = new Set([
    '10minutemail.com', '10minutemail.net', '20minutemail.com', 'anonaddy.me', 'burnermail.io',
    'discard.email', 'dispostable.com', 'dropmail.me', 'emailondeck.com', 'fakeinbox.com',
    'getairmail.com', 'getnada.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
    'guerrillamailblock.com', 'harakirimail.com', 'inboxkitten.com', 'jetable.org', 'mailcatch.com',
    'maildrop.cc', 'mailinator.com', 'mailinator.net', 'mailnesia.com', 'mailpoof.com',
    'mintemail.com', 'moakt.com', 'mohmal.com', 'mytemp.email', 'nada.email',
    'sharklasers.com', 'spam4.me', 'spambox.us', 'spamgourmet.com', 'temp-mail.io',
    'temp-mail.org', 'tempail.com', 'tempinbox.com', 'tempmail.dev', 'tempmail.net',
    'tempmailo.com', 'tempr.email', 'throwawaymail.com', 'tmail.ws', 'tmpmail.net',
    'tmpmail.org', 'trashmail.com', 'trashmail.de', 'yopmail.com', 'yopmail.fr',
    'yopmail.net', 'emailfake.com', 'fakemail.net', 'mail.tm', 'mail.gw',
]);

const extraDomains = (): string[] =>
    (process.env.BLOCKED_EMAIL_DOMAINS ?? '')
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

export const isDisposableEmail = (email: string): boolean => {
    const domain = email.split('@').pop()?.trim().toLowerCase();
    if (!domain) return false;
    const blocked = (d: string) => DISPOSABLE_DOMAINS.has(d) || extraDomains().includes(d);
    const parts = domain.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
        if (blocked(parts.slice(i).join('.'))) return true;
    }
    return false;
};
