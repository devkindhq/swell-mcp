import { z } from 'zod';
import type {
	UpdateError,
	UpdateChange,
	UpdateResult,
} from '../types/common.types.js';

/**
 * Zod Schema for Swell Product Image
 */
export const SwellImageSchema = z.object({
	id: z.string().optional(),
	file: z
		.object({
			id: z.string().optional(),
			url: z.string().optional(),
			width: z.number().optional(),
			height: z.number().optional(),
		})
		.optional(),
	caption: z.string().optional(),
});

/**
 * Zod Schema for Swell Product Variant
 */
export const SwellVariantSchema = z.object({
	id: z.string().optional(),
	name: z.string().optional(),
	sku: z.string().optional(),
	price: z.number().optional(),
	sale_price: z.number().nullable().optional(),
	stock_level: z.number().optional(),
	stock_status: z
		.enum(['in_stock', 'out_of_stock', 'backorder', 'preorder'])
		.nullable()
		.optional(),
	option_value_ids: z.array(z.string()).optional(),
	images: z.array(SwellImageSchema).optional(),
});

/**
 * Zod Schema for Swell Product Category
 */
export const SwellCategorySchema = z.object({
	id: z.string().optional(),
	name: z.string().optional(),
	slug: z.string().optional(),
	parent_id: z.string().optional(),
});

/**
 * Zod Schema for Swell Product
 */
export const SwellProductSchema = z.object({
	id: z.string(),
	name: z.string(),
	slug: z.string().optional(),
	sku: z.string().optional(),
	active: z.boolean().optional(),
	price: z.number().optional(),
	sale_price: z.number().nullable().optional(),
	stock_level: z.number().optional(),
	stock_status: z
		.enum(['in_stock', 'out_of_stock', 'backorder', 'preorder'])
		.nullable()
		.optional(),
	description: z.string().nullable().optional(),
	meta_description: z.string().nullable().optional(),
	meta_title: z.string().nullable().optional(),
	images: z.array(SwellImageSchema).optional(),
	variants: z.array(SwellVariantSchema).optional(),
	categories: z.array(SwellCategorySchema).optional(),
	attributes: z.record(z.unknown()).optional(),
	options: z.array(z.unknown()).optional(),
	tags: z.array(z.string()).optional(),
	date_created: z.string().optional(),
	date_updated: z.string().optional(),
});

/**
 * Zod Schema for Swell Products List Response
 */
export const SwellProductsListSchema = z.object({
	count: z.number(),
	results: z.array(SwellProductSchema),
	page: z.number().optional(),
	pages: z.union([z.number(), z.object({})]).optional(),
});

/**
 * TypeScript types inferred from Zod schemas
 */
export type SwellImage = z.infer<typeof SwellImageSchema>;
export type SwellVariant = z.infer<typeof SwellVariantSchema>;
export type SwellCategory = z.infer<typeof SwellCategorySchema>;
export type SwellProduct = z.infer<typeof SwellProductSchema>;
export type SwellProductsList = z.infer<typeof SwellProductsListSchema>;

/**
 * Options for product listing requests
 */
export interface ProductListOptions {
	page?: number;
	limit?: number;
	active?: boolean;
	category?: string;
	tags?: string[];
	search?: string;
	sort?: string;
	where?: Record<string, unknown>;
	expand?: string[];
}

/**
 * Options for product search requests
 */
export interface ProductSearchOptions {
	query: string;
	limit?: number;
	page?: number;
	active?: boolean;
	category?: string;
	tags?: string[];
	sort?: string;
	expand?: string[];
}

/**
 * Options for product retrieval requests
 */
export interface ProductGetOptions {
	expand?: string[];
}

/**
 * Options for inventory checking
 */
export interface InventoryCheckOptions {
	variant_id?: string;
	include_variants?: boolean;
}

/**
 * Valid stock status values
 */
export type StockStatus =
	| 'in_stock'
	| 'out_of_stock'
	| 'backorder'
	| 'preorder';

/**
 * Zod Schema for Product Update Options
 */
export const ProductUpdateOptionsSchema = z.object({
	name: z.string().optional(),
	description: z.string().nullable().optional(),
	price: z.number().positive().optional(),
	sale_price: z.number().positive().nullable().optional(),
	sku: z.string().optional(),
	active: z.boolean().optional(),
	stock_level: z.number().int().min(0).optional(),
	stock_status: z
		.enum(['in_stock', 'out_of_stock', 'backorder', 'preorder'])
		.optional(),
	meta_title: z.string().optional(),
	meta_description: z.string().optional(),
	tags: z.array(z.string()).optional(),
	categories: z.array(z.string()).optional(),
	attributes: z.record(z.unknown()).optional(),
});

/**
 * Options for product update operations
 */
export interface ProductUpdateOptions {
	name?: string;
	description?: string | null;
	price?: number;
	sale_price?: number | null;
	sku?: string;
	active?: boolean;
	stock_level?: number;
	stock_status?: StockStatus;
	meta_title?: string;
	meta_description?: string;
	tags?: string[];
	categories?: string[];
	attributes?: Record<string, unknown>;
}

/**
 * Zod Schema for Inventory Update Options
 */
export const InventoryUpdateOptionsSchema = z.object({
	stock_level: z.number().int().min(0).optional(),
	stock_status: z
		.enum(['in_stock', 'out_of_stock', 'backorder', 'preorder'])
		.optional(),
	stock_tracking: z.boolean().optional(),
});

/**
 * Options for inventory-specific updates
 */
export interface InventoryUpdateOptions {
	stock_level?: number;
	stock_status?: StockStatus;
	stock_tracking?: boolean;
}

/**
 * Zod Schema for Pricing Update Options
 */
export const PricingUpdateOptionsSchema = z.object({
	price: z.number().positive().optional(),
	sale_price: z.number().positive().nullable().optional(),
	currency: z.string().optional(),
});

/**
 * Options for pricing-specific updates
 */
export interface PricingUpdateOptions {
	price?: number;
	sale_price?: number | null;
	currency?: string;
}

/**
 * Re-export shared update types for convenience
 */
export type { UpdateError, UpdateChange, UpdateResult };
