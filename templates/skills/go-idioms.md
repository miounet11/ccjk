---
name: go-idioms
description: Go language conventions, error handling patterns, and idiomatic Go code
description_zh: Go 语言约定、错误处理模式和惯用 Go 代码
version: 1.0.0
category: programming
triggers: ['/go-idioms', '/golang', '/go-patterns', '/go-best-practices']
use_when:
  - Writing idiomatic Go code following community conventions
  - Implementing proper error handling and interface design
  - Optimizing Go performance and memory usage
  - Code review for Go projects
use_when_zh:
  - 编写遵循社区约定的惯用 Go 代码
  - 实现适当的错误处理和接口设计
  - 优化 Go 性能和内存使用
  - Go 项目代码审查
auto_activate: true
priority: 8
agents: [go-expert, systems-programmer]
tags: [golang, idioms, error-handling, interfaces, performance]
---

# Go Idioms | Go 惯用法

## Context | 上下文

Use this skill when writing Go code that follows community conventions, implements proper error handling, and leverages Go's unique features like goroutines and interfaces effectively.

在编写遵循社区约定、实现适当错误处理并有效利用 Go 独特功能（如 goroutines 和接口）的 Go 代码时使用此技能。

## Go Conventions and Style | Go 约定和风格

### 1. Naming Conventions | 命名约定

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "time"
)

// ✅ Good: Proper Go naming conventions

// Constants: CamelCase for exported, camelCase for unexported
const (
    MaxRetries = 3
    defaultTimeout = 30 * time.Second
)

// Variables: CamelCase for exported, camelCase for unexported
var (
    ErrNotFound = errors.New("not found")
    logger      = log.New(os.Stdout, "app: ", log.LstdFlags)
)

// Types: CamelCase for exported, camelCase for unexported
type UserService struct {
    db     Database
    cache  Cache
    logger *log.Logger
}

type userRepository struct {
    conn *sql.DB
}

// Interfaces: Often end with -er suffix
type Reader interface {
    Read([]byte) (int, error)
}

type UserFinder interface {
    FindByID(ctx context.Context, id string) (*User, error)
}

// Functions: CamelCase for exported, camelCase for unexported
func NewUserService(db Database, cache Cache) *UserService {
    return &UserService{
        db:     db,
        cache:  cache,
        logger: log.New(os.Stdout, "user-service: ", log.LstdFlags),
    }
}

func (s *UserService) CreateUser(ctx context.Context, user *User) error {
    return s.createUser(ctx, user)
}

func (s *UserService) createUser(ctx context.Context, user *User) error {
    // Implementation
    return nil
}

// ❌ Bad: Non-idiomatic naming
type user_service struct{}  // Should be userService
func Get_User() {}          // Should be GetUser
const max_retries = 3       // Should be MaxRetries or maxRetries
```

### 2. Package Organization | 包组织

```go
// ✅ Good: Package structure and imports

// Package declaration - short, descriptive, lowercase
package userservice

import (
    // Standard library first
    "context"
    "fmt"
    "log"
    "net/http"
    "time"

    // Third-party packages
    "github.com/gorilla/mux"
    "github.com/lib/pq"

    // Local packages
    "myapp/internal/database"
    "myapp/internal/models"
)

// Package-level documentation
// Package userservice provides user management functionality.
// It handles user creation, authentication, and profile management.

// ✅ Good: Avoid package name stuttering
type Service struct {  // Not UserService in userservice package
    db Database
}

func New(db Database) *Service {  // Not NewUserService
    return &Service{db: db}
}

func (s *Service) Create(ctx context.Context, user *User) error {
    // Implementation
    return nil
}

// ❌ Bad: Package name stuttering
type UserService struct{}  // Redundant in userservice package
func NewUserService() *UserService { return nil }
```

### 3. Error Handling Patterns | 错误处理模式

```go
import (
    "errors"
    "fmt"
)

// ✅ Good: Idiomatic error handling

// Custom error types
type ValidationError struct {
    Field   string
    Message string
}

func (e ValidationError) Error() string {
    return fmt.Sprintf("validation error on field %s: %s", e.Field, e.Message)
}

