# CCJK Skills Marketplace Frontend Development Plan

**Version**: 1.0.0
**Created**: 2026-01-29
**Status**: Planning Phase

---

## Table of Contents

1. [Functional Overview](#1-functional-overview)
2. [Technology Stack Selection](#2-technology-stack-selection)
3. [Architecture Design](#3-architecture-design)
4. [Feature Module Breakdown](#4-feature-module-breakdown)
5. [API Integration Strategy](#5-api-integration-strategy)
6. [State Management Strategy](#6-state-management-strategy)
7. [UI/UX Design Guidelines](#7-uiux-design-guidelines)
8. [Implementation Plan](#8-implementation-plan)
9. [Acceptance Criteria](#9-acceptance-criteria)

---

## 1. Functional Overview

### 1.1 Project Goals

Develop a complete frontend client for the CCJK Skills Marketplace that seamlessly integrates with the backend cloud services, providing users with:

- **Skills Discovery**: Browse, search, and explore AI coding skills
- **Personalized Experience**: AI-powered recommendations based on user preferences
- **Skills Management**: Install, update, and manage personal skill collections
- **Community Engagement**: Rate, review, and share skills with the community

### 1.2 Value Proposition

| Feature | User Value |
|---------|------------|
| One-click skill installation | Reduce setup time from hours to seconds |
| Smart recommendations | Discover relevant skills without manual searching |
| Unified management | Single interface for all skill operations |
| Community ratings | Make informed decisions based on peer reviews |

### 1.3 Target Users

1. **Developers** - Primary users who need AI coding assistance
2. **Skill Authors** - Contributors who create and publish skills
3. **Teams** - Organizations managing shared skill configurations

### 1.4 API Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/skills/marketplace` | GET | No | Browse skills marketplace |
| `/skills/search` | GET | No | Full-text search |
| `/skills/search/suggestions` | GET | No | Auto-complete suggestions |
| `/skills/search/trending` | GET | No | Trending keywords |
| `/skills/recommendations` | GET | Yes | Personalized recommendations |
| `/users/{userId}/skills` | GET | Yes | User's installed skills |
| `/users/{userId}/skills` | POST | Yes | Install a skill |
| `/users/{userId}/skills/{skillId}` | DELETE | Yes | Uninstall a skill |
| `/users/{userId}/skills/{skillId}` | PATCH | Yes | Update skill config |
| `/skills/{skillId}/ratings` | GET | No | View ratings |
| `/skills/{skillId}/ratings` | POST | Yes | Submit rating |

---

## 2. Technology Stack Selection

### 2.1 Recommended Stack

Given the project context (Electron + React ecosystem), the recommended stack is:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Technology Stack                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Framework:        React 18+ with TypeScript                     │
│  Build Tool:       Vite (fast HMR, ESM-native)                   │
│  State Management: Zustand + React Query (TanStack Query)        │
│  UI Components:    Radix UI + Tailwind CSS                       │
│  HTTP Client:      ky (modern fetch wrapper)                     │
│  Form Handling:    React Hook Form + Zod                         │
│  Routing:          React Router v6 (if multi-page)               │
│  Testing:          Vitest + React Testing Library                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Justification

| Choice | Rationale |
|--------|----------|
| **React 18+** | Concurrent features, Suspense for data fetching, existing project ecosystem |
| **TypeScript** | Type safety, better IDE support, API contract enforcement |
| **Zustand** | Lightweight, no boilerplate, perfect for Electron apps |
| **React Query** | Server state management, caching, background refetching |
| **Radix UI** | Accessible, unstyled primitives, full customization |
| **Tailwind CSS** | Rapid UI development, consistent design system |
| **ky** | Modern fetch wrapper, better error handling than axios |
| **Zod** | Runtime type validation, API response validation |

### 2.3 Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "ky": "^1.2.0",
    "zod": "^3.22.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-toast": "^1.1.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-popover": "^1.0.0",
    "tailwindcss": "^3.4.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.300.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "msw": "^2.0.0"
  }
}
```

---

## 3. Architecture Design

### 3.1 Overall Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Presentation Layer                    │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │  Pages  │  │Components│  │  Hooks  │  │ Layouts │    │    │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │    │
│  └───────┼────────────┼────────────┼────────────┼──────────┘    │
│          │            │            │            │                │
│  ┌───────┴────────────┴────────────┴────────────┴──────────┐    │
│  │                     State Layer                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │   Zustand    │  │ React Query  │  │   Context    │   │    │
│  │  │ (UI State)   │  │(Server State)│  │  (Theme/i18n)│   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  └──────────────────────────┬───────────────────────────────┘    │
│                             │                                    │
│  ┌──────────────────────────┴───────────────────────────────┐    │
│  │                     Service Layer                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │  API Client  │  │  Auth Service│  │ Storage Svc  │   │    │
│  │  │    (ky)      │  │   (Token)    │  │  (Electron)  │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  └──────────────────────────┬───────────────────────────────┘    │
│                             │                                    │
│  ┌──────────────────────────┴───────────────────────────────┐    │
│  │                     External Layer                        │    │
│  │  ┌──────────────────────────────────────────────────┐    │    │
│  │  │           Backend API (api.claudehome.cn)         │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Directory Structure

```
src/
├── api/                          # API layer
│   ├── client.ts                 # Base API client (ky instance)
│   ├── skills.ts                 # Skills API endpoints
│   ├── users.ts                  # User skills API endpoints
│   ├── ratings.ts                # Ratings API endpoints
│   └── types.ts                  # API types (request/response)
│
├── components/                   # Reusable components
│   ├── ui/                       # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Dialog.tsx
│   │   ├── Toast.tsx
│   │   └── index.ts
│   │
│   ├── skills/                   # Skills-specific components
│   │   ├── SkillCard.tsx
│   │   ├── SkillList.tsx
│   │   ├── SkillDetail.tsx
│   │   ├── SkillSearch.tsx
│   │   ├── SkillFilters.tsx
│   │   ├── SkillCategories.tsx
│   │   └── index.ts
│   │
│   ├── ratings/                  # Rating components
│   │   ├── RatingStars.tsx
│   │   ├── RatingForm.tsx
│   │   ├── RatingList.tsx
│   │   ├── RatingSummary.tsx
│   │   └── index.ts
│   │
│   ├── user/                     # User-related components
│   │   ├── UserSkillList.tsx
│   │   ├── QuotaDisplay.tsx
│   │   ├── SkillConfig.tsx
│   │   └── index.ts
│   │
│   └── layout/                   # Layout components
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       ├── Footer.tsx
│       └── index.ts
│
├── hooks/                        # Custom hooks
│   ├── useSkills.ts              # Skills data hooks
│   ├── useSearch.ts              # Search functionality
│   ├── useUserSkills.ts          # User skills management
│   ├── useRatings.ts             # Ratings hooks
│   ├── useRecommendations.ts     # Recommendations hook
│   ├── useDebounce.ts            # Utility hooks
│   └── index.ts
│
├── pages/                        # Page components
│   ├── Marketplace.tsx           # Main marketplace page
│   ├── SkillDetail.tsx           # Skill detail page
│   ├── MySkills.tsx              # User's installed skills
│   ├── Search.tsx                # Search results page
│   └── index.ts
│
├── stores/                       # Zustand stores
│   ├── authStore.ts              # Authentication state
│   ├── uiStore.ts                # UI state (filters, view mode)
│   └── index.ts
│
├── utils/                        # Utility functions
│   ├── cn.ts                     # Class name utility
│   ├── format.ts                 # Formatting utilities
│   ├── validation.ts             # Zod schemas
│   └── index.ts
│
├── types/                        # TypeScript types
│   ├── skill.ts                  # Skill types
│   ├── user.ts                   # User types
│   ├── rating.ts                 # Rating types
│   └── index.ts
│
└── App.tsx                       # Root component
```

### 3.3 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Data Flow                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Action                                                     │
│      │                                                           │
│      ▼                                                           │
│  ┌─────────────┐                                                │
│  │  Component  │ ──────────────────────────────────┐            │
│  └─────────────┘                                   │            │
│      │                                             │            │
│      │ calls                                       │ dispatches │
│      ▼                                             ▼            │
│  ┌─────────────┐                           ┌─────────────┐      │
│  │ React Query │                           │   Zustand   │      │
│  │   Hook      │                           │   Store     │      │
│  └─────────────┘                           └─────────────┘      │
│      │                                             │            │
│      │ fetches                                     │ updates    │
│      ▼                                             ▼            │
│  ┌─────────────┐                           ┌─────────────┐      │
│  │ API Client  │                           │  UI State   │      │
│  │    (ky)     │                           │  (filters)  │      │
│  └─────────────┘                           └─────────────┘      │
│      │                                             │            │
│      │ HTTP                                        │            │
│      ▼                                             │            │
│  ┌─────────────┐                                   │            │
│  │  Backend    │                                   │            │
│  │    API      │                                   │            │
│  └─────────────┘                                   │            │
│      │                                             │            │
│      │ response                                    │            │
│      ▼                                             │            │
│  ┌─────────────┐                                   │            │
│  │ React Query │ ◄─────────────────────────────────┘            │
│  │   Cache     │                                                │
│  └─────────────┘                                                │
│      │                                                          │
│      │ re-renders                                               │
│      ▼                                                          │
│  ┌─────────────┐                                                │
│  │  Component  │                                                │
│  │  (updated)  │                                                │
│  └─────────────┘                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Feature Module Breakdown

### 4.1 Module Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Feature Modules                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Marketplace   │  │     Search      │  │  Recommendations │  │
│  │     Module      │  │     Module      │  │     Module       │  │
│  │                 │  │                 │  │                  │  │
│  │ • Browse skills │  │ • Full-text     │  │ • Personalized   │  │
│  │ • Filter/Sort   │  │ • Suggestions   │  │ • Based on usage │  │
│  │ • Categories    │  │ • Trending      │  │ • Exclude owned  │  │
│  │ • Pagination    │  │ • Debounce      │  │                  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  User Skills    │  │    Ratings      │  │   Skill Detail  │  │
│  │    Module       │  │    Module       │  │     Module      │  │
│  │                 │  │                 │  │                 │  │
│  │ • My skills     │  │ • View ratings  │  │ • Full info     │  │
│  │ • Install       │  │ • Submit rating │  │ • Install btn   │  │
│  │ • Uninstall     │  │ • Distribution  │  │ • Ratings       │  │
│  │ • Configure     │  │ • Helpful votes │  │ • Related       │  │
│  │ • Quota mgmt    │  │                 │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Detailed Task Breakdown

#### Module 1: Marketplace (Priority: High)

| Task ID | Task | Estimated Hours | Dependencies |
|---------|------|-----------------|-------------|
| M1.1 | Create SkillCard component | 4h | - |
| M1.2 | Create SkillList with grid/list view | 4h | M1.1 |
| M1.3 | Implement category filter sidebar | 3h | - |
| M1.4 | Implement sort dropdown | 2h | - |
| M1.5 | Implement pagination component | 3h | - |
| M1.6 | Create useSkills hook with React Query | 4h | - |
| M1.7 | Integrate filters with API | 3h | M1.3, M1.4, M1.6 |
| M1.8 | Add loading states and skeletons | 2h | M1.1, M1.2 |
| M1.9 | Add error handling and retry | 2h | M1.6 |
| **Total** | | **27h** | |

#### Module 2: Search (Priority: High)

| Task ID | Task | Estimated Hours | Dependencies |
|---------|------|-----------------|-------------|
| S2.1 | Create SearchInput component | 3h | - |
| S2.2 | Implement debounced search | 2h | S2.1 |
| S2.3 | Create suggestions dropdown | 4h | S2.1 |
| S2.4 | Implement trending keywords display | 2h | - |
| S2.5 | Create search results page | 4h | M1.1 |
| S2.6 | Create useSearch hook | 3h | - |
| S2.7 | Add search history (local storage) | 2h | - |
| S2.8 | Implement keyboard navigation | 3h | S2.3 |
| **Total** | | **23h** | |

#### Module 3: User Skills Management (Priority: High)

| Task ID | Task | Estimated Hours | Dependencies |
|---------|------|-----------------|-------------|
| U3.1 | Create UserSkillCard component | 3h | - |
| U3.2 | Create MySkills page | 4h | U3.1 |
| U3.3 | Implement install skill flow | 4h | - |
| U3.4 | Implement uninstall with confirmation | 3h | - |
| U3.5 | Create skill config dialog | 4h | - |
| U3.6 | Implement quota display component | 2h | - |
| U3.7 | Create useUserSkills hook | 4h | - |
| U3.8 | Add optimistic updates | 3h | U3.7 |
| U3.9 | Handle quota exceeded errors | 2h | U3.3 |
| **Total** | | **29h** | |

#### Module 4: Ratings (Priority: Medium)

| Task ID | Task | Estimated Hours | Dependencies |
|---------|------|-----------------|-------------|
| R4.1 | Create RatingStars component | 2h | - |
| R4.2 | Create RatingSummary component | 3h | R4.1 |
| R4.3 | Create RatingList component | 3h | - |
| R4.4 | Create RatingForm component | 4h | R4.1 |
| R4.5 | Create useRatings hook | 3h | - |
| R4.6 | Implement rating submission | 3h | R4.4, R4.5 |
| R4.7 | Add rating distribution chart | 3h | R4.2 |
| **Total** | | **21h** | |

#### Module 5: Recommendations (Priority: Medium)

| Task ID | Task | Estimated Hours | Dependencies |
|---------|------|-----------------|-------------|
| RC5.1 | Create RecommendationCard component | 3h | M1.1 |
| RC5.2 | Create Recommendations section | 3h | RC5.1 |
| RC5.3 | Create useRecommendations hook | 3h | - |
| RC5.4 | Add "Why recommended" tooltip | 2h | RC5.1 |
| RC5.5 | Implement refresh recommendations | 2h | RC5.3 |
| **Total** | | **13h** | |

#### Module 6: Skill Detail (Priority: High)

| Task ID | Task | Estimated Hours | Dependencies |
|---------|------|-----------------|-------------|
| D6.1 | Create SkillDetail page layout | 4h | - |
| D6.2 | Create skill info section | 3h | - |
| D6.3 | Create install/uninstall button | 3h | U3.3, U3.4 |
| D6.4 | Integrate ratings section | 2h | R4.2, R4.3 |
| D6.5 | Add related skills section | 3h | RC5.1 |
| D6.6 | Add GitHub stats display | 2h | - |
| D6.7 | Create skill tags display | 2h | - |
| **Total** | | **19h** | |

#### Module 7: Core Infrastructure (Priority: Critical)

| Task ID | Task | Estimated Hours | Dependencies |
|---------|------|-----------------|-------------|
| C7.1 | Setup API client with ky | 3h | - |
| C7.2 | Setup React Query provider | 2h | - |
| C7.3 | Setup Zustand stores | 3h | - |
| C7.4 | Create auth service | 4h | - |
| C7.5 | Setup error boundary | 2h | - |
| C7.6 | Create toast notification system | 3h | - |
| C7.7 | Setup Tailwind + design tokens | 3h | - |
| C7.8 | Create base UI components | 8h | C7.7 |
| **Total** | | **28h** | |

### 4.3 Total Effort Estimation

| Module | Hours | Priority |
|--------|-------|----------|
| Core Infrastructure | 28h | Critical |
| Marketplace | 27h | High |
| Search | 23h | High |
| User Skills | 29h | High |
| Skill Detail | 19h | High |
| Ratings | 21h | Medium |
| Recommendations | 13h | Medium |
| **Total** | **160h** | |

---

## 5. API Integration Strategy

### 5.1 API Client Setup

```typescript
// src/api/client.ts
import ky from 'ky';
import { useAuthStore } from '@/stores/authStore';

const API_BASE_URL = 'https://api.claudehome.cn/api/v1';

export const apiClient = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 30000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().token;
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (!response.ok) {
          const body = await response.json();
          throw new APIError(body.error, body.code, response.status);
        }
        return response;
      },
    ],
  },
});

export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}
```

### 5.2 API Endpoints Implementation

```typescript
// src/api/skills.ts
import { apiClient } from './client';
import type {
  MarketplaceParams,
  MarketplaceResponse,
  SearchParams,
  SearchResponse,
  SuggestionsResponse,
  TrendingResponse,
  RecommendationsParams,
  RecommendationsResponse,
} from './types';

export const skillsApi = {
  // Get marketplace skills
  getMarketplace: async (params: MarketplaceParams): Promise<MarketplaceResponse> => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    const response = await apiClient.get(`skills/marketplace?${searchParams}`);
    const data = await response.json();
    return data.data;
  },

  // Search skills
  search: async (params: SearchParams): Promise<SearchResponse> => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    const response = await apiClient.get(`skills/search?${searchParams}`);
    const data = await response.json();
    return data.data;
  },

  // Get search suggestions
  getSuggestions: async (q: string, limit = 10): Promise<SuggestionsResponse> => {
    const response = await apiClient.get(`skills/search/suggestions?q=${q}&limit=${limit}`);
    const data = await response.json();
    return data.data;
  },

  // Get trending searches
  getTrending: async (limit = 10): Promise<TrendingResponse> => {
    const response = await apiClient.get(`skills/search/trending?limit=${limit}`);
    const data = await response.json();
    return data.data;
  },

  // Get recommendations
  getRecommendations: async (params: RecommendationsParams): Promise<RecommendationsResponse> => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    const response = await apiClient.get(`skills/recommendations?${searchParams}`);
    const data = await response.json();
    return data.data;
  },
};
```

```typescript
// src/api/users.ts
import { apiClient } from './client';
import type {
  UserSkillsResponse,
  InstallSkillRequest,
  InstallSkillResponse,
  UninstallSkillResponse,
  UpdateSkillRequest,
  UpdateSkillResponse,
} from './types';

