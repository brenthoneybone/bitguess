import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './http-api'
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'

// Mock OpenAPIBackend
const { handleRequestMock } = vi.hoisted(() => ({
  handleRequestMock: vi.fn(),
}))

vi.mock('openapi-backend', () => {
  return {
    OpenAPIBackend: class {
      constructor() {}
      register = vi.fn()
      init = vi.fn()
      handleRequest = handleRequestMock
    },
  }
})

describe('http-api lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {}) // Silence errors
  })

  // Critical for CORS: Verifies that OPTIONS requests bypass the OpenAPI router
  // and return 200 OK immediately for preflight checks.
  it('should handle OPTIONS requests directly (CORS)', async () => {
    const event = {
      requestContext: { http: { method: 'OPTIONS', path: '/anything' } },
    } as unknown as APIGatewayProxyEventV2

    const result = await handler(event)

    expect(result).toEqual({ statusCode: 200 })
    expect(handleRequestMock).not.toHaveBeenCalled()
  })

  // Verifies that standard requests are correctly mapped to OpenAPIBackend's handleRequest.
  it('should delegate valid requests to openapi-backend', async () => {
    const event = {
      requestContext: { stage: '$default', http: { method: 'GET', path: '/test' } },
      queryStringParameters: { q: '1' },
      body: '{"foo":"bar"}',
      headers: { header: 'value' },
    } as unknown as APIGatewayProxyEventV2

    handleRequestMock.mockResolvedValueOnce({ statusCode: 200, body: 'ok' })

    const result = await handler(event)

    expect(handleRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/test',
        body: '{"foo":"bar"}',
      }),
      event,
    )
    expect(result).toEqual({ statusCode: 200, body: 'ok' })
  })

  // Verifies that if deployed to a stage like /dev or /prod, that prefix
  // is stripped so the internal router matches paths like /player correctly.
  it('should strip stage name from path if present', async () => {
    const event = {
      requestContext: { stage: 'dev', http: { method: 'POST', path: '/dev/submit' } },
    } as unknown as APIGatewayProxyEventV2

    handleRequestMock.mockResolvedValueOnce({ statusCode: 200 })

    await handler(event)

    expect(handleRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/submit' }),
      event,
    )
  })

  // A global safety net: ensures any unhandled exception results in a structured 500 JSON response
  // rather than a raw Lambda crash.
  it('should catch unhandled errors and return 500', async () => {
    const error = new Error('Random Failure')
    // While the openapi-backend constructor cannot easily be forced to fail here,
    // handleRequest can be forced to throw.
    handleRequestMock.mockRejectedValueOnce(error)

    const event = {
      requestContext: { stage: '$default', http: { method: 'GET', path: '/' } },
    } as unknown as APIGatewayProxyEventV2

    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2

    expect(result.statusCode).toBe(500)
    const body = JSON.parse(result.body as string)
    expect(body.error).toBe('Internal Server Error')
  })
})
