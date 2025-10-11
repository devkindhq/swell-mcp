import { Logger } from '../utils/logger.util.js';
import swellCustomersService from '../services/swell.customers.service';
import {
	formatCustomersList,
	formatCustomerDetails,
	formatCustomerAnalytics,
	formatCustomerOrderHistory,
} from './swell.customers.formatter';
import {
	handleControllerError,
	buildErrorContext,
} from '../utils/error-handler.util';
import { ControllerResponse } from '../types/common.types';
import { createApiError } from '../utils/error.util';
import {
	CustomerListOptions,
	CustomerSearchOptions,
	CustomerGetOptions,
	CustomerOrderHistoryOptions,
	CustomerAnalyticsOptions,
} from '../services/swell.customers.types';

/**
 * @namespace SwellCustomersController
 * @description Controller responsible for handling Swell customer operations.
 *              Orchestrates calls to the customers service, applies business logic,
 *              and formats responses using the formatter.
 */

/**
 * @function list
 * @description Lists customers with search functionality.
 * @memberof SwellCustomersController
 * @param {Object} args - Arguments containing filtering and pagination options
 * @param {number} [args.page=1] - Page number for pagination
 * @param {number} [args.limit=20] - Number of customers per page
 * @param {string} [args.email] - Filter by email address
 * @param {string} [args.firstName] - Filter by first name
 * @param {string} [args.lastName] - Filter by last name
 * @param {string} [args.phone] - Filter by phone number
 * @param {string} [args.groupId] - Filter by customer group ID
 * @param {string[]} [args.tags] - Filter by tags
 * @param {string} [args.dateFrom] - Filter customers from this date (ISO format)
 * @param {string} [args.dateTo] - Filter customers to this date (ISO format)
 * @param {number} [args.minOrderCount] - Minimum order count filter
 * @param {number} [args.maxOrderCount] - Maximum order count filter
 * @param {number} [args.minOrderValue] - Minimum order value filter
 * @param {number} [args.maxOrderValue] - Maximum order value filter
 * @param {string} [args.search] - Search query
 * @param {string} [args.sort] - Sort order
 * @param {string[]} [args.expand] - Fields to expand in response
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted customers list
 * @throws {McpError} Throws an McpError if the service call fails
 */
async function list(
	args: {
		page?: number;
		limit?: number;
		email?: string;
		firstName?: string;
		lastName?: string;
		phone?: string;
		groupId?: string;
		tags?: string[];
		dateFrom?: string;
		dateTo?: string;
		minOrderCount?: number;
		maxOrderCount?: number;
		minOrderValue?: number;
		maxOrderValue?: number;
		search?: string;
		sort?: string;
		expand?: string[];
	} = {},
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.customers.controller.ts',
		'list',
	);
	methodLogger.debug('Listing customers with options', args);

	try {
		// Apply defaults and validation
		const options: CustomerListOptions = {
			page: args.page ?? 1,
			limit: Math.min(args.limit ?? 20, 100), // Cap at 100 items per page
			email: args.email,
			first_name: args.firstName,
			last_name: args.lastName,
			phone: args.phone,
			group_id: args.groupId,
			tags: args.tags,
			search: args.search,
			sort: args.sort ?? 'date_created_desc',
			expand: args.expand,
		};

		// Build date filter if provided
		if (args.dateFrom || args.dateTo) {
			options.date_created = {};
			if (args.dateFrom) {
				// Validate date format
				if (!isValidISODate(args.dateFrom)) {
					throw createApiError(
						'Invalid dateFrom format. Use ISO date format (YYYY-MM-DD)',
						400,
					);
				}
				options.date_created.$gte = args.dateFrom;
			}
			if (args.dateTo) {
				// Validate date format
				if (!isValidISODate(args.dateTo)) {
					throw createApiError(
						'Invalid dateTo format. Use ISO date format (YYYY-MM-DD)',
						400,
					);
				}
				options.date_created.$lte = args.dateTo;
			}
		}

		// Build order count filter if provided
		if (
			args.minOrderCount !== undefined ||
			args.maxOrderCount !== undefined
		) {
			options.order_count = {};
			if (args.minOrderCount !== undefined) {
				if (args.minOrderCount < 0) {
					throw createApiError(
						'Minimum order count must be non-negative',
						400,
					);
				}
				options.order_count.$gte = args.minOrderCount;
			}
			if (args.maxOrderCount !== undefined) {
				if (args.maxOrderCount < 0) {
					throw createApiError(
						'Maximum order count must be non-negative',
						400,
					);
				}
				options.order_count.$lte = args.maxOrderCount;
			}
		}

		// Build order value filter if provided
		if (
			args.minOrderValue !== undefined ||
			args.maxOrderValue !== undefined
		) {
			options.order_value = {};
			if (args.minOrderValue !== undefined) {
				if (args.minOrderValue < 0) {
					throw createApiError(
						'Minimum order value must be non-negative',
						400,
					);
				}
				options.order_value.$gte = args.minOrderValue;
			}
			if (args.maxOrderValue !== undefined) {
				if (args.maxOrderValue < 0) {
					throw createApiError(
						'Maximum order value must be non-negative',
						400,
					);
				}
				options.order_value.$lte = args.maxOrderValue;
			}
		}

		// Validate page and limit
		if (options.page! < 1) {
			throw createApiError('Page number must be greater than 0', 400);
		}
		if (options.limit! < 1) {
			throw createApiError('Limit must be greater than 0', 400);
		}

		methodLogger.debug('Calling customers service with options', options);

		// Call the service
		const data = await swellCustomersService.list(options);

		methodLogger.debug(
			`Successfully retrieved ${data.results.length} customers`,
			{
				count: data.count,
				page: data.page,
				pages: data.pages,
			},
		);

		// Format the response
		const formattedContent = formatCustomersList(data, options);
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Customers',
				'list',
				'controllers/swell.customers.controller.ts@list',
				'customer listing',
				{ args },
			),
		);
	}
}

