import { it, expect } from "vitest";
import { nextAlarm, elapsedAt } from "./clockStore";
it("schedules an alarm today or tomorrow and validates input", () => {
  const now = new Date(2026, 9, 9, 10, 30).getTime();
  expect(nextAlarm("11:00", now)).toBe(new Date(2026, 9, 9, 11, 0).getTime());
  expect(nextAlarm("10:00", now)).toBe(new Date(2026, 9, 10, 10, 0).getTime());
  expect(() => nextAlarm("25:80", now)).toThrow();
});
it("keeps elapsed time correct while paused and across delayed ticks", () => {
  expect(elapsedAt(1000, 500, 4000)).toBe(3500);
  expect(elapsedAt(null, 500, 4000)).toBe(500);
});
