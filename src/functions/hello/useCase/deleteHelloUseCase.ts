import { APIGatewayProxyEvent } from 'aws-lambda/trigger/api-gateway-proxy';

export class DeleteHelloUseCase {
  private event: APIGatewayProxyEvent;

  constructor(event: APIGatewayProxyEvent) {
    this.event = event;
  }

  execute() {
    try {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Hello deleted.',
        }),
      };
    } catch (error) {
      console.error('Error', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Request failed' }) };
    }
  }
}
