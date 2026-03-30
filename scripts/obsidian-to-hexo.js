'use strict';

const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONFIG = {
  vaultRoot:      '/Users/henry/Obsidian Vault',
  postsDir:       '/Users/henry/Hexo/my-blog/source/_posts',
  imagesDir:      '/Users/henry/Hexo/my-blog/source/images',
  timezoneOffset: '+11:00',
  publishTag:     'publish',
};

// ── Parsing ───────────────────────────────────────────────────────────────
function parseFrontmatter(rawContent) {
  const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n?---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: rawContent };
  try {
    const frontmatter = yaml.load(match[1]) || {};
    return { frontmatter, body: match[2] };
  } catch {
    return { frontmatter: null, body: rawContent };
  }
}

function isPublishable(frontmatter, body, publishTag = 'publish') {
  if (frontmatter && Array.isArray(frontmatter.tags) && frontmatter.tags.includes(publishTag)) {
    return true;
  }
  // Match standalone #publish (not #publishing) — preceded by whitespace or start
  const re = new RegExp(`(?<!\\S)#${publishTag}(?![a-zA-Z0-9_/])`, 'g');
  return re.test(body);
}

function extractTags(frontmatter, body, publishTag) { return []; }

// ── Metadata ──────────────────────────────────────────────────────────────
function toSlug(stem) { return stem; }
function formatDate(date, timezoneOffset) { return ''; }
function buildFrontmatter(title, date, tags) { return ''; }

// ── Syntax converters ─────────────────────────────────────────────────────
function stripPdfEmbeds(body) { return body; }
function convertCallouts(body) { return body; }
function convertImageEmbeds(body, vaultRoot, imagesDir) { return { transformed: body, imagesToCopy: [] }; }
function convertWikilinks(body) { return body; }
function stripInlineHashtags(body) { return { transformed: body, tags: [] }; }

// ── Orchestration ─────────────────────────────────────────────────────────
function transformBody(body, vaultRoot, imagesDir) {
  let result = body;
  result = stripPdfEmbeds(result);
  result = convertCallouts(result);
  const { transformed, imagesToCopy } = convertImageEmbeds(result, vaultRoot, imagesDir);
  result = transformed;
  result = convertWikilinks(result);
  const { transformed: finalBody, tags: inlineTags } = stripInlineHashtags(result);
  return { body: finalBody, imagesToCopy, inlineTags };
}

function scanVault(vaultRoot) { return []; }
function processNote(filePath, config) { return { published: false, reason: 'stub' }; }

function main(config) {
  const files = scanVault(config.vaultRoot);
  let published = 0, skipped = 0;
  for (const filePath of files) {
    const result = processNote(filePath, config);
    if (result.published) {
      console.log(`  ✓ ${result.slug} (${result.imagesCopied} images)`);
      published++;
    } else {
      skipped++;
    }
  }
  console.log(`\nPublished: ${published}, Skipped: ${skipped}`);
}

if (require.main === module) main(CONFIG);

module.exports = {
  parseFrontmatter, isPublishable, extractTags,
  toSlug, formatDate, buildFrontmatter,
  stripPdfEmbeds, convertCallouts, convertImageEmbeds,
  convertWikilinks, stripInlineHashtags,
};
