# Vue 3 Best Practices | Vue 3 最佳实践

A comprehensive skill for Vue 3 development best practices, covering Composition API, reactivity system, component design, performance optimization, and Pinia state management.

一个全面的 Vue 3 开发最佳实践技能，涵盖 Composition API、响应式系统、组件设计、性能优化和 Pinia 状态管理。

## When to Apply | 何时应用

- When creating new Vue 3 components | 创建新的 Vue 3 组件时
- When refactoring Vue 2 Options API to Composition API | 将 Vue 2 Options API 重构为 Composition API 时
- When reviewing Vue code | 审查 Vue 代码时
- When optimizing Vue application performance | 优化 Vue 应用性能时
- When implementing state management with Pinia | 使用 Pinia 实现状态管理时
- When designing component architecture | 设计组件架构时

## Overview | 概述

This skill provides guidelines and rules for writing high-quality Vue 3 code. It emphasizes the Composition API with `<script setup>`, proper reactivity patterns, component design principles, and performance best practices.

本技能提供编写高质量 Vue 3 代码的指南和规则。重点强调使用 `<script setup>` 的 Composition API、正确的响应式模式、组件设计原则和性能最佳实践。

---

## Composition API Rules | Composition API 规则

### `vue-001`: Use `<script setup>` Syntax | 使用 `<script setup>` 语法

**Priority**: CRITICAL | **优先级**: 关键

Always prefer `<script setup>` for cleaner, more performant code.

始终优先使用 `<script setup>` 以获得更简洁、更高性能的代码。

**❌ Bad | 错误示例:**
```vue
<script>
import { ref, computed } from 'vue'
import MyComponent from './MyComponent.vue'

export default {
  components: { MyComponent },
  setup() {
    const count = ref(0)
    const double = computed(() => count.value * 2)

    return { count, double }
  }
}
</script>
```

**✅ Good | 正确示例:**
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import MyComponent from './MyComponent.vue'

const count = ref(0)
const double = computed(() => count.value * 2)
</script>
```

### `vue-002`: Define Props with TypeScript | 使用 TypeScript 定义 Props

**Priority**: HIGH | **优先级**: 高

Use `defineProps` with TypeScript for type-safe props.

使用 `defineProps` 配合 TypeScript 实现类型安全的 props。

**❌ Bad | 错误示例:**
```vue
<script setup>
const props = defineProps({
  title: String,
  count: Number,
  items: Array
})
</script>
```

**✅ Good | 正确示例:**
```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
  items: string[]
}

const props = withDefaults(defineProps<Props>(), {
  count: 0
})
</script>
```

### `vue-003`: Define Emits with TypeScript | 使用 TypeScript 定义 Emits

**Priority**: HIGH | **优先级**: 高

Use typed `defineEmits` for type-safe event emissions.

使用类型化的 `defineEmits` 实现类型安全的事件发射。

**❌ Bad | 错误示例:**
```vue
<script setup>
const emit = defineEmits(['update', 'delete', 'submit'])

emit('update', data) // No type checking
</script>
```

**✅ Good | 正确示例:**
```vue
<script setup lang="ts">
interface Emits {
  (e: 'update', id: number, value: string): void
  (e: 'delete', id: number): void
  (e: 'submit', payload: FormData): void
}

const emit = defineEmits<Emits>()

emit('update', 1, 'new value') // Type checked!
</script>
```

### `vue-004`: Extract Composables for Reusable Logic | 提取可复用逻辑为 Composables

**Priority**: HIGH | **优先级**: 高

Extract reusable logic into composable functions (use* naming convention).

将可复用逻辑提取为 composable 函数（使用 use* 命名约定）。

**❌ Bad | 错误示例:**
```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// Logic mixed in component
const x = ref(0)
const y = ref(0)

function updateMouse(e: MouseEvent) {
  x.value = e.pageX
  y.value = e.pageY
}

onMounted(() => window.addEventListener('mousemove', updateMouse))
onUnmounted(() => window.removeEventListener('mousemove', updateMouse))
</script>
```

**✅ Good | 正确示例:**
```ts
// composables/useMouse.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  function update(e: MouseEvent) {
    x.value = e.pageX
    y.value = e.pageY
  }

  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  return { x, y }
}
```

```vue
<script setup lang="ts">
import { useMouse } from '@/composables/useMouse'

