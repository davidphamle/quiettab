// The Archive sheet: the panic landing. A dull, plausible tracker. Users can
// replace it by pasting from their own spreadsheet on the options page.
// Generated deterministically so the landing never varies between loads.
(function () {
  const QT = (window.QT = window.QT || {});
  const accounts = ['Halvorsen Freight', 'Brightwater Health', 'Kestrel Mining', 'Orchard Lane Retail', 'Tamsin Logistics', 'Northgate Council', 'Redfern Clinics', 'Copperleaf Energy', 'Marlow & Hale', 'Southbank Ports', 'Ivory Coast Dental', 'Pinecrest Schools'];
  const owners = ['A. Patel', 'J. Moretti', 'S. Nguyen', 'L. Okafor', 'R. Byrne'];
  const regions = ['SA', 'VIC', 'NSW', 'QLD', 'WA'];
  const stages = ['Discovery', 'Proposal', 'Review', 'Signed', 'On hold'];

  let seed = 20260819;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  const rows = [];
  for (let i = 0; i < 26; i++) {
    const day = 1 + Math.floor(rnd() * 28);
    const month = 7 + Math.floor(rnd() * 3);
    const value = 2000 + Math.round(rnd() * 46) * 500;
    rows.push([
      'Q3-' + String(101 + i),
      accounts[i % accounts.length],
      pick(owners),
      pick(regions),
      pick(stages),
      `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/2026`,
      '$' + value.toLocaleString('en-AU'),
    ]);
  }

  QT.archiveDefault = {
    columns: ['Ref', 'Account', 'Owner', 'Region', 'Stage', 'Updated', 'Value'],
    rows,
  };

  // Paste-from-spreadsheet: tab-separated, first line is headers.
  QT.parseArchive = function (tsv) {
    const lines = String(tsv || '')
      .replace(/\r/g, '')
      .split('\n')
      .filter((l) => l.trim());
    if (lines.length < 2) return null;
    const split = (l) => (l.includes('\t') ? l.split('\t') : l.split(','));
    const columns = split(lines[0]).map((s) => s.trim()).slice(0, 26);
    const rows = lines.slice(1, 501).map((l) => {
      const cells = split(l).map((s) => s.trim());
      return columns.map((_, i) => cells[i] || '');
    });
    return { columns, rows };
  };
})();