/**
 * @function get
 * @description Retrieves customer profile with order history.
 * @memberof SwellCustomersController
 * @param {Object} args - Arguments containing customer ID and options
 * @param {string} args.customerId - The ID of the customer to retrieve
 * @param {string[]} [args.expand] - Fields to expand in response
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted customer details
 * @throws {McpError} Throws an McpError if the customer is not found or service call fails
 */
async function get(args: {
	customerId: string;
	expand?: string[];
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.customers.controller.ts',
		'get',
	);
	methodLogger.debug(`Getting customer details for ID: ${args.customerId}`);

	try {
		// Validate required parameters
		if (!args.customerId || args.customerId.trim().length === 0) {
			throw createApiError('Customer ID is required', 400);
		}

		const options: CustomerGetOptions = {
			expand: args.expand ?? ['addresses', 'orders'],
		};

		methodLogger.debug('Calling customers service with options', {
			customerId: args.customerId,
			options,
		});

		// Call the service
		const data = await swellCustomersService.get(args.customerId, options);

		methodLogger.debug(
			`Successfully retrieved customer: ${data.email || args.customerId}`,
		);

		// Format the response
		const formattedContent = formatCustomerDetails(data);
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Customers',
				'get',
				'controllers/swell.customers.controller.ts@get',
				args.customerId,
				{ args },
			),
		);
	}
}

/**
 * @function search
 * @description Searches customers with multiple criteria.
 * @memberof SwellCustomersController
 * @param {Object} args - Arguments containing search query and options
 * @param {string} args.query - Search query
 * @param {number} [args.page=1] - Page number for pagination
 * @param {number} [args.limit=20] - Number of customers per page
 * @param {string} [args.groupId] - Filter by customer group ID
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
	groupId?: string;
	tags?: string[];
	sort?: string;
	expand?: string[];
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.customers.controller.ts',
		'search',
	);
	methodLogger.debug(`Searching customers with query: "${args.query}"`);

	try {
		// Validate required parameters
		if (!args.query || args.query.trim().length === 0) {
			throw createApiError('Search query is required', 400);
		}

		// Apply defaults and validation
		const options: CustomerSearchOptions = {
			query: args.query.trim(),
			page: args.page ?? 1,
			limit: Math.min(args.limit ?? 20, 100), // Cap at 100 items per page
			group_id: args.groupId,
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
			'Calling customers service with search options',
			options,
		);

		// Call the service
		const data = await swellCustomersService.search(options);

		methodLogger.debug(
			`Search completed: found ${data.count} customers matching "${args.query}"`,
		);

		// Format the response
		const formattedContent = formatCustomersList(data, options, {
			isSearchResult: true,
		});
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Customers',
				'search',
				'controllers/swell.customers.controller.ts@search',
				args.query,
				{ args },
			),
		);
	}
}

/**
 * @function getOrderHistory
 * @description Retrieves order history for a specific customer.
 * @memberof SwellCustomersController
 * @param {Object} args - Arguments containing customer ID and history options
 * @param {string} args.customerId - The ID of the customer
 * @param {number} [args.page=1] - Page number for pagination
 * @param {number} [args.limit=20] - Number of orders per page
 * @param {string|string[]} [args.status] - Filter by order status
 * @param {string} [args.dateFrom] - Filter orders from this date (ISO format)
 * @param {string} [args.dateTo] - Filter orders to this date (ISO format)
 * @param {string} [args.sort] - Sort order
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted order history
 * @throws {McpError} Throws an McpError if the customer is not found or service call fails
 */
