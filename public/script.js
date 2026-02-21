// ╔═══════════════════════════════════════════╗
// ║  STATE                                    ║
// ╚═══════════════════════════════════════════╝
// Server URL — auto-detects localhost vs deployed
const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3002/api'
  : '/api';

const S = {
  docs:      JSON.parse(localStorage.getItem('cf_docs') || '[]'),
  activeDoc: null,
  loading:   false,
  pending:   null,
  serverOk:  false
};

// ╔═══════════════════════════════════════════╗
// ║  BOOT                                     ║
// ╚═══════════════════════════════════════════╝
async function boot() {
  await checkServer();
  renderDocList();
  if (S.docs.length > 0) activateDoc(S.docs[0].id);
  updateFooter();
}

async function checkServer() {
  try {
    const r = await fetch(API + '/health', { signal: AbortSignal.timeout(4000) });
    const d = await r.json();
    S.serverOk = d.ready === true;
    syncServerUI(S.serverOk, d.model);
  } catch {
    S.serverOk = false;
    syncServerUI(false);
  }
}

function syncServerUI(ok, model) {
  const btn = document.getElementById('apiBtn');
  const lbl = document.getElementById('apiStatus');
  if (ok) {
    lbl.textContent = 'AI Ready';
    btn.style.color = 'var(--green)';
    btn.style.borderColor = 'var(--green)';
    btn.onclick = () => toast('Self-hosted AI running — no API key needed!');
  } else {
    lbl.textContent = 'Server offline';
    btn.style.color = 'var(--rose)';
    btn.style.borderColor = 'var(--rose)';
    btn.onclick = () => toast('Run: node server.js', 'error');
  }
}

// ╔═══════════════════════════════════════════╗
// ║  SIDEBAR / MOBILE                         ║
// ╚═══════════════════════════════════════════╝
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
}

// ╔═══════════════════════════════════════════╗
// ║  SERVER STATUS (no API key needed)        ║
// ╚═══════════════════════════════════════════╝
// No API key required — AI runs on your Node server locally

// ╔═══════════════════════════════════════════╗
// ║  DOCUMENTS                                ║
// ╚═══════════════════════════════════════════╝
function save() { localStorage.setItem('cf_docs', JSON.stringify(S.docs)); }

function newDoc() {
  S.activeDoc = null;
  S.pending = null;
  clearBanner();
  document.getElementById('inputText').value = '';
  document.getElementById('inputLabel').textContent = 'Paste anything — Confract figures out the rest';
  updateCharCount();
  showEmptyState();
  renderDocList();
  closeSidebar();
}

function activateDoc(id) {
  const doc = S.docs.find(d => d.id === id);
  if (!doc) return;
  S.activeDoc = id;
  S.pending = null;
  clearBanner();
  renderDocList();
  renderDoc(doc);
  document.getElementById('inputLabel').textContent = `Add to "${doc.title}" or paste something new`;
  updateFooter();
  closeSidebar();
}

function renderDocList() {
  const ul = document.getElementById('docList');
  ul.innerHTML = '';
  S.docs.forEach(doc => {
    const li = document.createElement('li');
    li.className = 'doc-item' + (S.activeDoc===doc.id?' active':'');
    li.onclick = () => activateDoc(doc.id);
    const totalItems = (doc.sections||[]).reduce((s,sec)=>s+sec.items.length,0);
    li.innerHTML = `
      <span class="doc-emoji">${doc.emoji||'📄'}</span>
      <div class="doc-info">
        <div class="doc-name">${esc(doc.title)}</div>
        <div class="doc-meta">${totalItems} items · ${ago(doc.updated)}</div>
      </div>`;
    ul.appendChild(li);
  });
}

function updateFooter() {
  const el = document.getElementById('footerStats');
  const total = S.docs.reduce((s,d)=>{
    return s + (d.sections||[]).reduce((a,sec)=>a+sec.items.length,0);
  },0);
  el.textContent = `${S.docs.length} docs · ${total} items`;
}

