---
name: nextjs-optimization
description: Next.js App Router patterns, server components, and performance optimization
description_zh: Next.js App Router 模式、服务器组件和性能优化
version: 1.0.0
category: frontend
triggers: ['/nextjs-optimization', '/nextjs', '/app-router', '/server-components']
use_when:
  - Building Next.js 13+ applications with App Router
  - Implementing server components and data fetching strategies
  - Optimizing Next.js performance and SEO
  - Code review for Next.js applications
use_when_zh:
  - 使用 App Router 构建 Next.js 13+ 应用程序
  - 实现服务器组件和数据获取策略
  - 优化 Next.js 性能和 SEO
  - Next.js 应用程序代码审查
auto_activate: true
priority: 8
agents: [nextjs-expert, fullstack-architect]
tags: [nextjs, app-router, server-components, performance, seo]
---

# Next.js Optimization | Next.js 优化

## Context | 上下文

Use this skill when developing Next.js 13+ applications with App Router that require optimal performance, SEO, and modern React patterns. Essential for production-ready Next.js applications.

在开发需要最佳性能、SEO 和现代 React 模式的 Next.js 13+ App Router 应用程序时使用此技能。对于生产就绪的 Next.js 应用程序至关重要。

## App Router Patterns | App Router 模式

### 1. File-based Routing Structure | 基于文件的路由结构

```
app/
├── layout.tsx          # Root layout
├── page.tsx           # Home page
├── loading.tsx        # Loading UI
├── error.tsx          # Error UI
├── not-found.tsx      # 404 page
├── global-error.tsx   # Global error boundary
├── (auth)/            # Route groups
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── dashboard/
│   ├── layout.tsx     # Nested layout
│   ├── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   └── [userId]/      # Dynamic routes
│       ├── page.tsx
│       └── edit/
│           └── page.tsx
└── api/               # API routes
    ├── auth/
    │   └── route.ts
    └── users/
        └── route.ts
```

### 2. Server Components Best Practices | 服务器组件最佳实践

```tsx
// ✅ Good: Server component with data fetching
import { Suspense } from 'react';
import { getUserPosts, getUser } from '@/lib/api';

// Server component - runs on server
async function UserProfile({ userId }: { userId: string }) {
  // Fetch data directly in server component
  const user = await getUser(userId);

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <Suspense fallback={<div>Loading posts...</div>}>
        <UserPosts userId={userId} />
      </Suspense>
    </div>
  );
}

// Separate server component for posts
async function UserPosts({ userId }: { userId: string }) {
  const posts = await getUserPosts(userId);

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  );
}

// Page component
export default function UserPage({ params }: { params: { userId: string } }) {
  return (
    <main>
      <Suspense fallback={<div>Loading user...</div>}>
        <UserProfile userId={params.userId} />
      </Suspense>
    </main>
  );
}
```

### 3. Client Components Pattern | 客户端组件模式

```tsx
'use client'; // Mark as client component

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ✅ Good: Client component for interactivity
export function InteractiveCounter({ initialCount = 0 }: { initialCount?: number }) {
  const [count, setCount] = useState(initialCount);
  const router = useRouter();

  useEffect(() => {
    // Client-side only code
    const interval = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleReset = () => {
    setCount(0);
    // Client-side navigation
    router.refresh();
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
      <button onClick={handleReset}>
        Reset
      </button>
    </div>
  );
}

// ✅ Good: Hybrid approach - server component wrapping client component
import { InteractiveCounter } from './InteractiveCounter';

async function CounterPage() {
  // Server-side data fetching
  const initialData = await fetch('https://api.example.com/counter').then(r => r.json());

  return (
    <div>
      <h1>Counter Page</h1>
      <InteractiveCounter initialCount={initialData.count} />
    </div>
  );
}
```

## Data Fetching Strategies | 数据获取策略

### 1. Server-Side Data Fetching | 服务器端数据获取

