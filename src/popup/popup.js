(async function () {
  const $ = (id) => document.getElementById(id);
  const get = () => new Promise((r) => chrome.storage.local.get('qt', (x) => r((x && x.qt) || {})));
  let s = await get();

  if (chrome.commands && chrome.commands.getAll) {
    chrome.commands.getAll((cmds) => {
      const c = cmds.find((x) => x.name === 'panic');
      if (c && c.shortcut) $('key').textContent = c.shortcut;
    });
  }

  const paint = () => ($('pause').textContent = s.paused ? 'Paused' : 'On');
  paint();
  $('pause').onclick = async () => {
    s = { ...(await get()), paused: !s.paused };
    await chrome.storage.local.set({ qt: s });
    paint();
  };
  $('opts').onclick = () => chrome.runtime.openOptionsPage();

  // Selector health: the only way to tell "the source changed its markup"
  // apart from "no results".
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, { type: 'qt:health' }, (res) => {
    const el = $('health');
    if (chrome.runtime.lastError || !res) {
      el.textContent = 'Not on this tab';
      return;
    }
    if (res.misses === 0) {
      el.textContent = `${res.rows} rows · OK`;
      el.className = 'ok';
    } else {
      el.textContent = `${res.rows} rows · ${res.misses} misses`;
      el.className = 'warn';
    }
  });
})();
