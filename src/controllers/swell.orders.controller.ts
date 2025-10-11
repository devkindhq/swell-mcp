import { Logger } from '../utils/logger.util.js';
import { config } from '../utils/config.util.js';
import swellOrdersService from '../services/swell.orders.service.js';
import {
	formatOrdersList,
	formatOrderDetails,
	formatOrderAnalytics,
} from './swell.orders.formatter';
import {
	handleControllerError,
	buildErrorContext,
} from '../utils/error-handler.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { createApiError } from '../utils/error.util.js';
import {
	OrderListOptions,
	OrderGetOptions,
	OrderStatusUpdateOptions,
	OrderAnalyticsOptions,
	OrderStatus,
} from '../services/swell.orders.types.js';

/**
 * @namespace SwellOrdersController
 * @description Controller responsible for handling Swell order operations.
 *              Orchestrates calls to the orders service, applies business logic,
 *              and formats responses using the formatter.
 */

/**
 * @function list
 * @description Lists orders with status and date filtering.
 * @memberof SwellOrdersController
 * @param {Object} args - Arguments containing filtering and pagination options
 * @param {number} [args.page=1] - Page number for pagination
 * @param {number} [args.limit=20] - Number of orders per page
 * @param {OrderStatus|OrderStatus[]} [args.status] - Filter by order status
 * @param {string} [args.accountId] - Filter by customer account ID
 * @param {string} [args.accountEmail] - Filter by customer email
 * @param {string} [args.dateFrom] - Filter orders from this date (ISO format)
 * @param {string} [args.dateTo] - Filter orders to this date (ISO format)
 * @param {string} [args.search] - Search query
 * @param {string} [args.sort] - Sort order
 * @param {string[]} [args.expand] - Fields to expand in response
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted orders list
 * @throws {McpError} Throws an McpError if the service call fails
 */
async function list(
	args: {
		page?: number;
		limit?: number;
		status?: OrderStatus | OrderStatus[];
		accountId?: string;
		accountEmail?: string;
		dateFrom?: string;
		dateTo?: string;
		search?: string;
		sort?: string;
		expand?: string[];
	} = {},
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.orders.controller.ts',
		'list',
	);
	methodLogger.debug('Listing orders with options', args);

	try {
		// Apply defaults and validation
		const options: OrderListOptions = {
			page: args.page ?? 1,
			limit: Math.min(args.limit ?? 20, 100), // Cap at 100 items per page
			status: args.status,
			account_id: args.accountId,
			account_email: args.accountEmail,
			search: args.search,
			sort: args.sort ?? 'date_created_desc',
			expand: args.expand ?? ['items'],
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

		// Validate page and limit
		if (options.page! < 1) {
			throw createApiError('Page number must be greater than 0', 400);
		}
		if (options.limit! < 1) {
			throw createApiError('Limit must be greater than 0', 400);
		}

		// Validate status if provided
		if (options.status) {
			const validStatuses: OrderStatus[] = [
				'pending',
				'payment_pending',
				'delivery_pending',
				'hold',
				'complete',
				'canceled',
			];

			const statusesToValidate = Array.isArray(options.status)
				? options.status
				: [options.status];
			for (const status of statusesToValidate) {
				if (!validStatuses.includes(status)) {
					throw createApiError(
						`Invalid order status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`,
						400,
					);
				}
			}
		}

		methodLogger.debug('Calling orders service with options', options);

		// Call the service
		const data = await swellOrdersService.list(options);

		methodLogger.debug(
			`Successfully retrieved ${data.results?.length || 'unknown'} orders`,
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
		const formattedContent = formatOrdersList(data, options);
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Orders',
				'list',
				'controllers/swell.orders.controller.ts@list',
				'order listing',
				{ args },
			),
		);
	}
}

/**
 * @function get
 * @description Retrieves detailed order information with customer and item information.
 * @memberof SwellOrdersController
 * @param {Object} args - Arguments containing order ID and options
 * @param {string} args.orderId - The ID of the order to retrieve
 * @param {string[]} [args.expand] - Fields to expand in response
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted order details
 * @throws {McpError} Throws an McpError if the order is not found or service call fails
 */
async function get(args: {
	orderId: string;
	expand?: string[];
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.orders.controller.ts',
		'get',
	);
	methodLogger.debug(`Getting order details for ID: ${args.orderId}`);

	try {
		// Validate required parameters
		if (!args.orderId || args.orderId.trim().length === 0) {
			throw createApiError('Order ID is required', 400);
		}

		const options: OrderGetOptions = {
			expand: args.expand ?? ['items', 'payments', 'shipments'],
		};

		methodLogger.debug('Calling orders service with options', {
			orderId: args.orderId,
			options,
		});

		// Call the service
		const data = await swellOrdersService.get(args.orderId, options);

		methodLogger.debug(
			`Successfully retrieved order: ${data.number || args.orderId}`,
		);

		// Format the response
		const formattedContent = formatOrderDetails(data);
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Orders',
				'get',
				'controllers/swell.orders.controller.ts@get',
				args.orderId,
				{ args },
			),
		);
	}
}

