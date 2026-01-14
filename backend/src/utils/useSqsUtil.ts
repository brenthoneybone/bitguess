import { SQSClient } from '@aws-sdk/client-sqs'

const region = process.env.AWS_REGION ?? 'eu-central-1'

const client = new SQSClient({
  region,
  endpoint: process.env.SQS_ENDPOINT, // LocalStack
})

const getClient = () => client

export const useSqsUtil = () => ({
  getClient,
})
