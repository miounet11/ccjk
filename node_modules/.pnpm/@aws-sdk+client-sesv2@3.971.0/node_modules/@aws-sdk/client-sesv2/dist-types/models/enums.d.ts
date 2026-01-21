/**
 * @public
 * @enum
 */
export declare const ContactLanguage: {
    readonly EN: "EN";
    readonly JA: "JA";
};
/**
 * @public
 */
export type ContactLanguage = (typeof ContactLanguage)[keyof typeof ContactLanguage];
/**
 * @public
 * @enum
 */
export declare const MailType: {
    readonly MARKETING: "MARKETING";
    readonly TRANSACTIONAL: "TRANSACTIONAL";
};
/**
 * @public
 */
export type MailType = (typeof MailType)[keyof typeof MailType];
/**
 * @public
 * @enum
 */
export declare const ReviewStatus: {
    readonly DENIED: "DENIED";
    readonly FAILED: "FAILED";
    readonly GRANTED: "GRANTED";
    readonly PENDING: "PENDING";
};
/**
 * @public
 */
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];
/**
 * @public
 * @enum
 */
export declare const AttachmentContentDisposition: {
    readonly ATTACHMENT: "ATTACHMENT";
    readonly INLINE: "INLINE";
};
/**
 * @public
 */
export type AttachmentContentDisposition = (typeof AttachmentContentDisposition)[keyof typeof AttachmentContentDisposition];
/**
 * @public
 * @enum
 */
export declare const AttachmentContentTransferEncoding: {
    readonly BASE64: "BASE64";
    readonly QUOTED_PRINTABLE: "QUOTED_PRINTABLE";
    readonly SEVEN_BIT: "SEVEN_BIT";
};
/**
 * @public
 */
export type AttachmentContentTransferEncoding = (typeof AttachmentContentTransferEncoding)[keyof typeof AttachmentContentTransferEncoding];
/**
 * @public
 * @enum
 */
export declare const MetricDimensionName: {
    readonly CONFIGURATION_SET: "CONFIGURATION_SET";
    readonly EMAIL_IDENTITY: "EMAIL_IDENTITY";
    readonly ISP: "ISP";
};
/**
 * @public
 */
export type MetricDimensionName = (typeof MetricDimensionName)[keyof typeof MetricDimensionName];
/**
 * @public
 * @enum
 */
export declare const Metric: {
    readonly CLICK: "CLICK";
    readonly COMPLAINT: "COMPLAINT";
    readonly DELIVERY: "DELIVERY";
    readonly DELIVERY_CLICK: "DELIVERY_CLICK";
    readonly DELIVERY_COMPLAINT: "DELIVERY_COMPLAINT";
    readonly DELIVERY_OPEN: "DELIVERY_OPEN";
    readonly OPEN: "OPEN";
    readonly PERMANENT_BOUNCE: "PERMANENT_BOUNCE";
    readonly SEND: "SEND";
    readonly TRANSIENT_BOUNCE: "TRANSIENT_BOUNCE";
};
/**
 * @public
 */
export type Metric = (typeof Metric)[keyof typeof Metric];
/**
 * @public
 * @enum
 */
export declare const MetricNamespace: {
    readonly VDM: "VDM";
};
/**
 * @public
 */
export type MetricNamespace = (typeof MetricNamespace)[keyof typeof MetricNamespace];
/**
 * @public
 * @enum
 */
export declare const QueryErrorCode: {
    readonly ACCESS_DENIED: "ACCESS_DENIED";
    readonly INTERNAL_FAILURE: "INTERNAL_FAILURE";
};
/**
 * @public
 */
export type QueryErrorCode = (typeof QueryErrorCode)[keyof typeof QueryErrorCode];
/**
 * @public
 * @enum
 */
export declare const BehaviorOnMxFailure: {
    readonly REJECT_MESSAGE: "REJECT_MESSAGE";
    readonly USE_DEFAULT_VALUE: "USE_DEFAULT_VALUE";
};
/**
 * @public
 */
export type BehaviorOnMxFailure = (typeof BehaviorOnMxFailure)[keyof typeof BehaviorOnMxFailure];
/**
 * @public
 * @enum
 */
