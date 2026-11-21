export function friendlyCloudError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? ''
  const raw = (error as Error)?.message ?? 'The cloud request failed.'
  if (code === 'permission-denied' || /insufficient permissions/i.test(raw)) {
    return 'Cloud permission was denied. Deploy the Firestore rules so each account can only access its own records.'
  }
  if (/Cloud Firestore API has not been used|it is disabled/i.test(raw)) {
    return 'Cloud Firestore is not enabled for this Firebase project yet. Enable it in the Firebase console, then reload.'
  }
  if (code === 'unavailable' || /offline|network|failed to get document/i.test(raw)) {
    return 'Cloud sync is offline. Changes are kept in this browser and can be retried later.'
  }
  if (code === 'failed-precondition') {
    return 'Cloud Firestore needs an index or database setup before this record can be read.'
  }
  if (/database.*not.*found|does not exist/i.test(raw)) {
    return 'The Firestore database does not exist yet. Create the default database in the Firebase console.'
  }
  return raw.replace(/^Firebase:\s*/i, '').replace(/\.\s*\(.*\)$/, '.')
}

export function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              'Cloud sync timed out. Firestore may be disabled, unreachable, or waiting for a network connection.',
            ),
          ),
        ms,
      ),
    ),
  ])
}
