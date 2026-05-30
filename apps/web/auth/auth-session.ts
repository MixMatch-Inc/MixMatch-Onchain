export function isSessionExpired(
  expiresAt: string,
): boolean {
  return (
    Date.now() >
    new Date(
      expiresAt,
    ).getTime()
  );
}