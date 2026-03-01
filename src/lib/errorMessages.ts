// All user-facing error strings — plain English, no tech jargon

export function getAuthErrorMessage(error: string | { message?: string; code?: string }): string {
  const msg = typeof error === 'string' ? error : error?.message || '';
  const code = typeof error === 'string' ? '' : error?.code || '';

  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
    return 'Your email or password is incorrect. Please try again.';
  if (msg.includes('Email not confirmed'))
    return 'Please check your email and confirm your account before signing in.';
  if (msg.includes('User already registered') || msg.includes('already been registered'))
    return 'That email is already in use. Try logging in instead.';
  if (msg.includes('too many requests') || msg.includes('rate_limit') || code === 'over_request_rate_limit')
    return 'Too many attempts. Please wait a few minutes and try again.';
  if (msg.includes('Password should be at least'))
    return 'Your password needs to be at least 6 characters.';
  if (msg.includes('session_not_found') || msg.includes('JWT expired'))
    return 'Your session has expired. Please log in again.';
  if (msg.includes('not authorized') || msg.includes('permission'))
    return "You don't have permission to do that.";
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch'))
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  if (msg.includes('CORS') || msg.includes('blocked'))
    return 'Connection blocked. Please try again or contact support.';

  return 'Something went wrong. Please try again or contact support.';

export function getGeneralErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError'))
      return 'Connection issue. Please check your internet and try again.';
    if (msg.includes('row-level security'))
      return "You don't have permission to perform this action.";
  }
  return 'Something went wrong. Please try again.';
}
