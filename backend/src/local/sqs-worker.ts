/*--------------------------------------------------------------------
-- Local SQS Worker for processing messages in local development
-- from localstack SQS queues.
--------------------------------------------------------------------*/

import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs'
import type { SQSEvent } from 'aws-lambda'
import { handler as resolveHandler } from '$lambdas/guess-resolver'
import { useSqsUtil } from '$utils/useSqsUtil'

const REGION = process.env.AWS_REGION ?? 'eu-central-1'
const QUEUE_URL = process.env.QUEUE_URL

if (!QUEUE_URL) {
  throw new Error('QUEUE_URL is required (e.g. http://localhost:4566/000000000000/guess-resolver)')
}

const sqs = useSqsUtil().getClient()

async function loop() {
  console.log('SQS worker started on host')
  console.log('QUEUE_URL:', QUEUE_URL)

  while (true) {
    try {
      const res = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: QUEUE_URL,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 10,
          VisibilityTimeout: 30,
        }),
      )

      const msg = res.Messages?.[0]
      if (!msg?.ReceiptHandle || !msg.Body) {
        continue
      }

      // Construct fake Lambda event
      const event: SQSEvent = {
        Records: [
          {
            messageId: msg.MessageId ?? 'local',
            receiptHandle: msg.ReceiptHandle,
            body: msg.Body,
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: String(Date.now()),
              SenderId: 'local',
              ApproximateFirstReceiveTimestamp: String(Date.now()),
            },
            messageAttributes: {},
            md5OfBody: '',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:local:000000000000:guess-resolver',
            awsRegion: REGION,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        ],
      }

      // Invoke handler
      await resolveHandler(event)

      // Delete if successful
      await sqs.send(
        new DeleteMessageCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: msg.ReceiptHandle,
        }),
      )
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Worker error:', err)
      }
      // tiny backoff
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
}

loop()
