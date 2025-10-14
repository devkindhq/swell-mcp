import {
	SwellCustomer,
	SwellCustomersList,
	CustomerListOptions,
	CustomerSearchOptions,
	CustomerOrderHistoryOptions,
	CustomerAnalyticsOptions,
} from '../services/swell.customers.types.js';
import { SwellAddress } from '../services/swell.orders.types.js';
import { SwellOrdersList, SwellOrder } from '../services/swell.orders.types.js';
import {
	formatDate,
	formatHeading,
	formatBulletList,
	formatSeparator,
} from '../utils/formatter.util.js';

/**
 * Format customers list into structured Markdown.
 * @param data - Customers list data from the service
 * @param options - Original request options for context
 * @param formatOptions - Additional formatting options
 * @returns Formatted Markdown string
 */
export function formatCustomersList(
	data: SwellCustomersList,
	options: CustomerListOptions | CustomerSearchOptions,
	formatOptions: { isSearchResult?: boolean } = {},
): string {
	const lines: string[] = [];

	// Add main heading
	const heading = formatOptions.isSearchResult
		? `Customer Search Results: "${(options as CustomerSearchOptions).query}"`
		: 'Customers List';
	lines.push(formatHeading(heading, 1));
	lines.push('');

	// Add summary information
	const summaryInfo: Record<string, unknown> = {
		'Total Customers': data.count,
		'Current Page': data.page || 1,
		'Total Pages': data.pages || 1,
		'Customers per Page': options.limit || 20,
	};

	// Add filter information if applicable
	if (formatOptions.isSearchResult) {
		const searchOptions = options as CustomerSearchOptions;
		summaryInfo['Search Query'] = searchOptions.query;
		if (searchOptions.group_id) {
			summaryInfo['Group Filter'] = searchOptions.group_id;
		}
		if (searchOptions.tags && searchOptions.tags.length > 0) {
			summaryInfo['Tags Filter'] = searchOptions.tags.join(', ');
		}
	} else {
		const listOptions = options as CustomerListOptions;
		if (listOptions.email) {
			summaryInfo['Email Filter'] = listOptions.email;
		}
		if (listOptions.first_name) {
			summaryInfo['First Name Filter'] = listOptions.first_name;
		}
		if (listOptions.last_name) {
			summaryInfo['Last Name Filter'] = listOptions.last_name;
		}
		if (listOptions.group_id) {
			summaryInfo['Group Filter'] = listOptions.group_id;
		}
		if (listOptions.tags && listOptions.tags.length > 0) {
			summaryInfo['Tags Filter'] = listOptions.tags.join(', ');
		}
		if (listOptions.date_created?.$gte || listOptions.date_created?.$lte) {
			const dateRange = [];
			if (listOptions.date_created.$gte) {
				dateRange.push(`From: ${listOptions.date_created.$gte}`);
			}
			if (listOptions.date_created.$lte) {
				dateRange.push(`To: ${listOptions.date_created.$lte}`);
			}
			summaryInfo['Date Range'] = dateRange.join(', ');
		}
		if (
			listOptions.order_count?.$gte !== undefined ||
			listOptions.order_count?.$lte !== undefined
		) {
			const orderCountRange = [];
			if (listOptions.order_count.$gte !== undefined) {
				orderCountRange.push(`Min: ${listOptions.order_count.$gte}`);
			}
			if (listOptions.order_count.$lte !== undefined) {
				orderCountRange.push(`Max: ${listOptions.order_count.$lte}`);
			}
			summaryInfo['Order Count Filter'] = orderCountRange.join(', ');
		}
		if (
			listOptions.order_value?.$gte !== undefined ||
			listOptions.order_value?.$lte !== undefined
		) {
			const orderValueRange = [];
			if (listOptions.order_value.$gte !== undefined) {
				orderValueRange.push(
					`Min: ${formatCurrency(listOptions.order_value.$gte)}`,
				);
			}
			if (listOptions.order_value.$lte !== undefined) {
				orderValueRange.push(
					`Max: ${formatCurrency(listOptions.order_value.$lte)}`,
				);
			}
			summaryInfo['Order Value Filter'] = orderValueRange.join(', ');
		}
		if (listOptions.search) {
			summaryInfo['Search Query'] = listOptions.search;
		}
	}

	if (options.sort) {
		summaryInfo['Sort Order'] = options.sort;
	}

	lines.push(formatBulletList(summaryInfo));
	lines.push('');

	// Add customers table
	if (data.results.length === 0) {
		const noResultsMessage = formatOptions.isSearchResult
			? '*No customers found matching your search criteria.*'
			: '*No customers found matching the criteria.*';
		lines.push(noResultsMessage);

		if (formatOptions.isSearchResult) {
			lines.push('');
			lines.push('**Suggestions:**');
			lines.push('- Try different keywords');
			lines.push('- Check spelling');
			lines.push('- Use broader search terms');
			lines.push('- Remove filters to see more results');
		}
	} else {
		lines.push(formatHeading('Customers', 2));
		lines.push('');

		// Create table header
		lines.push(
			'| Name | Email | Orders | Total Spent | Last Order | Status |',
		);
		lines.push('|---|---|---|---|---|---|');

		// Add customer rows
		for (const customer of data.results) {
			const name = formatCustomerName(customer);
			const email = customer.email || 'No email';
			const orderCount = customer.order_count || 0;
			const totalSpent = formatCurrency(customer.order_value);
			const lastOrder = customer.date_last_order
				? formatDate(customer.date_last_order)
				: 'Never';
			const status = formatCustomerStatus(customer);

			lines.push(
				`| ${name} | ${email} | ${orderCount} | ${totalSpent} | ${lastOrder} | ${status} |`,
			);
		}
	}

	lines.push('');
	lines.push(formatSeparator());
	lines.push(`*Retrieved at ${formatDate(new Date())}*`);

	return lines.join('\n');
}

