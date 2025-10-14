import { Logger } from '../utils/logger.util.js';
import { config } from '../utils/config.util.js';
import swellProductsService from '../services/swell.products.service.js';
import {
	formatProductsList,
	formatProductDetails,
	formatProductSearch,
	formatProductUpdate,
} from './swell.products.formatter.js';
import {
	handleControllerError,
	buildErrorContext,
} from '../utils/error-handler.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { createApiError } from '../utils/error.util.js';
import {
	ProductListOptions,
	ProductSearchOptions,
	ProductGetOptions,
	StockCheckOptions,
	ProductUpdateOptions,
	StockUpdateOptions,
	PricingUpdateOptions,
	StockStatus,
} from '../services/swell.products.types.js';

/**
 * @namespace SwellProductsController
 * @description Controller responsible for handling Swell product operations.
 *              Orchestrates calls to the products service, applies business logic,
 *              and formats responses using the formatter.
 */

/**
 * @function list
 * @description Lists products with pagination and filtering logic.
 * @memberof SwellProductsController
 * @param {Object} args - Arguments containing filtering and pagination options
 * @param {number} [args.page=1] - Page number for pagination
 * @param {number} [args.limit=20] - Number of products per page
 * @param {boolean} [args.active] - Filter by active status
 * @param {string} [args.category] - Filter by category
 * @param {string[]} [args.tags] - Filter by tags
 * @param {string} [args.sort] - Sort order
 * @param {string[]} [args.expand] - Fields to expand in response
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted product list
 * @throws {McpError} Throws an McpError if the service call fails
 */
async function list(
	args: {
		page?: number;
		limit?: number;
		active?: boolean;
		category?: string;
		tags?: string[];
		sort?: string;
		expand?: string[];
	} = {},
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.products.controller.ts',
		'list',
	);
	methodLogger.debug('Listing products with options', args);

	try {
		// Apply defaults and validation
		const options: ProductListOptions = {
			page: args.page ?? 1,
			limit: Math.min(args.limit ?? 20, 100), // Cap at 100 items per page
			active: args.active,
			category: args.category,
			tags: args.tags,
			sort: args.sort ?? 'date_created_desc',
			expand: args.expand,
		};

		// Validate page and limit
		if (options.page! < 1) {
			throw createApiError('Page number must be greater than 0', 400);
		}
		if (options.limit! < 1) {
			throw createApiError('Limit must be greater than 0', 400);
		}

		methodLogger.debug('Calling products service with options', options);

		// Call the service
		const data = await swellProductsService.list(options);

		methodLogger.debug(
			`Successfully retrieved ${data.results?.length || 'unknown'} products`,
			{
				count: data.count,
				page: data.page,
				pages: data.pages,
			},
		);

		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		if (isDebugMode) {
			methodLogger.debug('Debug mode enabled - returning raw JSON');
			return { content: JSON.stringify(data, null, 2) };
		}

		// Format the response
		const formattedContent = formatProductsList(data, options);
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Products',
				'list',
				'controllers/swell.products.controller.ts@list',
				'product listing',
				{ args },
			),
		);
	}
}

/**
 * @function get
 * @description Retrieves detailed product information.
 * @memberof SwellProductsController
 * @param {Object} args - Arguments containing product ID and options
 * @param {string} args.productId - The ID of the product to retrieve
 * @param {string[]} [args.expand] - Fields to expand in response
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted product details
 * @throws {McpError} Throws an McpError if the product is not found or service call fails
 */
async function get(args: {
	productId: string;
	expand?: string[];
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.products.controller.ts',
		'get',
	);
	methodLogger.debug(`Getting product details for ID: ${args.productId}`);

	try {
		// Validate required parameters
		if (!args.productId || args.productId.trim().length === 0) {
			throw createApiError('Product ID is required', 400);
		}

		const options: ProductGetOptions = {
			expand: args.expand ?? ['variants', 'categories', 'images'],
		};

		methodLogger.debug('Calling products service with options', {
			productId: args.productId,
			options,
		});

		// Call the service
		const data = await swellProductsService.get(args.productId, options);

		methodLogger.debug(
			`Successfully retrieved product: ${data.name || 'unknown'}`,
		);

		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		if (isDebugMode) {
			methodLogger.debug('Debug mode enabled - returning raw JSON');
			return { content: JSON.stringify(data, null, 2) };
		}

		// Format the response
		const formattedContent = formatProductDetails(data);
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Products',
				'get',
				'controllers/swell.products.controller.ts@get',
				args.productId,
				{ args },
			),
		);
	}
}

