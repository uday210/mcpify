// Deterministic secrets for crypto-dependent units under test.
process.env.CREDENTIALS_ENCRYPTION_KEY ||= 'test-credentials-key-please-ignore-0123456789';
process.env.JWT_SECRET ||= 'test-jwt-secret-please-ignore-0123456789';
