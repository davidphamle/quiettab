(function () {
  const QT = window.QT;
  if (!QT || QT.__booted) return;
  QT.__booted = true;
  QT.settings.load().then(() => QT.app.start());
})();
