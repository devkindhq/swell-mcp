import { z } from 'zod';
import { SwellAddressSchema, SwellOrderSchema } from './swell.orders.types.js';

/**
 * Zod Schema for Swell Customer Group
 */
export const SwellCustomerGroupSchema = z.object({
	id: z.string().optional(),
	name: z.string().optional(),
	description: z.string().optional(),
});

/**
 * Zod Schema for Swell Customer Account Credit
 */
export const SwellAccountCreditSchema = z.object({
	amount: z.number().optional(),
	currency: z.string().optional(),
});

/**
 * Zod Schema for Swell Customer
 */
export const SwellCustomerSchema = z.object({
	id: z.string(),
	email: z.string().optional(),
	first_name: z.string().optional(),
	last_name: z.string().optional(),
	name: z.string().optional(),
	phone: z.string().optional(),
	date_created: z.string().optional(),
	date_updated: z.string().optional(),
	order_count: z.number().optional(),
	order_value: z.number().optional(),
	balance: z.number().optional(),
	account_credit_amount: z.number().optional(),
	account_credit: SwellAccountCreditSchema.optional(),
	group: SwellCustomerGroupSchema.optional(),
	group_id: z.string().optional(),
	addresses: z.array(SwellAddressSchema).optional(),
	billing: SwellAddressSchema.optional(),
	shipping: SwellAddressSchema.optional(),
	notes: z.string().optional(),
	tags: z.array(z.string()).optional(),
	metadata: z.record(z.unknown()).optional(),
	email_optin: z.boolean().optional(),
	sms_optin: z.boolean().optional(),
	currency: z.string().optional(),
	date_first_order: z.string().optional(),
	date_last_order: z.string().optional(),
	orders: z.array(SwellOrderSchema).optional(),
});

/**
 * Zod Schema for Swell Customers List Response
 */
export const SwellCustomersListSchema = z.object({
	count: z.number(),
	results: z.array(SwellCustomerSchema),
	page: z.number().optional(),
	pages: z.number().optional(),
});

/**
 * TypeScript types inferred from Zod schemas
 */
export type SwellCustomerGroup = z.infer<typeof SwellCustomerGroupSchema>;
export type SwellAccountCredit = z.infer<typeof SwellAccountCreditSchema>;
export type SwellCustomer = z.infer<typeof SwellCustomerSchema>;
export type SwellCustomersList = z.infer<typeof SwellCustomersListSchema>;

/**
 * Options for customer listing requests
 */
export interface CustomerListOptions {
	page?: number;
	limit?: number;
	email?: string;
	first_name?: string;
	last_name?: string;
	phone?: string;
	group_id?: string;
	tags?: string[];
	date_created?: {
		$gte?: string;
		$lte?: string;
	};
	date_updated?: {
		$gte?: string;
		$lte?: string;
	};
	order_count?: {
		$gte?: number;
		$lte?: number;
	};
	order_value?: {
		$gte?: number;
		$lte?: number;
	};
	search?: string;
	sort?: string;
	where?: Record<string, unknown>;
	expand?: string[];
}

/**
 * Options for customer search requests
 */
export interface CustomerSearchOptions {
	query: string;
	limit?: number;
	page?: number;
	group_id?: string;
	tags?: string[];
	sort?: string;
	expand?: string[];
}

/**
 * Options for customer retrieval requests
 */
export interface CustomerGetOptions {
	expand?: string[];
}

/**
 * Options for customer order history requests
 */
export interface CustomerOrderHistoryOptions {
	customer_id: string;
	page?: number;
	limit?: number;
	status?: string | string[];
	date_from?: string;
	date_to?: string;
	sort?: string;
}

/**
 * Options for customer analytics
 */
export interface CustomerAnalyticsOptions {
	customer_id?: string;
	group_id?: string;
	date_from?: string;
	date_to?: string;
	metrics?: (
		| 'order_count'
		| 'order_value'
		| 'average_order_value'
		| 'lifetime_value'
	)[];
}
