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
	StockCheckOptions,
	ProductUpdateOptions,
	ProductUpdateOptionsSchema,
	StockUpdateOptions,
	StockUpdateOptionsSchema,
	PricingUpdateOptions,
	PricingUpdateOptionsSchema,
	UpdateResult,
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
			queryParams.expand = options.expand;
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
 * @function checkStock
 * @description Checks stock levels for a product and optionally its variants.
 * @memberof SwellProductsService
 * @param {string} productId - The ID of the product to check stock for
 * @param {StockCheckOptions} [options={}] - Optional stock check options
 * @returns {Promise<SwellProduct>} A promise that resolves to the product with stock information
 * @throws {McpError} Throws an `McpError` if the product is not found or API call fails
 * @example
 * // Check stock for a product
 * const stock = await checkStock('product-id-123');
 * // Check stock including variants
 * const fullStock = await checkStock('product-id-123', { include_variants: true });
 */
async function checkStock(
	productId: string,
	options: StockCheckOptions = {},
): Promise<SwellProduct> {
	const methodLogger = serviceLogger.forMethod('checkStock');
	methodLogger.debug(`Checking stock for product ID: ${productId}`, options);

	if (!productId || productId.trim().length === 0) {
		throw createApiError('Product ID is required', 400);
	}

	try {
		// Build expand options to include inventory-related data
		const expandOptions: string[] = [];

		if (options.include_variants) {
			expandOptions.push('variants');
		}
		expandOptions.push('stock');

		// Get product with inventory information
		const product = await get(productId, { expand: expandOptions });

		methodLogger.debug(
			`Successfully checked inventory for product: ${product.name}`,
			{
				stock_level: product.stock_level,
				stock_status: product.stock_status,
				variants_count: Array.isArray(product.variants)
					? product.variants.length
					: 0,
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

/**
 * @function update
 * @description Updates a product with the provided data.
 * @memberof SwellProductsService
 * @param {string} productId - The ID of the product to update
 * @param {ProductUpdateOptions} updateData - The data to update the product with
 * @returns {Promise<UpdateResult<SwellProduct>>} A promise that resolves to the update result
 * @throws {McpError} Throws an `McpError` if the product is not found or update fails
 * @example
 * // Update product name and price
 * const result = await update('product-id-123', { name: 'New Name', price: 29.99 });
 * // Update product metadata
 * const metaResult = await update('product-id-123', {
 *   meta_title: 'SEO Title',
 *   meta_description: 'SEO Description'
 * });
 */
async function update(
	productId: string,
	updateData: ProductUpdateOptions,
): Promise<UpdateResult<SwellProduct>> {
	const methodLogger = serviceLogger.forMethod('update');
	methodLogger.debug(`Updating product ID: ${productId}`, updateData);

	if (!productId || productId.trim().length === 0) {
		throw createApiError('Product ID is required', 400);
	}

	if (!updateData || Object.keys(updateData).length === 0) {
		throw createApiError('Update data is required', 400);
	}

	try {
		// Ensure client is initialized
		if (!swellClient.isClientInitialized()) {
			swellClient.initWithAutoConfig();
		}

		const client = swellClient.getClient();

		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		// Get the current product for comparison (unless in debug mode)
		let originalProduct: SwellProduct | null = null;
		if (!isDebugMode) {
			try {
				originalProduct = await get(productId);
			} catch (error) {
				if (
					error instanceof McpError &&
					(error as any).status === 404
				) {
					throw createApiError(
						`Product not found: ${productId}`,
						404,
					);
				}
				throw error;
			}
		}

		// Validate update data (unless in debug mode)
		if (!isDebugMode) {
			ProductUpdateOptionsSchema.parse(updateData);
		}

		// Prepare the update payload
		const updatePayload: Record<string, unknown> = { ...updateData };

		// Handle special cases for pricing and inventory
		if (updateData.price !== undefined) {
			updatePayload.price = updateData.price;
		}
		if (updateData.sale_price !== undefined) {
			updatePayload.sale_price = updateData.sale_price;
		}
		if (updateData.stock_level !== undefined) {
			updatePayload.stock_level = updateData.stock_level;
		}
		if (updateData.stock_status !== undefined) {
			updatePayload.stock_status = updateData.stock_status;
		}

		// Handle metadata updates
		if (updateData.meta_title !== undefined) {
			updatePayload.meta_title = updateData.meta_title;
		}
		if (updateData.meta_description !== undefined) {
			updatePayload.meta_description = updateData.meta_description;
		}

		// Handle tags and categories
		if (updateData.tags !== undefined) {
			updatePayload.tags = updateData.tags;
		}
		if (updateData.categories !== undefined) {
			updatePayload.categories = updateData.categories;
		}

		// Handle attributes
		if (updateData.attributes !== undefined) {
			updatePayload.attributes = updateData.attributes;
		}

		// Make the API call
		const rawData = await client.put<unknown>(
			`/products/${productId}`,
			updatePayload,
		);

		if (isDebugMode) {
			methodLogger.debug(
				'Debug mode enabled - returning raw data without validation',
			);
			return {
				success: true,
				data: rawData as SwellProduct,
			};
		}

		// Validate response with Zod schema
		const updatedProduct = SwellProductSchema.parse(rawData);

		// Calculate changes
		const changes: Array<{
			field: string;
			oldValue: unknown;
			newValue: unknown;
		}> = [];

		if (originalProduct) {
			Object.keys(updateData).forEach((key) => {
				const oldValue = (originalProduct as Record<string, unknown>)[
					key
				];
				const newValue = (updatedProduct as Record<string, unknown>)[
					key
				];
				if (oldValue !== newValue) {
					changes.push({
						field: key,
						oldValue,
						newValue,
					});
				}
			});
		}

		methodLogger.debug(
			`Successfully updated product: ${updatedProduct.name}`,
			{ changes: changes.length },
		);

		return {
			success: true,
			data: updatedProduct,
			changes,
		};
	} catch (error) {
		methodLogger.error(
			`Service error updating product ${productId}`,
			error,
		);

		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			throw createApiError(
				`Product update validation failed: ${error.issues
					.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
					.join(', ')}`,
				400,
				error,
			);
		}

		// Rethrow other McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap any other unexpected errors
		throw createUnexpectedError(
			`Unexpected service error while updating product ${productId}`,
			error,
		);
	}
}

/**
 * @function updateStock
 * @description Updates stock-specific fields for a product.
 * @memberof SwellProductsService
 * @param {string} productId - The ID of the product to update stock for
 * @param {StockUpdateOptions} stockData - The stock data to update
 * @returns {Promise<UpdateResult<SwellProduct>>} A promise that resolves to the update result
 * @throws {McpError} Throws an `McpError` if the product is not found or update fails
 * @example
 * // Update stock level
 * const result = await updateStock('product-id-123', { stock_level: 50 });
 * // Update stock status
 * const statusResult = await updateStock('product-id-123', { stock_status: 'out_of_stock' });
 */
async function updateStock(
	productId: string,
	stockData: StockUpdateOptions,
): Promise<UpdateResult<SwellProduct>> {
	const methodLogger = serviceLogger.forMethod('updateStock');
	methodLogger.debug(
		`Updating stock for product ID: ${productId}`,
		stockData,
	);

	if (!productId || productId.trim().length === 0) {
		throw createApiError('Product ID is required', 400);
	}

	if (!stockData || Object.keys(stockData).length === 0) {
		throw createApiError('Inventory data is required', 400);
	}

	try {
		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		// Validate inventory data (unless in debug mode)
		if (!isDebugMode) {
			StockUpdateOptionsSchema.parse(stockData);
		}

		// Ensure client is initialized
		if (!swellClient.isClientInitialized()) {
			swellClient.initWithAutoConfig();
		}

		const client = swellClient.getClient();

		// Prepare payload for stock adjustment endpoint
		// Swell expects parent_id and quantity (delta). If caller provided an absolute stock_level,
		// compute the delta by fetching current stock level.
		const payload: Record<string, unknown> = {
			parent_id: productId,
		};

		// If quantity provided, use it directly
		if (typeof stockData.quantity === 'number') {
			payload.quantity = stockData.quantity;
		} else {
			throw createApiError(
				'Quantity is required for stock adjustments',
				400,
			);
		}

		// Attach optional adjustment fields
		if (stockData.reason !== undefined) {
			payload.reason = stockData.reason;
		}
		if (stockData.reason_message !== undefined) {
			payload.reason_message = stockData.reason_message;
		}
		if (stockData.variant_id !== undefined) {
			payload.variant_id = stockData.variant_id;
		}
		if (stockData.order_id !== undefined) {
			payload.order_id = stockData.order_id;
		}

		// If quantity is 0 (no-op), just return current product
		if (payload.quantity === 0 || payload.quantity === '0') {
			const prod = await get(productId);
			return { success: true, data: prod, changes: [] };
		}

		// Make the adjustment call to Swell
		await client.post('/products:stock', payload);

		// After adjustment, fetch updated product for response
		const updatedProduct = await get(productId);

		// Build change record: stock_level changed by quantity
		const changes: Array<{
			field: string;
			oldValue: unknown;
			newValue: unknown;
		}> = [];
		// Build a stock_level change record based on the provided quantity
		if (typeof stockData.quantity === 'number') {
			const newLevel = updatedProduct.stock_level ?? 0;
			const oldLevel = newLevel - (stockData.quantity || 0);
			if (oldLevel !== newLevel) {
				changes.push({
					field: 'stock_level',
					oldValue: oldLevel,
					newValue: newLevel,
				});
			}
		}

		methodLogger.debug(
			`Successfully created stock adjustment for product: ${updatedProduct.name}`,
			{ quantity: payload.quantity },
		);

		return { success: true, data: updatedProduct, changes };
	} catch (error) {
		methodLogger.error(
			`Service error updating inventory for product ${productId}`,
			error,
		);

		// Rethrow McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap any other unexpected errors
		throw createUnexpectedError(
			`Unexpected service error while updating inventory for product ${productId}`,
			error,
		);
	}
}

/**
 * @function updatePricing
 * @description Updates pricing-specific fields for a product.
 * @memberof SwellProductsService
 * @param {string} productId - The ID of the product to update pricing for
 * @param {PricingUpdateOptions} pricingData - The pricing data to update
 * @returns {Promise<UpdateResult<SwellProduct>>} A promise that resolves to the update result
 * @throws {McpError} Throws an `McpError` if the product is not found or update fails
 * @example
 * // Update regular price
 * const result = await updatePricing('product-id-123', { price: 29.99 });
 * // Update both regular and sale price
 * const priceResult = await updatePricing('product-id-123', {
 *   price: 39.99,
 *   sale_price: 29.99
 * });
 */
async function updatePricing(
	productId: string,
	pricingData: PricingUpdateOptions,
): Promise<UpdateResult<SwellProduct>> {
	const methodLogger = serviceLogger.forMethod('updatePricing');
	methodLogger.debug(
		`Updating pricing for product ID: ${productId}`,
		pricingData,
	);

	if (!productId || productId.trim().length === 0) {
		throw createApiError('Product ID is required', 400);
	}

	if (!pricingData || Object.keys(pricingData).length === 0) {
		throw createApiError('Pricing data is required', 400);
	}

	try {
		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		// Validate pricing data (unless in debug mode)
		if (!isDebugMode) {
			PricingUpdateOptionsSchema.parse(pricingData);
		}

		// Convert pricing data to product update format
		const updateData: ProductUpdateOptions = {};

		if (pricingData.price !== undefined) {
			updateData.price = pricingData.price;
		}
		if (pricingData.sale_price !== undefined) {
			updateData.sale_price = pricingData.sale_price;
		}

		// Use the main update method
		const result = await update(productId, updateData);

		methodLogger.debug(
			`Successfully updated pricing for product: ${result.data?.name}`,
		);

		return result;
	} catch (error) {
		methodLogger.error(
			`Service error updating pricing for product ${productId}`,
			error,
		);

		// Rethrow McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap any other unexpected errors
		throw createUnexpectedError(
			`Unexpected service error while updating pricing for product ${productId}`,
			error,
		);
	}
}

/**
 * @function updateStatus
 * @description Updates the active status of a product (activation/deactivation).
 * @memberof SwellProductsService
 * @param {string} productId - The ID of the product to update status for
 * @param {boolean} active - Whether the product should be active or inactive
 * @returns {Promise<UpdateResult<SwellProduct>>} A promise that resolves to the update result
 * @throws {McpError} Throws an `McpError` if the product is not found or update fails
 * @example
 * // Activate a product
 * const result = await updateStatus('product-id-123', true);
 * // Deactivate a product
 * const deactivateResult = await updateStatus('product-id-123', false);
 */
async function updateStatus(
	productId: string,
	active: boolean,
): Promise<UpdateResult<SwellProduct>> {
	const methodLogger = serviceLogger.forMethod('updateStatus');
	methodLogger.debug(
		`Updating status for product ID: ${productId} to ${active ? 'active' : 'inactive'}`,
	);

	if (!productId || productId.trim().length === 0) {
		throw createApiError('Product ID is required', 400);
	}

	if (typeof active !== 'boolean') {
		throw createApiError('Active status must be a boolean value', 400);
	}

	try {
		// Use the main update method
		const result = await update(productId, { active });

		methodLogger.debug(
			`Successfully updated status for product: ${result.data?.name} to ${active ? 'active' : 'inactive'}`,
		);

		return result;
	} catch (error) {
		methodLogger.error(
			`Service error updating status for product ${productId}`,
			error,
		);

		// Rethrow McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap any other unexpected errors
		throw createUnexpectedError(
			`Unexpected service error while updating status for product ${productId}`,
			error,
		);
	}
}

export default {
	list,
	get,
	search,
	checkStock,
	update,
	updateStock,
	updatePricing,
	updateStatus,
};
