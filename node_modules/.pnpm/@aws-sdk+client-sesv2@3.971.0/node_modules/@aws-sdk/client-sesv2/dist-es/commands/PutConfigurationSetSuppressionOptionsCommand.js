import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { PutConfigurationSetSuppressionOptions$ } from "../schemas/schemas_0";
export { $Command };
export class PutConfigurationSetSuppressionOptionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SimpleEmailService_v2", "PutConfigurationSetSuppressionOptions", {})
    .n("SESv2Client", "PutConfigurationSetSuppressionOptionsCommand")
    .sc(PutConfigurationSetSuppressionOptions$)
    .build() {
}
