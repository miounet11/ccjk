# React Best Practices | React 最佳实践

A comprehensive skill for analyzing and improving React/Next.js projects with best practices in component design, hooks usage, performance optimization, and state management.

一个全面的技能，用于分析和改进 React/Next.js 项目，涵盖组件设计、Hooks 使用、性能优化和状态管理的最佳实践。

## When to Apply | 适用场景

- When building new React components | 构建新的 React 组件时
- When reviewing React code | 审查 React 代码时
- When optimizing React application performance | 优化 React 应用性能时
- When refactoring legacy React code | 重构遗留 React 代码时
- When setting up new React/Next.js projects | 设置新的 React/Next.js 项目时

## Overview | 概述

This skill provides guidelines and rules for writing high-quality React code. It covers component design patterns, hooks best practices, performance optimization techniques, and state management strategies.

本技能提供编写高质量 React 代码的指南和规则，涵盖组件设计模式、Hooks 最佳实践、性能优化技术和状态管理策略。

---

## 1. Component Design Rules | 组件设计规则

### `react-001`: Prefer Functional Components | 优先使用函数组件

**Priority**: CRITICAL | 优先级：关键

Always use functional components with hooks instead of class components.

始终使用带有 Hooks 的函数组件，而不是类组件。

**❌ Bad | 错误示例:**
```tsx
class UserProfile extends React.Component {
  state = { user: null };

  componentDidMount() {
    this.fetchUser();
  }

  fetchUser = async () => {
    const user = await getUser(this.props.userId);
    this.setState({ user });
  };

  render() {
    return <div>{this.state.user?.name}</div>;
  }
}
```

**✅ Good | 正确示例:**
```tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getUser(userId).then(setUser);
  }, [userId]);

  return <div>{user?.name}</div>;
}
```

### `react-002`: Single Responsibility Principle | 单一职责原则

**Priority**: HIGH | 优先级：高

Each component should do one thing well. Split large components into smaller, focused ones.

每个组件应该只做好一件事。将大型组件拆分为更小、更专注的组件。

**❌ Bad | 错误示例:**
```tsx
function UserDashboard() {
  // Handles user data, notifications, settings, and analytics all in one
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({});
  const [analytics, setAnalytics] = useState({});

  // 200+ lines of mixed logic...

  return (
    <div>
      {/* Everything rendered in one massive component */}
    </div>
  );
}
```

**✅ Good | 正确示例:**
```tsx
function UserDashboard() {
  return (
    <div className="dashboard">
      <UserHeader />
      <NotificationPanel />
      <UserSettings />
      <AnalyticsWidget />
    </div>
  );
}

function UserHeader() {
  const { user } = useUser();
  return <header>{user.name}</header>;
}

function NotificationPanel() {
  const { notifications } = useNotifications();
  return <aside>{/* notification list */}</aside>;
}
```

### `react-003`: Use Composition Over Inheritance | 组合优于继承

**Priority**: HIGH | 优先级：高

Use component composition and props to share behavior, not inheritance.

使用组件组合和 props 来共享行为，而不是继承。

**❌ Bad | 错误示例:**
```tsx
// Don't create base classes for components
class BaseButton extends React.Component {
  // shared logic
}

class PrimaryButton extends BaseButton {
  // extends base
}
```

**✅ Good | 正确示例:**
```tsx
// Use composition with props
function Button({ variant = 'default', children, ...props }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} {...props}>
      {children}
    </button>
  );
}

// Compose specialized buttons
function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />;
}

function IconButton({ icon, children, ...props }: IconButtonProps) {
  return (
    <Button {...props}>
      <Icon name={icon} />
      {children}
    </Button>
  );
}
```

### `react-004`: Keep Components Small | 保持组件小巧

**Priority**: MEDIUM | 优先级：中

Components should ideally be under 200 lines. If larger, consider splitting.

组件理想情况下应少于 200 行。如果更大，考虑拆分。

**✅ Good Practice | 良好实践:**
```tsx
// Extract logical sections into separate components
function ProductPage() {
  return (
    <main>
      <ProductHeader />
      <ProductGallery />
      <ProductDetails />
      <ProductReviews />
      <RelatedProducts />
    </main>
  );
}
```

