import { z } from 'zod';

/**
 * Zod Schema for Swell Address
 */
export const SwellAddressSchema = z.object({
	name: z.string().optional(),
	first_name: z.string().optional(),
	last_name: z.string().optional(),
	address1: z.string().optional(),
	address2: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	zip: z.string().optional(),
	country: z.string().optional(),
	phone: z.string().optional(),
});

/**
 * Zod Schema for Swell Order Item
 */
export const SwellOrderItemSchema = z.object({
	id: z.string().optional(),
	product_id: z.string().optional(),
	variant_id: z.string().optional(),
	product_name: z.string().optional(),
	variant_name: z.string().optional(),
	sku: z.string().optional(),
	quantity: z.number().optional(),
	price: z.number().optional(),
	price_total: z.number().optional(),
	discount_total: z.number().optional(),
	tax_total: z.number().optional(),
	delivery: z
		.object({
			service: z.string().optional(),
			price: z.number().optional(),
		})
		.optional(),
	options: z.array(z.unknown()).optional(),
});

/**
 * Zod Schema for Swell Payment
 */
export const SwellPaymentSchema = z.object({
	id: z.string().optional(),
	method: z.string().optional(),
	status: z.string().optional(),
	amount: z.number().optional(),
	currency: z.string().optional(),
	gateway: z.string().optional(),
	transaction_id: z.string().optional(),
	date_created: z.string().optional(),
});

/**
 * Zod Schema for Swell Shipment
 */
export const SwellShipmentSchema = z.object({
	id: z.string().optional(),
	carrier: z.string().optional(),
	service: z.string().optional(),
	tracking_code: z.string().optional(),
	date_created: z.string().optional(),
	items: z.array(SwellOrderItemSchema).optional(),
});

/**
 * Zod Schema for Swell Order
 */
export const SwellOrderSchema = z.object({
	id: z.string(),
	number: z.string().optional(),
	status: z
		.enum([
			'pending',
			'payment_pending',
			'delivery_pending',
			'hold',
			'complete',
			'canceled',
		])
		.optional(),
	account_id: z.string().optional(),
	account_email: z.string().optional(),
	guest: z.boolean().optional(),
	items: z.array(SwellOrderItemSchema).optional(),
	billing: SwellAddressSchema.optional(),
	shipping: SwellAddressSchema.optional(),
	item_quantity: z.number().optional(),
	item_discount: z.number().optional(),
	item_tax: z.number().optional(),
	item_tax_included: z.boolean().optional(),
	sub_total: z.number().optional(),
	discount_total: z.number().optional(),
	tax_total: z.number().optional(),
	tax_included_total: z.number().optional(),
	shipping_total: z.number().optional(),
	grand_total: z.number().optional(),
	currency: z.string().optional(),
	display_currency: z.string().optional(),
	display_locale: z.string().optional(),
	notes: z.string().optional(),
	comments: z.string().optional(),
	coupon_code: z.string().optional(),
	discount_code: z.string().optional(),
	payment: SwellPaymentSchema.optional(),
	payments: z.array(SwellPaymentSchema).optional(),
	shipments: z.array(SwellShipmentSchema).optional(),
	date_created: z.string().optional(),
	date_updated: z.string().optional(),
	date_payment_retry: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod Schema for Swell Orders List Response
 */
export const SwellOrdersListSchema = z.object({
	count: z.number(),
	results: z.array(SwellOrderSchema),
	page: z.number().optional(),
	pages: z.number().optional(),
});

/**
 * TypeScript types inferred from Zod schemas
 */
export type SwellAddress = z.infer<typeof SwellAddressSchema>;
export type SwellOrderItem = z.infer<typeof SwellOrderItemSchema>;
export type SwellPayment = z.infer<typeof SwellPaymentSchema>;
export type SwellShipment = z.infer<typeof SwellShipmentSchema>;
export type SwellOrder = z.infer<typeof SwellOrderSchema>;
export type SwellOrdersList = z.infer<typeof SwellOrdersListSchema>;

/**
 * Valid order statuses for filtering and updates
 */
export type OrderStatus =
	| 'pending'
	| 'payment_pending'
	| 'delivery_pending'
	| 'hold'
	| 'complete'
	| 'canceled';

/**
 * Options for order listing requests
 */
export interface OrderListOptions {
	page?: number;
	limit?: number;
	status?: OrderStatus | OrderStatus[];
	account_id?: string;
	account_email?: string;
	date_created?: {
		$gte?: string;
		$lte?: string;
	};
	date_updated?: {
		$gte?: string;
		$lte?: string;
	};
	search?: string;
	sort?: string;
	where?: Record<string, unknown>;
	expand?: string[];
}

/**
 * Options for order retrieval requests
 */
export interface OrderGetOptions {
	expand?: string[];
}

/**
 * Options for order status updates
 */
export interface OrderStatusUpdateOptions {
	status: OrderStatus;
	notes?: string;
	send_email?: boolean;
}

/**
 * Options for order analytics and reporting
 */
export interface OrderAnalyticsOptions {
	date_from?: string;
	date_to?: string;
	status?: OrderStatus | OrderStatus[];
	group_by?: 'day' | 'week' | 'month' | 'year';
	metrics?: ('count' | 'total' | 'average')[];
}
