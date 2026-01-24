---
name: rust-patterns
description: Rust ownership patterns, borrow checker, lifetime annotations, and async/await
description_zh: Rust 所有权模式、借用检查器、生命周期注解和 async/await
version: 1.0.0
category: programming
triggers: ['/rust-patterns', '/rust', '/ownership', '/lifetimes', '/async-rust']
use_when:
  - Writing safe and efficient Rust code with proper ownership
  - Implementing async/await patterns and concurrent programming
  - Working with lifetimes and borrow checker
  - Code review for Rust projects
use_when_zh:
  - 编写具有适当所有权的安全高效 Rust 代码
  - 实现 async/await 模式和并发编程
  - 使用生命周期和借用检查器
  - Rust 项目代码审查
auto_activate: true
priority: 8
agents: [rust-expert, systems-programmer]
tags: [rust, ownership, lifetimes, async, safety, performance]
---

# Rust Patterns | Rust 模式

## Context | 上下文

Use this skill when writing Rust code that leverages ownership, borrowing, and lifetimes for memory safety without garbage collection. Essential for systems programming and high-performance applications.

在编写利用所有权、借用和生命周期实现内存安全而无需垃圾回收的 Rust 代码时使用此技能。对于系统编程和高性能应用程序至关重要。

## Ownership and Borrowing | 所有权和借用

### 1. Ownership Patterns | 所有权模式

```rust
use std::collections::HashMap;

// ✅ Good: Clear ownership patterns

#[derive(Debug, Clone)]
pub struct User {
    pub id: u64,
    pub name: String,
    pub email: String,
}

impl User {
    pub fn new(id: u64, name: String, email: String) -> Self {
        Self { id, name, email }
    }

    // Taking ownership when we need to consume the value
    pub fn into_summary(self) -> String {
        format!("{} ({})", self.name, self.email)
    }

    // Borrowing immutably when we only need to read
    pub fn display_info(&self) -> String {
        format!("User {}: {} <{}>", self.id, self.name, self.email)
    }

    // Borrowing mutably when we need to modify
    pub fn update_email(&mut self, new_email: String) -> Result<(), &'static str> {
        if new_email.contains('@') {
            self.email = new_email;
            Ok(())
        } else {
            Err("Invalid email format")
        }
    }
}

// ✅ Good: Repository pattern with proper ownership
pub struct UserRepository {
    users: HashMap<u64, User>,
    next_id: u64,
}

impl UserRepository {
    pub fn new() -> Self {
        Self {
            users: HashMap::new(),
            next_id: 1,
        }
    }

    // Taking ownership of the user data
    pub fn create_user(&mut self, name: String, email: String) -> u64 {
        let id = self.next_id;
        self.next_id += 1;

        let user = User::new(id, name, email);
        self.users.insert(id, user);

        id
    }

    // Returning a reference to avoid unnecessary cloning
    pub fn get_user(&self, id: u64) -> Option<&User> {
        self.users.get(&id)
    }

    // Returning a mutable reference for in-place updates
    pub fn get_user_mut(&mut self, id: u64) -> Option<&mut User> {
        self.users.get_mut(&id)
    }

    // Taking ownership when removing
    pub fn remove_user(&mut self, id: u64) -> Option<User> {
        self.users.remove(&id)
    }

    // Returning an iterator over references
    pub fn all_users(&self) -> impl Iterator<Item = &User> {
        self.users.values()
    }

    // Method that consumes self and returns owned data
    pub fn into_users(self) -> Vec<User> {
        self.users.into_values().collect()
    }
}

// ✅ Good: Builder pattern with ownership transfer
pub struct UserBuilder {
    name: Option<String>,
    email: Option<String>,
}

impl UserBuilder {
    pub fn new() -> Self {
        Self {
            name: None,
            email: None,
        }
    }

    // Taking ownership of self and returning it (fluent interface)
    pub fn name(mut self, name: String) -> Self {
        self.name = Some(name);
        self
    }

    pub fn email(mut self, email: String) -> Self {
        self.email = Some(email);
        self
    }

    // Consuming self to build the final object
    pub fn build(self, id: u64) -> Result<User, &'static str> {
        let name = self.name.ok_or("Name is required")?;
        let email = self.email.ok_or("Email is required")?;

        Ok(User::new(id, name, email))
    }
}

// Usage examples
fn ownership_examples() {
    let mut repo = UserRepository::new();

    // Create user - strings are moved into the method
    let user_id = repo.create_user("Alice".to_string(), "alice@example.com".to_string());

    // Borrow user immutably
    if let Some(user) = repo.get_user(user_id) {
        println!("{}", user.display_info());
    }

    // Borrow user mutably
    if let Some(user) = repo.get_user_mut(user_id) {
        let _ = user.update_email("alice.new@example.com".to_string());
    }

    // Builder pattern
    let user = UserBuilder::new()
        .name("Bob".to_string())
        .email("bob@example.com".to_string())
        .build(2)
        .expect("Failed to build user");

    println!("{}", user.into_summary()); // user is consumed here
}

// ❌ Bad: Unclear ownership and unnecessary cloning
fn bad_ownership_example() {
    let user = User::new(1, "Alice".to_string(), "alice@example.com".to_string());

    // Unnecessary clone
    let user_copy = user.clone();
    println!("{}", user_copy.display_info());

    // Could have just borrowed
    println!("{}", user.display_info());
}
```

