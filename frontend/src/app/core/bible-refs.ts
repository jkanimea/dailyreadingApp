export function createBibleRefRegex(): RegExp {
  return /((?:[1-3]\s)?[A-Za-z]+\.?\s+\d+:\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*(?:\s*;\s*(?:(?:[1-3]\s)?[A-Za-z]+\.?\s+)?\d+:\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)*)/g;
}