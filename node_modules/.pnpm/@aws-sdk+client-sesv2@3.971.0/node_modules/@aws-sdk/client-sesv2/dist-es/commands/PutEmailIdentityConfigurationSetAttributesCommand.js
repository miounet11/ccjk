import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { PutEmailIdentityConfigurationSetAttributes$ } from "../schemas/schemas_0";
export { $Command };
export class PutEmailIdentityConfigurationSetAttributesCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SimpleEmailService_v2", "PutEmailIdentityConfigurationSetAttributes", {})
    .n("SESv2Client", "PutEmailIdentityConfigurationSetAttributesCommand")
    .sc(PutEmailIdentityConfigurationSetAttributes$)
    .build() {
}
