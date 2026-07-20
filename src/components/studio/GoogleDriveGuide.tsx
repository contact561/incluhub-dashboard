export function GoogleDriveGuide() {
  return <details className="rounded-[var(--radius-control)] border border-border-default bg-surface-card">
    <summary className="cursor-pointer px-3 py-3 text-sm font-medium text-text-primary">How to prepare your Google Drive link</summary>
    <ol className="list-decimal space-y-2 border-t border-border-default px-8 py-4 text-sm text-text-muted">
      <li>Create a clearly named Google Drive folder for this portfolio.</li>
      <li>Upload your final portfolio files into that folder.</li>
      <li>Select the folder and choose <strong className="text-text-primary">Share</strong>.</li>
      <li>Under General access, choose <strong className="text-text-primary">Anyone with the link</strong>.</li>
      <li>Keep the permission set to <strong className="text-text-primary">Viewer</strong>.</li>
      <li>Select <strong className="text-text-primary">Copy link</strong>.</li>
      <li>Open an incognito/private browser window and test the copied link.</li>
      <li>Paste the working link below and submit.</li>
    </ol>
    <p className="border-t border-border-default px-3 py-3 text-xs text-text-subtle">IncluHub validates the Google Drive URL format but cannot inspect Google sharing permissions. Testing in a private window prevents inaccessible submissions.</p>
  </details>;
}

