// TODO: Revisit type definitions after Swell API documentation response
// Currently using 'any' types for some variant properties due to incomplete type definitions

import {
	SwellProduct,
	SwellProductsList,
	ProductListOptions,
	ProductSearchOptions,
	UpdateResult,
} from '../services/swell.products.types.js';
import {
	formatDate,
	formatHeading,
	formatBulletList,
	formatSeparator,
} from '../utils/formatter.util.js';

/**
 * Format products list into structured Markdown.
 * @param data - Products list data from the service
 * @param options - Original request options for context
 * @returns Formatted Markdown string
 */
export function formatProductsList(
	data: SwellProductsList,
	options: ProductListOptions,
): string {
	const lines: string[] = [];

	// Add main heading
	lines.push(formatHeading('Products List', 1));
	lines.push('');

	// Add summary information
	const summaryInfo: Record<string, unknown> = {
		'Total Products': data.count,
		'Current Page': data.page || 1,
		'Total Pages': typeof data.pages === 'number' ? data.pages : 1,
		'Products per Page': options.limit || 20,
	};

	// Add filter information if applicable
	if (options.active !== undefined) {
		summaryInfo['Active Filter'] = options.active
			? 'Active only'
			: 'Inactive only';
	}
	if (options.category) {
		summaryInfo['Category Filter'] = options.category;
	}
	if (options.tags && options.tags.length > 0) {
		summaryInfo['Tags Filter'] = options.tags.join(', ');
	}
	if (options.sort) {
		summaryInfo['Sort Order'] = options.sort;
	}

	lines.push(formatBulletList(summaryInfo));
	lines.push('');

	// Add products table
	if (data.results.length === 0) {
		lines.push('*No products found matching the criteria.*');
	} else {
		lines.push(formatHeading('Products', 2));
		lines.push('');

		// Create table header
		lines.push('| ID | Name | SKU | Price | Stock | Status |');
		lines.push('|---|---|---|---|---|---|');

		// Add product rows
		for (const product of data.results) {
			const price = formatPrice(product.price, product.sale_price);
			const stock = formatStock(
				product.stock_level,
				product.stock_status,
			);
			const status = product.active ? '✅ Active' : '❌ Inactive';

			lines.push(
				`| ${product.id} | ${product.name} | ${product.sku || 'N/A'} | ${price} | ${stock} | ${status} |`,
			);
		}
	}

	lines.push('');
	lines.push(formatSeparator());
	lines.push(`*Retrieved at ${formatDate(new Date())}*`);

	return lines.join('\n');
}

/**
 * Format product details into comprehensive Markdown.
 * @param product - Product data from the service
 * @param options - Formatting options
 * @returns Formatted Markdown string
 */
