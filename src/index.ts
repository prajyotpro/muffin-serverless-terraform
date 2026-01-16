import { APIGatewayProxyEvent, SQSEvent, APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({ region: "us-east-1" });

// --- 1. AUTHORIZER (Unchanged) ---
export const authHandler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  const token = event.authorizationToken;
  const effect = token === 'my-secret-token' ? 'Allow' : 'Deny';
  return {
    principalId: 'user',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{ Action: 'execute-api:Invoke', Effect: effect, Resource: event.methodArn }],
    },
  };
};

// --- 2. PRODUCER (The API Handler) ---
// Validates input -> Sends to SQS -> Returns 200 OK immediately
export const producerHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const queueUrl = process.env.QUEUE_URL; // We will set this in Terraform
    const body = event.body || "{}";
    
    // Send to SQS
    await sqs.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: body,
    }));

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

// --- 3. CONSUMER (The Background Worker) ---
// Triggered by SQS -> Processes message -> Deletes from Queue (automatically)
export const consumerHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const payload = record.body;
    
    // Simulate heavy work (e.g., Image processing, DB write)
    console.log(`[WORKER] Processing message ID: ${record.messageId}`);
    console.log(`[WORKER] Payload: ${payload}`);
    
    // If you throw an error here, SQS will retry later.
    // If you return successfully, SQS deletes the message.
    await new Promise(resolve => setTimeout(resolve, 1000)); 
  }
};