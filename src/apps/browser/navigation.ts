export interface BrowserTab {
  id: string;
  history: string[];
  position: number;
}
export const newTab = (): BrowserTab => ({
  id: crypto.randomUUID(),
  history: [],
  position: -1,
});
export function navigateTab(tab: BrowserTab, value: string): BrowserTab {
  const input = value.trim();
  if (!input) throw Error("Enter a website address.");
  if (/^[a-z][a-z\d+.-]*:/i.test(input) && !/^https?:\/\//i.test(input))
    throw Error("Only HTTP and HTTPS addresses are supported.");
  const url = new URL(/^https?:\/\//i.test(input) ? input : "https://" + input);
  if (!["https:", "http:"].includes(url.protocol))
    throw Error("Unsupported protocol.");
  const history = [...tab.history.slice(0, tab.position + 1), url.href];
  return { ...tab, history, position: history.length - 1 };
}
export function stepTab(tab: BrowserTab, direction: number): BrowserTab {
  return {
    ...tab,
    position: Math.max(
      -1,
      Math.min(tab.history.length - 1, tab.position + direction),
    ),
  };
}
