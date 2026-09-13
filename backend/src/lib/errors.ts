export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }

  static badRequest(code: string, message: string) {
    return new ApiError(400, code, message);
  }
  static unauthorized(message = "Требуется авторизация") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "Доступ запрещён") {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Не найдено") {
    return new ApiError(404, "NOT_FOUND", message);
  }
  static conflict(code: string, message: string) {
    return new ApiError(409, code, message);
  }
  static tooMany(code: string, message: string) {
    return new ApiError(429, code, message);
  }
}
