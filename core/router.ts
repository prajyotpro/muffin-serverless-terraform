import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

type HandlerFunc = (event: APIGatewayProxyEvent) => Promise<any> | any;

interface Route {
  method: string;
  pathRegex: RegExp;
  paramNames: string[];
  handlers: HandlerFunc[];
}

export class MuffinServerlessRouter {

  private routes: Route[] = [];

  get(path: string, ...handlers: HandlerFunc[]) { this.register('GET', path, handlers); }
  post(path: string, ...handlers: HandlerFunc[]) { this.register('POST', path, handlers); }
  delete(path: string, ...handlers: HandlerFunc[]) { this.register('DELETE', path, handlers); }
  put(path: string, ...handlers: HandlerFunc[]) { this.register('PUT', path, handlers); }
  patch(path: string, ...handlers: HandlerFunc[]) { this.register('PATCH', path, handlers); }

  private register(method: string, path: string, handlers: HandlerFunc[]) {
    const paramNames: string[] = [];

    const regexPath = path.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
      paramNames.push(key);
      return '([^/]+)';
    });

    this.routes.push({
      method,
      pathRegex: new RegExp(`^${regexPath}$`),
      paramNames,
      handlers
    });
  }

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const { httpMethod, path } = event;

    const match = this.routes.find(r => 
      r.method === httpMethod && r.pathRegex.test(path)
    );

    if (!match) {
      return { statusCode: 404, body: JSON.stringify({ error: `Route ${httpMethod}:${path} not found` }) };
    }

    const values = path.match(match.pathRegex);
    
    if (values && values.length > 1) {
      event.pathParameters = event.pathParameters || {};
      
      match.paramNames.forEach((name, index) => {
        event.pathParameters![name] = values[index + 1];
      });
    }

    try {
      for (const handler of match.handlers) {
        const result = await handler(event);

        if (result) {
           return {
             statusCode: 200,
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify(result),
           };
        }
      }
    } catch (err: any) {
      console.error(err);
      const code = err.message === "Unauthorized" ? 401 : 500;
      return { statusCode: code, body: JSON.stringify({ error: err.message }) };
    }

    return { statusCode: 500, body: JSON.stringify({ error: "No response from handler" }) };
  }
}