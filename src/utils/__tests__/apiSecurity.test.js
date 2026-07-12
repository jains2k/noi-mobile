/** Regression tests ensuring bearer tokens are limited to the configured API origin. */
import { resolveFirstPartyApiUrl } from "../apiSecurity";

const BASE = "https://noi.example";

describe("resolveFirstPartyApiUrl", () => {
  test.each([
    ["/api/tasks", "https://noi.example/api/tasks"],
    ["/api/tasks?status=active", "https://noi.example/api/tasks?status=active"],
    ["https://noi.example/api/tasks", "https://noi.example/api/tasks"],
    ["https://noi.example:443/api/tasks", "https://noi.example/api/tasks"],
  ])("accepts first-party request %s", (input, expected) => {
    expect(resolveFirstPartyApiUrl(input, BASE)).toBe(expected);
  });

  test.each([
    "//evil.example/api/tasks",
    "http://noi.example/api/tasks",
    "https://noi.example.evil.example/api/tasks",
    "https://noi.example@evil.example/api/tasks",
    "data:text/plain,secret",
    "not a url",
  ])("rejects request %s", (input) => {
    expect(resolveFirstPartyApiUrl(input, BASE)).toBeNull();
  });

  test("fails closed when the configured API origin is insecure", () => {
    expect(resolveFirstPartyApiUrl("/api/tasks", "http://noi.example")).toBeNull();
  });
});
