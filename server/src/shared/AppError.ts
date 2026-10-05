// Typed HTTP errors. Services throw these; the error middleware maps them to a
// status + JSON message. Status codes match the existing API contract exactly so
// the client keeps working unchanged.
export class AppError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
        this.name = new.target.name;
    }
}

export class BadRequestError extends AppError {
    constructor(message = 'Bad request') { super(400, message); }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') { super(401, message); }
}
export class NotFoundError extends AppError {
    constructor(message = 'Not found') { super(404, message); }
}
export class ConflictError extends AppError {
    constructor(message = 'Conflict') { super(409, message); }
}
export class PayloadTooLargeError extends AppError {
    constructor(message = 'Payload too large') { super(413, message); }
}
// Insufficient credits — kept at 403 to preserve the current client behaviour.
export class InsufficientCreditsError extends AppError {
    constructor(message = 'Add more credits') { super(403, message); }
}
// AI returned something unusable.
export class UpstreamError extends AppError {
    constructor(message = 'Upstream error') { super(502, message); }
}
