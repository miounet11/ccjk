import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { PutConfigurationSetReputationOptions$ } from "../schemas/schemas_0";
export { $Command };
export class PutConfigurationSetReputationOptionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SimpleEmailService_v2", "PutConfigurationSetReputationOptions", {})
    .n("SESv2Client", "PutConfigurationSetReputationOptionsCommand")
    .sc(PutConfigurationSetReputationOptions$)
    .build() {
}
