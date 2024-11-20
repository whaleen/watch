// netlify/functions/config.ts
import { Handler } from '@netlify/functions'
import { saveConfig, getConfigByUser } from '../../src/lib/db'

export const handler: Handler = async (event) => {
  if (!event.body && !event.queryStringParameters) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No data provided' }),
    }
  }

  try {
    if (event.httpMethod === 'POST') {
      const config = JSON.parse(event.body || '{}')
      const savedConfig = await saveConfig(config)
      return {
        statusCode: 200,
        body: JSON.stringify(savedConfig),
      }
    }

    if (event.httpMethod === 'GET') {
      const { userId } = event.queryStringParameters || {}
      if (!userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'User ID is required' }),
        }
      }
      const config = await getConfigByUser(userId)
      return {
        statusCode: 200,
        body: JSON.stringify(config),
      }
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (error) {
    console.error('Error in config function:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
