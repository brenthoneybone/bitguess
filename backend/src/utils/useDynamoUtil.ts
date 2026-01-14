import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const region = process.env.AWS_REGION ?? 'eu-central-1'
const isLocal = process.env.AWS_SAM_LOCAL === 'true'
const endpoint = process.env.DYNAMODB_ENDPOINT ?? (isLocal ? 'http://dynamodb:8000' : undefined)

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region,
    endpoint, // DynamoDB Local
    credentials: isLocal || endpoint ? { accessKeyId: 'test', secretAccessKey: 'test' } : undefined,
  }),
  { marshallOptions: { removeUndefinedValues: true } },
)

const getClient = () => client

export const useDynamoUtil = () => ({
  getClient,
})
