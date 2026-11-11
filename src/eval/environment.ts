/**
 * What a results file records about where it was produced: enough to say
 * which browser, operating system and class of hardware ran the model, and
 * nothing that names the machine or the person using it.
 */
export interface Environment {
  userAgent: string;
  /** From User-Agent Client Hints, where the browser offers them. */
  platform: string | null;
  platformVersion: string | null;
  architecture: string | null;
  browser: string | null;
  logicalCores: number | null;
  /** Approximate, as the browser reports it (capped at 8). */
  deviceMemoryGb: number | null;
  /** The graphics adapter the browser reports; the on-device model runs on it. */
  gpu: string | null;
}

interface UaData {
  getHighEntropyValues(hints: string[]): Promise<{
    platform?: string;
    platformVersion?: string;
    architecture?: string;
    fullVersionList?: { brand: string; version: string }[];
  }>;
}

function gpuName(): string | null {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    if (!gl || !info) return null;
    const name: unknown = gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
    return typeof name === 'string' ? name : null;
  } catch {
    return null;
  }
}

export async function describeEnvironment(): Promise<Environment> {
  const nav = navigator as Navigator & { userAgentData?: UaData; deviceMemory?: number };
  const environment: Environment = {
    userAgent: nav.userAgent,
    platform: null,
    platformVersion: null,
    architecture: null,
    browser: null,
    logicalCores: nav.hardwareConcurrency ?? null,
    deviceMemoryGb: nav.deviceMemory ?? null,
    gpu: gpuName(),
  };
  try {
    const hints = await nav.userAgentData?.getHighEntropyValues(['platform', 'platformVersion', 'architecture', 'fullVersionList']);
    if (hints) {
      environment.platform = hints.platform ?? null;
      environment.platformVersion = hints.platformVersion ?? null;
      environment.architecture = hints.architecture ?? null;
      const brand = hints.fullVersionList?.find((b) => !/not.?a.?brand/i.test(b.brand) && b.brand !== 'Chromium') ?? hints.fullVersionList?.[0];
      environment.browser = brand ? `${brand.brand} ${brand.version}` : null;
    }
  } catch {
    // Client Hints are optional; the user-agent string is still recorded.
  }
  return environment;
}
