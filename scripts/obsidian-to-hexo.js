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
  const escaped = publishTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<!\\S)#${escaped}(?![a-zA-Z0-9_\\-/])`, 'g');
  return re.test(body);
}

function extractTags(frontmatter, body, publishTag = 'publish') {
  const tags = new Set();
  if (frontmatter && Array.isArray(frontmatter.tags)) {
    frontmatter.tags.forEach(t => { if (String(t) !== publishTag) tags.add(String(t)); });
  }
  // Strip code blocks before scanning inline tags
  const cleanBody = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '');
  const re = /(?<!\S)#([a-zA-Z][a-zA-Z0-9_/\-]*)/g;
  let m;
  while ((m = re.exec(cleanBody)) !== null) {
    if (m[1] !== publishTag) tags.add(m[1]);
  }
  return [...tags];
}

// ── Metadata ──────────────────────────────────────────────────────────────
function toSlug(stem) {
  return stem
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
function formatDate(date, timezoneOffset) {
  const sign = timezoneOffset[0] === '+' ? 1 : -1;
  const [h, m] = timezoneOffset.slice(1).split(':').map(Number);
  const local = new Date(date.getTime() + sign * (h * 60 + m) * 60 * 1000);
  const p = n => String(n).padStart(2, '0');
  return `${local.getUTCFullYear()}-${p(local.getUTCMonth()+1)}-${p(local.getUTCDate())}` +
         `T${p(local.getUTCHours())}:${p(local.getUTCMinutes())}:${p(local.getUTCSeconds())}${timezoneOffset}`;
}
function buildFrontmatter(title, date, tags) {
  const safeTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const lines = ['---', `title: "${safeTitle}"`, `date: ${date}`];
  if (tags.length > 0) {
    lines.push('tags:');
    tags.forEach(t => lines.push(`  - ${t}`));
  }
  lines.push('---', '');
  return lines.join('\n') + '\n';
}

// ── Syntax converters ─────────────────────────────────────────────────────
function stripPdfEmbeds(body) {
  return body
    .replace(/!\[\[[^\]]*\.pdf[^\]]*\]\]/gi, '')
    .replace(/\[\[[^\]]*\.pdf[^\]]*\]\]/gi, '');
}

function convertCallouts(body) {
  const lines = body.split('\n');
  const out = [];
  let inCallout = false;

  for (const line of lines) {
    const norm = line.replace(/^>>/g, '>'); // flatten nested >>
    if (!inCallout) {
      const m = norm.match(/^>\s*\[!(\w+)\]\s*(.*)$/);
      if (m) {
        const type = m[1].toUpperCase();
        const title = m[2].trim();
        out.push(`> ${title ? `**${type}: ${title}**` : `**${type}**`}`);
        inCallout = true;
      } else {
        out.push(line);
      }
    } else {
      if (/^>\s?/.test(norm)) {
        out.push(`> ${norm.replace(/^>\s?/, '')}`);
      } else {
        inCallout = false;
        out.push(line);
      }
    }
  }
  return out.join('\n');
}

function convertImageEmbeds(body, vaultRoot, imagesDir) { return { transformed: body, imagesToCopy: [] }; }

function convertWikilinks(body) {
  return body
    // [[Note|Alias]] or [[Note#Section|Alias]] → Alias
    .replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1')
    // [[Note#Section]] → Note  (drop anchor)
    .replace(/\[\[([^\]#|]+)#[^\]]*\]\]/g, '$1')
    // [[Note]] → Note
    .replace(/\[\[([^\]|#]+)\]\]/g, '$1');
}

function stripInlineHashtags(body) {
  const tags = new Set();
  // Protect code fences and inline code with placeholders
  const fences = [], inlines = [];
  let s = body
    .replace(/```[\s\S]*?```/g, m => { fences.push(m); return `\x00F${fences.length-1}\x00`; })
    .replace(/`[^`]+`/g, m => { inlines.push(m); return `\x00I${inlines.length-1}\x00`; });

  // Match #word where word starts immediately (not headings: "# Title" has a space)
  s = s.replace(/(?<!\S)#([a-zA-Z][a-zA-Z0-9_/\-]*)/g, (_, tag) => { tags.add(tag); return ''; });

  // Restore placeholders
  s = s
    .replace(/\x00F(\d+)\x00/g, (_, i) => fences[i])
    .replace(/\x00I(\d+)\x00/g, (_, i) => inlines[i]);

  // Clean trailing whitespace on lines that held only tags
  s = s.replace(/[ \t]+(\r?\n|$)/gm, '$1');

  return { transformed: s, tags: [...tags] };
}

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