export function formatProductDetails(
	product: SwellProduct,
	options: { focusStock?: boolean } = {},
): string {
	const lines: string[] = [];

	// Add main heading
	lines.push(formatHeading(`Product: ${product.name}`, 1));
	lines.push('');

	// Add basic information
	lines.push(formatHeading('Basic Information', 2));
	const basicInfo: Record<string, unknown> = {
		'Product ID': product.id,
		Name: product.name,
		SKU: product.sku || 'Not assigned',
		Slug: product.slug || 'Not assigned',
		Status: product.active ? '✅ Active' : '❌ Inactive',
		'Created Date': product.date_created,
		'Updated Date': product.date_updated,
	};

	lines.push(formatBulletList(basicInfo));
	lines.push('');

	// Add pricing information
	lines.push(formatHeading('Pricing', 2));
	const pricingInfo: Record<string, unknown> = {
		'Regular Price': formatCurrency(product.price),
		'Sale Price': product.sale_price
			? formatCurrency(product.sale_price)
			: 'No sale price',
		'Effective Price': formatPrice(product.price, product.sale_price),
	};

	lines.push(formatBulletList(pricingInfo));
	lines.push('');

	// Add stock information (highlighted if focusStock is true)
	const stockHeading = options.focusStock ? 'Stock Status 📦' : 'Stock';
	lines.push(formatHeading(stockHeading, 2));
	const stockInfo: Record<string, unknown> = {
		'Stock Level': product.stock_level ?? 'Not tracked',
		'Stock Status': formatStockStatus(product.stock_status),
		Availability: getAvailabilityMessage(
			product.stock_level,
			product.stock_status,
		),
	};

	lines.push(formatBulletList(stockInfo));
	lines.push('');

	// Add description if available
	if (product.description) {
		lines.push(formatHeading('Description', 2));
		lines.push(product.description);
		lines.push('');
	}

	// Add categories if available
	if (
		product.categories &&
		Array.isArray(product.categories) &&
		product.categories.length > 0
	) {
		lines.push(formatHeading('Categories', 2));
		for (const category of product.categories) {
			lines.push(
				`- **${category.name}** (${category.slug || category.id})`,
			);
		}
		lines.push('');
	}

	// Add tags if available
	if (product.tags && product.tags.length > 0) {
		lines.push(formatHeading('Tags', 2));
		lines.push(product.tags.map((tag) => `\`${tag}\``).join(', '));
		lines.push('');
	}

	// Add variants if available
	if (
		product.variants &&
		Array.isArray(product.variants) &&
		product.variants.length > 0
	) {
		lines.push(formatHeading('Variants', 2));
		lines.push('');

		// Create variants table
		lines.push('| Variant ID | Name | SKU | Price | Stock | Status |');
		lines.push('|---|---|---|---|---|---|');

		for (const variant of product.variants as unknown[]) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const typedVariant = variant as any;
			const variantPrice = formatPrice(
				typedVariant.price,
				typedVariant.sale_price,
			);
			const variantStock = formatStock(
				typedVariant.stock_level,
				typedVariant.stock_status,
			);
			const variantName = typedVariant.name || 'Unnamed variant';

			lines.push(
				`| ${typedVariant.id || 'N/A'} | ${variantName} | ${typedVariant.sku || 'N/A'} | ${variantPrice} | ${variantStock} | ${formatStockStatus(typedVariant.stock_status)} |`,
			);
		}
		lines.push('');
	}

	// Add images if available
	if (product.images && product.images.length > 0) {
		lines.push(formatHeading('Images', 2));
		for (let i = 0; i < product.images.length; i++) {
			const image = product.images[i];
			if (image.file?.url) {
				const caption = image.caption || `Image ${i + 1}`;
				lines.push(`- [${caption}](${image.file.url})`);
				if (image.file.width && image.file.height) {
					lines.push(
						`  - Dimensions: ${image.file.width}x${image.file.height}px`,
					);
				}
			}
		}
		lines.push('');
	}

	// Add SEO information if available
	if (product.meta_title || product.meta_description) {
		lines.push(formatHeading('SEO Information', 2));
		const seoInfo: Record<string, unknown> = {};
		if (product.meta_title) {
			seoInfo['Meta Title'] = product.meta_title;
		}
		if (product.meta_description) {
			seoInfo['Meta Description'] = product.meta_description;
		}
		lines.push(formatBulletList(seoInfo));
		lines.push('');
	}

	// Add custom attributes if available
	if (product.attributes && Object.keys(product.attributes).length > 0) {
		lines.push(formatHeading('Custom Attributes', 2));
		lines.push(formatBulletList(product.attributes));
		lines.push('');
	}

	lines.push(formatSeparator());
	lines.push(`*Retrieved at ${formatDate(new Date())}*`);

	return lines.join('\n');
}

/**
 * Format product search results into structured Markdown.
 * @param data - Search results data from the service
 * @param options - Original search options for context
 * @returns Formatted Markdown string
 */
