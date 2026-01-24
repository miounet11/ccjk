---
name: react-patterns
description: React 18+ hooks, patterns, and performance optimization techniques
description_zh: React 18+ 钩子、模式和性能优化技术
version: 1.0.0
category: frontend
triggers: ['/react-patterns', '/react', '/hooks', '/react-performance']
use_when:
  - Building React 18+ applications with modern patterns
  - Implementing custom hooks and component composition
  - Optimizing React performance and bundle size
  - Code review for React components
use_when_zh:
  - 使用现代模式构建 React 18+ 应用程序
  - 实现自定义钩子和组件组合
  - 优化 React 性能和包大小
  - React 组件代码审查
auto_activate: true
priority: 8
agents: [react-expert, frontend-architect]
tags: [react, hooks, performance, patterns, components]
---

# React Patterns | React 模式

## Context | 上下文

Use this skill when developing React 18+ applications that require modern patterns, optimal performance, and maintainable component architecture. Essential for scalable React development.

在开发需要现代模式、最佳性能和可维护组件架构的 React 18+ 应用程序时使用此技能。对于可扩展的 React 开发至关重要。

## Best Practices | 最佳实践

### 1. Modern Hook Patterns | 现代钩子模式

```tsx
// ✅ Good: Custom hook with proper cleanup
function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(url, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}

// ✅ Good: Compound hook pattern
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}
```

### 2. Component Composition Patterns | 组件组合模式

```tsx
// ✅ Good: Compound component pattern
interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

function Tabs({ children, defaultTab }: { children: React.ReactNode; defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: React.ReactNode }) {
  return <div className="tab-list" role="tablist">{children}</div>;
}

function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');

  const { activeTab, setActiveTab } = context;

  return (
    <button
      role="tab"
      aria-selected={activeTab === id}
      onClick={() => setActiveTab(id)}
      className={`tab ${activeTab === id ? 'active' : ''}`}
    >
      {children}
    </button>
  );
}

function TabPanels({ children }: { children: React.ReactNode }) {
  return <div className="tab-panels">{children}</div>;
}

function TabPanel({ id, children }: { id: string; children: React.ReactNode }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');

  const { activeTab } = context;

  if (activeTab !== id) return null;

  return (
    <div role="tabpanel" className="tab-panel">
      {children}
    </div>
  );
}

// Attach sub-components
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panels = TabPanels;
Tabs.Panel = TabPanel;

// Usage
function App() {
  return (
    <Tabs defaultTab="tab1">
      <Tabs.List>
        <Tabs.Tab id="tab1">Tab 1</Tabs.Tab>
        <Tabs.Tab id="tab2">Tab 2</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panels>
        <Tabs.Panel id="tab1">Content 1</Tabs.Panel>
        <Tabs.Panel id="tab2">Content 2</Tabs.Panel>
      </Tabs.Panels>
    </Tabs>
  );
}
```

### 3. Render Props and Higher-Order Components | 渲染属性和高阶组件

```tsx
// ✅ Good: Render props pattern
interface MousePosition {
  x: number;
  y: number;
}

function MouseTracker({
  children
}: {
  children: (position: MousePosition) => React.ReactNode
}) {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      setPosition({ x: event.clientX, y: event.clientY });
    }

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return <>{children(position)}</>;
}

// Usage
function App() {
  return (
    <MouseTracker>
      {({ x, y }) => (
        <div>Mouse position: {x}, {y}</div>
      )}
    </MouseTracker>
  );
}

// ✅ Good: HOC with proper TypeScript support
function withLoading<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WithLoadingComponent(
    props: P & { loading?: boolean }
  ) {
    const { loading, ...restProps } = props;

    if (loading) {
      return <div className="loading">Loading...</div>;
    }

    return <Component {...(restProps as P)} />;
  };
}

// Usage
const UserListWithLoading = withLoading(UserList);
```

## Performance Optimization | 性能优化

### 1. Memoization Patterns | 记忆化模式