---

## 2. Hooks Usage Rules | Hooks 使用规则

### `hooks-001`: Always Specify Dependencies | 始终指定依赖项

**Priority**: CRITICAL | 优先级：关键

Always provide a dependency array for useEffect, useMemo, and useCallback.

始终为 useEffect、useMemo 和 useCallback 提供依赖数组。

**❌ Bad | 错误示例:**
```tsx
// Missing dependency array - runs on every render!
useEffect(() => {
  fetchData();
});

// Missing dependencies - stale closure
useEffect(() => {
  console.log(userId); // userId not in deps
}, []);
```

**✅ Good | 正确示例:**
```tsx
// Empty array - runs once on mount
useEffect(() => {
  initializeApp();
}, []);

// With dependencies - runs when userId changes
useEffect(() => {
  fetchUserData(userId);
}, [userId]);

// All dependencies included
useEffect(() => {
  const handler = () => console.log(count);
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
}, [count]);
```

### `hooks-002`: Use Custom Hooks for Reusable Logic | 使用自定义 Hooks 复用逻辑

**Priority**: HIGH | 优先级：高

Extract reusable stateful logic into custom hooks.

将可复用的有状态逻辑提取到自定义 Hooks 中。

**❌ Bad | 错误示例:**
```tsx
// Duplicated logic in multiple components
function ComponentA() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  // ...
}

function ComponentB() {
  // Same logic duplicated...
}
```

**✅ Good | 正确示例:**
```tsx
// Custom hook for data fetching
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(setData)
      .catch(err => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}

// Clean usage in components
function ComponentA() {
  const { data, loading, error } = useFetch('/api/data');
  // ...
}
```

### `hooks-003`: Avoid Hooks in Conditions or Loops | 避免在条件或循环中使用 Hooks

**Priority**: CRITICAL | 优先级：关键

Hooks must be called at the top level of your component, not inside conditions, loops, or nested functions.

Hooks 必须在组件的顶层调用，不能在条件、循环或嵌套函数中调用。

**❌ Bad | 错误示例:**
```tsx
function Component({ isLoggedIn }) {
  // WRONG: Hook inside condition
  if (isLoggedIn) {
    const [user, setUser] = useState(null);
  }

  // WRONG: Hook inside loop
  items.forEach(item => {
    const [selected, setSelected] = useState(false);
  });
}
```

**✅ Good | 正确示例:**
```tsx
function Component({ isLoggedIn }) {
  // Always call hooks at top level
  const [user, setUser] = useState(null);

  // Use conditional logic inside the hook or after
  useEffect(() => {
    if (isLoggedIn) {
      fetchUser().then(setUser);
    }
  }, [isLoggedIn]);

  // Conditional rendering is fine
  if (!isLoggedIn) return <LoginPrompt />;

  return <UserProfile user={user} />;
}
```

### `hooks-004`: Use useReducer for Complex State | 复杂状态使用 useReducer

**Priority**: MEDIUM | 优先级：中

When state logic is complex or involves multiple sub-values, use useReducer.

当状态逻辑复杂或涉及多个子值时，使用 useReducer。

**❌ Bad | 错误示例:**
```tsx
function Form() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Complex interdependent state updates scattered everywhere
}
```

**✅ Good | 正确示例:**
```tsx
type FormState = {
  values: { name: string; email: string; password: string };
  errors: Record<string, string>;
  isSubmitting: boolean;
  isSuccess: boolean;
};

type FormAction =
  | { type: 'SET_FIELD'; field: string; value: string }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errors: Record<string, string> };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: '' },
      };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, errors: {} };
    case 'SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false, isSuccess: true };
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, errors: action.errors };
    default:
      return state;
  }
}

function Form() {
  const [state, dispatch] = useReducer(formReducer, initialState);
  // Clean, predictable state updates
}
```

---

## 3. Performance Optimization Rules | 性能优化规则

### `perf-001`: Memoize Expensive Computations | 缓存昂贵的计算

**Priority**: HIGH | 优先级：高

Use useMemo for expensive calculations that don't need to run on every render.

