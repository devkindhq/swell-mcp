import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { z } from 'zod';

import swellProductsController from '../controllers/swell.products.controller.js';

/**
 * Zod schema for the swell_list_products tool arguments
 */
const SwellListProductsSchema = z.object({
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
		.describe('Number of products per page (max: 100, default: 20)'),
	active: z
		.boolean()
		.optional()
		.describe(
			'Filter by active status (true for active only, false for inactive only)',
		),
	category: z.string().optional().describe('Filter by category slug or ID'),
	tags: z.array(z.string()).optional().describe('Filter by product tags'),
	sort: z
		.string()
		.optional()
		.default('date_created_desc')
		.describe(
			'Sort order (e.g., "date_created_desc", "name_asc", "price_asc")',
		),
	expand: z
		.array(z.string())
		.optional()
		.describe(
			'Fields to expand in response (e.g., ["variants", "categories", "images"])',
		),
});

/**
 * Zod schema for the swell_get_product tool arguments
 */
const SwellGetProductSchema = z.object({
	productId: z.string().min(1).describe('The ID of the product to retrieve'),
	expand: z
		.array(z.string())
		.optional()
		.default(['variants', 'categories', 'images'])
		.describe(
			'Fields to expand in response (default: ["variants", "categories", "images"])',
		),
});

/**
 * Zod schema for the swell_search_products tool arguments
 */
const SwellSearchProductsSchema = z.object({
	query: z.string().min(1).describe('Search query to find products'),
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
		.describe('Number of products per page (max: 100, default: 20)'),
	active: z
		.boolean()
		.optional()
		.describe(
			'Filter by active status (true for active only, false for inactive only)',
		),
	category: z.string().optional().describe('Filter by category slug or ID'),
	tags: z.array(z.string()).optional().describe('Filter by product tags'),
	sort: z
		.string()
		.optional()
		.default('relevance')
		.describe('Sort order (e.g., "relevance", "name_asc", "price_asc")'),
	expand: z
		.array(z.string())
		.optional()
		.describe(
			'Fields to expand in response (e.g., ["variants", "categories", "images"])',
		),
});

/**
 * Zod schema for the swell_check_inventory tool arguments
 */
const SwellCheckInventorySchema = z.object({
	productId: z
		.string()
		.min(1)
		.describe('The ID of the product to check inventory for'),
	includeVariants: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'Whether to include variant inventory information (default: true)',
		),
});

/**
 * @function handleSwellListProducts
 * @description MCP Tool handler to list products with filtering and pagination.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellListProducts(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.products.tool.ts',
		'handleSwellListProducts',
	);
	methodLogger.debug('Listing Swell products...', args);

	try {
		// Pass args directly to the controller
		const result = await swellProductsController.list(args);
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
		methodLogger.error('Error listing Swell products', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleSwellGetProduct
 * @description MCP Tool handler to get detailed product information.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellGetProduct(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.products.tool.ts',
		'handleSwellGetProduct',
	);
	methodLogger.debug(
		`Getting Swell product details for ID: ${args.productId}...`,
		args,
	);

	try {
		// Pass args directly to the controller
		const result = await swellProductsController.get(
			args as {
				productId: string;
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
			`Error getting Swell product ${args.productId}`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleSwellSearchProducts
 * @description MCP Tool handler to search products with multiple criteria.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellSearchProducts(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.products.tool.ts',
		'handleSwellSearchProducts',
	);
	methodLogger.debug(
		`Searching Swell products with query: "${args.query}"...`,
		args,
	);

	try {
		// Pass args directly to the controller
		const result = await swellProductsController.search(
			args as {
				query: string;
				page?: number;
				limit?: number;
				active?: boolean;
				category?: string;
				tags?: string[];
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
			`Error searching Swell products with query "${args.query}"`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleSwellCheckInventory
 * @description MCP Tool handler to check inventory levels for a product.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellCheckInventory(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.products.tool.ts',
		'handleSwellCheckInventory',
	);
	methodLogger.debug(
		`Checking inventory for Swell product ID: ${args.productId}...`,
		args,
	);

	try {
		// Pass args directly to the controller
		const result = await swellProductsController.checkInventory(
			args as {
				productId: string;
				includeVariants?: boolean;
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
			`Error checking inventory for Swell product ${args.productId}`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function registerTools
 * @description Registers the Swell product management tools with the MCP server.
 * @param {McpServer} server - The MCP server instance
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/swell.products.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering Swell product management tools...');

	server.tool(
		'swell_list_products',
		'List products from your Swell store with filtering and pagination options. Supports filtering by active status, category, tags, and various sorting options. Returns a formatted table of products with basic information including ID, name, SKU, price, stock status, and availability.',
		SwellListProductsSchema.shape,
		handleSwellListProducts,
	);

	server.tool(
		'swell_get_product',
		'Get detailed information for a specific product from your Swell store. Returns comprehensive product details including variants, categories, images, pricing, inventory, SEO information, and custom attributes. Use this tool when you need complete product information.',
		SwellGetProductSchema.shape,
		handleSwellGetProduct,
	);

	server.tool(
		'swell_search_products',
		'Search for products in your Swell store using text queries with optional filtering. Searches across product names, SKUs, descriptions, and tags. Returns ranked results with match information and supports the same filtering options as product listing.',
		SwellSearchProductsSchema.shape,
		handleSwellSearchProducts,
	);

	server.tool(
		'swell_check_inventory',
		'Check current inventory levels and stock status for a specific product in your Swell store. Returns detailed stock information including levels, status, and availability messages. Optionally includes variant-level inventory information.',
		SwellCheckInventorySchema.shape,
		handleSwellCheckInventory,
	);

	methodLogger.debug(
		'Successfully registered all Swell product management tools.',
	);
}

export default { registerTools };
