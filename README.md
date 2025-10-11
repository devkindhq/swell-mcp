# Swell MCP Server

A Model Context Protocol server that integrates AI assistants with Swell's e-commerce platform. Built on a production-ready TypeScript foundation, it provides comprehensive access to Swell stores for product management, order processing, and customer management through both CLI and MCP tool interfaces.

**Built by [Devkind](https://devkind.com.au/services/swell)** - Official Swell Partners serving businesses globally with cutting-edge e-commerce solutions.

[![NPM Version](https://img.shields.io/npm/v/swell-mcp)](https://www.npmjs.com/package/swell-mcp)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Built by Devkind](https://img.shields.io/badge/Built%20by-Devkind-blue)](https://devkind.com.au/services/swell)

## Features

- **Swell E-commerce Integration**: Complete access to Swell's API for products, orders, and customers
- **Dual Transport Support**: STDIO and HTTP transports for AI assistant and web integration
- **5-Layer Architecture**: Clean separation between CLI, tools, controllers, services, and utilities
- **Type Safety**: Full TypeScript implementation with Zod schema validation
- **Advanced HTTP Client**: Built on swell-node SDK with connection pooling and retry logic
- **Comprehensive Testing**: Unit and integration tests with Swell API mocking
- **Production Tooling**: ESLint, Prettier, semantic-release, and MCP Inspector integration
- **Error Handling**: Structured error handling with Swell-specific error contexts

## What is MCP?

Model Context Protocol (MCP) is an open standard for securely connecting AI systems to external tools and data sources. This server implements the MCP specification to provide AI assistants with comprehensive access to Swell's e-commerce platform, enabling intelligent store management and customer service automation.

## Getting Started

First, install the Swell MCP server with your AI assistant or MCP client.

### Requirements

- Node.js 18 or newer
- VS Code, Cursor, Windsurf, Claude Desktop, or any other MCP client
- Swell store credentials (Store ID and Secret Key)

**Standard config** works in most MCP clients:

```json
{
	"mcpServers": {
		"swell-mcp": {
			"command": "npx",
			"args": ["swell-mcp"],
			"env": {
				"DEBUG": "false",
				"SWELL_STORE_ID": "your_store_id",
				"SWELL_SECRET_KEY": "your_private_token"
			},
			"disabled": false
		}
	}
}
```

<details>
<summary>Claude Desktop</summary>

Follow the MCP install [guide](https://modelcontextprotocol.io/quickstart/user), use the standard config above.

Add to your `claude_desktop_config.json`:

```json
{
	"mcpServers": {
		"swell-mcp": {
			"command": "npx",
			"args": ["swell-mcp"],
			"env": {
				"SWELL_STORE_ID": "your_store_id",
				"SWELL_SECRET_KEY": "your_private_token"
			}
		}
	}
}
```

</details>

<details>
<summary>Cursor</summary>

#### Click the button to install:

[<img src="https://cursor.com/deeplink/mcp-install-dark.svg" alt="Install in Cursor">](https://cursor.com/en/install-mcp?name=Swell%20MCP&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJzd2VsbC1tY3AiXSwiZW52Ijp7IlNXRUxMX1NUT1JFX0lEIjoieW91cl9zdG9yZV9pZCIsIlNXRUxMX1NFQ1JFVF9LRVkiOiJ5b3VyX3ByaXZhdGVfdG9rZW4ifX0%3D)

#### Or install manually:

Go to `Cursor Settings` -> `MCP` -> `Add new MCP Server`. Name it "Swell MCP", use `command` type with the command `npx swell-mcp`. Add your Swell credentials in the environment variables section.

</details>

<details>
<summary>VS Code</summary>

Follow the MCP install [guide](https://code.visualstudio.com/docs/copilot/chat/mcp-servers#_add-an-mcp-server), use the standard config above. You can also install the Swell MCP server using the VS Code CLI:

```bash
# For VS Code
code --add-mcp '{"name":"swell-mcp","command":"npx","args":["swell-mcp"],"env":{"SWELL_STORE_ID":"your_store_id","SWELL_SECRET_KEY":"your_private_token"}}'
```

After installation, the Swell MCP server will be available for use with your GitHub Copilot agent in VS Code.

</details>

<details>
<summary>Windsurf</summary>

Follow Windsurf MCP [documentation](https://docs.windsurf.com/windsurf/cascade/mcp). Use the standard config above.

Add to your MCP configuration:

```json
{
	"mcpServers": {
		"swell-mcp": {
			"command": "npx",
			"args": ["swell-mcp"],
			"env": {
				"SWELL_STORE_ID": "your_store_id",
				"SWELL_SECRET_KEY": "your_private_token"
			}
		}
	}
}
```

</details>

<details>
<summary>Goose</summary>

Go to `Advanced settings` -> `Extensions` -> `Add custom extension`. Name it "Swell MCP", use type `STDIO`, and set the `command` to `npx swell-mcp`. Add your Swell credentials as environment variables. Click "Add Extension".

</details>

<details>
<summary>LM Studio</summary>

Go to `Program` in the right sidebar -> `Install` -> `Edit mcp.json`. Use the standard config above with your Swell credentials.

</details>

<details>
<summary>Warp</summary>

Go to `Settings` -> `AI` -> `Manage MCP Servers` -> `+ Add` to [add an MCP Server](https://docs.warp.dev/knowledge-and-collaboration/mcp#adding-an-mcp-server). Use the standard config above.

Alternatively, use the slash command `/add-mcp` in the Warp prompt and paste the standard config from above.

</details>

### Configuration

#### Getting Your Swell Credentials

1. **Log into your Swell dashboard** at [login.swell.store](https://login.swell.store/admin/)
2. **Navigate to Developer → API Keys**
3. **Copy your Store ID** (this is your `SWELL_STORE_ID`)
4. **Copy your Secret Key** (this is your `SWELL_SECRET_KEY` - use the backend/admin key, not the public key)

#### Environment Variables

- `SWELL_STORE_ID`: Your Swell store identifier (required)
- `SWELL_SECRET_KEY`: Your Swell secret/private key (required)
- `DEBUG`: Set to "true" to enable debug mode with raw JSON responses (optional)

#### Example Configuration

```json
{
	"mcpServers": {
		"swell-mcp": {
			"command": "npx",
			"args": ["swell-mcp"],
			"env": {
				"DEBUG": "false",
				"SWELL_STORE_ID": "my-awesome-store",
				"SWELL_SECRET_KEY": "sk_live_abc123def456..."
			},
			"disabled": false
		}
	}
}
```

## Usage

Once installed in your MCP client (see [Getting Started](#getting-started) above), you can use the Swell MCP tools directly through your AI assistant:

### Example Interactions

```
"List my active products"
→ Uses swell_list_products with active=true

"Show me pending orders from this week"
→ Uses swell_list_orders with status=pending and date filtering

"Update customer John Doe's email to john@example.com"
→ Uses swell_update_customer to modify customer information

"Check inventory for product ID abc123"
→ Uses swell_check_inventory for stock levels
```

### Debug Mode

Enable debug mode to see raw JSON responses instead of formatted output:

```json
{
	"env": {
		"DEBUG": "true",
		"SWELL_STORE_ID": "your_store_id",
		"SWELL_SECRET_KEY": "your_private_token"
	}
}
```

## Transport Modes

### STDIO Transport

- JSON-RPC communication via stdin/stdout
- Used by Claude Desktop, Cursor AI, and other local AI assistants
- Run with: `TRANSPORT_MODE=stdio node dist/index.js`

### Streamable HTTP Transport

- HTTP-based transport with Server-Sent Events (SSE)
- Supports multiple concurrent connections and web integrations
- Runs on port 3000 by default (configurable via `PORT` env var)
- MCP Endpoint: `http://localhost:3000/mcp`
- Health Check: `http://localhost:3000/` → Returns server version
- Run with: `TRANSPORT_MODE=http node dist/index.js`

## Architecture Overview

<details>
<summary><b>Project Structure (Click to expand)</b></summary>

```
src/
├── cli/                    # Command-line interfaces
│   └── index.ts            # CLI entry point with Commander setup
├── controllers/            # Business logic orchestration
│   ├── swell.products.controller.ts    # Product management logic
│   ├── swell.products.formatter.ts     # Product response formatting
│   ├── swell.orders.controller.ts      # Order management logic
│   ├── swell.orders.formatter.ts       # Order response formatting
│   ├── swell.customers.controller.ts   # Customer management logic
│   └── swell.customers.formatter.ts    # Customer response formatting
├── services/               # External API interactions
│   ├── swell.products.service.ts       # Swell products API service
│   ├── swell.products.types.ts         # Product type definitions
│   ├── swell.orders.service.ts         # Swell orders API service
│   ├── swell.orders.types.ts           # Order type definitions
│   ├── swell.customers.service.ts      # Swell customers API service
│   └── swell.customers.types.ts        # Customer type definitions
├── tools/                  # MCP tool definitions (AI interface)
│   ├── swell.products.tool.ts          # Product management tools
│   ├── swell.orders.tool.ts            # Order management tools
│   └── swell.customers.tool.ts         # Customer management tools
├── types/                  # Global type definitions
│   └── common.types.ts     # Shared interfaces (ControllerResponse, etc.)
├── utils/                  # Shared utilities
│   ├── logger.util.ts      # Contextual logging system
│   ├── error.util.ts       # MCP-specific error formatting
│   ├── error-handler.util.ts # Error handling utilities
│   ├── config.util.ts      # Environment configuration
│   ├── constants.util.ts   # Version and package constants
│   ├── formatter.util.ts   # Markdown formatting
│   ├── swell-client.util.ts # Swell SDK client wrapper
│   └── transport.util.ts   # HTTP transport utilities
└── index.ts                # Server entry point (dual transport)
```

</details>

## 5-Layer Architecture

The server follows a clean, layered architecture that promotes maintainability and clear separation of concerns:

### 1. CLI Layer (`src/cli/`)

- **Purpose**: Command-line interfaces for direct tool usage and testing
- **Implementation**: Commander-based argument parsing with contextual error handling
- **Example**: `list-products --active --category electronics`
- **Pattern**: Register commands → Parse arguments → Call controllers → Handle errors

### 2. Tools Layer (`src/tools/`)

- **Purpose**: MCP tool definitions that AI assistants can invoke
- **Implementation**: Zod schema validation with structured responses
- **Example**: `swell_list_products` tool with filtering and pagination options
- **Pattern**: Define schema → Validate args → Call controller → Format MCP response

### 3. Resources Layer (`src/resources/`)

- **Purpose**: MCP resources providing contextual data accessible via URIs (planned feature)
- **Implementation**: Resource handlers that respond to URI-based requests
- **Example**: `swell://products/123` resource providing product details
- **Pattern**: Register URI patterns → Parse requests → Return formatted content

### 4. Controllers Layer (`src/controllers/`)

- **Purpose**: Business logic orchestration with comprehensive error handling
- **Implementation**: Options validation, fallback logic, response formatting
- **Example**: Product management with inventory tracking, order processing with status updates
- **Pattern**: Validate inputs → Apply defaults → Call services → Format responses

### 5. Services Layer (`src/services/`)

- **Purpose**: Direct external API interactions with minimal business logic
- **Implementation**: HTTP transport utilities with structured error handling
- **Example**: Swell API calls with authentication and data validation
- **Pattern**: Build requests → Make API calls → Validate responses → Return raw data

### 6. Utils Layer (`src/utils/`)

- **Purpose**: Shared functionality across all layers
- **Key Components**:
    - `logger.util.ts`: Contextual logging (file:method context)
    - `error.util.ts`: MCP-specific error formatting
    - `transport.util.ts`: HTTP/API utilities with retry logic
    - `config.util.ts`: Environment configuration management

## Development Setup

**For developers who want to contribute or modify the server:**

### Prerequisites

- **Node.js** (>=18.x): [Download](https://nodejs.org/)
- **Git**: For version control

### Quick Start

```bash
# Clone the repository
git clone https://github.com/devkindhq/swell-mcp.git
cd swell-mcp

# Install dependencies
npm install

# Configure your Swell credentials
cp .env.example .env
# Edit .env and add your SWELL_STORE_ID and SWELL_SECRET_KEY

# Build the project
npm run build

# Run in different modes:

# 1. STDIO Transport - For AI assistant integration (Claude Desktop, Cursor)
npm run mcp:stdio

# 2. HTTP Transport - For web-based integrations
npm run mcp:http

# 3. Development with MCP Inspector
npm run mcp:inspect                         # Auto-opens browser with debugging UI
```

### Development Scripts

```bash
# Build and Clean
npm run build               # Build TypeScript to dist/
npm run clean               # Remove dist/ and coverage/
npm run prepare             # Build + ensure executable permissions (for npm publish)

# CLI Testing (coming soon)
# npm run cli -- list-products --active                   # List active products
# npm run cli -- get-product <product-id>                 # Get product details
# npm run cli -- list-orders --status pending             # List pending orders

# MCP Server Modes
npm run mcp:stdio           # STDIO transport for AI assistants
npm run mcp:http            # HTTP transport on port 3000
npm run mcp:inspect         # HTTP + auto-open MCP Inspector

# Development with Debugging
npm run dev:stdio           # STDIO with MCP Inspector integration
npm run dev:http            # HTTP with debug logging enabled

# Testing
npm test                    # Run all tests (Jest)
npm run test:coverage       # Generate coverage report
npm run test:cli            # Run CLI-specific tests

# Code Quality
npm run lint                # ESLint with TypeScript rules
npm run format              # Prettier formatting
npm run update:deps         # Update dependencies
```

### Environment Variables

#### Core Configuration

- `TRANSPORT_MODE`: Transport mode (`stdio` | `http`, default: `stdio`)
- `PORT`: HTTP server port (default: `3000`)
- `DEBUG`: Enable debug logging (`true` | `false`, default: `false`)

#### Swell API Configuration

- `SWELL_STORE_ID`: Your Swell store ID (required)
- `SWELL_SECRET_KEY`: Your Swell secret key (required)

#### Example `.env` File

```bash
# Basic configuration
TRANSPORT_MODE=http
PORT=3001
DEBUG=true

# Swell API credentials (required)
SWELL_STORE_ID=your-store-id
SWELL_SECRET_KEY=your-secret-key
```

### Debugging Tools

- **MCP Inspector**: Visual tool for testing your MCP tools
    - Run server with `npm run mcp:inspect`
    - Open the URL shown in terminal
    - Test your tools interactively

- **Debug Logging**: Enable with `DEBUG=true` environment variable

<details>
<summary><b>Configuration (Click to expand)</b></summary>

Create `~/.mcp/configs.json`:

```json
{
	"swell-mcp": {
		"environments": {
			"DEBUG": "true",
			"TRANSPORT_MODE": "http",
			"PORT": "3000",
			"SWELL_STORE_ID": "your-store-id",
			"SWELL_SECRET_KEY": "your-secret-key"
		}
	}
}
```

</details>

## Available Tools

The Swell MCP server provides comprehensive e-commerce management tools for AI assistants:

<details>
<summary><b>Product Management</b></summary>

- **swell_list_products**
    - Description: List products from your Swell store with filtering and pagination options
    - Parameters:
        - `page` (number, optional): Page number for pagination (default: 1)
        - `limit` (number, optional): Number of products per page (max: 100, default: 20)
        - `active` (boolean, optional): Filter by active status
        - `category` (string, optional): Filter by category slug or ID
        - `tags` (array, optional): Filter by product tags
        - `sort` (string, optional): Sort order (e.g., "date_created_desc", "name_asc", "price_asc")
        - `expand` (array, optional): Fields to expand (e.g., ["variants", "categories", "images"])

- **swell_get_product**
    - Description: Get detailed information for a specific product
    - Parameters:
        - `productId` (string): The ID of the product to retrieve
        - `expand` (array, optional): Fields to expand (default: ["variants", "categories", "images"])

- **swell_search_products**
    - Description: Search for products using text queries with optional filtering
    - Parameters:
        - `query` (string): Search query to find products
        - `page` (number, optional): Page number for pagination (default: 1)
        - `limit` (number, optional): Number of products per page (max: 100, default: 20)
        - `active` (boolean, optional): Filter by active status
        - `category` (string, optional): Filter by category slug or ID
        - `tags` (array, optional): Filter by product tags
        - `sort` (string, optional): Sort order (default: "relevance")

- **swell_check_inventory**
    - Description: Check current inventory levels and stock status for a product
    - Parameters:
        - `productId` (string): The ID of the product to check inventory for
        - `includeVariants` (boolean, optional): Whether to include variant inventory (default: true)

- **swell_update_customer**
    - Description: Update customer information in your Swell store
    - Parameters:
        - `customerId` (string): The ID of the customer to update
        - `firstName` (string, optional): Customer's first name
        - `lastName` (string, optional): Customer's last name
        - `email` (string, optional): Customer's email address
        - `phone` (string, optional): Customer's phone number
        - `notes` (string, optional): Customer notes
        - `tags` (array, optional): Customer tags
        - `groupId` (string, optional): Customer group ID
        - `emailOptin` (boolean, optional): Email marketing opt-in status
        - `smsOptin` (boolean, optional): SMS marketing opt-in status

</details>

<details>
<summary><b>Order Management</b></summary>

- **swell_list_orders**
    - Description: List orders from your Swell store with filtering options
    - Parameters:
        - `page` (number, optional): Page number for pagination (default: 1)
        - `limit` (number, optional): Number of orders per page (max: 100, default: 20)
        - `status` (string, optional): Filter by order status ("pending", "payment_pending", "delivery_pending", "complete", "canceled")
        - `customerId` (string, optional): Filter by customer ID
        - `dateFrom` (string, optional): Filter orders from this date (ISO format: YYYY-MM-DD)
        - `dateTo` (string, optional): Filter orders to this date (ISO format: YYYY-MM-DD)
        - `sort` (string, optional): Sort order (default: "date_created_desc")
        - `expand` (array, optional): Fields to expand (e.g., ["items", "account", "billing", "shipping"])

- **swell_get_order**
    - Description: Get detailed information for a specific order
    - Parameters:
        - `orderId` (string): The ID of the order to retrieve
        - `expand` (array, optional): Fields to expand (default: ["items", "account", "billing", "shipping"])

- **swell_update_order_status**
    - Description: Update the status of an order
    - Parameters:
        - `orderId` (string): The ID of the order to update
        - `status` (string): New status ("pending", "payment_pending", "delivery_pending", "complete", "canceled")
        - `notes` (string, optional): Optional notes about the status change

</details>

<details>
<summary><b>Customer Management</b></summary>

- **swell_list_customers**
    - Description: List customers from your Swell store with search and filtering options
    - Parameters:
        - `page` (number, optional): Page number for pagination (default: 1)
        - `limit` (number, optional): Number of customers per page (max: 100, default: 20)
        - `search` (string, optional): Search customers by name or email
        - `email` (string, optional): Filter by specific email address
        - `dateFrom` (string, optional): Filter customers created from this date (ISO format: YYYY-MM-DD)
        - `dateTo` (string, optional): Filter customers created to this date (ISO format: YYYY-MM-DD)
        - `sort` (string, optional): Sort order (default: "date_created_desc")
        - `expand` (array, optional): Fields to expand (e.g., ["orders", "addresses"])

- **swell_get_customer**
    - Description: Get detailed information for a specific customer
    - Parameters:
        - `customerId` (string): The ID of the customer to retrieve
        - `expand` (array, optional): Fields to expand (default: ["orders", "addresses"])
        - `includeOrderHistory` (boolean, optional): Whether to include order history (default: true)

- **swell_search_customers**
    - Description: Search for customers using text queries
    - Parameters:
        - `query` (string): Search query to find customers (searches name, email, phone)
        - `page` (number, optional): Page number for pagination (default: 1)
        - `limit` (number, optional): Number of customers per page (max: 100, default: 20)
        - `dateFrom` (string, optional): Filter customers created from this date
        - `dateTo` (string, optional): Filter customers created to this date
        - `sort` (string, optional): Sort order (default: "relevance")

</details>

## Extending the Server

This server is built with a modular architecture that makes it easy to add new Swell API integrations or custom business logic. The existing Swell tools (products, orders, customers) serve as examples for implementing additional functionality.

For detailed implementation patterns, see the existing controllers, services, and tools in the codebase.

### Need Advanced Swell Checkout?

This MCP server demonstrates the kind of sophisticated Swell integrations that power **[CheckoutJet](https://checkoutjet.com/)** - an enterprise-grade checkout solution for Swell stores built by [Devkind](https://devkind.com.au/services/swell).

**CheckoutJet** transforms your Swell checkout with:

- **🏢 B2B Excellence** - Professional invoicing, Net 30 payments, and wholesale pricing
- **📦 Smart Shipping** - Live rates from multiple locations with intelligent order routing
- **⚡ Split Deliveries** - Handle complex multi-vendor and multi-warehouse fulfillment
- **🎨 Full Customization** - Pixel-perfect, on-brand checkout experience
- **🤖 Automation** - Automated invoicing, POs, and order management
- **💰 Advanced Pricing** - Dynamic discounts and tiered pricing logic

**Proven Results:** Over €500,000 processed for Swell merchants with 23% conversion rate improvements.

**Ready to upgrade your Swell checkout?** [Book a 15-minute demo](https://checkoutjet.com/) of CheckoutJet.

## Swell E-commerce Integration

This MCP server provides comprehensive integration with Swell's e-commerce platform:

### Available Tools & Commands

**MCP Tools:**

- `swell_list_products` - List products with filtering and pagination
- `swell_get_product` - Get detailed product information
- `swell_search_products` - Search products with multiple criteria
- `swell_check_inventory` - Check product inventory levels
- `swell_list_orders` - List orders with filtering options
- `swell_get_order` - Get detailed order information
- `swell_update_order_status` - Update order status
- `swell_list_customers` - List customers with search capabilities
- `swell_get_customer` - Get detailed customer information
- `swell_search_customers` - Search customers with multiple criteria

### Features Demonstrated

- **Product Management**: Complete product catalog access with inventory tracking
- **Order Processing**: Order lifecycle management with status updates
- **Customer Management**: Customer profiles with order history and analytics
- **Error Handling**: Structured errors for API failures and validation issues
- **Response Formatting**: Clean Markdown output with structured data tables

### Configuration Requirements

```bash
# Required - Swell API credentials
SWELL_STORE_ID=your-store-id
SWELL_SECRET_KEY=your-secret-key

# Development
DEBUG=true                    # Enable detailed logging
TRANSPORT_MODE=http          # Use HTTP transport
PORT=3001                    # Custom port
```

## Standalone Usage

If you want to run the server independently (not through an MCP client):

### Global Installation

```bash
npm install -g swell-mcp
```

### Direct Usage

```bash
# Set your credentials
export SWELL_STORE_ID=your-store-id
export SWELL_SECRET_KEY=your-secret-key

# Run the server
swell-mcp
```

### HTTP Mode

```bash
# Run with HTTP transport on port 3000
TRANSPORT_MODE=http swell-mcp

# Custom port
PORT=8080 TRANSPORT_MODE=http swell-mcp
```

---

## 🚀 Take Your Swell Store Further

Impressed by this MCP server's capabilities? This is just a glimpse of what's possible with expert Swell development.

### � **CheckoutJet - Enterprise Swell Checkout**

Transform your Swell store with our battle-tested checkout solution:

- **B2B Powerhouse** - Professional invoicing, Net 30 payments, wholesale pricing
- **Smart Shipping** - Live rates from multiple locations with intelligent routing
- **Split Deliveries** - Complex multi-vendor and multi-warehouse fulfillment
- **Full Customization** - Pixel-perfect, on-brand checkout experience
- **Proven Results** - €500,000+ processed, 23% conversion improvements

[**See CheckoutJet in Action →**](https://checkoutjet.com/)

### 🤖 **AI & Custom Development**

- AI-powered integrations like this MCP server
- Custom Swell applications and themes
- Headless commerce implementations
- Performance optimization and automation

**Ready to transform your e-commerce business?**

[![See CheckoutJet Demo](https://img.shields.io/badge/See%20CheckoutJet%20Demo-15%20Minutes-brightgreen?style=for-the-badge)](https://checkoutjet.com/)

## Testing Strategy

The server includes comprehensive testing infrastructure:

### Test Structure

```
tests/               # Not present - tests are in src/
src/
├── **/*.test.ts     # Co-located with source files
├── utils/           # Utility function tests
├── controllers/     # Business logic tests
├── services/        # API integration tests
└── cli/             # CLI command tests
```

### Testing Best Practices

- **Unit Tests**: Test utilities and pure functions (`*.util.test.ts`)
- **Controller Tests**: Test business logic with mocked service calls
- **Service Tests**: Test API integration with real/mocked HTTP calls
- **CLI Tests**: Test command parsing and execution
- **Test Environment Detection**: Automatic test mode handling in controllers

### Running Tests

```bash
npm test                    # Run all tests
npm run test:coverage       # Generate coverage report
npm run test:cli           # CLI-specific tests only
```

### Coverage Goals

- Target: >80% test coverage
- Focus on business logic (controllers) and utilities
- Mock external services appropriately

## License

[ISC License](https://opensource.org/licenses/ISC)

## Resources & Documentation

### MCP Protocol Resources

- [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) - Visual debugging tool

### Implementation References

- [Anthropic MCP Announcement](https://www.anthropic.com/news/model-context-protocol)
- [Awesome MCP Servers](https://github.com/wong2/awesome-mcp-servers) - Community examples
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### Swell Resources

- [Swell Documentation](https://developers.swell.is/) - Official API documentation
- [Swell Node SDK](https://github.com/swellstores/swell-node) - The underlying SDK used by this server

### Professional Swell Services

**Looking for expert Swell development?** [Devkind](https://devkind.com.au/services/swell) is an official Swell partner serving businesses globally with our remote team, specializing in:

- **[CheckoutJet](https://checkoutjet.com/)** - Enterprise checkout solution with B2B, shipping automation, and split deliveries
- **[Swell Development Services](https://devkind.com.au/services/swell)** - Custom apps, themes, and integrations
- **[Headless E-commerce](https://devkind.com.au/services/headless-ecommerce)** - API-driven storefronts and experiences

**Get Started:** [See CheckoutJet Demo](https://checkoutjet.com/) | [Book FREE consultation](https://devkind.com.au/services/swell) | Email: [hello@devkind.com.au](mailto:hello@devkind.com.au) | **Global Remote Team**
