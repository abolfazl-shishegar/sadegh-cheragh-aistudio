export function normalizeSearch(text: string) {
  return text.toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[۰-۹٠-٩]/g, digit => String(digit.charCodeAt(0) - (digit < '۰' ? 1632 : 1776)))
    .replace(/[\u200c\s]+/g, ' ').trim();
}

export function matchesSearch(text: string, query: string) {
  const normalized = normalizeSearch(text);
  return normalizeSearch(query).split(' ').every(word => normalized.includes(word));
}
