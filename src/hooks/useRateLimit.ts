import { useCallback, useRef } from "react";

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  cooldownMs?: number;
}

interface RateLimitState {
  attempts: number[];
  lockedUntil: number | null;
}

/**
 * Client-side rate limiter hook.
 * Tracks attempts in memory and enforces cooldown after max attempts.
 */
export function useRateLimit({ maxAttempts, windowMs, cooldownMs }: RateLimitConfig) {
  const stateRef = useRef<RateLimitState>({ attempts: [], lockedUntil: null });
  const effectiveCooldown = cooldownMs || windowMs;

  const checkLimit = useCallback((): { allowed: boolean; remainingMs: number; attemptsLeft: number } => {
    const now = Date.now();
    const state = stateRef.current;

    // Check if locked
    if (state.lockedUntil && now < state.lockedUntil) {
      return { allowed: false, remainingMs: state.lockedUntil - now, attemptsLeft: 0 };
    }
    if (state.lockedUntil && now >= state.lockedUntil) {
      state.lockedUntil = null;
      state.attempts = [];
    }

    // Clean old attempts
    state.attempts = state.attempts.filter((t) => now - t < windowMs);

    if (state.attempts.length >= maxAttempts) {
      state.lockedUntil = now + effectiveCooldown;
      return { allowed: false, remainingMs: effectiveCooldown, attemptsLeft: 0 };
    }

    return { allowed: true, remainingMs: 0, attemptsLeft: maxAttempts - state.attempts.length };
  }, [maxAttempts, windowMs, effectiveCooldown]);

  const recordAttempt = useCallback(() => {
    stateRef.current.attempts.push(Date.now());
  }, []);

  const reset = useCallback(() => {
    stateRef.current = { attempts: [], lockedUntil: null };
  }, []);

  return { checkLimit, recordAttempt, reset };
}

/**
 * Formats remaining cooldown time for display.
 */
export function formatCooldown(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} saniye`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} dakika`;
}