export declare const BounceType: {
    readonly PERMANENT: "PERMANENT";
    readonly TRANSIENT: "TRANSIENT";
    readonly UNDETERMINED: "UNDETERMINED";
};
/**
 * @public
 */
export type BounceType = (typeof BounceType)[keyof typeof BounceType];
/**
 * @public
 * @enum
 */
export declare const BulkEmailStatus: {
    readonly ACCOUNT_DAILY_QUOTA_EXCEEDED: "ACCOUNT_DAILY_QUOTA_EXCEEDED";
    readonly ACCOUNT_SENDING_PAUSED: "ACCOUNT_SENDING_PAUSED";
    readonly ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED";
    readonly ACCOUNT_THROTTLED: "ACCOUNT_THROTTLED";
    readonly CONFIGURATION_SET_NOT_FOUND: "CONFIGURATION_SET_NOT_FOUND";
    readonly CONFIGURATION_SET_SENDING_PAUSED: "CONFIGURATION_SET_SENDING_PAUSED";
    readonly FAILED: "FAILED";
    readonly INVALID_PARAMETER: "INVALID_PARAMETER";
    readonly INVALID_SENDING_POOL_NAME: "INVALID_SENDING_POOL_NAME";
    readonly MAIL_FROM_DOMAIN_NOT_VERIFIED: "MAIL_FROM_DOMAIN_NOT_VERIFIED";
    readonly MESSAGE_REJECTED: "MESSAGE_REJECTED";
    readonly SUCCESS: "SUCCESS";
    readonly TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND";
    readonly TRANSIENT_FAILURE: "TRANSIENT_FAILURE";
};
/**
 * @public
 */
export type BulkEmailStatus = (typeof BulkEmailStatus)[keyof typeof BulkEmailStatus];
/**
 * @public
 * @enum
 */
export declare const DimensionValueSource: {
    readonly EMAIL_HEADER: "EMAIL_HEADER";
    readonly LINK_TAG: "LINK_TAG";
    readonly MESSAGE_TAG: "MESSAGE_TAG";
};
/**
 * @public
 */
export type DimensionValueSource = (typeof DimensionValueSource)[keyof typeof DimensionValueSource];
/**
 * @public
 * @enum
 */
export declare const SubscriptionStatus: {
    readonly OPT_IN: "OPT_IN";
    readonly OPT_OUT: "OPT_OUT";
};
/**
 * @public
 */
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
/**
 * @public
 * @enum
 */
export declare const ContactListImportAction: {
    readonly DELETE: "DELETE";
    readonly PUT: "PUT";
};
/**
 * @public
 */
export type ContactListImportAction = (typeof ContactListImportAction)[keyof typeof ContactListImportAction];
/**
 * @public
 * @enum
 */
export declare const TlsPolicy: {
    readonly OPTIONAL: "OPTIONAL";
    readonly REQUIRE: "REQUIRE";
};
/**
 * @public
 */
export type TlsPolicy = (typeof TlsPolicy)[keyof typeof TlsPolicy];
/**
 * @public
 * @enum
 */
export declare const SuppressionListReason: {
    readonly BOUNCE: "BOUNCE";
    readonly COMPLAINT: "COMPLAINT";
};
/**
 * @public
 */
export type SuppressionListReason = (typeof SuppressionListReason)[keyof typeof SuppressionListReason];
/**
 * @public
 * @enum
 */
export declare const FeatureStatus: {
    readonly DISABLED: "DISABLED";
    readonly ENABLED: "ENABLED";
};
/**
 * @public
 */
export type FeatureStatus = (typeof FeatureStatus)[keyof typeof FeatureStatus];
/**
 * @public
 * @enum
 */
export declare const SuppressionConfidenceVerdictThreshold: {
    readonly HIGH: "HIGH";
    readonly MANAGED: "MANAGED";
    readonly MEDIUM: "MEDIUM";
};
/**
 * @public
 */
export type SuppressionConfidenceVerdictThreshold = (typeof SuppressionConfidenceVerdictThreshold)[keyof typeof SuppressionConfidenceVerdictThreshold];
/**
 * @public
 * @enum
 */
