/**
 * Utility functions for extracting serving numbers from Hebrew strings
 * and dynamically scaling recipe ingredient quantities.
 */

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

const FRACTION_TO_DISPLAY: Array<[number, string]> = [
  [0.25, '¼'],
  [0.5, '½'],
  [0.75, '¾'],
  [1 / 3, '⅓'],
  [2 / 3, '⅔'],
  [0.125, '⅛'],
];

/**
 * Extracts the base serving count from a free-text servings string
 * (e.g. "4-6 מנות", "8 סועדים", "12 יחידות", "תבנית 24").
 * Returns default 4 if no number is found.
 */
export function extractBaseServings(servingsStr?: string | null): number {
  if (!servingsStr || typeof servingsStr !== 'string') return 4;

  const clean = servingsStr.trim();
  if (!clean) return 4;

  // Match range like "4-6" -> return average or first number (e.g. 4)
  const rangeMatch = clean.match(/(\d+)\s*[-–—]\s*(\d+)/);
  if (rangeMatch) {
    const num1 = parseInt(rangeMatch[1], 10);
    const num2 = parseInt(rangeMatch[2], 10);
    if (!isNaN(num1) && !isNaN(num2) && num1 > 0) {
      return num1;
    }
  }

  // Match single number
  const singleMatch = clean.match(/(\d+(?:\.\d+)?)/);
  if (singleMatch) {
    const num = parseFloat(singleMatch[1]);
    if (!isNaN(num) && num > 0) {
      return Math.round(num);
    }
  }

  return 4;
}

/**
 * Formats a scaled numeric quantity nicely into human-readable culinary Hebrew format
 * (e.g. 1.5 -> "1½", 0.25 -> "¼", 2.33 -> "2⅓", 500 -> "500").
 */
export function formatQuantity(num: number): string {
  if (num <= 0) return '0';

  // If very close to an integer
  const roundedInt = Math.round(num);
  if (Math.abs(num - roundedInt) < 0.04) {
    return roundedInt.toString();
  }

  const integerPart = Math.floor(num);
  const remainder = num - integerPart;

  // Check against known fractions
  for (const [fracVal, fracSym] of FRACTION_TO_DISPLAY) {
    if (Math.abs(remainder - fracVal) < 0.05) {
      if (integerPart === 0) {
        return fracSym;
      }
      return `${integerPart}${fracSym}`;
    }
  }

  // Decimal formatting up to 2 decimal places without trailing zeros
  const roundedDec = Math.round(num * 100) / 100;
  return roundedDec.toString();
}

/**
 * Scales a single ingredient string by a multiplier.
 * Handles numbers at the beginning or middle (e.g. "2 כוסות קמח", "1/2 כפית מלח", "500 גרם בשר").
 */
export function scaleIngredient(ingredient: string, multiplier: number): string {
  if (!ingredient || multiplier === 1 || multiplier <= 0) return ingredient;

  const trimmed = ingredient.trim();

  // Pattern 1: Leading range with dash: "2-3 שיני שום" or "2 - 3 שיני שום"
  const rangeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)(.*)$/);
  if (rangeMatch) {
    const n1 = parseFloat(rangeMatch[1]);
    const n2 = parseFloat(rangeMatch[2]);
    const rest = rangeMatch[3];
    if (!isNaN(n1) && !isNaN(n2)) {
      return `${formatQuantity(n1 * multiplier)}-${formatQuantity(n2 * multiplier)}${rest}`;
    }
  }

  // Pattern 2: Hebrew compound fraction: "1 וחצי כוסות" or "2 ורבע כפות"
  const hebrewCompoundMatch = trimmed.match(/^(\d+)\s+ו(חצי|רבע|שליש)(.*)$/);
  if (hebrewCompoundMatch) {
    const whole = parseInt(hebrewCompoundMatch[1], 10);
    const fracWord = hebrewCompoundMatch[2];
    const rest = hebrewCompoundMatch[3];
    const fracVal = fracWord === 'חצי' ? 0.5 : fracWord === 'רבע' ? 0.25 : 1 / 3;
    const total = (whole + fracVal) * multiplier;
    return `${formatQuantity(total)}${rest}`;
  }

  // Pattern 3: Standalone Hebrew fraction word at start: "חצי כוס שמן", "רבע כפית מלח"
  const hebrewWordMatch = trimmed.match(/^(חצי|רבע|שליש)\s+(.*)$/);
  if (hebrewWordMatch) {
    const fracWord = hebrewWordMatch[1];
    const rest = hebrewWordMatch[2];
    const fracVal = fracWord === 'חצי' ? 0.5 : fracWord === 'רבע' ? 0.25 : 1 / 3;
    const total = fracVal * multiplier;
    return `${formatQuantity(total)} ${rest}`;
  }

  // Pattern 4: Mixed fraction: "1 1/2 כוסות" or "2 1/4 כפות"
  const mixedFracMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)(.*)$/);
  if (mixedFracMatch) {
    const whole = parseInt(mixedFracMatch[1], 10);
    const num = parseInt(mixedFracMatch[2], 10);
    const den = parseInt(mixedFracMatch[3], 10);
    const rest = mixedFracMatch[4];
    if (den > 0) {
      const total = (whole + num / den) * multiplier;
      return `${formatQuantity(total)}${rest}`;
    }
  }

  // Pattern 5: Simple fraction: "1/2 כוס" or "3/4 כפית"
  const simpleFracMatch = trimmed.match(/^(\d+)\/(\d+)(.*)$/);
  if (simpleFracMatch) {
    const num = parseInt(simpleFracMatch[1], 10);
    const den = parseInt(simpleFracMatch[2], 10);
    const rest = simpleFracMatch[3];
    if (den > 0) {
      const total = (num / den) * multiplier;
      return `${formatQuantity(total)}${rest}`;
    }
  }

  // Pattern 6: Unicode fraction with optional preceding number: "½ כוס" or "1½ כוסות"
  const unicodeMatch = trimmed.match(/^(\d+)?\s*([½¼¾⅓⅔⅛⅜⅝⅞])(.*)$/);
  if (unicodeMatch) {
    const whole = unicodeMatch[1] ? parseInt(unicodeMatch[1], 10) : 0;
    const fracChar = unicodeMatch[2];
    const rest = unicodeMatch[3];
    const fracVal = UNICODE_FRACTIONS[fracChar] || 0;
    const total = (whole + fracVal) * multiplier;
    return `${formatQuantity(total)}${rest}`;
  }

  // Pattern 7: Standard number or decimal at start: "2 כוסות", "2.5 ס\"מ", "500 גרם"
  const numberStartMatch = trimmed.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (numberStartMatch) {
    const val = parseFloat(numberStartMatch[1]);
    const rest = numberStartMatch[2];
    if (!isNaN(val)) {
      return `${formatQuantity(val * multiplier)}${rest}`;
    }
  }

  // If no leading quantity found, return original line unchanged (e.g. "מלח ופלפל לפי הטעם")
  return ingredient;
}

/**
 * Scales an entire list of recipe ingredients by a multiplier.
 */
export function scaleIngredientsList(ingredients: string[], multiplier: number): string[] {
  if (!Array.isArray(ingredients) || multiplier === 1 || multiplier <= 0) {
    return ingredients || [];
  }
  return ingredients.map((ing) => scaleIngredient(ing, multiplier));
}