async function getOrderHistory(args: {
	customerId: string;
	page?: number;
	limit?: number;
	status?: string | string[];
	dateFrom?: string;
	dateTo?: string;
	sort?: string;
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.customers.controller.ts',
		'getOrderHistory',
	);
	methodLogger.debug(
		`Getting order history for customer ID: ${args.customerId}`,
	);

	try {
		// Validate required parameters
		if (!args.customerId || args.customerId.trim().length === 0) {
			throw createApiError('Customer ID is required', 400);
		}

		// Apply defaults and validation
		const options: CustomerOrderHistoryOptions = {
			customer_id: args.customerId,
			page: args.page ?? 1,
			limit: Math.min(args.limit ?? 20, 100), // Cap at 100 items per page
			status: args.status,
			date_from: args.dateFrom,
			date_to: args.dateTo,
			sort: args.sort ?? 'date_created_desc',
		};

		// Validate date formats if provided
		if (options.date_from && !isValidISODate(options.date_from)) {
			throw createApiError(
				'Invalid dateFrom format. Use ISO date format (YYYY-MM-DD)',
				400,
			);
		}
		if (options.date_to && !isValidISODate(options.date_to)) {
			throw createApiError(
				'Invalid dateTo format. Use ISO date format (YYYY-MM-DD)',
				400,
			);
		}

		// Validate page and limit
		if (options.page! < 1) {
			throw createApiError('Page number must be greater than 0', 400);
		}
		if (options.limit! < 1) {
			throw createApiError('Limit must be greater than 0', 400);
		}

		methodLogger.debug('Calling customers service for order history', {
			customerId: args.customerId,
			options,
		});

		// Call the service
		const data = await swellCustomersService.getOrderHistory(options);

		methodLogger.debug(
			`Successfully retrieved order history: ${data.count} orders for customer ${args.customerId}`,
		);

		// Format the response
		const formattedContent = formatCustomerOrderHistory(data, options);
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Customers',
				'getOrderHistory',
				'controllers/swell.customers.controller.ts@getOrderHistory',
				args.customerId,
				{ args },
			),
		);
	}
}

/**
 * @function getAnalytics
 * @description Retrieves customer analytics with behavior insights.
 * @memberof SwellCustomersController
 * @param {Object} args - Arguments containing analytics options
 * @param {string} [args.customerId] - Specific customer ID for individual analytics
 * @param {string} [args.groupId] - Filter by customer group ID
 * @param {string} [args.dateFrom] - Start date for analytics (ISO format)
 * @param {string} [args.dateTo] - End date for analytics (ISO format)
 * @param {string[]} [args.metrics] - Specific metrics to include
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted analytics
 * @throws {McpError} Throws an McpError if the analytics call fails
 */
async function getAnalytics(
	args: {
		customerId?: string;
		groupId?: string;
		dateFrom?: string;
		dateTo?: string;
		metrics?: (
			| 'order_count'
			| 'order_value'
			| 'average_order_value'
			| 'lifetime_value'
		)[];
	} = {},
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.customers.controller.ts',
		'getAnalytics',
	);
	methodLogger.debug('Getting customer analytics', args);

	try {
		// Apply defaults
		const options: CustomerAnalyticsOptions = {
			customer_id: args.customerId,
			group_id: args.groupId,
			date_from: args.dateFrom,
			date_to: args.dateTo,
			metrics: args.metrics ?? [
				'order_count',
				'order_value',
				'average_order_value',
				'lifetime_value',
			],
		};

		// Validate date formats if provided
		if (options.date_from && !isValidISODate(options.date_from)) {
			throw createApiError(
				'Invalid dateFrom format. Use ISO date format (YYYY-MM-DD)',
				400,
			);
		}
		if (options.date_to && !isValidISODate(options.date_to)) {
			throw createApiError(
				'Invalid dateTo format. Use ISO date format (YYYY-MM-DD)',
				400,
			);
		}

		// Validate date range
		if (options.date_from && options.date_to) {
			const fromDate = new Date(options.date_from);
			const toDate = new Date(options.date_to);
			if (fromDate > toDate) {
				throw createApiError(
					'dateFrom must be earlier than dateTo',
					400,
				);
			}
		}

		methodLogger.debug('Calling customers service for analytics', options);

		// Call the service
		const data = await swellCustomersService.getAnalytics(options);

		methodLogger.debug(
			`Successfully retrieved analytics data: ${data.count} customers`,
			{
				customer_id: options.customer_id,
				group_id: options.group_id,
				date_from: options.date_from,
				date_to: options.date_to,
			},
		);

		// Format the response
		const formattedContent = formatCustomerAnalytics(data, options);
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Customers',
				'getAnalytics',
				'controllers/swell.customers.controller.ts@getAnalytics',
				'customer analytics',
				{ args },
			),
		);
	}
}

// Helper functions

/**
 * Validate ISO date format (YYYY-MM-DD)
 */
function isValidISODate(dateString: string): boolean {
	const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!isoDateRegex.test(dateString)) {
		return false;
	}

	const date = new Date(dateString);
	return date instanceof Date && !isNaN(date.getTime());
}

export default {
	list,
	get,
	search,
	getOrderHistory,
	getAnalytics,
};
