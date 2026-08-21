/**
 * Hebrew text normalization and smart category alias matching
 */

// Common culinary aliases and spelling variations for Hebrew categories
export const CATEGORY_ALIASES: Record<string, string[]> = {
  'אסייתי': [
    'אסייתי',
    'אסיאתי',
    'אסייאתי',
    'אסיתי',
    'אסיה',
    'תאילנדי',
    'תאילנדית',
    'תאילנד',
    'סיני',
    'סינית',
    'יפני',
    'יפנית',
    'מוקפץ',
    'מוקפצים',
    'נודלס',
    'סושי',
    'ווק',
    'קארי',
    'סויה',
    'פאד תאי',
  ],
  'איטלקי': [
    'איטלקי',
    'איטלקית',
    'איטליה',
    'פסטה',
    'פיצה',
    'ריזוטו',
    'לזניה',
    'רביולי',
    'ניוקי',
    'גנוקי',
    'פרמזן',
    'בולונז',
    'קרבונרה',
  ],
  'עוגות וקינוחים': [
    'קינוח',
    'קינוחים',
    'עוגה',
    'עוגות',
    'עוגיות',
    'עוגיה',
    'מתוק',
    'מתוקים',
    'אפייה',
    'שוקולד',
    'גלידה',
    'מוס',
    'פאי',
    'טארט',
    'קרם',
    'מאפינס',
    'בראוניז',
  ],
  'עיקריות ובשר': [
    'בשר',
    'בשרי',
    'בשרים',
    'עוף',
    'פרגית',
    'פרגיות',
    'בקר',
    'שווארמה',
    'קציצות',
    'קציצה',
    'שניצל',
    'צלי',
    'סטייק',
    'עיקרית',
    'עיקריות',
    'מנה עיקרית',
    'דג',
    'דגים',
    'סלמון',
    'טונה',
  ],
  'מרקים': [
    'מרק',
    'מרקים',
    'קדירה',
    'נזיד',
    'מרק עוף',
    'מרק ירקות',
    'מרק בצל',
    'ראמן',
  ],
  'סלטים': [
    'סלט',
    'סלטים',
    'ירקות',
    'ויניגרט',
    'סלט ירוק',
    'סלט ירקות',
    'סלט כרוב',
    'טחינה',
  ],
  'מאפים ולחמים': [
    'לחם',
    'לחמים',
    'חלה',
    'חלות',
    'מאפה',
    'מאפים',
    'פוקאצה',
    'פוקאצ׳ה',
    'בצק',
    'בורקס',
    'לחמניות',
    'לחמניה',
    'בגט',
    'פיתה',
    'פיתות',
    'קרקרים',
  ],
  'צמחוני / טבעוני': [
    'צמחוני',
    'צמחונית',
    'צמחונים',
    'טבעוני',
    'טבעונית',
    'טבעונים',
    'ללא בשר',
    'טופו',
    'קטניות',
    'עדשים',
    'גרגירי חומוס',
  ],
};

/**
 * Normalizes Hebrew text for comparison:
 * - Removes Hebrew nikud (vowels)
 * - Normalizes double vowels (יי -> י, וו -> ו)
 * - Normalizes alef/hey variations
 * - Normalizes final letters (ך, ם, ן, ף, ץ -> כ, מ, נ, פ, צ)
 * - Trims and lowercases
 */
export function normalizeHebrew(text: string): string {
  if (!text) return '';

  return text
    // Remove Hebrew Nikud (vowel points unicode range \u0591-\u05C7)
    .replace(/[\u0591-\u05C7]/g, '')
    // Normalize punctuation/quotes (gershayim, geresh, quotes)
    .replace(/["'״׳`]/g, '')
    // Replace multiple 'י' with single 'י'
    .replace(/י+/g, 'י')
    // Replace multiple 'ו' with single 'ו'
    .replace(/ו+/g, 'ו')
    // Normalize final letters to regular letters for lenient matching
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
    .trim()
    .toLowerCase();
}

/**
 * Calculates Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[bn][an];
}

/**
 * Determines if query matches any category via name, normalized similarity, or aliases
 */
export function findMatchingCategoryIds(
  searchQuery: string,
  categories: { id: string; name: string }[]
): string[] {
  if (!searchQuery || !searchQuery.trim()) return [];

  const rawQuery = searchQuery.trim().toLowerCase();
  const normalizedQuery = normalizeHebrew(rawQuery);
  const matchedIds = new Set<string>();

  for (const cat of categories) {
    const rawCatName = cat.name.toLowerCase();
    const normalizedCatName = normalizeHebrew(cat.name);

    // 1. Direct or substring match
    if (
      rawCatName.includes(rawQuery) ||
      rawQuery.includes(rawCatName) ||
      normalizedCatName.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedCatName)
    ) {
      matchedIds.add(cat.id);
      continue;
    }

    // 2. Fuzzy match (Levenshtein distance <= 1 for short words, <= 2 for longer)
    const maxDistance = normalizedCatName.length > 5 ? 2 : 1;
    if (levenshteinDistance(normalizedQuery, normalizedCatName) <= maxDistance) {
      matchedIds.add(cat.id);
      continue;
    }

    // 3. Category Aliases and Keyword dictionary match
    // Check if category name matches any alias dictionary key
    for (const [dictKey, aliases] of Object.entries(CATEGORY_ALIASES)) {
      const isMatchingCat =
        cat.name.includes(dictKey) ||
        dictKey.includes(cat.name) ||
        normalizeHebrew(cat.name) === normalizeHebrew(dictKey);

      if (isMatchingCat) {
        // Check if query matches any alias in this category's alias list
        for (const alias of aliases) {
          const normAlias = normalizeHebrew(alias);
          if (
            normalizedQuery === normAlias ||
            normalizedQuery.includes(normAlias) ||
            normAlias.includes(normalizedQuery) ||
            levenshteinDistance(normalizedQuery, normAlias) <= (normAlias.length > 4 ? 1 : 0)
          ) {
            matchedIds.add(cat.id);
            break;
          }
        }
      }
    }
  }

  return Array.from(matchedIds);
}
