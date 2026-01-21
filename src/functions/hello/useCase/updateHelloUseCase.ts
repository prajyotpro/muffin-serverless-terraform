import { APIGatewayProxyEvent } from 'aws-lambda/trigger/api-gateway-proxy';

export class UpdateHelloUseCase {
  private event: APIGatewayProxyEvent;

  constructor(event: APIGatewayProxyEvent) {
    this.event = event;
  }

  execute() {
    try {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Hello update.',
        }),
      };
    } catch (error) {
      console.error('Error', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Request failed' }) };
    }
  }
}
