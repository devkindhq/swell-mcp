import swellProductsService from './swell.products.service.js';
import { swellClient } from '../utils/swell-client.util.js';
import { McpError } from '../utils/error.util.js';
import {
	SwellProduct,
	SwellProductsList,
	ProductListOptions,
	ProductSearchOptions,
	ProductGetOptions,
	InventoryCheckOptions,
} from './swell.products.types.js';

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

describe('SwellProductsService', () => {
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
		const mockProductsList: SwellProductsList = {
			count: 2,
			results: [
				{
					id: 'product-1',
					name: 'Test Product 1',
					slug: 'test-product-1',
					sku: 'TEST-001',
					active: true,
					price: 29.99,
					stock_level: 10,
					stock_status: 'in_stock',
					description: 'Test product description',
					images: [],
					date_created: '2023-01-01T00:00:00.000Z',
					date_updated: '2023-01-01T00:00:00.000Z',
				},
				{
					id: 'product-2',
					name: 'Test Product 2',
					slug: 'test-product-2',
					sku: 'TEST-002',
					active: true,
					price: 49.99,
					stock_level: 5,
					stock_status: 'in_stock',
					description: 'Another test product',
					images: [],
					date_created: '2023-01-02T00:00:00.000Z',
					date_updated: '2023-01-02T00:00:00.000Z',
				},
			],
			page: 1,
			pages: 1,
		};

		it('should successfully fetch products list with default options', async () => {
			mockAxios.get.mockResolvedValue(mockProductsList);

			const result = await swellProductsService.list();

			expect(mockAxios.get).toHaveBeenCalledWith('/products', {});
			expect(result).toEqual(mockProductsList);
		});

		it('should fetch products list with filtering options', async () => {
			const options: ProductListOptions = {
				page: 2,
				limit: 10,
				active: true,
				category: 'electronics',
				tags: ['featured', 'sale'],
				search: 'laptop',
				sort: 'price_asc',
				expand: ['variants', 'categories'],
			};

			mockAxios.get.mockResolvedValue(mockProductsList);

			const result = await swellProductsService.list(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/products', {
				page: 2,
				limit: 10,
				active: true,
				category: 'electronics',
				tags: 'featured,sale',
				search: 'laptop',
				sort: 'price_asc',
				expand: 'variants,categories',
			});
			expect(result).toEqual(mockProductsList);
		});

		it('should initialize client if not initialized', async () => {
			mockSwellClient.isClientInitialized.mockReturnValue(false);
			mockAxios.get.mockResolvedValue(mockProductsList);

			await swellProductsService.list();

			expect(mockSwellClient.initWithAutoConfig).toHaveBeenCalled();
		});

		it('should handle API errors', async () => {
			const apiError = new Error('API Error');
			mockAxios.get.mockRejectedValue(apiError);

			await expect(swellProductsService.list()).rejects.toThrow(McpError);
		});

		it('should handle Zod validation errors', async () => {
			const invalidResponse = { invalid: 'data' };
			mockAxios.get.mockResolvedValue(invalidResponse);

			await expect(swellProductsService.list()).rejects.toThrow(McpError);
		});

		it('should handle connection errors with retry logic', async () => {
			const connectionError = new Error('ECONNABORTED');
			(connectionError as any).code = 'ECONNABORTED';
			mockAxios.get.mockRejectedValue(connectionError);

			await expect(swellProductsService.list()).rejects.toThrow(McpError);
		});

		it('should handle authentication errors', async () => {
			const authError = new Error('Unauthorized');
			(authError as any).status = 401;
			mockAxios.get.mockRejectedValue(authError);

			await expect(swellProductsService.list()).rejects.toThrow(McpError);
		});
	});

	describe('get', () => {
		const mockProduct: SwellProduct = {
			id: 'product-1',
			name: 'Test Product',
			slug: 'test-product',
			sku: 'TEST-001',
			active: true,
			price: 29.99,
			stock_level: 10,
			stock_status: 'in_stock',
			description: 'Test product description',
			images: [],
			date_created: '2023-01-01T00:00:00.000Z',
			date_updated: '2023-01-01T00:00:00.000Z',
		};

		it('should successfully fetch product by ID', async () => {
			mockAxios.get.mockResolvedValue(mockProduct);

			const result = await swellProductsService.get('product-1');

			expect(mockAxios.get).toHaveBeenCalledWith(
				'/products/product-1',
				{},
			);
			expect(result).toEqual(mockProduct);
		});

		it('should fetch product with expand options', async () => {
			const options: ProductGetOptions = {
				expand: ['variants', 'categories'],
			};

			mockAxios.get.mockResolvedValue(mockProduct);

			const result = await swellProductsService.get('product-1', options);

			expect(mockAxios.get).toHaveBeenCalledWith('/products/product-1', {
				expand: 'variants,categories',
			});
			expect(result).toEqual(mockProduct);
		});

		it('should throw error for empty product ID', async () => {
			await expect(swellProductsService.get('')).rejects.toThrow(
				'Product ID is required',
			);
		});

		it('should handle product not found', async () => {
			mockAxios.get.mockResolvedValue(null);

			await expect(
				swellProductsService.get('nonexistent'),
			).rejects.toThrow('Product not found: nonexistent');
		});

		it('should handle API errors', async () => {
			const apiError = new Error('API Error');
			mockAxios.get.mockRejectedValue(apiError);

			await expect(swellProductsService.get('product-1')).rejects.toThrow(
				McpError,
			);
		});

		it('should handle validation errors', async () => {
			const invalidResponse = { invalid: 'data' };
			mockAxios.get.mockResolvedValue(invalidResponse);

			await expect(swellProductsService.get('product-1')).rejects.toThrow(
				McpError,
			);
		});
	});

	describe('search', () => {
		const mockSearchResults: SwellProductsList = {
			count: 1,
			results: [
				{
					id: 'product-1',
					name: 'Laptop Computer',
					slug: 'laptop-computer',
					sku: 'LAPTOP-001',
					active: true,
					price: 999.99,
					stock_level: 3,
					stock_status: 'in_stock',
					description: 'High-performance laptop',
					images: [],
					date_created: '2023-01-01T00:00:00.000Z',
					date_updated: '2023-01-01T00:00:00.000Z',
				},
			],
			page: 1,
			pages: 1,
		};

		it('should successfully search products', async () => {
			mockAxios.get.mockResolvedValue(mockSearchResults);

			const options: ProductSearchOptions = {
				query: 'laptop',
				limit: 20,
			};

			const result = await swellProductsService.search(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/products', {
				search: 'laptop',
				limit: 20,
			});
			expect(result).toEqual(mockSearchResults);
		});

		it('should search with additional filters', async () => {
			mockAxios.get.mockResolvedValue(mockSearchResults);

			const options: ProductSearchOptions = {
				query: 'laptop',
				active: true,
				category: 'electronics',
				tags: ['featured'],
				sort: 'price_desc',
				expand: ['variants'],
			};

			const result = await swellProductsService.search(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/products', {
				search: 'laptop',
				active: true,
				category: 'electronics',
				tags: 'featured',
				sort: 'price_desc',
				expand: 'variants',
			});
			expect(result).toEqual(mockSearchResults);
		});

		it('should throw error for empty search query', async () => {
			const options: ProductSearchOptions = { query: '' };

			await expect(swellProductsService.search(options)).rejects.toThrow(
				'Search query is required',
			);
		});

		it('should handle search API errors', async () => {
			const apiError = new Error('Search API Error');
			mockAxios.get.mockRejectedValue(apiError);

			const options: ProductSearchOptions = { query: 'laptop' };

			await expect(swellProductsService.search(options)).rejects.toThrow(
				McpError,
			);
		});
	});

	describe('checkInventory', () => {
		const mockProductWithInventory: SwellProduct = {
			id: 'product-1',
			name: 'Test Product',
			slug: 'test-product',
			sku: 'TEST-001',
			active: true,
			price: 29.99,
			stock_level: 10,
			stock_status: 'in_stock',
			description: 'Test product description',
			images: [],
			variants: [
				{
					id: 'variant-1',
					name: 'Small',
					sku: 'TEST-001-S',
					price: 29.99,
					stock_level: 5,
					stock_status: 'in_stock',
				},
			],
			date_created: '2023-01-01T00:00:00.000Z',
			date_updated: '2023-01-01T00:00:00.000Z',
		};

		it('should successfully check inventory for product', async () => {
			mockAxios.get.mockResolvedValue(mockProductWithInventory);

			const result =
				await swellProductsService.checkInventory('product-1');

			expect(mockAxios.get).toHaveBeenCalledWith(
				'/products/product-1',
				{},
			);
			expect(result).toEqual(mockProductWithInventory);
		});

		it('should check inventory including variants', async () => {
			mockAxios.get.mockResolvedValue(mockProductWithInventory);

			const options: InventoryCheckOptions = {
				include_variants: true,
			};

			const result = await swellProductsService.checkInventory(
				'product-1',
				options,
			);

			expect(mockAxios.get).toHaveBeenCalledWith('/products/product-1', {
				expand: 'variants',
			});
			expect(result).toEqual(mockProductWithInventory);
		});

		it('should throw error for empty product ID', async () => {
			await expect(
				swellProductsService.checkInventory(''),
			).rejects.toThrow('Product ID is required');
		});

		it('should handle inventory check API errors', async () => {
			const apiError = new Error('Inventory API Error');
			mockAxios.get.mockRejectedValue(apiError);

			await expect(
				swellProductsService.checkInventory('product-1'),
			).rejects.toThrow(McpError);
		});
	});

	describe('parameter validation and formatting', () => {
		it('should properly format array parameters', async () => {
			const mockResponse: SwellProductsList = {
				count: 0,
				results: [],
				page: 1,
				pages: 1,
			};

			mockAxios.get.mockResolvedValue(mockResponse);

			const options: ProductListOptions = {
				tags: ['tag1', 'tag2', 'tag3'],
				expand: ['variants', 'categories', 'images'],
			};

			await swellProductsService.list(options);

			expect(mockAxios.get).toHaveBeenCalledWith('/products', {
				tags: 'tag1,tag2,tag3',
				expand: 'variants,categories,images',
			});
		});

		it('should handle undefined and null parameters', async () => {
			const mockResponse: SwellProductsList = {
				count: 0,
				results: [],
				page: 1,
				pages: 1,
			};

			mockAxios.get.mockResolvedValue(mockResponse);

			const options: ProductListOptions = {
				page: undefined,
				active: undefined,
				category: '',
				tags: [],
			};

			await swellProductsService.list(options);

			// Should only include defined, non-empty parameters
			expect(mockAxios.get).toHaveBeenCalledWith('/products', {});
		});

		it('should validate string parameters are trimmed', async () => {
			await expect(
				swellProductsService.get('  \t  \n  '),
			).rejects.toThrow('Product ID is required');

			await expect(
				swellProductsService.search({ query: '  \t  \n  ' }),
			).rejects.toThrow('Search query is required');
		});
	});

	describe('client recycling behavior', () => {
		it('should handle client recycling during requests', async () => {
			const mockResponse: SwellProductsList = {
				count: 1,
				results: [
					{
						id: 'product-1',
						name: 'Test Product',
						slug: 'test-product',
						sku: 'TEST-001',
						active: true,
						price: 29.99,
						stock_level: 10,
						stock_status: 'in_stock',
						description: 'Test product description',
						images: [],
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
					createdAt: Date.now() - 20000, // 20 seconds ago
					activeRequests: 0,
					totalRequests: 1500, // Above recycling threshold
					ageMs: 20000,
				},
				oldClientsCount: 0,
				oldClients: [],
			});

			mockAxios.get.mockResolvedValue(mockResponse);

			// Advance timers to simulate time passing
			jest.advanceTimersByTime(16000); // Advance past recycling time threshold

			const result = await swellProductsService.list();

			expect(result).toEqual(mockResponse);
			expect(mockAxios.get).toHaveBeenCalledWith('/products', {});
		});

		it('should handle concurrent requests during client recycling', async () => {
			const mockResponse: SwellProductsList = {
				count: 1,
				results: [
					{
						id: 'product-1',
						name: 'Test Product',
						slug: 'test-product',
						sku: 'TEST-001',
						active: true,
						price: 29.99,
						stock_level: 10,
						stock_status: 'in_stock',
						description: 'Test product description',
						images: [],
						date_created: '2023-01-01T00:00:00.000Z',
						date_updated: '2023-01-01T00:00:00.000Z',
					},
				],
				page: 1,
				pages: 1,
			};

			mockAxios.get.mockResolvedValue(mockResponse);

			// Simulate concurrent requests
			const promise1 = swellProductsService.list({ page: 1 });
			const promise2 = swellProductsService.list({ page: 2 });

			// Advance time during concurrent requests
			jest.advanceTimersByTime(1000);

			const [result1, result2] = await Promise.all([promise1, promise2]);

			expect(result1).toEqual(mockResponse);
			expect(result2).toEqual(mockResponse);
			expect(mockAxios.get).toHaveBeenCalledTimes(2);
		});
	});

	describe('error handling scenarios', () => {
		it('should handle ECONNREFUSED errors', async () => {
			const connectionError = new Error('Connection refused');
			(connectionError as any).code = 'ECONNREFUSED';
			mockAxios.get.mockRejectedValue(connectionError);

			await expect(swellProductsService.list()).rejects.toThrow(McpError);
		});

		it('should handle timeout errors', async () => {
			const timeoutError = new Error('Request timeout');
			(timeoutError as any).code = 'ECONNABORTED';
			mockAxios.get.mockRejectedValue(timeoutError);

			await expect(swellProductsService.list()).rejects.toThrow(McpError);
		});

		it('should handle 404 errors', async () => {
			const notFoundError = new Error('Not Found');
			(notFoundError as any).status = 404;
			mockAxios.get.mockRejectedValue(notFoundError);

			await expect(
				swellProductsService.get('nonexistent'),
			).rejects.toThrow(McpError);
		});

		it('should handle 500 server errors', async () => {
			const serverError = new Error('Internal Server Error');
			(serverError as any).status = 500;
			mockAxios.get.mockRejectedValue(serverError);

			await expect(swellProductsService.list()).rejects.toThrow(McpError);
		});

		it('should handle network errors', async () => {
			const networkError = new Error('Network Error');
			(networkError as any).code = 'NETWORK_ERROR';
			mockAxios.get.mockRejectedValue(networkError);

			await expect(swellProductsService.list()).rejects.toThrow(McpError);
		});
	});
});
