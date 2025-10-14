import { Logger } from './logger.util.js';
import { config } from './config.util.js';
import { createApiError } from './error.util.js';

const logger = Logger.forContext('utils/swell-config.util.ts');

export interface SwellEnvironmentConfig {
	storeId: string;
	secretKey: string;
	environment: 'sandbox' | 'production';
	timeout: number;
	retries: number;
	maxSockets: number;
	keepAliveMs: number;
	recycleAfterRequests: number;
	recycleAfterMs: number;
}

export interface SwellConfigValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
}

class SwellConfigUtil {
	private static instance: SwellConfigUtil;
	private cachedConfig: SwellEnvironmentConfig | null = null;

	private constructor() {
		// Private constructor for singleton pattern
	}

	public static getInstance(): SwellConfigUtil {
		if (!SwellConfigUtil.instance) {
			SwellConfigUtil.instance = new SwellConfigUtil();
		}
		return SwellConfigUtil.instance;
	}

	/**
	 * Load and validate Swell configuration from environment
	 */
	public loadConfiguration(): SwellEnvironmentConfig {
		const methodLogger = logger.forMethod('loadConfiguration');
		methodLogger.debug('Loading Swell configuration...');

		// Load configuration first
		config.load();

		// Get required configuration
		const storeId = config.get('SWELL_STORE_ID');
		const secretKey = config.get('SWELL_SECRET_KEY');

		if (!storeId) {
			throw createApiError(
				'SWELL_STORE_ID is required. Please set it in your environment variables or .env file.',
			);
		}

		if (!secretKey) {
			throw createApiError(
				'SWELL_SECRET_KEY is required. Please set it in your environment variables or .env file.',
			);
		}

		// Get optional configuration with defaults
		const environment = this.parseEnvironment(
			config.get('SWELL_ENVIRONMENT', 'production') || 'production',
		);
		const timeout = this.parseNumber(
			config.get('SWELL_TIMEOUT', '30000') || '30000',
			'SWELL_TIMEOUT',
			1000,
			300000,
		);
		const retries = this.parseNumber(
			config.get('SWELL_RETRIES', '0') || '0',
			'SWELL_RETRIES',
			0,
			10,
		);
		const maxSockets = this.parseNumber(
			config.get('SWELL_MAX_SOCKETS', '100') || '100',
			'SWELL_MAX_SOCKETS',
			1,
			1000,
		);
		const keepAliveMs = this.parseNumber(
			config.get('SWELL_KEEP_ALIVE_MS', '1000') || '1000',
			'SWELL_KEEP_ALIVE_MS',
			100,
			60000,
		);
		const recycleAfterRequests = this.parseNumber(
			config.get('SWELL_RECYCLE_AFTER_REQUESTS', '1000') || '1000',
			'SWELL_RECYCLE_AFTER_REQUESTS',
			1,
			10000,
		);
		const recycleAfterMs = this.parseNumber(
			config.get('SWELL_RECYCLE_AFTER_MS', '15000') || '15000',
			'SWELL_RECYCLE_AFTER_MS',
			1000,
			3600000,
		);

		const swellConfig: SwellEnvironmentConfig = {
			storeId,
			secretKey,
			environment,
			timeout,
			retries,
			maxSockets,
			keepAliveMs,
			recycleAfterRequests,
			recycleAfterMs,
		};

		// Validate the configuration
		const validation = this.validateConfiguration(swellConfig);
		if (!validation.isValid) {
			throw createApiError(
				`Invalid Swell configuration: ${validation.errors.join(', ')}`,
			);
		}

		// Log warnings if any
		if (validation.warnings.length > 0) {
			validation.warnings.forEach((warning) => {
				methodLogger.warn(warning);
			});
		}

		// Cache the configuration
		this.cachedConfig = swellConfig;

		methodLogger.debug('Swell configuration loaded successfully', {
			storeId: this.maskStoreId(swellConfig.storeId),
			environment: swellConfig.environment,
			timeout: swellConfig.timeout,
			retries: swellConfig.retries,
		});

		return swellConfig;
	}

	/**
	 * Get cached configuration or load if not cached
	 */
	public getConfiguration(): SwellEnvironmentConfig {
		if (!this.cachedConfig) {
			return this.loadConfiguration();
		}
		return this.cachedConfig;
	}

