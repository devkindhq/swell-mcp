import { Logger } from '../utils/logger.util.js';
import swellProductsService from '../services/swell.products.service.js';
import {
	formatProductsList,
	formatProductDetails,
	formatProductSearch,
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
	InventoryCheckOptions,
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
			`Successfully retrieved ${data.results.length} products`,
			{
				count: data.count,
				page: data.page,
				pages: data.pages,
			},
		);

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

		methodLogger.debug(`Successfully retrieved product: ${data.name}`);

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
 * @function checkInventory
 * @description Checks inventory levels for a product.
 * @memberof SwellProductsController
 * @param {Object} args - Arguments containing product ID and inventory options
 * @param {string} args.productId - The ID of the product to check inventory for
 * @param {boolean} [args.includeVariants=true] - Whether to include variant inventory
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted inventory information
 * @throws {McpError} Throws an McpError if the product is not found or service call fails
 */
async function checkInventory(args: {
	productId: string;
	includeVariants?: boolean;
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.products.controller.ts',
		'checkInventory',
	);
	methodLogger.debug(`Checking inventory for product ID: ${args.productId}`);

	try {
		// Validate required parameters
		if (!args.productId || args.productId.trim().length === 0) {
			throw createApiError('Product ID is required', 400);
		}

		const options: InventoryCheckOptions = {
			include_variants: args.includeVariants ?? true,
		};

		methodLogger.debug('Calling products service for inventory check', {
			productId: args.productId,
			options,
		});

		// Call the service
		const data = await swellProductsService.checkInventory(
			args.productId,
			options,
		);

		methodLogger.debug(
			`Successfully checked inventory for product: ${data.name}`,
			{
				stock_level: data.stock_level,
				stock_status: data.stock_status,
			},
		);

		// Format the response using the product details formatter with inventory focus
		const formattedContent = formatProductDetails(data, {
			focusInventory: true,
		});
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Products',
				'checkInventory',
				'controllers/swell.products.controller.ts@checkInventory',
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
	checkInventory,
};
