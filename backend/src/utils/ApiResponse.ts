export class ApiResponse<T> {
  public readonly success = true;
  constructor(public readonly data: T, public readonly meta?: Record<string, unknown>) {}
}
