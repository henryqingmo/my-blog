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
