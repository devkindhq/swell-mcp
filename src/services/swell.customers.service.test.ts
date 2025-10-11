import { ErrorType, McpError } from '../utils/error.util.js';
import { swellClient } from '../utils/swell-client.util.js';
import swellCustomersService from './swell.customers.service.js';
import {
	CustomerAnalyticsOptions,
	CustomerGetOptions,
	CustomerListOptions,
	CustomerOrderHistoryOptions,
	CustomerSearchOptions,
	SwellCustomer,
	SwellCustomersList,
} from './swell.customers.types.js';
import swellOrdersService from './swell.orders.service.js';
import { SwellOrdersList } from './swell.orders.types.js';

// Mock the swell client utility
jest.mock('../utils/swell-client.util.js');
const mockSwellClient = swellClient as jest.Mocked<typeof swellClient>;

// Mock the orders service
jest.mock('./swell.orders.service.js');
const mockOrdersService = swellOrdersService as jest.Mocked<
	typeof swellOrdersService
>;

// Mock axios for the swell-node client
const mockAxios = {
	get: jest.fn(),
	post: jest.fn(),
	put: jest.fn(),
	delete: jest.fn(),
};

// Mock swell-node client
const mockClient = {
	get: mockAxios.get,
	post: mockAxios.post,
	put: mockAxios.put,
	delete: mockAxios.delete,
	getClientStats: jest.fn(),
};

