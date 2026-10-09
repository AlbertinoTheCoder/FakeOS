import { expect, it } from "vitest";
import { newTab, navigateTab, stepTab } from "./navigation";
it("keeps independent histories and removes forward history after navigation", () => {
  let first = navigateTab(newTab(), "example.com");
  first = navigateTab(first, "example.org");
  const second = navigateTab(newTab(), "wikipedia.org");
  first = stepTab(first, -1);
  expect(first.history[first.position]).toBe("https://example.com/");
  expect(second.history[second.position]).toBe("https://wikipedia.org/");
  first = navigateTab(first, "example.net");
  expect(first.history).toEqual([
    "https://example.com/",
    "https://example.net/",
  ]);
});
it("rejects executable and unsupported protocols", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///etc/passwd",
    "",
  ])
    expect(() => navigateTab(newTab(), value)).toThrow();
});
