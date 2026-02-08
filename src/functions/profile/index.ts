import { APIGatewayProxyEvent } from 'aws-lambda';
import { GetProfileByIdUseCase, GetProfileUseCase } from './useCase/getProfileUseCase';
import { CreateProfileUseCase } from './useCase/createProfileUseCase';
import { DeleteProfileUseCase } from './useCase/deleteProfileUseCase';
import { UpdateProfileUseCase } from './useCase/updateProfileUseCase';

export const getProfile = async (event: APIGatewayProxyEvent) => {
  return new GetProfileUseCase(event).execute();
};

export const getProfileById = async (event: APIGatewayProxyEvent) => {
  return new GetProfileByIdUseCase(event).execute();
};

export const createProfile = async (event: APIGatewayProxyEvent) => {
  return new CreateProfileUseCase(event).execute();
};

export const deleteProfile = async (event: APIGatewayProxyEvent) => {
  return new DeleteProfileUseCase(event).execute();
};

export const updateProfile = async (event: APIGatewayProxyEvent) => {
  return new UpdateProfileUseCase(event).execute();
};
