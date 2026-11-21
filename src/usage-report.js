export const USAGE_KEY = 'usageReport';

export function localDateKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function summarizeUsage(report, date = new Date()) {
  const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  return {
    total: count(report?.total),
    rtl: count(report?.rtl),
    ltr: count(report?.ltr),
    today: report?.date === localDateKey(date) ? count(report?.today) : 0
  };
}

export function createUsageRecorder(storage) {
  let pending = Promise.resolve();
  return (direction, date = new Date()) => {
    const record = async () => {
      const stored = await storage.get(USAGE_KEY);
      const previous = summarizeUsage(stored[USAGE_KEY], date);
      await storage.set({ [USAGE_KEY]: {
        ...previous,
        total: previous.total + 1,
        [direction === 'ltr' ? 'ltr' : 'rtl']: previous[direction === 'ltr' ? 'ltr' : 'rtl'] + 1,
        date: localDateKey(date),
        today: previous.today + 1
      } });
    };
    const result = pending.then(record);
    pending = result.catch(() => {});
    return result;
  };
}
