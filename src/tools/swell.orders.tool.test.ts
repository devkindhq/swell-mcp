import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import swellOrdersTools from './swell.orders.tool.js';
import swellOrdersController from '../controllers/swell.orders.controller.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { McpError, ErrorType } from '../utils/error.util.js';

// Mock the controller
jest.mock('../controllers/swell.orders.controller.js');
const mockController = swellOrdersController as jest.Mocked<
	typeof swellOrdersController
>;

// Mock the error utility
jest.mock('../utils/error.util.js', () => ({
	...jest.requireActual('../utils/error.util.js'),
	formatErrorForMcpTool: jest.fn(),
}));
const mockFormatError = formatErrorForMcpTool as jest.MockedFunction<
	typeof formatErrorForMcpTool
>;

describe('Swell Orders Tools Integration', () => {
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
			content: 'Mocked orders list response',
		});
		mockController.get.mockResolvedValue({
			content: 'Mocked order details response',
		});
		mockController.updateStatus.mockResolvedValue({
			content: 'Mocked order status update response',
		});

		// Mock error formatter
		mockFormatError.mockReturnValue({
			content: [{ type: 'text', text: 'Formatted error message' }],
		});
	});

	describe('Tool Registration', () => {
		it('should register all order tools with correct names and descriptions', () => {
			swellOrdersTools.registerTools(mockServer);

			expect(mockServer.tool).toHaveBeenCalledTimes(3);
			expect(registeredTools.has('swell_list_orders')).toBe(true);
			expect(registeredTools.has('swell_get_order')).toBe(true);
			expect(registeredTools.has('swell_update_order_status')).toBe(true);
		});

		it('should register tools with proper descriptions', () => {
			swellOrdersTools.registerTools(mockServer);

			const listTool = registeredTools.get('swell_list_orders');
			expect(listTool.description).toContain('List orders');
			expect(listTool.description).toContain('filtering options');

			const getTool = registeredTools.get('swell_get_order');
			expect(getTool.description).toContain('detailed information');
			expect(getTool.description).toContain('specific order');

			const updateTool = registeredTools.get('swell_update_order_status');
			expect(updateTool.description).toContain('Update the status');
			expect(updateTool.description).toContain('order status');
		});

		it('should register tools with proper schema validation', () => {
			swellOrdersTools.registerTools(mockServer);

			const listTool = registeredTools.get('swell_list_orders');
			expect(listTool.schema).toHaveProperty('page');
			expect(listTool.schema).toHaveProperty('limit');
			expect(listTool.schema).toHaveProperty('status');
			expect(listTool.schema).toHaveProperty('customerId');

			const getTool = registeredTools.get('swell_get_order');
			expect(getTool.schema).toHaveProperty('orderId');
			expect(getTool.schema).toHaveProperty('expand');

			const updateTool = registeredTools.get('swell_update_order_status');
			expect(updateTool.schema).toHaveProperty('orderId');
			expect(updateTool.schema).toHaveProperty('status');
			expect(updateTool.schema).toHaveProperty('notes');
		});
	});

	describe('swell_list_orders Tool', () => {
		let toolHandler: Function;

		beforeEach(() => {
			swellOrdersTools.registerTools(mockServer);
			toolHandler = registeredTools.get('swell_list_orders').handler;
		});

		it('should successfully call controller and format response', async () => {
			const args = { page: 1, limit: 20, status: 'complete' };

			const result = await toolHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: 'Mocked orders list response',
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
				status: 'pending' as const,
				customerId: 'customer-123',
				dateFrom: '2023-01-01',
				dateTo: '2023-12-31',
				sort: 'date_created_desc',
				expand: ['items', 'account'],
			};

			await toolHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
		});

		it('should handle empty arguments', async () => {
			await toolHandler({});

			expect(mockController.list).toHaveBeenCalledWith({});
		});

		it('should validate order status enum values', async () => {
			const validStatuses = [
				'pending',
				'payment_pending',
				'delivery_pending',
				'complete',
				'canceled',
			];

			for (const status of validStatuses) {
				await toolHandler({ status });
				expect(mockController.list).toHaveBeenCalledWith({ status });
			}
		});
	});

	describe('swell_get_order Tool', () => {
		let toolHandler: Function;

		beforeEach(() => {
			swellOrdersTools.registerTools(mockServer);
			toolHandler = registeredTools.get('swell_get_order').handler;
		});

		it('should successfully get order details', async () => {
			const args = {
				orderId: 'order-123',
				expand: ['items', 'account', 'billing'],
			};

			const result = await toolHandler(args);

			expect(mockController.get).toHaveBeenCalledWith(args);
			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: 'Mocked order details response',
					},
				],
			});
		});

		it('should handle missing orderId', async () => {
			const error = new McpError(
				'Order ID is required',
				ErrorType.API_ERROR,
			);
			mockController.get.mockRejectedValue(error);
			await toolHandler({ orderId: '' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
		});

		it('should handle order not found errors', async () => {
			const error = new McpError('Order not found', ErrorType.API_ERROR);
			mockController.get.mockRejectedValue(error);
			await toolHandler({ orderId: '' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
		});

		it('should pass expand options correctly', async () => {
			const args = {
				orderId: 'order-123',
				expand: ['items', 'account', 'billing', 'shipping'],
			};

			await toolHandler(args);

			expect(mockController.get).toHaveBeenCalledWith(args);
		});

		it('should use default expand options when not provided', async () => {
			const args = { orderId: 'order-123' };

			await toolHandler(args);

			expect(mockController.get).toHaveBeenCalledWith(args);
		});
	});

	describe('swell_update_order_status Tool', () => {
		let toolHandler: Function;

		beforeEach(() => {
			swellOrdersTools.registerTools(mockServer);
			toolHandler = registeredTools.get(
				'swell_update_order_status',
			).handler;
		});

		it('should successfully update order status', async () => {
			const args = {
				orderId: 'order-123',
				status: 'complete' as const,
				notes: 'Order completed successfully',
			};

			const result = await toolHandler(args);

			expect(mockController.updateStatus).toHaveBeenCalledWith(args);
			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: 'Mocked order status update response',
					},
				],
			});
		});

		it('should handle missing orderId', async () => {
			const error = new McpError(
				'Order ID is required',
				ErrorType.API_ERROR,
			);
			mockController.updateStatus.mockRejectedValue(error);
			await toolHandler({ orderId: '', status: 'complete' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
		});

		it('should handle invalid status values', async () => {
			const error = new McpError(
				'Invalid status value',
				ErrorType.API_ERROR,
			);
			mockController.updateStatus.mockRejectedValue(error);
			await toolHandler({ orderId: 'order-123', status: 'invalid' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
		});

		it('should update status without notes', async () => {
			const args = {
				orderId: 'order-123',
				status: 'canceled' as const,
			};

			await toolHandler(args);

			expect(mockController.updateStatus).toHaveBeenCalledWith(args);
		});

		it('should validate all status enum values', async () => {
			const validStatuses = [
				'pending',
				'payment_pending',
				'delivery_pending',
				'complete',
				'canceled',
			] as const;

			for (const status of validStatuses) {
				await toolHandler({ orderId: 'order-123', status });
				expect(mockController.updateStatus).toHaveBeenCalledWith({
					orderId: 'order-123',
					status,
				});
			}
		});

		it('should handle order update API errors', async () => {
			const error = new McpError(
				'Order update failed',
				ErrorType.API_ERROR,
			);
			mockController.updateStatus.mockRejectedValue(error);
			await toolHandler({ orderId: 'order-123', status: 'complete' });
			expect(mockFormatError).toHaveBeenCalledWith(error);
		});
	});

	describe('Error Handling Integration', () => {
		beforeEach(() => {
			swellOrdersTools.registerTools(mockServer);
		});

		it('should handle network errors consistently across all tools', async () => {
			const networkError = new McpError(
				'Network connection failed',
				ErrorType.API_ERROR,
			);

			mockController.list.mockRejectedValue(networkError);
			mockController.get.mockRejectedValue(networkError);
			mockController.updateStatus.mockRejectedValue(networkError);

			const listHandler =
				registeredTools.get('swell_list_orders').handler;
			const getHandler = registeredTools.get('swell_get_order').handler;
			const updateHandler = registeredTools.get(
				'swell_update_order_status',
			).handler;

			await listHandler({});
			await getHandler({ orderId: 'test' });
			await updateHandler({ orderId: 'test', status: 'complete' });

			expect(mockFormatError).toHaveBeenCalledTimes(3);
			expect(mockFormatError).toHaveBeenCalledWith(networkError);
		});

		it('should handle authentication errors consistently', async () => {
			const authError = new McpError(
				'Invalid API credentials',
				ErrorType.AUTH_INVALID,
			);

			mockController.list.mockRejectedValue(authError);

			const listHandler =
				registeredTools.get('swell_list_orders').handler;
			const result = await listHandler({});

			expect(mockFormatError).toHaveBeenCalledWith(authError);
			expect(result).toEqual({
				content: [{ type: 'text', text: 'Formatted error message' }],
			});
		});

		it('should handle permission errors for order updates', async () => {
			const permissionError = new McpError(
				'Insufficient permissions to update order',
				ErrorType.API_ERROR,
			);

			mockController.updateStatus.mockRejectedValue(permissionError);

			const updateHandler = registeredTools.get(
				'swell_update_order_status',
			).handler;
			await updateHandler({ orderId: 'order-123', status: 'complete' });

			expect(mockFormatError).toHaveBeenCalledWith(permissionError);
		});
	});

	describe('Response Formatting', () => {
		beforeEach(() => {
			swellOrdersTools.registerTools(mockServer);
		});

		it('should format successful responses consistently', async () => {
			const testContent = 'Test order response content';
			mockController.list.mockResolvedValue({ content: testContent });

			const listHandler =
				registeredTools.get('swell_list_orders').handler;
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

			const getHandler = registeredTools.get('swell_get_order').handler;
			const result = await getHandler({ orderId: 'order-123' });

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
				registeredTools.get('swell_list_orders').handler,
				registeredTools.get('swell_get_order').handler,
				registeredTools.get('swell_update_order_status').handler,
			];

			const args = [
				{},
				{ orderId: 'test' },
				{ orderId: 'test', status: 'complete' },
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
			swellOrdersTools.registerTools(mockServer);
		});

		it('should validate required parameters through controller', async () => {
			const getHandler = registeredTools.get('swell_get_order').handler;
			const updateHandler = registeredTools.get(
				'swell_update_order_status',
			).handler;

			// Test missing required parameters
			await getHandler({ orderId: undefined });
			await updateHandler({ orderId: undefined, status: 'complete' });

			expect(mockController.get).toHaveBeenCalledWith({
				orderId: undefined,
			});
			expect(mockController.updateStatus).toHaveBeenCalledWith({
				orderId: undefined,
				status: 'complete',
			});
		});

		it('should pass optional parameters correctly', async () => {
			const listHandler =
				registeredTools.get('swell_list_orders').handler;

			const args = {
				page: 1,
				limit: 20,
				status: 'pending' as const,
				customerId: 'customer-123',
				dateFrom: '2023-01-01',
				dateTo: '2023-12-31',
				sort: 'date_created_desc',
				expand: ['items', 'account'],
			};

			await listHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
		});

		it('should handle date filtering parameters', async () => {
			const listHandler =
				registeredTools.get('swell_list_orders').handler;

			const args = {
				dateFrom: '2023-01-01',
				dateTo: '2023-12-31',
			};

			await listHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
		});

		it('should handle customer filtering', async () => {
			const listHandler =
				registeredTools.get('swell_list_orders').handler;

			const args = {
				customerId: 'customer-456',
				status: 'complete' as const,
			};

			await listHandler(args);

			expect(mockController.list).toHaveBeenCalledWith(args);
		});
	});

	describe('Status Update Validation', () => {
		let updateHandler: Function;

		beforeEach(() => {
			swellOrdersTools.registerTools(mockServer);
			updateHandler = registeredTools.get(
				'swell_update_order_status',
			).handler;
		});

		it('should handle status transitions correctly', async () => {
			const statusTransitions = [
				{ from: 'pending', to: 'payment_pending' },
				{ from: 'payment_pending', to: 'delivery_pending' },
				{ from: 'delivery_pending', to: 'complete' },
				{ from: 'pending', to: 'canceled' },
			];

			for (const transition of statusTransitions) {
				await updateHandler({
					orderId: 'order-123',
					status: transition.to,
					notes: `Status changed from ${transition.from} to ${transition.to}`,
				});

				expect(mockController.updateStatus).toHaveBeenCalledWith({
					orderId: 'order-123',
					status: transition.to,
					notes: `Status changed from ${transition.from} to ${transition.to}`,
				});
			}
		});

		it('should handle status update with detailed notes', async () => {
			const args = {
				orderId: 'order-123',
				status: 'complete' as const,
				notes: 'Order shipped via FedEx. Tracking: 1234567890. Customer notified.',
			};

			await updateHandler(args);

			expect(mockController.updateStatus).toHaveBeenCalledWith(args);
		});
	});
});
