const DEFAULT_APP_NAME = "IncluHub Ecosystem";
const DEFAULT_LOGO_PATH = "/brand/incluhub-logo.svg";

export type EcosystemConfig = {
  appName: string;
  appUrl: string | null;
  logoPath: string;
  isPlaceholder: boolean;
};

function safeHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

export function getEcosystemConfig(): EcosystemConfig {
  const configuredName = process.env.NEXT_PUBLIC_ECOSYSTEM_APP_NAME?.trim();
  const configuredUrl = process.env.NEXT_PUBLIC_ECOSYSTEM_APP_URL?.trim();
  const configuredLogo = process.env.NEXT_PUBLIC_ECOSYSTEM_APP_LOGO?.trim();
  const appName = configuredName || DEFAULT_APP_NAME;
  const appUrl = configuredUrl ? safeHttpUrl(configuredUrl) : null;

  return {
    appName,
    appUrl,
    logoPath:
      configuredLogo?.startsWith("/") === true
        ? configuredLogo
        : DEFAULT_LOGO_PATH,
    isPlaceholder:
      !appUrl ||
      configuredUrl?.includes("example.invalid") === true ||
      /placeholder/i.test(appName),
  };
}
