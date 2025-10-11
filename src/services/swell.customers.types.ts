import { z } from 'zod';
import {
	SwellAddressSchema,
	SwellOrderSchema,
	type SwellAddress,
} from './swell.orders.types.js';
import type {
	UpdateError,
	UpdateChange,
	UpdateResult,
} from '../types/common.types.js';

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
	email: z.string().nullable().optional(),
	first_name: z.string().nullable().optional(),
	last_name: z.string().nullable().optional(),
	name: z.string().nullable().optional(),
	phone: z.string().nullable().optional(),
	date_created: z.string().nullable().optional(),
	date_updated: z.string().nullable().optional(),
	order_count: z.number().nullable().optional(),
	order_value: z.number().nullable().optional(),
	balance: z.number().nullable().optional(),
	account_credit_amount: z.number().nullable().optional(),
	account_credit: SwellAccountCreditSchema.nullable().optional(),
	group: SwellCustomerGroupSchema.nullable().optional(),
	group_id: z.string().nullable().optional(),
	addresses: z.union([z.array(SwellAddressSchema), z.object({})]).optional(),
	billing: SwellAddressSchema.nullable().optional(),
	shipping: SwellAddressSchema.nullable().optional(),
	notes: z.string().nullable().optional(),
	tags: z.array(z.string()).nullable().optional(),
	metadata: z.record(z.unknown()).nullable().optional(),
	email_optin: z.boolean().nullable().optional(),
	sms_optin: z.boolean().nullable().optional(),
	currency: z.string().nullable().optional(),
	date_first_order: z.string().nullable().optional(),
	date_last_order: z.string().nullable().optional(),
	orders: z.union([z.array(SwellOrderSchema), z.object({})]).optional(),
});

/**
 * Zod Schema for Swell Customers List Response
 */
export const SwellCustomersListSchema = z.object({
	count: z.number(),
	results: z.array(SwellCustomerSchema),
	page: z.number().optional(),
	pages: z.union([z.number(), z.object({})]).optional(),
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

/**
 * Zod Schema for Customer Update Options
 */
export const CustomerUpdateOptionsSchema = z.object({
	first_name: z.string().optional(),
	last_name: z.string().optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	billing: SwellAddressSchema.optional(),
	shipping: SwellAddressSchema.optional(),
	notes: z.string().optional(),
	tags: z.array(z.string()).optional(),
	group_id: z.string().optional(),
	email_optin: z.boolean().optional(),
	sms_optin: z.boolean().optional(),
	metadata: z.record(z.unknown()).optional(),
});

/**
 * Options for customer update operations
 */
export interface CustomerUpdateOptions {
	first_name?: string;
	last_name?: string;
	email?: string;
	phone?: string;
	billing?: SwellAddress;
	shipping?: SwellAddress;
	notes?: string;
	tags?: string[];
	group_id?: string;
	email_optin?: boolean;
	sms_optin?: boolean;
	metadata?: Record<string, unknown>;
}

/**
 * Validation result for customer updates
 */
export interface CustomerUpdateValidation {
	email?: {
		format: boolean;
		unique: boolean;
	};
	phone?: {
		format: boolean;
	};
	required_fields: string[];
}

/**
 * Re-export shared update types for convenience
 */
export type { UpdateError, UpdateChange, UpdateResult };
