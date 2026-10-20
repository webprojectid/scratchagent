/** These paths are never product assets, including accidentally copied files. */
export function isPrivateArtifact(pathname: string): boolean {
  let path: string;
  try { path = decodeURIComponent(pathname).replace(/\\/g, "/"); }
  catch { return true; }
  const segments = path.split("/").filter(Boolean);
  return segments.some(segment =>
    /^(?:\.env(?:\..*)?|\.git|\.svn|\.aws|\.codex|\.agents|\.vercel|\.scratch-data|\.roninvibe-data|\.tmp-[^/]*|node_modules|artifacts|backups?)$/i.test(segment) ||
    /^(?:AGENTS|CLAUDE|GEMINI)\.md$/i.test(segment) ||
    /\.(?:sql|sqlite3?|db|pem|key|bak|old|orig|log|har)$/i.test(segment)
  ) || /^\/docs\/(?:security|archive)(?:\/|$)/i.test(path) ||
    /^\/docs\/(?:PROJECT-HANDOFF|ACCOUNT-DEVELOPER-TODOS)\.md$/i.test(path);
}

export function isPrivateResponse(pathname: string): boolean {
  return /^\/(?:api|project|profile|admin|developer|developer-settings|settings|dashboard)(?:\/|$)/.test(pathname);
}
