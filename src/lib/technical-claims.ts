/** Deterministic checks for incorrect mechanisms observed in actual generation drafts. */
export function validateTechnicalClaims(text: string): string[] {
  const issues: string[] = [];
  for (const paragraph of text.split(/\n\s*\n/)) {
    if (/\b(?:hold|reservation|slot)\b[^.!?]{0,100}\bexpir\w*\b|\bexpired\b[^.!?]{0,80}\b(?:hold|reservation|slot)\b/i.test(paragraph)
      && /\b(?:the\s+)?payment\s+(?:record\s+)?(?:transitions?|changes?|is\s+(?:marked|set))\s+(?:to\s+)?(?:['"`])?failed\b/i.test(paragraph)
      && !/\b(?:payment\s+(?:actually\s+)?failed|gateway\s+(?:declines?|rejects?)|failed\s+capture)\b/i.test(paragraph)) {
      issues.push("Captured-payment integrity: expiry or reallocation of a booking hold does not make captured funds a failed payment. Preserve the actual successful financial state until refund settlement; fail/cancel the booking separately and describe compensating refund or manual reconciliation.");
    }
    if (/\b(?:unique|uniqueness)\b[^.!?]{0,90}\b(?:prevent\w*|eliminat\w*|guarantee\w*)\b[^.!?]{0,70}\b(?:dependency\s+)?cycles?\b/i.test(paragraph)
      && !/\b(?:not|cannot|doesn't|does not)\b[^.!?]{0,80}\b(?:prevent\w*|eliminat\w*|guarantee\w*)\b/i.test(paragraph)) {
      issues.push("Dependency graph integrity: unique edges prevent duplicate pairs, not cycles. Use graph traversal or a recursive query for cycle rejection.");
    }
    if (/\b(?:signed|presigned)\s+URLs?\b[^.!?]{0,120}\b(?:immediately\s+(?:revok\w*|invalidat\w*)|(?:revok\w*|invalidat\w*)\s+immediately)\b/i.test(paragraph)
      && !/\b(?:not|cannot|can't|doesn't|does not)\b[^.!?]{0,120}\b(?:revok\w*|invalidat\w*)\b/i.test(paragraph)) {
      issues.push("Media entitlement integrity: stopping new signed-URL issuance does not revoke an already issued URL or cached content. State expiry/cache behavior and use a request-time authorization gate when immediate access removal is required.");
    }
  }

  for (const paragraph of text.split(/\n\s*\n/)) {
    const immediate = /\bimmediate(?:ly)?\s+(?:(?:media|content|access)\s+){0,2}revocation\b|\b(?:media|content|access)\s+(?:is\s+)?(?:immediately\s+revok\w*|revok\w*\s+immediately)/i.test(paragraph);
    const issuanceOnly = /\b(?:block|stop|deny)\w*\s+(?:(?:only|subsequent|new|future)\s+)+(?:media\s+)?(?:tokens?|signed[- ]?URLs?)/i.test(paragraph);
    const exposesOrigin = [...paragraph.matchAll(/\bredirect\w*[^.!?]{0,90}\b(?:signed|presigned)[- ]URLs?/gi)].some(match => !/\b(?:not|never|without|no|avoid\w*|rather\s+than|instead\s+of)\b[^.!?]{0,120}$/i.test(paragraph.slice(Math.max(0, match.index! - 140), match.index)));
    const perAssetGate = /\b(?:each|every|all)\s+(?:(?:asset|media|video|segment|playback|content|individual|manifest|and)[/\s-]+){0,6}requests?\b/i.test(paragraph);
    const disclaimsImmediate = /\b(?:cannot|can't|does\s+not|will\s+not)\b[^.!?]{0,70}\bimmediate(?:ly)?\b/i.test(paragraph);
    if (immediate && (exposesOrigin || (issuanceOnly && !perAssetGate)) && !disclaimsImmediate) issues.push("Media entitlement integrity: blocking new token minting and metadata cache headers do not revoke existing direct asset URLs. Require authorization on every media request through a non-bypassable delivery path and state expiry/cache limitations.");
  }
  return [...new Set(issues)];

}


export function validateTaskTechnicalClaims(tasks: { title: string; detail?: { objective: string; acceptanceCriteria: string[]; tests: { action: string; expected: string }[] } }[]): string[] {
  return tasks.flatMap((task, index) => {
    const detail = task.detail;
    if (!detail) return [];
    const text = [task.title, detail.objective, ...detail.acceptanceCriteria, ...detail.tests.map(test => `${test.action} Expected: ${test.expected}`)].join("\n\n");
    return validateTechnicalClaims(text).map(issue => `tasks[${index}]: ${issue}`);
  });
}