// Sentinel errors
var (
    ErrUserNotFound     = errors.New("user not found")
    ErrInvalidEmail     = errors.New("invalid email address")
    ErrDuplicateUser    = errors.New("user already exists")
)

// Error wrapping (Go 1.13+)
func (s *Service) GetUser(ctx context.Context, id string) (*User, error) {
    user, err := s.db.FindByID(ctx, id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, ErrUserNotFound
        }
        return nil, fmt.Errorf("failed to get user %s: %w", id, err)
    }

    return user, nil
}

// Multiple return values for error handling
func (s *Service) CreateUser(ctx context.Context, email, name string) (*User, error) {
    // Validate input
    if email == "" {
        return nil, ValidationError{Field: "email", Message: "cannot be empty"}
    }

    if !isValidEmail(email) {
        return nil, ErrInvalidEmail
    }

    // Check for duplicates
    existing, err := s.db.FindByEmail(ctx, email)
    if err != nil && !errors.Is(err, ErrUserNotFound) {
        return nil, fmt.Errorf("failed to check existing user: %w", err)
    }
    if existing != nil {
        return nil, ErrDuplicateUser
    }

    // Create user
    user := &User{
        ID:    generateID(),
        Email: email,
        Name:  name,
    }

    if err := s.db.Save(ctx, user); err != nil {
        return nil, fmt.Errorf("failed to save user: %w", err)
    }

    return user, nil
}

// Error checking in main
func main() {
    service := NewService(db)

    user, err := service.CreateUser(ctx, "test@example.com", "Test User")
    if err != nil {
        var validationErr ValidationError
        if errors.As(err, &validationErr) {
            log.Printf("Validation error: %v", validationErr)
            return
        }

        if errors.Is(err, ErrDuplicateUser) {
            log.Printf("User already exists")
            return
        }

        log.Printf("Unexpected error: %v", err)
        return
    }

    fmt.Printf("Created user: %+v\n", user)
}

// ❌ Bad: Poor error handling
func badCreateUser(email string) *User {
    if email == "" {
        panic("email cannot be empty")  // Don't panic for validation
    }

    user, err := db.Create(email)
    if err != nil {
        log.Println(err)  // Don't just log and continue
        return nil
    }

    return user
}
```

## Interface Design | 接口设计

### 1. Small Interfaces | 小接口

```go
// ✅ Good: Small, focused interfaces

// Single method interfaces are common and powerful
type Reader interface {
    Read([]byte) (int, error)
}

type Writer interface {
    Write([]byte) (int, error)
}

type Closer interface {
    Close() error
}

// Compose interfaces
type ReadWriter interface {
    Reader
    Writer
}

type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}

// Domain-specific interfaces
type UserFinder interface {
    FindByID(ctx context.Context, id string) (*User, error)
}

type UserCreator interface {
    Create(ctx context.Context, user *User) error
}

type UserRepository interface {
    UserFinder
    UserCreator
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
}

// ✅ Good: Accept interfaces, return structs
func ProcessUsers(finder UserFinder, ids []string) ([]*User, error) {
    var users []*User
    for _, id := range ids {
        user, err := finder.FindByID(context.Background(), id)
        if err != nil {
            return nil, err
        }
        users = append(users, user)
    }
    return users, nil
}

// ❌ Bad: Large, monolithic interfaces
type BadUserService interface {
    CreateUser(ctx context.Context, user *User) error
    UpdateUser(ctx context.Context, user *User) error
    DeleteUser(ctx context.Context, id string) error
    FindUser(ctx context.Context, id string) (*User, error)
    ListUsers(ctx context.Context) ([]*User, error)
    AuthenticateUser(ctx context.Context, email, password string) (*User, error)
    SendEmail(ctx context.Context, to, subject, body string) error
    LogActivity(ctx context.Context, activity string) error
    // Too many responsibilities!
}
```

### 2. Interface Satisfaction | 接口满足

```go
// ✅ Good: Implicit interface satisfaction

type Logger interface {
    Log(message string)
}

// This type automatically satisfies Logger interface
type FileLogger struct {
    filename string
}

func (f *FileLogger) Log(message string) {
    // Write to file
}

// This also satisfies Logger interface
type ConsoleLogger struct{}

