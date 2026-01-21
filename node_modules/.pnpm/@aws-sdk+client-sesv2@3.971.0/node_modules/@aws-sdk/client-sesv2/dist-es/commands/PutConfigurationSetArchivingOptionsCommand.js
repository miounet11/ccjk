import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { PutConfigurationSetArchivingOptions$ } from "../schemas/schemas_0";
export { $Command };
export class PutConfigurationSetArchivingOptionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SimpleEmailService_v2", "PutConfigurationSetArchivingOptions", {})
    .n("SESv2Client", "PutConfigurationSetArchivingOptionsCommand")
    .sc(PutConfigurationSetArchivingOptions$)
    .build() {
}
