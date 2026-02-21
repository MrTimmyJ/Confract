// ╔══════════════════════════════════════════════════════════╗
// ║  CONFRACT ENGINE — engine.js                             ║
// ║  Mirrors your BookRecommender class pattern              ║
// ║  Model: all-MiniLM-L6-v2 via @xenova/transformers        ║
// ║  Runs 100% locally — no internet needed after first run  ║
// ╚══════════════════════════════════════════════════════════╝

// ── Content type detection config ─────────────────────────────────────
const CONTENT_TYPES = {
  watchlist: {
    label: 'Entertainment watchlist',
    emoji: '🎬',
    keywords: ['watch', 'movie', 'film', 'series', 'anime', 'show', 'episode', 'season', 'netflix', 'hbo', 'disney', 'seen', 'rewatch'],
    sections: {
      movies:  { keywords: ['film', 'movie', 'cinema', 'directed'], emoji: '🎬', category: 'movies' },
      tv:      { keywords: ['series', 'show', 'season', 'episode', 'tv', 'sitcom', 'miniseries'], emoji: '📺', category: 'tv' },
      anime:   { keywords: ['anime', 'manga', 'shonen', 'seinen', 'crunchyroll', 'ova', 'dubbed'], emoji: '⛩', category: 'anime' },
      unclear: { keywords: [], emoji: '❓', category: 'unclear' }
    }
  },
  research: {
    label: 'Research notes',
    emoji: '🔬',
    keywords: ['research', 'study', 'paper', 'thesis', 'journal', 'citation', 'hypothesis', 'experiment', 'abstract', 'methodology', 'findings', 'peer reviewed', 'academic', 'conclusion', 'data', 'analysis'],
    sections: {
      concepts:  { keywords: ['theory', 'concept', 'principle', 'define', 'definition', 'model'], emoji: '💡', category: 'research' },
      data:      { keywords: ['data', 'result', 'finding', 'statistic', 'percent', 'average', 'mean', 'measured'], emoji: '📊', category: 'research' },
      sources:   { keywords: ['source', 'citation', 'reference', 'according', 'author', 'published'], emoji: '📚', category: 'notes' },
      questions: { keywords: ['?', 'unknown', 'unclear', 'why', 'how does', 'further research'], emoji: '❓', category: 'unclear' }
    }
  },
  tasks: {
    label: 'Task list',
    emoji: '✅',
    keywords: ['todo', 'to-do', 'task', 'action', 'complete', 'done', 'pending', 'deadline', 'due', 'sprint', 'backlog', 'milestone', 'deliverable', 'assign', 'priority'],
    sections: {
      urgent:  { keywords: ['urgent', 'asap', 'immediately', 'critical', 'today', 'priority', 'blocker'], emoji: '🔥', category: 'tasks' },
      pending: { keywords: ['todo', 'pending', 'next', 'backlog', 'planned', 'upcoming', 'should'], emoji: '📋', category: 'tasks' },
      done:    { keywords: ['done', 'complete', 'finished', 'resolved', 'shipped', '✓', '✅', 'closed'], emoji: '✅', category: 'tasks' },
      blocked: { keywords: ['blocked', 'waiting', 'depends', 'need', 'hold', 'on hold'], emoji: '🚧', category: 'tasks' }
    }
  },
  documentation: {
    label: 'Technical documentation',
    emoji: '📖',
    keywords: ['install', 'setup', 'config', 'endpoint', 'api', 'function', 'class', 'method', 'parameter', 'returns', 'usage', 'import', 'require', 'npm', 'pip', 'yarn', 'package', 'module', 'library', 'dependency', 'code', 'syntax'],
    sections: {
      overview:     { keywords: ['overview', 'intro', 'about', 'what is', 'purpose', 'description'], emoji: '📋', category: 'notes' },
      installation: { keywords: ['install', 'setup', 'npm', 'pip', 'yarn', 'requirements', 'dependencies', 'brew'], emoji: '⚙️', category: 'notes' },
      usage:        { keywords: ['usage', 'example', 'how to', 'use', 'call', 'invoke', 'run'], emoji: '💻', category: 'notes' },
      api:          { keywords: ['api', 'endpoint', 'function', 'method', 'class', 'parameter', 'returns', 'route'], emoji: '🔌', category: 'notes' },
      config:       { keywords: ['config', 'option', 'setting', 'env', 'variable', 'flag', '.env'], emoji: '🔧', category: 'notes' },
      notes:        { keywords: ['note', 'warning', 'tip', 'important', 'caveat', 'gotcha', 'known issue'], emoji: '📝', category: 'notes' }
    }
  },
  notes: {
    label: 'General notes',
    emoji: '📝',
    keywords: [],
    sections: {
      main:    { keywords: [], emoji: '📝', category: 'notes' },
      unclear: { keywords: [], emoji: '❓', category: 'unclear' }
    }
  }
};

