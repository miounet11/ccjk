/**
 * Supplier Ecosystem Types
 * Core types for the supplier-friendly system
 */

import type { ProviderSetup } from '../api-providers/core/provider-interface'

/**
 * Supplier Information
 */
export interface SupplierInfo {
  id: string
  name: string
  displayName: string
  logo: string
  website: string
  description: string
  tagline: string
  benefits: string[]
  rating: number
  setupTime: string
  popularity: number
  featured: boolean
  partnerSince?: Date
  referralCode?: string
}

/**
 * One-Click Setup Configuration
 */
export interface OneClickSetupConfig {
  provider: string
  apiKey?: string
  model?: string
  referralSource?: string
  referralCode?: string
  customFields?: Record<string, string>
  autoComplete?: boolean
  skipValidation?: boolean
}

/**
 * Deep Link Configuration
 */
export interface DeepLinkConfig {
  protocol: 'ccjk' | 'https'
  action: 'setup' | 'switch' | 'configure'
  params: OneClickSetupConfig
  returnUrl?: string
  successCallback?: string
  errorCallback?: string
}

/**
 * Supplier Analytics Data
 */
export interface SupplierAnalytics {
  supplierId: string
  period: {
    start: Date
    end: Date
  }
  metrics: {
    totalUsers: number
    newUsers: number
    activeUsers: number
    setupsCompleted: number
    setupsAbandoned: number
    averageSetupTime: number
    successRate: number
    satisfactionScore: number
  }
  referrals: {
    totalReferrals: number
    conversionRate: number
    topSources: Array<{
      source: string
      count: number
      conversionRate: number
    }>
  }
  usage: {
    totalTokens: number
    totalRequests: number
    averageTokensPerRequest: number
    topModels: Array<{
      model: string
      usage: number
      percentage: number
    }>
  }
  revenue: {
    estimatedRevenue: number
    revenueGrowth: number
    averageRevenuePerUser: number
  }
}

/**
 * Supplier Dashboard Data
 */
export interface SupplierDashboard {
  supplier: SupplierInfo
  analytics: SupplierAnalytics
  recentActivity: SupplierActivity[]
  insights: SupplierInsight[]
  recommendations: string[]
}

/**
 * Supplier Activity
 */
export interface SupplierActivity {
  timestamp: Date
  type: 'setup' | 'switch' | 'usage' | 'referral'
  userId: string
  details: string
  success: boolean
}

/**
 * Supplier Insight
 */
export interface SupplierInsight {
  type: 'success' | 'warning' | 'info'
  title: string
  description: string
  actionable: boolean
  action?: string
}

/**
 * Referral Tracking
 */
export interface ReferralTracking {
  referralId: string
  supplierId: string
  source: string
  timestamp: Date
  userId?: string
  converted: boolean
  conversionTimestamp?: Date
  metadata?: Record<string, any>
}

/**
 * Co-Branding Configuration
 */
export interface CoBrandingConfig {
  supplierId: string
  enabled: boolean
  logo: string
  primaryColor: string
  secondaryColor: string
  customMessage?: string
  showBadge: boolean
  badgePosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

/**
 * Setup Wizard Theme
 */
export interface WizardTheme {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  borderRadius: string
  fontFamily: string
  animations: boolean
}

/**
 * Visual Setup Step
 */
export interface VisualSetupStep {
  id: string
  title: string
  description: string
  icon: string
  completed: boolean
  active: boolean
  error?: string
  warning?: string
}

/**
 * Provider Comparison Data
 */
export interface ProviderComparison {
  providers: Array<{
    id: string
    name: string
    logo: string
    rating: number
    setupTime: string
    pricing: {
      tier: 'free' | 'paid' | 'enterprise'
      startingPrice?: string
    }
    features: {
      models: string[]
      speed: number // 1-5
      reliability: number // 1-5
      support: number // 1-5
    }
    pros: string[]
    cons: string[]
    bestFor: string[]
  }>
  recommendations: {
    fastest: string
    cheapest: string
    mostReliable: string
    bestOverall: string
  }
}

/**
 * Setup Success Response
 */
export interface SetupSuccessResponse {
  success: boolean
  setup: ProviderSetup
  message: string
  nextSteps: string[]
  quickStartTemplates?: Array<{
    name: string
    description: string
    code: string
  }>
  celebrationAnimation?: string
}

/**
 * Partnership Program Tier
 */
export interface PartnershipTier {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  benefits: string[]
  requirements: {
    minUsers: number
    minSatisfaction: number
    minUptime: number
  }
  rewards: {
    featuredPlacement: boolean
    prioritySupport: boolean
    revenueShare: number
    coMarketing: boolean
    exclusiveFeatures: string[]
  }
}

/**
 * Marketing Material
 */
export interface MarketingMaterial {
  type: 'badge' | 'banner' | 'social' | 'email' | 'guide'
  title: string
  description: string
  formats: Array<{
    format: string
    url: string
    size?: string
  }>
  usage: string
  downloadUrl: string
}