func (c *ConsoleLogger) Log(message string) {
    fmt.Println(message)
}

// Function that accepts any Logger implementation
func ProcessWithLogging(logger Logger, data []string) {
    logger.Log("Starting processing")

    for _, item := range data {
        // Process item
        logger.Log(fmt.Sprintf("Processed: %s", item))
    }

    logger.Log("Processing complete")
}

// Usage - no explicit interface declaration needed
func main() {
    fileLogger := &FileLogger{filename: "app.log"}
    consoleLogger := &ConsoleLogger{}

    data := []string{"item1", "item2", "item3"}

    ProcessWithLogging(fileLogger, data)
    ProcessWithLogging(consoleLogger, data)
}

// ✅ Good: Empty interface for generic types
func PrintAny(v interface{}) {
    fmt.Printf("Value: %+v, Type: %T\n", v, v)
}

// Better with generics (Go 1.18+)
func PrintGeneric[T any](v T) {
    fmt.Printf("Value: %+v, Type: %T\n", v, v)
}
```

## Goroutines and Concurrency | Goroutines 和并发

### 1. Goroutine Patterns | Goroutine 模式

```go
import (
    "context"
    "sync"
    "time"
)

// ✅ Good: Proper goroutine usage with context and synchronization

// Worker pool pattern
func WorkerPool(ctx context.Context, jobs <-chan Job, results chan<- Result, numWorkers int) {
    var wg sync.WaitGroup

    // Start workers
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func(workerID int) {
            defer wg.Done()

            for {
                select {
                case job, ok := <-jobs:
                    if !ok {
                        return // Channel closed
                    }

                    result := processJob(job)

                    select {
                    case results <- result:
                    case <-ctx.Done():
                        return
                    }

                case <-ctx.Done():
                    return
                }
            }
        }(i)
    }

    wg.Wait()
    close(results)
}

// Fan-out, fan-in pattern
func FanOutFanIn(ctx context.Context, input <-chan int) <-chan int {
    const numWorkers = 3

    // Fan-out: distribute work to multiple goroutines
    workers := make([]<-chan int, numWorkers)
    for i := 0; i < numWorkers; i++ {
        worker := make(chan int)
        workers[i] = worker

        go func(out chan<- int) {
            defer close(out)

            for n := range input {
                select {
                case out <- expensiveOperation(n):
                case <-ctx.Done():
                    return
                }
            }
        }(worker)
    }

    // Fan-in: merge results from multiple goroutines
    return merge(ctx, workers...)
}

func merge(ctx context.Context, channels ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)

    // Start a goroutine for each input channel
    output := func(c <-chan int) {
        defer wg.Done()
        for n := range c {
            select {
            case out <- n:
            case <-ctx.Done():
                return
            }
        }
    }

    wg.Add(len(channels))
    for _, c := range channels {
        go output(c)
    }

    // Start a goroutine to close out once all output goroutines are done
    go func() {
        wg.Wait()
        close(out)
    }()

    return out
}

// Pipeline pattern
func Pipeline(ctx context.Context, input <-chan int) <-chan string {
    // Stage 1: Square numbers
    squared := make(chan int)
    go func() {
        defer close(squared)
        for n := range input {
            select {
            case squared <- n * n:
            case <-ctx.Done():
                return
            }
        }
    }()

    // Stage 2: Convert to strings
    strings := make(chan string)
    go func() {
        defer close(strings)
        for n := range squared {
            select {
            case strings <- fmt.Sprintf("Number: %d", n):
            case <-ctx.Done():
                return
            }
        }
    }()

    return strings
}

// ✅ Good: Graceful shutdown
type Server struct {
    httpServer *http.Server
    done       chan struct{}
}

func (s *Server) Start(addr string) error {
    s.httpServer = &http.Server{Addr: addr}
    s.done = make(chan struct{})

    go func() {
        if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Printf("Server error: %v", err)
        }
        close(s.done)
    }()

    return nil
}

