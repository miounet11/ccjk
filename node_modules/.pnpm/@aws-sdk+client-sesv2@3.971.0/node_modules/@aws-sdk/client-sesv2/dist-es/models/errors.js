import { SESv2ServiceException as __BaseException } from "./SESv2ServiceException";
export class AccountSuspendedException extends __BaseException {
    name = "AccountSuspendedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "AccountSuspendedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AccountSuspendedException.prototype);
    }
}
export class AlreadyExistsException extends __BaseException {
    name = "AlreadyExistsException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "AlreadyExistsException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AlreadyExistsException.prototype);
    }
}
export class BadRequestException extends __BaseException {
    name = "BadRequestException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "BadRequestException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, BadRequestException.prototype);
    }
}
export class InternalServiceErrorException extends __BaseException {
    name = "InternalServiceErrorException";
    $fault = "server";
    constructor(opts) {
        super({
            name: "InternalServiceErrorException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServiceErrorException.prototype);
    }
}
export class NotFoundException extends __BaseException {
    name = "NotFoundException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "NotFoundException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, NotFoundException.prototype);
    }
}
export class TooManyRequestsException extends __BaseException {
    name = "TooManyRequestsException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "TooManyRequestsException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, TooManyRequestsException.prototype);
    }
}
export class ConcurrentModificationException extends __BaseException {
    name = "ConcurrentModificationException";
    $fault = "server";
    constructor(opts) {
        super({
            name: "ConcurrentModificationException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, ConcurrentModificationException.prototype);
    }
}
export class ConflictException extends __BaseException {
    name = "ConflictException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ConflictException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ConflictException.prototype);
    }
}
export class LimitExceededException extends __BaseException {
    name = "LimitExceededException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "LimitExceededException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, LimitExceededException.prototype);
    }
}
export class MailFromDomainNotVerifiedException extends __BaseException {
    name = "MailFromDomainNotVerifiedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "MailFromDomainNotVerifiedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, MailFromDomainNotVerifiedException.prototype);
    }
}
export class MessageRejected extends __BaseException {
    name = "MessageRejected";
    $fault = "client";
    constructor(opts) {
        super({
            name: "MessageRejected",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, MessageRejected.prototype);
    }
}
export class SendingPausedException extends __BaseException {
    name = "SendingPausedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "SendingPausedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, SendingPausedException.prototype);
    }
}
export class InvalidNextTokenException extends __BaseException {
    name = "InvalidNextTokenException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidNextTokenException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidNextTokenException.prototype);
    }
}
