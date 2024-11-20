// netlify/functions/user.ts
import { Handler } from '@netlify/functions'
import { createUser, getUserByWallet } from '../../src/lib/db'

export const handler: Handler = async (event) => {
  if (!event.body && !event.queryStringParameters) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No data provided' }),
    }
  }

  try {
    if (event.httpMethod === 'POST') {
      const { walletAddress } = JSON.parse(event.body || '{}')
      const user = await createUser(walletAddress)
      return {
        statusCode: 200,
        body: JSON.stringify(user),
      }
    }

    if (event.httpMethod === 'GET') {
      const { walletAddress } = event.queryStringParameters || {}
      if (!walletAddress) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Wallet address is required' }),
        }
      }
      const user = await getUserByWallet(walletAddress)
      return {
        statusCode: 200,
        body: JSON.stringify(user),
      }
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (error) {
    console.error('Error in user function:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