export declare const HttpsPolicy: {
    readonly OPTIONAL: "OPTIONAL";
    readonly REQUIRE: "REQUIRE";
    readonly REQUIRE_OPEN_ONLY: "REQUIRE_OPEN_ONLY";
};
/**
 * @public
 */
export type HttpsPolicy = (typeof HttpsPolicy)[keyof typeof HttpsPolicy];
/**
 * @public
 * @enum
 */
export declare const EventType: {
    readonly BOUNCE: "BOUNCE";
    readonly CLICK: "CLICK";
    readonly COMPLAINT: "COMPLAINT";
    readonly DELIVERY: "DELIVERY";
    readonly DELIVERY_DELAY: "DELIVERY_DELAY";
    readonly OPEN: "OPEN";
    readonly REJECT: "REJECT";
    readonly RENDERING_FAILURE: "RENDERING_FAILURE";
    readonly SEND: "SEND";
    readonly SUBSCRIPTION: "SUBSCRIPTION";
};
/**
 * @public
 */
export type EventType = (typeof EventType)[keyof typeof EventType];
/**
 * @public
 * @enum
 */
export declare const ScalingMode: {
    readonly MANAGED: "MANAGED";
    readonly STANDARD: "STANDARD";
};
/**
 * @public
 */
export type ScalingMode = (typeof ScalingMode)[keyof typeof ScalingMode];
/**
 * @public
 * @enum
 */
export declare const DeliverabilityTestStatus: {
    readonly COMPLETED: "COMPLETED";
    readonly IN_PROGRESS: "IN_PROGRESS";
};
/**
 * @public
 */
export type DeliverabilityTestStatus = (typeof DeliverabilityTestStatus)[keyof typeof DeliverabilityTestStatus];
/**
 * @public
 * @enum
 */
export declare const DkimSigningAttributesOrigin: {
    readonly AWS_SES: "AWS_SES";
    readonly AWS_SES_AF_SOUTH_1: "AWS_SES_AF_SOUTH_1";
    readonly AWS_SES_AP_NORTHEAST_1: "AWS_SES_AP_NORTHEAST_1";
    readonly AWS_SES_AP_NORTHEAST_2: "AWS_SES_AP_NORTHEAST_2";
    readonly AWS_SES_AP_NORTHEAST_3: "AWS_SES_AP_NORTHEAST_3";
    readonly AWS_SES_AP_SOUTHEAST_1: "AWS_SES_AP_SOUTHEAST_1";
    readonly AWS_SES_AP_SOUTHEAST_2: "AWS_SES_AP_SOUTHEAST_2";
    readonly AWS_SES_AP_SOUTHEAST_3: "AWS_SES_AP_SOUTHEAST_3";
    readonly AWS_SES_AP_SOUTHEAST_5: "AWS_SES_AP_SOUTHEAST_5";
    readonly AWS_SES_AP_SOUTH_1: "AWS_SES_AP_SOUTH_1";
    readonly AWS_SES_AP_SOUTH_2: "AWS_SES_AP_SOUTH_2";
    readonly AWS_SES_CA_CENTRAL_1: "AWS_SES_CA_CENTRAL_1";
    readonly AWS_SES_CA_WEST_1: "AWS_SES_CA_WEST_1";
    readonly AWS_SES_EU_CENTRAL_1: "AWS_SES_EU_CENTRAL_1";
    readonly AWS_SES_EU_CENTRAL_2: "AWS_SES_EU_CENTRAL_2";
    readonly AWS_SES_EU_NORTH_1: "AWS_SES_EU_NORTH_1";
    readonly AWS_SES_EU_SOUTH_1: "AWS_SES_EU_SOUTH_1";
    readonly AWS_SES_EU_WEST_1: "AWS_SES_EU_WEST_1";
    readonly AWS_SES_EU_WEST_2: "AWS_SES_EU_WEST_2";
    readonly AWS_SES_EU_WEST_3: "AWS_SES_EU_WEST_3";
    readonly AWS_SES_IL_CENTRAL_1: "AWS_SES_IL_CENTRAL_1";
    readonly AWS_SES_ME_CENTRAL_1: "AWS_SES_ME_CENTRAL_1";
    readonly AWS_SES_ME_SOUTH_1: "AWS_SES_ME_SOUTH_1";
    readonly AWS_SES_SA_EAST_1: "AWS_SES_SA_EAST_1";
    readonly AWS_SES_US_EAST_1: "AWS_SES_US_EAST_1";
    readonly AWS_SES_US_EAST_2: "AWS_SES_US_EAST_2";
    readonly AWS_SES_US_WEST_1: "AWS_SES_US_WEST_1";
    readonly AWS_SES_US_WEST_2: "AWS_SES_US_WEST_2";
    readonly EXTERNAL: "EXTERNAL";
};
/**
 * @public
 */