// ╔═══════════════════════════════════════════╗
// ║  PROCESS PIPELINE                         ║
// ╚═══════════════════════════════════════════╝
async function processInput() {
  const input = document.getElementById('inputText').value.trim();
  if (!input)    { toast('Paste some content first','error'); return; }
  if (S.loading) return;

  if (!S.serverOk) {
    toast('Server offline — run: node server.js', 'error');
    await checkServer(); // retry
    return;
  }

  setLoading(true, 'Analyzing input…');

  try {
    // Phase 1: semantic topic detect via Node server
    const match = S.docs.length > 0 ? await phaseDetect(input) : null;
    const matchedDoc = match?.match_id ? S.docs.find(d=>d.id===match.match_id)||null : null;

    // Phase 2: full structure + deduplicate
    setPhase('Structuring content…');
    const parsed = await phaseOrganize(input, matchedDoc);

    // Phase 3: show merge banner
    S.pending = { parsed, matchedDoc };
    showBanner(match, matchedDoc, parsed);

  } catch(e) {
    toast('Error: '+e.message, 'error');
    console.error(e);
    showEmptyState();
  }

  setLoading(false);
}

// ── Phase 1: semantic match via Node server ──────────────────────
async function phaseDetect(input) {
  const res = await fetch(API + '/detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, docs: S.docs })
  });
  if (!res.ok) throw new Error('Detect failed: ' + res.status);
  return res.json(); // { match_id, confidence, reason }
}

// ── Phase 2: full AI structure + dedup via Node server ───────────
async function phaseOrganize(input, existingDoc) {
  const res = await fetch(API + '/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, existingDoc })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || 'Processing failed: ' + res.status);
  }
  return res.json(); // full structured document
}

// ╔═══════════════════════════════════════════╗
// ║  SMART MERGE BANNER                       ║
// ╚═══════════════════════════════════════════╝
function showBanner(match, matchedDoc, parsed) {
  clearBanner();

  // render preview behind banner
  if (matchedDoc) {
    const preview = deepClone(matchedDoc);
    applyMerge(preview, parsed);
    renderDoc(preview, true);
  } else {
    renderDocRaw(parsed);
  }

  const isMatch = !!matchedDoc;
  const confidence = match?.confidence || 'medium';
  const reason = match?.reason || '';
  const altDoc = !isMatch && S.docs.length > 0 ? S.docs[0] : null;

  const banner = document.createElement('div');
  banner.id = 'mergeBanner';
  banner.className = 'merge-banner ' + (isMatch ? 'merge' : 'new-doc');

  if (isMatch) {
    banner.innerHTML = `
      <div class="banner-icon">🔀</div>
      <div class="banner-body">
        <div class="banner-title">Merge into "${esc(matchedDoc.title)}"?</div>
        <div class="banner-sub">${esc(reason)||'Same topic detected'}</div>
      </div>
      <span class="banner-confidence">${confidence} confidence</span>
      <div class="banner-actions">
        <button class="btn btn-ghost btn-sm" onclick="commitNew()">New Doc</button>
        <button class="btn btn-primary btn-sm" onclick="commitMerge()">
          Merge In ✓
        </button>
      </div>`;
  } else {
    banner.innerHTML = `
      <div class="banner-icon">✨</div>
      <div class="banner-body">
        <div class="banner-title">New document detected</div>
        <div class="banner-sub">${esc(reason)||'No matching document found'}</div>
      </div>
      <div class="banner-actions">
        ${altDoc ? `<button class="btn btn-ghost btn-sm" onclick="commitMergeInto('${altDoc.id}')">Add to "${esc(altDoc.title)}"</button>` : ''}
        <button class="btn btn-primary btn-sm" onclick="commitNew()">Create Doc ✓</button>
      </div>`;
  }

  // insert banner before output scroll
  const outputScroll = document.getElementById('outputScroll');
  outputScroll.parentNode.insertBefore(banner, outputScroll);
}

function clearBanner() {
  document.getElementById('mergeBanner')?.remove();
}

