import { z } from 'zod';
import { Logger } from '../utils/logger.util.js';
import { swellClient } from '../utils/swell-client.util.js';
import { config } from '../utils/config.util.js';
import {
	createApiError,
	createUnexpectedError,
	McpError,
} from '../utils/error.util.js';
import {
	SwellProduct,
	SwellProductSchema,
	SwellProductsList,
	SwellProductsListSchema,
	ProductListOptions,
	ProductSearchOptions,
	ProductGetOptions,
	InventoryCheckOptions,
} from './swell.products.types.js';

// Create a contextualized logger for this file
const serviceLogger = Logger.forContext('services/swell.products.service.ts');

// Log service initialization
serviceLogger.debug('Swell Products service initialized');

/**
 * @namespace SwellProductsService
 * @description Service layer for interacting with Swell Products API.
 *              Handles product listing, retrieval, search, and inventory operations.
 */

/**
 * @function list
 * @description Fetches a paginated list of products from Swell with optional filtering.
 * @memberof SwellProductsService
 * @param {ProductListOptions} [options={}] - Optional filtering and pagination options
 * @returns {Promise<SwellProductsList>} A promise that resolves to the products list with pagination info
 * @throws {McpError} Throws an `McpError` if the API call fails or response validation fails
 * @example
 * // Get first 10 active products
 * const products = await list({ active: true, limit: 10 });
 * // Get products in a specific category
 * const categoryProducts = await list({ category: 'electronics', page: 2 });
 */
async function list(
	options: ProductListOptions = {},
): Promise<SwellProductsList> {
	const methodLogger = serviceLogger.forMethod('list');
	methodLogger.debug('Fetching products list', options);

	try {
		// Ensure client is initialized
		if (!swellClient.isClientInitialized()) {
			swellClient.initWithAutoConfig();
		}

		const client = swellClient.getClient();

		// Build query parameters
		const queryParams: Record<string, unknown> = {};

		if (options.page !== undefined) {
			queryParams.page = options.page;
		}
		if (options.limit !== undefined) {
			queryParams.limit = options.limit;
		}
		if (options.active !== undefined) {
			queryParams.active = options.active;
		}
		if (options.category) {
			queryParams.category = options.category;
		}
		if (options.tags && options.tags.length > 0) {
			queryParams.tags = options.tags.join(',');
		}
		if (options.search) {
			queryParams.search = options.search;
		}
		if (options.sort) {
			queryParams.sort = options.sort;
		}
		if (options.where) {
			queryParams.where = options.where;
		}
		if (options.expand && options.expand.length > 0) {
			queryParams.expand = options.expand.join(',');
		}

		// Make the API call
		const rawData = await client.get<unknown>('/products', queryParams);

		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		if (isDebugMode) {
			methodLogger.debug(
				'Debug mode enabled - returning raw data without validation',
			);
			return rawData as SwellProductsList;
		}

		// Validate response with Zod schema
		const validatedData = SwellProductsListSchema.parse(rawData);

		methodLogger.debug(
			`Successfully fetched ${validatedData.results.length} products`,
			{
				count: validatedData.count,
				page: validatedData.page,
				pages: validatedData.pages,
			},
		);

		return validatedData;
	} catch (error) {
		methodLogger.error('Service error fetching products list', error);

		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			throw createApiError(
				`Products list response validation failed: ${error.issues
					.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
					.join(', ')}`,
				500,
				error,
			);
		}

		// Rethrow other McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap any other unexpected errors
		throw createUnexpectedError(
			'Unexpected service error while fetching products list',
			error,
		);
	}
}

/**
 * @function get
 * @description Fetches detailed information for a specific product by ID.
 * @memberof SwellProductsService
 * @param {string} productId - The ID of the product to retrieve
 * @param {ProductGetOptions} [options={}] - Optional retrieval options
 * @returns {Promise<SwellProduct>} A promise that resolves to the product details
 * @throws {McpError} Throws an `McpError` if the product is not found or API call fails
 * @example
 * // Get basic product details
 * const product = await get('product-id-123');
 * // Get product with expanded relationships
 * const productWithVariants = await get('product-id-123', { expand: ['variants', 'categories'] });
 */