export type DkimSigningAttributesOrigin = (typeof DkimSigningAttributesOrigin)[keyof typeof DkimSigningAttributesOrigin];
/**
 * @public
 * @enum
 */
export declare const DkimSigningKeyLength: {
    readonly RSA_1024_BIT: "RSA_1024_BIT";
    readonly RSA_2048_BIT: "RSA_2048_BIT";
};
/**
 * @public
 */
export type DkimSigningKeyLength = (typeof DkimSigningKeyLength)[keyof typeof DkimSigningKeyLength];
/**
 * @public
 * @enum
 */
export declare const DkimStatus: {
    readonly FAILED: "FAILED";
    readonly NOT_STARTED: "NOT_STARTED";
    readonly PENDING: "PENDING";
    readonly SUCCESS: "SUCCESS";
    readonly TEMPORARY_FAILURE: "TEMPORARY_FAILURE";
};
/**
 * @public
 */
export type DkimStatus = (typeof DkimStatus)[keyof typeof DkimStatus];
/**
 * @public
 * @enum
 */
export declare const IdentityType: {
    readonly DOMAIN: "DOMAIN";
    readonly EMAIL_ADDRESS: "EMAIL_ADDRESS";
    readonly MANAGED_DOMAIN: "MANAGED_DOMAIN";
};
/**
 * @public
 */
export type IdentityType = (typeof IdentityType)[keyof typeof IdentityType];
/**
 * @public
 * @enum
 */
export declare const DeliveryEventType: {
    readonly COMPLAINT: "COMPLAINT";
    readonly DELIVERY: "DELIVERY";
    readonly PERMANENT_BOUNCE: "PERMANENT_BOUNCE";
    readonly SEND: "SEND";
    readonly TRANSIENT_BOUNCE: "TRANSIENT_BOUNCE";
    readonly UNDETERMINED_BOUNCE: "UNDETERMINED_BOUNCE";
};
/**
 * @public
 */
export type DeliveryEventType = (typeof DeliveryEventType)[keyof typeof DeliveryEventType];
/**
 * @public
 * @enum
 */
export declare const EngagementEventType: {
    readonly CLICK: "CLICK";
    readonly OPEN: "OPEN";
};
/**
 * @public
 */
export type EngagementEventType = (typeof EngagementEventType)[keyof typeof EngagementEventType];
/**
 * @public
 * @enum
 */
export declare const MetricAggregation: {
    readonly RATE: "RATE";
    readonly VOLUME: "VOLUME";
};
/**
 * @public
 */
export type MetricAggregation = (typeof MetricAggregation)[keyof typeof MetricAggregation];
/**
 * @public
 * @enum
 */
export declare const DataFormat: {
    readonly CSV: "CSV";
    readonly JSON: "JSON";
};
/**
 * @public
 */
export type DataFormat = (typeof DataFormat)[keyof typeof DataFormat];
/**
 * @public
 * @enum
 */
export declare const SuppressionListImportAction: {
    readonly DELETE: "DELETE";
    readonly PUT: "PUT";
};
/**
 * @public
 */
export type SuppressionListImportAction = (typeof SuppressionListImportAction)[keyof typeof SuppressionListImportAction];
/**
 * @public
 * @enum
 */
