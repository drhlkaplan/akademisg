/**
 * Validates a Turkish national ID number (TC Kimlik No).
 * Rules:
 * - Must be exactly 11 digits
 * - First digit cannot be 0
 * - ((d1 + d3 + d5 + d7 + d9) * 7 - (d2 + d4 + d6 + d8)) % 10 === d10
 * - (d1 + d2 + d3 + d4 + d5 + d6 + d7 + d8 + d9 + d10) % 10 === d11
 */
export function validateTcKimlik(tc: string): boolean {
  if (!/^\d{11}$/.test(tc)) return false;
  if (tc[0] === "0") return false;

  const digits = tc.split("").map(Number);

  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];

  const check10 = (oddSum * 7 - evenSum) % 10;
  if (check10 !== digits[9]) return false;

  const sumFirst10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  if (sumFirst10 % 10 !== digits[10]) return false;

  return true;
}