// ── Offline media knowledge base ───────────────────────────────────────
// Large enough to cover common cases without any web API
const ANIME_KB = new Set([
  'samurai champloo','naruto','one piece','attack on titan','death note',
  'fullmetal alchemist','dragon ball','bleach','demon slayer','my hero academia',
  'jujutsu kaisen','hunter x hunter','sword art online','tokyo ghoul','cowboy bebop',
  'neon genesis evangelion','steins gate','code geass','re zero','mob psycho 100',
  'one punch man','inazuma eleven','mha vigilantes','fairy tail','black clover',
  'vinland saga','made in abyss','chainsaw man','spy x family','bocchi the rock',
  'dr stone','the promised neverland','erased','clannad','toradora','haikyuu',
  'violet evergarden','your lie in april','anohana','angel beats','relife',
  'no game no life','overlord','sword art online','log horizon','danmachi',
  'fullmetal alchemist brotherhood','blue exorcist','soul eater','gurren lagann',
  'kill la kill','psycho pass','aldnoah zero','guilty crown','darling in the franxx',
  'komi cant communicate','shikimori','spy family','summertime rendering','lycoris recoil',
]);

const TV_KB = new Set([
  'breaking bad','better call saul','the wire','sopranos','game of thrones',
  'stranger things','dark','black mirror','westworld','the crown','succession',
  'ted lasso','the office','parks and recreation','community','arrested development',
  'peaky blinders','mindhunter','true detective','ozark','squid game',
  'the witcher','house of the dragon','andor','the mandalorian','loki',
  'what we do in the shadows','barry','fleabag','derry girls','schitts creek',
  'it crowd','the it crowd','band of brothers','chernobyl','last of us',
  'gravity falls','adventure time','rick and morty','futurama','south park',
  'arcane','the bear','white lotus','euphoria','yellowjackets','severance',
  'foundation','for all mankind','station eleven','the boys','invincible',
  'over the garden wall','regular show','steven universe','bojack horseman',
  'avatar the last airbender','the legend of korra','clone wars',
]);

const MOVIES_KB = new Set([
  'inception','interstellar','the dark knight','pulp fiction','fight club',
  'the matrix','goodfellas','schindlers list','shawshank redemption',
  'forrest gump','the godfather','silence of the lambs','no country for old men',
  'parasite','everything everywhere all at once','wolf of wall street',
  'the revenant','mad max fury road','whiplash','la la land','moonlight',
  'get out','hereditary','midsommar','the lighthouse','uncut gems',
  'good will hunting','goodwill hunting','training day','shaolin soccer',
  'kung fu hustle','oldboy','the raid','crouching tiger hidden dragon',
  'leon the professional','city of god','amelie','pans labyrinth',
  'despicable me','minions','shrek','toy story','finding nemo','wall-e','up',
  'inside out','coco','encanto','moana','howls moving castle','spirited away',
  'blade runner 2049','dune','arrival','ex machina','annihilation',
  'the martian','gravity','ford v ferrari','free guy',
  'eternal sunshine of the spotless mind','500 days of summer',
  'into the wild','the secret life of walter mitty','princess mononoke',
]);

// ── Utilities ──────────────────────────────────────────────────────────
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, '').trim(); }

function titleCase(s) {
  const skip = new Set(['a','an','the','and','but','or','for','nor','on','at','to','by','in','of','up','vs']);
  return String(s).split(' ')
    .map((w, i) => (i === 0 || !skip.has(w.toLowerCase()))
      ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      : w.toLowerCase())
    .join(' ');
}

// ── Main engine class (mirrors BookRecommender) ────────────────────────
export class ConfractEngine {
  constructor() {
    this.embedder = null;
    this.ready    = false;
    this.cache    = new Map(); // embedding cache — avoids redundant computation
  }

  // init() — mirrors: self.model = SentenceTransformer('all-MiniLM-L6-v2')
  async init() {
    const { pipeline } = await import('@xenova/transformers');
    // Downloads ~25MB on first run, cached locally after that
    this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    this.ready = true;
  }

  // embed() — mirrors: self.model.encode([text])[0]
  async embed(text) {
    const key = text.slice(0, 200);
    if (this.cache.has(key)) return this.cache.get(key);
    const out = await this.embedder(text, { pooling: 'mean', normalize: true });
    const vec = Array.from(out.data);
    this.cache.set(key, vec);
    return vec;
  }

