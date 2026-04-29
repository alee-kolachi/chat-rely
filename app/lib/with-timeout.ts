/** Rejects with {@link PromiseTimeoutError} if `promise` does not settle within `ms` milliseconds. */
export class PromiseTimeoutError extends Error {
  readonly ms: number;

  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms`);
    this.name = "PromiseTimeoutError";
    this.ms = ms;
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new PromiseTimeoutError(ms)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