```tsx
// ✅ Good: Parallel data fetching
async function ProductPage({ params }: { params: { id: string } }) {
  // Fetch data in parallel
  const [product, reviews, relatedProducts] = await Promise.all([
    getProduct(params.id),
    getProductReviews(params.id),
    getRelatedProducts(params.id)
  ]);

  return (
    <div>
      <ProductDetails product={product} />
      <ProductReviews reviews={reviews} />
      <RelatedProducts products={relatedProducts} />
    </div>
  );
}

// ✅ Good: Streaming with Suspense
function ProductPageWithStreaming({ params }: { params: { id: string } }) {
  return (
    <div>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetails productId={params.id} />
      </Suspense>

      <Suspense fallback={<ReviewsSkeleton />}>
        <ProductReviews productId={params.id} />
      </Suspense>

      <Suspense fallback={<RelatedSkeleton />}>
        <RelatedProducts productId={params.id} />
      </Suspense>
    </div>
  );
}

async function ProductDetails({ productId }: { productId: string }) {
  const product = await getProduct(productId);
  return <div>{/* Product details */}</div>;
}
```

### 2. Client-Side Data Fetching | 客户端数据获取

```tsx
'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';

// ✅ Good: SWR for client-side data fetching
function UserDashboard() {
  const { data: user, error, isLoading } = useSWR('/api/user', fetcher);
  const { data: notifications } = useSWR('/api/notifications', fetcher, {
    refreshInterval: 30000 // Refresh every 30 seconds
  });

  if (error) return <div>Failed to load user data</div>;
  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <NotificationList notifications={notifications} />
    </div>
  );
}

// ✅ Good: Custom hook for data fetching
function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [url]);

  return { data, loading, error };
}
```

### 3. Caching and Revalidation | 缓存和重新验证

```tsx
// ✅ Good: Static generation with revalidation
export const revalidate = 3600; // Revalidate every hour

async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}

// ✅ Good: Dynamic with custom cache
async function getProductWithCache(id: string) {
  const response = await fetch(`https://api.example.com/products/${id}`, {
    next: {
      revalidate: 300, // Cache for 5 minutes
      tags: [`product-${id}`] // For on-demand revalidation
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch product');
  }

  return response.json();
}

// API route for cache revalidation
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { tag } = await request.json();

  revalidateTag(tag);

  return Response.json({ revalidated: true });
}
```

## Performance Optimization | 性能优化

### 1. Image Optimization | 图像优化

```tsx
import Image from 'next/image';

// ✅ Good: Optimized images with Next.js Image component
function ProductGallery({ product }: { product: Product }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Hero image with priority loading */}
      <Image
        src={product.images[0]}
        alt={product.name}
        width={800}
        height={600}
        priority
        className="rounded-lg"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      />

      {/* Lazy loaded images */}
      {product.images.slice(1).map((image, index) => (
        <Image
          key={index}
          src={image}
          alt={`${product.name} ${index + 2}`}
          width={400}
          height={300}
          className="rounded-lg"
          loading="lazy"
        />
      ))}
    </div>
  );
}

// ✅ Good: Responsive images
function ResponsiveHero({ image }: { image: string }) {
  return (
    <Image
      src={image}
      alt="Hero image"
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      priority
    />
  );
}
```

### 2. Bundle Optimization | 包优化

```tsx
// ✅ Good: Dynamic imports for code splitting
import dynamic from 'next/dynamic';

// Lazy load heavy components
const Chart = dynamic(() => import('./Chart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false // Disable SSR for client-only components
});

const Modal = dynamic(() => import('./Modal'), {
  loading: () => <div>Loading...</div>
});

function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>
        Show Chart
      </button>

      {showChart && <Chart />}
      {showModal && <Modal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ✅ Good: Tree shaking with named imports
import { debounce } from 'lodash-es'; // Better than import _ from 'lodash'
import { format } from 'date-fns'; // Better than import * as dateFns
```

### 3. Streaming and Suspense | 流式传输和 Suspense

```tsx
import { Suspense } from 'react';

// ✅ Good: Streaming layout
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <header>
          <Suspense fallback={<div>Loading navigation...</div>}>
            <Navigation />
          </Suspense>
        </header>

        <main>
          <Suspense fallback={<div>Loading content...</div>}>
            {children}
          </Suspense>
        </main>

        <footer>
          <Suspense fallback={<div>Loading footer...</div>}>
            <Footer />
          </Suspense>
        </footer>
      </body>
    </html>
  );
}