/**
 * @function search
 * @description Searches products with multiple criteria support.
 * @memberof SwellProductsController
 * @param {Object} args - Arguments containing search query and options
 * @param {string} args.query - Search query
 * @param {number} [args.page=1] - Page number for pagination
 * @param {number} [args.limit=20] - Number of products per page
 * @param {boolean} [args.active] - Filter by active status
 * @param {string} [args.category] - Filter by category
 * @param {string[]} [args.tags] - Filter by tags
 * @param {string} [args.sort] - Sort order
 * @param {string[]} [args.expand] - Fields to expand in response
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted search results
 * @throws {McpError} Throws an McpError if the search fails
 */
async function search(args: {
	query: string;
	page?: number;
	limit?: number;
	active?: boolean;
	category?: string;
	tags?: string[];
	sort?: string;
	expand?: string[];
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.products.controller.ts',
		'search',
	);
	methodLogger.debug(`Searching products with query: "${args.query}"`);

	try {
		// Validate required parameters
		if (!args.query || args.query.trim().length === 0) {
			throw createApiError('Search query is required', 400);
		}

		// Apply defaults and validation
		const options: ProductSearchOptions = {
			query: args.query.trim(),
			page: args.page ?? 1,
			limit: Math.min(args.limit ?? 20, 100), // Cap at 100 items per page
			active: args.active,
			category: args.category,
			tags: args.tags,
			sort: args.sort ?? 'relevance',
			expand: args.expand,
		};

		// Validate page and limit
		if (options.page! < 1) {
			throw createApiError('Page number must be greater than 0', 400);
		}
		if (options.limit! < 1) {
			throw createApiError('Limit must be greater than 0', 400);
		}

		methodLogger.debug(
			'Calling products service with search options',
			options,
		);

		// Call the service
		const data = await swellProductsService.search(options);

		methodLogger.debug(
			`Search completed: found ${data.count} products matching "${args.query}"`,
		);

		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		if (isDebugMode) {
			methodLogger.debug('Debug mode enabled - returning raw JSON');
			return { content: JSON.stringify(data, null, 2) };
		}

		// Format the response
		const formattedContent = formatProductSearch(data, options);
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Products',
				'search',
				'controllers/swell.products.controller.ts@search',
				args.query,
				{ args },
			),
		);
	}
}

/**
 * @function checkStock
 * @description Checks stock levels for a product.
 * @memberof SwellProductsController
 * @param {Object} args - Arguments containing product ID and stock options
 * @param {string} args.productId - The ID of the product to check stock for
 * @param {boolean} [args.includeVariants=true] - Whether to include variant stock
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted stock information
 * @throws {McpError} Throws an McpError if the product is not found or service call fails
 */
async function checkStock(args: {
	productId: string;
	includeVariants?: boolean;
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.products.controller.ts',
		'checkStock',
	);
	methodLogger.debug(`Checking stock for product ID: ${args.productId}`);

	try {
		// Validate required parameters
		if (!args.productId || args.productId.trim().length === 0) {
			throw createApiError('Product ID is required', 400);
		}

		const options: StockCheckOptions = {
			include_variants: args.includeVariants ?? true,
		};

		methodLogger.debug('Calling products service for stock check', {
			productId: args.productId,
			options,
		});

		// Call the service
		const data = await swellProductsService.checkStock(
			args.productId,
			options,
		);

		methodLogger.debug(
			`Successfully checked stock for product: ${data.name || 'unknown'}`,
			{
				stock_level: data.stock_level,
				stock_status: data.stock_status,
			},
		);

		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		if (isDebugMode) {
			methodLogger.debug('Debug mode enabled - returning raw JSON');
			return { content: JSON.stringify(data, null, 2) };
		}

		// Format the response using the product details formatter with stock focus
		const formattedContent = formatProductDetails(data, {
			focusStock: true,
		});
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Products',
				'checkStock',
				'controllers/swell.products.controller.ts@checkStock',
				args.productId,
				{ args },
			),
		);
	}
}

/**
 * @function update
 * @description Updates a product with the provided data.
 * @memberof SwellProductsController
 * @param {Object} args - Arguments containing product ID and update data
 * @param {string} args.productId - The ID of the product to update
 * @param {string} [args.name] - Product name
 * @param {string} [args.description] - Product description
 * @param {number} [args.price] - Product price
 * @param {number} [args.salePrice] - Product sale price
 * @param {string} [args.sku] - Product SKU
 * @param {boolean} [args.active] - Product active status
 * @param {number} [args.stockLevel] - Stock level
 * @param {string} [args.stockStatus] - Stock status
 * @param {string} [args.metaTitle] - SEO meta title
 * @param {string} [args.metaDescription] - SEO meta description
 * @param {string[]} [args.tags] - Product tags
 * @param {string[]} [args.categories] - Product categories
 * @param {Record<string, unknown>} [args.attributes] - Custom attributes
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted update result
 * @throws {McpError} Throws an McpError if the update fails
 */
