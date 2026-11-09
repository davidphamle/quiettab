(async function () {
  const QT = window.QT;
  const $ = (id) => document.getElementById(id);
  const get = () => new Promise((r) => chrome.storage.local.get('qt', (x) => r((x && x.qt) || {})));
  const s = await get();

  for (const [id, skin] of Object.entries(QT.skins)) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = skin.label;
    $('skin').appendChild(o);
  }
  const defaultSkin = Object.keys(QT.skins).includes('workbook') ? 'workbook' : 'classic';
  $('skin').value = s.skin || defaultSkin;
  $('fileName').value = s.fileName || 'tracker_q3';
  $('initials').value = s.initials || '';
  $('codeSources').checked = !!s.codeSources;
  $('blurOnBlur').checked = !!s.blurOnBlur;
  if (s.archive) $('archive').value = [s.archive.columns.join('\t'), ...s.archive.rows.map((r) => r.join('\t'))].join('\n');

  if (chrome.commands && chrome.commands.getAll)
    chrome.commands.getAll((cmds) => {
      const c = cmds.find((x) => x.name === 'panic');
      if (c && c.shortcut) $('key').textContent = c.shortcut;
    });

  async function save(extra) {
    const archiveText = $('archive').value.trim();
    const parsed = archiveText ? QT.parseArchive(archiveText) : null;
    if (archiveText && !parsed) {
      $('saved').textContent = 'Archive needs a header row and at least one data row.';
      $('saved').style.color = '#a8620c';
      return;
    }
    const next = {
      ...(await get()),
      skin: $('skin').value,
      fileName: $('fileName').value.trim() || 'tracker_q3',
      initials: $('initials').value.trim().toUpperCase(),
      codeSources: $('codeSources').checked,
      blurOnBlur: $('blurOnBlur').checked,
      archive: parsed,
      ...extra,
    };
    await chrome.storage.local.set({ qt: next });
    $('saved').style.color = '';
    $('saved').textContent = 'Saved';
    setTimeout(() => ($('saved').textContent = ''), 1500);
  }
  $('save').onclick = () => save();
  $('reset').onclick = () => {
    $('archive').value = '';
    save({ archive: null });
  };
})();
