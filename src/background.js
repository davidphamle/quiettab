// Relays the browser-level shortcut to the active tab. The in-page key
// listener covers the case where the page has focus; this covers the case
// where focus is in the browser chrome (address bar, toolbar).
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'panic') return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab && tab.id != null) chrome.tabs.sendMessage(tab.id, { type: 'qt:panic' }).catch(() => {});
});
