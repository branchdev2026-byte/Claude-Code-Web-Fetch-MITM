import { afterAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

// 设计文档第 6.3 节。mock realFetch（健康检查）+ mock Bun.spawn（docker 调用）+ mock
// Date.now/Bun.sleep（把真实 10 秒轮询超时压缩成近乎瞬时的测试），不发真实网络/子进程请求。

let fetchCallCount = 0;
let reachableFromCall: number | null = null; // 从第几次 realFetch 调用开始返回可达（1-based）
mock.module("../../src/realFetch", () => ({
  realFetch: async () => {
    fetchCallCount++;
    if (reachableFromCall !== null && fetchCallCount >= reachableFromCall) {
      return new Response("ok", { status: 200 });
    }
    return new Response("", { status: 503 });
  },
}));

type SpawnMode = "start-ok" | "start-fail-then-run-ok" | "all-fail" | "throw";
let spawnMode: SpawnMode = "start-ok";
let spawnCalls: string[][] = [];

const spawnSpy = spyOn(Bun, "spawn").mockImplementation((cmd: unknown, _opts?: unknown) => {
  const args = cmd as string[];
  spawnCalls.push(args);
  if (spawnMode === "throw") throw new Error("ENOENT: docker not found");
  const isStart = args[1] === "start";
  let exitCode = 0;
  if (spawnMode === "all-fail") exitCode = 1;
  else if (spawnMode === "start-fail-then-run-ok" && isStart) exitCode = 1;
  return { exited: Promise.resolve(exitCode) } as any;
});

let fakeNow = 0;
const dateNowSpy = spyOn(Date, "now").mockImplementation(() => fakeNow);
const sleepSpy = spyOn(Bun, "sleep").mockImplementation(((ms: number) => {
  fakeNow += ms;
  return Promise.resolve();
}) as typeof Bun.sleep);

const { ensureManagedSearxngRunning, __resetManagedSearxngStateForTest } = await import(
  "../../src/websearch/backends/searxngLifecycle"
);

beforeEach(() => {
  __resetManagedSearxngStateForTest();
  fetchCallCount = 0;
  reachableFromCall = null;
  spawnMode = "start-ok";
  spawnCalls = [];
  fakeNow = 0;
});

afterAll(() => {
  spawnSpy.mockRestore();
  dateNowSpy.mockRestore();
  sleepSpy.mockRestore();
});

describe("ensureManagedSearxngRunning", () => {
  test("already reachable: returns the managed URL without touching docker at all", async () => {
    reachableFromCall = 1;
    const url = await ensureManagedSearxngRunning();
    expect(url).toBe("http://127.0.0.1:18888");
    expect(spawnCalls).toHaveLength(0);
  });

  test("docker start succeeds, polling reaches ready and returns the URL", async () => {
    spawnMode = "start-ok";
    reachableFromCall = 3; // 第 1 次(初始检查)、第 2 次(轮询第一次) 都不可达，第 3 次可达
    const url = await ensureManagedSearxngRunning();
    expect(url).toBe("http://127.0.0.1:18888");
    expect(spawnCalls.some((c) => c[1] === "start")).toBe(true);
    expect(spawnCalls.some((c) => c[1] === "run")).toBe(false); // start 成功，不需要 run
  });

  test("docker start fails, falls back to docker run, which succeeds", async () => {
    spawnMode = "start-fail-then-run-ok";
    reachableFromCall = 2;
    const url = await ensureManagedSearxngRunning();
    expect(url).toBe("http://127.0.0.1:18888");
    expect(spawnCalls.some((c) => c[1] === "start")).toBe(true);
    expect(spawnCalls.some((c) => c[1] === "run")).toBe(true);
    // run 命令挂载了一份渲染出的临时 settings.yml（-v <path>:/etc/searxng/settings.yml）。
    const runCall = spawnCalls.find((c) => c[1] === "run")!;
    const volumeArgIndex = runCall.indexOf("-v");
    expect(volumeArgIndex).toBeGreaterThan(-1);
    expect(runCall[volumeArgIndex + 1]).toContain(":/etc/searxng/settings.yml");
  });

  test("docker command itself throws (ENOENT) -> returns null, does not throw", async () => {
    spawnMode = "throw";
    reachableFromCall = null; // 永不可达
    const url = await ensureManagedSearxngRunning();
    expect(url).toBeNull();
  });

  test("polling past READY_TIMEOUT_MS with no success -> returns null", async () => {
    spawnMode = "all-fail";
    reachableFromCall = null; // 永不可达
    const url = await ensureManagedSearxngRunning();
    expect(url).toBeNull();
    expect(fakeNow).toBeGreaterThanOrEqual(10_000); // 轮询确实跑满了超时预算
  });

  test("repeated calls only trigger one actual startup sequence (promise cache)", async () => {
    spawnMode = "start-ok";
    reachableFromCall = 2;
    const [a, b] = await Promise.all([ensureManagedSearxngRunning(), ensureManagedSearxngRunning()]);
    expect(a).toBe(b);
    // 只应该有一次 "start" 调用——重复调用复用同一个 promise，不会重复触发启动逻辑。
    expect(spawnCalls.filter((c) => c[1] === "start")).toHaveLength(1);
  });
});
