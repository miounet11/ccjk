import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { SESv2ServiceException as __BaseException } from "./SESv2ServiceException";
export declare class AccountSuspendedException extends __BaseException {
  readonly name: "AccountSuspendedException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<AccountSuspendedException, __BaseException>
  );
}
export declare class AlreadyExistsException extends __BaseException {
  readonly name: "AlreadyExistsException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<AlreadyExistsException, __BaseException>
  );
}
export declare class BadRequestException extends __BaseException {
  readonly name: "BadRequestException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<BadRequestException, __BaseException>
  );
}
export declare class InternalServiceErrorException extends __BaseException {
  readonly name: "InternalServiceErrorException";
  readonly $fault: "server";
  constructor(
    opts: __ExceptionOptionType<InternalServiceErrorException, __BaseException>
  );
}
export declare class NotFoundException extends __BaseException {
  readonly name: "NotFoundException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<NotFoundException, __BaseException>);
}
export declare class TooManyRequestsException extends __BaseException {
  readonly name: "TooManyRequestsException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<TooManyRequestsException, __BaseException>
  );
}
export declare class ConcurrentModificationException extends __BaseException {
  readonly name: "ConcurrentModificationException";
  readonly $fault: "server";
  constructor(
    opts: __ExceptionOptionType<
      ConcurrentModificationException,
      __BaseException
    >
  );
}
export declare class ConflictException extends __BaseException {
  readonly name: "ConflictException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<ConflictException, __BaseException>);
}
export declare class LimitExceededException extends __BaseException {
  readonly name: "LimitExceededException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<LimitExceededException, __BaseException>
  );
}
export declare class MailFromDomainNotVerifiedException extends __BaseException {
  readonly name: "MailFromDomainNotVerifiedException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      MailFromDomainNotVerifiedException,
      __BaseException
    >
  );
}
export declare class MessageRejected extends __BaseException {
  readonly name: "MessageRejected";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<MessageRejected, __BaseException>);
}
export declare class SendingPausedException extends __BaseException {
  readonly name: "SendingPausedException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<SendingPausedException, __BaseException>
  );
}
export declare class InvalidNextTokenException extends __BaseException {
  readonly name: "InvalidNextTokenException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<InvalidNextTokenException, __BaseException>
  );
}
