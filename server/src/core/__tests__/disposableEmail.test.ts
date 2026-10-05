import { describe, it, expect, afterEach } from 'vitest';
import { isDisposableEmail } from '../disposableEmail.js';

describe('isDisposableEmail', () => {
  afterEach(() => { delete process.env.BLOCKED_EMAIL_DOMAINS; });

  it('blocks known throwaway providers and their subdomains, case-insensitively', () => {
    expect(isDisposableEmail('bot@mailinator.com')).toBe(true);
    expect(isDisposableEmail('bot@YOPMAIL.com')).toBe(true);
    expect(isDisposableEmail('bot@eu.guerrillamail.com')).toBe(true);
  });

  it('allows real providers and lookalikes', () => {
    expect(isDisposableEmail('me@gmail.com')).toBe(false);
    expect(isDisposableEmail('me@notmailinator.com')).toBe(false);
    expect(isDisposableEmail('no-at-sign')).toBe(false);
  });

  it('honours extra domains from BLOCKED_EMAIL_DOMAINS', () => {
    process.env.BLOCKED_EMAIL_DOMAINS = ' spam.example , junk.test';
    expect(isDisposableEmail('x@junk.test')).toBe(true);
  });
});