async function get(
	productId: string,
	options: ProductGetOptions = {},
): Promise<SwellProduct> {
	const methodLogger = serviceLogger.forMethod('get');
	methodLogger.debug(
		`Fetching product details for ID: ${productId}`,
		options,
	);

	if (!productId || productId.trim().length === 0) {
		throw createApiError('Product ID is required', 400);
	}

	try {
		// Ensure client is initialized
		if (!swellClient.isClientInitialized()) {
			swellClient.initWithAutoConfig();
		}

		const client = swellClient.getClient();

		// Build query parameters
		const queryParams: Record<string, unknown> = {};
		if (options.expand && options.expand.length > 0) {
			queryParams.expand = options.expand.join(',');
		}

		// Make the API call
		const rawData = await client.get<unknown>(
			`/products/${productId}`,
			queryParams,
		);

		// Handle null response (product not found)
		if (!rawData) {
			throw createApiError(`Product not found: ${productId}`, 404);
		}

		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		if (isDebugMode) {
			methodLogger.debug(
				'Debug mode enabled - returning raw data without validation',
			);
			return rawData as SwellProduct;
		}

		// Validate response with Zod schema
		const validatedData = SwellProductSchema.parse(rawData);

		methodLogger.debug(
			`Successfully fetched product: ${validatedData.name}`,
		);

		return validatedData;
	} catch (error) {
		methodLogger.error(
			`Service error fetching product ${productId}`,
			error,
		);

		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			throw createApiError(
				`Product response validation failed: ${error.issues
					.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
					.join(', ')}`,
				500,
				error,
			);
		}

		// Rethrow other McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap any other unexpected errors
		throw createUnexpectedError(
			`Unexpected service error while fetching product ${productId}`,
			error,
		);
	}
}

/**
 * @function search
 * @description Searches for products using various criteria.
 * @memberof SwellProductsService
 * @param {ProductSearchOptions} options - Search options including query and filters
 * @returns {Promise<SwellProductsList>} A promise that resolves to the search results
 * @throws {McpError} Throws an `McpError` if the search fails or response validation fails
 * @example
 * // Search for products by name
 * const results = await search({ query: 'laptop', limit: 20 });
 * // Search with additional filters
 * const filteredResults = await search({
 *   query: 'shirt',
 *   active: true,
 *   category: 'clothing',
 *   sort: 'price_asc'
 * });
 */
async function search(
	options: ProductSearchOptions,
): Promise<SwellProductsList> {
	const methodLogger = serviceLogger.forMethod('search');
	methodLogger.debug('Searching products', options);

	if (!options.query || options.query.trim().length === 0) {
		throw createApiError('Search query is required', 400);
	}

	try {
		// Use the list function with search parameter
		const searchOptions: ProductListOptions = {
			search: options.query,
			page: options.page,
			limit: options.limit,
			active: options.active,
			category: options.category,
			tags: options.tags,
			sort: options.sort,
			expand: options.expand,
		};

		const results = await list(searchOptions);

		methodLogger.debug(
			`Search completed: found ${results.count} products matching "${options.query}"`,
		);

		return results;
	} catch (error) {
		methodLogger.error(
			`Service error searching products with query "${options.query}"`,
			error,
		);

		// Rethrow McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap any other unexpected errors
		throw createUnexpectedError(
			`Unexpected service error while searching products with query "${options.query}"`,
			error,
		);
	}
}

/**
 * @function checkInventory
 * @description Checks inventory levels for a product and optionally its variants.
 * @memberof SwellProductsService
 * @param {string} productId - The ID of the product to check inventory for
 * @param {InventoryCheckOptions} [options={}] - Optional inventory check options
 * @returns {Promise<SwellProduct>} A promise that resolves to the product with inventory information
 * @throws {McpError} Throws an `McpError` if the product is not found or API call fails
 * @example
 * // Check inventory for a product
 * const inventory = await checkInventory('product-id-123');
 * // Check inventory including variants
 * const fullInventory = await checkInventory('product-id-123', { include_variants: true });
 */
async function checkInventory(
	productId: string,
	options: InventoryCheckOptions = {},
): Promise<SwellProduct> {
	const methodLogger = serviceLogger.forMethod('checkInventory');
	methodLogger.debug(
		`Checking inventory for product ID: ${productId}`,
		options,
	);

	if (!productId || productId.trim().length === 0) {
		throw createApiError('Product ID is required', 400);
	}

	try {
		// Build expand options to include inventory-related data
		const expandOptions: string[] = [];

		if (options.include_variants) {
			expandOptions.push('variants');
		}

		// Get product with inventory information
		const product = await get(productId, { expand: expandOptions });

		methodLogger.debug(
			`Successfully checked inventory for product: ${product.name}`,
			{
				stock_level: product.stock_level,
				stock_status: product.stock_status,
				variants_count: product.variants?.length || 0,
			},
		);

		return product;
	} catch (error) {
		methodLogger.error(
			`Service error checking inventory for product ${productId}`,
			error,
		);

		// Rethrow McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap any other unexpected errors
		throw createUnexpectedError(
			`Unexpected service error while checking inventory for product ${productId}`,
			error,
		);
	}
}

export default {
	list,
	get,
	search,
	checkInventory,
};
