/**
 * Substack RSS sync
 *
 * Fetches the Substack publication RSS feed, maps items to the article
 * schema, and writes data/articles.json. When the feed only gives an
 * excerpt, fetches each post URL and extracts the full body HTML.
 * Run: npm run sync:substack
 *
 * Env: SUBSTACK_FEED_URL (default: https://happyappe.substack.com/feed)
 */

const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const cheerio = require('cheerio');

const FEED_URL = process.env.SUBSTACK_FEED_URL || 'https://happyappe.substack.com/feed';
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'articles.json');
const TEMP_PATH = path.join(__dirname, '..', 'data', 'articles.json.tmp');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function slugFromLink(link) {
  if (!link || typeof link !== 'string') return '';
  const segment = link.replace(/\/$/, '').split('/').pop();
  return (segment || '').toLowerCase().replace(/\s+/g, '-');
}

function formatDateISO(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateShort(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const mon = MONTHS[d.getMonth()];
  const day = d.getDate();
  const yy = String(d.getFullYear()).slice(-2);
  return `${mon} ${day} ${yy}`;
}

function firstImgSrc(html) {
  if (!html || typeof html !== 'string') return '';
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

function firstParagraphText(html) {
  if (!html || typeof html !== 'string') return '';
  const m = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, '').trim();
}

function stripFirstParagraph(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<p[^>]*>[\s\S]*?<\/p>\s*/i, '').trim();
}

function hasHtmlTags(str) {
  return typeof str === 'string' && /<[a-z][\s\S]*>/i.test(str);
}

function mapItem(item) {
  let raw = item.content || item['content:encoded'] || item.description || '';
  const enclosure = item.enclosure;
  const imageUrl = (enclosure && enclosure.type && enclosure.type.startsWith('image/') && enclosure.url)
    ? enclosure.url
    : firstImgSrc(raw);

  let subhead = '';
  let content = '';

  if (hasHtmlTags(raw)) {
    subhead = firstParagraphText(raw) || '';
    content = subhead ? stripFirstParagraph(raw) : raw;
  } else {
    subhead = (raw || '').trim();
    content = '';
  }

  return {
    id: slugFromLink(item.link),
    title: item.title || '',
    date: formatDateISO(item.pubDate),
    dateFormatted: formatDateShort(item.pubDate),
    imageUrl: imageUrl || '',
    subhead,
    content,
    source: 'substack',
    sourceUrl: item.link || ''
  };
}

const POST_BODY_SELECTORS = [
  '.markup',           // Substack post body
  '[class*="markup"]',
  '.post-body',
  '[class*="post-body"]',
  '.body',
  '[class*="body"]',
  'article .body',
  'section[class*="post"]'
];

function extractPostBody(html) {
  const $ = cheerio.load(html);
  for (const sel of POST_BODY_SELECTORS) {
    const el = $(sel).first();
    if (el.length && el.html() && el.text().trim().length > 100) {
      el.find('.captioned-image-container').first().remove();
      return el.html().trim();
    }
  }
  return '';
}

async function fetchFullPost(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SubstackSync/1.0)' }
  });
  if (!res.ok) return '';
  const html = await res.text();
  return extractPostBody(html);
}

async function run() {
  try {
    const parser = new Parser({
      customFields: { item: ['content:encoded'] }
    });

    const feed = await parser.parseURL(FEED_URL);
    let articles = (feed.items || []).map(mapItem).filter(a => a.id && a.title);

    for (const article of articles) {
      if (!article.content && article.sourceUrl) {
        const bodyHtml = await fetchFullPost(article.sourceUrl);
        if (bodyHtml) {
          if (!article.subhead) {
            article.subhead = firstParagraphText(bodyHtml) || '';
            article.content = article.subhead ? stripFirstParagraph(bodyHtml) : bodyHtml;
          } else {
            article.content = bodyHtml;
          }
        }
      }
    }

    articles.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const payload = JSON.stringify({ articles }, null, 2);
    fs.writeFileSync(TEMP_PATH, payload, 'utf8');
    fs.renameSync(TEMP_PATH, OUTPUT_PATH);

    console.log(`Wrote ${articles.length} articles to data/articles.json`);
  } catch (err) {
    console.error('Sync failed:', err.message);
    if (fs.existsSync(TEMP_PATH)) {
      try { fs.unlinkSync(TEMP_PATH); } catch (_) {}
    }
    process.exit(1);
  }
}

run();