const { x, y } = useMouse()
</script>
```

---

## Reactivity Rules | 响应式数据规则

### `vue-005`: Use `ref` for Primitives, `reactive` for Objects | 基本类型用 `ref`，对象用 `reactive`

**Priority**: HIGH | **优先级**: 高

Use `ref` for primitive values and `reactive` for objects. Prefer `ref` for consistency.

基本类型使用 `ref`，对象使用 `reactive`。为保持一致性，推荐优先使用 `ref`。

**❌ Bad | 错误示例:**
```vue
<script setup lang="ts">
import { reactive } from 'vue'

// Don't use reactive for primitives
const count = reactive({ value: 0 }) // Overcomplicated

// Don't reassign reactive objects
let state = reactive({ name: 'Vue' })
state = reactive({ name: 'React' }) // Loses reactivity!
</script>
```

**✅ Good | 正确示例:**
```vue
<script setup lang="ts">
import { ref, reactive } from 'vue'

// Use ref for primitives
const count = ref(0)
const name = ref('Vue')

// Use reactive for complex objects (if needed)
const state = reactive({
  user: { name: 'John', age: 30 },
  settings: { theme: 'dark' }
})

// Or use ref for everything (recommended for consistency)
const user = ref({ name: 'John', age: 30 })
</script>
```

### `vue-006`: Avoid Destructuring Reactive Objects | 避免解构响应式对象

**Priority**: CRITICAL | **优先级**: 关键

Never destructure reactive objects directly - use `toRefs` or `storeToRefs`.

永远不要直接解构响应式对象 - 使用 `toRefs` 或 `storeToRefs`。

**❌ Bad | 错误示例:**
```vue
<script setup lang="ts">
import { reactive } from 'vue'

const state = reactive({ count: 0, name: 'Vue' })

// Loses reactivity!
const { count, name } = state
</script>
```

**✅ Good | 正确示例:**
```vue
<script setup lang="ts">
import { reactive, toRefs } from 'vue'

const state = reactive({ count: 0, name: 'Vue' })

// Preserves reactivity
const { count, name } = toRefs(state)
</script>
```

### `vue-007`: Use `computed` for Derived State | 使用 `computed` 处理派生状态

**Priority**: HIGH | **优先级**: 高

Always use `computed` for values derived from reactive state.

始终使用 `computed` 处理从响应式状态派生的值。

**❌ Bad | 错误示例:**
```vue
<script setup lang="ts">
import { ref, watch } from 'vue'

const firstName = ref('John')
const lastName = ref('Doe')
const fullName = ref('')

// Don't use watch for derived values
watch([firstName, lastName], () => {
  fullName.value = `${firstName.value} ${lastName.value}`
}, { immediate: true })
</script>
```

**✅ Good | 正确示例:**
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const firstName = ref('John')
const lastName = ref('Doe')

// Use computed for derived values
const fullName = computed(() => `${firstName.value} ${lastName.value}`)
</script>
```

### `vue-008`: Use `shallowRef` for Large Objects | 大对象使用 `shallowRef`

**Priority**: MEDIUM | **优先级**: 中

Use `shallowRef` for large objects that don't need deep reactivity.

对于不需要深层响应式的大对象，使用 `shallowRef`。

**❌ Bad | 错误示例:**
```vue
<script setup lang="ts">
import { ref } from 'vue'

// Deep reactivity for large data is expensive
const largeList = ref(generateLargeDataset()) // 10000+ items
</script>
```

**✅ Good | 正确示例:**
```vue
<script setup lang="ts">
import { shallowRef, triggerRef } from 'vue'

// Shallow reactivity for large data
const largeList = shallowRef(generateLargeDataset())

function updateItem(index: number, value: any) {
  largeList.value[index] = value
  triggerRef(largeList) // Manually trigger update
}
</script>
```

---

## Component Design Rules | 组件设计规则

### `vue-009`: Single Responsibility Components | 单一职责组件

**Priority**: HIGH | **优先级**: 高

Each component should have a single, well-defined responsibility.

每个组件应该有单一、明确的职责。

**❌ Bad | 错误示例:**
```vue
<!-- UserDashboard.vue - Does too much -->
<script setup lang="ts">
// Handles user profile, settings, notifications, and analytics
const user = ref(null)
const settings = ref({})
const notifications = ref([])
const analytics = ref({})

// 200+ lines of mixed logic...
</script>
```

**✅ Good | 正确示例:**
```vue
<!-- UserDashboard.vue - Composition of focused components -->
<template>
  <div class="dashboard">
    <UserProfile :user="user" />
    <UserSettings :settings="settings" @update="updateSettings" />
    <NotificationList :notifications="notifications" />
    <AnalyticsChart :data="analytics" />
  </div>
</template>

<script setup lang="ts">
import UserProfile from './UserProfile.vue'
import UserSettings from './UserSettings.vue'
import NotificationList from './NotificationList.vue'
import AnalyticsChart from './AnalyticsChart.vue'

// Each child component handles its own logic
</script>
```

