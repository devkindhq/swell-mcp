import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { z } from 'zod';

import swellCustomersController from '../controllers/swell.customers.controller.js';

/**
 * Zod schema for the swell_list_customers tool arguments
 */
const SwellListCustomersSchema = z.object({
	page: z
		.number()
		.int()
		.min(1)
		.optional()
		.default(1)
		.describe('Page number for pagination (default: 1)'),
	limit: z
		.number()
		.int()
		.min(1)
		.max(100)
		.optional()
		.default(20)
		.describe('Number of customers per page (max: 100, default: 20)'),
	search: z.string().optional().describe('Search customers by name or email'),
	email: z.string().optional().describe('Filter by specific email address'),
	dateFrom: z
		.string()
		.optional()
		.describe(
			'Filter customers created from this date (ISO format: YYYY-MM-DD)',
		),
	dateTo: z
		.string()
		.optional()
		.describe(
			'Filter customers created to this date (ISO format: YYYY-MM-DD)',
		),
	sort: z
		.string()
		.optional()
		.default('date_created_desc')
		.describe(
			'Sort order (e.g., "date_created_desc", "name_asc", "order_value_desc")',
		),
	expand: z
		.array(z.string())
		.optional()
		.describe(
			'Fields to expand in response (e.g., ["orders", "addresses"])',
		),
});

/**
 * Zod schema for the swell_get_customer tool arguments
 */
const SwellGetCustomerSchema = z.object({
	customerId: z
		.string()
		.min(1)
		.describe('The ID of the customer to retrieve'),
	expand: z
		.array(z.string())
		.optional()
		.default(['orders', 'addresses'])
		.describe(
			'Fields to expand in response (default: ["orders", "addresses"])',
		),
	includeOrderHistory: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'Whether to include order history in the response (default: true)',
		),
});

/**
 * Zod schema for the swell_search_customers tool arguments
 */
const SwellSearchCustomersSchema = z.object({
	query: z
		.string()
		.min(1)
		.describe(
			'Search query to find customers (searches name, email, phone)',
		),
	page: z
		.number()
		.int()
		.min(1)
		.optional()
		.default(1)
		.describe('Page number for pagination (default: 1)'),
	limit: z
		.number()
		.int()
		.min(1)
		.max(100)
		.optional()
		.default(20)
		.describe('Number of customers per page (max: 100, default: 20)'),
	dateFrom: z
		.string()
		.optional()
		.describe(
			'Filter customers created from this date (ISO format: YYYY-MM-DD)',
		),
	dateTo: z
		.string()
		.optional()
		.describe(
			'Filter customers created to this date (ISO format: YYYY-MM-DD)',
		),
	sort: z
		.string()
		.optional()
		.default('relevance')
		.describe(
			'Sort order (e.g., "relevance", "name_asc", "date_created_desc")',
		),
	expand: z
		.array(z.string())
		.optional()
		.describe(
			'Fields to expand in response (e.g., ["orders", "addresses"])',
		),
});

/**
 * @function handleSwellListCustomers
 * @description MCP Tool handler to list customers with search capabilities.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellListCustomers(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.customers.tool.ts',
		'handleSwellListCustomers',
	);
	methodLogger.debug('Listing Swell customers...', args);

	try {
		// Pass args directly to the controller
		const result = await swellCustomersController.list(args);
		methodLogger.debug('Got the response from the controller', result);

		// Format the response for the MCP tool
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Error listing Swell customers', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleSwellGetCustomer
 * @description MCP Tool handler to get customer profile and history.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellGetCustomer(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.customers.tool.ts',
		'handleSwellGetCustomer',
	);
	methodLogger.debug(
		`Getting Swell customer details for ID: ${args.customerId}...`,
		args,
	);

	try {
		// Pass args directly to the controller
		const result = await swellCustomersController.get(
			args as {
				customerId: string;
				expand?: string[];
			},
		);
		methodLogger.debug('Got the response from the controller', result);

		// Format the response for the MCP tool
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error(
			`Error getting Swell customer ${args.customerId}`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleSwellSearchCustomers
 * @description MCP Tool handler to search customers with multiple criteria.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellSearchCustomers(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.customers.tool.ts',
		'handleSwellSearchCustomers',
	);
	methodLogger.debug(
		`Searching Swell customers with query: "${args.query}"...`,
		args,
	);

	try {
		// Pass args directly to the controller
		const result = await swellCustomersController.search(
			args as {
				query: string;
				page?: number;
				limit?: number;
				dateFrom?: string;
				dateTo?: string;
				sort?: string;
				expand?: string[];
			},
		);
		methodLogger.debug('Got the response from the controller', result);

		// Format the response for the MCP tool
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error(
			`Error searching Swell customers with query "${args.query}"`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function registerTools
 * @description Registers the Swell customer management tools with the MCP server.
 * @param {McpServer} server - The MCP server instance
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/swell.customers.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering Swell customer management tools...');

	server.tool(
		'swell_list_customers',
		'List customers from your Swell store with search and filtering options. Supports filtering by email, date range, and various sorting options. Returns a formatted table of customers with basic information including name, email, order count, total value, and registration date.',
		SwellListCustomersSchema.shape,
		handleSwellListCustomers,
	);

	server.tool(
		'swell_get_customer',
		'Get detailed information for a specific customer from your Swell store. Returns comprehensive customer profile including personal information, addresses, order history, and customer analytics. Use this tool when you need complete customer information.',
		SwellGetCustomerSchema.shape,
		handleSwellGetCustomer,
	);

	server.tool(
		'swell_search_customers',
		'Search for customers in your Swell store using text queries. Searches across customer names, email addresses, and phone numbers. Returns ranked results with match information and supports filtering by date range and sorting options.',
		SwellSearchCustomersSchema.shape,
		handleSwellSearchCustomers,
	);

	methodLogger.debug(
		'Successfully registered all Swell customer management tools.',
	);
}

export default { registerTools };