describe('SwellCustomersService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		// Setup mock client
		mockSwellClient.isClientInitialized.mockReturnValue(true);
		mockSwellClient.getClient.mockReturnValue(mockClient as any);
		mockSwellClient.initWithAutoConfig.mockImplementation(() => {});

		// Reset axios mocks
		mockAxios.get.mockReset();
		mockAxios.post.mockReset();
		mockAxios.put.mockReset();
		mockAxios.delete.mockReset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('list', () => {
		const mockCustomersList: SwellCustomersList = {
			count: 2,
			results: [
				{
					id: 'customer-1',
					email: 'john.doe@example.com',
					first_name: 'John',
					last_name: 'Doe',
					phone: '+1-555-0123',
					date_created: '2023-01-01T00:00:00.000Z',
					order_count: 5,
					order_value: 299.95,
					addresses: [
						{
							name: 'John Doe',
							address1: '123 Main St',
							city: 'Anytown',
							state: 'CA',
							zip: '12345',
							country: 'US',
						},
					],
				},
				{
					id: 'customer-2',
					email: 'jane.smith@example.com',
					first_name: 'Jane',
					last_name: 'Smith',
					phone: '+1-555-0456',
					date_created: '2023-01-02T00:00:00.000Z',
					order_count: 3,
					order_value: 149.97,
					addresses: [],
				},
			],
			page: 1,
			pages: 1,
		};

		it('should successfully fetch customers list with default options', async () => {
			mockAxios.get.mockResolvedValue(mockCustomersList);

			const result = await swellCustomersService.list();

			expect(mockAxios.get).toHaveBeenCalledWith('/accounts', {});
			expect(result).toEqual(mockCustomersList);
		});

		it('should fetch customers list with filtering options', async () => {
			const options: CustomerListOptions = {
				page: 2,
				limit: 10,
				email: 'john@example.com',
				first_name: 'John',
				last_name: 'Doe',
				phone: '+1-555-0123',
				group_id: 'vip-customers',
				tags: ['premium', 'loyal'],
				date_created: { $gte: '2023-01-01', $lte: '2023-12-31' },
				order_count: { $gte: 5 },
				order_value: { $gte: 100 },
				search: 'john',
				sort: 'order_value_desc',
				expand: ['orders', 'addresses'],
			};

			mockAxios.get.mockResolvedValue(mockCustomersList);

			const result = await swellCustomersService.list(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/accounts', {
				page: 2,
				limit: 10,
				email: 'john@example.com',
				first_name: 'John',
				last_name: 'Doe',
				phone: '+1-555-0123',
				group_id: 'vip-customers',
				tags: 'premium,loyal',
				date_created: { $gte: '2023-01-01', $lte: '2023-12-31' },
				order_count: { $gte: 5 },
				order_value: { $gte: 100 },
				search: 'john',
				sort: 'order_value_desc',
				expand: 'orders,addresses',
			});
			expect(result).toEqual(mockCustomersList);
		});

		it('should initialize client if not initialized', async () => {
			mockSwellClient.isClientInitialized.mockReturnValue(false);
			mockAxios.get.mockResolvedValue(mockCustomersList);

			await swellCustomersService.list();

			expect(mockSwellClient.initWithAutoConfig).toHaveBeenCalled();
		});

		it('should handle API errors', async () => {
			const apiError = new Error('API Error');
			mockAxios.get.mockRejectedValue(apiError);

			await expect(swellCustomersService.list()).rejects.toThrow(
				McpError,
			);
		});

		it('should handle Zod validation errors', async () => {
			const invalidResponse = { invalid: 'data' };
			mockAxios.get.mockResolvedValue(invalidResponse);

			await expect(swellCustomersService.list()).rejects.toThrow(
				McpError,
			);
		});
	});

	describe('get', () => {
		const mockCustomer: SwellCustomer = {
			id: 'customer-1',
			email: 'john.doe@example.com',
			first_name: 'John',
			last_name: 'Doe',
			phone: '+1-555-0123',
			date_created: '2023-01-01T00:00:00.000Z',
			order_count: 5,
			order_value: 299.95,
			addresses: [
				{
					name: 'John Doe',
					address1: '123 Main St',
					city: 'Anytown',
					state: 'CA',
					zip: '12345',
					country: 'US',
				},
			],
		};

		it('should successfully fetch customer by ID', async () => {
			mockAxios.get.mockResolvedValue(mockCustomer);

			const result = await swellCustomersService.get('customer-1');

			expect(mockAxios.get).toHaveBeenCalledWith(
				'/accounts/customer-1',
				{},
			);
			expect(result).toEqual(mockCustomer);
		});

		it('should fetch customer with expand options', async () => {
			const options: CustomerGetOptions = {
				expand: ['orders', 'addresses'],
			};

			mockAxios.get.mockResolvedValue(mockCustomer);

			const result = await swellCustomersService.get(
				'customer-1',
				options,
			);

			expect(mockAxios.get).toHaveBeenCalledWith('/accounts/customer-1', {
				expand: 'orders,addresses',
			});
			expect(result).toEqual(mockCustomer);
		});

		it('should throw error for empty customer ID', async () => {
			await expect(swellCustomersService.get('')).rejects.toThrow(
				'Customer ID is required',
			);
		});

		it('should handle customer not found', async () => {
			mockAxios.get.mockResolvedValue(null);

			await expect(
				swellCustomersService.get('nonexistent'),
			).rejects.toThrow('Customer not found: nonexistent');
		});

		it('should handle API errors', async () => {
			const apiError = new Error('API Error');
			mockAxios.get.mockRejectedValue(apiError);

			await expect(
				swellCustomersService.get('customer-1'),
			).rejects.toThrow(McpError);
		});
	});

	describe('search', () => {
		const mockSearchResults: SwellCustomersList = {
			count: 1,
			results: [
				{
					id: 'customer-1',
					email: 'john.doe@example.com',
					first_name: 'John',
					last_name: 'Doe',
					phone: '+1-555-0123',
					date_created: '2023-01-01T00:00:00.000Z',
					order_count: 5,
					order_value: 299.95,
					addresses: [],
				},
			],
			page: 1,
			pages: 1,
		};

		it('should successfully search customers', async () => {
			mockAxios.get.mockResolvedValue(mockSearchResults);

			const options: CustomerSearchOptions = {
				query: 'john',
				limit: 20,
			};

			const result = await swellCustomersService.search(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/accounts', {
				search: 'john',
				limit: 20,
			});
			expect(result).toEqual(mockSearchResults);
		});

		it('should search with additional filters', async () => {
			mockAxios.get.mockResolvedValue(mockSearchResults);

			const options: CustomerSearchOptions = {
				query: 'john',
				group_id: 'vip-customers',
				tags: ['premium'],
				sort: 'order_value_desc',
				expand: ['orders'],
			};

			const result = await swellCustomersService.search(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/accounts', {
				search: 'john',
				group_id: 'vip-customers',
				tags: 'premium',
				sort: 'order_value_desc',
				expand: 'orders',
			});
			expect(result).toEqual(mockSearchResults);
		});

		it('should throw error for empty search query', async () => {
			const options: CustomerSearchOptions = { query: '' };

			await expect(swellCustomersService.search(options)).rejects.toThrow(
				'Search query is required',
			);
		});

		it('should handle search API errors', async () => {
			const apiError = new Error('Search API Error');
			mockAxios.get.mockRejectedValue(apiError);

			const options: CustomerSearchOptions = { query: 'john' };

			await expect(swellCustomersService.search(options)).rejects.toThrow(
				McpError,
			);
		});
	});

	describe('getOrderHistory', () => {
		const mockOrderHistory: SwellOrdersList = {
			count: 3,
			results: [
				{
					id: 'order-1',
					number: 'ORD-001',
					status: 'complete',
					account_id: 'customer-1',
					items: [
						{
							id: 'item-1',
							product_id: 'product-1',
							product_name: 'Test Product',
							quantity: 2,
							price: 29.99,
							price_total: 59.98,
						},
					],
					billing: {
						name: 'John Doe',
						address1: '123 Main St',
						city: 'Anytown',
						state: 'CA',
						zip: '12345',
						country: 'US',
					},
					shipping: {
						name: 'John Doe',
						address1: '123 Main St',
						city: 'Anytown',
						state: 'CA',
						zip: '12345',
						country: 'US',
					},
					sub_total: 59.98,
					tax_total: 4.8,
					shipping_total: 9.99,
					grand_total: 74.77,
					date_created: '2023-01-01T00:00:00.000Z',
					date_updated: '2023-01-01T00:00:00.000Z',
				},
			],
			page: 1,
			pages: 1,
		};

		it('should successfully fetch customer order history', async () => {
			mockOrdersService.list.mockResolvedValue(mockOrderHistory);

			const options: CustomerOrderHistoryOptions = {
				customer_id: 'customer-1',
			};

			const result = await swellCustomersService.getOrderHistory(options);

			expect(mockOrdersService.list).toHaveBeenCalledWith({
				account_id: 'customer-1',
				page: undefined,
				limit: undefined,
				sort: 'date_created_desc',
				expand: ['items'],
			});
			expect(result).toEqual(mockOrderHistory);
		});

		it('should fetch order history with filters', async () => {
			mockOrdersService.list.mockResolvedValue(mockOrderHistory);

			const options: CustomerOrderHistoryOptions = {
				customer_id: 'customer-1',
				status: 'complete',
				page: 1,
				limit: 10,
				sort: 'date_created_asc',
				date_from: '2023-01-01',
				date_to: '2023-12-31',
			};

			const result = await swellCustomersService.getOrderHistory(options);

			expect(mockOrdersService.list).toHaveBeenCalledWith({
				account_id: 'customer-1',
				page: 1,
				limit: 10,
				sort: 'date_created_asc',
				expand: ['items'],
				status: 'complete',
				date_created: {
					$gte: '2023-01-01',
					$lte: '2023-12-31',
				},
			});
			expect(result).toEqual(mockOrderHistory);
		});

		it('should throw error for empty customer ID', async () => {
			const options: CustomerOrderHistoryOptions = {
				customer_id: '',
			};

			await expect(
				swellCustomersService.getOrderHistory(options),
			).rejects.toThrow('Customer ID is required');
		});

		it('should handle order history API errors', async () => {
			const apiError = new Error('Order History API Error');
			mockOrdersService.list.mockRejectedValue(apiError);

			const options: CustomerOrderHistoryOptions = {
				customer_id: 'customer-1',
			};

			await expect(
				swellCustomersService.getOrderHistory(options),
			).rejects.toThrow(McpError);
		});
	});

	describe('getAnalytics', () => {
		const mockAnalyticsData: SwellCustomersList = {
			count: 50,
			results: [
				{
					id: 'customer-1',
					email: 'john.doe@example.com',
					first_name: 'John',
					last_name: 'Doe',
					phone: '+1-555-0123',
					date_created: '2023-01-01T00:00:00.000Z',
					order_count: 5,
					order_value: 299.95,
					addresses: [],
				},
			],
			page: 1,
			pages: 5,
		};

		it('should successfully fetch analytics with default options', async () => {
			mockAxios.get.mockResolvedValue(mockAnalyticsData);

			const result = await swellCustomersService.getAnalytics();

			expect(mockAxios.get).toHaveBeenCalledWith('/accounts', {
				limit: 1000,
				expand: 'orders',
				sort: 'order_value_desc',
			});
			expect(result).toEqual(mockAnalyticsData);
		});

		it('should fetch analytics for specific customer', async () => {
			const mockSingleCustomer: SwellCustomer = {
				id: 'customer-1',
				email: 'john.doe@example.com',
				first_name: 'John',
				last_name: 'Doe',
				phone: '+1-555-0123',
				date_created: '2023-01-01T00:00:00.000Z',
				order_count: 5,
				order_value: 299.95,
				addresses: [],
			};

			mockAxios.get.mockResolvedValue(mockSingleCustomer);

			const options: CustomerAnalyticsOptions = {
				customer_id: 'customer-1',
			};

			const result = await swellCustomersService.getAnalytics(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/accounts/customer-1', {
				expand: 'orders',
			});
			expect(result).toEqual({
				count: 1,
				results: [mockSingleCustomer],
				page: 1,
				pages: 1,
			});
		});

		it('should fetch analytics with date range and group filter', async () => {
			mockAxios.get.mockResolvedValue(mockAnalyticsData);

			const options: CustomerAnalyticsOptions = {
				group_id: 'vip-customers',
				date_from: '2023-01-01',
				date_to: '2023-12-31',
			};

			const result = await swellCustomersService.getAnalytics(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/accounts', {
				limit: 1000,
				expand: 'orders',
				sort: 'order_value_desc',
				group_id: 'vip-customers',
				date_created: {
					$gte: '2023-01-01',
					$lte: '2023-12-31',
				},
			});
			expect(result).toEqual(mockAnalyticsData);
		});

		it('should handle analytics API errors', async () => {
			const apiError = new Error('Analytics API Error');
			mockAxios.get.mockRejectedValue(apiError);

			await expect(swellCustomersService.getAnalytics()).rejects.toThrow(
				McpError,
			);
		});
	});

	describe('parameter validation and formatting', () => {
		it('should properly format array parameters', async () => {
			const mockResponse: SwellCustomersList = {
				count: 0,
				results: [],
				page: 1,
				pages: 1,
			};

			mockAxios.get.mockResolvedValue(mockResponse);

			const options: CustomerListOptions = {
				tags: ['tag1', 'tag2', 'tag3'],
				expand: ['orders', 'addresses'],
			};

			await swellCustomersService.list(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/accounts', {
				tags: 'tag1,tag2,tag3',
				expand: 'orders,addresses',
			});
		});

		it('should handle complex query parameters', async () => {
			const mockResponse: SwellCustomersList = {
				count: 0,
				results: [],
				page: 1,
				pages: 1,
			};

			mockAxios.get.mockResolvedValue(mockResponse);

			const options: CustomerListOptions = {
				date_created: {
					$gte: '2023-01-01',
					$lte: '2023-12-31',
				},
				order_count: {
					$gte: 5,
					$lte: 100,
				},
				order_value: {
					$gte: 100.0,
				},
			};

			await swellCustomersService.list(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/accounts', {
				date_created: {
					$gte: '2023-01-01',
					$lte: '2023-12-31',
				},
				order_count: {
					$gte: 5,
					$lte: 100,
				},
				order_value: {
					$gte: 100.0,
				},
			});
		});

		it('should validate string parameters are trimmed', async () => {
			await expect(
				swellCustomersService.get('  \t  \n  '),
			).rejects.toThrow('Customer ID is required');

			await expect(
				swellCustomersService.search({ query: '  \t  \n  ' }),
			).rejects.toThrow('Search query is required');

			await expect(
				swellCustomersService.getOrderHistory({
					customer_id: '  \t  \n  ',
				}),
			).rejects.toThrow('Customer ID is required');
		});
	});

	describe('client recycling behavior', () => {
		it('should handle client recycling during requests', async () => {
			const mockResponse: SwellCustomersList = {
				count: 1,
				results: [
					{
						id: 'customer-1',
						email: 'john.doe@example.com',
						first_name: 'John',
						last_name: 'Doe',
						phone: '+1-555-0123',
						date_created: '2023-01-01T00:00:00.000Z',
						order_count: 5,
						order_value: 299.95,
						addresses: [],
					},
				],
				page: 1,
				pages: 1,
			};

			// Mock client stats to simulate recycling conditions
			mockClient.getClientStats.mockReturnValue({
				activeClient: {
					createdAt: Date.now() - 20000,
					activeRequests: 0,
					totalRequests: 1500,
					ageMs: 20000,
				},
				oldClientsCount: 0,
				oldClients: [],
			});

			mockAxios.get.mockResolvedValue(mockResponse);

			// Advance timers to simulate time passing
			jest.advanceTimersByTime(16000);

			const result = await swellCustomersService.list();

			expect(result).toEqual(mockResponse);
			expect(mockAxios.get).toHaveBeenCalledWith('/accounts', {});
		});
	});

	describe('error handling scenarios', () => {
		it('should handle ECONNREFUSED errors', async () => {
			const connectionError = new Error('Connection refused');
			(connectionError as any).code = 'ECONNREFUSED';
			mockAxios.get.mockRejectedValue(connectionError);

			await expect(swellCustomersService.list()).rejects.toThrow(
				McpError,
			);
		});

		it('should handle timeout errors', async () => {
			const timeoutError = new Error('Request timeout');
			(timeoutError as any).code = 'ECONNABORTED';
			mockAxios.get.mockRejectedValue(timeoutError);

			await expect(swellCustomersService.list()).rejects.toThrow(
				McpError,
			);
		});

		it('should handle authentication errors', async () => {
			const authError = new Error('Unauthorized');
			(authError as any).status = 401;
			mockAxios.get.mockRejectedValue(authError);

			await expect(swellCustomersService.list()).rejects.toThrow(
				McpError,
			);
		});

		it('should handle 404 errors', async () => {
			const notFoundError = new Error('Not Found');
			(notFoundError as any).status = 404;
			mockAxios.get.mockRejectedValue(notFoundError);

			await expect(
				swellCustomersService.get('nonexistent'),
			).rejects.toThrow(McpError);
		});

		it('should handle validation errors', async () => {
			const invalidResponse = { invalid: 'data' };
			mockAxios.get.mockResolvedValue(invalidResponse);

			await expect(swellCustomersService.list()).rejects.toThrow(
				McpError,
			);
		});

		it('should handle order history service errors', async () => {
			const orderServiceError = new McpError(
				'Order service error',
				ErrorType.API_ERROR,
				500,
			);
			mockOrdersService.list.mockRejectedValue(orderServiceError);

			const options: CustomerOrderHistoryOptions = {
				customer_id: 'customer-1',
			};

			await expect(
				swellCustomersService.getOrderHistory(options),
			).rejects.toThrow(McpError);
		});
	});
});