/**
 * Format customer details into comprehensive Markdown.
 * @param customer - Customer data from the service
 * @returns Formatted Markdown string
 */
export function formatCustomerDetails(customer: SwellCustomer): string {
	const lines: string[] = [];

	// Add main heading
	const customerName = formatCustomerName(customer);
	lines.push(formatHeading(`Customer: ${customerName}`, 1));
	lines.push('');

	// Add basic customer information
	lines.push(formatHeading('Customer Information', 2));
	const customerInfo: Record<string, unknown> = {
		'Customer ID': customer.id,
		Name: customerName,
		Email: customer.email || 'Not provided',
		Phone: customer.phone || 'Not provided',
		'Account Created': customer.date_created,
		'Last Updated': customer.date_updated,
	};

	if (
		customer.group &&
		typeof customer.group === 'object' &&
		customer.group.name
	) {
		customerInfo['Customer Group'] = customer.group.name;
	}

	lines.push(formatBulletList(customerInfo));
	lines.push('');

	// Add order statistics
	lines.push(formatHeading('Order Statistics', 2));
	const orderStats: Record<string, unknown> = {
		'Total Orders': customer.order_count || 0,
		'Total Spent': formatCurrency(customer.order_value),
		'Average Order Value': formatAverageOrderValue(
			customer.order_value,
			customer.order_count,
		),
		'First Order': customer.date_first_order || 'No orders yet',
		'Last Order': customer.date_last_order || 'No orders yet',
	};

	if (customer.balance !== undefined && customer.balance !== null) {
		orderStats['Account Balance'] = formatCurrency(customer.balance);
	}

	if (customer.account_credit_amount) {
		orderStats['Account Credit'] = formatCurrency(
			customer.account_credit_amount,
		);
	}

	lines.push(formatBulletList(orderStats));
	lines.push('');

	// Add customer insights
	const insights = generateCustomerInsights(customer);
	if (insights.length > 0) {
		lines.push(formatHeading('Customer Insights', 2));
		for (const insight of insights) {
			lines.push(`- ${insight}`);
		}
		lines.push('');
	}

	// Add addresses if available
	if (
		customer.addresses &&
		Array.isArray(customer.addresses) &&
		customer.addresses.length > 0
	) {
		lines.push(formatHeading('Addresses', 2));

		for (let i = 0; i < customer.addresses.length; i++) {
			const address = customer.addresses[i];
			const addressTitle =
				customer.addresses.length > 1 ? `Address ${i + 1}` : 'Address';

			lines.push(formatHeading(addressTitle, 3));
			lines.push(formatAddress(address));
			lines.push('');
		}
	} else {
		// Check for billing/shipping addresses
		if (customer.billing || customer.shipping) {
			lines.push(formatHeading('Addresses', 2));

			if (customer.billing) {
				lines.push(formatHeading('Billing Address', 3));
				lines.push(formatAddress(customer.billing));
				lines.push('');
			}

			if (customer.shipping) {
				lines.push(formatHeading('Shipping Address', 3));
				lines.push(formatAddress(customer.shipping));
				lines.push('');
			}
		}
	}

	// Add communication preferences
	lines.push(formatHeading('Communication Preferences', 2));
	const commPrefs: Record<string, unknown> = {
		'Email Opt-in':
			customer.email_optin !== undefined
				? customer.email_optin
					? 'Yes'
					: 'No'
				: 'Not specified',
		'SMS Opt-in':
			customer.sms_optin !== undefined
				? customer.sms_optin
					? 'Yes'
					: 'No'
				: 'Not specified',
	};

	if (customer.currency) {
		commPrefs['Preferred Currency'] = customer.currency.toUpperCase();
	}

	lines.push(formatBulletList(commPrefs));
	lines.push('');

	// Add tags if available
	if (customer.tags && customer.tags.length > 0) {
		lines.push(formatHeading('Tags', 2));
		lines.push(customer.tags.map((tag) => `\`${tag}\``).join(', '));
		lines.push('');
	}

	// Add notes if available
	if (customer.notes) {
		lines.push(formatHeading('Notes', 2));
		lines.push(customer.notes);
		lines.push('');
	}

	// Add recent orders if available
	if (
		customer.orders &&
		Array.isArray(customer.orders) &&
		customer.orders.length > 0
	) {
		lines.push(formatHeading('Recent Orders', 2));
		lines.push('');

		// Create orders table
		lines.push('| Order # | Date | Status | Items | Total |');
		lines.push('|---|---|---|---|---|');

		// Show up to 10 most recent orders
		const recentOrders = Array.isArray(customer.orders)
			? customer.orders.slice(0, 10)
			: [];
		for (const order of recentOrders) {
			const orderNumber = order.number || order.id;
			const date = formatDate(order.date_created);
			const status = formatOrderStatus(order.status);
			const itemCount = order.item_quantity || order.items?.length || 0;
			const total = formatCurrency(order.grand_total);

			lines.push(
				`| ${orderNumber} | ${date} | ${status} | ${itemCount} | ${total} |`,
			);
		}

		if (Array.isArray(customer.orders) && customer.orders.length > 10) {
			lines.push('');
			lines.push(
				`*Showing 10 most recent orders out of ${Array.isArray(customer.orders) ? customer.orders.length : 0} total orders.*`,
			);
		}
		lines.push('');
	}

	lines.push(formatSeparator());
	lines.push(`*Retrieved at ${formatDate(new Date())}*`);

	return lines.join('\n');
}

