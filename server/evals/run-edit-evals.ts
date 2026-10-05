import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createChatCompletion } from '@/generation/llm.js';
import { editModel } from '@/generation/models.js';
import { buildRevisionMessages } from '@/generation/prompts.js';
import { extractHtml, looksLikeHtml } from '@/core/html.js';
import { parseEditSummary, stripEditSummary } from '@/core/editSummary.js';
import { measureContentDrift } from '@/core/contentDrift.js';

interface EvalCase {
    name: string;
    request: string;
    expect: { intent: 'edit' | 'new-site'; minChanges?: number; maxTextChanged?: number };
}

interface RunResult {
    caseName: string;
    fixture: string;
    passed: boolean;
    failures: string[];
    seconds: number;
    provider: string | null;
    finish: string | null;
    outTokens: number | null;
    costUsd: number | null;
    intent: string | null;
    changes: number;
    textChanged: number | null;
}

const arg = (name: string, fallback: string): string => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const tier = arg('tier', 'free');
const runs = Number(arg('runs', '1'));
const only = arg('case', '');
const fixtureDir = path.resolve(arg('fixtures', '../assets/samples'));
const outDir = path.resolve('evals/out', new Date().toISOString().replace(/[:.]/g, '-'));

const cases = (JSON.parse(fs.readFileSync('evals/cases.json', 'utf8')) as EvalCase[])
    .filter((c) => !only || only.split(',').some((part) => c.name.includes(part.trim())));
const fixtures = fs.readdirSync(fixtureDir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ name: f.replace(/\.html$/, ''), html: fs.readFileSync(path.join(fixtureDir, f), 'utf8') }));

const check = (c: EvalCase, intent: string | null, changes: number, textChanged: number | null, validHtml: boolean, cutOffAt: number | null): string[] => {
    const failures: string[] = [];
    if (intent !== c.expect.intent) failures.push(`intent ${intent} ≠ ${c.expect.intent}`);
    if (c.expect.intent === 'edit') {
        if (cutOffAt !== null) failures.push(`cut off at ${cutOffAt} output tokens`);
        else if (!validHtml) failures.push('no valid HTML');
        if (c.expect.minChanges && changes < c.expect.minChanges) failures.push(`${changes} changes < ${c.expect.minChanges}`);
        if (c.expect.maxTextChanged !== undefined && (textChanged ?? 1) > c.expect.maxTextChanged) {
            failures.push(`text changed ${textChanged} > ${c.expect.maxTextChanged}`);
        }
    }
    return failures;
};

const runOne = async (c: EvalCase, fixture: { name: string; html: string }, n: number): Promise<RunResult> => {
    const started = Date.now();
    const base = { caseName: c.name, fixture: fixture.name };
    try {
        const res: any = await createChatCompletion({
            model: editModel(tier),
            max_tokens: 24000,
            messages: buildRevisionMessages('', c.request, fixture.html),
        });
        const raw = res?.choices?.[0]?.message?.content ?? '';
        const summary = parseEditSummary(raw);
        const html = stripEditSummary(extractHtml(raw));
        const finish = res?.choices?.[0]?.finish_reason ?? null;
        const outTokens = res?.usage?.completion_tokens ?? null;
        const validHtml = looksLikeHtml(html) && /<\/html>/i.test(html) && finish !== 'length';
        const textChanged = validHtml ? measureContentDrift(fixture.html, html).textChanged : null;
        if (validHtml) fs.writeFileSync(path.join(outDir, `${fixture.name}--${c.name.replace(/\W+/g, '-')}--${n}.html`), html);
        const failures = check(c, summary.intent, summary.changes.length, textChanged, validHtml, finish === 'length' ? outTokens : null);
        return {
            ...base,
            passed: failures.length === 0,
            failures,
            seconds: Math.round((Date.now() - started) / 1000),
            provider: res?.provider ?? null,
            finish,
            outTokens,
            costUsd: res?.usage?.cost ?? null,
            intent: summary.intent,
            changes: summary.changes.length,
            textChanged,
        };
    } catch (err: any) {
        return {
            ...base, passed: false, failures: [`error: ${err?.message ?? err}`], seconds: Math.round((Date.now() - started) / 1000),
            provider: null, finish: null, outTokens: null, costUsd: null, intent: null, changes: 0, textChanged: null,
        };
    }
};

const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
};

const main = async () => {
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`Edit evals — tier=${tier} model=${editModel(tier)} fixtures=${fixtures.map((f) => f.name).join(',')} runs=${runs}`);

    const jobs = cases.flatMap((c) => fixtures.flatMap((f) => Array.from({ length: runs }, (_, n) => () => runOne(c, f, n + 1))));
    const results = await Promise.all(jobs.map((job) => job()));

    const rows = cases.map((c) => {
        const rs = results.filter((r) => r.caseName === c.name);
        const passed = rs.filter((r) => r.passed).length;
        const cost = rs.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
        return `| ${c.name} | ${passed}/${rs.length} | ${median(rs.map((r) => r.seconds))} s | $${(cost / rs.length).toFixed(4)} | ${rs.map((r) => r.changes).join(', ')} |`;
    });
    const failures = results.filter((r) => !r.passed).map((r) => `- ${r.caseName} on ${r.fixture}: ${r.failures.join('; ')}`);
    const total = results.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);

    const report = [
        `# Edit evals — ${tier} tier (${editModel(tier)})`,
        '',
        '| Case | Passed | Median time | Avg cost | Changes listed |',
        '|---|---|---|---|---|',
        ...rows,
        '',
        `Total: ${results.filter((r) => r.passed).length}/${results.length} passed, $${total.toFixed(4)} spent.`,
        ...(failures.length ? ['', '## Failures', ...failures] : []),
        '',
        `Providers: ${[...new Set(results.map((r) => r.provider).filter(Boolean))].join(', ') || 'n/a'}`,
    ].join('\n');

    fs.writeFileSync(path.join(outDir, 'report.md'), report);
    fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
    console.log(`\n${report}\n\nOutputs: ${outDir}`);
    process.exit(results.every((r) => r.passed) ? 0 : 1);
};

main();
