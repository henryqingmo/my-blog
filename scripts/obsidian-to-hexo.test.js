'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const {
  parseFrontmatter, isPublishable, extractTags,
  toSlug, formatDate, buildFrontmatter,
  stripPdfEmbeds, convertCallouts,
  convertWikilinks, stripInlineHashtags,
} = require('./obsidian-to-hexo');

// ── parseFrontmatter ──────────────────────────────────────────────────────

test('parseFrontmatter: parses valid YAML block', () => {
  const input = '---\ntags:\n  - math\n  - calculus\n---\n### Idea\nContent here.';
  const { frontmatter, body } = parseFrontmatter(input);
  assert.deepEqual(frontmatter, { tags: ['math', 'calculus'] });
  assert.equal(body, '### Idea\nContent here.');
});

test('parseFrontmatter: returns null frontmatter when no YAML', () => {
  const input = '### Idea\nContent here.';
  const { frontmatter, body } = parseFrontmatter(input);
  assert.equal(frontmatter, null);
  assert.equal(body, input);
});

test('parseFrontmatter: empty YAML block returns empty object', () => {
  const input = '---\n---\nBody content.';
  const { frontmatter, body } = parseFrontmatter(input);
  assert.deepEqual(frontmatter, {});
  assert.equal(body, 'Body content.');
});

// ── isPublishable ─────────────────────────────────────────────────────────

test('isPublishable: true when YAML tags includes publish', () => {
  assert.equal(isPublishable({ tags: ['publish', 'math'] }, '', 'publish'), true);
});

test('isPublishable: false when no publish tag anywhere', () => {
  assert.equal(isPublishable({ tags: ['math'] }, 'some content #math', 'publish'), false);
});

test('isPublishable: true for inline #publish in body', () => {
  assert.equal(isPublishable(null, 'Content here\n#publish #math', 'publish'), true);
});

test('isPublishable: does not match #publishing (not an exact tag)', () => {
  assert.equal(isPublishable(null, '#publishing #math', 'publish'), false);
});

test('isPublishable: true with null frontmatter and inline tag', () => {
  assert.equal(isPublishable(null, '#publish', 'publish'), true);
});

test('isPublishable: does not match #publish-notes (hyphenated tag)', () => {
  assert.equal(isPublishable(null, '#publish-notes', 'publish'), false);
});

// ── extractTags ───────────────────────────────────────────────────────────

test('extractTags: pulls tags from YAML, strips publish', () => {
  const tags = extractTags({ tags: ['publish', 'machine_learning/supervised_learning'] }, '', 'publish');
  assert.deepEqual(tags, ['machine_learning/supervised_learning']);
});

test('extractTags: pulls inline hashtags from body', () => {
  const tags = extractTags(null, 'text\n#coding #math', 'publish');
  assert.ok(tags.includes('coding'));
  assert.ok(tags.includes('math'));
  assert.ok(!tags.includes('publish'));
});

test('extractTags: deduplicates across YAML and inline', () => {
  const tags = extractTags({ tags: ['math'] }, '#math #coding', 'publish');
  assert.equal(tags.filter(t => t === 'math').length, 1);
});

test('extractTags: ignores hashtags inside code fences', () => {
  const tags = extractTags(null, '```\n#math is not a tag\n```', 'publish');
  assert.equal(tags.length, 0);
});

// ── toSlug ────────────────────────────────────────────────────────────────

test('toSlug: spaces become hyphens', () => {
  assert.equal(toSlug('Cost Function'), 'cost-function');
});

test('toSlug: uppercased and acronyms lowercased', () => {
  assert.equal(toSlug('BM25'), 'bm25');
});

test('toSlug: special chars become hyphens, consecutive collapse', () => {
  assert.equal(toSlug('Week 8 - Language'), 'week-8-language');
});

// ── formatDate ────────────────────────────────────────────────────────────

test('formatDate: applies +11:00 offset', () => {
  const d = new Date('2026-02-10T02:56:18.000Z');
  assert.equal(formatDate(d, '+11:00'), '2026-02-10T13:56:18+11:00');
});

test('formatDate: crosses midnight boundary correctly', () => {
  const d = new Date('2026-02-09T14:00:00.000Z');
  assert.equal(formatDate(d, '+11:00'), '2026-02-10T01:00:00+11:00');
});

// ── buildFrontmatter ──────────────────────────────────────────────────────

test('buildFrontmatter: produces correct YAML block', () => {
  const result = buildFrontmatter('Cost Function', '2025-09-16T13:47:44+11:00', ['machine_learning']);
  assert.equal(result, '---\ntitle: "Cost Function"\ndate: 2025-09-16T13:47:44+11:00\ntags:\n  - machine_learning\n---\n\n');
});

test('buildFrontmatter: omits tags block when empty', () => {
  const result = buildFrontmatter('My Note', '2026-01-01T00:00:00+11:00', []);
  assert.ok(!result.includes('tags:'));
});

test('buildFrontmatter: quotes title containing colon', () => {
  const result = buildFrontmatter('Gradient Descent: An Overview', '2026-01-01T00:00:00+11:00', []);
  assert.ok(result.includes('title: "Gradient Descent: An Overview"'));
});
