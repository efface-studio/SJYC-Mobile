/** @param {readonly string[]} changes */
export function formatReleaseNotes(changes) {
  return changes
    .flatMap((change) => change.split(/\r?\n/))
    .map((line) => line.trim().replace(/^[-*•](?:\s+|$)/, '').trim())
    .filter(Boolean)
    .map((line) => `- ${line}`)
    .join('\n');
}
