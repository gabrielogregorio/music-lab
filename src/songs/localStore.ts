/**
 * Leitura/escrita de JSON em localStorage, tolerante a ambiente sem storage
 * (SSR/testes) e a quota estourada. Base compartilhada da biblioteca de músicas
 * e das preferências dos módulos - o app é 100% client-side.
 */
export function loadJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota/privacidade - ignora */
  }
}
