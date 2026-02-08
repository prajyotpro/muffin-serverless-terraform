import { APIGatewayProxyEvent, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { handler as authHandler } from './src/functions/auth';
import { MuffinServerlessRouter } from './core/router';
import { getProfile, getProfileById, createProfile, updateProfile, deleteProfile } from './src/functions/profile/index';

const app = new MuffinServerlessRouter();

// Middleware-like Logic (Manual)
const Auth = async (event: APIGatewayProxyEvent) => {

    const authEvent = new Object() as APIGatewayTokenAuthorizerEvent;
    authEvent.type = "TOKEN";
    authEvent.authorizationToken = event.headers.authorization || "";
    authEvent.methodArn = "arn:aws:execute-api:us-east-1:123456789012:example/prod/GET/secure-hello";

    const auth = await authHandler(authEvent);
    if(auth.policyDocument.Statement[0].Effect !== "Allow") {
        throw new Error("Unauthorized");
    }  
};

/**
 * A Higher-Order Function that wraps service calls.
 * This keeps the routing table clean and provides a central spot for error handling.
 */
const wrap = (fn: (event: APIGatewayProxyEvent) => Promise<any>) => 
  async (event: APIGatewayProxyEvent) => {
    try {
      return await fn(event);
    } catch (error) {
      console.error(error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Internal Server Error' })
      };
    }
};

// Profile Module Routes
app.get('/profile', Auth, wrap(getProfile));
app.get('/profile/:id', Auth, wrap(getProfileById));
app.post('/profile', Auth, wrap(createProfile));
app.put('/profile', Auth, wrap(updateProfile));
app.delete('/profile', Auth, wrap(deleteProfile));


const handler = (event: APIGatewayProxyEvent) => app.handle(event);

const server = require('./core/server').Server(handler);
const PORT = 3000;

server.listen(PORT, () => {
  console.log(`🚀 Local Server running at http://localhost:${PORT}`);
});