// ╔═══════════════════════════════════════════╗
// ║  COMMIT ACTIONS                           ║
// ╚═══════════════════════════════════════════╝
function commitMerge() {
  if (!S.pending) return;
  const { parsed, matchedDoc } = S.pending;
  clearBanner();

  // Save version snapshot before merge
  pushVersion(matchedDoc, 'Before merge: ' + new Date().toLocaleString());

  applyMerge(matchedDoc, parsed);
  save(); renderDocList(); renderDoc(matchedDoc);
  activateDoc(matchedDoc.id);
  document.getElementById('inputText').value = '';
  updateCharCount(); updateFooter(); S.pending = null;
  toast(`Merged into "${matchedDoc.title}"`);
}

function commitMergeInto(docId) {
  if (!S.pending) return;
  const { parsed } = S.pending;
  const doc = S.docs.find(d=>d.id===docId);
  if (!doc) return;
  clearBanner();
  pushVersion(doc, 'Before merge: ' + new Date().toLocaleString());
  applyMerge(doc, parsed);
  save(); renderDocList(); renderDoc(doc);
  activateDoc(doc.id);
  document.getElementById('inputText').value = '';
  updateCharCount(); updateFooter(); S.pending = null;
  toast(`Merged into "${doc.title}"`);
}

function commitNew() {
  if (!S.pending) return;
  const { parsed } = S.pending;
  clearBanner();
  createDoc(parsed);
  document.getElementById('inputText').value = '';
  updateCharCount(); updateFooter(); S.pending = null;
  toast('Document created');
}

// ╔═══════════════════════════════════════════╗
// ║  DOCUMENT OPERATIONS                      ║
// ╚═══════════════════════════════════════════╝
function createDoc(data) {
  const id = 'doc_' + Date.now();
  const doc = {
    id, versions: [],
    title:          data.title        || 'Untitled',
    emoji:          data.emoji        || '📄',
    detected_type:  data.detected_type|| '',
    sections:       data.sections     || [],
    consolidation_log: data.consolidation_log || [],
    markdown:       data.markdown     || '',
    created: Date.now(), updated: Date.now()
  };
  S.docs.unshift(doc);
  S.activeDoc = id;
  save(); renderDocList(); renderDoc(doc);
}

function applyMerge(doc, data) {
  (data.sections||[]).forEach(newSec => {
    const existing = doc.sections.find(s =>
      s.title.toLowerCase() === newSec.title.toLowerCase()
    );
    if (existing) {
      (newSec.items||[]).forEach(ni => {
        const dup = existing.items.some(ei =>
          ei.name.toLowerCase().trim() === ni.name.toLowerCase().trim()
        );
        if (!dup) { ni.is_new = true; existing.items.push(ni); }
      });
    } else {
      doc.sections.push({ ...newSec, items: newSec.items.map(i=>({...i,is_new:true})) });
    }
  });

  doc.consolidation_log = [
    ...(doc.consolidation_log||[]),
    ...(data.consolidation_log||[])
  ];
  doc.updated = Date.now();
  if (data.markdown) doc.markdown = data.markdown;
}

function pushVersion(doc, label) {
  if (!doc.versions) doc.versions = [];
  doc.versions.unshift({
    ts: Date.now(), label,
    snapshot: JSON.stringify({ sections: doc.sections, consolidation_log: doc.consolidation_log })
  });
  // Keep max 20 versions
  if (doc.versions.length > 20) doc.versions = doc.versions.slice(0, 20);
}

