/* ═══════════════════════════════════════════════════════════
   MediTrans Docs v2.0 — Professional Documentation System
   Grouped Nav · Auto-TOC · Full-Text Search · Copy Code
   Prev/Next · Deep Links · Zero Dependencies
   ═══════════════════════════════════════════════════════════ */

/* ─── PAGE REGISTRY (grouped) ─── */
const NAV_GROUPS = [
  {
    id: 'start', icon: '📌', label: 'بداية سريعة',
    pages: [
      { id: 'overview',   icon: '📌', label: 'النظرة العامة',   file: 'pages/overview.html'   },
      { id: 'quickstart', icon: '🚀', label: 'البداية السريعة', file: 'pages/quickstart.html' },
      { id: 'setup',      icon: '🔧', label: 'الإعداد التقني',  file: 'pages/setup.html'      },
    ]
  },
  {
    id: 'arch', icon: '🏗️', label: 'البنية الأساسية',
    pages: [
      { id: 'database',  icon: '🗄️', label: 'قاعدة البيانات',    file: 'pages/database.html'  },
      { id: 'models',    icon: '🔗', label: 'النماذج والعلاقات',  file: 'pages/models.html'    },
      { id: 'structure', icon: '📁', label: 'هيكل المشروع',      file: 'pages/structure.html' },
      { id: 'rules',     icon: '📏', label: 'قواعد العمل',        file: 'pages/rules.html'     },
    ]
  },
  {
    id: 'modules', icon: '⚙️', label: 'الوحدات',
    pages: [
      { id: 'engine',           icon: '⚙️', label: 'محرك التسعير',    file: 'pages/engine.html'           },
      { id: 'clients-patients', icon: '👥', label: 'العملاء والمرضى', file: 'pages/clients-patients.html' },
      { id: 'design-system',    icon: '🎨', label: 'نظام التصميم',    file: 'pages/design-system.html'    },
    ]
  },
  {
    id: 'quality', icon: '🧪', label: 'الجودة والاختبارات',
    pages: [
      { id: 'testing', icon: '🧪', label: 'منظومة الاختبارات', file: 'pages/testing.html' },
    ]
  },
  {
    id: 'project', icon: '🗺️', label: 'المشروع',
    pages: [
      { id: 'roadmap', icon: '🗺️', label: 'خارطة الطريق', file: 'pages/roadmap.html' },
    ]
  },
];

/* Flat ordered list for routing & prev/next */
const PAGES = NAV_GROUPS.flatMap(g =>
  g.pages.map(p => ({ ...p, group: g.label, groupId: g.id }))
);

/* ─── State ─── */
const scrollMemory = {};
const pageCache    = {};
const searchIndex  = {};
let currentPage    = null;
let tocObserver    = null;

/* ─── DOM helpers ─── */
const $ = (id) => document.getElementById(id);
const app        = () => $('app');
const loadingBar = () => document.querySelector('.loading-bar');
const sidebarEl  = () => document.querySelector('.sidebar');
const overlayEl  = () => document.querySelector('.sidebar-overlay');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ═══════════════════════════════════════════════════════════
   ROUTER — hash-based SPA with page/section deep linking
   ═══════════════════════════════════════════════════════════ */
function parseHash() {
  const raw = location.hash.replace('#', '') || 'overview';
  const parts = raw.split('/');
  const pageId = PAGES.find(p => p.id === parts[0]) ? parts[0] : 'overview';
  const sectionId = parts[1] || null;
  return { pageId, sectionId };
}

async function navigate(pageId, sectionId) {
  if (pageId === currentPage && !sectionId) return;
  if (pageId === currentPage && sectionId) {
    scrollToSection(sectionId);
    return;
  }

  if (currentPage) scrollMemory[currentPage] = window.scrollY;

  const page = PAGES.find(p => p.id === pageId);
  if (!page) return;

  const hash = sectionId ? `${pageId}/${sectionId}` : pageId;
  history.pushState(null, '', `#${hash}`);

  loadingBar()?.classList.add('active');

  const container = app();
  container.classList.remove('fade-in');
  container.classList.add('fade-out');
  await sleep(120);

  /* Load content */
  let html;
  if (pageCache[pageId]) {
    html = pageCache[pageId];
  } else {
    try {
      const res = await fetch(page.file);
      html = await res.text();
      pageCache[pageId] = html;
    } catch (e) {
      html = '<div class="section"><h2>خطأ في تحميل الصفحة</h2><p class="section-intro">' + e.message + '</p></div>';
    }
  }

  container.innerHTML = html;
  currentPage = pageId;

  /* Breadcrumb */
  const bcGroup = $('bc-group');
  const bcCurrent = $('bc-current');
  if (bcGroup) bcGroup.textContent = page.group;
  if (bcCurrent) bcCurrent.textContent = page.label;

  /* Active nav */
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageId);
  });
  const activeLink = document.querySelector('.nav-link.active');
  if (activeLink) activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  /* Post-process */
  buildTOC();
  buildPrevNext(pageId);
  attachCopyButtons();
  attachAnchors();
  indexPageForSearch(pageId, html);

  /* Fade in */
  container.classList.remove('fade-out');
  container.classList.add('fade-in');

  /* Scroll */
  if (sectionId) {
    requestAnimationFrame(() => scrollToSection(sectionId));
  } else {
    const saved = scrollMemory[pageId] || 0;
    requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'instant' }));
  }

  loadingBar()?.classList.remove('active');
  closeMobileSidebar();
}

