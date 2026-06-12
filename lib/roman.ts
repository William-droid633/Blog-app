/**
 * Convertit un nombre en chiffres romains : 4 → "IV", 2026 → "MMXXVI".
 */
export function toRoman(num: number): string {
  const table: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let remaining = Math.max(0, Math.floor(num));
  let result = "";
  for (const [value, symbol] of table) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result || "N";
}
