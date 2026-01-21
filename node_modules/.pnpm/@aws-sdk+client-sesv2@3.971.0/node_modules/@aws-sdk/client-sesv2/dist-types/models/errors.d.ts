import type { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { SESv2ServiceException as __BaseException } from "./SESv2ServiceException";
/**
 * <p>The message can't be sent because the account's ability to send email has been
 *             permanently restricted.</p>
 * @public
 */
export declare class AccountSuspendedException extends __BaseException {
    readonly name: "AccountSuspendedException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<AccountSuspendedException, __BaseException>);
}
/**
 * <p>The resource specified in your request already exists.</p>
 * @public
 */
export declare class AlreadyExistsException extends __BaseException {
    readonly name: "AlreadyExistsException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<AlreadyExistsException, __BaseException>);
}
/**
 * <p>The input you provided is invalid.</p>
 * @public
 */
export declare class BadRequestException extends __BaseException {
    readonly name: "BadRequestException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<BadRequestException, __BaseException>);
}
/**
 * <p>The request couldn't be processed because an error occurred with the Amazon SES API v2.</p>
 * @public
 */
export declare class InternalServiceErrorException extends __BaseException {
    readonly name: "InternalServiceErrorException";
    readonly $fault: "server";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InternalServiceErrorException, __BaseException>);
}
/**
 * <p>The resource you attempted to access doesn't exist.</p>
 * @public
 */
export declare class NotFoundException extends __BaseException {
    readonly name: "NotFoundException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<NotFoundException, __BaseException>);
}
/**
 * <p>Too many requests have been made to the operation.</p>
 * @public
 */
export declare class TooManyRequestsException extends __BaseException {
    readonly name: "TooManyRequestsException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<TooManyRequestsException, __BaseException>);
}
/**
 * <p>The resource is being modified by another operation or thread.</p>
 * @public
 */
export declare class ConcurrentModificationException extends __BaseException {
    readonly name: "ConcurrentModificationException";
    readonly $fault: "server";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ConcurrentModificationException, __BaseException>);
}
/**
 * <p>If there is already an ongoing account details update under review.</p>
 * @public
 */
export declare class ConflictException extends __BaseException {
    readonly name: "ConflictException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ConflictException, __BaseException>);
}
/**
 * <p>There are too many instances of the specified resource type.</p>
 * @public
 */
export declare class LimitExceededException extends __BaseException {
    readonly name: "LimitExceededException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<LimitExceededException, __BaseException>);
}
/**
 * <p>The message can't be sent because the sending domain isn't verified.</p>
 * @public
 */
export declare class MailFromDomainNotVerifiedException extends __BaseException {
    readonly name: "MailFromDomainNotVerifiedException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<MailFromDomainNotVerifiedException, __BaseException>);
}
/**
 * <p>The message can't be sent because it contains invalid content.</p>
 * @public
 */
export declare class MessageRejected extends __BaseException {
    readonly name: "MessageRejected";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<MessageRejected, __BaseException>);
}
/**
 * <p>The message can't be sent because the account's ability to send email is currently
 *             paused.</p>
 * @public
 */
export declare class SendingPausedException extends __BaseException {
    readonly name: "SendingPausedException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<SendingPausedException, __BaseException>);
}
/**
 * <p>The specified request includes an invalid or expired token.</p>
 * @public
 */
export declare class InvalidNextTokenException extends __BaseException {
    readonly name: "InvalidNextTokenException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidNextTokenException, __BaseException>);
}
