import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { z } from 'zod';

import swellOrdersController from '../controllers/swell.orders.controller.js';

/**
 * Zod schema for the swell_list_orders tool arguments
 */
const SwellListOrdersSchema = z.object({
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
		.describe('Number of orders per page (max: 100, default: 20)'),
	status: z
		.enum([
			'pending',
			'payment_pending',
			'delivery_pending',
			'complete',
			'canceled',
		])
		.optional()
		.describe('Filter by order status'),
	customerId: z.string().optional().describe('Filter by customer ID'),
	dateFrom: z
		.string()
		.optional()
		.describe('Filter orders from this date (ISO format: YYYY-MM-DD)'),
	dateTo: z
		.string()
		.optional()
		.describe('Filter orders to this date (ISO format: YYYY-MM-DD)'),
	sort: z
		.string()
		.optional()
		.default('date_created_desc')
		.describe(
			'Sort order (e.g., "date_created_desc", "date_created_asc", "grand_total_desc")',
		),
	expand: z
		.array(z.string())
		.optional()
		.describe(
			'Fields to expand in response (e.g., ["items", "account", "billing", "shipping"])',
		),
});

/**
 * Zod schema for the swell_get_order tool arguments
 */
const SwellGetOrderSchema = z.object({
	orderId: z.string().min(1).describe('The ID of the order to retrieve'),
	expand: z
		.array(z.string())
		.optional()
		.default(['items', 'account', 'billing', 'shipping'])
		.describe(
			'Fields to expand in response (default: ["items", "account", "billing", "shipping"])',
		),
});

/**
 * Zod schema for the swell_update_order_status tool arguments
 */
const SwellUpdateOrderStatusSchema = z.object({
	orderId: z.string().min(1).describe('The ID of the order to update'),
	status: z
		.enum([
			'pending',
			'payment_pending',
			'delivery_pending',
			'complete',
			'canceled',
		])
		.describe('New status for the order'),
	notes: z
		.string()
		.optional()
		.describe('Optional notes about the status change'),
});

/**
 * @function handleSwellListOrders
 * @description MCP Tool handler to list orders with status filtering.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellListOrders(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.orders.tool.ts',
		'handleSwellListOrders',
	);
	methodLogger.debug('Listing Swell orders...', args);

	try {
		// Pass args directly to the controller
		const result = await swellOrdersController.list(args);
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
		methodLogger.error('Error listing Swell orders', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleSwellGetOrder
 * @description MCP Tool handler to get detailed order information.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellGetOrder(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.orders.tool.ts',
		'handleSwellGetOrder',
	);
	methodLogger.debug(
		`Getting Swell order details for ID: ${args.orderId}...`,
		args,
	);

	try {
		// Pass args directly to the controller
		const result = await swellOrdersController.get(
			args as {
				orderId: string;
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
		methodLogger.error(`Error getting Swell order ${args.orderId}`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleSwellUpdateOrderStatus
 * @description MCP Tool handler to update order status.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellUpdateOrderStatus(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.orders.tool.ts',
		'handleSwellUpdateOrderStatus',
	);
	methodLogger.debug(
		`Updating Swell order status for ID: ${args.orderId} to ${args.status}...`,
		args,
	);

	try {
		// Pass args directly to the controller
		const result = await swellOrdersController.updateStatus(
			args as {
				orderId: string;
				status:
					| 'pending'
					| 'payment_pending'
					| 'delivery_pending'
					| 'complete'
					| 'canceled';
				notes?: string;
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
			`Error updating Swell order status for ${args.orderId}`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function registerTools
 * @description Registers the Swell order management tools with the MCP server.
 * @param {McpServer} server - The MCP server instance
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/swell.orders.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering Swell order management tools...');

	server.tool(
		'swell_list_orders',
		'List orders from your Swell store with filtering options. Supports filtering by status, customer, date range, and various sorting options. Returns a formatted table of orders with basic information including order number, customer, status, total, and dates.',
		SwellListOrdersSchema.shape,
		handleSwellListOrders,
	);

	server.tool(
		'swell_get_order',
		'Get detailed information for a specific order from your Swell store. Returns comprehensive order details including items, customer information, billing and shipping addresses, payment details, and order history. Use this tool when you need complete order information.',
		SwellGetOrderSchema.shape,
		handleSwellGetOrder,
	);

	server.tool(
		'swell_update_order_status',
		'Update the status of an order in your Swell store. Allows changing order status to pending, payment_pending, delivery_pending, complete, or canceled. Optionally add notes about the status change. Returns the updated order information.',
		SwellUpdateOrderStatusSchema.shape,
		handleSwellUpdateOrderStatus,
	);

	methodLogger.debug(
		'Successfully registered all Swell order management tools.',
	);
}

export default { registerTools };