### `vue-010`: Use `v-model` with Custom Components | 自定义组件使用 `v-model`

**Priority**: MEDIUM | **优先级**: 中

Implement proper `v-model` support for form-like components.

为表单类组件实现正确的 `v-model` 支持。

**❌ Bad | 错误示例:**
```vue
<!-- CustomInput.vue -->
<script setup lang="ts">
const props = defineProps<{ value: string }>()
const emit = defineEmits<{ (e: 'input', value: string): void }>()
</script>

<template>
  <input :value="value" @input="emit('input', $event.target.value)" />
</template>
```

**✅ Good | 正确示例:**
```vue
<!-- CustomInput.vue -->
<script setup lang="ts">
const model = defineModel<string>({ required: true })
</script>

<template>
  <input v-model="model" />
</template>

<!-- Usage -->
<!-- <CustomInput v-model="username" /> -->
```

### `vue-011`: Provide/Inject for Deep Props | 深层 Props 使用 Provide/Inject

**Priority**: MEDIUM | **优先级**: 中

Use `provide`/`inject` to avoid prop drilling through many levels.

使用 `provide`/`inject` 避免多层级的 prop 传递。

**❌ Bad | 错误示例:**
```vue
<!-- Prop drilling through 4+ levels -->
<GrandParent :theme="theme">
  <Parent :theme="theme">
    <Child :theme="theme">
      <GrandChild :theme="theme" />
    </Child>
  </Parent>
</GrandParent>
```

**✅ Good | 正确示例:**
```vue
<!-- ThemeProvider.vue -->
<script setup lang="ts">
import { provide, ref } from 'vue'
import type { InjectionKey } from 'vue'

export interface ThemeContext {
  theme: Ref<'light' | 'dark'>
  toggleTheme: () => void
}

export const ThemeKey: InjectionKey<ThemeContext> = Symbol('theme')

const theme = ref<'light' | 'dark'>('light')
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

provide(ThemeKey, { theme, toggleTheme })
</script>

<!-- DeepChild.vue -->
<script setup lang="ts">
import { inject } from 'vue'
import { ThemeKey } from './ThemeProvider.vue'

const { theme, toggleTheme } = inject(ThemeKey)!
</script>
```

---

## Performance Optimization Rules | 性能优化规则

### `vue-012`: Use `v-once` for Static Content | 静态内容使用 `v-once`

**Priority**: MEDIUM | **优先级**: 中

Use `v-once` for content that never changes after initial render.

对于初次渲染后永不改变的内容使用 `v-once`。

**❌ Bad | 错误示例:**
```vue
<template>
  <!-- Re-renders on every update -->
  <header>
    <h1>{{ appTitle }}</h1>
    <p>{{ staticDescription }}</p>
  </header>
</template>
```

**✅ Good | 正确示例:**
```vue
<template>
  <!-- Renders only once -->
  <header v-once>
    <h1>{{ appTitle }}</h1>
    <p>{{ staticDescription }}</p>
  </header>
</template>
```

### `vue-013`: Use `v-memo` for Expensive Lists | 昂贵列表使用 `v-memo`

**Priority**: MEDIUM | **优先级**: 中

Use `v-memo` to skip re-rendering of list items when dependencies haven't changed.

使用 `v-memo` 在依赖未改变时跳过列表项的重新渲染。

**❌ Bad | 错误示例:**
```vue
<template>
  <div v-for="item in list" :key="item.id">
    <ExpensiveComponent :data="item" />
  </div>
</template>
```

**✅ Good | 正确示例:**
```vue
<template>
  <div v-for="item in list" :key="item.id" v-memo="[item.id, item.updated]">
    <ExpensiveComponent :data="item" />
  </div>
</template>
```

### `vue-014`: Lazy Load Components | 懒加载组件

**Priority**: HIGH | **优先级**: 高

Use `defineAsyncComponent` for components not needed on initial load.

对于初始加载不需要的组件使用 `defineAsyncComponent`。

**❌ Bad | 错误示例:**
```vue
<script setup lang="ts">
import HeavyChart from './HeavyChart.vue'
import AdminPanel from './AdminPanel.vue'
import SettingsModal from './SettingsModal.vue'

// All loaded upfront, even if not used
</script>
```

**✅ Good | 正确示例:**
```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const HeavyChart = defineAsyncComponent(() =>
  import('./HeavyChart.vue')
)

const AdminPanel = defineAsyncComponent({
  loader: () => import('./AdminPanel.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200,
  errorComponent: ErrorDisplay,
  timeout: 3000
})
</script>
```