使用 useMemo 缓存不需要在每次渲染时运行的昂贵计算。

**❌ Bad | 错误示例:**
```tsx
function ProductList({ products, filter }) {
  // Runs on EVERY render, even if products/filter haven't changed
  const filteredProducts = products
    .filter(p => p.category === filter)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 100);

  return <List items={filteredProducts} />;
}
```

**✅ Good | 正确示例:**
```tsx
function ProductList({ products, filter }) {
  // Only recalculates when products or filter change
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => p.category === filter)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 100);
  }, [products, filter]);

  return <List items={filteredProducts} />;
}
```

### `perf-002`: Memoize Callback Functions | 缓存回调函数

**Priority**: HIGH | 优先级：高

Use useCallback for functions passed to child components to prevent unnecessary re-renders.

使用 useCallback 缓存传递给子组件的函数，以防止不必要的重新渲染。

**❌ Bad | 错误示例:**
```tsx
function Parent() {
  const [count, setCount] = useState(0);

  // New function created on every render
  const handleClick = () => {
    console.log('clicked');
  };

  // Child re-renders every time Parent renders
  return <ExpensiveChild onClick={handleClick} />;
}
```

**✅ Good | 正确示例:**
```tsx
function Parent() {
  const [count, setCount] = useState(0);

  // Function reference stays stable
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  // Child only re-renders when handleClick changes
  return <ExpensiveChild onClick={handleClick} />;
}

// Combine with React.memo for best results
const ExpensiveChild = memo(function ExpensiveChild({ onClick }) {
  // expensive rendering...
});
```

### `perf-003`: Use React.memo for Pure Components | 纯组件使用 React.memo

**Priority**: MEDIUM | 优先级：中

Wrap components with React.memo when they render the same output for the same props.

当组件对相同的 props 渲染相同的输出时，使用 React.memo 包装。

**❌ Bad | 错误示例:**
```tsx
// Re-renders whenever parent renders, even with same props
function UserCard({ user }) {
  return (
    <div className="card">
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      <p>{user.bio}</p>
    </div>
  );
}
```

**✅ Good | 正确示例:**
```tsx
// Only re-renders when user prop actually changes
const UserCard = memo(function UserCard({ user }: { user: User }) {
  return (
    <div className="card">
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      <p>{user.bio}</p>
    </div>
  );
});

// With custom comparison for complex props
const UserCard = memo(
  function UserCard({ user }) {
    return <div>{/* ... */}</div>;
  },
  (prevProps, nextProps) => prevProps.user.id === nextProps.user.id
);
```

### `perf-004`: Avoid Inline Objects and Arrays in JSX | 避免在 JSX 中使用内联对象和数组

**Priority**: MEDIUM | 优先级：中

Inline objects/arrays create new references on every render, breaking memoization.

内联对象/数组在每次渲染时创建新引用，破坏记忆化。

**❌ Bad | 错误示例:**
```tsx
function Component() {
  return (
    // New object created every render
    <Child style={{ marginTop: 10 }} />

    // New array created every render
    <List items={[1, 2, 3]} />

    // New function created every render
    <Button onClick={() => handleClick()} />
  );
}
```

**✅ Good | 正确示例:**
```tsx
// Define constants outside component
const listItems = [1, 2, 3];
const cardStyle = { marginTop: 10 };

function Component() {
  // Or use useMemo for dynamic values
  const dynamicStyle = useMemo(() => ({
    marginTop: spacing,
  }), [spacing]);

  const handleButtonClick = useCallback(() => {
    handleClick();
  }, []);

  return (
    <Child style={cardStyle} />
    <List items={listItems} />
    <Button onClick={handleButtonClick} />
  );
}
```

### `perf-005`: Lazy Load Components | 懒加载组件

**Priority**: MEDIUM | 优先级：中

Use React.lazy and Suspense for code-splitting large components.

使用 React.lazy 和 Suspense 对大型组件进行代码分割。

**❌ Bad | 错误示例:**
```tsx
// All components loaded upfront
import HeavyChart from './HeavyChart';
import HeavyTable from './HeavyTable';
import HeavyEditor from './HeavyEditor';

function Dashboard() {
  return (
    <div>
      <HeavyChart />
      <HeavyTable />
      <HeavyEditor />
    </div>
  );
}
```