// ╔═══════════════════════════════════════════╗
// ║  RENDER ENGINE                            ║
// ╚═══════════════════════════════════════════╝
function showEmptyState() {
  const os = document.getElementById('outputScroll');
  os.innerHTML = `<div class="empty-state" id="emptyState">
    <div class="empty-icon">◈</div>
    <div class="empty-title">Your knowledge base</div>
    <div class="empty-sub">Paste any raw content above and Confract will structure, categorize, and consolidate it automatically.</div>
    <div class="onboard-steps">
      <div class="onboard-step"><div class="step-num">1</div><div class="step-text"><strong>Start the server</strong> — run <code style="font-family:var(--mono);color:var(--accent)">node server.js</code> — the AI status turns green when ready</div></div>
      <div class="onboard-step"><div class="step-num">2</div><div class="step-text"><strong>Paste anything</strong> — a list, notes, AI output, research</div></div>
      <div class="onboard-step"><div class="step-num">3</div><div class="step-text"><strong>Process</strong> — Confract detects, structures, and merges automatically</div></div>
      <div class="onboard-step"><div class="step-num">4</div><div class="step-text"><strong>Keep adding</strong> — each input accumulates into one clean master document</div></div>
    </div>
  </div>`;
}

function renderDocRaw(data) {
  const fakeDoc = {
    id:'__preview__', title: data.title||'Preview',
    emoji: data.emoji||'📄', detected_type: data.detected_type||'',
    sections: data.sections||[], consolidation_log: data.consolidation_log||[],
    markdown: data.markdown||'', versions: []
  };
  renderDoc(fakeDoc, true);
}