export declare const Status: {
    readonly CREATING: "CREATING";
    readonly DELETING: "DELETING";
    readonly FAILED: "FAILED";
    readonly READY: "READY";
};
/**
 * @public
 */
export type Status = (typeof Status)[keyof typeof Status];
/**
 * @public
 * @enum
 */
export declare const SendingStatus: {
    readonly DISABLED: "DISABLED";
    readonly ENABLED: "ENABLED";
    readonly REINSTATED: "REINSTATED";
};
/**
 * @public
 */
export type SendingStatus = (typeof SendingStatus)[keyof typeof SendingStatus];
/**
 * @public
 * @enum
 */
export declare const WarmupStatus: {
    readonly DONE: "DONE";
    readonly IN_PROGRESS: "IN_PROGRESS";
    readonly NOT_APPLICABLE: "NOT_APPLICABLE";
};
/**
 * @public
 */
export type WarmupStatus = (typeof WarmupStatus)[keyof typeof WarmupStatus];
/**
 * @public
 * @enum
 */
export declare const DeliverabilityDashboardAccountStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly DISABLED: "DISABLED";
    readonly PENDING_EXPIRATION: "PENDING_EXPIRATION";
};
/**
 * @public
 */
export type DeliverabilityDashboardAccountStatus = (typeof DeliverabilityDashboardAccountStatus)[keyof typeof DeliverabilityDashboardAccountStatus];
/**
 * @public
 * @enum
 */
export declare const EmailAddressInsightsConfidenceVerdict: {
    readonly HIGH: "HIGH";
    readonly LOW: "LOW";
    readonly MEDIUM: "MEDIUM";
};
/**
 * @public
 */
export type EmailAddressInsightsConfidenceVerdict = (typeof EmailAddressInsightsConfidenceVerdict)[keyof typeof EmailAddressInsightsConfidenceVerdict];
/**
 * @public
 * @enum
 */
export declare const ExportSourceType: {
    readonly MESSAGE_INSIGHTS: "MESSAGE_INSIGHTS";
    readonly METRICS_DATA: "METRICS_DATA";
};
/**
 * @public
 */
export type ExportSourceType = (typeof ExportSourceType)[keyof typeof ExportSourceType];
/**
 * @public
 * @enum
 */
export declare const JobStatus: {
    readonly CANCELLED: "CANCELLED";
    readonly COMPLETED: "COMPLETED";
    readonly CREATED: "CREATED";
    readonly FAILED: "FAILED";
    readonly PROCESSING: "PROCESSING";
};
/**
 * @public
 */
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
/**
 * @public
 * @enum
 */
export declare const MailFromDomainStatus: {
    readonly FAILED: "FAILED";
    readonly PENDING: "PENDING";
    readonly SUCCESS: "SUCCESS";
    readonly TEMPORARY_FAILURE: "TEMPORARY_FAILURE";
};
/**
 * @public
 */
export type MailFromDomainStatus = (typeof MailFromDomainStatus)[keyof typeof MailFromDomainStatus];
/**
 * @public
 * @enum
 */
export declare const VerificationError: {
    readonly DNS_SERVER_ERROR: "DNS_SERVER_ERROR";
    readonly HOST_NOT_FOUND: "HOST_NOT_FOUND";
    readonly INVALID_VALUE: "INVALID_VALUE";
    readonly REPLICATION_ACCESS_DENIED: "REPLICATION_ACCESS_DENIED";
    readonly REPLICATION_PRIMARY_BYO_DKIM_NOT_SUPPORTED: "REPLICATION_PRIMARY_BYO_DKIM_NOT_SUPPORTED";
    readonly REPLICATION_PRIMARY_INVALID_REGION: "REPLICATION_PRIMARY_INVALID_REGION";
    readonly REPLICATION_PRIMARY_NOT_FOUND: "REPLICATION_PRIMARY_NOT_FOUND";
    readonly REPLICATION_REPLICA_AS_PRIMARY_NOT_SUPPORTED: "REPLICATION_REPLICA_AS_PRIMARY_NOT_SUPPORTED";
    readonly SERVICE_ERROR: "SERVICE_ERROR";
    readonly TYPE_NOT_FOUND: "TYPE_NOT_FOUND";
};
/**
 * @public
 */