	/**
	 * Validate Swell configuration
	 */
	public validateConfiguration(
		config: SwellEnvironmentConfig,
	): SwellConfigValidationResult {
		const methodLogger = logger.forMethod('validateConfiguration');
		const errors: string[] = [];
		const warnings: string[] = [];

		// Validate store ID
		if (!config.storeId || config.storeId.trim().length === 0) {
			errors.push('Store ID cannot be empty');
		} else if (config.storeId.length < 3) {
			errors.push('Store ID must be at least 3 characters long');
		} else if (!/^[a-zA-Z0-9_-]+$/.test(config.storeId)) {
			errors.push(
				'Store ID can only contain alphanumeric characters, hyphens, and underscores',
			);
		}

		// Validate secret key
		if (!config.secretKey || config.secretKey.trim().length === 0) {
			errors.push('Secret key cannot be empty');
		} else if (config.secretKey.length < 10) {
			errors.push('Secret key must be at least 10 characters long');
		}

		// Validate environment
		if (!['sandbox', 'production'].includes(config.environment)) {
			errors.push('Environment must be either "sandbox" or "production"');
		}

		// Validate numeric values
		if (config.timeout < 1000) {
			warnings.push(
				'Timeout is very low (< 1000ms), this may cause connection issues',
			);
		} else if (config.timeout > 300000) {
			warnings.push(
				'Timeout is very high (> 5 minutes), this may cause long waits',
			);
		}

		if (config.retries > 5) {
			warnings.push(
				'High retry count (> 5) may cause long delays on failures',
			);
		}

		if (config.maxSockets < 10) {
			warnings.push(
				'Low max sockets (< 10) may limit concurrent requests',
			);
		} else if (config.maxSockets > 500) {
			warnings.push(
				'Very high max sockets (> 500) may consume excessive resources',
			);
		}

		if (config.recycleAfterRequests < 100) {
			warnings.push(
				'Low recycle threshold (< 100 requests) may cause frequent client recycling',
			);
		}

		if (config.recycleAfterMs < 5000) {
			warnings.push(
				'Low recycle time threshold (< 5 seconds) may cause frequent client recycling',
			);
		}

		// Environment-specific warnings
		if (config.environment === 'sandbox') {
			warnings.push(
				'Using sandbox environment - ensure this is intended for your use case',
			);
		}

		const isValid = errors.length === 0;

		methodLogger.debug('Configuration validation completed', {
			isValid,
			errorCount: errors.length,
			warningCount: warnings.length,
		});

		return {
			isValid,
			errors,
			warnings,
		};
	}

	/**
	 * Get configuration for display (with masked sensitive data)
	 */
	public getDisplayConfiguration(): Partial<SwellEnvironmentConfig> | null {
		if (!this.cachedConfig) {
			return null;
		}

		return {
			storeId: this.maskStoreId(this.cachedConfig.storeId),
			environment: this.cachedConfig.environment,
			timeout: this.cachedConfig.timeout,
			retries: this.cachedConfig.retries,
			maxSockets: this.cachedConfig.maxSockets,
			keepAliveMs: this.cachedConfig.keepAliveMs,
			recycleAfterRequests: this.cachedConfig.recycleAfterRequests,
			recycleAfterMs: this.cachedConfig.recycleAfterMs,
		};
	}

	/**
	 * Check if configuration is loaded and valid
	 */
	public isConfigurationLoaded(): boolean {
		return this.cachedConfig !== null;
	}

	/**
	 * Clear cached configuration (for testing)
	 */
	public clearCache(): void {
		const methodLogger = logger.forMethod('clearCache');
		methodLogger.debug('Clearing configuration cache...');
		this.cachedConfig = null;
	}

	/**
	 * Get environment-specific API URL
	 */
	public getApiUrl(): string {
		// Swell uses the same URL for both environments, but we keep this method
		// for future flexibility and consistency with the design
		return 'https://api.swell.store';
	}

	/**
	 * Create a configuration summary for logging
	 */
	public getConfigurationSummary(): string {
		if (!this.cachedConfig) {
			return 'Configuration not loaded';
		}

		return [
			`Store: ${this.maskStoreId(this.cachedConfig.storeId)}`,
			`Environment: ${this.cachedConfig.environment}`,
			`Timeout: ${this.cachedConfig.timeout}ms`,
			`Retries: ${this.cachedConfig.retries}`,
			`Max Sockets: ${this.cachedConfig.maxSockets}`,
		].join(', ');
	}

	/**
	 * Parse environment string with validation
	 */
	private parseEnvironment(value: string): 'sandbox' | 'production' {
		const normalized = value.toLowerCase().trim();
		if (normalized === 'sandbox' || normalized === 'production') {
			return normalized as 'sandbox' | 'production';
		}

		logger
			.forMethod('parseEnvironment')
			.warn(
				`Invalid environment value "${value}", defaulting to "production"`,
			);
		return 'production';
	}

	/**
	 * Parse and validate numeric configuration values
	 */
	private parseNumber(
		value: string,
		configName: string,
		min: number,
		max: number,
	): number {
		const methodLogger = logger.forMethod('parseNumber');
		const parsed = parseInt(value, 10);

		if (isNaN(parsed)) {
			methodLogger.warn(
				`Invalid numeric value for ${configName}: "${value}", using minimum value ${min}`,
			);
			return min;
		}

		if (parsed < min) {
			methodLogger.warn(
				`Value for ${configName} (${parsed}) is below minimum (${min}), using minimum`,
			);
			return min;
		}

		if (parsed > max) {
			methodLogger.warn(
				`Value for ${configName} (${parsed}) is above maximum (${max}), using maximum`,
			);
			return max;
		}

		return parsed;
	}

	/**
	 * Mask store ID for logging/display
	 */
	private maskStoreId(storeId: string): string {
		if (storeId.length <= 4) {
			return '***';
		}
		return storeId.substring(0, 4) + '***';
	}
}

// Export singleton instance
export const swellConfig = SwellConfigUtil.getInstance();

// Export class for testing
export { SwellConfigUtil };
