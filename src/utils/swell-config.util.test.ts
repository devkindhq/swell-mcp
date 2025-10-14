import { SwellConfigUtil, swellConfig } from './swell-config.util.js';

describe('SwellConfigUtil', () => {
	let configUtil: SwellConfigUtil;

	beforeEach(() => {
		// Reset environment variables
		delete process.env.SWELL_STORE_ID;
		delete process.env.SWELL_SECRET_KEY;
		delete process.env.SWELL_ENVIRONMENT;
		delete process.env.SWELL_TIMEOUT;

		// Create a fresh instance for testing
		configUtil = SwellConfigUtil.getInstance();
		configUtil.clearCache();
	});

	afterEach(() => {
		configUtil.clearCache();
	});

	describe('loadConfiguration', () => {
		it('should throw error when SWELL_STORE_ID is missing', () => {
			process.env.SWELL_SECRET_KEY = 'test-secret-key';

			expect(() => {
				configUtil.loadConfiguration();
			}).toThrow('SWELL_STORE_ID is required');
		});

		it('should throw error when SWELL_SECRET_KEY is missing', () => {
			process.env.SWELL_STORE_ID = 'test-store';

			expect(() => {
				configUtil.loadConfiguration();
			}).toThrow('SWELL_SECRET_KEY is required');
		});

		it('should load configuration with default values', () => {
			process.env.SWELL_STORE_ID = 'test-store';
			process.env.SWELL_SECRET_KEY = 'test-secret-key';

			const config = configUtil.loadConfiguration();

			expect(config).toEqual({
				storeId: 'test-store',
				secretKey: 'test-secret-key',
				environment: 'production',
				timeout: 30000,
				retries: 0,
				maxSockets: 100,
				keepAliveMs: 1000,
				recycleAfterRequests: 1000,
				recycleAfterMs: 15000,
			});
		});

		it('should load configuration with custom values', () => {
			process.env.SWELL_STORE_ID = 'test-store';
			process.env.SWELL_SECRET_KEY = 'test-secret-key';
			process.env.SWELL_ENVIRONMENT = 'sandbox';
			process.env.SWELL_TIMEOUT = '60000';
			process.env.SWELL_RETRIES = '3';

			const config = configUtil.loadConfiguration();

			expect(config.environment).toBe('sandbox');
			expect(config.timeout).toBe(60000);
			expect(config.retries).toBe(3);
		});

		it('should cache configuration after first load', () => {
			process.env.SWELL_STORE_ID = 'test-store';
			process.env.SWELL_SECRET_KEY = 'test-secret-key';

			const config1 = configUtil.loadConfiguration();
			const config2 = configUtil.getConfiguration();

			expect(config1).toBe(config2);
		});
	});

	describe('validateConfiguration', () => {
		it('should validate valid configuration', () => {
			const config = {
				storeId: 'test-store',
				secretKey: 'test-secret-key',
				environment: 'production' as const,
				timeout: 30000,
				retries: 0,
				maxSockets: 100,
				keepAliveMs: 1000,
				recycleAfterRequests: 1000,
				recycleAfterMs: 15000,
			};

			const result = configUtil.validateConfiguration(config);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect invalid store ID', () => {
			const config = {
				storeId: 'ab', // Too short
				secretKey: 'test-secret-key',
				environment: 'production' as const,
				timeout: 30000,
				retries: 0,
				maxSockets: 100,
				keepAliveMs: 1000,
				recycleAfterRequests: 1000,
				recycleAfterMs: 15000,
			};

			const result = configUtil.validateConfiguration(config);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				'Store ID must be at least 3 characters long',
			);
		});

		it('should detect invalid secret key', () => {
			const config = {
				storeId: 'test-store',
				secretKey: 'short', // Too short
				environment: 'production' as const,
				timeout: 30000,
				retries: 0,
				maxSockets: 100,
				keepAliveMs: 1000,
				recycleAfterRequests: 1000,
				recycleAfterMs: 15000,
			};

			const result = configUtil.validateConfiguration(config);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				'Secret key must be at least 10 characters long',
			);
		});

		it('should detect invalid environment', () => {
			const config = {
				storeId: 'test-store',
				secretKey: 'test-secret-key',
				environment: 'invalid' as any,
				timeout: 30000,
				retries: 0,
				maxSockets: 100,
				keepAliveMs: 1000,
				recycleAfterRequests: 1000,
				recycleAfterMs: 15000,
			};

			const result = configUtil.validateConfiguration(config);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				'Environment must be either "sandbox" or "production"',
			);
		});

		it('should generate warnings for extreme values', () => {
			const config = {
				storeId: 'test-store',
				secretKey: 'test-secret-key',
				environment: 'production' as const,
				timeout: 500, // Very low
				retries: 10, // Very high
				maxSockets: 1000, // Very high
				keepAliveMs: 1000,
				recycleAfterRequests: 50, // Very low
				recycleAfterMs: 1000, // Very low
			};

			const result = configUtil.validateConfiguration(config);

			expect(result.isValid).toBe(true);
			expect(result.warnings.length).toBeGreaterThan(0);
		});
	});

	describe('getDisplayConfiguration', () => {
		it('should return null when no configuration is loaded', () => {
			const display = configUtil.getDisplayConfiguration();
			expect(display).toBeNull();
		});

		it('should mask store ID in display configuration', () => {
			process.env.SWELL_STORE_ID = 'test-store-id';
			process.env.SWELL_SECRET_KEY = 'test-secret-key';

			configUtil.loadConfiguration();
			const display = configUtil.getDisplayConfiguration();

			expect(display?.storeId).toBe('test***');
			expect(display).not.toHaveProperty('secretKey');
		});
	});

	describe('getApiUrl', () => {
		it('should return Swell API URL', () => {
			const url = configUtil.getApiUrl();
			expect(url).toBe('https://api.swell.store');
		});
	});

	describe('singleton behavior', () => {
		it('should return the same instance', () => {
			const instance1 = SwellConfigUtil.getInstance();
			const instance2 = SwellConfigUtil.getInstance();
			expect(instance1).toBe(instance2);
		});

		it('should use the exported singleton', () => {
			const instance = SwellConfigUtil.getInstance();
			expect(swellConfig).toBe(instance);
		});
	});
});
