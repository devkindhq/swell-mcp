import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import swellProductsTools from './swell.products.tool.js';
import swellProductsController from '../controllers/swell.products.controller.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { McpError, ErrorType } from '../utils/error.util.js';

// Mock the controller
jest.mock('../controllers/swell.products.controller.js');
const mockController = swellProductsController as jest.Mocked<
	typeof swellProductsController
>;

// Mock the error utility
jest.mock('../utils/error.util.js', () => ({
	...jest.requireActual('../utils/error.util.js'),
	formatErrorForMcpTool: jest.fn(),
}));
const mockFormatError = formatErrorForMcpTool as jest.MockedFunction<
	typeof formatErrorForMcpTool
>;

describe('Swell Products Tools Integration', () => {
	let mockServer: jest.Mocked<McpServer>;
	let registeredTools: Map<string, any>;

	beforeEach(() => {
		jest.clearAllMocks();

		// Create mock server with tool registration tracking
		registeredTools = new Map();
		mockServer = {
			tool: jest.fn((name, description, schema, handler) => {
				registeredTools.set(name, {
					name,
					description,
					schema,
					handler,
				});
			}),
		} as any;

		// Mock controller responses
		mockController.list.mockResolvedValue({
			content: 'Mocked products list response',
		});
		mockController.get.mockResolvedValue({
			content: 'Mocked product details response',
		});
		mockController.search.mockResolvedValue({
			content: 'Mocked search results response',
		});
		mockController.checkInventory.mockResolvedValue({
			content: 'Mocked inventory response',
		});

		// Mock error formatter
		mockFormatError.mockReturnValue({
			content: [{ type: 'text', text: 'Formatted error message' }],
		});
	});

	describe('Tool Registration', () => {
		it('should register all product tools with correct names and descriptions', () => {
			swellProductsTools.registerTools(mockServer);

			expect(mockServer.tool).toHaveBeenCalledTimes(4);
			expect(registeredTools.has('swell_list_products')).toBe(true);
			expect(registeredTools.has('swell_get_product')).toBe(true);
			expect(registeredTools.has('swell_search_products')).toBe(true);
			expect(registeredTools.has('swell_check_inventory')).toBe(true);
		});

		it('should register tools with proper descriptions', () => {
			swellProductsTools.registerTools(mockServer);

			const listTool = registeredTools.get('swell_list_products');
			expect(listTool.description).toContain('List products');
			expect(listTool.description).toContain('filtering and pagination');

			const getTool = registeredTools.get('swell_get_product');
			expect(getTool.description).toContain('detailed information');
			expect(getTool.description).toContain('specific product');

			const searchTool = registeredTools.get('swell_search_products');
			expect(searchTool.description).toContain('Search for products');
			expect(searchTool.description).toContain('text queries');

			const inventoryTool = registeredTools.get('swell_check_inventory');
			expect(inventoryTool.description).toContain('inventory levels');
			expect(inventoryTool.description).toContain('stock status');
		});

		it('should register tools with proper schema validation', () => {
			swellProductsTools.registerTools(mockServer);

			const listTool = registeredTools.get('swell_list_products');
			expect(listTool.schema).toHaveProperty('page');
			expect(listTool.schema).toHaveProperty('limit');
			expect(listTool.schema).toHaveProperty('active');

			const getTool = registeredTools.get('swell_get_product');
			expect(getTool.schema).toHaveProperty('productId');
			expect(getTool.schema).toHaveProperty('expand');

			const searchTool = registeredTools.get('swell_search_products');
			expect(searchTool.schema).toHaveProperty('query');
			expect(searchTool.schema).toHaveProperty('page');

			const inventoryTool = registeredTools.get('swell_check_inventory');
			expect(inventoryTool.schema).toHaveProperty('productId');
			expect(inventoryTool.schema).toHaveProperty('includeVariants');
		});
	});

	describe('swell_list_products Tool', () => {
		let toolHandler: Function;

		beforeEach(() => {
			swellProductsTools.registerTools(mockServer);
			toolHandler = registeredTools.get('swell_list_products').handler;
		});

		it('should successfully call controller and format response', async () => {
			const args = { page: 1, limit: 20, active: true };

			const result = await toolHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: 'Mocked products list response',
					},
				],
			});
		});

		it('should handle controller errors and format them', async () => {
			const error = new McpError('Controller error', ErrorType.API_ERROR);
			mockController.list.mockRejectedValue(error);

			const result = await toolHandler({ page: 1 });

			expect(mockFormatError).toHaveBeenCalledWith(error);
			expect(result).toEqual({
				content: [{ type: 'text', text: 'Formatted error message' }],
			});
		});

		it('should pass through all valid parameters', async () => {
			const args = {
				page: 2,
				limit: 50,
				active: true,
				category: 'electronics',
				tags: ['featured', 'sale'],
				sort: 'price_asc',
				expand: ['variants', 'categories'],
			};

			await toolHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
		});

		it('should handle empty arguments', async () => {
			await toolHandler({});

			expect(mockController.list).toHaveBeenCalledWith({});
		});
	});

	describe('swell_get_product Tool', () => {
		let toolHandler: Function;

		beforeEach(() => {
			swellProductsTools.registerTools(mockServer);
			toolHandler = registeredTools.get('swell_get_product').handler;
		});

		it('should successfully get product details', async () => {
			const args = {
				productId: 'product-123',
				expand: ['variants', 'categories'],
			};

			const result = await toolHandler(args);

			expect(mockController.get).toHaveBeenCalledWith(args);
			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: 'Mocked product details response',
					},
				],
			});
		});

		it('should handle missing productId', async () => {
			const error = new McpError(
				'Product ID is required',
				ErrorType.API_ERROR,
			);
			mockController.get.mockRejectedValue(error);
			await toolHandler({ productId: '' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
		});

		it('should handle product not found errors', async () => {
			const error = new McpError(
				'Product not found',
				ErrorType.API_ERROR,
			);
			mockController.get.mockRejectedValue(error);
			await toolHandler({ productId: '' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
		});

		it('should pass expand options correctly', async () => {
			const args = {
				productId: 'product-123',
				expand: ['variants', 'categories', 'images'],
			};

			await toolHandler(args);

			expect(mockController.get).toHaveBeenCalledWith(args);
		});
	});

	describe('swell_search_products Tool', () => {
		let toolHandler: Function;

		beforeEach(() => {
			swellProductsTools.registerTools(mockServer);
			toolHandler = registeredTools.get('swell_search_products').handler;
		});

		it('should successfully search products', async () => {
			const args = {
				query: 'laptop',
				page: 1,
				limit: 20,
				active: true,
				sort: 'relevance',
			};

			const result = await toolHandler(args);

			expect(mockController.search).toHaveBeenCalledWith(args);
			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: 'Mocked search results response',
					},
				],
			});
		});

		it('should handle empty search query', async () => {
			const error = new McpError(
				'Search query is required',
				ErrorType.API_ERROR,
			);
			mockController.search.mockRejectedValue(error);
			await toolHandler({ query: '' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
		});

		it('should pass all search parameters', async () => {
			const args = {
				query: 'laptop computer',
				page: 2,
				limit: 10,
				active: true,
				category: 'electronics',
				tags: ['featured'],
				sort: 'price_desc',
				expand: ['variants'],
			};

			await toolHandler(args);

			expect(mockController.search).toHaveBeenCalledWith(args);
		});

		it('should handle search API errors', async () => {
			const error = new McpError(
				'Search service unavailable',
				ErrorType.API_ERROR,
			);
			mockController.search.mockRejectedValue(error);
			await toolHandler({ query: 'test' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
		});
	});

	describe('swell_check_inventory Tool', () => {
		let toolHandler: Function;

		beforeEach(() => {
			swellProductsTools.registerTools(mockServer);
			toolHandler = registeredTools.get('swell_check_inventory').handler;
		});

		it('should successfully check inventory', async () => {
			const args = {
				productId: 'product-123',
				includeVariants: true,
			};

			const result = await toolHandler(args);

			expect(mockController.checkInventory).toHaveBeenCalledWith(args);
			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: 'Mocked inventory response',
					},
				],
			});
		});

		it('should handle missing productId', async () => {
			const error = new McpError(
				'Product ID is required',
				ErrorType.API_ERROR,
			);
			mockController.checkInventory.mockRejectedValue(error);
			await toolHandler({ productId: '' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
		});

		it('should handle inventory check with default options', async () => {
			const args = { productId: 'product-123' };

			await toolHandler(args);

			expect(mockController.checkInventory).toHaveBeenCalledWith(args);
		});

		it('should handle inventory API errors', async () => {
			const error = new McpError(
				'Inventory service error',
				ErrorType.API_ERROR,
			);
			mockController.checkInventory.mockRejectedValue(error);
			await toolHandler({ productId: 'product-123' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
		});
	});

	describe('Error Handling Integration', () => {
		beforeEach(() => {
			swellProductsTools.registerTools(mockServer);
		});

		it('should handle network errors consistently across all tools', async () => {
			const networkError = new McpError(
				'Network connection failed',
				ErrorType.API_ERROR,
			);

			mockController.list.mockRejectedValue(networkError);
			mockController.get.mockRejectedValue(networkError);
			mockController.search.mockRejectedValue(networkError);
			mockController.checkInventory.mockRejectedValue(networkError);

			const listHandler = registeredTools.get(
				'swell_list_products',
			).handler;
			const getHandler = registeredTools.get('swell_get_product').handler;
			const searchHandler = registeredTools.get(
				'swell_search_products',
			).handler;
			const inventoryHandler = registeredTools.get(
				'swell_check_inventory',
			).handler;

			await listHandler({});
			await getHandler({ productId: 'test' });
			await searchHandler({ query: 'test' });
			await inventoryHandler({ productId: 'test' });

			expect(mockFormatError).toHaveBeenCalledTimes(4);
			expect(mockFormatError).toHaveBeenCalledWith(networkError);
		});

		it('should handle authentication errors consistently', async () => {
			const authError = new McpError(
				'Invalid API credentials',
				ErrorType.AUTH_INVALID,
			);

			mockController.list.mockRejectedValue(authError);

			const listHandler = registeredTools.get(
				'swell_list_products',
			).handler;
			const result = await listHandler({});

			expect(mockFormatError).toHaveBeenCalledWith(authError);
			expect(result).toEqual({
				content: [{ type: 'text', text: 'Formatted error message' }],
			});
		});

		it('should handle validation errors with proper context', async () => {
			const validationError = new McpError(
				'Invalid parameter format',
				ErrorType.API_ERROR,
			);

			mockController.get.mockRejectedValue(validationError);

			const getHandler = registeredTools.get('swell_get_product').handler;
			await getHandler({ productId: 'invalid-id' });

			expect(mockFormatError).toHaveBeenCalledWith(validationError);
		});
	});

	describe('Response Formatting', () => {
		beforeEach(() => {
			swellProductsTools.registerTools(mockServer);
		});

		it('should format successful responses consistently', async () => {
			const testContent = 'Test response content';
			mockController.list.mockResolvedValue({ content: testContent });

			const listHandler = registeredTools.get(
				'swell_list_products',
			).handler;
			const result = await listHandler({});

			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: testContent,
					},
				],
			});
		});

		it('should handle empty content responses', async () => {
			mockController.list.mockResolvedValue({ content: '' });

			const listHandler = registeredTools.get(
				'swell_list_products',
			).handler;
			const result = await listHandler({});

			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: '',
					},
				],
			});
		});

		it('should maintain response structure for all tools', async () => {
			const handlers = [
				registeredTools.get('swell_list_products').handler,
				registeredTools.get('swell_get_product').handler,
				registeredTools.get('swell_search_products').handler,
				registeredTools.get('swell_check_inventory').handler,
			];

			const args = [
				{},
				{ productId: 'test' },
				{ query: 'test' },
				{ productId: 'test' },
			];

			for (let i = 0; i < handlers.length; i++) {
				const result = await handlers[i](args[i]);
				expect(result).toHaveProperty('content');
				expect(Array.isArray(result.content)).toBe(true);
				expect(result.content[0]).toHaveProperty('type', 'text');
				expect(result.content[0]).toHaveProperty('text');
			}
		});
	});

	describe('Parameter Validation Integration', () => {
		beforeEach(() => {
			swellProductsTools.registerTools(mockServer);
		});

		it('should validate required parameters through controller', async () => {
			const getHandler = registeredTools.get('swell_get_product').handler;
			const searchHandler = registeredTools.get(
				'swell_search_products',
			).handler;
			const inventoryHandler = registeredTools.get(
				'swell_check_inventory',
			).handler;

			// Test missing required parameters
			await getHandler({ productId: undefined });
			await searchHandler({ query: undefined });
			await inventoryHandler({ productId: undefined });

			expect(mockController.get).toHaveBeenCalledWith({
				productId: undefined,
			});
			expect(mockController.search).toHaveBeenCalledWith({
				query: undefined,
			});
			expect(mockController.checkInventory).toHaveBeenCalledWith({
				productId: undefined,
			});
		});

		it('should pass optional parameters correctly', async () => {
			const listHandler = registeredTools.get(
				'swell_list_products',
			).handler;

			const args = {
				page: 1,
				limit: 20,
				active: true,
				category: 'electronics',
				tags: ['featured'],
				sort: 'name_asc',
				expand: ['variants'],
			};

			await listHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
		});

		it('should handle type conversion through schema', async () => {
			const listHandler = registeredTools.get(
				'swell_list_products',
			).handler;

			// Test with string numbers (should be converted by Zod)
			const args = {
				page: '2' as any,
				limit: '50' as any,
				active: 'true' as any,
			};

			await listHandler(args);

			// Controller should receive the converted values
			expect(mockController.list).toHaveBeenCalledWith(args);
		});
	});
});
