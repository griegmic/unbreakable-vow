function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function validateTwilioSignature(
  authToken: string,
  url: string,
  params: URLSearchParams,
  signature: string | null,
): Promise<boolean> {
  if (!signature) return false;
  const sortedKeys = Array.from(new Set(Array.from(params.keys()))).sort();
  let payload = url;
  for (const key of sortedKeys) {
    const values = params.getAll(key);
    for (const value of values) payload += `${key}${value}`;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bytesToBase64(new Uint8Array(digest)) === signature;
}