export const usersApi = {
  // Get user's installed skills
  getUserSkills: async (userId: string): Promise<UserSkillsResponse> => {
    const response = await apiClient.get(`users/${userId}/skills`);
    const data = await response.json();
    return data.data;
  },

  // Install a skill
  installSkill: async (
    userId: string,
    request: InstallSkillRequest
  ): Promise<InstallSkillResponse> => {
    const response = await apiClient.post(`users/${userId}/skills`, {
      json: request,
    });
    const data = await response.json();
    return data.data;
  },

  // Uninstall a skill
  uninstallSkill: async (
    userId: string,
    skillId: string
  ): Promise<UninstallSkillResponse> => {
    const response = await apiClient.delete(`users/${userId}/skills/${skillId}`);
    const data = await response.json();
    return data.data;
  },

  // Update skill configuration
  updateSkill: async (
    userId: string,
    skillId: string,
    request: UpdateSkillRequest
  ): Promise<UpdateSkillResponse> => {
    const response = await apiClient.patch(`users/${userId}/skills/${skillId}`, {
      json: request,
    });
    const data = await response.json();
    return data.data;
  },
};
```

```typescript
// src/api/ratings.ts
import { apiClient } from './client';
import type {
  RatingsParams,
  RatingsResponse,
  CreateRatingRequest,
  CreateRatingResponse,
} from './types';

