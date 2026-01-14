import { APIGatewayProxyEvent, APIGatewayTokenAuthorizerEvent, APIGatewayProxyResult, APIGatewayAuthorizerResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log("Event:", JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Hello from muffin-serverless-terraform!",
      path: event.path
    }),
  };
};

export const secureHandler = async (event: APIGatewayProxyEvent) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "I am SECRET! You have the correct token." }),
  };
};

export const authHandler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  const token = event.authorizationToken; 

  // Simple Logic: Check if the header "Authorization" equals "my-secret-token"
  // In reality, you would validate a JWT or check a database here.
  const isAllowed = token === 'my-secret-token';
  const effect = isAllowed ? 'Allow' : 'Deny';

  return {
    principalId: 'user',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: event.methodArn, // Allow/Deny access to the requested API resource
      }],
    },
  };
};