func (s *Server) Shutdown(ctx context.Context) error {
    if err := s.httpServer.Shutdown(ctx); err != nil {
        return err
    }

    select {
    case <-s.done:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}

// ❌ Bad: Goroutine leaks and poor synchronization
func badGoroutineUsage() {
    // No way to stop this goroutine
    go func() {
        for {
            doWork()
            time.Sleep(time.Second)
        }
    }()

    // Race condition - no synchronization
    var result int
    go func() {
        result = expensiveCalculation()
    }()

    fmt.Println(result) // May print 0 due to race condition
}
```

### 2. Channel Patterns | Channel 模式

```go
// ✅ Good: Channel patterns and idioms

// Generator pattern
func NumberGenerator(ctx context.Context, start, end int) <-chan int {
    ch := make(chan int)

    go func() {
        defer close(ch)

        for i := start; i <= end; i++ {
            select {
            case ch <- i:
            case <-ctx.Done():
                return
            }
        }
    }()

    return ch
}

// Timeout pattern
func WithTimeout(operation func() (string, error), timeout time.Duration) (string, error) {
    type result struct {
        value string
        err   error
    }

    ch := make(chan result, 1)

    go func() {
        value, err := operation()
        ch <- result{value: value, err: err}
    }()

    select {
    case res := <-ch:
        return res.value, res.err
    case <-time.After(timeout):
        return "", fmt.Errorf("operation timed out after %v", timeout)
    }
}

// Rate limiting pattern
func RateLimiter(rate time.Duration) <-chan time.Time {
    return time.Tick(rate)
}

func ProcessWithRateLimit(items []string, rate time.Duration) {
    limiter := RateLimiter(rate)

    for _, item := range items {
        <-limiter // Wait for rate limiter
        processItem(item)
    }
}

// Semaphore pattern for limiting concurrency
type Semaphore chan struct{}

func NewSemaphore(capacity int) Semaphore {
    return make(Semaphore, capacity)
}

func (s Semaphore) Acquire() {
    s <- struct{}{}
}

func (s Semaphore) Release() {
    <-s
}

func ProcessConcurrently(items []string, maxConcurrency int) {
    sem := NewSemaphore(maxConcurrency)
    var wg sync.WaitGroup

    for _, item := range items {
        wg.Add(1)

        go func(item string) {
            defer wg.Done()

            sem.Acquire()
            defer sem.Release()

            processItem(item)
        }(item)
    }

    wg.Wait()
}

// Select with default for non-blocking operations
func TryReceive(ch <-chan string) (string, bool) {
    select {
    case value := <-ch:
        return value, true
    default:
        return "", false
    }
}

func TrySend(ch chan<- string, value string) bool {
    select {
    case ch <- value:
        return true
    default:
        return false
    }
}
```

## Memory Management and Performance | 内存管理和性能

### 1. Efficient Memory Usage | 高效内存使用

```go
import (
    "bytes"
    "strings"
)

// ✅ Good: Efficient string building
func BuildString(parts []string) string {
    var builder strings.Builder

    // Pre-allocate capacity if known
    totalLen := 0
    for _, part := range parts {
        totalLen += len(part)
    }
    builder.Grow(totalLen)

    for _, part := range parts {
        builder.WriteString(part)
    }

    return builder.String()
}

// ✅ Good: Efficient slice operations
func ProcessLargeSlice(data []int) []int {
    // Pre-allocate with known capacity
    result := make([]int, 0, len(data))

    for _, item := range data {
        if item > 0 {
            result = append(result, item*2)
        }
    }

    return result
}

// ✅ Good: Reuse slices to reduce allocations
type Processor struct {
    buffer []byte
}

func NewProcessor() *Processor {
    return &Processor{
        buffer: make([]byte, 0, 1024), // Pre-allocate buffer
    }
}

func (p *Processor) Process(data []byte) []byte {
    // Reuse buffer, reset length but keep capacity
    p.buffer = p.buffer[:0]

    // Process data into buffer
    for _, b := range data {
        if b != 0 {
            p.buffer = append(p.buffer, b)
        }
    }

    // Return copy to avoid sharing internal buffer
    result := make([]byte, len(p.buffer))
    copy(result, p.buffer)

    return result
}

// ✅ Good: Pool pattern for expensive objects
var bufferPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 0, 1024)
    },
}

