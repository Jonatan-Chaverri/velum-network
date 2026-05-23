# ZK Wallet Backend API

## Overview

The ZK Wallet Backend is a RESTful API service that manages user accounts, transactions, and contract configurations for a zero-knowledge privacy-focused wallet application. It provides endpoints for user registration, transaction tracking, token management, and application configuration.

## Role

The backend serves as the central data layer for the ZK Wallet application, handling:

- **User Management**: Registration, retrieval, and deletion of users with their Ethereum addresses and public keys
- **Transaction Tracking**: Recording and managing blockchain transactions (deposits, withdrawals, transfers)
- **Contract Configuration**: Managing smart contract addresses and network configurations
- **Token Information**: Providing token contract addresses for the frontend

The backend uses PostgreSQL (via Supabase) for data persistence and integrates with Ethereum-compatible networks for transaction tracking.

## Setup

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database (via Supabase or local instance)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy the environment example file:
```bash
cp env.example .env
```

3. Configure your `.env` file with the following variables:
```env
PORT=3001
CORS_ORIGIN=http://localhost:3000

RPC_URL=http://localhost:8547

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_PASSWORD=your_db_password

NETWORK=SEPOLIA
```

4. Run database migrations:
```bash
npm run migrate
```

5. Start the development server:
```bash
npm run dev
```

Or build and start in production:
```bash
npm run build
npm start
```

## API Endpoints

### Health Check

#### `GET /health`

Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### User Registration

#### `POST /api/register`

Register a new user with their Ethereum address, username, and public key.

**Request Body:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  "username": "alice",
  "publicKey": {
    "x": "0x1234567890abcdef...",
    "y": "0xabcdef1234567890..."
  }
}
```

**Validation:**
- `address`: Required, must be a valid Ethereum address (0x-prefixed, 42 characters)
- `username`: Required, must be between 3 and 50 characters
- `publicKey`: Required object with `x` and `y` coordinates

**Response (201 Created):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
    "username": "alice",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "publicKey": {
    "x": "0x1234567890abcdef...",
    "y": "0xabcdef1234567890..."
  }
}
```

**Error Responses:**
- `400`: Missing required fields or invalid format
- `409`: User with this address or username already exists

---

### Get User

#### `GET /api/getUser`

Retrieve user information by address or username.

**Query Parameters:**
- `address` (optional): Ethereum address (0x-prefixed, 42 characters)
- `username` (optional): Username string

**Note:** At least one of `address` or `username` must be provided. If both are provided, `address` takes priority.

**Example Request:**
```
GET /api/getUser?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "alice",
    "address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
    "public_key_x": "0x1234567890abcdef...",
    "public_key_y": "0xabcdef1234567890...",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Missing required parameters or invalid address format
- `404`: User not found

---

### Delete User

#### `POST /api/deleteUser`

Delete a user by their Ethereum address.

**Request Body:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
}
```