  // ── PHASE 1: detectMatch() ─────────────────────────────────────────
  // Semantic search: does this input match any existing doc?
  // mirrors: self.model.encode() + cosine similarity ranking
  async detectMatch(input, docs) {
    if (!docs?.length) return { match_id: null, confidence: 'low', reason: 'No existing documents' };

    const inputVec = await this.embed(input);
    let best = null, bestScore = 0;

    for (const doc of docs) {
      // Build a representative text summary of this doc
      const summary = [
        doc.title,
        doc.detected_type || '',
        ...(doc.sections || []).flatMap(s =>
          [s.title, ...s.items.slice(0, 6).map(i => i.name)]
        )
      ].join(' ').slice(0, 400);

      const docVec = await this.embed(summary);
      const score  = cosineSim(inputVec, docVec);

      if (score > bestScore) { bestScore = score; best = doc; }
    }

    // Thresholds tuned empirically — same idea as your 0.75 series-detection threshold
    if (bestScore > 0.55) {
      return { match_id: best.id, confidence: 'high',   reason: `Strong match with "${best.title}" (${Math.round(bestScore*100)}% similar)` };
    } else if (bestScore > 0.40) {
      return { match_id: best.id, confidence: 'medium', reason: `Possible match with "${best.title}" — confirm below` };
    } else {
      return { match_id: null,    confidence: 'low',    reason: 'Content appears to be a new topic' };
    }
  }

  // ── PHASE 2: process() — full pipeline ────────────────────────────
  // mirrors: get_recommendations() calling each step in sequence
  async process(input, existingDoc) {
    const lines       = this.parseLines(input);
    const contentType = this.detectContentType(input, lines);
    const classified  = await this.classifyLines(lines, contentType);

    const { kept, log } = existingDoc
      ? await this.deduplicateAgainstDoc(classified, existingDoc)
      : { kept: classified, log: [] };

    const sections = this.buildSections(kept, contentType);
    const { title, emoji } = this.generateTitle(input, contentType, existingDoc);
    const markdown  = this.generateMarkdown(title, sections);

    return {
      title,
      emoji,
      detected_type:      contentType.label,
      sections,
      consolidation_log:  log,
      new_additions_count: kept.length,
      overlap_count:      log.length,
      markdown
    };
  }

