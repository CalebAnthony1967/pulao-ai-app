import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId: appId || "pulao-ai-app",
  token,
  functionsVersion,
  serverUrl: '',
  appBaseUrl: appBaseUrl || window.location.origin
});

// Suppress unhandled analytics tracking failures in preview environment
if (base44?.analytics) {
  try {
    base44.analytics.track = () => Promise.resolve();
  } catch {}
}