### `vue-015`: Use `watchEffect` Cleanup | 使用 `watchEffect` 清理

**Priority**: HIGH | **优先级**: 高

Always clean up side effects in `watchEffect` and `watch`.

始终在 `watchEffect` 和 `watch` 中清理副作用。

**❌ Bad | 错误示例:**
```vue
<script setup lang="ts">
import { watchEffect } from 'vue'

watchEffect(() => {
  const timer = setInterval(() => {
    // Do something
  }, 1000)
  // Memory leak! Timer never cleared
})
</script>
```

**✅ Good | 正确示例:**
```vue
<script setup lang="ts">
import { watchEffect } from 'vue'

watchEffect((onCleanup) => {
  const timer = setInterval(() => {
    // Do something
  }, 1000)

  onCleanup(() => clearInterval(timer))
})
</script>
```

### `vue-016`: Virtual Scrolling for Long Lists | 长列表使用虚拟滚动

**Priority**: HIGH | **优先级**: 高

Use virtual scrolling for lists with 100+ items.

对于 100+ 项的列表使用虚拟滚动。

**❌ Bad | 错误示例:**
```vue
<template>
  <!-- Renders all 10000 items -->
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>
</template>
```

**✅ Good | 正确示例:**
```vue
<template>
  <!-- Only renders visible items -->
  <VirtualList
    :items="items"
    :item-height="50"
    :visible-items="20"
  >
    <template #default="{ item }">
      {{ item.name }}
    </template>
  </VirtualList>
</template>

<script setup lang="ts">
// Or use libraries like vue-virtual-scroller
import { RecycleScroller } from 'vue-virtual-scroller'
</script>
```

---

## Pinia State Management Rules | Pinia 状态管理规则

### `vue-017`: Use Setup Stores Syntax | 使用 Setup Stores 语法

**Priority**: HIGH | **优先级**: 高

Prefer Setup Stores syntax for better TypeScript support and flexibility.

优先使用 Setup Stores 语法以获得更好的 TypeScript 支持和灵活性。

**❌ Bad | 错误示例:**
```ts
// stores/user.ts - Options syntax
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    isLoggedIn: false
  }),
  getters: {
    greeting: (state) => `Hello, ${state.name}`
  },
  actions: {
    login(name: string) {
      this.name = name
      this.isLoggedIn = true
    }
  }
})
```

**✅ Good | 正确示例:**
```ts
// stores/user.ts - Setup syntax
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // State
  const name = ref('')
  const isLoggedIn = ref(false)

  // Getters
  const greeting = computed(() => `Hello, ${name.value}`)

  // Actions
  function login(userName: string) {
    name.value = userName
    isLoggedIn.value = true
  }

  function logout() {
    name.value = ''
    isLoggedIn.value = false
  }

  return {
    name,
    isLoggedIn,
    greeting,
    login,
    logout
  }
})
```

### `vue-018`: Use `storeToRefs` for Destructuring | 解构时使用 `storeToRefs`

**Priority**: CRITICAL | **优先级**: 关键

Always use `storeToRefs` when destructuring store state/getters.

解构 store 的 state/getters 时始终使用 `storeToRefs`。

**❌ Bad | 错误示例:**
```vue
<script setup lang="ts">
import { useUserStore } from '@/stores/user'

const store = useUserStore()

// Loses reactivity!
const { name, isLoggedIn, greeting } = store
</script>
```

**✅ Good | 正确示例:**
```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'

const store = useUserStore()

// Preserves reactivity for state and getters
const { name, isLoggedIn, greeting } = storeToRefs(store)

// Actions can be destructured directly
const { login, logout } = store
</script>
```

### `vue-019`: Organize Stores by Domain | 按领域组织 Stores

**Priority**: MEDIUM | **优先级**: 中

Create separate stores for different domains/features.

为不同的领域/功能创建独立的 stores。

**❌ Bad | 错误示例:**
```ts
// stores/main.ts - One giant store
export const useMainStore = defineStore('main', () => {
  // User state
  const user = ref(null)
  // Cart state
  const cart = ref([])
  // UI state
  const sidebarOpen = ref(false)
  // Settings
  const theme = ref('light')
  // ... 500 more lines
})
```

**✅ Good | 正确示例:**
```ts
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const isAuthenticated = computed(() => !!user.value)
  // User-specific logic
  return { user, isAuthenticated }
})

// stores/cart.ts
export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const total = computed(() => items.value.reduce((sum, i) => sum + i.price, 0))
  // Cart-specific logic
  return { items, total }
})

// stores/ui.ts
export const useUIStore = defineStore('ui', () => {
  const sidebarOpen = ref(false)
  const theme = ref<'light' | 'dark'>('light')
  // UI-specific logic
  return { sidebarOpen, theme }
})
```