  // ── Step 1: parse raw text into clean lines ────────────────────────
  parseLines(input) {
    return input
      .split(/\n|(?<=\w),\s*(?=[A-Z])|;/)
      .map(l => l.replace(/^[\s\-•*▪·◦▸►\d.)\]#]+/, '').trim())
      .filter(l => l.length > 1 && l.length < 400)
      .filter(l => !/^https?:\/\//.test(l));
  }

  // ── Step 2: detect content type by keyword scoring ─────────────────
  // mirrors: analyze_book_content() genre/mood scoring approach
  detectContentType(input, lines) {
    const text   = norm(input);
    const scores = {};

    for (const [type, cfg] of Object.entries(CONTENT_TYPES)) {
      scores[type] = cfg.keywords.filter(kw => text.includes(kw)).length;
    }

    // Short-line heuristic: avg < 5 words → likely a list/watchlist
    const avgWords = lines.reduce((s, l) => s + l.split(' ').length, 0) / (lines.length || 1);
    if (avgWords < 5)  scores.watchlist     = (scores.watchlist || 0) + 3;
    if (avgWords > 15) scores.research      = (scores.research  || 0) + 2;
    if (avgWords > 15) scores.documentation = (scores.documentation || 0) + 1;

    const [bestType] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    const type = (scores[bestType] > 0) ? bestType : 'notes';

    return { type, label: CONTENT_TYPES[type].label, emoji: CONTENT_TYPES[type].emoji, avgWords };
  }

  // ── Step 3: classify each line into a section ──────────────────────
  // mirrors: analyze_book_content() per-item, then ai_filter_and_rank()
  async classifyLines(lines, contentType) {
    const results = [];
    const sections = CONTENT_TYPES[contentType.type]?.sections || {};

    for (const line of lines) {
      const n = norm(line);

      if (contentType.type === 'watchlist') {
        // Use our offline KB first (fast path, no embedding needed)
        const category = this.lookupMedia(n);
        results.push({ name: titleCase(line), note: '', section: category, category, raw: n });
        continue;
      }

      // Score each section by keyword overlap
      let bestSection = null, bestScore = -1;
      for (const [secKey, sec] of Object.entries(sections)) {
        const score = sec.keywords.filter(kw => n.includes(kw)).length;
        if (score > bestScore) { bestScore = score; bestSection = secKey; }
      }

      const section = bestSection || Object.keys(sections)[0] || 'main';
      const isLong  = line.split(' ').length > 8;

      results.push({
        name:     isLong ? this.truncate(line, 6) : titleCase(line),
        note:     isLong ? line : '',
        section,
        category: sections[section]?.category || 'notes',
        raw:      n
      });
    }
    return results;
  }

  // ── Offline media lookup — covers the vast majority of real-world use ──
  lookupMedia(n) {
    if (ANIME_KB.has(n))  return 'anime';
    if (TV_KB.has(n))     return 'tv';
    if (MOVIES_KB.has(n)) return 'movies';

    // Partial match for slightly different phrasings
    for (const t of ANIME_KB)  { if (n.includes(t) || t.includes(n)) return 'anime';  }
    for (const t of TV_KB)     { if (n.includes(t) || t.includes(n)) return 'tv';     }
    for (const t of MOVIES_KB) { if (n.includes(t) || t.includes(n)) return 'movies'; }

    return 'unclear';
  }

  truncate(line, words) {
    const w = line.split(' ');
    return w.length > words ? w.slice(0, words).join(' ') + '…' : titleCase(line);
  }

  // ── Step 4: deduplicate against existing doc using embeddings ─────
  // mirrors: is_different_story() + obviously_same_series() combined
  async deduplicateAgainstDoc(newItems, existingDoc) {
    const kept = [], log = [];

    const existingItems = (existingDoc.sections || [])
      .flatMap(s => s.items.map(i => ({ name: i.name, section: s.title })));

    for (const item of newItems) {
      // Fast path: exact string match
      const exact = existingItems.find(ei => norm(ei.name) === norm(item.name));
      if (exact) {
        log.push({ removed: item.name, kept_as: exact.name, reason: 'exact duplicate', section: exact.section });
        continue;
      }

      // Semantic path: embedding similarity (mirrors is_different_story())
      const itemVec = await this.embed(item.raw || norm(item.name));
      let isDup = false;

      for (const existing of existingItems) {
        const exVec = await this.embed(norm(existing.name));
        const sim   = cosineSim(itemVec, exVec);

        if (sim > 0.88) { // only flag near-identical meaning — same threshold logic as your 0.75
          log.push({
            removed:  item.name,
            kept_as:  existing.name,
            reason:   `semantic match (${Math.round(sim*100)}% similar)`,
            section:  existing.section
          });
          isDup = true;
          break;
        }
      }

      if (!isDup) kept.push({ ...item, is_new: true });
    }

    return { kept, log };
  }

  // ── Step 5: group classified items into sections ───────────────────
  buildSections(items, contentType) {
    const groups = {};
    for (const item of items) {
      const key = item.section || item.category || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    const sectionCfg = CONTENT_TYPES[contentType.type]?.sections || {};
    const sections   = [];

    // Output in config order, then any extra groups
    const ordered = [...new Set([...Object.keys(sectionCfg), ...Object.keys(groups)])];

    for (const key of ordered) {
      if (!groups[key]?.length) continue;
      const cfg  = sectionCfg[key] || {};
      const name = this.sectionName(key, contentType.type);

      sections.push({
        title:    name,
        emoji:    cfg.emoji || '◈',
        category: cfg.category || key,
        items:    groups[key].map(i => ({ name: i.name, note: i.note || '', is_new: i.is_new || false }))
      });
    }

    return sections;
  }

  sectionName(key, type) {
    const map = {
      watchlist:     { movies: 'Movies', tv: 'TV Shows', anime: 'Anime', unclear: 'Unclear' },
      research:      { concepts: 'Core Concepts', data: 'Key Data', sources: 'Sources', questions: 'Open Questions' },
      tasks:         { urgent: 'Urgent', pending: 'To Do', done: 'Done', blocked: 'Blocked' },
      documentation: { overview: 'Overview', installation: 'Installation', usage: 'Usage', api: 'API Reference', config: 'Configuration', notes: 'Notes' },
      notes:         { main: 'Notes', unclear: 'Unclear' }
    };
    return map[type]?.[key] || titleCase(key.replace(/_/g, ' '));
  }

  // ── Step 6: generate title ─────────────────────────────────────────
  generateTitle(input, contentType, existingDoc) {
    if (existingDoc) return { title: existingDoc.title, emoji: existingDoc.emoji || contentType.emoji };

    const firstLine = input.split('\n')[0].replace(/^[#*\-\s]+/, '').trim();
    const isShortEnough = firstLine.length > 3 && firstLine.length < 60;

    const defaults = { watchlist: 'Watchlist', research: 'Research Notes', tasks: 'Task List', documentation: 'Documentation', notes: 'Notes' };

    return {
      title: isShortEnough ? titleCase(firstLine) : (defaults[contentType.type] || 'Untitled'),
      emoji: contentType.emoji
    };
  }

  // ── Step 7: generate markdown export ──────────────────────────────
  generateMarkdown(title, sections) {
    const lines = [`# ${title}`, '', `*Generated by Confract · ${new Date().toLocaleDateString()}*`, ''];
    for (const sec of sections) {
      lines.push(`## ${sec.emoji} ${sec.title}`);
      for (const item of sec.items) {
        lines.push(`- ${item.name}${item.note ? ` — *${item.note}*` : ''}`);
      }
      lines.push('');
    }
    return lines.join('\n');
  }
}
