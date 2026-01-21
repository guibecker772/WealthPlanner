// src/utils/deepEqual.js
export default function deepEqual(a, b) {
  if (a === b) return true;

  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }

  const typeA = typeof a;
  const typeB = typeof b;
  if (typeA !== typeB) return false;

  if (typeA !== "object") return false;

  const isArrayA = Array.isArray(a);
  const isArrayB = Array.isArray(b);
  if (isArrayA !== isArrayB) return false;

  if (isArrayA) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}
