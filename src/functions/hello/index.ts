import { APIGatewayProxyEvent } from 'aws-lambda';
import { GetHelloByIdUseCase, GetHelloUseCase } from './useCase/getHelloUseCase';
import { CreateHelloUseCase } from './useCase/createHelloUseCase';
import { DeleteHelloUseCase } from './useCase/deleteHelloUseCase';
import { UpdateHelloUseCase } from './useCase/updateHelloUseCase';

export const getHello = async (event: APIGatewayProxyEvent) => {
  return new GetHelloUseCase(event).execute();
};

export const getHelloById = async (event: APIGatewayProxyEvent) => {
  return new GetHelloByIdUseCase(event).execute();
};

export const createHello = async (event: APIGatewayProxyEvent) => {
  return new CreateHelloUseCase(event).execute();
};

export const deleteHello = async (event: APIGatewayProxyEvent) => {
  return new DeleteHelloUseCase(event).execute();
};

export const updateHello = async (event: APIGatewayProxyEvent) => {
  return new UpdateHelloUseCase(event).execute();
};
