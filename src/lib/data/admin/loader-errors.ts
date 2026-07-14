export function logAdminLoaderError(loader: string, message: string): void {
  console.error(`[admin-loader:${loader}] ${message}`);
}
