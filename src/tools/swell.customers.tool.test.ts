import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import swellCustomersTools from './swell.customers.tool.js';
import swellCustomersController from '../controllers/swell.customers.controller.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { McpError, ErrorType } from '../utils/error.util.js';

// Mock the controller
jest.mock('../controllers/swell.customers.controller.js');
const mockController = swellCustomersController as jest.Mocked<
	typeof swellCustomersController
>;

// Mock the error utility
jest.mock('../utils/error.util.js', () => ({
	...jest.requireActual('../utils/error.util.js'),
	formatErrorForMcpTool: jest.fn(),
}));
const mockFormatError = formatErrorForMcpTool as jest.MockedFunction<
	typeof formatErrorForMcpTool
>;

describe('Swell Customers Tools Integration', () => {
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
			content: 'Mocked customers list response',
		});
		mockController.get.mockResolvedValue({
			content: 'Mocked customer details response',
		});
		mockController.search.mockResolvedValue({
			content: 'Mocked customer search results',
		});
		mockController.update.mockResolvedValue({
			content: 'Mocked customer update response',
		});

		// Mock error formatter
		mockFormatError.mockReturnValue({
			content: [{ type: 'text', text: 'Formatted error message' }],
		});
	});

	describe('Tool Registration', () => {
		it('should register all customer tools with correct names and descriptions', () => {
			swellCustomersTools.registerTools(mockServer);

			expect(mockServer.tool).toHaveBeenCalledTimes(4);
			expect(registeredTools.has('swell_list_customers')).toBe(true);
			expect(registeredTools.has('swell_get_customer')).toBe(true);
			expect(registeredTools.has('swell_search_customers')).toBe(true);
			expect(registeredTools.has('swell_update_customer')).toBe(true);
		});

		it('should register tools with proper descriptions', () => {
			swellCustomersTools.registerTools(mockServer);

			const listTool = registeredTools.get('swell_list_customers');
			expect(listTool.description).toContain('List customers');
			expect(listTool.description).toContain('search and filtering');

			const getTool = registeredTools.get('swell_get_customer');
			expect(getTool.description).toContain('detailed information');
			expect(getTool.description).toContain('specific customer');

			const searchTool = registeredTools.get('swell_search_customers');
			expect(searchTool.description).toContain('Search for customers');
			expect(searchTool.description).toContain('text queries');
		});

		it('should register tools with proper schema validation', () => {
			swellCustomersTools.registerTools(mockServer);

			const listTool = registeredTools.get('swell_list_customers');
			expect(listTool.schema).toHaveProperty('page');
			expect(listTool.schema).toHaveProperty('limit');
			expect(listTool.schema).toHaveProperty('search');
			expect(listTool.schema).toHaveProperty('email');

			const getTool = registeredTools.get('swell_get_customer');
			expect(getTool.schema).toHaveProperty('customerId');
			expect(getTool.schema).toHaveProperty('expand');
			expect(getTool.schema).toHaveProperty('includeOrderHistory');

			const searchTool = registeredTools.get('swell_search_customers');
			expect(searchTool.schema).toHaveProperty('query');
			expect(searchTool.schema).toHaveProperty('page');
			expect(searchTool.schema).toHaveProperty('limit');
		});
	});

	describe('swell_list_customers Tool', () => {
		let toolHandler: Function;

		beforeEach(() => {
			swellCustomersTools.registerTools(mockServer);
			toolHandler = registeredTools.get('swell_list_customers').handler;
		});

		it('should successfully call controller and format response', async () => {
			const args = { page: 1, limit: 20, search: 'john' };

			const result = await toolHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: 'Mocked customers list response',
					},
				],
			});
		});

		it('should handle controller errors and format them', async () => {
			const error = new McpError('Controller error', ErrorType.API_ERROR);
			mockController.list.mockRejectedValue(error);
			const result = await toolHandler({ customerId: '' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
			expect(result).toEqual({
				content: [{ type: 'text', text: 'Formatted error message' }],
			});
		});

		it('should pass through all valid parameters', async () => {
			const args = {
				page: 2,
				limit: 50,
				search: 'john doe',
				email: 'john@example.com',
				dateFrom: '2023-01-01',
				dateTo: '2023-12-31',
				sort: 'name_asc',
				expand: ['orders', 'addresses'],
			};

			await toolHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
		});

		it('should handle empty arguments', async () => {
			await toolHandler({});

			expect(mockController.list).toHaveBeenCalledWith({});
		});

		it('should handle email filtering', async () => {
			const args = {
				email: 'customer@example.com',
			};

			await toolHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
		});

		it('should handle date range filtering', async () => {
			const args = {
				dateFrom: '2023-01-01',
				dateTo: '2023-06-30',
			};

			await toolHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
		});
	});

	describe('swell_get_customer Tool', () => {
		let toolHandler: Function;

		beforeEach(() => {
			swellCustomersTools.registerTools(mockServer);
			toolHandler = registeredTools.get('swell_get_customer').handler;
		});

		it('should successfully get customer details', async () => {
			const args = {
				customerId: 'customer-123',
				expand: ['orders', 'addresses'],
				includeOrderHistory: true,
			};

			const result = await toolHandler(args);

			expect(mockController.get).toHaveBeenCalledWith(args);
			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: 'Mocked customer details response',
					},
				],
			});
		});

		it('should handle missing customerId', async () => {
			const error = new McpError(
				'Customer ID is required',
				ErrorType.API_ERROR,
			);
			mockController.get.mockRejectedValue(error);
			await toolHandler({ customerId: '' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
		});

		it('should handle customer not found errors', async () => {
			const error = new McpError(
				'Customer not found',
				ErrorType.API_ERROR,
			);
			mockController.get.mockRejectedValue(error);
			await toolHandler({ customerId: '' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
		});

		it('should pass expand options correctly', async () => {
			const args = {
				customerId: 'customer-123',
				expand: ['orders', 'addresses'],
			};

			await toolHandler(args);

			expect(mockController.get).toHaveBeenCalledWith(args);
		});

		it('should use default expand options when not provided', async () => {
			const args = { customerId: 'customer-123' };

			await toolHandler(args);

			expect(mockController.get).toHaveBeenCalledWith(args);
		});

		it('should handle includeOrderHistory option', async () => {
			const args = {
				customerId: 'customer-123',
				includeOrderHistory: false,
			};

			await toolHandler(args);

			expect(mockController.get).toHaveBeenCalledWith(args);
		});
	});

	describe('swell_search_customers Tool', () => {
		let toolHandler: Function;

		beforeEach(() => {
			swellCustomersTools.registerTools(mockServer);
			toolHandler = registeredTools.get('swell_search_customers').handler;
		});

		it('should successfully search customers', async () => {
			const args = {
				query: 'john doe',
				page: 1,
				limit: 20,
				sort: 'relevance',
			};

			const result = await toolHandler(args);

			expect(mockController.search).toHaveBeenCalledWith(args);
			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: 'Mocked customer search results',
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
				query: 'john smith email phone',
				page: 2,
				limit: 10,
				dateFrom: '2023-01-01',
				dateTo: '2023-12-31',
				sort: 'name_asc',
				expand: ['orders', 'addresses'],
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

		it('should handle search with date filtering', async () => {
			const args = {
				query: 'premium customer',
				dateFrom: '2023-01-01',
				dateTo: '2023-06-30',
			};

			await toolHandler(args);

			expect(mockController.search).toHaveBeenCalledWith(args);
		});

		it('should handle different sort options', async () => {
			const sortOptions = [
				'relevance',
				'name_asc',
				'date_created_desc',
				'order_value_desc',
			];

			for (const sort of sortOptions) {
				await toolHandler({ query: 'test', sort });
				expect(mockController.search).toHaveBeenCalledWith({
					query: 'test',
					sort,
				});
			}
		});
	});

	describe('Error Handling Integration', () => {
		beforeEach(() => {
			swellCustomersTools.registerTools(mockServer);
		});

		it('should handle network errors consistently across all tools', async () => {
			const networkError = new McpError(
				'Network connection failed',
				ErrorType.API_ERROR,
			);

			mockController.list.mockRejectedValue(networkError);
			mockController.get.mockRejectedValue(networkError);
			mockController.search.mockRejectedValue(networkError);

			const listHandler = registeredTools.get(
				'swell_list_customers',
			).handler;
			const getHandler =
				registeredTools.get('swell_get_customer').handler;
			const searchHandler = registeredTools.get(
				'swell_search_customers',
			).handler;

			await listHandler({});
			await getHandler({ customerId: 'test' });
			await searchHandler({ query: 'test' });

			expect(mockFormatError).toHaveBeenCalledTimes(3);
			expect(mockFormatError).toHaveBeenCalledWith(networkError);
		});

		it('should handle authentication errors consistently', async () => {
			const authError = new McpError(
				'Invalid API credentials',
				ErrorType.AUTH_INVALID,
			);

			mockController.list.mockRejectedValue(authError);

			const listHandler = registeredTools.get(
				'swell_list_customers',
			).handler;
			const result = await listHandler({});

			expect(mockFormatError).toHaveBeenCalledWith(authError);
			expect(result).toEqual({
				content: [{ type: 'text', text: 'Formatted error message' }],
			});
		});

		it('should handle privacy/permission errors for customer data', async () => {
			const privacyError = new McpError(
				'Insufficient permissions to access customer data',
				ErrorType.API_ERROR,
			);

			mockController.get.mockRejectedValue(privacyError);

			const getHandler =
				registeredTools.get('swell_get_customer').handler;
			await getHandler({ customerId: 'customer-123' });

			expect(mockFormatError).toHaveBeenCalledWith(privacyError);
		});

		it('should handle rate limiting errors', async () => {
			const rateLimitError = new McpError(
				'API rate limit exceeded',
				ErrorType.API_ERROR,
			);

			mockController.search.mockRejectedValue(rateLimitError);

			const searchHandler = registeredTools.get(
				'swell_search_customers',
			).handler;
			await searchHandler({ query: 'test' });

			expect(mockFormatError).toHaveBeenCalledWith(rateLimitError);
		});
	});

	describe('Response Formatting', () => {
		beforeEach(() => {
			swellCustomersTools.registerTools(mockServer);
		});

		it('should format successful responses consistently', async () => {
			const testContent = 'Test customer response content';
			mockController.list.mockResolvedValue({ content: testContent });

			const listHandler = registeredTools.get(
				'swell_list_customers',
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
			mockController.get.mockResolvedValue({ content: '' });

			const getHandler =
				registeredTools.get('swell_get_customer').handler;
			const result = await getHandler({ customerId: 'customer-123' });

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
				registeredTools.get('swell_list_customers').handler,
				registeredTools.get('swell_get_customer').handler,
				registeredTools.get('swell_search_customers').handler,
			];

			const args = [{}, { customerId: 'test' }, { query: 'test' }];

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
			swellCustomersTools.registerTools(mockServer);
		});

		it('should validate required parameters through controller', async () => {
			const getHandler =
				registeredTools.get('swell_get_customer').handler;
			const searchHandler = registeredTools.get(
				'swell_search_customers',
			).handler;

			// Test missing required parameters
			await getHandler({ customerId: undefined });
			await searchHandler({ query: undefined });

			expect(mockController.get).toHaveBeenCalledWith({
				customerId: undefined,
			});
			expect(mockController.search).toHaveBeenCalledWith({
				query: undefined,
			});
		});

		it('should pass optional parameters correctly', async () => {
			const listHandler = registeredTools.get(
				'swell_list_customers',
			).handler;

			const args = {
				page: 1,
				limit: 20,
				search: 'john',
				email: 'john@example.com',
				dateFrom: '2023-01-01',
				dateTo: '2023-12-31',
				sort: 'name_asc',
				expand: ['orders'],
			};

			await listHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
		});

		it('should handle email validation parameters', async () => {
			const listHandler = registeredTools.get(
				'swell_list_customers',
			).handler;

			const args = {
				email: 'customer@example.com',
			};

			await listHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
		});

		it('should handle date filtering parameters', async () => {
			const searchHandler = registeredTools.get(
				'swell_search_customers',
			).handler;

			const args = {
				query: 'premium customer',
				dateFrom: '2023-01-01',
				dateTo: '2023-12-31',
			};

			await searchHandler(args);

			expect(mockController.search).toHaveBeenCalledWith(args);
		});
	});

	describe('Customer Privacy and Data Handling', () => {
		beforeEach(() => {
			swellCustomersTools.registerTools(mockServer);
		});

		it('should handle customer data access with proper permissions', async () => {
			const getHandler =
				registeredTools.get('swell_get_customer').handler;

			const args = {
				customerId: 'customer-123',
				expand: ['orders', 'addresses'],
				includeOrderHistory: true,
			};

			await getHandler(args);

			expect(mockController.get).toHaveBeenCalledWith(args);
		});

		it('should handle customer search with privacy considerations', async () => {
			const searchHandler = registeredTools.get(
				'swell_search_customers',
			).handler;

			// Search should work with general terms but not expose sensitive data
			const args = {
				query: 'john',
				expand: ['orders'],
			};

			await searchHandler(args);

			expect(mockController.search).toHaveBeenCalledWith(args);
		});

		it('should handle customer listing with appropriate filtering', async () => {
			const listHandler = registeredTools.get(
				'swell_list_customers',
			).handler;

			const args = {
				search: 'premium',
				dateFrom: '2023-01-01',
				expand: ['orders'],
			};

			await listHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
		});
	});

	describe('Customer Search Functionality', () => {
		let searchHandler: Function;

		beforeEach(() => {
			swellCustomersTools.registerTools(mockServer);
			searchHandler = registeredTools.get(
				'swell_search_customers',
			).handler;
		});

		it('should handle multi-field search queries', async () => {
			const searchQueries = [
				'john doe',
				'john@example.com',
				'+1-555-123-4567',
				'premium customer vip',
			];

			for (const query of searchQueries) {
				await searchHandler({ query });
				expect(mockController.search).toHaveBeenCalledWith({ query });
			}
		});

		it('should handle search with pagination', async () => {
			const args = {
				query: 'customer search',
				page: 3,
				limit: 25,
			};

			await searchHandler(args);

			expect(mockController.search).toHaveBeenCalledWith(args);
		});

		it('should handle search with sorting preferences', async () => {
			const args = {
				query: 'high value customer',
				sort: 'order_value_desc',
			};

			await searchHandler(args);

			expect(mockController.search).toHaveBeenCalledWith(args);
		});
	});
});