**✅ Good | 正确示例:**
```tsx
import { lazy, Suspense } from 'react';

// Components loaded on demand
const HeavyChart = lazy(() => import('./HeavyChart'));
const HeavyTable = lazy(() => import('./HeavyTable'));
const HeavyEditor = lazy(() => import('./HeavyEditor'));

function Dashboard() {
  return (
    <div>
      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <HeavyTable />
      </Suspense>
      <Suspense fallback={<EditorSkeleton />}>
        <HeavyEditor />
      </Suspense>
    </div>
  );
}
```

---

## 4. State Management Rules | 状态管理规则

### `state-001`: Lift State Only When Necessary | 仅在必要时提升状态

**Priority**: HIGH | 优先级：高

Keep state as close to where it's used as possible. Only lift when multiple components need it.

将状态保持在尽可能靠近使用它的地方。仅在多个组件需要时才提升。

**❌ Bad | 错误示例:**
```tsx
// State lifted too high - only SearchInput uses searchQuery
function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);

  return (
    <div>
      <Header />
      <SearchInput value={searchQuery} onChange={setSearchQuery} />
      <Results items={results} />
      <Footer />
    </div>
  );
}
```

**✅ Good | 正确示例:**
```tsx
// State kept where it's needed
function App() {
  return (
    <div>
      <Header />
      <SearchSection /> {/* Contains its own state */}
      <Footer />
    </div>
  );
}

function SearchSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);

  return (
    <>
      <SearchInput value={searchQuery} onChange={setSearchQuery} />
      <Results items={results} />
    </>
  );
}
```

### `state-002`: Use Context for Global State | 全局状态使用 Context

**Priority**: MEDIUM | 优先级：中

Use React Context for truly global state like theme, auth, or locale.

对于真正的全局状态（如主题、认证或语言环境），使用 React Context。

**❌ Bad | 错误示例:**
```tsx
// Prop drilling through many levels
function App() {
  const [theme, setTheme] = useState('light');
  return <Layout theme={theme} setTheme={setTheme} />;
}

function Layout({ theme, setTheme }) {
  return <Sidebar theme={theme} setTheme={setTheme} />;
}

function Sidebar({ theme, setTheme }) {
  return <ThemeToggle theme={theme} setTheme={setTheme} />;
}
```

**✅ Good | 正确示例:**
```tsx
// Theme context
const ThemeContext = createContext<ThemeContextType | null>(null);

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

// Clean usage anywhere in the tree
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} />;
}
```

### `state-003`: Avoid Redundant State | 避免冗余状态

**Priority**: HIGH | 优先级：高

Don't store state that can be derived from other state or props.

不要存储可以从其他状态或 props 派生的状态。

**❌ Bad | 错误示例:**
```tsx
function Cart({ items }) {
  const [cartItems, setCartItems] = useState(items);
  // Redundant! Can be derived from cartItems
  const [totalPrice, setTotalPrice] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    setTotalPrice(cartItems.reduce((sum, item) => sum + item.price, 0));
    setItemCount(cartItems.length);
  }, [cartItems]);
}
```

**✅ Good | 正确示例:**
```tsx
function Cart({ items }) {
  const [cartItems, setCartItems] = useState(items);

  // Derived values - no state needed
  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price, 0),
    [cartItems]
  );

  const itemCount = cartItems.length; // Simple derivation, no memo needed
}
```

### `state-004`: Use External State Libraries for Complex Apps | 复杂应用使用外部状态库

**Priority**: LOW | 优先级：低

For large applications with complex state requirements, consider dedicated state management libraries.

对于具有复杂状态需求的大型应用，考虑使用专用的状态管理库。

**✅ Recommended Libraries | 推荐库:**

```tsx
// Zustand - Simple and lightweight
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Jotai - Atomic state management
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
function Counter() {
  const [count, setCount] = useAtom(countAtom);
}

// TanStack Query - Server state management
import { useQuery } from '@tanstack/react-query';

function Users() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}
```

---

## 5. Next.js Specific Rules | Next.js 特定规则