func ProcessWithPool(data []byte) []byte {
    // Get buffer from pool
    buffer := bufferPool.Get().([]byte)
    defer bufferPool.Put(buffer[:0]) // Reset and return to pool

    // Use buffer for processing
    for _, b := range data {
        if b > 0 {
            buffer = append(buffer, b*2)
        }
    }

    // Return copy
    result := make([]byte, len(buffer))
    copy(result, buffer)

    return result
}

// ❌ Bad: Inefficient memory usage
func badStringBuilding(parts []string) string {
    result := ""
    for _, part := range parts {
        result += part // Creates new string each time
    }
    return result
}

func badSliceGrowth() []int {
    var result []int
    for i := 0; i < 1000000; i++ {
        result = append(result, i) // Frequent reallocations
    }
    return result
}
```

### 2. Benchmarking and Profiling | 基准测试和性能分析

```go
import (
    "testing"
)

// ✅ Good: Proper benchmarking
func BenchmarkStringBuilding(b *testing.B) {
    parts := []string{"hello", " ", "world", "!"}

    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        _ = BuildString(parts)
    }
}

func BenchmarkStringBuildingWithAlloc(b *testing.B) {
    parts := []string{"hello", " ", "world", "!"}

    b.ResetTimer()
    b.ReportAllocs()

    for i := 0; i < b.N; i++ {
        _ = BuildString(parts)
    }
}

// Benchmark different approaches
func BenchmarkProcessingApproaches(b *testing.B) {
    data := make([]int, 1000)
    for i := range data {
        data[i] = i
    }

    b.Run("WithPrealloc", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            _ = ProcessLargeSlice(data)
        }
    })

    b.Run("WithoutPrealloc", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            var result []int
            for _, item := range data {
                if item > 0 {
                    result = append(result, item*2)
                }
            }
        }
    })
}

// Example benchmark output:
// BenchmarkStringBuilding-8                    1000000      1043 ns/op
// BenchmarkStringBuildingWithAlloc-8           1000000      1043 ns/op       32 B/op       2 allocs/op
```

## Testing Patterns | 测试模式

### 1. Table-Driven Tests | 表驱动测试

```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        want    bool
        wantErr bool
    }{
        {
            name:    "valid email",
            email:   "test@example.com",
            want:    true,
            wantErr: false,
        },
        {
            name:    "invalid email - no @",
            email:   "testexample.com",
            want:    false,
            wantErr: true,
        },
        {
            name:    "invalid email - no domain",
            email:   "test@",
            want:    false,
            wantErr: true,
        },
        {
            name:    "empty email",
            email:   "",
            want:    false,
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ValidateEmail(tt.email)

            if (err != nil) != tt.wantErr {
                t.Errorf("ValidateEmail() error = %v, wantErr %v", err, tt.wantErr)
                return
            }

            if got != tt.want {
                t.Errorf("ValidateEmail() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

## Code Quality Checklist | 代码质量检查清单

- [ ] Follow Go naming conventions (CamelCase, short names)
- [ ] Handle errors explicitly, don't ignore them
- [ ] Use small, focused interfaces
- [ ] Accept interfaces, return concrete types
- [ ] Use context.Context for cancellation and timeouts
- [ ] Avoid goroutine leaks with proper cleanup
- [ ] Use channels for communication, not shared memory
- [ ] Pre-allocate slices and maps when size is known
- [ ] Use sync.Pool for expensive object reuse
- [ ] Write table-driven tests for comprehensive coverage
- [ ] Use go fmt, go vet, and golint tools
- [ ] Profile and benchmark performance-critical code

## 代码质量检查清单

- [ ] 遵循 Go 命名约定（CamelCase，简短名称）
- [ ] 明确处理错误，不要忽略它们
- [ ] 使用小而专注的接口
- [ ] 接受接口，返回具体类型
- [ ] 使用 context.Context 进行取消和超时
- [ ] 通过适当的清理避免 goroutine 泄漏
- [ ] 使用 channel 进行通信，而不是共享内存
- [ ] 在已知大小时预分配切片和映射
- [ ] 使用 sync.Pool 进行昂贵对象重用
- [ ] 编写表驱动测试以获得全面覆盖
- [ ] 使用 go fmt、go vet 和 golint 工具
- [ ] 对性能关键代码进行性能分析和基准测试