import { z } from 'zod';
import { Logger } from '../utils/logger.util.js';
import { config } from '../utils/config.util.js';
import { swellClient } from '../utils/swell-client.util.js';
import {
	createApiError,
	createUnexpectedError,
	McpError,
} from '../utils/error.util.js';
import {
	SwellOrder,
	SwellOrderSchema,
	SwellOrdersList,
	SwellOrdersListSchema,
	OrderListOptions,
	OrderGetOptions,
	OrderStatusUpdateOptions,
	OrderAnalyticsOptions,
	OrderStatus,
} from './swell.orders.types.js';

// Create a contextualized logger for this file
const serviceLogger = Logger.forContext('services/swell.orders.service.ts');

// Log service initialization
serviceLogger.debug('Swell Orders service initialized');

/**
 * @namespace SwellOrdersService
 * @description Service layer for interacting with Swell Orders API.
 *              Handles order listing, retrieval, status updates, and analytics.
 */

/**
 * @function list
 * @description Fetches a paginated list of orders from Swell with optional filtering.
 * @memberof SwellOrdersService
 * @param {OrderListOptions} [options={}] - Optional filtering and pagination options
 * @returns {Promise<SwellOrdersList>} A promise that resolves to the orders list with pagination info
 * @throws {McpError} Throws an `McpError` if the API call fails or response validation fails
 * @example
 * // Get first 10 orders
 * const orders = await list({ limit: 10 });
 * // Get orders with specific status
 * const pendingOrders = await list({ status: 'pending', page: 1 });
 * // Get orders for a specific customer
 * const customerOrders = await list({ account_email: 'customer@example.com' });
 */