function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 60;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

window.addEventListener('popstate', () => {
  const { pageId, sectionId } = parseHash();
  navigate(pageId, sectionId);
});

/* ═══════════════════════════════════════════════════════════
   GROUPED NAVIGATION BUILDER
   ═══════════════════════════════════════════════════════════ */
function buildNav() {
  const nav = $('sidebar-nav');
  if (!nav) return;

  NAV_GROUPS.forEach(group => {
    const div = document.createElement('div');
    div.className = 'nav-group';
    div.dataset.group = group.id;

    const header = document.createElement('div');
    header.className = 'nav-group-header';
    header.innerHTML =
      '<span class="nav-group-icon">' + group.icon + '</span>' +
      '<span class="nav-group-label">' + group.label + '</span>' +
      '<span class="nav-group-count">' + group.pages.length + '</span>' +
      '<span class="nav-group-chevron">◂</span>';
    header.addEventListener('click', () => div.classList.toggle('collapsed'));
    div.appendChild(header);

    const items = document.createElement('div');
    items.className = 'nav-group-items';
    group.pages.forEach(page => {
      const link = document.createElement('a');
      link.className = 'nav-link';
      link.dataset.page = page.id;
      link.innerHTML =
        '<span class="nav-icon">' + page.icon + '</span>' +
        '<span class="nav-label">' + page.label + '</span>';
      link.addEventListener('click', e => { e.preventDefault(); navigate(page.id); });
      items.appendChild(link);
    });
    div.appendChild(items);
    nav.appendChild(div);
  });
}

/* ═══════════════════════════════════════════════════════════
   TABLE OF CONTENTS — auto-generated from h3 + scroll spy
   ═══════════════════════════════════════════════════════════ */
function buildTOC() {
  const tocList = $('toc-list');
  if (!tocList) return;
  tocList.innerHTML = '';

  if (tocObserver) tocObserver.disconnect();

  const headings = app().querySelectorAll('h3');
  if (headings.length === 0) {
    tocList.innerHTML = '<div class="toc-empty">لا توجد أقسام في هذه الصفحة</div>';
    updateTocMeta();
    return;
  }

  const ids = [];
  headings.forEach((h, i) => {
    if (!h.id) h.id = 'section-' + i;
    ids.push(h.id);

    const link = document.createElement('a');
    link.className = 'toc-link';
    link.textContent = (h.dataset.tocTitle || h.textContent).replace(/#/g, '').trim();
    link.addEventListener('click', e => {
      e.preventDefault();
      scrollToSection(h.id);
      history.replaceState(null, '', '#' + currentPage + '/' + h.id);
    });
    tocList.appendChild(link);
  });

  /* Scroll spy */
  tocObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        tocList.querySelectorAll('.toc-link').forEach((link, idx) => {
          link.classList.toggle('active', ids[idx] === id);
        });
      }
    });
  }, { rootMargin: '-60px 0px -70% 0px', threshold: 0 });

  headings.forEach(h => tocObserver.observe(h));
  updateTocMeta();
}

function updateTocMeta() {
  const metaEl = $('toc-meta');
  if (!metaEl) return;
  const article = app().querySelector('[data-updated]');
  const updated = article ? article.dataset.updated : '—';
  metaEl.innerHTML = 'آخر تحديث: <span>' + updated + '</span>';
}

/* ═══════════════════════════════════════════════════════════
   FULL-TEXT SEARCH — pre-index + live results dropdown
   ═══════════════════════════════════════════════════════════ */
function indexPageForSearch(pageId, html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  searchIndex[pageId] = (tmp.textContent || '').toLowerCase();
}

async function preloadSearchIndex() {
  for (const page of PAGES) {
    if (searchIndex[page.id]) continue;
    try {
      const res = await fetch(page.file);
      const html = await res.text();
      if (!pageCache[page.id]) pageCache[page.id] = html;
      indexPageForSearch(page.id, html);
    } catch (e) { /* skip */ }
  }
}

function initSearch() {
  const input = $('search-input');
  const results = $('search-results');
  if (!input || !results) return;

  let debounce = null;

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => doSearch(input.value.trim()), 200);
  });
  input.addEventListener('focus', () => {
    if (input.value.trim()) doSearch(input.value.trim());
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) results.classList.remove('open');
  });

  /* Keyboard: / to focus, Esc to close */
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement !== input) {
      e.preventDefault(); input.focus();
    }
    if (e.key === 'Escape') { input.blur(); results.classList.remove('open'); }
  });

  setTimeout(preloadSearchIndex, 1500);
}

