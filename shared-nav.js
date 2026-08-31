// shared-nav.js — renders the depth-switcher strip into #depth-nav on every depth page.
// Single source of truth for which depths exist and where they link. Update this file only
// when a new depth's file is added — every page picks up the change automatically.

const NAV_DEPTHS = [
  { n: 1, name: "Mining Hub",       file: "mininghub_map.html",  built: true },
  { n: 2, name: "Onboarding",       file: "onboarding_map.html", built: true },
  { n: 3, name: "Station 1",        file: "station1_map.html",   built: true },
  { n: 4, name: "Drill 1",          file: "drill1_map.html",     built: true },
  { n: 5, name: "Scrapyard",        file: "scrapyard_map.html",  built: true },
  { n: 6, name: "Drill 2",          file: "drill2_map.html",     built: true },
  { n: 7, name: "Station 2",        file: "station2_map.html",   built: true },
  { n: 8, name: "Final Boss Lobby", file: "bosslobby_map.html",  built: true }
];

(function renderDepthNav() {
  const host = document.getElementById('depth-nav');
  if (!host) return;
  const currentDepth = parseInt(document.body.dataset.depth || '0', 10);
  host.innerHTML = NAV_DEPTHS.map(d => {
    const label = `${d.n}. ${d.name}`;
    if (!d.built) {
      return `<span class="depth-nav-item planned" title="Not yet built">${label}</span>`;
    }
    const activeClass = d.n === currentDepth ? ' active' : '';
    return `<a class="depth-nav-item${activeClass}" href="${d.file}">${label}</a>`;
  }).join('');
})();