export type VerificationError = (typeof VerificationError)[keyof typeof VerificationError];
/**
 * @public
 * @enum
 */
export declare const VerificationStatus: {
    readonly FAILED: "FAILED";
    readonly NOT_STARTED: "NOT_STARTED";
    readonly PENDING: "PENDING";
    readonly SUCCESS: "SUCCESS";
    readonly TEMPORARY_FAILURE: "TEMPORARY_FAILURE";
};
/**
 * @public
 */
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];
/**
 * @public
 * @enum
 */
export declare const ReputationEntityType: {
    readonly RESOURCE: "RESOURCE";
};
/**
 * @public
 */
export type ReputationEntityType = (typeof ReputationEntityType)[keyof typeof ReputationEntityType];
/**
 * @public
 * @enum
 */
export declare const RecommendationImpact: {
    readonly HIGH: "HIGH";
    readonly LOW: "LOW";
};
/**
 * @public
 */
export type RecommendationImpact = (typeof RecommendationImpact)[keyof typeof RecommendationImpact];
/**
 * @public
 * @enum
 */
export declare const ImportDestinationType: {
    readonly CONTACT_LIST: "CONTACT_LIST";
    readonly SUPPRESSION_LIST: "SUPPRESSION_LIST";
};
/**
 * @public
 */
export type ImportDestinationType = (typeof ImportDestinationType)[keyof typeof ImportDestinationType];
/**
 * @public
 * @enum
 */
export declare const ListRecommendationsFilterKey: {
    readonly IMPACT: "IMPACT";
    readonly RESOURCE_ARN: "RESOURCE_ARN";
    readonly STATUS: "STATUS";
    readonly TYPE: "TYPE";
};
/**
 * @public
 */
export type ListRecommendationsFilterKey = (typeof ListRecommendationsFilterKey)[keyof typeof ListRecommendationsFilterKey];
/**
 * @public
 * @enum
 */
export declare const RecommendationStatus: {
    readonly FIXED: "FIXED";
    readonly OPEN: "OPEN";
};
/**
 * @public
 */
export type RecommendationStatus = (typeof RecommendationStatus)[keyof typeof RecommendationStatus];
/**
 * @public
 * @enum
 */
export declare const RecommendationType: {
    readonly BIMI: "BIMI";
    readonly BOUNCE: "BOUNCE";
    readonly COMPLAINT: "COMPLAINT";
    readonly DKIM: "DKIM";
    readonly DMARC: "DMARC";
    readonly FEEDBACK_3P: "FEEDBACK_3P";
    readonly IP_LISTING: "IP_LISTING";
    readonly SPF: "SPF";
};
/**
 * @public
 */
export type RecommendationType = (typeof RecommendationType)[keyof typeof RecommendationType];
/**
 * @public
 * @enum
 */
export declare const ReputationEntityFilterKey: {
    readonly ENTITY_REFERENCE_PREFIX: "ENTITY_REFERENCE_PREFIX";
    readonly ENTITY_TYPE: "ENTITY_TYPE";
    readonly REPUTATION_IMPACT: "REPUTATION_IMPACT";
    readonly STATUS: "SENDING_STATUS";
};
/**
 * @public
 */
export type ReputationEntityFilterKey = (typeof ReputationEntityFilterKey)[keyof typeof ReputationEntityFilterKey];
/**
 * @public
 * @enum
 */
export declare const ListTenantResourcesFilterKey: {
    readonly RESOURCE_TYPE: "RESOURCE_TYPE";
};
/**
 * @public
 */
export type ListTenantResourcesFilterKey = (typeof ListTenantResourcesFilterKey)[keyof typeof ListTenantResourcesFilterKey];
/**
 * @public
 * @enum
 */
export declare const ResourceType: {
    readonly CONFIGURATION_SET: "CONFIGURATION_SET";
    readonly EMAIL_IDENTITY: "EMAIL_IDENTITY";
    readonly EMAIL_TEMPLATE: "EMAIL_TEMPLATE";
};
/**
 * @public
 */
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];
