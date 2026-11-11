import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_ATTEMPTS,
  MAX_WAIT_MS,
  OVERLOAD_RETRY_BUDGET_SLACK_MS,
  sendWithOverloadRetry,
} from "./provider-retry";

function response(status: number, headers: Record<string, string> = {}) {
  return { status, ok: status >= 200 && status < 300, headers: new Headers(headers) } as Response;
}

// A 503 whose body can be observed: cancel() is recorded, never read.
function responseWithBody(status: number, cancel: () => Promise<void> = async () => undefined) {
  const cancelSpy = vi.fn(cancel);
  const res = {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(),
    body: { cancel: cancelSpy },
  } as unknown as Response;
  return { res, cancelSpy };
}

// A deterministic clock: sleeping advances it, and each send can take time.
function makeClock() {
  let current = 1_000_000;
  const sleeps: number[] = [];
  return {
    now: () => current,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      current += ms;
    },
    tick: (ms: number) => {
      current += ms;
    },
    sleeps,
  };
}

const attemptTimeoutMs = 45_000;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("sendWithOverloadRetry", () => {
  it("succeeds on the third attempt after two 503s, waiting about 2s and then about 5s", async () => {
    const clock = makeClock();
    const send = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200));

    const result = await sendWithOverloadRetry(send, {
      label: "Test call",
      attemptTimeoutMs,
      now: clock.now,
      sleep: clock.sleep,
      random: () => 0.5, // zero jitter
    });

    expect(result.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(3);
    expect(clock.sleeps).toEqual([2_000, 5_000]);
    expect(consoleError).toHaveBeenCalledTimes(2);
    expect(consoleError).toHaveBeenNthCalledWith(1, "Test call overloaded (503), retrying (attempt 1) in 2000ms");
    expect(consoleError).toHaveBeenNthCalledWith(2, "Test call overloaded (503), retrying (attempt 2) in 5000ms");
  });

  it("returns the last 503 after three attempts", async () => {
    const clock = makeClock();
    const send = vi.fn<() => Promise<Response>>().mockResolvedValue(response(503));

    const result = await sendWithOverloadRetry(send, {
      label: "Test call",
      attemptTimeoutMs,
      now: clock.now,
      sleep: clock.sleep,
      random: () => 0.5,
    });

    expect(MAX_ATTEMPTS).toBe(3);
    expect(result.status).toBe(503);
    expect(send).toHaveBeenCalledTimes(3);
    expect(clock.sleeps).toHaveLength(2);
  });

  it("jitters each wait by at most +/-20%", async () => {
    const waitsFor = async (random: number) => {
      const clock = makeClock();
      await sendWithOverloadRetry(vi.fn<() => Promise<Response>>().mockResolvedValue(response(503)), {
        label: "Test call",
        attemptTimeoutMs,
        now: clock.now,
        sleep: clock.sleep,
        random: () => random,
      });
      return clock.sleeps;
    };

    expect(await waitsFor(0)).toEqual([1_600, 4_000]);
    expect(await waitsFor(1)).toEqual([2_400, 6_000]);
    expect(MAX_WAIT_MS).toBe(6_000);
  });

  describe("Retry-After", () => {
    const waitWith = async (retryAfter: string | undefined) => {
      const clock = makeClock();
      const send = vi
        .fn<() => Promise<Response>>()
        .mockResolvedValueOnce(response(503, retryAfter === undefined ? {} : { "Retry-After": retryAfter }))
        .mockResolvedValueOnce(response(200));
      await sendWithOverloadRetry(send, {
        label: "Test call",
        attemptTimeoutMs,
        now: clock.now,
        sleep: clock.sleep,
        random: () => 0.5,
      });
      return clock.sleeps[0];
    };

    it("replaces the scheduled wait with a Retry-After in seconds", async () => {
      expect(await waitWith("3")).toBe(3_000);
    });

    it("caps a long Retry-After at the maximum wait", async () => {
      expect(await waitWith("120")).toBe(MAX_WAIT_MS);
    });

    it("honours a Retry-After HTTP date", async () => {
      const clock = makeClock();
      const date = new Date(clock.now() + 4_000).toUTCString();
      const send = vi
        .fn<() => Promise<Response>>()
        .mockResolvedValueOnce(response(503, { "Retry-After": date }))
        .mockResolvedValueOnce(response(200));
      await sendWithOverloadRetry(send, {
        label: "Test call",
        attemptTimeoutMs,
        now: clock.now,
        sleep: clock.sleep,
        random: () => 0.5,
      });
      // HTTP dates have one-second resolution.
      expect(clock.sleeps[0]).toBeGreaterThanOrEqual(3_000);
      expect(clock.sleeps[0]).toBeLessThanOrEqual(4_000);
    });

    it("ignores a Retry-After it cannot read and keeps the schedule", async () => {
      expect(await waitWith("soon")).toBe(2_000);
      expect(await waitWith(undefined)).toBe(2_000);
    });
  });

  describe("overall deadline", () => {
    it("skips the first retry when a full attempt after the wait would pass the budget", async () => {
      const clock = makeClock();
      const send = vi.fn<() => Promise<Response>>().mockResolvedValue(response(503));

      const result = await sendWithOverloadRetry(send, {
        label: "Test call",
        attemptTimeoutMs,
        totalBudgetMs: 46_000, // 0 elapsed + 2000 wait + 45000 attempt = 47000 > 46000
        now: clock.now,
        sleep: clock.sleep,
        random: () => 0.5,
      });

      expect(result.status).toBe(503);
      expect(send).toHaveBeenCalledTimes(1);
      expect(clock.sleeps).toEqual([]);
      expect(consoleError).toHaveBeenCalledWith(
        "Test call overloaded (503), not retrying (attempt 1): out of time budget",
      );
    });

    it("allows the first retry but skips the second when the first two attempts ran long", async () => {
      const clock = makeClock();
      const send = vi.fn<() => Promise<Response>>().mockImplementation(async () => {
        clock.tick(10_000); // each overloaded attempt takes 10s to answer
        return response(503);
      });

      await sendWithOverloadRetry(send, {
        label: "Test call",
        attemptTimeoutMs,
        totalBudgetMs: 60_000,
        now: clock.now,
        sleep: clock.sleep,
        random: () => 0.5,
      });

      // Before retry 1: 10000 + 2000 + 45000 = 57000 <= 60000.
      // Before retry 2: 22000 + 5000 + 45000 = 72000 > 60000.
      expect(send).toHaveBeenCalledTimes(2);
      expect(clock.sleeps).toEqual([2_000]);
    });

    it("defaults to three full attempts plus slack: 150s for a 45s attempt, 75s for a 20s one", async () => {
      expect(OVERLOAD_RETRY_BUDGET_SLACK_MS).toBe(15_000);
      const retriesWithFirstAnswerAt = async (elapsedMs: number, timeoutMs: number) => {
        const clock = makeClock();
        const send = vi
          .fn<() => Promise<Response>>()
          .mockImplementationOnce(async () => {
            clock.tick(elapsedMs);
            return response(503);
          })
          .mockResolvedValue(response(200));
        await sendWithOverloadRetry(send, {
          label: "Test call",
          attemptTimeoutMs: timeoutMs,
          now: clock.now,
          sleep: clock.sleep,
          random: () => 0.5,
        });
        return send.mock.calls.length;
      };

      expect(await retriesWithFirstAnswerAt(100_000, 45_000)).toBe(2); // 100000 + 2000 + 45000 = 147000 <= 150000
      expect(await retriesWithFirstAnswerAt(104_000, 45_000)).toBe(1); // 151000 > 150000
      expect(await retriesWithFirstAnswerAt(28_000, 20_000)).toBe(2); // 28000 + 2000 + 20000 = 50000 <= 75000
      expect(await retriesWithFirstAnswerAt(54_000, 20_000)).toBe(1); // 76000 > 75000
    });
  });

  it.each([429, 400, 401, 404, 500, 502])("never retries a %i", async (status) => {
    const clock = makeClock();
    const send = vi.fn<() => Promise<Response>>().mockResolvedValue(response(status));

    const result = await sendWithOverloadRetry(send, {
      label: "Test call",
      attemptTimeoutMs,
      now: clock.now,
      sleep: clock.sleep,
    });

    expect(result.status).toBe(status);
    expect(send).toHaveBeenCalledTimes(1);
    expect(clock.sleeps).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("lets a transport failure or timeout propagate immediately, on any attempt", async () => {
    const clock = makeClock();
    const failure = new Error("network down");

    await expect(
      sendWithOverloadRetry(vi.fn<() => Promise<Response>>().mockRejectedValue(failure), {
        label: "Test call",
        attemptTimeoutMs,
        now: clock.now,
        sleep: clock.sleep,
      }),
    ).rejects.toBe(failure);

    const send = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(response(503))
      .mockRejectedValueOnce(failure);
    await expect(
      sendWithOverloadRetry(send, {
        label: "Test call",
        attemptTimeoutMs,
        now: clock.now,
        sleep: clock.sleep,
        random: () => 0.5,
      }),
    ).rejects.toBe(failure);
    expect(send).toHaveBeenCalledTimes(2);
  });

  describe("response bodies", () => {
    const options = (clock: ReturnType<typeof makeClock>, extra: object = {}) => ({
      label: "Test call",
      attemptTimeoutMs,
      now: clock.now,
      sleep: clock.sleep,
      random: () => 0.5,
      ...extra,
    });

    it("cancels the body of each 503 a retry replaces, but not the final response", async () => {
      const clock = makeClock();
      const first = responseWithBody(503);
      const second = responseWithBody(503);
      const third = responseWithBody(503);
      const send = vi
        .fn<() => Promise<Response>>()
        .mockResolvedValueOnce(first.res)
        .mockResolvedValueOnce(second.res)
        .mockResolvedValueOnce(third.res);

      const result = await sendWithOverloadRetry(send, options(clock));

      expect(result).toBe(third.res);
      expect(first.cancelSpy).toHaveBeenCalledTimes(1);
      expect(second.cancelSpy).toHaveBeenCalledTimes(1);
      expect(third.cancelSpy).not.toHaveBeenCalled();
    });

    it("does not cancel the 503 returned when a retry is skipped for the time budget", async () => {
      const clock = makeClock();
      const only = responseWithBody(503);
      const send = vi.fn<() => Promise<Response>>().mockResolvedValue(only.res);

      const result = await sendWithOverloadRetry(send, options(clock, { totalBudgetMs: 46_000 }));

      expect(result).toBe(only.res);
      expect(send).toHaveBeenCalledTimes(1);
      expect(only.cancelSpy).not.toHaveBeenCalled();
    });

    it("does not cancel a successful or non-503 response", async () => {
      const clock = makeClock();
      const ok = responseWithBody(200);
      await sendWithOverloadRetry(vi.fn<() => Promise<Response>>().mockResolvedValue(ok.res), options(clock));
      const rateLimited = responseWithBody(429);
      await sendWithOverloadRetry(vi.fn<() => Promise<Response>>().mockResolvedValue(rateLimited.res), options(clock));

      expect(ok.cancelSpy).not.toHaveBeenCalled();
      expect(rateLimited.cancelSpy).not.toHaveBeenCalled();
    });

    it("does not throw, and still retries, when cancelling a body rejects or throws", async () => {
      const clock = makeClock();
      const rejecting = responseWithBody(503, () => Promise.reject(new Error("locked")));
      const throwing = responseWithBody(503, () => {
        throw new Error("sync failure");
      });
      const send = vi
        .fn<() => Promise<Response>>()
        .mockResolvedValueOnce(rejecting.res)
        .mockResolvedValueOnce(throwing.res)
        .mockResolvedValueOnce(response(200));

      const result = await sendWithOverloadRetry(send, options(clock));

      expect(result.status).toBe(200);
      expect(send).toHaveBeenCalledTimes(3);
      expect(rejecting.cancelSpy).toHaveBeenCalledTimes(1);
      expect(throwing.cancelSpy).toHaveBeenCalledTimes(1);
    });

    it("tolerates a response with no body", async () => {
      const clock = makeClock();
      const send = vi
        .fn<() => Promise<Response>>()
        .mockResolvedValueOnce({ status: 503, ok: false, headers: new Headers() } as Response)
        .mockResolvedValueOnce(response(200));

      await expect(sendWithOverloadRetry(send, options(clock))).resolves.toMatchObject({ status: 200 });
    });
  });

  it("waits on real timers by default, 2s then 5s, under fake timers", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const send = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200));

    const promise = sendWithOverloadRetry(send, { label: "Test call", attemptTimeoutMs });

    await vi.advanceTimersByTimeAsync(1_999);
    expect(send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(send).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledTimes(3);
    await expect(promise).resolves.toMatchObject({ status: 200 });
  });
});
