export function resolveSourceWindowId(messageWindowId, senderWindowId) {
  if (Number.isInteger(messageWindowId) && messageWindowId >= 0) return messageWindowId;
  if (Number.isInteger(senderWindowId) && senderWindowId >= 0) return senderWindowId;
  return null;
}

export async function openResultInSourceWindow(url, sourceWindowId, chromeApi = chrome) {
  if (sourceWindowId !== null) {
    try {
      await chromeApi.tabs.create({ windowId: sourceWindowId, url, active: true });
      try {
        await chromeApi.windows.update(sourceWindowId, { focused: true });
      } catch {
      }
      return;
    } catch {
    }
  }

  await chromeApi.tabs.create({ url, active: true });
}