function renderDoc(doc, isPreview=false) {
  const totalItems = (doc.sections||[]).reduce((s,sec)=>s+sec.items.length,0);
  const logCount   = (doc.consolidation_log||[]).length;
  const newCount   = (doc.sections||[]).reduce((s,sec)=>
    s+(sec.items||[]).filter(i=>i.is_new).length, 0);
  const versionCount = (doc.versions||[]).length;

  // sections HTML
  const sectionsHTML = (doc.sections||[]).map((sec,si) => {
    const itemsHTML = (sec.items||[]).map((item,i) => `
      <div class="item-chip${item.is_new?' new-addition':''}" style="animation-delay:${i*0.03}s">
        <span class="item-num">${String(i+1).padStart(2,'0')}</span>
        ${esc(item.name)}
        ${item.note ? `<span class="item-note">· ${esc(item.note)}</span>` : ''}
        ${item.is_new ? `<span style="font-size:9px;color:var(--green);font-family:var(--mono);margin-left:2px">NEW</span>` : ''}
      </div>`).join('');

    return `<div class="section-block" data-cat="${sec.category||'other'}" style="animation-delay:${si*0.06}s">
      <div class="section-header">
        <span class="section-emoji">${sec.emoji||'◈'}</span>
        <span class="section-name">${esc(sec.title)}</span>
        <span class="section-count">${sec.items.length}</span>
        <div class="section-divider"></div>
      </div>
      <div class="items-wrap">${itemsHTML}</div>
    </div>`;
  }).join('');

  // consolidation log HTML
  const logHTML = logCount === 0
    ? `<div class="no-overlaps"><div class="icon">✓</div><p>No overlapping content found</p></div>`
    : (doc.consolidation_log||[]).map((entry,i) => `
      <div class="log-card" id="logcard_${i}">
        <div class="log-icon">⟳</div>
        <div class="log-body">
          <div class="log-removed">${esc(entry.removed)}</div>
          <div class="log-kept">Consolidated as: <strong>${esc(entry.kept_as||entry.kept||'')}</strong> ${entry.section?`· in ${esc(entry.section)}`:''}</div>
          <div class="log-reason">${esc(entry.reason||'')}</div>
        </div>
        <button class="restore-btn" onclick="restoreItem('${esc(doc.id)}',${i},'${(entry.removed||'').replace(/'/g,"\\'")}')">Restore</button>
      </div>`).join('');

  // version history HTML
  const verHTML = versionCount === 0
    ? `<div class="no-overlaps"><div class="icon">🕐</div><p>No version history yet.<br>Versions are saved automatically before each merge.</p></div>`
    : (doc.versions||[]).map((v,i) => `
      <div class="version-card${i===0?' current':''}">
        <div class="version-dot${i===0?' current':''}"></div>
        <div class="version-body">
          <div class="version-label">
            ${esc(v.label)}
            ${i===0?'<span class="version-badge">latest</span>':''}
          </div>
          <div class="version-meta">${new Date(v.ts).toLocaleString()}</div>
        </div>
        <div class="version-actions">
          ${i>0 ? `<button class="btn btn-ghost btn-sm" onclick="revertVersion('${doc.id}',${i})">Revert</button>` : ''}
        </div>
      </div>`).join('');

  const os = document.getElementById('outputScroll');
  os.innerHTML = `
    <div class="tabs-bar">
      <button class="tab active" data-tab="organized" onclick="switchTab(this,'organized')">Organized</button>
      <button class="tab" data-tab="log" onclick="switchTab(this,'log')">
        Consolidation Log
        ${logCount>0?`<span class="tab-badge amber">${logCount}</span>`:''}
      </button>
      <button class="tab" data-tab="history" onclick="switchTab(this,'history')">
        Versions
        ${versionCount>0?`<span class="tab-badge" style="background:var(--surface3);color:var(--text3)">${versionCount}</span>`:''}
      </button>
      <button class="tab" data-tab="export" onclick="switchTab(this,'export')">Export</button>
    </div>

    <!-- ── ORGANIZED ── -->
    <div id="tab-organized" class="tab-panel active">
      <div class="doc-view">
        <div class="doc-title-row">
          <div class="doc-title">${doc.emoji||'📄'} ${esc(doc.title)}</div>
          ${isPreview?'<span style="font-family:var(--mono);font-size:10px;color:var(--amber)">PREVIEW</span>':''}
        </div>
        <div style="margin-bottom:14px">
          <span class="doc-type-badge">${esc(doc.detected_type||'Auto-detected')}</span>
        </div>
        <div class="stats-strip">
          <div class="stat"><strong>${(doc.sections||[]).length}</strong>&nbsp;sections</div>
          <div class="stat"><strong>${totalItems}</strong>&nbsp;items</div>
          ${newCount>0?`<div class="stat new-additions"><strong>${newCount}</strong>&nbsp;new this pass</div>`:''}
          ${logCount>0?`<div class="stat overlap"><strong>${logCount}</strong>&nbsp;overlaps consolidated</div>`:''}
        </div>
        ${sectionsHTML}
      </div>
    </div>

    <!-- ── CONSOLIDATION LOG ── -->
    <div id="tab-log" class="tab-panel">
      <div class="log-view">
        <div class="log-intro">
          These items were detected as overlapping with existing content and consolidated. Nothing is permanently deleted — restore any entry below.
        </div>
        ${logHTML}
      </div>
    </div>

    <!-- ── VERSION HISTORY ── -->
    <div id="tab-history" class="tab-panel">
      <div class="history-view">
        <div class="log-intro" style="margin-bottom:16px">
          Versions are saved automatically before every merge. Revert to roll back changes.
        </div>
        ${verHTML}
      </div>
    </div>

    <!-- ── EXPORT ── -->
    <div id="tab-export" class="tab-panel">
      <div class="export-view">
        <div class="export-toolbar">
          <span class="export-label">Copy as:</span>
          <button class="btn btn-ghost btn-sm" onclick="copyMarkdown('${doc.id}')">Markdown</button>
          <button class="btn btn-ghost btn-sm" onclick="copyJSON('${doc.id}')">JSON</button>
          <button class="btn btn-ghost btn-sm" onclick="copyText('${doc.id}')">Plain text</button>
        </div>
        <pre class="raw-pre">${esc(doc.markdown||'No markdown generated yet.')}</pre>
      </div>
    </div>
  `;
}

