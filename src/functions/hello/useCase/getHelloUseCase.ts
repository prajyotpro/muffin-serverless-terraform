import { APIGatewayProxyEvent } from 'aws-lambda/trigger/api-gateway-proxy';
import { MyService } from '@services/myService';

export class GetHelloUseCase {
  private event: APIGatewayProxyEvent;

  constructor(event: APIGatewayProxyEvent) {
    this.event = event;
  }

  execute() {
    const myService = new MyService();

    try {
      myService.doSomething();
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Hello.',
        }),
      };
    } catch (error) {
      console.error('Error', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Request failed' }) };
    }
  }
}

export class GetHelloByIdUseCase {
  private event: APIGatewayProxyEvent;

  constructor(event: APIGatewayProxyEvent) {
    this.event = event;
  }

  execute() {
    const paramId = this.event.pathParameters?.id;

    try {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Hello by Id: ${paramId}.`,
        }),
      };
    } catch (error) {
      console.error('Error', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Request failed' }) };
    }
  }
}