```tsx
// ✅ Good: Proper useMemo usage
function ExpensiveComponent({ items, filter }: { items: Item[]; filter: string }) {
  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [items, filter]);

  const expensiveValue = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + item.value, 0);
  }, [filteredItems]);

  return (
    <div>
      <div>Total: {expensiveValue}</div>
      {filteredItems.map(item => (
        <ItemComponent key={item.id} item={item} />
      ))}
    </div>
  );
}

// ✅ Good: useCallback for event handlers
function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
  const handleToggle = useCallback((id: string) => {
    onToggle(id);
  }, [onToggle]);

  const handleDelete = useCallback((id: string) => {
    onDelete(id);
  }, [onDelete]);

  return (
    <ul>
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      ))}
    </ul>
  );
}

// ✅ Good: React.memo with custom comparison
const TodoItem = React.memo(function TodoItem({
  todo,
  onToggle,
  onDelete
}: TodoItemProps) {
  return (
    <li>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <span>{todo.text}</span>
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </li>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.todo.id === nextProps.todo.id &&
    prevProps.todo.completed === nextProps.todo.completed &&
    prevProps.todo.text === nextProps.todo.text
  );
});
```

### 2. Code Splitting and Lazy Loading | 代码分割和懒加载

```tsx
// ✅ Good: Route-based code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const UserPage = lazy(() => import('./pages/UserPage'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/user/:id" element={<UserPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

// ✅ Good: Component-based lazy loading
function LazyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [ModalComponent, setModalComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (isOpen && !ModalComponent) {
      import('./Modal').then(module => {
        setModalComponent(() => module.default);
      });
    }
  }, [isOpen, ModalComponent]);

  if (!isOpen || !ModalComponent) return null;

  return <ModalComponent onClose={onClose} />;
}
```

### 3. State Management Patterns | 状态管理模式

```tsx
// ✅ Good: useReducer for complex state
interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  loading: boolean;
}

type TodoAction =
  | { type: 'ADD_TODO'; payload: { text: string } }
  | { type: 'TOGGLE_TODO'; payload: { id: string } }
  | { type: 'DELETE_TODO'; payload: { id: string } }
  | { type: 'SET_FILTER'; payload: { filter: TodoState['filter'] } }
  | { type: 'SET_LOADING'; payload: { loading: boolean } };

function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: crypto.randomUUID(),
            text: action.payload.text,
            completed: false,
            createdAt: new Date()
          }
        ]
      };

    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload.id
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      };

    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter(todo => todo.id !== action.payload.id)
      };

    case 'SET_FILTER':
      return {
        ...state,
        filter: action.payload.filter
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload.loading
      };

    default:
      return state;
  }
}

function TodoApp() {
  const [state, dispatch] = useReducer(todoReducer, {
    todos: [],
    filter: 'all',
    loading: false
  });

  const addTodo = useCallback((text: string) => {
    dispatch({ type: 'ADD_TODO', payload: { text } });
  }, []);

  const toggleTodo = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_TODO', payload: { id } });
  }, []);

  return (
    <div>
      <TodoInput onAdd={addTodo} />
      <TodoList
        todos={state.todos}
        filter={state.filter}
        onToggle={toggleTodo}
      />
    </div>
  );
}
```

## Anti-Patterns | 反模式

### 1. Avoid Unnecessary Re-renders | 避免不必要的重新渲染

```tsx
// ❌ Bad: Creating objects in render
function BadComponent({ items }: { items: Item[] }) {
  return (
    <div>
      {items.map(item => (
        <ItemComponent
          key={item.id}
          item={item}
          style={{ color: 'red' }} // New object every render!
          onClick={() => console.log(item.id)} // New function every render!
        />
      ))}
    </div>
  );
}

// ✅ Good: Stable references
const itemStyle = { color: 'red' };

function GoodComponent({ items }: { items: Item[] }) {
  const handleClick = useCallback((id: string) => {
    console.log(id);
  }, []);

  return (
    <div>
      {items.map(item => (
        <ItemComponent
          key={item.id}
          item={item}
          style={itemStyle}
          onClick={() => handleClick(item.id)}
        />
      ))}
    </div>
  );
}
```