async function update(args: {
	productId: string;
	name?: string;
	description?: string;
	price?: number;
	salePrice?: number;
	sku?: string;
	active?: boolean;
	stockLevel?: number;
	stockStatus?: string;
	metaTitle?: string;
	metaDescription?: string;
	tags?: string[];
	categories?: string[];
	attributes?: Record<string, unknown>;
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.products.controller.ts',
		'update',
	);
	methodLogger.debug(`Updating product ID: ${args.productId}`, args);

	try {
		// Validate required parameters
		if (!args.productId || args.productId.trim().length === 0) {
			throw createApiError('Product ID is required', 400);
		}

		// Build update data from arguments
		const updateData: ProductUpdateOptions = {};

		if (args.name !== undefined) {
			updateData.name = args.name;
		}
		if (args.description !== undefined) {
			updateData.description = args.description;
		}
		if (args.price !== undefined) {
			if (args.price <= 0) {
				throw createApiError('Price must be greater than 0', 400);
			}
			updateData.price = args.price;
		}
		if (args.salePrice !== undefined) {
			if (args.salePrice !== null && args.salePrice <= 0) {
				throw createApiError('Sale price must be greater than 0', 400);
			}
			updateData.sale_price = args.salePrice;
		}
		if (args.sku !== undefined) {
			updateData.sku = args.sku;
		}
		if (args.active !== undefined) {
			updateData.active = args.active;
		}
		if (args.stockLevel !== undefined) {
			if (args.stockLevel < 0) {
				throw createApiError('Stock level cannot be negative', 400);
			}
			updateData.stock_level = args.stockLevel;
		}
		if (args.stockStatus !== undefined) {
			const validStatuses = [
				'in_stock',
				'out_of_stock',
				'backorder',
				'preorder',
			];
			if (!validStatuses.includes(args.stockStatus)) {
				throw createApiError(
					`Invalid stock status. Must be one of: ${validStatuses.join(', ')}`,
					400,
				);
			}
			updateData.stock_status = args.stockStatus as StockStatus;
		}
		if (args.metaTitle !== undefined) {
			updateData.meta_title = args.metaTitle;
		}
		if (args.metaDescription !== undefined) {
			updateData.meta_description = args.metaDescription;
		}
		if (args.tags !== undefined) {
			updateData.tags = args.tags;
		}
		if (args.categories !== undefined) {
			updateData.categories = args.categories;
		}
		if (args.attributes !== undefined) {
			updateData.attributes = args.attributes;
		}

		// Validate that at least one field is being updated
		if (Object.keys(updateData).length === 0) {
			throw createApiError(
				'At least one field must be provided for update',
				400,
			);
		}

		methodLogger.debug('Calling products service with update data', {
			productId: args.productId,
			updateData,
		});

		// Call the service
		const result = await swellProductsService.update(
			args.productId,
			updateData,
		);

		methodLogger.debug(
			`Successfully updated product: ${result.data?.name || 'unknown'}`,
			{
				changes: result.changes?.length || 0,
			},
		);

		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		if (isDebugMode) {
			methodLogger.debug('Debug mode enabled - returning raw JSON');
			return { content: JSON.stringify(result, null, 2) };
		}

		// Format the response
		const formattedContent = formatProductUpdate(result, 'Product Update');
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Products',
				'update',
				'controllers/swell.products.controller.ts@update',
				args.productId,
				{ args },
			),
		);
	}
}

/**
 * @function updateInventory
 * @description Updates inventory-specific fields for a product.
 * @memberof SwellProductsController
 * @param {Object} args - Arguments containing product ID and inventory data
 * @param {string} args.productId - The ID of the product to update inventory for
 * @param {number} [args.stockLevel] - Stock level
 * @param {string} [args.stockStatus] - Stock status
 * @param {boolean} [args.stockTracking] - Whether to enable stock tracking
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted update result
 * @throws {McpError} Throws an McpError if the update fails
 */
