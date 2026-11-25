export function sessionAccess(expiresAt: string | undefined, knownGuest: boolean, failed: boolean, now: number) {
  if (expiresAt && Date.parse(expiresAt) > now) return 'signed-in';
  if (failed) return 'error';
  if (knownGuest) return 'guest';
  return 'checking';
}
