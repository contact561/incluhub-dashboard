/**
 * Safe server-side logging for educator data loaders.
 * Never log tokens, keys, or session data.
 */
export function logEducatorLoaderError(loader: string, message: string): void {
  console.error(`[educator-loader:${loader}] ${message}`);
}

export function educatorLoaderFailure(loader: string, message: string): {
  error: string;
} {
  logEducatorLoaderError(loader, message);
  return { error: message };
}