### `next-001`: Use Server Components by Default | 默认使用服务器组件

**Priority**: HIGH | 优先级：高

In Next.js App Router, components are Server Components by default. Only add 'use client' when needed.

在 Next.js App Router 中，组件默认是服务器组件。仅在需要时添加 'use client'。

**❌ Bad | 错误示例:**
```tsx
// Unnecessary 'use client' - no client-side features used
'use client';

export default function StaticPage() {
  return (
    <div>
      <h1>About Us</h1>
      <p>Static content...</p>
    </div>
  );
}
```

**✅ Good | 正确示例:**
```tsx
// Server Component (default) - no directive needed
export default function StaticPage() {
  return (
    <div>
      <h1>About Us</h1>
      <p>Static content...</p>
    </div>
  );
}

// Client Component - only when using hooks/interactivity
'use client';

export default function InteractiveForm() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}
```

### `next-002`: Use Next.js Image Component | 使用 Next.js Image 组件

**Priority**: HIGH | 优先级：高

Always use next/image for automatic image optimization.

始终使用 next/image 进行自动图片优化。

**❌ Bad | 错误示例:**
```tsx
// Unoptimized images
function Gallery() {
  return (
    <div>
      <img src="/hero.jpg" alt="Hero" />
      <img src="/product.png" alt="Product" />
    </div>
  );
}
```

**✅ Good | 正确示例:**
```tsx
import Image from 'next/image';

function Gallery() {
  return (
    <div>
      <Image
        src="/hero.jpg"
        alt="Hero"
        width={1200}
        height={600}
        priority // For above-the-fold images
      />
      <Image
        src="/product.png"
        alt="Product"
        width={400}
        height={400}
        placeholder="blur"
        blurDataURL={shimmer}
      />
    </div>
  );
}
```

### `next-003`: Proper Data Fetching Patterns | 正确的数据获取模式

**Priority**: HIGH | 优先级：高

Use appropriate data fetching methods based on your needs.

根据需求使用适当的数据获取方法。

**✅ Good | 正确示例:**
```tsx
// Server Component - fetch directly
async function ProductPage({ params }: { params: { id: string } }) {
  const product = await fetch(`/api/products/${params.id}`).then(r => r.json());

  return <ProductDetails product={product} />;
}

// With caching options
async function Products() {
  const products = await fetch('/api/products', {
    next: { revalidate: 3600 } // Revalidate every hour
  }).then(r => r.json());

  return <ProductList products={products} />;
}

// Client-side with TanStack Query
'use client';

function ProductSearch() {
  const [query, setQuery] = useState('');
  const { data } = useQuery({
    queryKey: ['products', query],
    queryFn: () => searchProducts(query),
    enabled: query.length > 2,
  });

  return <SearchResults results={data} />;
}
```

---

## Quick Reference | 快速参考

| Rule | Priority | Description |
|------|----------|-------------|
| `react-001` | CRITICAL | Use functional components |
| `react-002` | HIGH | Single responsibility principle |
| `react-003` | HIGH | Composition over inheritance |
| `hooks-001` | CRITICAL | Always specify dependencies |
| `hooks-002` | HIGH | Custom hooks for reusable logic |
| `hooks-003` | CRITICAL | No hooks in conditions/loops |
| `perf-001` | HIGH | useMemo for expensive computations |
| `perf-002` | HIGH | useCallback for callbacks |
| `perf-003` | MEDIUM | React.memo for pure components |
| `perf-005` | MEDIUM | Lazy load components |
| `state-001` | HIGH | Lift state only when necessary |
| `state-002` | MEDIUM | Context for global state |
| `state-003` | HIGH | Avoid redundant state |
| `next-001` | HIGH | Server Components by default |
| `next-002` | HIGH | Use Next.js Image |

---

## Integration | 集成

This skill works best with:

- ESLint with eslint-plugin-react-hooks
- TypeScript for type safety
- React DevTools for debugging
- Lighthouse for performance auditing

本技能最适合与以下工具配合使用：

- 带有 eslint-plugin-react-hooks 的 ESLint
- TypeScript 用于类型安全
- React DevTools 用于调试
- Lighthouse 用于性能审计