export function formatProductSearch(
	data: SwellProductsList,
	options: ProductSearchOptions,
): string {
	const lines: string[] = [];

	// Add main heading
	lines.push(formatHeading(`Search Results: "${options.query}"`, 1));
	lines.push('');

	// Add search summary
	const searchInfo: Record<string, unknown> = {
		'Search Query': options.query,
		'Results Found': data.count,
		'Current Page': data.page || 1,
		'Total Pages': typeof data.pages === 'number' ? data.pages : 1,
		'Results per Page': options.limit || 20,
	};

	// Add filter information if applicable
	if (options.active !== undefined) {
		searchInfo['Active Filter'] = options.active
			? 'Active only'
			: 'Inactive only';
	}
	if (options.category) {
		searchInfo['Category Filter'] = options.category;
	}
	if (options.tags && options.tags.length > 0) {
		searchInfo['Tags Filter'] = options.tags.join(', ');
	}
	if (options.sort) {
		searchInfo['Sort Order'] = options.sort;
	}

	lines.push(formatBulletList(searchInfo));
	lines.push('');

	// Add search results
	if (data.results.length === 0) {
		lines.push('*No products found matching your search criteria.*');
		lines.push('');
		lines.push('**Suggestions:**');
		lines.push('- Try different keywords');
		lines.push('- Check spelling');
		lines.push('- Use broader search terms');
		lines.push('- Remove filters to see more results');
	} else {
		lines.push(formatHeading('Search Results', 2));
		lines.push('');

		// Create results table
		lines.push('| Rank | Name | SKU | Price | Stock | Match |');
		lines.push('|---|---|---|---|---|---|');

		// Add product rows with ranking
		for (let i = 0; i < data.results.length; i++) {
			const product = data.results[i];
			const rank = ((data.page || 1) - 1) * (options.limit || 20) + i + 1;
			const price = formatPrice(product.price, product.sale_price);
			const stock = formatStock(
				product.stock_level,
				product.stock_status,
			);
			const match = getSearchMatchInfo(product, options.query);

			lines.push(
				`| ${rank} | ${product.name} | ${product.sku || 'N/A'} | ${price} | ${stock} | ${match} |`,
			);
		}

		// Add pagination info if there are multiple pages
		const totalPages = typeof data.pages === 'number' ? data.pages : 1;
		if (totalPages > 1) {
			lines.push('');
			lines.push(formatHeading('Pagination', 3));
			const currentPage = data.page || 1;
			lines.push(`Page ${currentPage} of ${totalPages}`);

			if (currentPage > 1) {
				lines.push(`- Previous page: ${currentPage - 1}`);
			}
			if (currentPage < totalPages) {
				lines.push(`- Next page: ${currentPage + 1}`);
			}
		}
	}

	lines.push('');
	lines.push(formatSeparator());
	lines.push(`*Search performed at ${formatDate(new Date())}*`);

	return lines.join('\n');
}

// Helper functions

/**
 * Format price with sale price consideration
 */
function formatPrice(price?: number | null, salePrice?: number | null): string {
	if (price === undefined || price === null) {
		return 'Not set';
	}

	const regularPrice = formatCurrency(price);

	if (salePrice && salePrice < price) {
		return `~~${regularPrice}~~ **${formatCurrency(salePrice)}**`;
	}

	return regularPrice;
}

/**
 * Format currency value
 */
function formatCurrency(amount?: number | null): string {
	if (amount === undefined || amount === null) {
		return 'Not set';
	}

	return `$${amount.toFixed(2)}`;
}

/**
 * Format stock information
 */
function formatStock(level?: number, status?: string | null): string {
	const statusText = formatStockStatus(status);

	if (level !== undefined && level !== null) {
		return `${level} (${statusText})`;
	}

	return statusText;
}

/**
 * Format stock status with emoji
 */
function formatStockStatus(status?: string | null): string {
	switch (status) {
		case 'in_stock':
			return '✅ In Stock';
		case 'out_of_stock':
			return '❌ Out of Stock';
		case 'backorder':
			return '⏳ Backorder';
		case 'preorder':
			return '📅 Pre-order';
		default:
			return '❓ Unknown';
	}
}

/**
 * Get availability message based on stock level and status
 */