function doSearch(query) {
  const results = $('search-results');
  if (!results) return;
  results.innerHTML = '';

  if (!query || query.length < 2) { results.classList.remove('open'); return; }

  const q = query.toLowerCase();
  const matches = [];

  PAGES.forEach(page => {
    const text = searchIndex[page.id] || '';
    const idx = text.indexOf(q);
    if (idx === -1 && !page.label.toLowerCase().includes(q)) return;

    let snippet = '';
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + q.length + 60);
      snippet = (start > 0 ? '…' : '') +
        text.slice(start, idx) +
        '<mark class="search-hl">' + text.slice(idx, idx + q.length) + '</mark>' +
        text.slice(idx + q.length, end) +
        (end < text.length ? '…' : '');
    }
    matches.push({ page, snippet });
  });

  if (matches.length === 0) {
    results.innerHTML = '<div class="search-result-item"><div class="search-result-title">لا توجد نتائج</div></div>';
    results.classList.add('open');
    return;
  }

  matches.forEach(m => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML =
      '<div class="search-result-title">' + m.page.icon + ' ' + m.page.label + '</div>' +
      (m.snippet ? '<div class="search-result-snippet">' + m.snippet + '</div>' : '');
    item.addEventListener('click', () => {
      results.classList.remove('open');
      $('search-input').value = '';
      navigate(m.page.id);
    });
    results.appendChild(item);
  });
  results.classList.add('open');
}

/* ═══════════════════════════════════════════════════════════
   PREV / NEXT NAVIGATION
   ═══════════════════════════════════════════════════════════ */
function buildPrevNext(pageId) {
  const existing = app().querySelector('.page-nav');
  if (existing) existing.remove();

  const idx = PAGES.findIndex(p => p.id === pageId);
  if (idx === -1) return;

  const prev = idx > 0 ? PAGES[idx - 1] : null;
  const next = idx < PAGES.length - 1 ? PAGES[idx + 1] : null;

  if (!prev && !next) return;

  const nav = document.createElement('div');
  nav.className = 'page-nav';

  if (prev) {
    const a = document.createElement('a');
    a.className = 'page-nav-link prev';
    a.innerHTML =
      '<span class="page-nav-dir">← السابق</span>' +
      '<span class="page-nav-title">' + prev.label + '</span>';
    a.addEventListener('click', e => { e.preventDefault(); navigate(prev.id); });
    nav.appendChild(a);
  } else {
    nav.appendChild(document.createElement('div')); // spacer
  }

  if (next) {
    const a = document.createElement('a');
    a.className = 'page-nav-link next';
    a.innerHTML =
      '<span class="page-nav-dir">التالي →</span>' +
      '<span class="page-nav-title">' + next.label + '</span>';
    a.addEventListener('click', e => { e.preventDefault(); navigate(next.id); });
    nav.appendChild(a);
  }

  app().appendChild(nav);
}

/* ═══════════════════════════════════════════════════════════
   COPY CODE BUTTON
   ═══════════════════════════════════════════════════════════ */
function attachCopyButtons() {
  app().querySelectorAll('.code-block').forEach(block => {
    if (block.querySelector('.copy-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'نسخ';
    btn.addEventListener('click', async () => {
      const text = block.textContent.replace('نسخ', '').replace('✓ تم', '').trim();
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = '✓ تم';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'نسخ'; btn.classList.remove('copied'); }, 2000);
      } catch (e) { /* clipboard not available */ }
    });
    block.appendChild(btn);
  });
}

/* ═══════════════════════════════════════════════════════════
   ANCHOR LINKS on h3 headings
   ═══════════════════════════════════════════════════════════ */
function attachAnchors() {
  app().querySelectorAll('h3[id]').forEach(h => {
    if (h.querySelector('.anchor-link')) return;
    const a = document.createElement('a');
    a.className = 'anchor-link';
    a.textContent = '#';
    a.href = '#' + currentPage + '/' + h.id;
    a.addEventListener('click', e => {
      e.preventDefault();
      scrollToSection(h.id);
      history.replaceState(null, '', '#' + currentPage + '/' + h.id);
    });
    h.prepend(a);
  });
}

/* ═══════════════════════════════════════════════════════════
   MOBILE SIDEBAR
   ═══════════════════════════════════════════════════════════ */
function toggleMobileSidebar() {
  sidebarEl()?.classList.toggle('open');
  overlayEl()?.classList.toggle('active');
}

function closeMobileSidebar() {
  sidebarEl()?.classList.remove('open');
  overlayEl()?.classList.remove('active');
}

/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  buildNav();
  initSearch();
  const { pageId, sectionId } = parseHash();
  navigate(pageId, sectionId);
});