### 2. Smart Pointers | 智能指针

```rust
use std::rc::{Rc, Weak};
use std::cell::{RefCell, Cell};
use std::sync::{Arc, Mutex, RwLock};
use std::thread;

// ✅ Good: Using Rc for shared ownership (single-threaded)
#[derive(Debug)]
struct Node {
    value: i32,
    children: Vec<Rc<Node>>,
    parent: Option<Weak<Node>>,
}

impl Node {
    fn new(value: i32) -> Rc<Self> {
        Rc::new(Node {
            value,
            children: Vec::new(),
            parent: None,
        })
    }

    fn add_child(parent: &Rc<Node>, child: Rc<Node>) {
        // This would require RefCell for interior mutability in practice
        // Simplified for demonstration
    }
}

// ✅ Good: Using RefCell for interior mutability
struct Counter {
    value: RefCell<i32>,
}

impl Counter {
    fn new() -> Self {
        Self {
            value: RefCell::new(0),
        }
    }

    fn increment(&self) {
        let mut value = self.value.borrow_mut();
        *value += 1;
    }

    fn get(&self) -> i32 {
        *self.value.borrow()
    }
}

// ✅ Good: Using Arc and Mutex for thread-safe shared state
#[derive(Clone)]
struct ThreadSafeCounter {
    value: Arc<Mutex<i32>>,
}

impl ThreadSafeCounter {
    fn new() -> Self {
        Self {
            value: Arc::new(Mutex::new(0)),
        }
    }

    fn increment(&self) {
        let mut value = self.value.lock().unwrap();
        *value += 1;
    }

    fn get(&self) -> i32 {
        *self.value.lock().unwrap()
    }
}

// ✅ Good: Using RwLock for read-heavy workloads
struct ReadHeavyData {
    data: Arc<RwLock<HashMap<String, String>>>,
}

impl ReadHeavyData {
    fn new() -> Self {
        Self {
            data: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    fn get(&self, key: &str) -> Option<String> {
        let data = self.data.read().unwrap();
        data.get(key).cloned()
    }

    fn insert(&self, key: String, value: String) {
        let mut data = self.data.write().unwrap();
        data.insert(key, value);
    }
}

// Usage with threads
fn smart_pointer_examples() {
    // Single-threaded reference counting
    let counter = Counter::new();
    counter.increment();
    println!("Counter: ", counter.get());

    // Multi-threaded shared state
    let thread_safe_counter = ThreadSafeCounter::new();
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = thread_safe_counter.clone();
        let handle = thread::spawn(move || {
            for _ in 0..100 {
                counter.increment();
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final count: {}", thread_safe_counter.get());
}
```

## Lifetimes and Borrowing | 生命周期和借用

