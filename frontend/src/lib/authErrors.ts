/** User-facing copy for sign-in failures (hide raw DB / stack messages). */
export function formatSignInError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('econnrefused') || lower.includes('connect econnrefused')) {
    return 'Unable to reach the server. Start the API and database, then try again.';
  }
  if (lower.includes('incorrect email or password') || lower.includes('invalid email or password')) {
    return 'Invalid email or password';
  }
  if (lower.includes('unable to reach the server')) {
    return message;
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Unable to reach the server. Check your connection and try again.';
  }
  return message.length > 120 ? 'Unable to sign in. Please try again.' : message;
}
