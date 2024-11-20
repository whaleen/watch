// src/lib/db.ts
import { Pool } from 'pg'
import { z } from 'zod'

// Create a new pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
})

export const UserSchema = z.object({
  id: z.string(),
  wallet_address: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
})

export const ConfigSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  rpc_provider: z.enum(['helius', 'quicknode']),
  rpc_api_key: z.string(),
  rpc_url: z.string().optional(),
  railway_api_key: z.string(),
  railway_project_id: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
})

export type User = z.infer<typeof UserSchema>
export type Config = z.infer<typeof ConfigSchema>

// Database initialization
export async function initDatabase() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        rpc_provider TEXT NOT NULL,
        rpc_api_key TEXT NOT NULL,
        rpc_url TEXT,
        railway_api_key TEXT NOT NULL,
        railway_project_id TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `)
  } finally {
    client.release()
  }
}

// User operations
export async function createUser(walletAddress: string): Promise<User> {
  const client = await pool.connect()
  try {
    const result = await client.query(
      `
      INSERT INTO users (wallet_address)
      VALUES ($1)
      RETURNING *
    `,
      [walletAddress]
    )
    return UserSchema.parse(result.rows[0])
  } finally {
    client.release()
  }
}

export async function getUserByWallet(
  walletAddress: string
): Promise<User | null> {
  const client = await pool.connect()
  try {
    const result = await client.query(
      `
      SELECT * FROM users WHERE wallet_address = $1
    `,
      [walletAddress]
    )
    return result.rows[0] ? UserSchema.parse(result.rows[0]) : null
  } finally {
    client.release()
  }
}

// Config operations
export async function saveConfig(
  config: Omit<Config, 'id' | 'created_at' | 'updated_at'>
): Promise<Config> {
  const client = await pool.connect()
  try {
    const result = await client.query(
      `
      INSERT INTO configs (
        user_id, rpc_provider, rpc_api_key, rpc_url, 
        railway_api_key, railway_project_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE SET
        rpc_provider = EXCLUDED.rpc_provider,
        rpc_api_key = EXCLUDED.rpc_api_key,
        rpc_url = EXCLUDED.rpc_url,
        railway_api_key = EXCLUDED.railway_api_key,
        railway_project_id = EXCLUDED.railway_project_id,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
      [
        config.user_id,
        config.rpc_provider,
        config.rpc_api_key,
        config.rpc_url,
        config.railway_api_key,
        config.railway_project_id,
      ]
    )
    return ConfigSchema.parse(result.rows[0])
  } finally {
    client.release()
  }
}

export async function getConfigByUser(userId: string): Promise<Config | null> {
  const client = await pool.connect()
  try {
    const result = await client.query(
      `
      SELECT * FROM configs WHERE user_id = $1
    `,
      [userId]
    )
    return result.rows[0] ? ConfigSchema.parse(result.rows[0]) : null
  } finally {
    client.release()
  }
}