### 1. Lifetime Annotations | 生命周期注解

```rust
// ✅ Good: Proper lifetime annotations

// Simple lifetime parameter
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

// Multiple lifetime parameters
fn first_word<'a, 'b>(s: &'a str, _delimiter: &'b str) -> &'a str {
    s.split_whitespace().next().unwrap_or("")
}

// Struct with lifetime parameters
#[derive(Debug)]
struct TextProcessor<'a> {
    text: &'a str,
    processed: Vec<&'a str>,
}

impl<'a> TextProcessor<'a> {
    fn new(text: &'a str) -> Self {
        Self {
            text,
            processed: Vec::new(),
        }
    }

    fn process_words(&mut self) {
        self.processed = self.text
            .split_whitespace()
            .filter(|word| word.len() > 3)
            .collect();
    }

    fn get_processed(&self) -> &[&'a str] {
        &self.processed
    }

    // Method with additional lifetime parameter
    fn find_in_text<'b>(&self, pattern: &'b str) -> Option<&'a str> {
        self.text
            .split_whitespace()
            .find(|word| word.contains(pattern))
    }
}

// ✅ Good: Lifetime elision rules
// These functions don't need explicit lifetime annotations

// Rule 1: Each parameter gets its own lifetime
fn process_string(s: &str) -> String {
    s.to_uppercase()
}

// Rule 2: If there's exactly one input lifetime, it's assigned to all outputs
fn get_first_char(s: &str) -> Option<&str> {
    s.chars().next().map(|_| &s[0..1])
}

// Rule 3: If one parameter is &self or &mut self, its lifetime is assigned to all outputs
impl<'a> TextProcessor<'a> {
    fn get_text(&self) -> &str {
        self.text
    }

    fn get_first_processed(&self) -> Option<&str> {
        self.processed.first().copied()
    }
}

// ✅ Good: Static lifetime for string literals and global data
static GLOBAL_CONFIG: &str = "production";

fn get_config() -> &'static str {
    GLOBAL_CONFIG
}

// Function that returns a string literal (has 'static lifetime)
fn get_error_message() -> &'static str {
    "An error occurred"
}

// ✅ Good: Lifetime bounds in generics
fn process_and_store<'a, T>(data: &'a T, storage: &mut Vec<&'a T>)
where
    T: std::fmt::Debug + 'a,
{
    println!("Processing: {:?}", data);
    storage.push(data);
}

// Higher-ranked trait bounds (HRTB)
fn apply_to_all<F>(strings: &[String], f: F)
where
    F: for<'a> Fn(&'a str) -> &'a str,
{
    for s in strings {
        let result = f(s);
        println!("{}", result);
    }
}

// Usage examples
fn lifetime_examples() {
    let text1 = "Hello world";
    let text2 = "Hi";

    let longer = longest(text1, text2);
    println!("Longer: {}", longer);

    let mut processor = TextProcessor::new("This is a sample text with some words");
    processor.process_words();

    for word in processor.get_processed() {
        println!("Processed word: {}", word);
    }

    if let Some(found) = processor.find_in_text("sample") {
        println!("Found word containing 'sample': {}", found);
    }
}
```

### 2. Advanced Borrowing Patterns | 高级借用模式

