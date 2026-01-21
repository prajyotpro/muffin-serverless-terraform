import { APIGatewayProxyEvent, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { handler as authHandler } from './src/functions/auth';
import { MuffinServerlessRouter } from './core/router';
import { getHello, createHello, deleteHello, updateHello, getHelloById } from './src/functions/hello/index';

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

// Hello Module Routes
app.get('/hello', Auth, async (event: APIGatewayProxyEvent) => {
  return getHello(event);
});

app.get('/hello/:id', Auth, async (event: APIGatewayProxyEvent) => {
  return getHelloById(event);
});

app.post('/hello', Auth, async (event: APIGatewayProxyEvent) => {
  return createHello(event);
});

app.delete('/hello', Auth, async (event: APIGatewayProxyEvent) => {
  return deleteHello(event);
});

app.put('/hello', Auth, async (event: APIGatewayProxyEvent) => {
  return updateHello(event);
});


const handler = (event: APIGatewayProxyEvent) => app.handle(event);

const server = require('./core/server').Server(handler);
const PORT = 3000;

server.listen(PORT, () => {
  console.log(`🚀 Local Server running at http://localhost:${PORT}`);
});