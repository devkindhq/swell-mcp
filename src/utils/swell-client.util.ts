import { swell } from 'swell-node';
import { Logger } from './logger.util.js';
import { swellConfig, SwellEnvironmentConfig } from './swell-config.util.js';
import { createApiError } from './error.util.js';

const logger = Logger.forContext('utils/swell-client.util.ts');

export interface ClientRecycleStats {
	createdAt: number;
	activeRequests: number;
	totalRequests: number;
	ageMs: number;
	newClientCreatedAt: number;
}

export interface SwellClientWrapper {
	get<T = unknown>(
		url: string,
		options?: Record<string, unknown>,
	): Promise<T>;
	post<T = unknown>(url: string, data: unknown): Promise<T>;
	put<T = unknown>(url: string, data: unknown): Promise<T>;
	delete<T = unknown>(
		url: string,
		options?: Record<string, unknown>,
	): Promise<T>;
	init(
		storeId: string,
		secretKey: string,
		options?: Partial<SwellEnvironmentConfig>,
	): void;
	createClient(
		storeId: string,
		secretKey: string,
		options?: Partial<SwellEnvironmentConfig>,
	): SwellClientWrapper;
	getClientStats(): Record<string, unknown>;
}

class SwellClientUtil {
	private static instance: SwellClientUtil;
	private isInitialized = false;
	private onClientRecycleCallback?: (stats: ClientRecycleStats) => void;

	private constructor() {
		// Private constructor for singleton pattern
	}

	public static getInstance(): SwellClientUtil {
		if (!SwellClientUtil.instance) {
			SwellClientUtil.instance = new SwellClientUtil();
		}
		return SwellClientUtil.instance;
	}

	/**
	 * Initialize the Swell client with configuration
	 */
	public init(
		customConfig?: Partial<SwellEnvironmentConfig>,
		onClientRecycle?: (stats: ClientRecycleStats) => void,
	): void {
		const methodLogger = logger.forMethod('init');
		methodLogger.debug('Initializing Swell client...');

		try {
			// Load and validate configuration
			const config = swellConfig.getConfiguration();

			// Override with custom config if provided
			const finalConfig: SwellEnvironmentConfig = {
				...config,
				...customConfig,
			};

			// Store the callback for client recycling
			this.onClientRecycleCallback = onClientRecycle;

			// Initialize the swell client
			swell.init(finalConfig.storeId, finalConfig.secretKey, {
				url: swellConfig.getApiUrl(),
				timeout: finalConfig.timeout,
				retries: finalConfig.retries,
				maxSockets: finalConfig.maxSockets,
				keepAliveMs: finalConfig.keepAliveMs,
				recycleAfterRequests: finalConfig.recycleAfterRequests,
				recycleAfterMs: finalConfig.recycleAfterMs,
				onClientRecycle: this.handleClientRecycle.bind(this),
			});

			this.isInitialized = true;
			methodLogger.debug(
				'Swell client initialized successfully',
				swellConfig.getDisplayConfiguration(),
			);
		} catch (error) {
			methodLogger.error('Failed to initialize Swell client', error);
			throw error;
		}
	}

	/**
	 * Initialize with automatic configuration loading
	 */
	public initWithAutoConfig(
		onClientRecycle?: (stats: ClientRecycleStats) => void,
	): void {
		const methodLogger = logger.forMethod('initWithAutoConfig');
		methodLogger.debug('Auto-initializing Swell client...');

		// This will automatically load configuration from environment
		this.init(undefined, onClientRecycle);
	}

