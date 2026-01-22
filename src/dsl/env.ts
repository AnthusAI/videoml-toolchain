export type EnvOverrides<T> = Partial<Record<string, T>>;

export type EnvResolver = {
  names: string[];
  fallback: string[];
  value: <T>(defaultValue: T, overrides?: EnvOverrides<T>) => T;
};

/**
 * Define environment helpers for `.babulus.ts` files.
 *
 * `value(default, overrides)` returns the override for `BABULUS_ENV` if present;
 * otherwise it returns `default`. Provide `fallback` if you want to reuse values
 * from other environments explicitly.
 */
export function defineEnv(opts?: { names?: string[]; fallback?: string[] }): EnvResolver {
  const names = opts?.names ?? ["development", "aws", "azure", "production", "static"];
  const fallback = opts?.fallback ?? [];

  const resolveValue = <T>(defaultValue: T, overrides?: EnvOverrides<T>): T => {
    const env = process.env.BABULUS_ENV || "development";
    if (overrides && env in overrides) {
      return overrides[env] as T;
    }
    if (overrides && fallback.length > 0) {
      for (const name of fallback) {
        if (name in overrides) {
          return overrides[name] as T;
        }
      }
    }
    return defaultValue;
  };

  return {
    names,
    fallback,
    value: resolveValue,
  };
}
