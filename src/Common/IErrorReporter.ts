export interface IErrorReporter {
  reportError(payload: string, error: Error): Promise<any>;
}