### `vue-020`: Handle Async Actions Properly | 正确处理异步 Actions

**Priority**: HIGH | **优先级**: 高

Handle loading states, errors, and cancellation in async actions.

在异步 actions 中处理加载状态、错误和取消。

**❌ Bad | 错误示例:**
```ts
export const useUserStore = defineStore('user', () => {
  const user = ref(null)

  async function fetchUser(id: string) {
    // No loading state, no error handling
    const response = await fetch(`/api/users/${id}`)
    user.value = await response.json()
  }

  return { user, fetchUser }
})
```

**✅ Good | 正确示例:**
```ts
export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchUser(id: string) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`/api/users/${id}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      user.value = await response.json()
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Unknown error')
      user.value = null
    } finally {
      loading.value = false
    }
  }

  function $reset() {
    user.value = null
    loading.value = false
    error.value = null
  }

  return {
    user,
    loading,
    error,
    fetchUser,
    $reset
  }
})
```

---

## Template Best Practices | 模板最佳实践

### `vue-021`: Use Template Refs Properly | 正确使用模板引用

**Priority**: MEDIUM | **优先级**: 中

Use typed template refs with proper null checking.

使用类型化的模板引用并进行正确的空值检查。

**❌ Bad | 错误示例:**
```vue
<script setup>
import { ref, onMounted } from 'vue'

const inputRef = ref()

onMounted(() => {
  inputRef.value.focus() // May be null!
})
</script>

<template>
  <input ref="inputRef" />
</template>
```

**✅ Good | 正确示例:**
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  inputRef.value?.focus()
})

function focusInput() {
  if (inputRef.value) {
    inputRef.value.focus()
  }
}
</script>

<template>
  <input ref="inputRef" />
</template>
```

### `vue-022`: Prefer `v-show` for Frequent Toggles | 频繁切换优先使用 `v-show`

**Priority**: MEDIUM | **优先级**: 中

Use `v-show` for elements that toggle frequently, `v-if` for conditional rendering.

频繁切换的元素使用 `v-show`，条件渲染使用 `v-if`。

**❌ Bad | 错误示例:**
```vue
<template>
  <!-- Expensive re-creation on every toggle -->
  <HeavyComponent v-if="isVisible" />

  <!-- Unnecessary DOM presence -->
  <RarelyShownModal v-show="showModal" />
</template>
```

**✅ Good | 正确示例:**
```vue
<template>
  <!-- Keeps DOM, just toggles display -->
  <HeavyComponent v-show="isVisible" />

  <!-- Removes from DOM when not needed -->
  <RarelyShownModal v-if="showModal" />
</template>
```

---

## Workflow | 工作流程

### Step 1: Analyze Project Structure | 分析项目结构

```bash
# Check Vue version and dependencies
cat package.json | grep -E '"vue"|"pinia"|"vue-router"'

# Find Vue components
find src -name "*.vue" | head -20

# Check for Composition API usage
grep -r "setup()" src --include="*.vue" | wc -l
grep -r "<script setup" src --include="*.vue" | wc -l
```

### Step 2: Review Component Patterns | 审查组件模式

- Check for proper `<script setup>` usage
- Verify TypeScript integration
- Review props and emits definitions
- Check composables organization

### Step 3: Analyze Reactivity Usage | 分析响应式使用

- Verify `ref` vs `reactive` usage
- Check for reactivity loss (destructuring)
- Review computed properties
- Check watch/watchEffect cleanup

### Step 4: Review State Management | 审查状态管理

- Check Pinia store organization
- Verify `storeToRefs` usage
- Review async action handling
- Check for proper store composition

### Step 5: Performance Audit | 性能审计

- Check for lazy-loaded components
- Review list rendering optimization
- Check for unnecessary re-renders
- Verify proper cleanup in effects

---

## Integration | 集成

This skill works best with:

- **ESLint Vue Plugin** - Automated rule enforcement | 自动规则执行
- **Volar** - Vue 3 IDE support | Vue 3 IDE 支持
- **Vue DevTools** - Runtime debugging | 运行时调试
- **Vitest** - Unit testing | 单元测试
- **Playwright/Cypress** - E2E testing | 端到端测试

## References | 参考资料

- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vue Style Guide](https://vuejs.org/style-guide/)
- [VueUse](https://vueuse.org/) - Collection of Vue Composition Utilities
