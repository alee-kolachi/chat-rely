"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Wraps an async action so only one invocation runs at a time (ignores duplicate clicks).
 */
export function useGuardedSubmit<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<void>
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const inFlight = useRef(false);

  const submit = useCallback(
    async (...args: TArgs) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setPending(true);
      setError(null);
      try {
        await fn(...args);
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [fn]
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { submit, pending, error, reset };
}
