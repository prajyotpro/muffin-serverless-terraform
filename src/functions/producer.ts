import { APIGatewayProxyEvent } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({ region: "us-east-1" });

// --- 2. PRODUCER (The API Handler) ---
// Validates input -> Sends to SQS -> Returns 200 OK immediately
export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const queueOneUrl = process.env.QUEUE_ONE_URL; // We will set this in Terraform
    const queueTwoUrl = process.env.QUEUE_TWO_URL;

    const body = event.body || "{}";
    const headers = event.headers || {};

    if (headers.function === "consumerOne") {
      // Send to SQS
      await sqs.send(new SendMessageCommand({
        QueueUrl: queueOneUrl,
        MessageBody: body,
      }));
    } else if (headers.function === "consumerTwo") {
      // Send to SQS
      await sqs.send(new SendMessageCommand({
        QueueUrl: queueTwoUrl,
        MessageBody: body,
      }));
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid function header" }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: "Request received! We are processing it in the background.",
        status: "queued" 
      }),
    };
  } catch (error) {
    console.error("Error sending to SQS:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to queue message" }) };
  }
};