/**
 * Format customer order history into structured Markdown.
 * @param data - Order history data from the service
 * @param options - Original request options for context
 * @returns Formatted Markdown string
 */
export function formatCustomerOrderHistory(
	data: SwellOrdersList,
	options: CustomerOrderHistoryOptions,
): string {
	const lines: string[] = [];

	// Add main heading
	lines.push(
		formatHeading(`Order History: Customer ${options.customer_id}`, 1),
	);
	lines.push('');

	// Add summary information
	const summaryInfo: Record<string, unknown> = {
		'Customer ID': options.customer_id,
		'Total Orders': data.count,
		'Current Page': data.page || 1,
		'Total Pages': data.pages || 1,
		'Orders per Page': options.limit || 20,
	};

	// Add filter information if applicable
	if (options.status) {
		const statusFilter = Array.isArray(options.status)
			? options.status.join(', ')
			: options.status;
		summaryInfo['Status Filter'] = statusFilter;
	}
	if (options.date_from || options.date_to) {
		const dateRange = [];
		if (options.date_from) {
			dateRange.push(`From: ${options.date_from}`);
		}
		if (options.date_to) {
			dateRange.push(`To: ${options.date_to}`);
		}
		summaryInfo['Date Range'] = dateRange.join(', ');
	}
	if (options.sort) {
		summaryInfo['Sort Order'] = options.sort;
	}

	lines.push(formatBulletList(summaryInfo));
	lines.push('');

	// Calculate order history analytics
	if (data.results.length > 0) {
		const analytics = calculateOrderHistoryAnalytics(data.results);

		lines.push(formatHeading('Order History Summary', 2));
		const analyticsInfo: Record<string, unknown> = {
			'Total Revenue': formatCurrency(analytics.totalRevenue),
			'Average Order Value': formatCurrency(analytics.averageOrderValue),
			'Total Items Purchased': analytics.totalItems,
			'Average Items per Order':
				analytics.averageItemsPerOrder.toFixed(1),
			'Most Recent Order': analytics.mostRecentOrder,
			'Order Frequency': analytics.orderFrequency,
		};

		lines.push(formatBulletList(analyticsInfo));
		lines.push('');
	}

	// Add orders table
	if (data.results.length === 0) {
		lines.push(
			'*No orders found for this customer matching the criteria.*',
		);
	} else {
		lines.push(formatHeading('Orders', 2));
		lines.push('');

		// Create table header
		lines.push('| Order # | Date | Status | Items | Total | Payment |');
		lines.push('|---|---|---|---|---|---|');

		// Add order rows
		for (const order of data.results) {
			const orderNumber = order.number || order.id;
			const date = formatDate(order.date_created);
			const status = formatOrderStatus(order.status);
			const itemCount = order.item_quantity || order.items?.length || 0;
			const total = formatCurrency(order.grand_total);
			const payment = order.payment?.method || 'Unknown';

			lines.push(
				`| ${orderNumber} | ${date} | ${status} | ${itemCount} | ${total} | ${payment} |`,
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
	lines.push(`*Retrieved at ${formatDate(new Date())}*`);

	return lines.join('\n');
}

/**
 * Format customer analytics into structured Markdown with insights.
 * @param data - Customers data for analytics
 * @param options - Analytics options
 * @returns Formatted Markdown string
 */
export function formatCustomerAnalytics(
	data: SwellCustomersList,
	options: CustomerAnalyticsOptions,
): string {
	const lines: string[] = [];

	// Add main heading
	const heading = options.customer_id
		? `Customer Analytics: ${options.customer_id}`
		: 'Customer Analytics & Insights';
	lines.push(formatHeading(heading, 1));
	lines.push('');

	// Add analytics period information
	const periodInfo: Record<string, unknown> = {
		'Total Customers': data.count,
		'Analysis Type': options.customer_id
			? 'Individual Customer'
			: 'Customer Base',
	};

	if (options.date_from || options.date_to) {
		periodInfo['Analysis Period'] = formatAnalyticsPeriod(
			options.date_from,
			options.date_to,
		);
	}

	if (options.group_id) {
		periodInfo['Customer Group'] = options.group_id;
	}

	if (options.metrics && options.metrics.length > 0) {
		periodInfo['Metrics Included'] = options.metrics.join(', ');
	}

	lines.push(formatBulletList(periodInfo));
	lines.push('');

	// Calculate analytics metrics
	const analytics = calculateCustomerAnalytics(data.results);

	if (options.customer_id && data.results.length === 1) {
		// Individual customer analytics
		const customer = data.results[0];

		lines.push(formatHeading('Customer Performance', 2));
		const customerMetrics: Record<string, unknown> = {
			'Customer Name': formatCustomerName(customer),
			Email: customer.email || 'Not provided',
			'Total Orders': customer.order_count || 0,
			'Total Spent': formatCurrency(customer.order_value),
			'Average Order Value': formatAverageOrderValue(
				customer.order_value,
				customer.order_count,
			),
			'Customer Since': customer.date_created,
			'Last Order': customer.date_last_order || 'No orders',
		};

		if (
			customer.group &&
			typeof customer.group === 'object' &&
			customer.group.name
		) {
			customerMetrics['Customer Group'] = customer.group.name;
		}

		lines.push(formatBulletList(customerMetrics));
		lines.push('');

		// Individual customer insights
		const insights = generateCustomerInsights(customer);
		if (insights.length > 0) {
			lines.push(formatHeading('Customer Insights', 2));
			for (const insight of insights) {
				lines.push(`- ${insight}`);
			}
			lines.push('');
		}
	} else {
		// Customer base analytics
		lines.push(formatHeading('Key Metrics', 2));
		const metricsInfo: Record<string, unknown> = {
			'Total Customers': analytics.totalCustomers,
			'Total Revenue': formatCurrency(analytics.totalRevenue),
			'Average Customer Value': formatCurrency(
				analytics.averageCustomerValue,
			),
			'Average Orders per Customer':
				analytics.averageOrdersPerCustomer.toFixed(1),
			'Average Order Value': formatCurrency(analytics.averageOrderValue),
		};

		lines.push(formatBulletList(metricsInfo));
		lines.push('');

		// Customer segmentation
		if (
			analytics.customerSegments &&
			Object.keys(analytics.customerSegments).length > 0
		) {
			lines.push(formatHeading('Customer Segmentation', 2));
			lines.push('');

			lines.push('| Segment | Count | Percentage | Avg. Value |');
			lines.push('|---|---|---|---|');

			for (const [segment, stats] of Object.entries(
				analytics.customerSegments,
			)) {
				const percentage = (
					(stats.count / analytics.totalCustomers) *
					100
				).toFixed(1);
				lines.push(
					`| ${segment} | ${stats.count} | ${percentage}% | ${formatCurrency(stats.averageValue)} |`,
				);
			}
			lines.push('');
		}

		// Top customers
		if (analytics.topCustomers && analytics.topCustomers.length > 0) {
			lines.push(formatHeading('Top Customers by Value', 2));
			lines.push('');

			lines.push('| Rank | Name | Email | Orders | Total Spent |');
			lines.push('|---|---|---|---|---|');

			for (
				let i = 0;
				i < Math.min(analytics.topCustomers.length, 10);
				i++
			) {
				const customer = analytics.topCustomers[i];
				const rank = i + 1;
				const name = formatCustomerName(customer);
				const email = customer.email || 'Not provided';
				const orders = customer.order_count || 0;
				const totalSpent = formatCurrency(customer.order_value);

				lines.push(
					`| ${rank} | ${name} | ${email} | ${orders} | ${totalSpent} |`,
				);
			}
			lines.push('');
		}

		// Customer base insights
		lines.push(formatHeading('Customer Base Insights', 2));
		const baseInsights = generateCustomerBaseInsights(analytics);

		for (const insight of baseInsights) {
			lines.push(`- ${insight}`);
		}
		lines.push('');
	}

	lines.push(formatSeparator());
	lines.push(`*Analytics generated at ${formatDate(new Date())}*`);

	return lines.join('\n');
}

// Helper functions

/**
 * Format customer name for display
 */
function formatCustomerName(customer: SwellCustomer): string {
	if (customer.name) {
		return customer.name;
	}

	if (customer.first_name || customer.last_name) {
		const firstName = customer.first_name || '';
		const lastName = customer.last_name || '';
		return `${firstName} ${lastName}`.trim();
	}

	return customer.email || 'Unknown Customer';
}

/**
 * Format customer status
 */
function formatCustomerStatus(customer: SwellCustomer): string {
	const orderCount = customer.order_count || 0;
	const lastOrder = customer.date_last_order;

	if (orderCount === 0) {
		return '👤 New Customer';
	}

	if (lastOrder) {
		const daysSinceLastOrder = Math.floor(
			(Date.now() - new Date(lastOrder).getTime()) /
				(1000 * 60 * 60 * 24),
		);

		if (daysSinceLastOrder <= 30) {
			return '🟢 Active';
		} else if (daysSinceLastOrder <= 90) {
			return '🟡 Recent';
		} else {
			return '🔴 Inactive';
		}
	}

	return '❓ Unknown';
}

/**
 * Format order status with emoji
 */
function formatOrderStatus(status?: string): string {
	switch (status) {
		case 'pending':
			return '⏳ Pending';
		case 'payment_pending':
			return '💳 Payment Pending';
		case 'delivery_pending':
			return '📦 Delivery Pending';
		case 'hold':
			return '⏸️ On Hold';
		case 'complete':
			return '✅ Complete';
		case 'canceled':
			return '❌ Canceled';
		default:
			return '❓ Unknown';
	}
}

/**
 * Format currency value
 */
function formatCurrency(amount?: number | null): string {
	if (amount === undefined || amount === null) {
		return '$0.00';
	}

	return `$${amount.toFixed(2)}`;
}

/**
 * Format average order value
 */
function formatAverageOrderValue(
	totalValue?: number | null,
	orderCount?: number | null,
): string {
	if (!totalValue || !orderCount || orderCount === 0) {
		return '$0.00';
	}

	return formatCurrency(totalValue / orderCount);
}

/**
 * Format address for display
 */
function formatAddress(address: SwellAddress): string {
	const lines: string[] = [];

	if (address.name) {
		lines.push(`**${address.name}**`);
	} else if (address.first_name || address.last_name) {
		const name =
			`${address.first_name || ''} ${address.last_name || ''}`.trim();
		if (name) {
			lines.push(`**${name}**`);
		}
	}

	if (address.address1) {
		lines.push(address.address1);
	}

	if (address.address2) {
		lines.push(address.address2);
	}

	const cityStateZip = [address.city, address.state, address.zip]
		.filter(Boolean)
		.join(', ');
	if (cityStateZip) {
		lines.push(cityStateZip);
	}

	if (address.country) {
		lines.push(address.country);
	}

	if (address.phone) {
		lines.push(`📞 ${address.phone}`);
	}

	return lines.join('  \n'); // Two spaces for line break in Markdown
}

/**
 * Format analytics period
 */
function formatAnalyticsPeriod(dateFrom?: string, dateTo?: string): string {
	if (dateFrom && dateTo) {
		return `${dateFrom} to ${dateTo}`;
	} else if (dateFrom) {
		return `From ${dateFrom}`;
	} else if (dateTo) {
		return `Until ${dateTo}`;
	} else {
		return 'All time';
	}
}

/**
 * Calculate order history analytics
 */
function calculateOrderHistoryAnalytics(orders: SwellOrder[]) {
	const analytics = {
		totalRevenue: 0,
		averageOrderValue: 0,
		totalItems: 0,
		averageItemsPerOrder: 0,
		mostRecentOrder: 'Never',
		orderFrequency: 'Unknown',
	};

	if (orders.length === 0) {
		return analytics;
	}

	// Calculate totals
	for (const order of orders) {
		if (order.grand_total) {
			analytics.totalRevenue += order.grand_total;
		}
		if (order.item_quantity) {
			analytics.totalItems += order.item_quantity;
		} else if (order.items) {
			analytics.totalItems += order.items.reduce(
				(sum, item) => sum + (item.quantity || 0),
				0,
			);
		}
	}

	// Calculate averages
	analytics.averageOrderValue = analytics.totalRevenue / orders.length;
	analytics.averageItemsPerOrder = analytics.totalItems / orders.length;

	// Find most recent order
	const sortedOrders = orders
		.filter((order) => order.date_created)
		.sort(
			(a, b) =>
				new Date(b.date_created!).getTime() -
				new Date(a.date_created!).getTime(),
		);

	if (sortedOrders.length > 0) {
		analytics.mostRecentOrder = formatDate(sortedOrders[0].date_created);

		// Calculate order frequency
		if (sortedOrders.length > 1) {
			const firstOrder = new Date(
				sortedOrders[sortedOrders.length - 1].date_created!,
			);
			const lastOrder = new Date(sortedOrders[0].date_created!);
			const daysBetween = Math.floor(
				(lastOrder.getTime() - firstOrder.getTime()) /
					(1000 * 60 * 60 * 24),
			);

			if (daysBetween > 0) {
				const averageDaysBetweenOrders =
					daysBetween / (sortedOrders.length - 1);
				if (averageDaysBetweenOrders <= 30) {
					analytics.orderFrequency = 'High (monthly or more)';
				} else if (averageDaysBetweenOrders <= 90) {
					analytics.orderFrequency = 'Medium (quarterly)';
				} else {
					analytics.orderFrequency = 'Low (less than quarterly)';
				}
			}
		}
	}

	return analytics;
}

/**
 * Calculate customer analytics from raw customer data
 */
function calculateCustomerAnalytics(customers: SwellCustomer[]) {
	const analytics = {
		totalCustomers: customers.length,
		totalRevenue: 0,
		averageCustomerValue: 0,
		averageOrdersPerCustomer: 0,
		averageOrderValue: 0,
		customerSegments: {} as Record<
			string,
			{ count: number; averageValue: number }
		>,
		topCustomers: [] as SwellCustomer[],
	};

	let totalOrders = 0;

	for (const customer of customers) {
		// Add to revenue
		if (customer.order_value) {
			analytics.totalRevenue += customer.order_value;
		}

		// Add to order count
		if (customer.order_count) {
			totalOrders += customer.order_count;
		}

		// Customer segmentation
		const segment = getCustomerSegment(customer);
		if (!analytics.customerSegments[segment]) {
			analytics.customerSegments[segment] = { count: 0, averageValue: 0 };
		}
		analytics.customerSegments[segment].count++;
	}

	// Calculate averages
	if (analytics.totalCustomers > 0) {
		analytics.averageCustomerValue =
			analytics.totalRevenue / analytics.totalCustomers;
		analytics.averageOrdersPerCustomer =
			totalOrders / analytics.totalCustomers;
	}

	if (totalOrders > 0) {
		analytics.averageOrderValue = analytics.totalRevenue / totalOrders;
	}

	// Calculate segment averages
	for (const [segment, stats] of Object.entries(analytics.customerSegments)) {
		const segmentCustomers = customers.filter(
			(c) => getCustomerSegment(c) === segment,
		);
		const segmentRevenue = segmentCustomers.reduce(
			(sum, c) => sum + (c.order_value || 0),
			0,
		);
		stats.averageValue = segmentRevenue / stats.count;
	}

	// Get top customers
	analytics.topCustomers = customers
		.filter((c) => c.order_value && c.order_value > 0)
		.sort((a, b) => (b.order_value || 0) - (a.order_value || 0))
		.slice(0, 10);

	return analytics;
}

/**
 * Get customer segment based on order value and count
 */
function getCustomerSegment(customer: SwellCustomer): string {
	const orderValue = customer.order_value || 0;
	const orderCount = customer.order_count || 0;

	if (orderCount === 0) {
		return 'New Customers';
	} else if (orderValue >= 1000) {
		return 'VIP Customers';
	} else if (orderCount >= 5) {
		return 'Loyal Customers';
	} else if (orderValue >= 100) {
		return 'Regular Customers';
	} else {
		return 'Occasional Customers';
	}
}

/**
 * Generate insights for individual customer
 */
function generateCustomerInsights(customer: SwellCustomer): string[] {
	const insights: string[] = [];

	const orderCount = customer.order_count || 0;
	const orderValue = customer.order_value || 0;

	// Order frequency insights
	if (orderCount === 0) {
		insights.push('🆕 New customer - no orders yet');
	} else if (orderCount === 1) {
		insights.push('🎯 Single purchase customer - potential for follow-up');
	} else if (orderCount >= 10) {
		insights.push(`🌟 Highly loyal customer with ${orderCount} orders`);
	} else if (orderCount >= 5) {
		insights.push(`💎 Loyal customer with ${orderCount} orders`);
	}

	// Value insights
	if (orderValue >= 1000) {
		insights.push(
			`💰 High-value customer (${formatCurrency(orderValue)} total spent)`,
		);
	} else if (orderValue >= 500) {
		insights.push(
			`💵 Valuable customer (${formatCurrency(orderValue)} total spent)`,
		);
	}

	// Average order value insights
	if (orderCount > 0) {
		const avgOrderValue = orderValue / orderCount;
		if (avgOrderValue >= 100) {
			insights.push(
				`🛒 High average order value: ${formatCurrency(avgOrderValue)}`,
			);
		} else if (avgOrderValue < 25) {
			insights.push(
				`📈 Opportunity to increase order value (avg: ${formatCurrency(avgOrderValue)})`,
			);
		}
	}

	// Recency insights
	if (customer.date_last_order) {
		const daysSinceLastOrder = Math.floor(
			(Date.now() - new Date(customer.date_last_order).getTime()) /
				(1000 * 60 * 60 * 24),
		);

		if (daysSinceLastOrder <= 30) {
			insights.push('🟢 Recently active customer');
		} else if (daysSinceLastOrder <= 90) {
			insights.push('🟡 Customer may need re-engagement');
		} else if (daysSinceLastOrder > 180) {
			insights.push('🔴 At-risk customer - consider win-back campaign');
		}
	}

	// Communication preferences
	if (customer.email_optin === false) {
		insights.push('📧 Customer has opted out of email communications');
	}
	if (customer.sms_optin === false) {
		insights.push('📱 Customer has opted out of SMS communications');
	}

	return insights;
}

/**
 * Generate insights for customer base
 */
function generateCustomerBaseInsights(
	analytics: ReturnType<typeof calculateCustomerAnalytics>,
): string[] {
	const insights: string[] = [];

	// Customer value insights
	if (analytics.averageCustomerValue > 200) {
		insights.push(
			`💰 Strong customer base with high average value: ${formatCurrency(analytics.averageCustomerValue)}`,
		);
	} else if (analytics.averageCustomerValue < 50) {
		insights.push(
			`📈 Opportunity to increase customer lifetime value (avg: ${formatCurrency(analytics.averageCustomerValue)})`,
		);
	}

	// Order frequency insights
	if (analytics.averageOrdersPerCustomer > 3) {
		insights.push(
			`🔄 Good customer retention with ${analytics.averageOrdersPerCustomer.toFixed(1)} orders per customer on average`,
		);
	} else if (analytics.averageOrdersPerCustomer < 1.5) {
		insights.push(
			`🎯 Focus on repeat purchases needed (avg: ${analytics.averageOrdersPerCustomer.toFixed(1)} orders per customer)`,
		);
	}

	// Segmentation insights
	const segments = analytics.customerSegments;
	const vipCount = segments['VIP Customers']?.count || 0;
	const newCount = segments['New Customers']?.count || 0;

	if (vipCount > analytics.totalCustomers * 0.1) {
		insights.push(
			`🌟 Strong VIP customer base: ${vipCount} high-value customers`,
		);
	}

	if (newCount > analytics.totalCustomers * 0.3) {
		insights.push(
			`🆕 High growth potential: ${newCount} new customers to nurture`,
		);
	}

	// Top customer insights
	if (analytics.topCustomers.length > 0) {
		const topCustomerValue = analytics.topCustomers[0].order_value || 0;
		if (topCustomerValue > analytics.averageCustomerValue * 5) {
			insights.push(
				`👑 Top customer significantly outperforms average (${formatCurrency(topCustomerValue)} vs ${formatCurrency(analytics.averageCustomerValue)})`,
			);
		}
	}

	return insights;
}