function setLoading(on, msg='') {
  S.loading = on;
  const btn = document.getElementById('processBtn');
  btn.disabled = on;
  btn.innerHTML = on
    ? `<span class="spinner-inline"></span> Working…`
    : `Process <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

  if (on) {
    const os = document.getElementById('outputScroll');
    os.innerHTML = `<div class="loading-state">
      <div class="loading-phase" id="loadPhase">${msg}</div>
      <div class="loading-bar-wrap"><div class="loading-bar"></div></div>
      <div class="loading-label">Multi-pass AI engine running…</div>
    </div>`;
  }
}

function setPhase(msg) {
  const el = document.getElementById('loadPhase');
  if (el) { el.textContent = msg; el.style.animation='none'; el.offsetHeight; el.style.animation=''; }
}

// ╔═══════════════════════════════════════════╗
// ║  TABS                                     ║
// ╚═══════════════════════════════════════════╝
function switchTab(btn, tabId) {
  document.querySelectorAll('.tabs-bar .tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  const panel = document.getElementById('tab-'+tabId);
  if (panel) panel.classList.add('active');
}

// ╔═══════════════════════════════════════════╗
// ║  RESTORE / VERSIONS                       ║
// ╚═══════════════════════════════════════════╝
function restoreItem(docId, idx, name) {
  const doc = S.docs.find(d=>d.id===docId);
  if (!doc) return;
  let sec = doc.sections.find(s=>s.title==='Restored');
  if (!sec) {
    sec = { title:'Restored', emoji:'↩️', category:'other', items:[] };
    doc.sections.push(sec);
  }
  sec.items.push({ name, note:'manually restored', is_new:true });
  doc.updated = Date.now();
  save(); renderDoc(doc);
  // Switch to organized tab
  const organizedTab = document.querySelector('[data-tab="organized"]');
  if (organizedTab) switchTab(organizedTab, 'organized');
  toast(`"${name}" restored`);
}

function revertVersion(docId, versionIdx) {
  const doc = S.docs.find(d=>d.id===docId);
  if (!doc || !doc.versions[versionIdx]) return;
  const v = doc.versions[versionIdx];
  const snap = JSON.parse(v.snapshot);
  pushVersion(doc, 'Before revert to: ' + v.label);
  doc.sections = snap.sections;
  doc.consolidation_log = snap.consolidation_log;
  doc.updated = Date.now();
  save(); renderDoc(doc);
  toast('Reverted to version: ' + v.label);
}

// ╔═══════════════════════════════════════════╗
// ║  EXPORT                                   ║
// ╚═══════════════════════════════════════════╝
function copyMarkdown(docId) {
  const doc = S.docs.find(d=>d.id===docId)||S.pending?.parsed;
  if (!doc) return;
  navigator.clipboard.writeText(doc.markdown||'').then(()=>toast('Markdown copied'));
}

function copyJSON(docId) {
  const doc = S.docs.find(d=>d.id===docId);
  if (!doc) return;
  const out = { title:doc.title, sections:doc.sections, consolidation_log:doc.consolidation_log };
  navigator.clipboard.writeText(JSON.stringify(out,null,2)).then(()=>toast('JSON copied'));
}

function copyText(docId) {
  const doc = S.docs.find(d=>d.id===docId);
  if (!doc) return;
  const lines = [];
  lines.push(doc.title); lines.push('='.repeat(doc.title.length)); lines.push('');
  (doc.sections||[]).forEach(sec => {
    lines.push(sec.title); lines.push('-'.repeat(sec.title.length));
    (sec.items||[]).forEach((item,i) => lines.push(`${i+1}. ${item.name}${item.note?' ('+item.note+')':''}`));
    lines.push('');
  });
  navigator.clipboard.writeText(lines.join('\n')).then(()=>toast('Plain text copied'));
}

// ╔═══════════════════════════════════════════╗
// ║  UTILITIES                                ║
// ╚═══════════════════════════════════════════╝
function updateCharCount() {
  const v = document.getElementById('inputText').value;
  document.getElementById('charCount').textContent = v.length.toLocaleString() + ' chars';
}

function clearInput() {
  document.getElementById('inputText').value = '';
  updateCharCount();
}

function esc(str='') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function ago(ts) {
  const d = Date.now()-ts;
  if (d<60000) return 'just now';
  if (d<3600000) return Math.floor(d/60000)+'m ago';
  if (d<86400000) return Math.floor(d/3600000)+'h ago';
  return Math.floor(d/86400000)+'d ago';
}

let _toastTimer;
function toast(msg, type='success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>el.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════
boot();