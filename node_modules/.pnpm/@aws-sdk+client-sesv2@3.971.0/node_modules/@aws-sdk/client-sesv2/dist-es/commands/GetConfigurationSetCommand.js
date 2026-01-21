import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetConfigurationSet$ } from "../schemas/schemas_0";
export { $Command };
export class GetConfigurationSetCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SimpleEmailService_v2", "GetConfigurationSet", {})
    .n("SESv2Client", "GetConfigurationSetCommand")
    .sc(GetConfigurationSet$)
    .build() {
}
