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
 * Zod schema for the swell_check_stock tool arguments
 */
const SwellCheckStockSchema = z.object({
	productId: z
		.string()
		.min(1)
		.describe('The ID of the product to check stock for'),
	includeVariants: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'Whether to include variant stock information (default: true)',
		),
});

/**
 * Zod schema for the swell_update_product tool arguments
 */
const SwellUpdateProductSchema = z.object({
	productId: z.string().min(1).describe('The ID of the product to update'),
	name: z.string().optional().describe('Product name'),
	description: z.string().optional().describe('Product description'),
	price: z
		.number()
		.positive()
		.optional()
		.describe('Product price (must be greater than 0)'),
	salePrice: z
		.number()
		.positive()
		.nullable()
		.optional()
		.describe(
			'Product sale price (must be greater than 0, null to remove)',
		),
	sku: z.string().optional().describe('Product SKU'),
	active: z.boolean().optional().describe('Product active status'),
	stockLevel: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe('Stock level (must be non-negative)'),
	stockStatus: z
		.enum(['in_stock', 'out_of_stock', 'backorder', 'preorder'])
		.optional()
		.describe('Stock status'),
	metaTitle: z.string().optional().describe('SEO meta title'),
	metaDescription: z.string().optional().describe('SEO meta description'),
	tags: z.array(z.string()).optional().describe('Product tags'),
	categories: z
		.array(z.string())
		.optional()
		.describe('Product categories (IDs or slugs)'),
	attributes: z
		.record(z.unknown())
		.optional()
		.describe('Custom product attributes'),
});

/**
 * Zod schema for the swell_update_product_stock tool arguments (adjustment-only)
 */
const SwellUpdateProductStockSchema = z.object({
	productId: z
		.string()
		.min(1)
		.describe('The ID of the product to update stock for'),
	quantity: z
		.number()
		.int()
		.describe(
			'Quantity adjustment (positive to increase, negative to decrease)',
		),
	reason: z
		.enum([
			'received',
			'returned',
			'canceled',
			'sold',
			'missing',
			'damaged',
		])
		.optional()
		.describe('Reason for the stock adjustment'),
	reasonMessage: z
		.string()
		.optional()
		.describe('Optional message describing the reason'),
	variantId: z
		.string()
		.optional()
		.describe('Optional variant ID for variant-level adjustments'),
	orderId: z
		.string()
		.optional()
		.describe('Optional order ID when adjustment is related to an order'),
});

/**
 * Zod schema for the swell_update_product_stock tool arguments
 */
// adjustment-only SwellUpdateProductStockSchema is defined earlier (only accepts quantity/reason/etc.)

/**
 * Zod schema for the swell_update_product_pricing tool arguments
 */
const SwellUpdateProductPricingSchema = z.object({
	productId: z
		.string()
		.min(1)
		.describe('The ID of the product to update pricing for'),
	price: z
		.number()
		.positive()
		.optional()
		.describe('Regular price (must be greater than 0)'),
	salePrice: z
		.number()
		.positive()
		.nullable()
		.optional()
		.describe('Sale price (must be greater than 0, null to remove)'),
	currency: z.string().optional().describe('Currency code (e.g., USD, EUR)'),
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
 * @function handleSwellCheckStock
 * @description MCP Tool handler to check stock levels for a product.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellCheckStock(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.products.tool.ts',
		'handleSwellCheckStock',
	);
	methodLogger.debug(
		`Checking stock for Swell product ID: ${args.productId}...`,
		args,
	);

	try {
		// Pass args directly to the controller
		const result = await swellProductsController.checkStock(
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
			`Error checking stock for Swell product ${args.productId}`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleSwellUpdateProduct
 * @description MCP Tool handler to update product information.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellUpdateProduct(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.products.tool.ts',
		'handleSwellUpdateProduct',
	);
	methodLogger.debug(`Updating Swell product ID: ${args.productId}...`, args);

	try {
		// Pass args directly to the controller
		const result = await swellProductsController.update(
			args as {
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
			`Error updating Swell product ${args.productId}`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleSwellUpdateProductStock
 * @description MCP Tool handler to update product stock information.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellUpdateProductStock(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.products.tool.ts',
		'handleSwellUpdateProductStock',
	);
	methodLogger.debug(
		`Updating stock for Swell product ID: ${args.productId}...`,
		args,
	);

	try {
		// Pass args directly to the controller
		const result = await swellProductsController.updateStock(
			args as {
				productId: string;
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
			`Error updating stock for Swell product ${args.productId}`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleSwellUpdateProductPricing
 * @description MCP Tool handler to update product pricing information.
 * @param {Record<string, unknown>} args - Arguments provided to the tool
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue
 */
async function handleSwellUpdateProductPricing(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/swell.products.tool.ts',
		'handleSwellUpdateProductPricing',
	);
	methodLogger.debug(
		`Updating pricing for Swell product ID: ${args.productId}...`,
		args,
	);

	try {
		// Pass args directly to the controller
		const result = await swellProductsController.updatePricing(
			args as {
				productId: string;
				price?: number;
				salePrice?: number;
				currency?: string;
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
			`Error updating pricing for Swell product ${args.productId}`,
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
		{ readOnlyHint: true, openWorldHint: false },
		handleSwellListProducts,
	);

	server.tool(
		'swell_get_product',
		'Get detailed information for a specific product from your Swell store. Returns comprehensive product details including variants, categories, images, pricing, inventory, SEO information, and custom attributes. Use this tool when you need complete product information.',
		SwellGetProductSchema.shape,
		{ readOnlyHint: true, openWorldHint: false },
		handleSwellGetProduct,
	);

	server.tool(
		'swell_search_products',
		'Search for products in your Swell store using text queries with optional filtering. Searches across product names, SKUs, descriptions, and tags. Returns ranked results with match information and supports the same filtering options as product listing.',
		SwellSearchProductsSchema.shape,
		{ readOnlyHint: true, openWorldHint: false },
		handleSwellSearchProducts,
	);

	server.tool(
		'swell_check_stock',
		'Check current stock levels and stock status for a specific product in your Swell store. Returns detailed stock information including levels, status, and availability messages. Optionally includes variant-level stock information.',
		SwellCheckStockSchema.shape,
		{ readOnlyHint: true, openWorldHint: false },
		handleSwellCheckStock,
	);

	server.tool(
		'swell_update_product',
		'Update product information in your Swell store. Allows modification of product details including name, description, pricing, stock, SEO fields, categories, tags, and custom attributes. Returns a summary of changes made with before/after values.',
		SwellUpdateProductSchema.shape,
		{
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
		handleSwellUpdateProduct,
	);

	server.tool(
		'swell_update_product_stock',
		'Update stock-specific information for a product in your Swell store. Allows modification of stock levels, stock status, and stock tracking settings. Use this tool for focused stock management operations.',
		SwellUpdateProductStockSchema.shape,
		{
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
		handleSwellUpdateProductStock,
	);

	server.tool(
		'swell_update_product_pricing',
		'Update pricing information for a product in your Swell store. Allows modification of regular price, sale price, and currency. Includes validation to ensure sale price is not higher than regular price.',
		SwellUpdateProductPricingSchema.shape,
		{
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
		handleSwellUpdateProductPricing,
	);

	methodLogger.debug(
		'Successfully registered all Swell product management tools.',
	);
}

export default { registerTools };
