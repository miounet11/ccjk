import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { GetEmailAddressInsightsRequest, GetEmailAddressInsightsResponse } from "../models/models_0";
import type { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetEmailAddressInsightsCommand}.
 */
export interface GetEmailAddressInsightsCommandInput extends GetEmailAddressInsightsRequest {
}
/**
 * @public
 *
 * The output of {@link GetEmailAddressInsightsCommand}.
 */
export interface GetEmailAddressInsightsCommandOutput extends GetEmailAddressInsightsResponse, __MetadataBearer {
}
declare const GetEmailAddressInsightsCommand_base: {
    new (input: GetEmailAddressInsightsCommandInput): import("@smithy/smithy-client").CommandImpl<GetEmailAddressInsightsCommandInput, GetEmailAddressInsightsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetEmailAddressInsightsCommandInput): import("@smithy/smithy-client").CommandImpl<GetEmailAddressInsightsCommandInput, GetEmailAddressInsightsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Provides validation insights about a specific email address, including syntax validation, DNS record checks, mailbox existence, and other deliverability factors.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetEmailAddressInsightsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetEmailAddressInsightsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetEmailAddressInsightsRequest
 *   EmailAddress: "STRING_VALUE", // required
 * };
 * const command = new GetEmailAddressInsightsCommand(input);
 * const response = await client.send(command);
 * // { // GetEmailAddressInsightsResponse
 * //   MailboxValidation: { // MailboxValidation
 * //     IsValid: { // EmailAddressInsightsVerdict
 * //       ConfidenceVerdict: "LOW" || "MEDIUM" || "HIGH",
 * //     },
 * //     Evaluations: { // EmailAddressInsightsMailboxEvaluations
 * //       HasValidSyntax: {
 * //         ConfidenceVerdict: "LOW" || "MEDIUM" || "HIGH",
 * //       },
 * //       HasValidDnsRecords: {
 * //         ConfidenceVerdict: "LOW" || "MEDIUM" || "HIGH",
 * //       },
 * //       MailboxExists: {
 * //         ConfidenceVerdict: "LOW" || "MEDIUM" || "HIGH",
 * //       },
 * //       IsRoleAddress: {
 * //         ConfidenceVerdict: "LOW" || "MEDIUM" || "HIGH",
 * //       },
 * //       IsDisposable: "<EmailAddressInsightsVerdict>",
 * //       IsRandomInput: "<EmailAddressInsightsVerdict>",
 * //     },
 * //   },
 * // };
 *
 * ```
 *
 * @param GetEmailAddressInsightsCommandInput - {@link GetEmailAddressInsightsCommandInput}
 * @returns {@link GetEmailAddressInsightsCommandOutput}
 * @see {@link GetEmailAddressInsightsCommandInput} for command's `input` shape.
 * @see {@link GetEmailAddressInsightsCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link TooManyRequestsException} (client fault)
 *  <p>Too many requests have been made to the operation.</p>
 *
 * @throws {@link SESv2ServiceException}
 * <p>Base exception class for all service exceptions from SESv2 service.</p>
 *
 *
 * @public
 */
export declare class GetEmailAddressInsightsCommand extends GetEmailAddressInsightsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetEmailAddressInsightsRequest;
            output: GetEmailAddressInsightsResponse;
        };
        sdk: {
            input: GetEmailAddressInsightsCommandInput;
            output: GetEmailAddressInsightsCommandOutput;
        };
    };
}
