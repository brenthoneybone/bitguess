import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { OpenAPIBackend } from 'openapi-backend'
import addFormats from 'ajv-formats'
import path from 'path'
import { ROUTES } from '$routes/index'
import { useJsonUtil } from '$utils/useJsonUtil'

const jsonUtil = useJsonUtil()

// Initialize OpenAPIBackend
const api = new OpenAPIBackend({
  definition: path.join(__dirname, 'openapi.yaml'),
  customizeAjv: (ajv) => {
    addFormats(ajv)
    return ajv
  },
})

// Register handlers
api.register(ROUTES)

// Initialize API
api.init()

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200 }
  }

  const stage = event.requestContext.stage
  let effectivePath = event.requestContext.http.path

  // Strip stage from path if present
  if (stage !== '$default' && effectivePath.startsWith(`/${stage}`)) {
    effectivePath = effectivePath.substring(stage.length + 1)
  }

  try {
    return await api.handleRequest(
      {
        method: event.requestContext.http.method,
        path: effectivePath,
        query: event.queryStringParameters as Record<string, string | string[]>,
        body: event.body,
        headers: event.headers as Record<string, string | string[]>,
      },
      event,
    )
  } catch (err) {
    console.error('Root Error Handler:', err)
    return jsonUtil.json(500, { error: 'Internal Server Error' })
  }
}