/**
 * @function updateStatus
 * @description Updates order status with proper validation.
 * @memberof SwellOrdersController
 * @param {Object} args - Arguments containing order ID and status update options
 * @param {string} args.orderId - The ID of the order to update
 * @param {OrderStatus} args.status - New status for the order
 * @param {string} [args.notes] - Optional notes for the status update
 * @param {boolean} [args.sendEmail=false] - Whether to send notification email
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted updated order
 * @throws {McpError} Throws an McpError if the order is not found or update fails
 */
async function updateStatus(args: {
	orderId: string;
	status: OrderStatus;
	notes?: string;
	sendEmail?: boolean;
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.orders.controller.ts',
		'updateStatus',
	);
	methodLogger.debug(`Updating status for order ID: ${args.orderId}`, {
		status: args.status,
		notes: args.notes,
		sendEmail: args.sendEmail,
	});

	try {
		// Validate required parameters
		if (!args.orderId || args.orderId.trim().length === 0) {
			throw createApiError('Order ID is required', 400);
		}

		if (!args.status) {
			throw createApiError('Order status is required', 400);
		}

		// Validate status
		const validStatuses: OrderStatus[] = [
			'pending',
			'payment_pending',
			'delivery_pending',
			'hold',
			'complete',
			'canceled',
		];

		if (!validStatuses.includes(args.status)) {
			throw createApiError(
				`Invalid order status: ${args.status}. Valid statuses are: ${validStatuses.join(', ')}`,
				400,
			);
		}

		const options: OrderStatusUpdateOptions = {
			status: args.status,
			notes: args.notes,
			send_email: args.sendEmail ?? false,
		};

		methodLogger.debug('Calling orders service for status update', {
			orderId: args.orderId,
			options,
		});

		// Call the service
		const data = await swellOrdersService.updateStatus(
			args.orderId,
			options,
		);

		methodLogger.debug(
			`Successfully updated order status: ${data.number || args.orderId} -> ${args.status}`,
		);

		// Format the response
		const formattedContent = formatOrderDetails(data, {
			showStatusUpdate: true,
		});
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Orders',
				'updateStatus',
				'controllers/swell.orders.controller.ts@updateStatus',
				args.orderId,
				{ args },
			),
		);
	}
}

/**
 * @function getAnalytics
 * @description Retrieves order analytics with metrics and insights.
 * @memberof SwellOrdersController
 * @param {Object} args - Arguments containing analytics options
 * @param {string} [args.dateFrom] - Start date for analytics (ISO format)
 * @param {string} [args.dateTo] - End date for analytics (ISO format)
 * @param {OrderStatus|OrderStatus[]} [args.status] - Filter by order status
 * @param {string} [args.groupBy='day'] - Group analytics by time period
 * @param {string[]} [args.metrics] - Specific metrics to include
 * @returns {Promise<ControllerResponse>} A promise that resolves to formatted analytics
 * @throws {McpError} Throws an McpError if the analytics call fails
 */
async function getAnalytics(
	args: {
		dateFrom?: string;
		dateTo?: string;
		status?: OrderStatus | OrderStatus[];
		groupBy?: 'day' | 'week' | 'month' | 'year';
		metrics?: ('count' | 'total' | 'average')[];
	} = {},
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/swell.orders.controller.ts',
		'getAnalytics',
	);
	methodLogger.debug('Getting order analytics', args);

	try {
		// Apply defaults
		const options: OrderAnalyticsOptions = {
			date_from: args.dateFrom,
			date_to: args.dateTo,
			status: args.status,
			group_by: args.groupBy ?? 'day',
			metrics: args.metrics ?? ['count', 'total', 'average'],
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

		// Validate status if provided
		if (options.status) {
			const validStatuses: OrderStatus[] = [
				'pending',
				'payment_pending',
				'delivery_pending',
				'hold',
				'complete',
				'canceled',
			];

			const statusesToValidate = Array.isArray(options.status)
				? options.status
				: [options.status];
			for (const status of statusesToValidate) {
				if (!validStatuses.includes(status)) {
					throw createApiError(
						`Invalid order status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`,
						400,
					);
				}
			}
		}

		methodLogger.debug('Calling orders service for analytics', options);

		// Call the service
		const data = await swellOrdersService.getAnalytics(options);

		methodLogger.debug(
			`Successfully retrieved analytics data: ${data.count} orders`,
			{
				date_from: options.date_from,
				date_to: options.date_to,
				status: options.status,
			},
		);

		// Format the response
		const formattedContent = formatOrderAnalytics(data, options);
		return { content: formattedContent };
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Swell Orders',
				'getAnalytics',
				'controllers/swell.orders.controller.ts@getAnalytics',
				'order analytics',
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
	updateStatus,
	getAnalytics,
};