### 2. Avoid Prop Drilling | 避免属性钻取

```tsx
// ❌ Bad: Prop drilling
function App() {
  const [user, setUser] = useState<User | null>(null);

  return <Layout user={user} setUser={setUser} />;
}

function Layout({ user, setUser }: { user: User | null; setUser: (user: User | null) => void }) {
  return (
    <div>
      <Header user={user} setUser={setUser} />
      <Main user={user} />
    </div>
  );
}

function Header({ user, setUser }: { user: User | null; setUser: (user: User | null) => void }) {
  return <UserMenu user={user} setUser={setUser} />;
}

// ✅ Good: Context API
const UserContext = createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
} | null>(null);

function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}

function App() {
  return (
    <UserProvider>
      <Layout />
    </UserProvider>
  );
}

function UserMenu() {
  const { user, setUser } = useUser();
  // Use user and setUser directly
}
```

### 3. Avoid Mutating State | 避免状态突变

```tsx
// ❌ Bad: Mutating state directly
function BadTodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);

  const addTodo = (text: string) => {
    todos.push({ id: Date.now(), text, completed: false }); // Mutation!
    setTodos(todos); // Won't trigger re-render
  };

  const toggleTodo = (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed; // Mutation!
      setTodos(todos); // Won't trigger re-render
    }
  };

  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id} onClick={() => toggleTodo(todo.id)}>
          {todo.text}
        </div>
      ))}
    </div>
  );
}

// ✅ Good: Immutable updates
function GoodTodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);

  const addTodo = useCallback((text: string) => {
    setTodos(prev => [
      ...prev,
      { id: Date.now(), text, completed: false }
    ]);
  }, []);

  const toggleTodo = useCallback((id: number) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id
        ? { ...todo, completed: !todo.completed }
        : todo
    ));
  }, []);

  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id} onClick={() => toggleTodo(todo.id)}>
          {todo.text}
        </div>
      ))}
    </div>
  );
}
```

## Testing Patterns | 测试模式

```tsx
// ✅ Good: Testing custom hooks
import { renderHook, act } from '@testing-library/react';

describe('useCounter', () => {
  test('should increment counter', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});

// ✅ Good: Testing components with context
function renderWithUserContext(ui: React.ReactElement, { user = null } = {}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <UserContext.Provider value={{ user, setUser: jest.fn() }}>
      {children}
    </UserContext.Provider>
  );

  return render(ui, { wrapper: Wrapper });
}

test('should display user name when logged in', () => {
  const user = { id: '1', name: 'John Doe' };
  renderWithUserContext(<UserProfile />, { user });

  expect(screen.getByText('John Doe')).toBeInTheDocument();
});
```

## Performance Checklist | 性能检查清单

- [ ] Components are properly memoized with React.memo
- [ ] Expensive calculations use useMemo
- [ ] Event handlers use useCallback
- [ ] Large lists implement virtualization
- [ ] Images are optimized and lazy-loaded
- [ ] Code splitting is implemented for routes
- [ ] Bundle size is monitored and optimized
- [ ] Unnecessary re-renders are eliminated
- [ ] State is lifted only when necessary
- [ ] Context providers are optimized to prevent cascading updates

## 性能检查清单

- [ ] 组件使用 React.memo 正确记忆化
- [ ] 昂贵的计算使用 useMemo
- [ ] 事件处理程序使用 useCallback
- [ ] 大型列表实现虚拟化
- [ ] 图像经过优化并懒加载
- [ ] 为路由实现代码分割
- [ ] 监控和优化包大小
- [ ] 消除不必要的重新渲染
- [ ] 仅在必要时提升状态
- [ ] 优化上下文提供者以防止级联更新