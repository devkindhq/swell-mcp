import swellOrdersService from './swell.orders.service.js';
import { swellClient } from '../utils/swell-client.util.js';
import { McpError } from '../utils/error.util.js';
import {
	SwellOrder,
	SwellOrdersList,
	OrderListOptions,
	OrderGetOptions,
	OrderStatusUpdateOptions,
	OrderAnalyticsOptions,
	OrderStatus,
} from './swell.orders.types.js';

// Mock the swell client utility
jest.mock('../utils/swell-client.util.js');
const mockSwellClient = swellClient as jest.Mocked<typeof swellClient>;

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

describe('SwellOrdersService', () => {
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
		const mockOrdersList: SwellOrdersList = {
			count: 2,
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
				{
					id: 'order-2',
					number: 'ORD-002',
					status: 'pending',
					account_id: 'customer-2',
					items: [
						{
							id: 'item-2',
							product_id: 'product-2',
							product_name: 'Another Product',
							quantity: 1,
							price: 49.99,
							price_total: 49.99,
						},
					],
					billing: {
						name: 'Jane Smith',
						address1: '456 Oak Ave',
						city: 'Another City',
						state: 'NY',
						zip: '67890',
						country: 'US',
					},
					shipping: {
						name: 'Jane Smith',
						address1: '456 Oak Ave',
						city: 'Another City',
						state: 'NY',
						zip: '67890',
						country: 'US',
					},
					sub_total: 49.99,
					tax_total: 4.0,
					shipping_total: 5.99,
					grand_total: 59.98,
					date_created: '2023-01-02T00:00:00.000Z',
					date_updated: '2023-01-02T00:00:00.000Z',
				},
			],
			page: 1,
			pages: 1,
		};

		it('should successfully fetch orders list with default options', async () => {
			mockAxios.get.mockResolvedValue(mockOrdersList);

			const result = await swellOrdersService.list();

			expect(mockAxios.get).toHaveBeenCalledWith('/orders', {});
			expect(result).toEqual(mockOrdersList);
		});

		it('should fetch orders list with filtering options', async () => {
			const options: OrderListOptions = {
				page: 2,
				limit: 10,
				status: 'complete',
				account_id: 'customer-1',
				account_email: 'customer@example.com',
				date_created: { $gte: '2023-01-01', $lte: '2023-12-31' },
				search: 'ORD-001',
				sort: 'date_created_desc',
				expand: ['items', 'payments'],
			};

			mockAxios.get.mockResolvedValue(mockOrdersList);

			const result = await swellOrdersService.list(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/orders', {
				page: 2,
				limit: 10,
				status: 'complete',
				account_id: 'customer-1',
				account_email: 'customer@example.com',
				date_created: { $gte: '2023-01-01', $lte: '2023-12-31' },
				search: 'ORD-001',
				sort: 'date_created_desc',
				expand: 'items,payments',
			});
			expect(result).toEqual(mockOrdersList);
		});

		it('should handle multiple status filters', async () => {
			const options: OrderListOptions = {
				status: ['pending', 'complete'],
			};

			mockAxios.get.mockResolvedValue(mockOrdersList);

			const result = await swellOrdersService.list(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/orders', {
				status: { $in: ['pending', 'complete'] },
			});
			expect(result).toEqual(mockOrdersList);
		});

		it('should initialize client if not initialized', async () => {
			mockSwellClient.isClientInitialized.mockReturnValue(false);
			mockAxios.get.mockResolvedValue(mockOrdersList);

			await swellOrdersService.list();

			expect(mockSwellClient.initWithAutoConfig).toHaveBeenCalled();
		});

		it('should handle API errors', async () => {
			const apiError = new Error('API Error');
			mockAxios.get.mockRejectedValue(apiError);

			await expect(swellOrdersService.list()).rejects.toThrow(McpError);
		});

		it('should handle Zod validation errors', async () => {
			const invalidResponse = { invalid: 'data' };
			mockAxios.get.mockResolvedValue(invalidResponse);

			await expect(swellOrdersService.list()).rejects.toThrow(McpError);
		});
	});

	describe('get', () => {
		const mockOrder: SwellOrder = {
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
		};

		it('should successfully fetch order by ID', async () => {
			mockAxios.get.mockResolvedValue(mockOrder);

			const result = await swellOrdersService.get('order-1');

			expect(mockAxios.get).toHaveBeenCalledWith('/orders/order-1', {});
			expect(result).toEqual(mockOrder);
		});

		it('should fetch order with expand options', async () => {
			const options: OrderGetOptions = {
				expand: ['items', 'payments', 'shipments'],
			};

			mockAxios.get.mockResolvedValue(mockOrder);

			const result = await swellOrdersService.get('order-1', options);

			expect(mockAxios.get).toHaveBeenCalledWith('/orders/order-1', {
				expand: 'items,payments,shipments',
			});
			expect(result).toEqual(mockOrder);
		});

		it('should throw error for empty order ID', async () => {
			await expect(swellOrdersService.get('')).rejects.toThrow(
				'Order ID is required',
			);
		});

		it('should handle order not found', async () => {
			mockAxios.get.mockResolvedValue(null);

			await expect(swellOrdersService.get('nonexistent')).rejects.toThrow(
				'Order not found: nonexistent',
			);
		});

		it('should handle API errors', async () => {
			const apiError = new Error('API Error');
			mockAxios.get.mockRejectedValue(apiError);

			await expect(swellOrdersService.get('order-1')).rejects.toThrow(
				McpError,
			);
		});
	});

	describe('updateStatus', () => {
		const mockUpdatedOrder: SwellOrder = {
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
		};

		it('should successfully update order status', async () => {
			mockAxios.put.mockResolvedValue(mockUpdatedOrder);

			const options: OrderStatusUpdateOptions = {
				status: 'complete',
				notes: 'Order fulfilled successfully',
				send_email: true,
			};

			const result = await swellOrdersService.updateStatus(
				'order-1',
				options,
			);

			expect(mockAxios.put).toHaveBeenCalledWith('/orders/order-1', {
				status: 'complete',
				notes: 'Order fulfilled successfully',
				send_email: true,
			});
			expect(result).toEqual(mockUpdatedOrder);
		});

		it('should update status with minimal options', async () => {
			mockAxios.put.mockResolvedValue(mockUpdatedOrder);

			const options: OrderStatusUpdateOptions = {
				status: 'complete',
			};

			const result = await swellOrdersService.updateStatus(
				'order-1',
				options,
			);

			expect(mockAxios.put).toHaveBeenCalledWith('/orders/order-1', {
				status: 'complete',
			});
			expect(result).toEqual(mockUpdatedOrder);
		});

		it('should throw error for empty order ID', async () => {
			const options: OrderStatusUpdateOptions = { status: 'complete' };

			await expect(
				swellOrdersService.updateStatus('', options),
			).rejects.toThrow('Order ID is required');
		});

		it('should throw error for missing status', async () => {
			const options = {} as OrderStatusUpdateOptions;

			await expect(
				swellOrdersService.updateStatus('order-1', options),
			).rejects.toThrow('Order status is required');
		});

		it('should validate order status values', async () => {
			const options: OrderStatusUpdateOptions = {
				status: 'invalid_status' as OrderStatus,
			};

			await expect(
				swellOrdersService.updateStatus('order-1', options),
			).rejects.toThrow('Invalid order status: invalid_status');
		});

		it('should handle order not found during update', async () => {
			mockAxios.put.mockResolvedValue(null);

			const options: OrderStatusUpdateOptions = { status: 'complete' };

			await expect(
				swellOrdersService.updateStatus('nonexistent', options),
			).rejects.toThrow('Order not found: nonexistent');
		});

		it('should handle API errors during update', async () => {
			const apiError = new Error('Update API Error');
			mockAxios.put.mockRejectedValue(apiError);

			const options: OrderStatusUpdateOptions = { status: 'complete' };

			await expect(
				swellOrdersService.updateStatus('order-1', options),
			).rejects.toThrow(McpError);
		});
	});

	describe('getAnalytics', () => {
		const mockAnalyticsData: SwellOrdersList = {
			count: 100,
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
			pages: 10,
		};

		it('should successfully fetch analytics with default options', async () => {
			mockAxios.get.mockResolvedValue(mockAnalyticsData);

			const result = await swellOrdersService.getAnalytics();

			expect(mockAxios.get).toHaveBeenCalledWith('/orders', {
				limit: 1000,
				sort: 'date_created',
				expand: 'items',
			});
			expect(result).toEqual(mockAnalyticsData);
		});

		it('should fetch analytics with date range', async () => {
			mockAxios.get.mockResolvedValue(mockAnalyticsData);

			const options: OrderAnalyticsOptions = {
				date_from: '2023-01-01',
				date_to: '2023-12-31',
				status: 'complete',
			};

			const result = await swellOrdersService.getAnalytics(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/orders', {
				limit: 1000,
				status: 'complete',
				date_created: {
					$gte: '2023-01-01',
					$lte: '2023-12-31',
				},
				sort: 'date_created',
				expand: 'items',
			});
			expect(result).toEqual(mockAnalyticsData);
		});

		it('should handle analytics API errors', async () => {
			const apiError = new Error('Analytics API Error');
			mockAxios.get.mockRejectedValue(apiError);

			await expect(swellOrdersService.getAnalytics()).rejects.toThrow(
				McpError,
			);
		});
	});

	describe('parameter validation and formatting', () => {
		it('should properly format array parameters', async () => {
			const mockResponse: SwellOrdersList = {
				count: 0,
				results: [],
				page: 1,
				pages: 1,
			};

			mockAxios.get.mockResolvedValue(mockResponse);

			const options: OrderListOptions = {
				expand: ['items', 'payments', 'shipments'],
			};

			await swellOrdersService.list(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/orders', {
				expand: 'items,payments,shipments',
			});
		});

		it('should handle date range parameters', async () => {
			const mockResponse: SwellOrdersList = {
				count: 0,
				results: [],
				page: 1,
				pages: 1,
			};

			mockAxios.get.mockResolvedValue(mockResponse);

			const options: OrderListOptions = {
				date_created: {
					$gte: '2023-01-01',
					$lte: '2023-12-31',
				},
				date_updated: {
					$gte: '2023-06-01',
				},
			};

			await swellOrdersService.list(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/orders', {
				date_created: {
					$gte: '2023-01-01',
					$lte: '2023-12-31',
				},
				date_updated: {
					$gte: '2023-06-01',
				},
			});
		});

		it('should validate string parameters are trimmed', async () => {
			await expect(swellOrdersService.get('  \t  \n  ')).rejects.toThrow(
				'Order ID is required',
			);

			const options: OrderStatusUpdateOptions = { status: 'complete' };
			await expect(
				swellOrdersService.updateStatus('  \t  \n  ', options),
			).rejects.toThrow('Order ID is required');
		});
	});

	describe('client recycling behavior', () => {
		it('should handle client recycling during requests', async () => {
			const mockResponse: SwellOrdersList = {
				count: 1,
				results: [
					{
						id: 'order-1',
						number: 'ORD-001',
						status: 'complete',
						account_id: 'customer-1',
						items: [],
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

			const result = await swellOrdersService.list();

			expect(result).toEqual(mockResponse);
			expect(mockAxios.get).toHaveBeenCalledWith('/orders', {});
		});
	});

	describe('error handling scenarios', () => {
		it('should handle ECONNREFUSED errors', async () => {
			const connectionError = new Error('Connection refused');
			(connectionError as any).code = 'ECONNREFUSED';
			mockAxios.get.mockRejectedValue(connectionError);

			await expect(swellOrdersService.list()).rejects.toThrow(McpError);
		});

		it('should handle timeout errors', async () => {
			const timeoutError = new Error('Request timeout');
			(timeoutError as any).code = 'ECONNABORTED';
			mockAxios.get.mockRejectedValue(timeoutError);

			await expect(swellOrdersService.list()).rejects.toThrow(McpError);
		});

		it('should handle authentication errors', async () => {
			const authError = new Error('Unauthorized');
			(authError as any).status = 401;
			mockAxios.get.mockRejectedValue(authError);

			await expect(swellOrdersService.list()).rejects.toThrow(McpError);
		});

		it('should handle validation errors during status update', async () => {
			const validationError = new Error('Validation failed');
			(validationError as any).status = 400;
			mockAxios.put.mockRejectedValue(validationError);

			const options: OrderStatusUpdateOptions = { status: 'complete' };

			await expect(
				swellOrdersService.updateStatus('order-1', options),
			).rejects.toThrow(McpError);
		});
	});
});
