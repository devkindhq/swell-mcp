import {
	SwellOrder,
	SwellOrdersList,
	SwellAddress,
	OrderListOptions,
	OrderAnalyticsOptions,
} from '../services/swell.orders.types.js';
import {
	formatDate,
	formatHeading,
	formatBulletList,
	formatSeparator,
} from '../utils/formatter.util.js';

/**
 * Format orders list into structured Markdown.
 * @param data - Orders list data from the service
 * @param options - Original request options for context
 * @returns Formatted Markdown string
 */
export function formatOrdersList(
	data: SwellOrdersList,
	options: OrderListOptions,
): string {
	const lines: string[] = [];

	// Add main heading
	lines.push(formatHeading('Orders List', 1));
	lines.push('');

	// Add summary information
	const summaryInfo: Record<string, unknown> = {
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
	if (options.account_email) {
		summaryInfo['Customer Email'] = options.account_email;
	}
	if (options.account_id) {
		summaryInfo['Customer ID'] = options.account_id;
	}
	if (options.date_created?.$gte || options.date_created?.$lte) {
		const dateRange = [];
		if (options.date_created.$gte) {
			dateRange.push(`From: ${options.date_created.$gte}`);
		}
		if (options.date_created.$lte) {
			dateRange.push(`To: ${options.date_created.$lte}`);
		}
		summaryInfo['Date Range'] = dateRange.join(', ');
	}
	if (options.search) {
		summaryInfo['Search Query'] = options.search;
	}
	if (options.sort) {
		summaryInfo['Sort Order'] = options.sort;
	}

	lines.push(formatBulletList(summaryInfo));
	lines.push('');

	// Add orders table
	if (data.results.length === 0) {
		lines.push('*No orders found matching the criteria.*');
	} else {
		lines.push(formatHeading('Orders', 2));
		lines.push('');

		// Create table header
		lines.push('| Order # | Customer | Status | Items | Total | Date |');
		lines.push('|---|---|---|---|---|---|');

		// Add order rows
		for (const order of data.results) {
			const orderNumber = order.number || order.id;
			const customer = formatCustomerInfo(order);
			const status = formatOrderStatus(order.status);
			const itemCount = order.item_quantity || order.items?.length || 0;
			const total = formatCurrency(order.grand_total);
			const date = formatDate(order.date_created);

			lines.push(
				`| ${orderNumber} | ${customer} | ${status} | ${itemCount} | ${total} | ${date} |`,
			);
		}
	}

	lines.push('');
	lines.push(formatSeparator());
	lines.push(`*Retrieved at ${formatDate(new Date())}*`);

	return lines.join('\n');
}

/**
 * Format order details into comprehensive Markdown.
 * @param order - Order data from the service
 * @param options - Formatting options
 * @returns Formatted Markdown string
 */
export function formatOrderDetails(
	order: SwellOrder,
	options: { showStatusUpdate?: boolean } = {},
): string {
	const lines: string[] = [];

	// Add main heading
	const orderNumber = order.number || order.id;
	lines.push(formatHeading(`Order: ${orderNumber}`, 1));
	lines.push('');

	// Add status update notification if applicable
	if (options.showStatusUpdate) {
		lines.push('✅ **Order status updated successfully!**');
		lines.push('');
	}

	// Add basic order information
	lines.push(formatHeading('Order Information', 2));
	const orderInfo: Record<string, unknown> = {
		'Order ID': order.id,
		'Order Number': order.number || 'Not assigned',
		Status: formatOrderStatus(order.status),
		'Customer Type': order.guest ? 'Guest' : 'Registered',
		'Order Date': order.date_created,
		'Last Updated': order.date_updated,
	};

	if (order.account_email) {
		orderInfo['Customer Email'] = order.account_email;
	}
	if (order.account_id) {
		orderInfo['Customer ID'] = order.account_id;
	}

	lines.push(formatBulletList(orderInfo));
	lines.push('');

	// Add financial summary
	lines.push(formatHeading('Financial Summary', 2));
	const financialInfo: Record<string, unknown> = {
		Subtotal: formatCurrency(order.sub_total),
		Discount: formatCurrency(order.discount_total),
		Tax: formatCurrency(order.tax_total),
		Shipping: formatCurrency(order.shipping_total),
		'Grand Total': `**${formatCurrency(order.grand_total)}**`,
	};

	if (order.currency) {
		financialInfo['Currency'] = order.currency.toUpperCase();
	}
	if (order.coupon_code) {
		financialInfo['Coupon Code'] = order.coupon_code;
	}

	lines.push(formatBulletList(financialInfo));
	lines.push('');

	// Add order items
	if (order.items && order.items.length > 0) {
		lines.push(formatHeading('Order Items', 2));
		lines.push('');

		// Create items table
		lines.push('| Product | SKU | Qty | Unit Price | Total |');
		lines.push('|---|---|---|---|---|');

		for (const item of order.items) {
			const productName = item.product_name || 'Unknown Product';
			const variantName = item.variant_name
				? ` (${item.variant_name})`
				: '';
			const fullName = `${productName}${variantName}`;
			const sku = item.sku || 'N/A';
			const quantity = item.quantity || 0;
			const unitPrice = formatCurrency(item.price);
			const totalPrice = formatCurrency(item.price_total);

			lines.push(
				`| ${fullName} | ${sku} | ${quantity} | ${unitPrice} | ${totalPrice} |`,
			);
		}
		lines.push('');
	}

	// Add addresses
	if (order.billing || order.shipping) {
		lines.push(formatHeading('Addresses', 2));

		if (order.billing) {
			lines.push(formatHeading('Billing Address', 3));
			lines.push(formatAddress(order.billing));
			lines.push('');
		}

		if (order.shipping) {
			lines.push(formatHeading('Shipping Address', 3));
			lines.push(formatAddress(order.shipping));
			lines.push('');
		}
	}

	// Add payment information
	if (order.payment || (order.payments && order.payments.length > 0)) {
		lines.push(formatHeading('Payment Information', 2));

		if (order.payment) {
			const paymentInfo: Record<string, unknown> = {
				Method: order.payment.method || 'Unknown',
				Status: formatPaymentStatus(order.payment.status),
				Amount: formatCurrency(order.payment.amount),
				Gateway: order.payment.gateway || 'Not specified',
			};

			if (order.payment.transaction_id) {
				paymentInfo['Transaction ID'] = order.payment.transaction_id;
			}

			lines.push(formatBulletList(paymentInfo));
		}

		if (order.payments && order.payments.length > 1) {
			lines.push('');
			lines.push(formatHeading('Payment History', 3));
			lines.push('');

			lines.push('| Date | Method | Status | Amount |');
			lines.push('|---|---|---|---|');

			for (const payment of order.payments) {
				const date = formatDate(payment.date_created);
				const method = payment.method || 'Unknown';
				const status = formatPaymentStatus(payment.status);
				const amount = formatCurrency(payment.amount);

				lines.push(`| ${date} | ${method} | ${status} | ${amount} |`);
			}
		}
		lines.push('');
	}

	// Add shipment information
	if (order.shipments && order.shipments.length > 0) {
		lines.push(formatHeading('Shipment Information', 2));

		for (let i = 0; i < order.shipments.length; i++) {
			const shipment = order.shipments[i];
			const shipmentTitle =
				order.shipments.length > 1
					? `Shipment ${i + 1}`
					: 'Shipment Details';

			lines.push(formatHeading(shipmentTitle, 3));

			const shipmentInfo: Record<string, unknown> = {
				Carrier: shipment.carrier || 'Not specified',
				Service: shipment.service || 'Not specified',
				'Tracking Code': shipment.tracking_code || 'Not available',
				'Ship Date': shipment.date_created,
			};

			lines.push(formatBulletList(shipmentInfo));

			if (shipment.items && shipment.items.length > 0) {
				lines.push('');
				lines.push('**Items in this shipment:**');
				for (const item of shipment.items) {
					const itemName = item.product_name || 'Unknown Product';
					const quantity = item.quantity || 0;
					lines.push(`- ${itemName} (Qty: ${quantity})`);
				}
			}
			lines.push('');
		}
	}

	// Add notes and comments
	if (order.notes || order.comments) {
		lines.push(formatHeading('Notes & Comments', 2));

		if (order.notes) {
			lines.push(formatHeading('Internal Notes', 3));
			lines.push(order.notes);
			lines.push('');
		}

		if (order.comments) {
			lines.push(formatHeading('Customer Comments', 3));
			lines.push(order.comments);
			lines.push('');
		}
	}

	lines.push(formatSeparator());
	lines.push(`*Retrieved at ${formatDate(new Date())}*`);

	return lines.join('\n');
}

/**
 * Format order analytics into structured Markdown with insights.
 * @param data - Orders data for analytics
 * @param options - Analytics options
 * @returns Formatted Markdown string
 */
export function formatOrderAnalytics(
	data: SwellOrdersList,
	options: OrderAnalyticsOptions,
): string {
	const lines: string[] = [];

	// Add main heading
	lines.push(formatHeading('Order Analytics & Insights', 1));
	lines.push('');

	// Add analytics period information
	const periodInfo: Record<string, unknown> = {
		'Total Orders': data.count,
		'Analysis Period': formatAnalyticsPeriod(
			options.date_from,
			options.date_to,
		),
		'Group By': options.group_by || 'day',
	};

	if (options.status) {
		const statusFilter = Array.isArray(options.status)
			? options.status.join(', ')
			: options.status;
		periodInfo['Status Filter'] = statusFilter;
	}

	lines.push(formatBulletList(periodInfo));
	lines.push('');

	// Calculate analytics metrics
	const analytics = calculateOrderAnalytics(data.results);

	// Add key metrics
	lines.push(formatHeading('Key Metrics', 2));
	const metricsInfo: Record<string, unknown> = {
		'Total Orders': analytics.totalOrders,
		'Total Revenue': formatCurrency(analytics.totalRevenue),
		'Average Order Value': formatCurrency(analytics.averageOrderValue),
		'Total Items Sold': analytics.totalItems,
		'Average Items per Order': analytics.averageItemsPerOrder.toFixed(1),
	};

	lines.push(formatBulletList(metricsInfo));
	lines.push('');

	// Add status breakdown
	if (
		analytics.statusBreakdown &&
		Object.keys(analytics.statusBreakdown).length > 0
	) {
		lines.push(formatHeading('Order Status Breakdown', 2));
		lines.push('');

		lines.push('| Status | Count | Percentage | Revenue |');
		lines.push('|---|---|---|---|');

		for (const [status, stats] of Object.entries(
			analytics.statusBreakdown,
		)) {
			const percentage = (
				(stats.count / analytics.totalOrders) *
				100
			).toFixed(1);
			lines.push(
				`| ${formatOrderStatus(status)} | ${stats.count} | ${percentage}% | ${formatCurrency(stats.revenue)} |`,
			);
		}
		lines.push('');
	}

	// Add insights and recommendations
	lines.push(formatHeading('Insights & Recommendations', 2));
	const insights = generateOrderInsights(analytics);

	for (const insight of insights) {
		lines.push(`- ${insight}`);
	}
	lines.push('');

	// Add top performing periods (if we have enough data)
	if (data.results.length > 0) {
		lines.push(formatHeading('Performance Trends', 2));

		const trends = analyzeTrends(data.results);
		if (trends.length > 0) {
			for (const trend of trends) {
				lines.push(`- ${trend}`);
			}
		} else {
			lines.push('- Insufficient data for trend analysis');
		}
		lines.push('');
	}

	lines.push(formatSeparator());
	lines.push(`*Analytics generated at ${formatDate(new Date())}*`);

	return lines.join('\n');
}

// Helper functions

/**
 * Format customer information for display
 */
function formatCustomerInfo(order: SwellOrder): string {
	if (order.account_email) {
		return order.account_email;
	}

	if (order.billing?.name) {
		return order.billing.name;
	}

	if (order.billing?.first_name || order.billing?.last_name) {
		const firstName = order.billing.first_name || '';
		const lastName = order.billing.last_name || '';
		return `${firstName} ${lastName}`.trim();
	}

	return order.guest ? 'Guest Customer' : 'Unknown';
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
 * Format payment status
 */
function formatPaymentStatus(status?: string): string {
	switch (status) {
		case 'pending':
			return '⏳ Pending';
		case 'authorized':
			return '🔒 Authorized';
		case 'captured':
			return '✅ Captured';
		case 'failed':
			return '❌ Failed';
		case 'canceled':
			return '❌ Canceled';
		case 'refunded':
			return '↩️ Refunded';
		default:
			return status || 'Unknown';
	}
}

/**
 * Format currency value
 */
function formatCurrency(amount?: number): string {
	if (amount === undefined || amount === null) {
		return '$0.00';
	}

	return `$${amount.toFixed(2)}`;
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
 * Calculate order analytics from raw order data
 */
function calculateOrderAnalytics(orders: SwellOrder[]) {
	const analytics = {
		totalOrders: orders.length,
		totalRevenue: 0,
		averageOrderValue: 0,
		totalItems: 0,
		averageItemsPerOrder: 0,
		statusBreakdown: {} as Record<
			string,
			{ count: number; revenue: number }
		>,
	};

	for (const order of orders) {
		// Add to revenue
		if (order.grand_total) {
			analytics.totalRevenue += order.grand_total;
		}

		// Add to items count
		if (order.item_quantity) {
			analytics.totalItems += order.item_quantity;
		} else if (order.items) {
			analytics.totalItems += order.items.reduce(
				(sum, item) => sum + (item.quantity || 0),
				0,
			);
		}

		// Status breakdown
		const status = order.status || 'unknown';
		if (!analytics.statusBreakdown[status]) {
			analytics.statusBreakdown[status] = { count: 0, revenue: 0 };
		}
		analytics.statusBreakdown[status].count++;
		if (order.grand_total) {
			analytics.statusBreakdown[status].revenue += order.grand_total;
		}
	}

	// Calculate averages
	if (analytics.totalOrders > 0) {
		analytics.averageOrderValue =
			analytics.totalRevenue / analytics.totalOrders;
		analytics.averageItemsPerOrder =
			analytics.totalItems / analytics.totalOrders;
	}

	return analytics;
}

/**
 * Generate insights based on analytics data
 */
function generateOrderInsights(
	analytics: ReturnType<typeof calculateOrderAnalytics>,
): string[] {
	const insights: string[] = [];

	// Revenue insights
	if (analytics.averageOrderValue > 0) {
		if (analytics.averageOrderValue > 100) {
			insights.push(
				`💰 Strong average order value of ${formatCurrency(analytics.averageOrderValue)}`,
			);
		} else if (analytics.averageOrderValue < 25) {
			insights.push(
				`📈 Consider strategies to increase average order value (currently ${formatCurrency(analytics.averageOrderValue)})`,
			);
		}
	}

	// Order completion insights
	const completedOrders = analytics.statusBreakdown['complete']?.count || 0;
	const completionRate =
		analytics.totalOrders > 0
			? (completedOrders / analytics.totalOrders) * 100
			: 0;

	if (completionRate > 80) {
		insights.push(
			`✅ Excellent order completion rate: ${completionRate.toFixed(1)}%`,
		);
	} else if (completionRate < 50) {
		insights.push(
			`⚠️ Low order completion rate: ${completionRate.toFixed(1)}% - investigate pending orders`,
		);
	}

	// Pending orders insights
	const pendingOrders =
		(analytics.statusBreakdown['pending']?.count || 0) +
		(analytics.statusBreakdown['payment_pending']?.count || 0);

	if (pendingOrders > analytics.totalOrders * 0.3) {
		insights.push(
			`⏳ High number of pending orders (${pendingOrders}) - may need attention`,
		);
	}

	// Items per order insights
	if (analytics.averageItemsPerOrder > 3) {
		insights.push(
			`🛒 Customers are buying multiple items per order (avg: ${analytics.averageItemsPerOrder.toFixed(1)})`,
		);
	} else if (analytics.averageItemsPerOrder < 1.5) {
		insights.push(
			`📦 Consider cross-selling strategies to increase items per order (avg: ${analytics.averageItemsPerOrder.toFixed(1)})`,
		);
	}

	return insights;
}

/**
 * Analyze trends in order data
 */
function analyzeTrends(orders: SwellOrder[]): string[] {
	const trends: string[] = [];

	if (orders.length < 2) {
		return trends;
	}

	// Sort orders by date
	const sortedOrders = orders
		.filter((order) => order.date_created)
		.sort(
			(a, b) =>
				new Date(a.date_created!).getTime() -
				new Date(b.date_created!).getTime(),
		);

	if (sortedOrders.length < 2) {
		return trends;
	}

	// Calculate recent vs older performance
	const midpoint = Math.floor(sortedOrders.length / 2);
	const olderOrders = sortedOrders.slice(0, midpoint);
	const recentOrders = sortedOrders.slice(midpoint);

	const olderAvg =
		olderOrders.reduce((sum, order) => sum + (order.grand_total || 0), 0) /
		olderOrders.length;
	const recentAvg =
		recentOrders.reduce((sum, order) => sum + (order.grand_total || 0), 0) /
		recentOrders.length;

	const change = ((recentAvg - olderAvg) / olderAvg) * 100;

	if (Math.abs(change) > 10) {
		if (change > 0) {
			trends.push(
				`📈 Average order value trending up by ${change.toFixed(1)}%`,
			);
		} else {
			trends.push(
				`📉 Average order value trending down by ${Math.abs(change).toFixed(1)}%`,
			);
		}
	} else {
		trends.push(`📊 Average order value remains stable`);
	}

	return trends;
}
