import { APIGatewayProxyResultV2 } from 'aws-lambda'

const json = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

export const useJsonUtil = () => ({
  json,
})
