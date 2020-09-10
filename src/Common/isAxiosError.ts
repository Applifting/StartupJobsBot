import { AxiosError } from 'axios';

export function isAxiosError(error: any): error is AxiosError {
  return (error as AxiosError).config !== undefined;
}