```rust
use std::collections::HashMap;

// ✅ Good: Splitting borrows
struct Database {
    users: HashMap<u64, User>,
    sessions: HashMap<String, u64>,
}

impl Database {
    fn new() -> Self {
        Self {
            users: HashMap::new(),
            sessions: HashMap::new(),
        }
    }

    // Split mutable borrows to avoid conflicts
    fn get_users_and_sessions_mut(&mut self) -> (&mut HashMap<u64, User>, &mut HashMap<String, u64>) {
        (&mut self.users, &mut self.sessions)
    }

    // Method that needs to borrow different parts
    fn authenticate_and_update(&mut self, session_id: &str, new_email: String) -> Result<(), &'static str> {
        // First, get the user ID from session
        let user_id = self.sessions.get(session_id)
            .copied()
            .ok_or("Invalid session")?;

        // Then update the user - this works because we're not holding a reference to sessions
        let user = self.users.get_mut(&user_id)
            .ok_or("User not found")?;

        user.update_email(new_email)?;

        Ok(())
    }
}

// ✅ Good: Using entry API to avoid double lookups
impl Database {
    fn get_or_create_user(&mut self, id: u64, name: String, email: String) -> &mut User {
        self.users.entry(id).or_insert_with(|| User::new(id, name, email))
    }

    fn update_or_create_session(&mut self, session_id: String, user_id: u64) {
        self.sessions.insert(session_id, user_id);
    }
}

// ✅ Good: Iterator patterns that work with borrowing
impl Database {
    fn find_users_by_email_domain(&self, domain: &str) -> impl Iterator<Item = &User> {
        self.users.values()
            .filter(move |user| user.email.ends_with(domain))
    }

    fn active_sessions(&self) -> impl Iterator<Item = (&String, &u64)> {
        self.sessions.iter()
    }
}

// ✅ Good: Avoiding borrowing issues with cloning when necessary
#[derive(Debug, Clone)]
struct UserSummary {
    id: u64,
    name: String,
    email_domain: String,
}

impl Database {
    fn get_user_summaries(&self) -> Vec<UserSummary> {
        self.users.values()
            .map(|user| UserSummary {
                id: user.id,
                name: user.name.clone(),
                email_domain: user.email.split('@').nth(1).unwrap_or("").to_string(),
            })
            .collect()
    }
}

// ✅ Good: Using Cow (Clone on Write) for efficiency
use std::borrow::Cow;

fn process_text(text: &str) -> Cow<str> {
    if text.contains("bad_word") {
        // Only clone/allocate if we need to modify
        Cow::Owned(text.replace("bad_word", "***"))
    } else {
        // Return borrowed data if no modification needed
        Cow::Borrowed(text)
    }
}

fn cow_example() {
    let clean_text = "This is clean text";
    let dirty_text = "This contains bad_word";

    let result1 = process_text(clean_text); // No allocation
    let result2 = process_text(dirty_text); // Allocates new string

    println!("Result 1: {}", result1);
    println!("Result 2: {}", result2);
}
```

## Async/Await Patterns | Async/Await 模式

### 1. Basic Async Patterns | 基本异步模式

