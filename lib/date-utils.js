/**
 * Simple date formatting utilities.
 */

/**
 * Format date string (YYYY-MM-DD) for display.
 * @param {string | null} dateStr
 * @returns {string}
 */
export function format(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
