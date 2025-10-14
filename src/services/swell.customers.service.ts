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
	SwellCustomer,
	SwellCustomerSchema,
	SwellCustomersList,
	SwellCustomersListSchema,
	CustomerListOptions,
	CustomerSearchOptions,
	CustomerGetOptions,
	CustomerOrderHistoryOptions,
	CustomerAnalyticsOptions,
	CustomerUpdateOptions,
	CustomerUpdateOptionsSchema,
} from './swell.customers.types.js';
import { SwellOrdersList } from './swell.orders.types.js';
import swellOrdersService from './swell.orders.service.js';

// Create a contextualized logger for this file
const serviceLogger = Logger.forContext('services/swell.customers.service.ts');

// Log service initialization
serviceLogger.debug('Swell Customers service initialized');

/**
 * @namespace SwellCustomersService
 * @description Service layer for interacting with Swell Customers API.
 *              Handles customer listing, search, profile retrieval, and analytics.
 */

/**
 * @function list
 * @description Fetches a paginated list of customers from Swell with optional filtering.
 * @memberof SwellCustomersService
 * @param {CustomerListOptions} [options={}] - Optional filtering and pagination options
 * @returns {Promise<SwellCustomersList>} A promise that resolves to the customers list with pagination info
 * @throws {McpError} Throws an `McpError` if the API call fails or response validation fails
 * @example
 * // Get first 10 customers
 * const customers = await list({ limit: 10 });
 * // Get customers in a specific group
 * const groupCustomers = await list({ group_id: 'vip-customers', page: 1 });
 * // Get customers with high order value
 * const highValueCustomers = await list({ order_value: { $gte: 1000 } });
 */
