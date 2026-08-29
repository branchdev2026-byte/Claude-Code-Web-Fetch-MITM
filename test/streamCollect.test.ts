import { describe, expect, test } from "bun:test";
import { collectStreamWithIdleTimeout, isValidSummary, StreamCollectTimeoutError } from "../src/streamCollect";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("collectStreamWithIdleTimeout", () => {
  test("happy path: concatenates all chunks with no delays", async () => {
    async function* gen() {
      yield "a";
      yield "b";
      yield "c";
    }
    const text = await collectStreamWithIdleTimeout(() => gen(), { idleTimeoutMs: 50, totalTimeoutMs: 500 });
    expect(text).toBe("abc");
  });

  test("idle timeout fires when a gap between chunks exceeds idleTimeoutMs", async () => {
    async function* gen(signal: AbortSignal) {
      yield "a";
      await delay(200);
      if (signal.aborted) throw signal.reason;
      yield "b"; // should never get here
    }
    await expect(
      collectStreamWithIdleTimeout((signal) => gen(signal), { idleTimeoutMs: 30, totalTimeoutMs: 5000 }),
    ).rejects.toThrow(StreamCollectTimeoutError);
  });

  test("idle timeout error carries kind='idle'", async () => {
    async function* gen(signal: AbortSignal) {
      yield "a";
      await delay(200);
      if (signal.aborted) throw signal.reason;
    }
    try {
      await collectStreamWithIdleTimeout((signal) => gen(signal), { idleTimeoutMs: 30, totalTimeoutMs: 5000 });
      throw new Error("expected rejection");
    } catch (err) {
      expect(err).toBeInstanceOf(StreamCollectTimeoutError);
      expect((err as StreamCollectTimeoutError).kind).toBe("idle");
    }
  });

  test("total timeout fires even when chunks keep arriving within idle budget", async () => {
    async function* gen(signal: AbortSignal) {
      for (let i = 0; i < 20; i++) {
        if (signal.aborted) throw signal.reason;
        await delay(15);
        yield "x";
      }
    }
    try {
      await collectStreamWithIdleTimeout((signal) => gen(signal), { idleTimeoutMs: 100, totalTimeoutMs: 60 });
      throw new Error("expected rejection");
    } catch (err) {
      expect(err).toBeInstanceOf(StreamCollectTimeoutError);
      expect((err as StreamCollectTimeoutError).kind).toBe("total");
    }
  });

  test("generator's own error propagates, not masked as a timeout", async () => {
    async function* gen() {
      yield "a";
      throw new Error("boom");
    }
    await expect(
      collectStreamWithIdleTimeout(() => gen(), { idleTimeoutMs: 5000, totalTimeoutMs: 5000 }),
    ).rejects.toThrow("boom");
  });

  test("passes an AbortSignal into makeGen that gets aborted on idle timeout", async () => {
    let observedAborted = false;
    async function* gen(signal: AbortSignal) {
      yield "a";
      await delay(100);
      observedAborted = signal.aborted;
      if (signal.aborted) throw signal.reason;
      yield "b";
    }
    await expect(
      collectStreamWithIdleTimeout((signal) => gen(signal), { idleTimeoutMs: 30, totalTimeoutMs: 5000 }),
    ).rejects.toThrow(StreamCollectTimeoutError);
    expect(observedAborted).toBe(true);
  });
});

describe("isValidSummary", () => {
  test("rejects empty and whitespace-only text", () => {
    expect(isValidSummary("")).toBe(false);
    expect(isValidSummary("   \n\t  ")).toBe(false);
  });

  test("accepts normal summary text", () => {
    expect(isValidSummary("This page is about example domains.")).toBe(true);
  });

  test("rejects absurdly long text", () => {
    expect(isValidSummary("x".repeat(60_000))).toBe(false);
  });

  test("rejects text that is itself a raw parseable JSON object or array (leaked error payload)", () => {
    expect(isValidSummary('{"error":{"message":"rate limited","code":429}}')).toBe(false);
    expect(isValidSummary('["a","b","c"]')).toBe(false);
    expect(isValidSummary("{}")).toBe(false);
  });

  test("accepts prose that merely contains braces/brackets but is not itself valid JSON", () => {
    expect(isValidSummary("The page defines a config object like {key: value} in its example.")).toBe(true);
    expect(isValidSummary("{not valid json")).toBe(true);
  });
});
