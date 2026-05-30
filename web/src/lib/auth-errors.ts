const DEFAULT_OTP_SEND_ERROR = 'We could not text that code. Try Google sign-in, or wait a minute and try again.';

export function getOtpSendErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : String(error ?? '');
  const lower = message.toLowerCase();

  if (lower.includes('rate')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }

  if (
    lower.includes('twilio') ||
    lower.includes('unverified') ||
    lower.includes('trial account') ||
    lower.includes('21608') ||
    lower.includes('confirmation otp to provider')
  ) {
    return DEFAULT_OTP_SEND_ERROR;
  }

  if (lower.includes('invalid') && lower.includes('phone')) {
    return 'Please enter a valid 10-digit phone number.';
  }

  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network issue sending the code. Check your connection and try again.';
  }

  return DEFAULT_OTP_SEND_ERROR;
}
