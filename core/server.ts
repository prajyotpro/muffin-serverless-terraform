import { createServer, IncomingMessage, ServerResponse } from 'http';
import { APIGatewayProxyEvent } from 'aws-lambda';

const PORT = 3000;

// Helper to convert Node.js HTTP headers to AWS format
const normalizeHeaders = (headers: IncomingMessage['headers']) => {
  const normalized: { [key: string]: string } = {};
  for (const key in headers) {
    const value = headers[key];
    if (typeof value === 'string') normalized[key] = value;
    else if (Array.isArray(value)) normalized[key] = value.join(',');
  }
  return normalized;
};

// Helper to read the body from the request
const readBody = (req: IncomingMessage): Promise<string> => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk.toString()));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
};

export const Server = (handler: (event: APIGatewayProxyEvent) => Promise<any> | any) => {
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
        // 1. Prepare the Fake AWS Event
        const body = await readBody(req);
        const [path, queryString] = (req.url || '').split('?');

        const event: APIGatewayProxyEvent = {
        httpMethod: req.method || 'GET',
        path: path,
        headers: normalizeHeaders(req.headers),
        body: body || null,
        queryStringParameters: null, // (You can parse 'queryString' here if needed)
        isBase64Encoded: false,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
        };

        // 2. Run your Lambda Handler
        console.log(`[${req.method}] ${req.url}`);
        const result = await handler(event);

        // 3. Send Response back to Browser/Client
        // If result is undefined (void), send 500
        if (!result) {
        res.statusCode = 500;
        res.end('Lambda returned no result');
        return;
        }

        res.statusCode = result.statusCode;
        
        // Set headers
        if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
            res.setHeader(key, value as string);
        });
        }

        // Send body
        res.end(result.body);

    } catch (err) {
        console.error(err);
        res.statusCode = 500;
        res.end('Internal Server Error');
    }
    });
    return server;
}

