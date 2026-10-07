import { describe, expect, it } from "vitest";
import { AUTO_RETRY, classifyFailure, retryDelay } from "./errors.ts";

// Error texts as the provider layer really reports them (captured against a misbehaving test server).
describe("classifyFailure", () => {
  it.each([
    ['401: {"message":"Incorrect API key provided"}', "auth"],
    ['402: {"message":"Insufficient credits. Add more using https://openrouter.ai/credits"}', "credit"],
    ['404: {"message":"The model `foo` does not exist"}', "model"],
    ['429: {"message":"Rate limit reached"}', "rate"],
    ['500: {"message":"Internal server error"}', "overloaded"],
    ['503: {"message":"Service overloaded"}', "overloaded"],
    ["403 <html>Blocked by school filter</html>", "blocked"],
    ['403: {"message":"Forbidden"}', "auth"],
    ["terminated", "cut"],
    ["Connection error.", "offline"],
    ["Provider finish_reason: content_filter", "filtered"],
    ["something odd", "unknown"],
    [undefined, "unknown"],
  ])("%s -> %s", (raw, kind) => {
    expect(classifyFailure(raw).kind).toBe(kind);
  });

  it("marks a stalled request, whatever the text says", () => {
    expect(classifyFailure("Request aborted", { stalled: true }).kind).toBe("stalled");
  });

  it("reads a wait time and does not auto-retry problems the teacher must fix", () => {
    expect(classifyFailure("429: Rate limit, retry-after: 7").waitSeconds).toBe(7);
    for (const kind of ["auth", "credit", "model", "blocked", "filtered", "unknown"] as const) expect(AUTO_RETRY.has(kind)).toBe(false);
  });

  it("never shows technical text to the teacher", () => {
    for (const raw of ['429: {"message":"Rate limit"}', "Connection error.", "terminated"]) expect(classifyFailure(raw).message).not.toMatch(/\d{3}|json|socket|http/i);
  });
});

describe("retryDelay", () => {
  it("waits longer each time, and follows the provider's wish up to 30 seconds", () => {
    const f = classifyFailure("Connection error.");
    const mid = () => 0.5;
    expect([1, 2, 3].map((n) => retryDelay(n, f, mid))).toEqual([2, 5, 12]);
    expect(retryDelay(1, { ...f, waitSeconds: 4 })).toBe(4);
    expect(retryDelay(1, { ...f, waitSeconds: 600 })).toBe(30);
  });
});