function getAvailabilityMessage(
	level?: number,
	status?: string | null,
): string {
	if (status === 'out_of_stock') {
		return '❌ Currently unavailable';
	}

	if (status === 'backorder') {
		return '⏳ Available for backorder';
	}

	if (status === 'preorder') {
		return '📅 Available for pre-order';
	}

	if (level !== undefined && level !== null) {
		if (level === 0) {
			return '❌ No stock available';
		} else if (level <= 5) {
			return '⚠️ Low stock - order soon';
		} else {
			return '✅ In stock and ready to ship';
		}
	}

	return '❓ Stock status unknown';
}

/**
 * Format product update result into structured Markdown.
 * @param result - Update result from the service
 * @param updateType - Type of update performed (for context)
 * @returns Formatted Markdown string
 */
export function formatProductUpdate(
	result: UpdateResult<SwellProduct>,
	updateType: string = 'Product Update',
): string {
	const lines: string[] = [];

	// Add main heading
	lines.push(formatHeading(`${updateType} Result`, 1));
	lines.push('');

	// Add success status
	if (result.success) {
		lines.push('✅ **Update completed successfully**');
	} else {
		lines.push('❌ **Update failed**');
	}
	lines.push('');

	// Add product information
	if (result.data) {
		lines.push(formatHeading('Updated Product', 2));
		const productInfo: Record<string, unknown> = {
			'Product ID': result.data.id,
			Name: result.data.name,
			SKU: result.data.sku || 'Not assigned',
			Status: result.data.active ? '✅ Active' : '❌ Inactive',
			'Current Price': formatPrice(
				result.data.price,
				result.data.sale_price,
			),
			'Stock Level': result.data.stock_level ?? 'Not tracked',
			'Stock Status': formatStockStatus(result.data.stock_status),
		};

		lines.push(formatBulletList(productInfo));
		lines.push('');
	}

	// Add changes summary
	if (result.changes && result.changes.length > 0) {
		lines.push(formatHeading('Changes Made', 2));
		lines.push('');

		// Create changes table
		lines.push('| Field | Previous Value | New Value |');
		lines.push('|---|---|---|');

		for (const change of result.changes) {
			const oldValue = formatChangeValue(change.oldValue);
			const newValue = formatChangeValue(change.newValue);
			lines.push(`| ${change.field} | ${oldValue} | ${newValue} |`);
		}
		lines.push('');
	} else if (result.success) {
		lines.push('*No changes were made (values were already up to date)*');
		lines.push('');
	}

	// Add errors if any
	if (result.errors && result.errors.length > 0) {
		lines.push(formatHeading('Errors', 2));
		for (const error of result.errors) {
			lines.push(`- **${error.type}**: ${error.message}`);
			if (error.field) {
				lines.push(`  - Field: ${error.field}`);
			}
		}
		lines.push('');
	}

	lines.push(formatSeparator());
	lines.push(`*Update performed at ${formatDate(new Date())}*`);

	return lines.join('\n');
}

/**
 * Format a change value for display in the changes table
 */
function formatChangeValue(value: unknown): string {
	if (value === null || value === undefined) {
		return 'Not set';
	}

	if (typeof value === 'boolean') {
		return value ? 'Yes' : 'No';
	}

	if (typeof value === 'number') {
		return value.toString();
	}

	if (Array.isArray(value)) {
		return value.length > 0 ? value.join(', ') : 'None';
	}

	if (typeof value === 'object') {
		return JSON.stringify(value);
	}

	return String(value);
}

/**
 * Determine what part of the product matched the search query
 */
function getSearchMatchInfo(product: SwellProduct, query: string): string {
	const lowerQuery = query.toLowerCase();
	const matches: string[] = [];

	if (product.name.toLowerCase().includes(lowerQuery)) {
		matches.push('Name');
	}

	if (product.sku?.toLowerCase().includes(lowerQuery)) {
		matches.push('SKU');
	}

	if (product.description?.toLowerCase().includes(lowerQuery)) {
		matches.push('Description');
	}

	if (product.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))) {
		matches.push('Tags');
	}

	if (matches.length === 0) {
		return 'Other';
	}

	return matches.join(', ');
}