```rust
use tokio;
use std::time::Duration;
use futures::future::{join, join_all, select, Either};

// ✅ Good: Basic async function
async fn fetch_user_data(user_id: u64) -> Result<User, Box<dyn std::error::Error>> {
    // Simulate network delay
    tokio::time::sleep(Duration::from_millis(100)).await;

    // Simulate fetching from database
    Ok(User::new(user_id, "Alice".to_string(), "alice@example.com".to_string()))
}

// ✅ Good: Async method in impl block
struct UserService {
    base_url: String,
}

impl UserService {
    fn new(base_url: String) -> Self {
        Self { base_url }
    }

    async fn get_user(&self, id: u64) -> Result<User, Box<dyn std::error::Error>> {
        let url = format!("{}/users/{}", self.base_url, id);

        // Simulate HTTP request
        tokio::time::sleep(Duration::from_millis(50)).await;

        fetch_user_data(id).await
    }

    async fn create_user(&self, name: String, email: String) -> Result<User, Box<dyn std::error::Error>> {
        // Simulate validation
        if name.is_empty() || email.is_empty() {
            return Err("Name and email are required".into());
        }

        // Simulate HTTP POST
        tokio::time::sleep(Duration::from_millis(200)).await;

        Ok(User::new(1, name, email))
    }
}

// ✅ Good: Concurrent execution with join
async fn fetch_multiple_users(ids: Vec<u64>) -> Vec<Result<User, Box<dyn std::error::Error>>> {
    let futures: Vec<_> = ids.into_iter()
        .map(|id| fetch_user_data(id))
        .collect();

    join_all(futures).await
}

// ✅ Good: Racing futures with select
async fn fetch_with_timeout(user_id: u64) -> Result<User, &'static str> {
    let fetch_future = fetch_user_data(user_id);
    let timeout_future = tokio::time::sleep(Duration::from_secs(5));

    match select(fetch_future, timeout_future).await {
        Either::Left((result, _)) => result.map_err(|_| "Fetch failed"),
        Either::Right((_, _)) => Err("Timeout"),
    }
}

// ✅ Good: Async iterator pattern
use futures::stream::{self, StreamExt};

async fn process_users_stream(user_ids: Vec<u64>) {
    let user_stream = stream::iter(user_ids)
        .map(|id| async move {
            fetch_user_data(id).await
        })
        .buffer_unordered(5); // Process up to 5 concurrently

    user_stream
        .for_each(|result| async {
            match result {
                Ok(user) => println!("Processed user: {}", user.display_info()),
                Err(e) => eprintln!("Error processing user: {}", e),
            }
        })
        .await;
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let service = UserService::new("https://api.example.com".to_string());

    // Sequential execution
    let user1 = service.get_user(1).await?;
    println!("User 1: {}", user1.display_info());

    // Concurrent execution
    let (user2_result, user3_result) = join(
        service.get_user(2),
        service.get_user(3)
    ).await;

    if let Ok(user2) = user2_result {
        println!("User 2: {}", user2.display_info());
    }

    if let Ok(user3) = user3_result {
        println!("User 3: {}", user3.display_info());
    }

    // Fetch multiple users concurrently
    let user_ids = vec![4, 5, 6, 7, 8];
    let results = fetch_multiple_users(user_ids).await;

    for (i, result) in results.into_iter().enumerate() {
        match result {
            Ok(user) => println!("User {}: {}", i + 4, user.display_info()),
            Err(e) => eprintln!("Error fetching user {}: {}", i + 4, e),
        }
    }

    // Process users with streaming
    let stream_ids = vec![9, 10, 11, 12, 13];
    process_users_stream(stream_ids).await;

    Ok(())
}
```

### 2. Advanced Async Patterns | 高级异步模式