// ✅ Good: Progressive enhancement
function ProductPage({ params }: { params: { id: string } }) {
  return (
    <div>
      {/* Critical content loads first */}
      <Suspense fallback={<ProductSkeleton />}>
        <ProductInfo productId={params.id} />
      </Suspense>

      {/* Non-critical content streams in later */}
      <Suspense fallback={<div>Loading reviews...</div>}>
        <ProductReviews productId={params.id} />
      </Suspense>

      <Suspense fallback={<div>Loading recommendations...</div>}>
        <ProductRecommendations productId={params.id} />
      </Suspense>
    </div>
  );
}
```

## SEO and Metadata | SEO 和元数据

### 1. Metadata API | 元数据 API

```tsx
import type { Metadata } from 'next';

// ✅ Good: Static metadata
export const metadata: Metadata = {
  title: 'My App',
  description: 'The best app ever built',
  keywords: ['nextjs', 'react', 'typescript'],
  authors: [{ name: 'John Doe' }],
  openGraph: {
    title: 'My App',
    description: 'The best app ever built',
    url: 'https://myapp.com',
    siteName: 'My App',
    images: [
      {
        url: 'https://myapp.com/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My App',
    description: 'The best app ever built',
    images: ['https://myapp.com/twitter-image.jpg'],
  },
};

// ✅ Good: Dynamic metadata
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const product = await getProduct(params.id);

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  };
}
```

### 2. Structured Data | 结构化数据

```tsx
// ✅ Good: JSON-LD structured data
function ProductPage({ product }: { product: Product }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div>
        {/* Product content */}
      </div>
    </>
  );
}
```

## Anti-Patterns | 反模式

### 1. Avoid Client Components for Static Content | 避免在静态内容中使用客户端组件

```tsx
// ❌ Bad: Unnecessary client component
'use client';

function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}

// ✅ Good: Server component for static content
function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

### 2. Avoid Blocking Data Fetching | 避免阻塞数据获取

```tsx
// ❌ Bad: Sequential data fetching
async function BadProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  const reviews = await getProductReviews(params.id); // Waits for product
  const related = await getRelatedProducts(params.id); // Waits for reviews

  return (
    <div>
      <ProductDetails product={product} />
      <ProductReviews reviews={reviews} />
      <RelatedProducts products={related} />
    </div>
  );
}

// ✅ Good: Parallel data fetching
async function GoodProductPage({ params }: { params: { id: string } }) {
  const [product, reviews, related] = await Promise.all([
    getProduct(params.id),
    getProductReviews(params.id),
    getRelatedProducts(params.id)
  ]);

  return (
    <div>
      <ProductDetails product={product} />
      <ProductReviews reviews={reviews} />
      <RelatedProducts products={related} />
    </div>
  );
}
```

### 3. Avoid Overusing Client Components | 避免过度使用客户端组件

```tsx
// ❌ Bad: Everything as client component
'use client';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

// ✅ Good: Mix server and client components
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header /> {/* Server component */}
      <main>{children}</main>
      <Footer /> {/* Server component */}
    </div>
  );
}

// Only interactive parts are client components
'use client';
function InteractiveHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav>
      <button onClick={() => setIsOpen(!isOpen)}>
        Menu
      </button>
      {isOpen && <MobileMenu />}
    </nav>
  );
}
```

## Performance Checklist | 性能检查清单

- [ ] Server components are used for static content
- [ ] Client components are minimal and focused
- [ ] Data fetching is parallelized where possible
- [ ] Images use Next.js Image component with optimization
- [ ] Code splitting is implemented for large components
- [ ] Metadata is properly configured for SEO
- [ ] Caching strategies are implemented
- [ ] Bundle size is monitored and optimized
- [ ] Streaming and Suspense are used for better UX
- [ ] Core Web Vitals are measured and optimized

## 性能检查清单

- [ ] 静态内容使用服务器组件
- [ ] 客户端组件最小化且专注
- [ ] 在可能的地方并行化数据获取
- [ ] 图像使用 Next.js Image 组件进行优化
- [ ] 为大型组件实现代码分割
- [ ] 为 SEO 正确配置元数据
- [ ] 实现缓存策略
- [ ] 监控和优化包大小
- [ ] 使用流式传输和 Suspense 改善用户体验
- [ ] 测量和优化核心 Web 指标