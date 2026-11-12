// Runs at document_start, before early.js. Part of the source-site adapter
// (with dom.js): the only other file allowed to know the site's URL shapes.
//
// Decides which pages get covered. Only the job pages do; the rest of the
// site is left alone so you can still navigate it. The site is a single-page
// app, so the route is re-checked on every history change.
(function () {
  const QT = (window.QT = window.QT || {});
  const listeners = [];
  let last = location.pathname;

  const route = (QT.route = {
    covered(path) {
      return /^\/jobs(\/|$)/.test(path == null ? location.pathname : path);
    },
    searchUrl(query) {
      return '/jobs/search-results/?keywords=' + encodeURIComponent(query);
    },
    onChange(fn) {
      listeners.push(fn);
    },
    check() {
      const p = location.pathname;
      if (p === last) return;
      last = p;
      listeners.forEach((fn) => fn(p));
    },
  });

  // pushState from the page's own world is invisible to an isolated world,
  // so poll; cheap, and catches every kind of navigation.
  window.addEventListener('popstate', route.check);
  setInterval(route.check, 250);
})();
