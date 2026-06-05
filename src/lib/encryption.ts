import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const saltLength = 16;
const tagLength = 16;

// Dedicated key for credential encryption, falling back to JWT_SECRET so a
// single configured secret still works in simple deployments.
function getSecret(): string {
	return (
		process.env.CREDENTIALS_ENCRYPTION_KEY ||
		process.env.JWT_SECRET ||
		'default-secret'
	);
}

export function encryptCredentials(data: Record<string, any>): string {
	const salt = crypto.randomBytes(saltLength);
	const key = crypto.pbkdf2Sync(getSecret(), salt, 100000, 32, 'sha256');

	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(algorithm, key, iv);

	const json = JSON.stringify(data);
	const encrypted = Buffer.concat([
		cipher.update(json, 'utf8'),
		cipher.final(),
	]);

	const tag = cipher.getAuthTag();

	// Combine salt + iv + tag + encrypted
	const combined = Buffer.concat([salt, iv, tag, encrypted]);
	return combined.toString('hex');
}

export function decryptCredentials(encrypted: string): Record<string, any> {
	const combined = Buffer.from(encrypted, 'hex');

	const salt = combined.subarray(0, saltLength);
	const iv = combined.subarray(saltLength, saltLength + 12);
	const tag = combined.subarray(saltLength + 12, saltLength + 12 + tagLength);
	const encryptedData = combined.subarray(saltLength + 12 + tagLength);

	const key = crypto.pbkdf2Sync(getSecret(), salt, 100000, 32, 'sha256');

	const decipher = crypto.createDecipheriv(algorithm, key, iv);
	decipher.setAuthTag(tag);

	const decrypted = Buffer.concat([
		decipher.update(encryptedData),
		decipher.final(),
	]);

	return JSON.parse(decrypted.toString('utf8'));
}

export function generateApiKey(): string {
	return crypto.randomBytes(32).toString('hex');
}

export function hashApiKey(key: string): string {
	return crypto.createHash('sha256').update(key).digest('hex');
}