async function list(
	options: CustomerListOptions = {},
): Promise<SwellCustomersList> {
	const methodLogger = serviceLogger.forMethod('list');
	methodLogger.debug('Fetching customers list', options);

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
		if (options.email) {
			queryParams.email = options.email;
		}
		if (options.first_name) {
			queryParams.first_name = options.first_name;
		}
		if (options.last_name) {
			queryParams.last_name = options.last_name;
		}
		if (options.phone) {
			queryParams.phone = options.phone;
		}
		if (options.group_id) {
			queryParams.group_id = options.group_id;
		}
		if (options.tags && options.tags.length > 0) {
			queryParams.tags = options.tags.join(',');
		}
		if (options.date_created) {
			queryParams.date_created = options.date_created;
		}
		if (options.date_updated) {
			queryParams.date_updated = options.date_updated;
		}
		if (options.order_count) {
			queryParams.order_count = options.order_count;
		}
		if (options.order_value) {
			queryParams.order_value = options.order_value;
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
		const rawData = await client.get<unknown>('/accounts', queryParams);

		// Validate response with Zod schema
		const validatedData = SwellCustomersListSchema.parse(rawData);

		methodLogger.debug(
			`Successfully fetched ${validatedData.results.length} customers`,
			{
				count: validatedData.count,
				page: validatedData.page,
				pages: validatedData.pages,
			},
		);

		return validatedData;
	} catch (error) {
		methodLogger.error('Service error fetching customers list', error);

		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			throw createApiError(
				`Customers list response validation failed: ${error.issues
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
			'Unexpected service error while fetching customers list',
			error,
		);
	}
}

/**
 * @function get
 * @description Fetches detailed information for a specific customer by ID.
 * @memberof SwellCustomersService
 * @param {string} customerId - The ID of the customer to retrieve
 * @param {CustomerGetOptions} [options={}] - Optional retrieval options
 * @returns {Promise<SwellCustomer>} A promise that resolves to the customer details
 * @throws {McpError} Throws an `McpError` if the customer is not found or API call fails
 * @example
 * // Get basic customer details
 * const customer = await get('customer-id-123');
 * // Get customer with expanded relationships
 * const customerWithOrders = await get('customer-id-123', { expand: ['orders', 'addresses'] });
 */
async function get(
	customerId: string,
	options: CustomerGetOptions = {},
): Promise<SwellCustomer> {
	const methodLogger = serviceLogger.forMethod('get');
	methodLogger.debug(
		`Fetching customer details for ID: ${customerId}`,
		options,
	);

	if (!customerId || customerId.trim().length === 0) {
		throw createApiError('Customer ID is required', 400);
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
			`/accounts/${customerId}`,
			queryParams,
		);

		// Handle null response (customer not found)
		if (!rawData) {
			throw createApiError(`Customer not found: ${customerId}`, 404);
		}

		// Validate response with Zod schema
		const validatedData = SwellCustomerSchema.parse(rawData);

		methodLogger.debug(
			`Successfully fetched customer: ${validatedData.email || customerId}`,
		);

		return validatedData;
	} catch (error) {
		methodLogger.error(
			`Service error fetching customer ${customerId}`,
			error,
		);

		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			throw createApiError(
				`Customer response validation failed: ${error.issues
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
			`Unexpected service error while fetching customer ${customerId}`,
			error,
		);
	}
}

/**
 * @function search
 * @description Searches for customers using various criteria.
 * @memberof SwellCustomersService
 * @param {CustomerSearchOptions} options - Search options including query and filters
 * @returns {Promise<SwellCustomersList>} A promise that resolves to the search results
 * @throws {McpError} Throws an `McpError` if the search fails or response validation fails
 * @example
 * // Search for customers by email
 * const results = await search({ query: 'john@example.com', limit: 20 });
 * // Search with additional filters
 * const filteredResults = await search({
 *   query: 'smith',
 *   group_id: 'vip-customers',
 *   sort: 'order_value_desc'
 * });
 */
async function search(
	options: CustomerSearchOptions,
): Promise<SwellCustomersList> {
	const methodLogger = serviceLogger.forMethod('search');
	methodLogger.debug('Searching customers', options);

	if (!options.query || options.query.trim().length === 0) {
		throw createApiError('Search query is required', 400);
	}

	try {
		// Use the list function with search parameter
		const searchOptions: CustomerListOptions = {
			search: options.query,
			page: options.page,
			limit: options.limit,
			group_id: options.group_id,
			tags: options.tags,
			sort: options.sort,
			expand: options.expand,
		};

		const results = await list(searchOptions);

		methodLogger.debug(
			`Search completed: found ${results.count} customers matching "${options.query}"`,
		);

		return results;
	} catch (error) {
		methodLogger.error(
			`Service error searching customers with query "${options.query}"`,
			error,
		);

		// Rethrow McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap any other unexpected errors
		throw createUnexpectedError(
			`Unexpected service error while searching customers with query "${options.query}"`,
			error,
		);
	}
}

/**
 * @function getOrderHistory
 * @description Retrieves order history for a specific customer.
 * @memberof SwellCustomersService
 * @param {CustomerOrderHistoryOptions} options - Order history options
 * @returns {Promise<SwellOrdersList>} A promise that resolves to the customer's order history
 * @throws {McpError} Throws an `McpError` if the customer is not found or API call fails
 * @example
 * // Get all orders for a customer
 * const orderHistory = await getOrderHistory({ customer_id: 'customer-id-123' });
 * // Get recent orders with status filter
 * const recentOrders = await getOrderHistory({
 *   customer_id: 'customer-id-123',
 *   status: 'complete',
 *   limit: 10,
 *   sort: 'date_created_desc'
 * });
 */
async function getOrderHistory(
	options: CustomerOrderHistoryOptions,
): Promise<SwellOrdersList> {
	const methodLogger = serviceLogger.forMethod('getOrderHistory');
	methodLogger.debug(
		`Fetching order history for customer: ${options.customer_id}`,
		options,
	);

	if (!options.customer_id || options.customer_id.trim().length === 0) {
		throw createApiError('Customer ID is required', 400);
	}

	try {
		// Build order list options for the customer
		const orderListOptions: Record<string, unknown> = {
			account_id: options.customer_id,
			page: options.page,
			limit: options.limit,
			sort: options.sort || 'date_created_desc',
			expand: ['items'],
		};

		// Add status filter if provided
		if (options.status) {
			orderListOptions.status = options.status;
		}

		// Add date filters if provided
		if (options.date_from || options.date_to) {
			const dateFilter: Record<string, string> = {};
			if (options.date_from) {
				dateFilter.$gte = options.date_from;
			}
			if (options.date_to) {
				dateFilter.$lte = options.date_to;
			}
			orderListOptions.date_created = dateFilter;
		}

		// Get orders using the orders service
		const orderHistory = await swellOrdersService.list(orderListOptions);

		methodLogger.debug(
			`Successfully fetched order history: ${orderHistory.count} orders for customer ${options.customer_id}`,
		);

		return orderHistory;
	} catch (error) {
		methodLogger.error(
			`Service error fetching order history for customer ${options.customer_id}`,
			error,
		);

		// Rethrow McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap any other unexpected errors
		throw createUnexpectedError(
			`Unexpected service error while fetching order history for customer ${options.customer_id}`,
			error,
		);
	}
}

/**
 * @function getAnalytics
 * @description Retrieves customer analytics and behavior insights.
 * @memberof SwellCustomersService
 * @param {CustomerAnalyticsOptions} [options={}] - Analytics options
 * @returns {Promise<SwellCustomersList>} A promise that resolves to customers data for analytics
 * @throws {McpError} Throws an `McpError` if the API call fails
 * @example
 * // Get analytics for all customers
 * const analytics = await getAnalytics({
 *   date_from: '2023-01-01',
 *   date_to: '2023-12-31',
 *   metrics: ['order_count', 'order_value', 'lifetime_value']
 * });
 * // Get analytics for a specific customer
 * const customerAnalytics = await getAnalytics({
 *   customer_id: 'customer-id-123',
 *   metrics: ['order_count', 'average_order_value']
 * });
 */
async function getAnalytics(
	options: CustomerAnalyticsOptions = {},
): Promise<SwellCustomersList> {
	const methodLogger = serviceLogger.forMethod('getAnalytics');
	methodLogger.debug('Fetching customer analytics', options);

	try {
		// Build list options for analytics
		const listOptions: CustomerListOptions = {
			limit: 1000, // Get more data for analytics
			expand: ['orders'], // Include order data for analytics
		};

		if (options.customer_id) {
			// Get specific customer analytics
			const customer = await get(options.customer_id, {
				expand: ['orders'],
			});
			return {
				count: 1,
				results: [customer],
				page: 1,
				pages: 1,
			};
		}

		if (options.group_id) {
			listOptions.group_id = options.group_id;
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

		// Sort by order value for analytics
		listOptions.sort = 'order_value_desc';

		// Get customers data
		const customersData = await list(listOptions);

		methodLogger.debug(
			`Successfully fetched analytics data: ${customersData.count} customers`,
			{
				customer_id: options.customer_id,
				group_id: options.group_id,
				date_from: options.date_from,
				date_to: options.date_to,
			},
		);

		return customersData;
	} catch (error) {
		methodLogger.error('Service error fetching customer analytics', error);

		// Rethrow McpErrors
		if (error instanceof McpError) {
			throw error;
		}

		// Wrap any other unexpected errors
		throw createUnexpectedError(
			'Unexpected service error while fetching customer analytics',
			error,
		);
	}
}

/**
 * @function update
 * @description Updates customer information in Swell.
 * @memberof SwellCustomersService
 * @param {string} customerId - The ID of the customer to update
 * @param {CustomerUpdateOptions} updateData - The customer data to update
 * @returns {Promise<SwellCustomer>} A promise that resolves to the updated customer
 * @throws {McpError} Throws an `McpError` if the customer is not found or API call fails
 * @example
 * // Update customer name
 * const updatedCustomer = await update('customer-id-123', {
 *   first_name: 'Babar',
 *   last_name: 'Ali'
 * });
 * // Update customer email and phone
 * const updatedCustomer = await update('customer-id-123', {
 *   email: 'babar.ali@example.com',
 *   phone: '+1234567890'
 * });
 */
async function update(
	customerId: string,
	updateData: CustomerUpdateOptions,
): Promise<SwellCustomer> {
	const methodLogger = serviceLogger.forMethod('update');
	methodLogger.debug(`Updating customer ${customerId}`, {
		customerId,
		updateData,
	});

	if (!customerId || customerId.trim().length === 0) {
		throw createApiError('Customer ID is required', 400);
	}

	try {
		// Ensure client is initialized
		if (!swellClient.isClientInitialized()) {
			swellClient.initWithAutoConfig();
		}

		const client = swellClient.getClient();

		// Validate update data with Zod schema
		const validatedData = CustomerUpdateOptionsSchema.parse(updateData);

		// Make the API call
		const rawData = await client.put<unknown>(
			`/accounts/${customerId}`,
			validatedData,
		);

		// Handle null response (customer not found)
		if (!rawData) {
			throw createApiError(`Customer not found: ${customerId}`, 404);
		}

		// Check if debug mode is enabled
		const isDebugMode = config.getBoolean('DEBUG', false);

		if (isDebugMode) {
			methodLogger.debug(
				'Debug mode enabled - returning raw data without validation',
			);
			return rawData as SwellCustomer;
		}

		// Validate response with Zod schema
		const validatedCustomer = SwellCustomerSchema.parse(rawData);

		methodLogger.debug(
			`Successfully updated customer: ${validatedCustomer.first_name} ${validatedCustomer.last_name}`,
		);

		return validatedCustomer;
	} catch (error) {
		methodLogger.error(
			`Service error updating customer ${customerId}`,
			error,
		);

		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			throw createApiError(
				`Customer update validation failed: ${error.issues
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
			`Unexpected service error while updating customer ${customerId}`,
			error,
		);
	}
}

export default {
	list,
	get,
	search,
	getOrderHistory,
	getAnalytics,
	update,
};