```rust
use tokio::sync::{mpsc, oneshot, Mutex, RwLock};
use std::sync::Arc;
use std::collections::HashMap;

// ✅ Good: Actor pattern with message passing
#[derive(Debug)]
enum UserMessage {
    Get { id: u64, respond_to: oneshot::Sender<Option<User>> },
    Create { user: User, respond_to: oneshot::Sender<Result<(), String>> },
    Update { id: u64, email: String, respond_to: oneshot::Sender<Result<(), String>> },
}

struct UserActor {
    receiver: mpsc::Receiver<UserMessage>,
    users: HashMap<u64, User>,
}

impl UserActor {
    fn new(receiver: mpsc::Receiver<UserMessage>) -> Self {
        Self {
            receiver,
            users: HashMap::new(),
        }
    }

    async fn run(&mut self) {
        while let Some(msg) = self.receiver.recv().await {
            match msg {
                UserMessage::Get { id, respond_to } => {
                    let user = self.users.get(&id).cloned();
                    let _ = respond_to.send(user);
                }
                UserMessage::Create { user, respond_to } => {
                    let id = user.id;
                    self.users.insert(id, user);
                    let _ = respond_to.send(Ok(()));
                }
                UserMessage::Update { id, email, respond_to } => {
                    if let Some(user) = self.users.get_mut(&id) {
                        match user.update_email(email) {
                            Ok(()) => { let _ = respond_to.send(Ok(())); }
                            Err(e) => { let _ = respond_to.send(Err(e.to_string())); }
                        }
                    } else {
                        let _ = respond_to.send(Err("User not found".to_string()));
                    }
                }
            }
        }
    }
}

// Handle for communicating with the actor
#[derive(Clone)]
struct UserActorHandle {
    sender: mpsc::Sender<UserMessage>,
}

impl UserActorHandle {
    fn new() -> Self {
        let (sender, receiver) = mpsc::channel(100);
        let mut actor = UserActor::new(receiver);

        tokio::spawn(async move {
            actor.run().await;
        });

        Self { sender }
    }

    async fn get_user(&self, id: u64) -> Option<User> {
        let (send, recv) = oneshot::channel();
        let msg = UserMessage::Get { id, respond_to: send };

        if self.sender.send(msg).await.is_ok() {
            recv.await.unwrap_or(None)
        } else {
            None
        }
    }

    async fn create_user(&self, user: User) -> Result<(), String> {
        let (send, recv) = oneshot::channel();
        let msg = UserMessage::Create { user, respond_to: send };

        if self.sender.send(msg).await.is_ok() {
            recv.await.unwrap_or(Err("Actor unavailable".to_string()))
        } else {
            Err("Failed to send message".to_string())
        }
    }
}

// ✅ Good: Shared state with async locks
#[derive(Clone)]
struct AsyncUserRepository {
    users: Arc<RwLock<HashMap<u64, User>>>,
    next_id: Arc<Mutex<u64>>,
}

impl AsyncUserRepository {
    fn new() -> Self {
        Self {
            users: Arc::new(RwLock::new(HashMap::new())),
            next_id: Arc::new(Mutex::new(1)),
        }
    }

    async fn create_user(&self, name: String, email: String) -> u64 {
        let mut next_id = self.next_id.lock().await;
        let id = *next_id;
        *next_id += 1;
        drop(next_id); // Release lock early

        let user = User::new(id, name, email);
        let mut users = self.users.write().await;
        users.insert(id, user);

        id
    }

    async fn get_user(&self, id: u64) -> Option<User> {
        let users = self.users.read().await;
        users.get(&id).cloned()
    }

    async fn update_user_email(&self, id: u64, new_email: String) -> Result<(), String> {
        let mut users = self.users.write().await;
        if let Some(user) = users.get_mut(&id) {
            user.update_email(new_email).map_err(|e| e.to_string())
        } else {
            Err("User not found".to_string())
        }
    }
}

// ✅ Good: Background task pattern
async fn background_cleanup_task(repo: AsyncUserRepository) {
    let mut interval = tokio::time::interval(Duration::from_secs(60));

    loop {
        interval.tick().await;

        // Simulate cleanup logic
        println!("Running background cleanup...");

        // In a real application, you might clean up expired sessions,
        // remove inactive users, etc.
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
}

// Usage example
async fn async_patterns_example() -> Result<(), Box<dyn std::error::Error>> {
    // Actor pattern
    let user_actor = UserActorHandle::new();

    let user = User::new(1, "Alice".to_string(), "alice@example.com".to_string());
    user_actor.create_user(user).await?;

    if let Some(retrieved_user) = user_actor.get_user(1).await {
        println!("Retrieved user: {}", retrieved_user.display_info());
    }

    // Shared state pattern
    let repo = AsyncUserRepository::new();

    // Spawn background task
    let repo_clone = repo.clone();
    tokio::spawn(async move {
        background_cleanup_task(repo_clone).await;
    });

    // Use repository
    let user_id = repo.create_user("Bob".to_string(), "bob@example.com".to_string()).await;
    println!("Created user with ID: {}", user_id);

    if let Some(user) = repo.get_user(user_id).await {
        println!("Found user: {}", user.display_info());
    }

    Ok(())
}
```

## Error Handling | 错误处理

### 1. Custom Error Types | 自定义错误类型