export const ratingsApi = {
  // Get skill ratings
  getRatings: async (
    skillId: string,
    params: RatingsParams
  ): Promise<RatingsResponse> => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    const response = await apiClient.get(
      `skills/${skillId}/ratings?${searchParams}`
    );
    const data = await response.json();
    return data.data;
  },

  // Submit a rating
  createRating: async (
    skillId: string,
    request: CreateRatingRequest
  ): Promise<CreateRatingResponse> => {
    const response = await apiClient.post(`skills/${skillId}/ratings`, {
      json: request,
    });
    const data = await response.json();
    return data.data;
  },
};
```

### 5.3 Type Definitions

```typescript
// src/api/types.ts

// Skill types
export interface Skill {
  skillId: string;
  name: string;
  slug: string;
  nameZh: string | null;
  descriptionEn: string;
  descriptionZh: string | null;
  repo: string;
  repoUrl: string;
  stars: number;
  installCount: number;
  localInstallCount: number;
  category: string;
  tags: string[];
  provider: string;
  isOfficial: boolean;
  isVerified: boolean;
  isTrending: boolean;
  trendingRank: number | null;
  trigger: string;
  aliases: string[];
  installCommand: string;
  supportedAgents: string[];
  ratingAvg: number;
  ratingCount: number;
  searchCount: number;
  status: string;
  metadata: {
    language: string;
    license: string;
    topics: string[];
    forks: number;
    lastUpdated: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Marketplace
export interface MarketplaceParams {
  page?: number;
  limit?: number;
  category?: string;
  provider?: string;
  sort?: 'installs' | 'stars' | 'rating' | 'recent' | 'name';
  isOfficial?: boolean;
  isTrending?: boolean;
}

export interface MarketplaceResponse {
  skills: Skill[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
  };
  filters: {
    categories: Array<{ name: string; count: number }>;
    providers: Array<{ name: string; count: number }>;
  };
}

// Search
export interface SearchParams {
  q: string;
  category?: string;
  provider?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  results: Array<Skill & { relevanceScore: number }>;
  total: number;
  query: string;
}

export interface SuggestionsResponse {
  suggestions: Array<{
    text: string;
    type: 'keyword' | 'skill';
    count?: number;
    skillId?: string;
  }>;
}

export interface TrendingResponse {
  trending: Array<{
    keyword: string;
    searchCount: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  }>;
}

// Recommendations
export interface RecommendationsParams {
  userId: string;
  limit?: number;
  excludeInstalled?: boolean;
}

export interface RecommendationsResponse {
  recommendations: Array<
    Skill & {
      reason: string;
      score: number;
    }
  >;
  total: number;
  basedOn: string[];
}

// User Skills
export interface UserSkill {
  skillId: string;
  name: string;
  installedAt: string;
  lastUsedAt: string;
  usageCount: number;
  isEnabled: boolean;
  config: Record<string, any>;
}

export interface UserSkillsResponse {
  skills: UserSkill[];
  total: number;
  quota: {
    used: number;
    limit: number;
    tier: 'free' | 'pro' | 'enterprise';
  };
}

export interface InstallSkillRequest {
  skillId: string;
  userTier: 'free' | 'pro' | 'enterprise';
}

export interface InstallSkillResponse {
  skillId: string;
  installedAt: string;
  quota: {
    used: number;
    limit: number;
    remaining: number;
  };
}

export interface UninstallSkillResponse {
  skillId: string;
  uninstalledAt: string;
  quota: {
    used: number;
    limit: number;
  };
}

export interface UpdateSkillRequest {
  isEnabled?: boolean;
  config?: Record<string, any>;
}

export interface UpdateSkillResponse {
  skillId: string;
  isEnabled: boolean;
  config: Record<string, any>;
  updatedAt: string;
}

// Ratings
export interface Rating {
  id: number;
  userId: string;
  userName: string;
  rating: number;
  review: string | null;
  helpful: number;
  createdAt: string;
}

export interface RatingsParams {
  page?: number;
  limit?: number;
  sort?: 'recent' | 'helpful' | 'rating';
}

export interface RatingsResponse {
  ratings: Rating[];
  summary: {
    avgRating: number;
    totalCount: number;
    distribution: {
      '5': number;
      '4': number;
      '3': number;
      '2': number;
      '1': number;
    };
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateRatingRequest {
  userId: string;
  rating: number;
  review?: string;
}

export interface CreateRatingResponse {
  id: number;
  skillId: string;
  userId: string;
  rating: number;
  review: string | null;
  createdAt: string;
}
```

### 5.4 Error Handling Strategy

```typescript
// src/utils/errorHandling.ts
import { APIError } from '@/api/client';
import { toast } from '@/components/ui/Toast';

export function handleAPIError(error: unknown): void {
  if (error instanceof APIError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        toast.error('Please log in to continue');
        // Redirect to login
        break;

      case 'QUOTA_EXCEEDED':
        toast.error('Skill quota exceeded. Please upgrade your plan.');
        // Show upgrade modal
        break;

      case 'ALREADY_INSTALLED':
        toast.info('This skill is already installed');
        break;

      case 'NOT_INSTALLED':
        toast.error('Skill not found in your collection');
        break;

      case 'NOT_FOUND':
        toast.error('Resource not found');
        break;

      case 'VALIDATION_ERROR':
        toast.error(error.message || 'Invalid input');
        break;

      default:
        toast.error(error.message || 'An error occurred');
    }
  } else if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error('An unexpected error occurred');
  }
}
```

---

## 6. State Management Strategy

### 6.1 State Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      State Management                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Server State                          │   │
│  │                  (React Query)                           │   │
│  │                                                          │   │
│  │  • Skills data (marketplace, search, detail)            │   │
│  │  • User skills (installed, config)                      │   │
│  │  • Ratings (list, summary)                              │   │
│  │  • Recommendations                                       │   │
│  │                                                          │   │
│  │  Features:                                               │   │
│  │  - Automatic caching                                     │   │
│  │  - Background refetching                                 │   │
│  │  - Optimistic updates                                    │   │
│  │  - Retry logic                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Client State                         │   │
│  │                     (Zustand)                            │   │
│  │                                                          │   │
│  │  • Authentication (token, user info)                    │   │
│  │  • UI state (filters, view mode, sidebar)              │   │
│  │  • Theme preferences                                     │   │
│  │  • Search history                                        │   │
│  │                                                          │   │
│  │  Features:                                               │   │
│  │  - Minimal boilerplate                                   │   │
│  │  - TypeScript support                                    │   │
│  │  - DevTools integration                                  │   │
│  │  - Persistence (localStorage)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 React Query Setup

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { handleAPIError } from '@/utils/errorHandling';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      onError: handleAPIError,
    },
    mutations: {
      onError: handleAPIError,
    },
  },
});
```

### 6.3 Custom Hooks Examples

```typescript
// src/hooks/useSkills.ts
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { skillsApi } from '@/api/skills';
import type { MarketplaceParams } from '@/api/types';

export function useSkills(params: MarketplaceParams) {
  return useQuery({
    queryKey: ['skills', 'marketplace', params],
    queryFn: () => skillsApi.getMarketplace(params),
  });
}

export function useInfiniteSkills(params: Omit<MarketplaceParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: ['skills', 'marketplace', 'infinite', params],
    queryFn: ({ pageParam = 1 }) =>
      skillsApi.getMarketplace({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? lastPage.pagination.page + 1
        : undefined,
  });
}

export function useSkillSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ['skills', 'search', query],
    queryFn: () => skillsApi.search({ q: query }),
    enabled: enabled && query.length >= 2,
  });
}
```

```typescript
// src/hooks/useUserSkills.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users';
import { toast } from '@/components/ui/Toast';
import type { InstallSkillRequest, UpdateSkillRequest } from '@/api/types';

export function useUserSkills(userId: string) {
  return useQuery({
    queryKey: ['users', userId, 'skills'],
    queryFn: () => usersApi.getUserSkills(userId),
  });
}

export function useInstallSkill(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: InstallSkillRequest) =>
      usersApi.installSkill(userId, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['users', userId, 'skills']);
      toast.success('Skill installed successfully!');
    },
    // Optimistic update
    onMutate: async (request) => {
      await queryClient.cancelQueries(['users', userId, 'skills']);
      const previousSkills = queryClient.getQueryData(['users', userId, 'skills']);

      queryClient.setQueryData(['users', userId, 'skills'], (old: any) => ({
        ...old,
        skills: [
          ...old.skills,
          {
            skillId: request.skillId,
            installedAt: new Date().toISOString(),
            isEnabled: true,
          },
        ],
        quota: {
          ...old.quota,
          used: old.quota.used + 1,
        },
      }));

      return { previousSkills };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSkills) {
        queryClient.setQueryData(
          ['users', userId, 'skills'],
          context.previousSkills
        );
      }
    },
  });
}

export function useUninstallSkill(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillId: string) => usersApi.uninstallSkill(userId, skillId),
    onSuccess: () => {
      queryClient.invalidateQueries(['users', userId, 'skills']);
      toast.success('Skill uninstalled successfully');
    },
  });
}

export function useUpdateSkill(userId: string, skillId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateSkillRequest) =>
      usersApi.updateSkill(userId, skillId, request),
    onSuccess: () => {
      queryClient.invalidateQueries(['users', userId, 'skills']);
      toast.success('Skill updated successfully');
    },
  });
}
```

### 6.4 Zustand Stores

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: string | null;
  userTier: 'free' | 'pro' | 'enterprise';
  setAuth: (token: string, userId: string, userTier: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()("
  isEnabled: boolean;
  config: object;
}

export interface UserSkillsResponse {
  skills: UserSkill[];
  total: number;
  quota: {
    used: number;
    limit: number;
    tier: 'free' | 'pro' | 'enterprise';
  };
}

export interface InstallSkillRequest {
  skillId: string;
  userTier: 'free' | 'pro' | 'enterprise';
}

export interface InstallSkillResponse {
  skillId: string;
  installedAt: string;
  quota: {
    used: number;
    limit: number;
    remaining: number;
  };
}

export interface UninstallSkillResponse {
  skillId: string;
  uninstalledAt: string;
  quota: {
    used: number;
    limit: number;
  };
}

export interface UpdateSkillRequest {
  isEnabled?: boolean;
  config?: object;
}

export interface UpdateSkillResponse {
  skillId: string;
  isEnabled: boolean;
  config: object;
  updatedAt: string;
}

// Ratings
export interface Rating {
  id: number;
  userId: string;
  userName: string;
  rating: number;
  review: string | null;
  helpful: number;
  createdAt: string;
}

export interface RatingsParams {
  page?: number;
  limit?: number;
  sort?: 'recent' | 'helpful' | 'rating';
}

export interface RatingsResponse {
  ratings: Rating[];
  summary: {
    avgRating: number;
    totalCount: number;
    distribution: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateRatingRequest {
  userId: string;
  rating: number;
  review?: string;
}

export interface CreateRatingResponse {
  id: number;
  skillId: string;
  userId: string;
  rating: number;
  review: string | null;
  createdAt: string;
}
```

### 5.4 Error Handling Strategy

```typescript
// src/utils/errorHandler.ts
import { APIError } from '@/api/client';
import { toast } from '@/components/ui/Toast';

export const handleAPIError = (error: unknown) => {
  if (error instanceof APIError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        toast.error('Please log in to continue');
        // Redirect to login
        break;
      case 'QUOTA_EXCEEDED':
        toast.error('Skill quota exceeded. Please upgrade your plan.');
        break;
      case 'ALREADY_INSTALLED':
        toast.warning('This skill is already installed');
        break;
      case 'NOT_INSTALLED':
        toast.error('Skill not found in your collection');
        break;
      case 'NOT_FOUND':
        toast.error('Resource not found');
        break;
      case 'VALIDATION_ERROR':
        toast.error(error.message || 'Invalid input');
        break;
      default:
        toast.error(error.message || 'An error occurred');
    }
  } else if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error('An unexpected error occurred');
  }
};
```

---

## 6. State Management Strategy

### 6.1 State Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      State Management                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Server State                          │   │
│  │              (React Query / TanStack Query)              │   │
│  │                                                          │   │
│  │  • Skills data (marketplace, search, detail)            │   │
│  │  • User skills (installed, quota)                       │   │
│  │  • Ratings (list, summary)                              │   │
│  │  • Recommendations                                       │   │
│  │                                                          │   │
│  │  Features:                                               │   │
│  │  - Automatic caching                                     │   │
│  │  - Background refetching                                 │   │
│  │  - Optimistic updates                                    │   │
│  │  - Request deduplication                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Client State                         │   │
│  │                      (Zustand)                           │   │
│  │                                                          │   │
│  │  • UI state (filters, view mode, sidebar)              │   │
│  │  • Auth state (token, user info)                       │   │
│  │  • Search state (query, history)                       │   │
│  │  • Preferences (theme, language)                       │   │
│  │                                                          │   │
│  │  Features:                                               │   │
│  │  - Simple API                                            │   │
│  │  - No boilerplate                                        │   │
│  │  - TypeScript support                                    │   │
│  │  - DevTools integration                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 React Query Setup

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { handleAPIError } from '@/utils/errorHandler';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      onError: handleAPIError,
    },
    mutations: {
      onError: handleAPIError,
    },
  },
});
```

### 6.3 Custom Hooks Examples

```typescript
// src/hooks/useSkills.ts
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { skillsApi } from '@/api/skills';
import type { MarketplaceParams } from '@/api/types';

export const useSkills = (params: MarketplaceParams) => {
  return useQuery({
    queryKey: ['skills', 'marketplace', params],
    queryFn: () => skillsApi.getMarketplace(params),
  });
};

export const useInfiniteSkills = (params: Omit<MarketplaceParams, 'page'>) => {
  return useInfiniteQuery({
    queryKey: ['skills', 'marketplace', 'infinite', params],
    queryFn: ({ pageParam = 1 }) =>
      skillsApi.getMarketplace({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
  });
};
```

```typescript
// src/hooks/useUserSkills.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users';
import { toast } from '@/components/ui/Toast';

export const useUserSkills = (userId: string) => {
  return useQuery({
    queryKey: ['users', userId, 'skills'],
    queryFn: () => usersApi.getUserSkills(userId),
    enabled: !!userId,
  });
};

export const useInstallSkill = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { skillId: string; userTier: string }) =>
      usersApi.installSkill(userId, request),
    onSuccess: (data) => {
      // Invalidate user skills query
      queryClient.invalidateQueries(['users', userId, 'skills']);
      // Update marketplace data
      queryClient.invalidateQueries(['skills', 'marketplace']);
      toast.success('Skill installed successfully!');
    },
    // Optimistic update
    onMutate: async (variables) => {
      await queryClient.cancelQueries(['users', userId, 'skills']);
      const previousSkills = queryClient.getQueryData(['users', userId, 'skills']);
      // Optimistically update UI
      return { previousSkills };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousSkills) {
        queryClient.setQueryData(['users', userId, 'skills'], context.previousSkills);
      }
    },
  });
};

export const useUninstallSkill = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillId: string) => usersApi.uninstallSkill(userId, skillId),
    onSuccess: () => {
      queryClient.invalidateQueries(['users', userId, 'skills']);
      toast.success('Skill uninstalled successfully!');
    },
  });
};
```

### 6.4 Zustand Stores

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: string | null;
  userTier: 'free' | 'pro' | 'enterprise';
  setAuth: (token: string, userId: string, userTier: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(  persist(
    (set) => ({
      token: null,
      userId: null,
      userTier: 'free',
      setAuth: (token, userId, userTier) =>
        set({ token, userId, userTier: userTier as any }),
      clearAuth: () => set({ token: null, userId: null, userTier: 'free' }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

```typescript
// src/stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  viewMode: 'grid' | 'list';
  sidebarOpen: boolean;
  filters: {
    category: string | null;
    provider: string | null;
    sort: string;
  };
  setViewMode: (mode: 'grid' | 'list') => void;
  toggleSidebar: () => void;
  setFilter: (key: string, value: any) => void;
  resetFilters: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: 'grid',
  sidebarOpen: true,
  filters: {
    category: null,
    provider: null,
    sort: 'installs',
  },
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  resetFilters: () =>
    set({
      filters: {
        category: null,
        provider: null,
        sort: 'installs',
      },
    }),
}));
```

---

## 7. UI/UX Design Guidelines

### 7.1 Design Principles

1. **Clarity**: Clear visual hierarchy and intuitive navigation
2. **Efficiency**: Minimize clicks to complete tasks
3. **Consistency**: Uniform patterns across all components
4. **Feedback**: Immediate response to user actions
5. **Accessibility**: WCAG 2.1 AA compliance

### 7.2 Color Palette

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        success: {
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          500: '#ef4444',
          600: '#dc2626',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
      },
    },
  },
};
```

### 7.3 Typography

```css
/* Base typography */
.text-display { @apply text-4xl font-bold; }
.text-h1 { @apply text-3xl font-bold; }
.text-h2 { @apply text-2xl font-semibold; }
.text-h3 { @apply text-xl font-semibold; }
.text-body { @apply text-base; }
.text-small { @apply text-sm; }
.text-tiny { @apply text-xs; }
```

### 7.4 Component Patterns

#### Skill Card Design

```
┌─────────────────────────────────────────┐
│  [Icon]  Skill Name              [★4.8] │
│                                          │
│  Brief description of the skill...       │
│                                          │
│  [frontend] [react] [vercel]            │
│                                          │
│  ⬇ 63.8K installs  ⭐ 17.5K stars       │
│                                          │
│  [Install] or [✓ Installed]             │
└─────────────────────────────────────────┘
```

#### Search Interface

```
┌─────────────────────────────────────────────────────────┐
│  🔍 [Search skills...                    ] [Filter ▼]   │
│                                                          │
│  Suggestions:                                            │
│  • react                                                 │
│  • react-best-practices                                  │
│  • react hooks                                           │
│                                                          │
│  Trending: #nextjs #typescript #ai-tools                │
└─────────────────────────────────────────────────────────┘
```

### 7.5 Loading States

```typescript
// Skeleton components for loading states
const SkillCardSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2" />
    <div className="h-3 bg-neutral-200 rounded w-full mb-2" />
    <div className="h-3 bg-neutral-200 rounded w-2/3" />
  </div>
);
```

### 7.6 Empty States

```typescript
const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="text-neutral-400 mb-4">
      <SearchIcon size={48} />
    </div>
    <h3 className="text-h3 text-neutral-700 mb-2">{title}</h3>
    <p className="text-body text-neutral-500 mb-4">{description}</p>
    {action && <Button onClick={action.onClick}>{action.label}</Button>}
  </div>
);
```

---

## 8. Implementation Plan

### 8.1 Phase 1: Foundation (Week 1-2)

**Goal**: Setup project infrastructure and core components

| Task | Duration | Owner | Status |
|------|----------|-------|--------|
| Project setup (Vite + TypeScript) | 0.5d | Dev | Pending |
| Install dependencies | 0.5d | Dev | Pending |
| Setup Tailwind CSS | 0.5d | Dev | Pending |
| Create base UI components | 2d | Dev | Pending |
| Setup API client | 1d | Dev | Pending |
| Setup React Query | 0.5d | Dev | Pending |
| Setup Zustand stores | 0.5d | Dev | Pending |
| Create layout components | 1d | Dev | Pending |
| Setup routing | 0.5d | Dev | Pending |

**Deliverables**:
- Working development environment
- Base UI component library
- API integration layer
- State management setup

### 8.2 Phase 2: Core Features (Week 3-4)

**Goal**: Implement marketplace and search functionality

| Task | Duration | Owner | Status |
|------|----------|-------|--------|
| Marketplace page | 2d | Dev | Pending |
| Skill card component | 1d | Dev | Pending |
| Filters and sorting | 1.5d | Dev | Pending |
| Pagination | 0.5d | Dev | Pending |
| Search functionality | 2d | Dev | Pending |
| Search suggestions | 1d | Dev | Pending |
| Trending keywords | 0.5d | Dev | Pending |
| Loading states | 1d | Dev | Pending |
| Error handling | 1d | Dev | Pending |

**Deliverables**:
- Functional marketplace page
- Working search with suggestions
- Filter and sort capabilities

### 8.3 Phase 3: User Features (Week 5-6)

**Goal**: Implement user skill management

| Task | Duration | Owner | Status |
|------|----------|-------|--------|
| My Skills page | 1.5d | Dev | Pending |
| Install skill flow | 2d | Dev | Pending |
| Uninstall skill flow | 1d | Dev | Pending |
| Skill configuration | 2d | Dev | Pending |
| Quota display | 0.5d | Dev | Pending |
| Optimistic updates | 1d | Dev | Pending |
| Error handling | 1d | Dev | Pending |
| Skill detail page | 2d | Dev | Pending |

**Deliverables**:
- Complete skill management system
- Skill detail pages
- Quota management

### 8.4 Phase 4: Social Features (Week 7)

**Goal**: Implement ratings and recommendations

| Task | Duration | Owner | Status |
|------|----------|-------|--------|
| Rating components | 1.5d | Dev | Pending |
| Rating submission | 1d | Dev | Pending |
| Rating list | 1d | Dev | Pending |
| Rating summary | 1d | Dev | Pending |
| Recommendations section | 1.5d | Dev | Pending |

**Deliverables**:
- Rating system
- Personalized recommendations

### 8.5 Phase 5: Polish & Testing (Week 8)

**Goal**: Refinement, testing, and optimization

| Task | Duration | Owner | Status |
|------|----------|-------|--------|
| Unit tests | 2d | Dev | Pending |
| Integration tests | 1d | Dev | Pending |
| E2E tests | 1d | Dev | Pending |
| Performance optimization | 1d | Dev | Pending |
| Accessibility audit | 1d | Dev | Pending |
| Bug fixes | 2d | Dev | Pending |
| Documentation | 1d | Dev | Pending |

**Deliverables**:
- Test coverage > 80%
- Performance optimized
- Accessibility compliant
- Complete documentation

### 8.6 Timeline Visualization

```
Week 1-2: Foundation
████████████████████

Week 3-4: Core Features
        ████████████████████

Week 5-6: User Features
                ████████████████████

Week 7: Social Features
                        ██████████

Week 8: Polish & Testing
                              ██████████

├────┼────┼────┼────┼────┼────┼────┼────┤
0    1    2    3    4    5    6    7    8 weeks
```

---

## 9. Acceptance Criteria

### 9.1 Functional Requirements

#### Marketplace
- [ ] Display skills in grid/list view
- [ ] Filter by category, provider, official status
- [ ] Sort by installs, stars, rating, recent, name
- [ ] Paginate results (20 per page)
- [ ] Show skill metadata (stars, installs, rating)
- [ ] Display trending badge for hot skills

#### Search
- [ ] Full-text search with 300ms debounce
- [ ] Auto-complete suggestions
- [ ] Display trending keywords
- [ ] Search history (local storage)
- [ ] Keyboard navigation (↑↓ Enter Esc)
- [ ] Highlight search terms in results

#### User Skills
- [ ] Display installed skills list
- [ ] Show quota usage (X/Y skills)
- [ ] One-click install with confirmation
- [ ] One-click uninstall with confirmation
- [ ] Enable/disable skills
- [ ] Configure skill settings
- [ ] Show last used date and usage count

#### Ratings
- [ ] Display rating summary (avg, distribution)
- [ ] List user reviews with pagination
- [ ] Submit rating (1-5 stars + optional review)
- [ ] Sort reviews (recent, helpful, rating)
- [ ] Show helpful count

#### Recommendations
- [ ] Display personalized recommendations
- [ ] Show recommendation reason
- [ ] Exclude already installed skills
- [ ] Refresh recommendations button

### 9.2 Non-Functional Requirements

#### Performance
- [ ] Initial page load < 2s
- [ ] Time to interactive < 3s
- [ ] API response handling < 500ms
- [ ] Smooth 60fps animations
- [ ] Optimized images (lazy loading)

#### Accessibility
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation support
- [ ] Screen reader compatible
- [ ] Sufficient color contrast (4.5:1)
- [ ] Focus indicators visible
- [ ] ARIA labels on interactive elements

#### Browser Support
- [ ] Chrome 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Edge 90+

#### Responsive Design
- [ ] Desktop (1920x1080, 1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667, 414x896)

#### Error Handling
- [ ] Network errors with retry
- [ ] API errors with user-friendly messages
- [ ] Form validation errors
- [ ] Quota exceeded warnings
- [ ] 404 pages for invalid routes

#### Security
- [ ] Token stored securely
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Input sanitization
- [ ] Secure API communication (HTTPS)

### 9.3 Testing Requirements

#### Unit Tests
- [ ] Component rendering
- [ ] Hook behavior
- [ ] Utility functions
- [ ] Store actions
- [ ] Coverage > 80%

#### Integration Tests
- [ ] API integration
- [ ] State management
- [ ] User flows
- [ ] Error scenarios

#### E2E Tests
- [ ] Complete user journeys
- [ ] Critical paths
- [ ] Cross-browser testing

---

## Appendix

### A. Key Files Reference

| File Path | Purpose |
|-----------|----------|
| `/Users/lu/ccjk-public/docs/API_CLIENT_DOCUMENTATION.md` | Complete API documentation |
| `/Users/lu/ccjk-public/docs/API_QUICK_REFERENCE.md` | Quick API reference |
| `/Users/lu/ccjk-public/docs/FRONTEND_DEVELOPMENT_PLAN.md` | This document |

### B. API Base URL

```
https://api.claudehome.cn/api/v1
```

### C. Useful Resources

- **React Query Docs**: https://tanstack.com/query/latest
- **Zustand Docs**: https://docs.pmnd.rs/zustand
- **Radix UI**: https://www.radix-ui.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **ky HTTP Client**: https://github.com/sindresorhus/ky

### D. Contact & Support

- **Project Repository**: https://github.com/your-org/ccjk-public
- **API Documentation**: https://docs.claudehome.cn
- **Support Email**: support@claudehome.cn

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-01-29  
**Status**: Planning Phase  
**Next Review**: 2026-02-05

---

## 7. UI/UX Design Guidelines

### 7.1 Design Principles

1. **Simplicity First**: Clean, uncluttered interface focusing on core actions
2. **Instant Feedback**: Immediate visual response to all user actions
3. **Progressive Disclosure**: Show advanced features only when needed
4. **Consistency**: Uniform patterns across all components
5. **Accessibility**: WCAG 2.1 AA compliance

### 7.2 Component Design System

```typescript
// Design tokens
export const tokens = {
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#ffffff',
    surface: '#f9fafb',
    border: '#e5e7eb',
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      disabled: '#9ca3af',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },
};
```

### 7.3 Key UI Patterns

#### Skill Card Design

```
┌─────────────────────────────────────────────────────────┐
│  [Icon]  Skill Name                    [★ 4.8] [↓ 1.2k] │
│                                                          │
│  Brief description of what this skill does...            │
│                                                          │
│  [Tag1] [Tag2] [Tag3]                                    │
│                                                          │
│  [Install Button]                      Updated 2d ago    │
└─────────────────────────────────────────────────────────┘
```

#### Search Interface

```
┌─────────────────────────────────────────────────────────┐
│  [🔍] Search skills...                    [Filters ▼]    │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Trending: python, git, docker                   │    │
│  │ Suggestions:                                     │    │
│  │  • Python Code Analyzer (skill)                 │    │
│  │  • python testing (keyword)                     │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 7.4 Interaction Patterns

| Action | Feedback | Duration |
|--------|----------|----------|
| Install skill | Loading spinner → Success toast | 1-2s |
| Search input | Debounced suggestions | 300ms |
| Filter change | Skeleton loading → Results | 500ms |
| Rating submit | Optimistic update → Confirmation | Instant |
| Page navigation | Smooth transition | 200ms |

---

## 8. Implementation Plan

### 8.1 Development Phases

#### Phase 1: Foundation (Week 1-2)

**Goal**: Set up core infrastructure and basic UI

- [ ] Project setup (Vite, TypeScript, Tailwind)
- [ ] API client configuration
- [ ] React Query setup
- [ ] Zustand stores
- [ ] Base UI components (Button, Card, Input, etc.)
- [ ] Layout components (Header, Sidebar, Footer)
- [ ] Error boundary and toast system

**Deliverable**: Working development environment with basic UI shell

#### Phase 2: Marketplace & Search (Week 3-4)

**Goal**: Core browsing and discovery features

- [ ] Marketplace page with skill cards
- [ ] Category filters and sorting
- [ ] Pagination
- [ ] Search functionality with suggestions
- [ ] Trending keywords display
- [ ] Loading states and error handling

**Deliverable**: Users can browse and search skills

#### Phase 3: User Skills Management (Week 5-6)

**Goal**: Enable skill installation and management

- [ ] My Skills page
- [ ] Install skill flow
- [ ] Uninstall with confirmation
- [ ] Skill configuration dialog
- [ ] Quota display and management
- [ ] Optimistic updates

**Deliverable**: Users can manage their skill collection

#### Phase 4: Skill Detail & Ratings (Week 7-8)

**Goal**: Detailed information and community feedback

- [ ] Skill detail page
- [ ] Rating display and submission
- [ ] Rating distribution chart
- [ ] Related skills section
- [ ] GitHub stats integration

**Deliverable**: Complete skill information and rating system

#### Phase 5: Recommendations & Polish (Week 9-10)

**Goal**: Personalization and final touches

- [ ] Recommendations section
- [ ] "Why recommended" explanations
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Cross-browser testing
- [ ] Documentation

**Deliverable**: Production-ready application

### 8.2 Sprint Breakdown

| Sprint | Duration | Focus | Key Deliverables |
|--------|----------|-------|------------------|
| Sprint 1 | Week 1-2 | Infrastructure | Dev environment, API client, base components |
| Sprint 2 | Week 3-4 | Discovery | Marketplace, search, filters |
| Sprint 3 | Week 5-6 | Management | Install/uninstall, configuration |
| Sprint 4 | Week 7-8 | Detail & Social | Skill detail, ratings |
| Sprint 5 | Week 9-10 | Polish | Recommendations, optimization |

### 8.3 Testing Strategy

#### Unit Testing

```typescript
// Example: useSkills hook test
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSkills } from '@/hooks/useSkills';

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('useSkills fetches marketplace data', async () => {
  const { result } = renderHook(() => useSkills({ page: 1 }), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data.skills).toBeDefined();
});
```

#### Integration Testing

- Test complete user flows (browse → search → install)
- Mock API responses with MSW
- Test error scenarios
- Test loading states

#### E2E Testing (Optional)

- Playwright for critical paths
- Test in Electron environment
- Cross-platform testing

---

## 9. Acceptance Criteria

### 9.1 Functional Requirements

| Requirement | Acceptance Criteria | Priority |
|-------------|---------------------|----------|
| Browse skills | User can view paginated list of skills with filters | Must Have |
| Search skills | User can search with auto-complete and see results | Must Have |
| Install skill | User can install a skill with one click | Must Have |
| Uninstall skill | User can remove installed skills | Must Have |
| View ratings | User can see skill ratings and reviews | Must Have |
| Submit rating | User can rate and review skills | Should Have |
| Recommendations | User sees personalized suggestions | Should Have |
| Configure skill | User can modify skill settings | Should Have |
| Quota management | User sees and manages skill quota | Must Have |

### 9.2 Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Page load time | < 2s | Lighthouse |
| Time to interactive | < 3s | Lighthouse |
| API response time | < 500ms | Network tab |
| Bundle size | < 500KB (gzipped) | Webpack analyzer |
| Accessibility | WCAG 2.1 AA | axe DevTools |
| Browser support | Chrome 90+, Firefox 88+, Safari 14+ | Manual testing |
| Mobile responsive | Works on 375px+ screens | DevTools |

### 9.3 Quality Gates

- [ ] All unit tests passing (>80% coverage)
- [ ] No TypeScript errors
- [ ] No console errors in production
- [ ] Lighthouse score >90
- [ ] Accessibility audit passed
- [ ] Code review approved
- [ ] Documentation complete

---

## Appendix A: API Response Examples

### Marketplace Response

```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "skillId": "skill_123",
        "name": "Python Code Analyzer",
        "slug": "python-code-analyzer",
        "descriptionEn": "Analyze Python code for best practices",
        "repo": "user/python-analyzer",
        "stars": 1234,
        "installCount": 5678,
        "category": "Development",
        "tags": ["python", "analysis", "linting"],
        "ratingAvg": 4.8,
        "ratingCount": 234
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true
    }
  }
}
```

---

## Appendix B: Component Examples

### SkillCard Component

```typescript
import { Star, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Skill } from '@/types';

interface SkillCardProps {
  skill: Skill;
  onInstall: (skillId: string) => void;
  isInstalled?: boolean;
}

export function SkillCard({ skill, onInstall, isInstalled }: SkillCardProps) {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{skill.name}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {skill.descriptionEn}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            {skill.ratingAvg.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            {formatNumber(skill.installCount)}
          </span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {skill.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
          >
            {tag}
          </span>
        ))}
      </div>
      
      <div className="flex items-center justify-between">
        <Button
          onClick={() => onInstall(skill.skillId)}
          disabled={isInstalled}
          variant={isInstalled ? 'secondary' : 'primary'}
        >
          {isInstalled ? 'Installed' : 'Install'}
        </Button>
        <span className="text-xs text-gray-500">
          Updated {formatDate(skill.updatedAt)}
        </span>
      </div>
    </Card>
  );
}
```

---

## Appendix C: Performance Optimization Checklist

- [ ] Code splitting by route
- [ ] Lazy loading for heavy components
- [ ] Image optimization (WebP, lazy loading)
- [ ] React Query caching configured
- [ ] Debounced search input
- [ ] Virtual scrolling for long lists
- [ ] Memoization for expensive computations
- [ ] Bundle size analysis
- [ ] Tree shaking enabled
- [ ] Production build optimization

---

## Appendix D: Deployment Checklist

- [ ] Environment variables configured
- [ ] API endpoints verified
- [ ] Error tracking setup (Sentry)
- [ ] Analytics configured
- [ ] Performance monitoring
- [ ] Security headers configured
- [ ] CORS settings verified
- [ ] SSL certificate valid
- [ ] Backup strategy in place
- [ ] Rollback plan documented

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-01-29  
**Status**: Ready for Implementation  
**Next Review**: After Phase 1 completion

| Sprint 2 | Week 3-4 | Marketplace | Browse, filter, search functionality |
| Sprint 3 | Week 5-6 | User Skills | Install, uninstall, configure skills |
| Sprint 4 | Week 7-8 | Detail & Ratings | Skill details, rating system |
| Sprint 5 | Week 9-10 | Polish | Recommendations, optimization, testing |

### 8.3 Testing Strategy

#### Unit Testing

```typescript
// Example: useSkills hook test
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSkills } from '@/hooks/useSkills';
import { server } from '@/mocks/server';

describe('useSkills', () => {
  it('should fetch marketplace skills', async () => {
    const { result } = renderHook(() => useSkills({ page: 1, limit: 20 }), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={new QueryClient()}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.skills).toHaveLength(20);
  });
});
```

#### Integration Testing

- Test complete user flows (browse → search → install)
- Test error scenarios (quota exceeded, network errors)
- Test optimistic updates and rollbacks

#### E2E Testing (Optional)

- Use Playwright for critical user journeys
- Test across different browsers
- Test responsive design

### 8.4 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Load | < 2s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Search Response | < 300ms | Network tab |
| Skill Install | < 2s | Network tab |
| Bundle Size | < 500KB | Webpack analyzer |
| Lighthouse Score | > 90 | Lighthouse |

### 8.5 Deployment Checklist

- [ ] Environment variables configured
- [ ] API endpoints verified
- [ ] Error tracking setup (Sentry)
- [ ] Analytics integration
- [ ] Performance monitoring
- [ ] Security headers configured
- [ ] CORS settings verified
- [ ] SSL certificate valid
- [ ] Backup strategy in place
- [ ] Rollback plan documented

---

## 9. Acceptance Criteria

### 9.1 Functional Requirements

#### Marketplace

- [x] Users can view a paginated list of skills
- [x] Users can filter skills by category
- [x] Users can filter skills by provider
- [x] Users can sort skills by installs, stars, rating, recent, name
- [x] Users can see official and verified badges
- [x] Users can see trending indicators
- [x] Pagination works correctly with filters

#### Search

- [x] Users can search skills with full-text search
- [x] Search provides auto-complete suggestions
- [x] Search shows trending keywords
- [x] Search is debounced (300ms)
- [x] Search results show relevance scores
- [x] Search history is saved locally

#### User Skills Management

- [x] Users can view their installed skills
- [x] Users can install a skill with one click
- [x] Users can uninstall a skill with confirmation
- [x] Users can configure skill settings
- [x] Users can see their quota usage
- [x] System prevents quota exceeded installations
- [x] Optimistic updates work correctly

#### Ratings

- [x] Users can view skill ratings
- [x] Users can submit a rating (1-5 stars)
- [x] Users can write a review
- [x] Rating distribution is displayed
- [x] Average rating is calculated correctly
- [x] Users cannot rate the same skill twice

#### Recommendations

- [x] Authenticated users see personalized recommendations
- [x] Recommendations exclude already installed skills
- [x] Recommendations show reasoning
- [x] Users can refresh recommendations

#### Skill Detail

- [x] Users can view complete skill information
- [x] Users can see GitHub statistics
- [x] Users can see installation instructions
- [x] Users can see related skills
- [x] Users can install from detail page

### 9.2 Non-Functional Requirements

#### Performance

- [x] Initial page load < 2 seconds
- [x] Search response < 300ms
- [x] Smooth scrolling and animations (60fps)
- [x] Efficient caching strategy
- [x] Lazy loading for images

#### Usability

- [x] Intuitive navigation
- [x] Clear error messages
- [x] Helpful loading states
- [x] Responsive design (mobile, tablet, desktop)
- [x] Keyboard navigation support

#### Accessibility

- [x] WCAG 2.1 AA compliance
- [x] Screen reader support
- [x] Proper ARIA labels
- [x] Keyboard-only navigation
- [x] Sufficient color contrast

#### Security

- [x] Secure token storage
- [x] XSS prevention
- [x] CSRF protection
- [x] Input validation
- [x] Secure API communication (HTTPS)

#### Reliability

- [x] Graceful error handling
- [x] Automatic retry on network errors
- [x] Offline detection
- [x] Data consistency
- [x] No data loss on errors

### 9.3 Browser Support

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| Chrome | 90+ | ✅ Supported |
| Firefox | 88+ | ✅ Supported |
| Safari | 14+ | ✅ Supported |
| Edge | 90+ | ✅ Supported |

### 9.4 Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| User Engagement | 70% of users install at least 1 skill | Analytics |
| Search Usage | 50% of users use search | Analytics |
| Rating Participation | 20% of users rate skills | Database |
| Page Load Time | < 2s for 95th percentile | RUM |
| Error Rate | < 1% of requests | Error tracking |
| User Satisfaction | > 4.0/5.0 rating | User surveys |

---

## Appendix A: API Response Examples

### Marketplace Response

```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "skillId": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Python Code Analyzer",
        "slug": "python-code-analyzer",
        "nameZh": "Python 代码分析器",
        "descriptionEn": "Analyze Python code for best practices",
        "descriptionZh": "分析 Python 代码的最佳实践",
        "repo": "username/python-analyzer",
        "repoUrl": "https://github.com/username/python-analyzer",
        "stars": 1234,
        "installCount": 5678,
        "localInstallCount": 890,
        "category": "Code Analysis",
        "tags": ["python", "linting", "analysis"],
        "provider": "community",
        "isOfficial": false,
        "isVerified": true,
        "isTrending": true,
        "trendingRank": 3,
        "trigger": "/analyze-python",
        "aliases": ["py-analyze", "python-lint"],
        "installCommand": "npm install @skills/python-analyzer",
        "supportedAgents": ["claude", "cursor"],
        "ratingAvg": 4.7,
        "ratingCount": 234,
        "searchCount": 1567,
        "status": "active",
        "metadata": {
          "language": "TypeScript",
          "license": "MIT",
          "topics": ["python", "code-quality"],
          "forks": 45,
          "lastUpdated": "2026-01-25T10:30:00Z"
        },
        "createdAt": "2025-12-01T00:00:00Z",
        "updatedAt": "2026-01-25T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8,
      "hasNext": true
    },
    "filters": {
      "categories": [
        { "name": "Code Analysis", "count": 45 },
        { "name": "Documentation", "count": 32 }
      ],
      "providers": [
        { "name": "official", "count": 12 },
        { "name": "community", "count": 144 }
      ]
    }
  }
}
```

---

## Appendix B: Component Examples

### SkillCard Component

```typescript
// src/components/skills/SkillCard.tsx
import { Star, Download, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Skill } from '@/api/types';

interface SkillCardProps {
  skill: Skill;
  onInstall?: (skillId: string) => void;
  isInstalled?: boolean;
}

export function SkillCard({ skill, onInstall, isInstalled }: SkillCardProps) {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{skill.name}</h3>
            {skill.isOfficial && (
              <Badge variant="primary">Official</Badge>
            )}
            {skill.isVerified && (
              <Badge variant="success">Verified</Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">
            {skill.descriptionEn}
          </p>
        </div>
        {skill.isTrending && (
          <TrendingUp className="w-5 h-5 text-orange-500" />
        )}
      </div>

      <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span>{skill.ratingAvg.toFixed(1)}</span>
          <span className="text-gray-400">({skill.ratingCount})</span>
        </div>
        <div className="flex items-center gap-1">
          <Download className="w-4 h-4" />
          <span>{formatNumber(skill.installCount)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {skill.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="secondary" size="sm">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Updated {formatRelativeTime(skill.updatedAt)}
        </span>
        <Button
          size="sm"
          onClick={() => onInstall?.(skill.skillId)}
          disabled={isInstalled}
        >
          {isInstalled ? 'Installed' : 'Install'}
        </Button>
      </div>
    </Card>
  );
}
```

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Skill** | A reusable AI coding capability that can be installed and used |
| **Marketplace** | The central hub for discovering and browsing skills |
| **Quota** | The maximum number of skills a user can install based on their tier |
| **Trending** | Skills that are gaining popularity based on recent activity |
| **Official** | Skills created and maintained by the CCJK team |
| **Verified** | Community skills that have been reviewed and approved |
| **Provider** | The source of the skill (official or community) |
| **Trigger** | The command used to invoke a skill (e.g., /analyze) |
| **Alias** | Alternative commands for invoking a skill |
| **Rating** | User feedback score from 1-5 stars |
| **Recommendation** | Personalized skill suggestions based on user behavior |

---

## Appendix D: Resources

### Documentation

- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Radix UI Documentation](https://www.radix-ui.com/primitives/docs/overview/introduction)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [ky Documentation](https://github.com/sindresorhus/ky)

### Design Resources

- [Figma Design System](https://www.figma.com/community)
- [Heroicons](https://heroicons.com/)
- [Lucide Icons](https://lucide.dev/)

### Development Tools

- [React DevTools](https://react.dev/learn/react-developer-tools)
- [TanStack Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)
- [Vite](https://vitejs.dev/)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|----------|
| 1.0.0 | 2026-01-29 | Development Team | Initial comprehensive plan |

---

**End of Document**
