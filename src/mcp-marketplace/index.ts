/**
 * MCP Marketplace Module
 *
 * Provides a client for interacting with the MCP package marketplace.
 * Supports package discovery, search, version management, and updates.
 *
 * @module mcp-marketplace
 */

// Export client class and functions
export {
  createMarketplaceClient,
  createMockMarketplaceClient,
  getDefaultMarketplaceClient,
  MarketplaceClient,
  MOCK_CATEGORIES,
  MOCK_MCP_PACKAGES,
  resetDefaultMarketplaceClient,
} from './marketplace-client'

// Export all types
export type {
  CategoryInfo,
  CompatibilityInfo,
  Dependency,
  InstalledPackage,
  MarketplaceApiResponse,
  MarketplaceCache,
  MarketplaceCacheStats,
  MarketplaceClientOptions,
  MCPCategory,
  MCPPackage,
  Permission,
  SearchOptions,
  SearchResult,
  SortOption,
  UpdateInfo,
  VerificationStatus,
  VersionInfo,
} from './types'