```rust
use std::fmt;

// ✅ Good: Custom error type with proper Display and Debug
#[derive(Debug)]
enum UserError {
    NotFound(u64),
    InvalidEmail(String),
    DatabaseError(String),
    ValidationError { field: String, message: String },
}

impl fmt::Display for UserError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            UserError::NotFound(id) => write!(f, "User with ID {} not found", id),
            UserError::InvalidEmail(email) => write!(f, "Invalid email address: {}", email),
            UserError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            UserError::ValidationError { field, message } => {
                write!(f, "Validation error on field '{}': {}", field, message)
            }
        }
    }
}

impl std::error::Error for UserError {}

// ✅ Good: Result type alias for convenience
type UserResult<T> = Result<T, UserError>;

// ✅ Good: Using ? operator with custom errors
impl UserRepository {
    fn validate_email(email: &str) -> UserResult<()> {
        if email.is_empty() {
            return Err(UserError::ValidationError {
                field: "email".to_string(),
                message: "cannot be empty".to_string(),
            });
        }

        if !email.contains('@') {
            return Err(UserError::InvalidEmail(email.to_string()));
        }

        Ok(())
    }

    fn create_user_safe(&mut self, name: String, email: String) -> UserResult<u64> {
        // Validate input
        if name.is_empty() {
            return Err(UserError::ValidationError {
                field: "name".to_string(),
                message: "cannot be empty".to_string(),
            });
        }

        Self::validate_email(&email)?; // Using ? operator

        // Check for duplicates
        for user in self.users.values() {
            if user.email == email {
                return Err(UserError::ValidationError {
                    field: "email".to_string(),
                    message: "already exists".to_string(),
                });
            }
        }

        // Create user
        let id = self.next_id;
        self.next_id += 1;

        let user = User::new(id, name, email);
        self.users.insert(id, user);

        Ok(id)
    }

    fn get_user_safe(&self, id: u64) -> UserResult<&User> {
        self.users.get(&id).ok_or(UserError::NotFound(id))
    }
}
```

## Performance Patterns | 性能模式

### 1. Zero-Cost Abstractions | 零成本抽象

```rust
// ✅ Good: Iterator chains compile to efficient loops
fn process_numbers_efficiently(numbers: &[i32]) -> Vec<i32> {
    numbers
        .iter()
        .filter(|&&x| x > 0)
        .map(|&x| x * 2)
        .collect()
}

// ✅ Good: Using iterators instead of indexing
fn sum_positive_numbers(numbers: &[i32]) -> i32 {
    numbers.iter().filter(|&&x| x > 0).sum()
}

// ✅ Good: Avoiding allocations with iterator adaptors
fn find_first_large_number(numbers: &[i32]) -> Option<i32> {
    numbers
        .iter()
        .filter(|&&x| x > 1000)
        .copied()
        .next()
}

// ✅ Good: Using Vec::with_capacity when size is known
fn create_processed_data(input: &[i32]) -> Vec<String> {
    let mut result = Vec::with_capacity(input.len());

    for &num in input {
        result.push(format!("Number: {}", num));
    }

    result
}

// ✅ Good: String building with capacity
fn build_report(items: &[&str]) -> String {
    let total_len: usize = items.iter().map(|s| s.len()).sum();
    let mut report = String::with_capacity(total_len + items.len() * 10); // Extra space for formatting

    for item in items {
        report.push_str("Item: ");
        report.push_str(item);
        report.push('\n');
    }

    report
}
```

## Code Quality Checklist | 代码质量检查清单

- [ ] Ownership is clear and minimal cloning is used
- [ ] Lifetimes are properly annotated where needed
- [ ] Borrowing rules are followed without fighting the borrow checker
- [ ] Error handling uses Result types and proper error propagation
- [ ] Async code uses proper concurrency patterns
- [ ] Smart pointers (Rc, Arc, Box) are used appropriately
- [ ] Iterator chains are preferred over manual loops
- [ ] Memory allocations are minimized with pre-allocation
- [ ] Thread safety is ensured with proper synchronization primitives
- [ ] Code compiles without warnings
- [ ] Tests cover both success and error cases
- [ ] Documentation includes examples and safety notes

## 代码质量检查清单

- [ ] 所有权清晰，最少使用克隆
- [ ] 在需要的地方正确注解生命周期
- [ ] 遵循借用规则，不与借用检查器对抗
- [ ] 错误处理使用 Result 类型和适当的错误传播
- [ ] 异步代码使用适当的并发模式
- [ ] 智能指针（Rc、Arc、Box）使用得当
- [ ] 优先使用迭代器链而不是手动循环
- [ ] 通过预分配最小化内存分配
- [ ] 使用适当的同步原语确保线程安全
- [ ] 代码编译无警告
- [ ] 测试覆盖成功和错误情况
- [ ] 文档包含示例和安全说明