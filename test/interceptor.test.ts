import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Config } from "../src/config";
import { installInterceptor } from "../src/interceptor";
import { realFetch } from "../src/realFetch";

// interceptor 装到 globalThis.fetch 上是进程级的全局副作用，这个文件里的测试全部串行、
// 共用同一次安装，避免和其他测试文件的 globalThis.fetch 状态互相污染
// （bun test 默认每个文件独立进程/上下文，这里仍然显式收尾以防将来改动）。

let server: ReturnType<typeof Bun.serve>;
let baseUrl: string;
const originalFetch = globalThis.fetch;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(req) {
      return new Response(JSON.stringify({ echoed: true, path: new URL(req.url).pathname }), {
        headers: { "content-type": "application/json" },
      });
    },
  });
  baseUrl = `http://127.0.0.1:${server.port}`;

  const config: Config = {
    enableTargets: ["webfetch"],
    provider: null,
    openrouter: { apiKey: null, models: [], providers: null, sort: null },
    zai: { apiKey: null, models: [] },
    promptFile: null,
  };
  installInterceptor(config);
});

afterAll(() => {
  server.stop();
  globalThis.fetch = originalFetch;
});

describe("installInterceptor passthrough behavior", () => {
  test("non-anthropic host requests pass straight through, untouched", async () => {
    const res = await fetch(`${baseUrl}/some/path`, {
      method: "POST",
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", tools: [], messages: [] }),
    });
    const json = await res.json();
    expect(json).toEqual({ echoed: true, path: "/some/path" });
  });

  test("GET requests to any host pass straight through", async () => {
    const res = await fetch(`${baseUrl}/get-path`);
    const json = await res.json();
    expect(json.path).toBe("/get-path");
  });

  test("realFetch still points at the true global fetch used to talk to the test server", async () => {
    const res = await realFetch(`${baseUrl}/direct`);
    const json = await res.json();
    expect(json.path).toBe("/direct");
  });
});
