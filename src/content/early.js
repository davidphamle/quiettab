// Runs at document_start. Owns the tab's title and favicon, the two pieces
// of the page that armour CSS cannot reach and that show in the tab strip
// even when the tab is in the background.
(function () {
  const QT = (window.QT = window.QT || {});
  const ICON =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
        '<rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="#3b6e8f"/>' +
        '<path d="M4 5h8M4 8h8M4 11h8M7 4v8" stroke="#fff" stroke-width="1.2"/></svg>'
    );

  const guard = (QT.titleGuard = {
    title: 'tracker_q3',
    active: true,
    set(title) {
      guard.title = title;
      apply();
    },
    release() {
      guard.active = false;
    },
    engage() {
      guard.active = true;
      apply();
    },
  });

  function apply() {
    if (!guard.active) return;
    if (document.title !== guard.title) document.title = guard.title;
    const head = document.head;
    if (!head) return;
    const links = head.querySelectorAll('link[rel~="icon"]');
    let ours = head.querySelector('link[data-qt-icon]');
    links.forEach((l) => {
      if (l !== ours && l.href !== ICON) l.href = ICON;
    });
    if (!ours) {
      ours = document.createElement('link');
      ours.rel = 'icon';
      ours.href = ICON;
      ours.setAttribute('data-qt-icon', '');
      head.appendChild(ours);
    }
  }

  let headObserved = false;
  function watchHead() {
    if (headObserved || !document.head) return;
    headObserved = true;
    new MutationObserver(apply).observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['href'],
    });
    apply();
  }

  apply();
  if (document.head) watchHead();
  else
    new MutationObserver((_, obs) => {
      if (document.head) {
        obs.disconnect();
        watchHead();
      }
    }).observe(document.documentElement, { childList: true });
})();
