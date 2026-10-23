/**
 * Where to go after signing in: the page the person came from, but only if it is a page of THIS site. `returnUrl` comes from
 * the address, so anyone can put anything in it; sending a visitor to a foreign address after they typed their password is
 * the classic phishing trick ("open redirect"). Only a path that starts with a single `/` is accepted.
 */
export function safeReturnUrl(value: string | null | undefined, fallback: string): string {
  if (!value || value.length > 2000) return fallback;
  // `//host` and `/\host` are read by browsers as another site.
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  // Control characters and backslashes can hide a scheme or a host from a quick look.
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f || code === 0x5c) return fallback;
  }
  return value;
}
