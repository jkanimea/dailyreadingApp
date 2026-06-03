export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly context?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