**Validation:**
- `address`: Required, must be a valid Ethereum address (0x-prefixed, 42 characters)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "deletedUser": {
    "id": "uuid",
    "address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
    "username": "alice"
  }
}
```

**Error Responses:**
- `400`: Missing address or invalid format
- `404`: User not found

---

### Create Transaction

#### `POST /api/transaction`

Create a new transaction record in the database.

**Request Body:**
```json
{
  "tx_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "type": "DEPOSIT",
  "token": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  "amount": "1000000000000000000",
  "sender_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  "receiver_address": null
}
```

**Validation:**
- `tx_hash`: Required, must be a valid transaction hash (0x-prefixed, 66 characters)
- `type`: Required, must be one of: `DEPOSIT`, `WITHDRAW`, `TRANSFER` (case-insensitive)
- `token`: Optional, token contract address
- `amount`: Optional, transaction amount as string
- `sender_address`: Optional, sender's Ethereum address
- `receiver_address`: Optional, receiver's Ethereum address

**Response (201 Created):**
```json
{
  "success": true,
  "transaction": {
    "id": "uuid",
    "tx_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "type": "deposit",
    "status": "confirmed",
    "token": "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
    "amount": "1000000000000000000",
    "sender_address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
    "receiver_address": null,
    "contract_id": "uuid",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Missing required fields or invalid format
- `404`: Contract not found (CONFIDENTIAL_ERC20 for the specified network)
- `409`: Transaction with this tx_hash already exists
- `500`: NETWORK environment variable not set

**Note:** The transaction is automatically associated with the `CONFIDENTIAL_ERC20` contract for the network specified in the `NETWORK` environment variable.

---

### Get Tokens

#### `GET /api/tokens`

Get the WETH token contract address for the configured network.

**Response (200 OK):**
```json
{
  "tokens": [
    {
      "name": "WETH_TOKEN_ADDRESS",
      "network": "SEPOLIA",
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
    }
  ]
}
```

**Error Responses:**
- `404`: WETH_TOKEN_ADDRESS contract not found for the specified network
- `500`: NETWORK environment variable not set

---

### Get Configuration

#### `GET /api/config`

Get application configuration including RPC URL and Confidential ERC20 contract address.

**Response (200 OK):**
```json
{
  "success": true,
  "config": {
    "rpc_url": "http://localhost:8547",
    "confidential_erc20": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
  }
}
```

**Error Responses:**
- `404`: CONFIDENTIAL_ERC20 contract not found for the specified network
- `500`: RPC_URL or NETWORK environment variable not set

---

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port number | No | `3001` |
| `CORS_ORIGIN` | Allowed CORS origin | No | `http://localhost:3000` |
| `RPC_URL` | Ethereum RPC endpoint URL | Yes | - |
| `SUPABASE_URL` | Supabase project URL | Yes | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes | - |
| `SUPABASE_DB_PASSWORD` | PostgreSQL database password | Yes | - |
| `NETWORK` | Blockchain network name (e.g., SEPOLIA, MAINNET) | Yes | - |

## Database Schema

The backend uses three main tables:

### Users
- `id`: UUID (primary key)
- `name`: VARCHAR(255) - Username
- `address`: VARCHAR(255) - Ethereum address (unique)
- `public_key_x`: TEXT - Public key X coordinate
- `public_key_y`: TEXT - Public key Y coordinate
- `contract_id`: UUID - Foreign key to contracts table
- `created_at`: TIMESTAMP

### Transactions
- `id`: UUID (primary key)
- `tx_hash`: VARCHAR(255) - Transaction hash (unique)
- `type`: VARCHAR(50) - Transaction type (deposit, withdraw, transfer)
- `status`: VARCHAR(50) - Transaction status
- `token`: VARCHAR(255) - Token contract address
- `amount`: VARCHAR(255) - Transaction amount
- `sender_address`: VARCHAR(255) - Sender's address
- `receiver_address`: VARCHAR(255) - Receiver's address
- `contract_id`: UUID - Foreign key to contracts table
- `created_at`: TIMESTAMP

### Contracts
- `id`: UUID (primary key)
- `name`: VARCHAR(255) - Contract name (e.g., CONFIDENTIAL_ERC20, WETH_TOKEN_ADDRESS)
- `network`: VARCHAR(100) - Network name (e.g., SEPOLIA)
- `address`: VARCHAR(255) - Contract address
- `created_at`: TIMESTAMP

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `409`: Conflict (duplicate entries)
- `500`: Internal Server Error

## Development

### Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Compile TypeScript to JavaScript
- `npm start`: Start production server
- `npm run type-check`: Type check without building
- `npm run migrate`: Run database migrations

### Project Structure

```
src/
├── index.ts              # Express app setup and route registration
├── routes/               # API route handlers
│   ├── register.ts
│   ├── getUser.ts
│   ├── deleteUser.ts
│   ├── transaction.ts
│   ├── tokens.ts
│   └── config.ts
├── db/                   # Database services and migrations
│   ├── services/
│   ├── migrations/
│   └── connection.ts
└── scripts/              # Utility scripts
```

## Deployment

The backend is configured for Vercel serverless deployment. The app exports the Express instance for use with Vercel's serverless functions.

For more information about database setup and migrations, see `src/db/README.md`.

