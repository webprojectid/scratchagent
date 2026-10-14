export function credentialStatus(environment: Record<string, string | undefined>) {
  const secret = environment.AUTH_SECRET?.trim() ?? "";
  const placeholder = /^(?:change[-_ ]|changeme|replace[-_ ]|your[-_ ]|dummy|example|test[-_ ]|generate[-_ ]|openssl)/i.test(secret);
  return {
    authSecret: {
      configured: Boolean(secret),
      meetsBasicChecks: secret.length >= 32 && !placeholder && !/^(.)\1+$/.test(secret),
    },
    database: { configured: Boolean(environment.DATABASE_URL), rotationVerified: false },
    provider: { environmentKeyConfigured: Boolean(environment.LLM_API_KEY) },
  };
}