async function updateStock(args: {
	productId: string;
	// Adjustment-specific
	quantity?: number;
	reason?:
		| 'received'
		| 'returned'
		| 'canceled'
		| 'sold'
		| 'missing'
		| 'damaged';
	reasonMessage?: string;
	variantId?: string;
	orderId?: string;
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.products.controller.ts',
		'updateStock',
	);
	methodLogger.debug(
		`Updating inventory for product ID: ${args.productId}`,
		args,
	);

	try {
		// Validate required parameters
		if (!args.productId || args.productId.trim().length === 0) {
			throw createApiError('Product ID is required', 400);
		}

		// Build stock update data from arguments
		const stockData: StockUpdateOptions = {};

		// Adjustment-specific mapping
		if (args.quantity !== undefined) {
			stockData.quantity = args.quantity;
		}
		if (args.reason !== undefined) {
			const validReasons = [
				'received',
				'returned',
				'canceled',
				'sold',
				'missing',
				'damaged',
			];
			if (!validReasons.includes(args.reason)) {
				throw createApiError(
					`Invalid reason. Must be one of: ${validReasons.join(', ')}`,
					400,
				);
			}
			stockData.reason = args.reason;
		}
		if (args.reasonMessage !== undefined) {
			stockData.reason_message = args.reasonMessage;
		}
		if (args.variantId !== undefined) {
			stockData.variant_id = args.variantId;
		}
		if (args.orderId !== undefined) {
			stockData.order_id = args.orderId;
		}

		// Validate that at least one field is being updated
		if (Object.keys(stockData).length === 0) {
			throw createApiError(
				'At least one stock field must be provided for update',
				400,
			);
		}

		methodLogger.debug('Calling products service with stock data', {
			productId: args.productId,
			stockData,
		});

		// Call the service
		const result = await swellProductsService.updateStock(
			args.productId,
			stockData,
		);

		methodLogger.debug(
			`Successfully updated stock for product: ${result.data?.name || 'unknown'}`,
			{
				changes: result.changes?.length || 0,
			},
		);

		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		if (isDebugMode) {
			methodLogger.debug('Debug mode enabled - returning raw JSON');
			return { content: JSON.stringify(result, null, 2) };
		}

		// Format the response
		const formattedContent = formatProductUpdate(result, 'Stock Update');
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Products',
				'updateStock',
				'controllers/swell.products.controller.ts@updateStock',
				args.productId,
				{ args },
			),
		);
	}
}

/**
 * @function updatePricing
 * @description Updates pricing-specific fields for a product.
 * @memberof SwellProductsController
 * @param {Object} args - Arguments containing product ID and pricing data
 * @param {string} args.productId - The ID of the product to update pricing for
 * @param {number} [args.price] - Regular price
 * @param {number} [args.salePrice] - Sale price
 * @param {string} [args.currency] - Currency code
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted update result
 * @throws {McpError} Throws an McpError if the update fails
 */
async function updatePricing(args: {
	productId: string;
	price?: number;
	salePrice?: number;
	currency?: string;
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.products.controller.ts',
		'updatePricing',
	);
	methodLogger.debug(
		`Updating pricing for product ID: ${args.productId}`,
		args,
	);

	try {
		// Validate required parameters
		if (!args.productId || args.productId.trim().length === 0) {
			throw createApiError('Product ID is required', 400);
		}

		// Build pricing update data from arguments
		const pricingData: PricingUpdateOptions = {};

		if (args.price !== undefined) {
			if (args.price <= 0) {
				throw createApiError('Price must be greater than 0', 400);
			}
			pricingData.price = args.price;
		}
		if (args.salePrice !== undefined) {
			if (args.salePrice !== null && args.salePrice <= 0) {
				throw createApiError('Sale price must be greater than 0', 400);
			}
			pricingData.sale_price = args.salePrice;
		}
		if (args.currency !== undefined) {
			pricingData.currency = args.currency;
		}

		// Validate that at least one field is being updated
		if (Object.keys(pricingData).length === 0) {
			throw createApiError(
				'At least one pricing field must be provided for update',
				400,
			);
		}

		// Additional validation: sale price should not be higher than regular price
		if (
			pricingData.price &&
			pricingData.sale_price &&
			pricingData.sale_price > pricingData.price
		) {
			throw createApiError(
				'Sale price cannot be higher than regular price',
				400,
			);
		}

		methodLogger.debug('Calling products service with pricing data', {
			productId: args.productId,
			pricingData,
		});

		// Call the service
		const result = await swellProductsService.updatePricing(
			args.productId,
			pricingData,
		);

		methodLogger.debug(
			`Successfully updated pricing for product: ${result.data?.name || 'unknown'}`,
			{
				changes: result.changes?.length || 0,
			},
		);

		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		if (isDebugMode) {
			methodLogger.debug('Debug mode enabled - returning raw JSON');
			return { content: JSON.stringify(result, null, 2) };
		}

		// Format the response
		const formattedContent = formatProductUpdate(result, 'Pricing Update');
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Products',
				'updatePricing',
				'controllers/swell.products.controller.ts@updatePricing',
				args.productId,
				{ args },
			),
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
};