	/**
	 * Create a new Swell client instance (for multi-store scenarios)
	 */
	public createClient(
		storeId: string,
		secretKey: string,
		options?: Partial<SwellEnvironmentConfig>,
	): SwellClientWrapper {
		const methodLogger = logger.forMethod('createClient');
		methodLogger.debug('Creating new Swell client instance', { storeId });

		try {
			// Get default configuration
			const defaultConfig = swellConfig.getConfiguration();

			// Build client configuration
			const clientConfig: SwellEnvironmentConfig = {
				storeId,
				secretKey,
				environment: options?.environment || defaultConfig.environment,
				timeout: options?.timeout || defaultConfig.timeout,
				retries: options?.retries || defaultConfig.retries,
				maxSockets: options?.maxSockets || defaultConfig.maxSockets,
				keepAliveMs: options?.keepAliveMs || defaultConfig.keepAliveMs,
				recycleAfterRequests:
					options?.recycleAfterRequests ||
					defaultConfig.recycleAfterRequests,
				recycleAfterMs:
					options?.recycleAfterMs || defaultConfig.recycleAfterMs,
			};

			const client = swell.createClient(storeId, secretKey, {
				url: swellConfig.getApiUrl(),
				timeout: clientConfig.timeout,
				retries: clientConfig.retries,
				maxSockets: clientConfig.maxSockets,
				keepAliveMs: clientConfig.keepAliveMs,
				recycleAfterRequests: clientConfig.recycleAfterRequests,
				recycleAfterMs: clientConfig.recycleAfterMs,
				onClientRecycle: this.handleClientRecycle.bind(this),
			});

			methodLogger.debug(
				'New Swell client instance created successfully',
			);
			return client;
		} catch (error) {
			methodLogger.error('Failed to create Swell client instance', error);
			throw createApiError(
				'Failed to create Swell client instance',
				undefined,
				error,
			);
		}
	}

	/**
	 * Test the connection to Swell API
	 */
	public async testConnection(): Promise<boolean> {
		const methodLogger = logger.forMethod('testConnection');
		methodLogger.debug('Testing Swell API connection...');

		if (!this.isInitialized) {
			throw createApiError(
				'Swell client not initialized. Call init() or initWithAutoConfig() first.',
			);
		}

		try {
			// Try to make a simple API call to test the connection
			// We'll try to get store settings which should be accessible with valid credentials
			await swell.get('/settings');

			methodLogger.debug('Swell API connection test successful');
			return true;
		} catch (error) {
			methodLogger.error('Swell API connection test failed', error);

			// Handle specific error cases
			if (error && typeof error === 'object' && 'status' in error) {
				const status = (error as { status: number }).status;
				if (status === 401) {
					throw createApiError(
						'Invalid Swell credentials. Please check your store ID and secret key.',
						401,
					);
				} else if (status === 403) {
					throw createApiError(
						'Insufficient permissions. Please check your Swell API key permissions.',
						403,
					);
				}
			}

			throw createApiError(
				'Failed to connect to Swell API. Please check your configuration and network connection.',
				undefined,
				error,
			);
		}
	}

	/**
	 * Validate the current configuration
	 */
	public validateConfiguration(): void {
		const methodLogger = logger.forMethod('validateConfiguration');
		methodLogger.debug('Validating Swell configuration...');

		// This will load and validate the configuration
		const validation = swellConfig.validateConfiguration(
			swellConfig.getConfiguration(),
		);

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

		methodLogger.debug('Swell configuration validation successful');
	}

	/**
	 * Get the current client configuration (without sensitive data)
	 */
	public getConfiguration(): Partial<SwellEnvironmentConfig> | null {
		return swellConfig.getDisplayConfiguration();
	}

	/**
	 * Get configuration summary for logging
	 */
	public getConfigurationSummary(): string {
		return swellConfig.getConfigurationSummary();
	}

	/**
	 * Get the initialized Swell client instance
	 */
	public getClient(): SwellClientWrapper {
		if (!this.isInitialized) {
			throw createApiError(
				'Swell client not initialized. Call init() or initWithAutoConfig() first.',
			);
		}

		return swell;
	}

	/**
	 * Check if the client is initialized
	 */
	public isClientInitialized(): boolean {
		return this.isInitialized;
	}

	/**
	 * Reset the client (for testing purposes)
	 */
	public reset(): void {
		const methodLogger = logger.forMethod('reset');
		methodLogger.debug('Resetting Swell client...');

		this.isInitialized = false;
		this.onClientRecycleCallback = undefined;
		swellConfig.clearCache();

		methodLogger.debug('Swell client reset successfully');
	}

	/**
	 * Handle client recycling events
	 */
	private handleClientRecycle(stats: ClientRecycleStats): void {
		const methodLogger = logger.forMethod('handleClientRecycle');

		try {
			methodLogger.debug('Swell client recycled', {
				totalRequests: stats.totalRequests,
				ageMs: stats.ageMs,
				activeRequests: stats.activeRequests,
			});

			// Call the user-provided callback if available
			if (this.onClientRecycleCallback) {
				this.onClientRecycleCallback(stats);
			}
		} catch (error) {
			methodLogger.warn('Error in client recycle callback', error);
		}
	}
}

// Export singleton instance
export const swellClient = SwellClientUtil.getInstance();

// Export class for testing
export { SwellClientUtil };
