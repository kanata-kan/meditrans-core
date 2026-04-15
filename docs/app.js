/* ═══════════════════════════════════════════════════════════
   MediTrans Docs — Router + Search + Scroll Memory
   AI-OPTIMIZED: Single entry point, no external dependencies
   ═══════════════════════════════════════════════════════════ */

const PAGES = [
  { id: 'overview',   icon: '📌', label: 'النظرة العامة',    file: 'pages/overview.html'   },
  { id: 'setup',      icon: '🔧', label: 'الإعداد التقني',    file: 'pages/setup.html'      },
  { id: 'database',   icon: '🗄️', label: 'قاعدة البيانات',   file: 'pages/database.html'   },
  { id: 'models',     icon: '🔗', label: 'النماذج والعلاقات', file: 'pages/models.html'     },
  { id: 'structure',  icon: '📁', label: 'هيكل المشروع',     file: 'pages/structure.html'  },
  { id: 'engine',     icon: '⚙️', label: 'محرك التسعير',      file: 'pages/engine.html'     },
  { id: 'rules',      icon: '📏', label: 'قواعد العمل',       file: 'pages/rules.html'      },
  { id: 'testing',    icon: '🧪', label: 'الاختبارات',        file: 'pages/testing.html'    },
  { id: 'roadmap',    icon: '🗺️', label: 'الخارطة',          file: 'pages/roadmap.html'    },
  { id: 'quickstart', icon: '🚀', label: 'البداية السريعة',   file: 'pages/quickstart.html' },
];

/* ─── State ─── */
const scrollMemory = {};
const pageCache = {};
let currentPage = null;

/* ─── DOM refs ─── */
const app         = () => document.getElementById('app');
const loadingBar  = () => document.querySelector('.loading-bar');
const breadcrumb  = () => document.getElementById('bc-current');
const sidebarEl   = () => document.querySelector('.sidebar');
const overlayEl   = () => document.querySelector('.sidebar-overlay');

/* ═══════════════════════════════════════════════════════════
   ROUTER
   ═══════════════════════════════════════════════════════════ */
function getPageFromHash() {
  const hash = location.hash.replace('#', '') || 'overview';
  return PAGES.find(p => p.id === hash) ? hash : 'overview';
}

async function navigate(pageId) {
  if (pageId === currentPage) return;

  // Save scroll position of outgoing page
  if (currentPage) {
    scrollMemory[currentPage] = app().scrollTop || window.scrollY;
  }

  const page = PAGES.find(p => p.id === pageId);
  if (!page) return;

  // Update URL
  history.pushState(null, '', `#${pageId}`);

  // Show loading
  loadingBar().classList.add('active');

  // Fade out
  const container = app();
  container.classList.remove('fade-in');
  container.classList.add('fade-out');

  await sleep(150);

  // Load content
  let html;
  if (pageCache[pageId]) {
    html = pageCache[pageId];
  } else {
    try {
      const res = await fetch(page.file);
      html = await res.text();
      pageCache[pageId] = html;
    } catch (e) {
      html = `<div class="section"><h2>خطأ في تحميل الصفحة</h2><p class="section-intro">${e.message}</p></div>`;
    }
  }

  // Inject
  container.innerHTML = html;
  currentPage = pageId;

  // Update breadcrumb
  const bc = breadcrumb();
  if (bc) bc.textContent = page.label;

  // Update active nav
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageId);
  });

  // Fade in
  container.classList.remove('fade-out');
  container.classList.add('fade-in');

  // Restore scroll
  const savedScroll = scrollMemory[pageId] || 0;
  requestAnimationFrame(() => {
    window.scrollTo({ top: savedScroll, behavior: 'instant' });
  });

  // Hide loading
  loadingBar().classList.remove('active');

  // Close mobile sidebar
  closeMobileSidebar();
}

/* ─── History ─── */
window.addEventListener('popstate', () => {
  navigate(getPageFromHash());
});

/* ═══════════════════════════════════════════════════════════
   SEARCH
   ═══════════════════════════════════════════════════════════ */
function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  input.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.nav-link').forEach(link => {
      const label = link.querySelector('.nav-label');
      if (!label) return;
      const text = label.textContent.toLowerCase();
      const match = !q || text.includes(q);
      link.classList.toggle('hidden', !match);
    });
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
function buildNav() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  PAGES.forEach(page => {
    const link = document.createElement('a');
    link.className = 'nav-link';
    link.dataset.page = page.id;
    link.innerHTML = `<span class="nav-icon">${page.icon}</span><span class="nav-label">${page.label}</span>`;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(page.id);
    });
    nav.appendChild(link);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

document.addEventListener('DOMContentLoaded', () => {
  buildNav();
  initSearch();
  navigate(getPageFromHash());
});