async function list(options: OrderListOptions = {}): Promise<SwellOrdersList> {
	const methodLogger = serviceLogger.forMethod('list');
	methodLogger.debug('Fetching orders list', options);

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
		if (options.status !== undefined) {
			if (Array.isArray(options.status)) {
				queryParams.status = { $in: options.status };
			} else {
				queryParams.status = options.status;
			}
		}
		if (options.account_id) {
			queryParams.account_id = options.account_id;
		}
		if (options.account_email) {
			queryParams.account_email = options.account_email;
		}
		if (options.date_created) {
			queryParams.date_created = options.date_created;
		}
		if (options.date_updated) {
			queryParams.date_updated = options.date_updated;
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
		const rawData = await client.get<unknown>('/orders', queryParams);

		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		if (isDebugMode) {
			methodLogger.debug(
				'Debug mode enabled - returning raw data without validation',
			);
			return rawData as SwellOrdersList;
		}

		// Validate response with Zod schema
		const validatedData = SwellOrdersListSchema.parse(rawData);

		methodLogger.debug(
			`Successfully fetched ${validatedData.results.length} orders`,
			{
				count: validatedData.count,
				page: validatedData.page,
				pages: validatedData.pages,
			},
		);

		return validatedData;
	} catch (error) {
		methodLogger.error('Service error fetching orders list', error);

		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			throw createApiError(
				`Orders list response validation failed: ${error.issues
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
			'Unexpected service error while fetching orders list',
			error,
		);
	}
}

/**
 * @function get
 * @description Fetches detailed information for a specific order by ID.
 * @memberof SwellOrdersService
 * @param {string} orderId - The ID of the order to retrieve
 * @param {OrderGetOptions} [options={}] - Optional retrieval options
 * @returns {Promise<SwellOrder>} A promise that resolves to the order details
 * @throws {McpError} Throws an `McpError` if the order is not found or API call fails
 * @example
 * // Get basic order details
 * const order = await get('order-id-123');
 * // Get order with expanded relationships
 * const orderWithItems = await get('order-id-123', { expand: ['items', 'payments', 'shipments'] });
 */
async function get(
	orderId: string,
	options: OrderGetOptions = {},
): Promise<SwellOrder> {
	const methodLogger = serviceLogger.forMethod('get');
	methodLogger.debug(`Fetching order details for ID: ${orderId}`, options);

	if (!orderId || orderId.trim().length === 0) {
		throw createApiError('Order ID is required', 400);
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
			`/orders/${orderId}`,
			queryParams,
		);

		// Handle null response (order not found)
		if (!rawData) {
			throw createApiError(`Order not found: ${orderId}`, 404);
		}

		// Validate response with Zod schema
		const validatedData = SwellOrderSchema.parse(rawData);

		methodLogger.debug(
			`Successfully fetched order: ${validatedData.number || orderId}`,
		);

		return validatedData;
	} catch (error) {
		methodLogger.error(`Service error fetching order ${orderId}`, error);

		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			throw createApiError(
				`Order response validation failed: ${error.issues
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
			`Unexpected service error while fetching order ${orderId}`,
			error,
		);
	}
}

/**
 * @function updateStatus
 * @description Updates the status of a specific order.
 * @memberof SwellOrdersService
 * @param {string} orderId - The ID of the order to update
 * @param {OrderStatusUpdateOptions} options - Status update options
 * @returns {Promise<SwellOrder>} A promise that resolves to the updated order
 * @throws {McpError} Throws an `McpError` if the order is not found or update fails
 * @example
 * // Update order status to complete
 * const updatedOrder = await updateStatus('order-id-123', {
 *   status: 'complete',
 *   notes: 'Order fulfilled successfully',
 *   send_email: true
 * });
 */
async function updateStatus(
	orderId: string,
	options: OrderStatusUpdateOptions,
): Promise<SwellOrder> {
	const methodLogger = serviceLogger.forMethod('updateStatus');
	methodLogger.debug(`Updating status for order ID: ${orderId}`, options);

	if (!orderId || orderId.trim().length === 0) {
		throw createApiError('Order ID is required', 400);
	}

	if (!options.status) {
		throw createApiError('Order status is required', 400);
	}

	// Validate status value
	const validStatuses: OrderStatus[] = [
		'pending',
		'payment_pending',
		'delivery_pending',
		'hold',
		'complete',
		'canceled',
	];

	if (!validStatuses.includes(options.status)) {
		throw createApiError(
			`Invalid order status: ${options.status}. Valid statuses are: ${validStatuses.join(', ')}`,
			400,
		);
	}

	try {
		// Ensure client is initialized
		if (!swellClient.isClientInitialized()) {
			swellClient.initWithAutoConfig();
		}

		const client = swellClient.getClient();

		// Build update data
		const updateData: Record<string, unknown> = {
			status: options.status,
		};

		if (options.notes) {
			updateData.notes = options.notes;
		}

		if (options.send_email !== undefined) {
			updateData.send_email = options.send_email;
		}

		// Make the API call
		const rawData = await client.put<unknown>(
			`/orders/${orderId}`,
			updateData,
		);

		// Handle null response (order not found)
		if (!rawData) {
			throw createApiError(`Order not found: ${orderId}`, 404);
		}

		// Validate response with Zod schema
		const validatedData = SwellOrderSchema.parse(rawData);

		methodLogger.debug(
			`Successfully updated order status: ${validatedData.number || orderId} -> ${options.status}`,
		);

		return validatedData;
	} catch (error) {
		methodLogger.error(
			`Service error updating order status ${orderId}`,
			error,
		);

		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			throw createApiError(
				`Order update response validation failed: ${error.issues
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
			`Unexpected service error while updating order status ${orderId}`,
			error,
		);
	}
}

/**
 * @function getAnalytics
 * @description Retrieves order analytics and reporting data.
 * @memberof SwellOrdersService
 * @param {OrderAnalyticsOptions} [options={}] - Analytics options
 * @returns {Promise<SwellOrdersList>} A promise that resolves to orders data for analytics
 * @throws {McpError} Throws an `McpError` if the API call fails
 * @example
 * // Get orders for the last 30 days
 * const analytics = await getAnalytics({
 *   date_from: '2023-01-01',
 *   date_to: '2023-01-31',
 *   group_by: 'day'
 * });
 * // Get completed orders analytics
 * const completedAnalytics = await getAnalytics({
 *   status: 'complete',
 *   metrics: ['count', 'total', 'average']
 * });
 */
async function getAnalytics(
	options: OrderAnalyticsOptions = {},
): Promise<SwellOrdersList> {
	const methodLogger = serviceLogger.forMethod('getAnalytics');
	methodLogger.debug('Fetching order analytics', options);

	try {
		// Build list options for analytics
		const listOptions: OrderListOptions = {
			limit: 1000, // Get more data for analytics
		};

		if (options.status) {
			listOptions.status = options.status;
		}

		if (options.date_from || options.date_to) {
			listOptions.date_created = {};
			if (options.date_from) {
				listOptions.date_created.$gte = options.date_from;
			}
			if (options.date_to) {
				listOptions.date_created.$lte = options.date_to;
			}
		}

		// Sort by date for analytics
		listOptions.sort = 'date_created';

		// Expand items for detailed analytics
		listOptions.expand = ['items'];

		// Get orders data
		const ordersData = await list(listOptions);

		methodLogger.debug(
			`Successfully fetched analytics data: ${ordersData.count} orders`,
			{
				date_from: options.date_from,
				date_to: options.date_to,
				status: options.status,
			},
		);

		return ordersData;
	} catch (error) {
		methodLogger.error('Service error fetching order analytics', error);

		// Rethrow McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap any other unexpected errors
		throw createUnexpectedError(
			'Unexpected service error while fetching order analytics',
			error,
		);
	}
}

export default {
	list,
	get,
	updateStatus,
	getAnalytics,
};
