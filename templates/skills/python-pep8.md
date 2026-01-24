---
name: python-pep8
description: Python PEP 8 style guide, type hints, and modern Python 3.12+ best practices
description_zh: Python PEP 8 风格指南、类型提示和现代 Python 3.12+ 最佳实践
version: 1.0.0
category: programming
triggers: ['/python-pep8', '/python', '/pep8', '/python-style']
use_when:
  - Writing Python code following PEP 8 standards
  - Implementing type hints and modern Python features
  - Code review for Python projects
  - Setting up Python project structure and tooling
use_when_zh:
  - 编写遵循 PEP 8 标准的 Python 代码
  - 实现类型提示和现代 Python 功能
  - Python 项目代码审查
  - 设置 Python 项目结构和工具
auto_activate: true
priority: 8
agents: [python-expert, code-reviewer]
tags: [python, pep8, type-hints, style-guide, best-practices]
---

# Python PEP 8 Best Practices | Python PEP 8 最佳实践

## Context | 上下文

Use this skill when writing Python code that follows PEP 8 standards, implements modern type hints, and uses Python 3.12+ features. Essential for maintainable and professional Python development.

在编写遵循 PEP 8 标准、实现现代类型提示并使用 Python 3.12+ 功能的 Python 代码时使用此技能。对于可维护和专业的 Python 开发至关重要。

## Code Style and Formatting | 代码风格和格式化

### 1. Naming Conventions | 命名约定

```python
# ✅ Good: Follow PEP 8 naming conventions

# Variables and functions: snake_case
user_name = "john_doe"
total_count = 42

def calculate_total_price(items: list[dict]) -> float:
    """Calculate total price of items."""
    return sum(item['price'] for item in items)

# Constants: UPPER_SNAKE_CASE
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT = 30.0
API_BASE_URL = "https://api.example.com"

# Classes: PascalCase
class UserRepository:
    """Repository for user data operations."""

    def __init__(self, database_url: str) -> None:
        self._database_url = database_url
        self._connection = None

    def find_by_id(self, user_id: int) -> User | None:
        """Find user by ID."""
        pass

# Private attributes: leading underscore
class BankAccount:
    def __init__(self, initial_balance: float) -> None:
        self._balance = initial_balance  # Protected
        self.__account_number = self._generate_account_number()  # Private

    def _generate_account_number(self) -> str:
        """Generate unique account number."""
        pass

# ❌ Bad: Inconsistent naming
userName = "john"  # Should be user_name
def CalculatePrice():  # Should be calculate_price
    pass

class userRepository:  # Should be UserRepository
    pass
```

### 2. Line Length and Formatting | 行长度和格式化

```python
# ✅ Good: Proper line breaks and formatting

# Function definitions with many parameters
def create_user_account(
    username: str,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    date_of_birth: date,
    phone_number: str | None = None,
    address: str | None = None,
) -> UserAccount:
    """Create a new user account with provided information."""
    return UserAccount(
        username=username,
        email=email,
        password=hash_password(password),
        profile=UserProfile(
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date_of_birth,
            phone_number=phone_number,
            address=address,
        ),
    )

# Long expressions
total_price = (
    base_price
    + tax_amount
    + shipping_cost
    - discount_amount
    + handling_fee
)

# Dictionary formatting
user_data = {
    "id": 123,
    "username": "john_doe",
    "email": "john@example.com",
    "profile": {
        "first_name": "John",
        "last_name": "Doe",
        "age": 30,
    },
    "preferences": {
        "theme": "dark",
        "notifications": True,
        "language": "en",
    },
}

# List comprehensions
filtered_users = [
    user for user in users
    if user.is_active and user.age >= 18
]

# ❌ Bad: Long lines and poor formatting
def create_user_account(username: str, email: str, password: str, first_name: str, last_name: str, date_of_birth: date, phone_number: str | None = None, address: str | None = None) -> UserAccount:
    pass

total_price = base_price + tax_amount + shipping_cost - discount_amount + handling_fee
```

### 3. Import Organization | 导入组织

```python
# ✅ Good: Proper import organization

# Standard library imports
import asyncio
import json
import logging
import os
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# Third-party imports
import httpx
import pydantic
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Local application imports
from .config import settings
from .database import Base, get_db
from .models import User, UserCreate, UserUpdate
from .services import UserService, EmailService

# ❌ Bad: Mixed import styles and poor organization
from typing import *
import os, sys, json
from fastapi import *
import httpx, pydantic
from .models import User
from .config import settings
import logging
```

## Type Hints and Modern Python | 类型提示和现代 Python

### 1. Type Hints Best Practices | 类型提示最佳实践

```python
from typing import Any, Dict, List, Optional, Union, TypeVar, Generic, Protocol
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass
from enum import Enum

# ✅ Good: Comprehensive type hints

# Basic types
def process_user_data(
    user_id: int,
    username: str,
    email: str,
    is_active: bool = True,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Process user data and return result."""
    return {
        "user_id": user_id,
        "username": username,
        "email": email,
        "is_active": is_active,
        "metadata": metadata or {},
        "processed_at": datetime.now().isoformat(),
    }

# Generic types
T = TypeVar('T')
K = TypeVar('K')
V = TypeVar('V')

class Repository(Generic[T]):
    """Generic repository pattern."""

    def __init__(self, model_class: type[T]) -> None:
        self._model_class = model_class

    def find_by_id(self, id: int) -> T | None:
        """Find entity by ID."""
        pass

    def find_all(self) -> list[T]:
        """Find all entities."""
        pass

    def save(self, entity: T) -> T:
        """Save entity."""
        pass

# Protocol for structural typing
class Drawable(Protocol):
    """Protocol for drawable objects."""

    def draw(self) -> None:
        """Draw the object."""
        ...

def render_objects(objects: Iterable[Drawable]) -> None:
    """Render all drawable objects."""
    for obj in objects:
        obj.draw()

# Union types (Python 3.10+)
def parse_id(value: str | int) -> int:
    """Parse ID from string or int."""
    if isinstance(value, str):
        return int(value)
    return value

# Optional with None default
def get_user_by_email(email: str, include_inactive: bool = False) -> User | None:
    """Get user by email address."""
    pass

# Callable types
def apply_operation(
    data: list[int],
    operation: Callable[[int], int],
) -> list[int]:
    """Apply operation to each item in data."""
    return [operation(item) for item in data]

# ❌ Bad: Missing or incorrect type hints
def process_data(data):  # Missing type hints
    return data

def get_user(id: str) -> dict:  # Too generic return type
    pass

def calculate(x: Any, y: Any) -> Any:  # Overuse of Any
    return x + y
```

### 2. Dataclasses and Pydantic Models | 数据类和 Pydantic 模型

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, validator

# ✅ Good: Dataclass usage
@dataclass(frozen=True)
class Point:
    """Immutable point in 2D space."""
    x: float
    y: float

    def distance_to(self, other: 'Point') -> float:
        """Calculate distance to another point."""
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5

@dataclass
class User:
    """User data model."""
    id: int
    username: str
    email: str
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True
    tags: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Validate data after initialization."""
        if not self.email or '@' not in self.email:
            raise ValueError("Invalid email address")

# ✅ Good: Pydantic models for validation
class UserStatus(str, Enum):
    """User status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class UserCreate(BaseModel):
    """Model for creating a new user."""
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., regex=r'^[^@]+@[^@]+\.[^@]+$')
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)

    @validator('username')
    def username_must_be_alphanumeric(cls, v: str) -> str:
        """Validate username contains only alphanumeric characters."""
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v.lower()

class UserResponse(BaseModel):
    """Model for user API responses."""
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    status: UserStatus
    created_at: datetime

    class Config:
        """Pydantic configuration."""
        orm_mode = True
        use_enum_values = True
```

### 3. Error Handling and Exceptions | 错误处理和异常

```python
# ✅ Good: Custom exceptions with proper hierarchy
class ApplicationError(Exception):
    """Base exception for application errors."""

    def __init__(self, message: str, error_code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.error_code = error_code

class ValidationError(ApplicationError):
    """Exception raised for validation errors."""
    pass

class NotFoundError(ApplicationError):
    """Exception raised when resource is not found."""
    pass

class DatabaseError(ApplicationError):
    """Exception raised for database operations."""
    pass

# ✅ Good: Proper exception handling
def get_user_by_id(user_id: int) -> User:
    """Get user by ID with proper error handling."""
    try:
        user = database.query(User).filter(User.id == user_id).first()
        if user is None:
            raise NotFoundError(
                f"User with ID {user_id} not found",
                error_code="USER_NOT_FOUND"
            )
        return user
    except DatabaseError as e:
        logger.error(f"Database error while fetching user {user_id}: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error while fetching user {user_id}: {e}")
        raise ApplicationError(
            "An unexpected error occurred",
            error_code="INTERNAL_ERROR"
        ) from e

# ✅ Good: Context managers for resource management
from contextlib import contextmanager
from typing import Generator

@contextmanager
def database_transaction() -> Generator[None, None, None]:
    """Context manager for database transactions."""
    transaction = database.begin()
    try:
        yield
        transaction.commit()
    except Exception:
        transaction.rollback()
        raise
    finally:
        transaction.close()

# Usage
def transfer_funds(from_account: int, to_account: int, amount: float) -> None:
    """Transfer funds between accounts."""
    with database_transaction():
        debit_account(from_account, amount)
        credit_account(to_account, amount)
        log_transaction(from_account, to_account, amount)

# ❌ Bad: Poor exception handling
def get_user(user_id):
    try:
        return database.get(user_id)
    except:  # Too broad exception handling
        return None  # Silently ignoring errors

def process_file(filename):
    file = open(filename)  # No proper resource management
    data = file.read()
    return data  # File never closed
```

## Documentation and Docstrings | 文档和文档字符串

### 1. Docstring Conventions | 文档字符串约定

```python
# ✅ Good: Comprehensive docstrings following Google style

def calculate_compound_interest(
    principal: float,
    rate: float,
    time: float,
    compound_frequency: int = 1,
) -> float:
    """Calculate compound interest.

    This function calculates the compound interest based on the principal
    amount, interest rate, time period, and compounding frequency.

    Args:
        principal: The initial amount of money.
        rate: The annual interest rate as a decimal (e.g., 0.05 for 5%).
        time: The time period in years.
        compound_frequency: Number of times interest is compounded per year.
            Defaults to 1 (annually).

    Returns:
        The final amount after compound interest.

    Raises:
        ValueError: If any of the input values are negative.

    Example:
        >>> calculate_compound_interest(1000, 0.05, 2, 4)
        1104.89

    Note:
        The formula used is: A = P(1 + r/n)^(nt)
        where A is the amount, P is principal, r is rate,
        n is compound frequency, and t is time.
    """
    if principal < 0 or rate < 0 or time < 0 or compound_frequency <= 0:
        raise ValueError("All values must be non-negative, compound_frequency must be positive")

    return principal * (1 + rate / compound_frequency) ** (compound_frequency * time)

class UserService:
    """Service class for user-related operations.

    This class provides methods for creating, updating, and managing
    user accounts in the system.

    Attributes:
        repository: The user repository for data access.
        email_service: Service for sending emails.

    Example:
        >>> service = UserService(user_repo, email_service)
        >>> user = service.create_user("john", "john@example.com")
    """

    def __init__(self, repository: UserRepository, email_service: EmailService) -> None:
        """Initialize the user service.

        Args:
            repository: Repository for user data operations.
            email_service: Service for sending emails to users.
        """
        self.repository = repository
        self.email_service = email_service

    def create_user(self, username: str, email: str) -> User:
        """Create a new user account.

        Args:
            username: Unique username for the account.
            email: User's email address.

        Returns:
            The created user object.

        Raises:
            ValidationError: If username or email is invalid.
            DuplicateError: If username or email already exists.
        """
        # Implementation here
        pass

# ❌ Bad: Poor or missing docstrings
def calc(p, r, t):
    # Calculate something
    return p * r * t

class User:
    def __init__(self, name):
        self.name = name

    def save(self):
        pass  # No documentation
```

## Testing and Code Quality | 测试和代码质量

### 1. Unit Testing with pytest | 使用 pytest 进行单元测试

```python
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta

# ✅ Good: Comprehensive test structure

class TestUserService:
    """Test suite for UserService class."""

    @pytest.fixture
    def mock_repository(self) -> Mock:
        """Create mock user repository."""
        return Mock(spec=UserRepository)

    @pytest.fixture
    def mock_email_service(self) -> Mock:
        """Create mock email service."""
        return Mock(spec=EmailService)

    @pytest.fixture
    def user_service(self, mock_repository: Mock, mock_email_service: Mock) -> UserService:
        """Create UserService instance with mocked dependencies."""
        return UserService(mock_repository, mock_email_service)

    def test_create_user_success(self, user_service: UserService, mock_repository: Mock) -> None:
        """Test successful user creation."""
        # Arrange
        username = "testuser"
        email = "test@example.com"
        expected_user = User(id=1, username=username, email=email)
        mock_repository.create.return_value = expected_user

        # Act
        result = user_service.create_user(username, email)

        # Assert
        assert result == expected_user
        mock_repository.create.assert_called_once_with(username, email)

    def test_create_user_duplicate_username(
        self,
        user_service: UserService,
        mock_repository: Mock
    ) -> None:
        """Test user creation with duplicate username."""
        # Arrange
        mock_repository.create.side_effect = DuplicateError("Username already exists")

        # Act & Assert
        with pytest.raises(DuplicateError, match="Username already exists"):
            user_service.create_user("existing_user", "test@example.com")

    @pytest.mark.parametrize("username,email,expected_error", [
        ("", "test@example.com", "Username cannot be empty"),
        ("user", "", "Email cannot be empty"),
        ("user", "invalid-email", "Invalid email format"),
    ])
    def test_create_user_validation_errors(
        self,
        user_service: UserService,
        username: str,
        email: str,
        expected_error: str,
    ) -> None:
        """Test user creation validation errors."""
        with pytest.raises(ValidationError, match=expected_error):
            user_service.create_user(username, email)

# ✅ Good: Integration tests
@pytest.mark.integration
class TestUserServiceIntegration:
    """Integration tests for UserService."""

    @pytest.fixture(scope="class")
    def database(self):
        """Set up test database."""
        # Database setup code
        yield
        # Database cleanup code

    def test_user_creation_flow(self, database) -> None:
        """Test complete user creation flow."""
        # Test with real database
        pass

# ✅ Good: Property-based testing
from hypothesis import given, strategies as st

@given(
    principal=st.floats(min_value=0.01, max_value=1000000),
    rate=st.floats(min_value=0.001, max_value=0.2),
    time=st.floats(min_value=0.1, max_value=50),
)
def test_compound_interest_properties(principal: float, rate: float, time: float) -> None:
    """Test compound interest calculation properties."""
    result = calculate_compound_interest(principal, rate, time)

    # Result should always be greater than principal
    assert result > principal

    # Result should be finite
    assert math.isfinite(result)
```

### 2. Code Quality Tools Configuration | 代码质量工具配置

```python
# pyproject.toml
[tool.black]
line-length = 88
target-version = ['py312']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | build
  | dist
)/
'''

[tool.isort]
profile = "black"
multi_line_output = 3
line_length = 88
known_first_party = ["myapp"]
known_third_party = ["fastapi", "pydantic", "sqlalchemy"]

[tool.mypy]
python_version = "3.12"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_decorators = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_no_return = true
warn_unreachable = true
strict_equality = true

[tool.pylint.messages_control]
disable = [
    "missing-docstring",
    "too-few-public-methods",
]

[tool.pytest.ini_options]
minversion = "6.0"
addopts = "-ra -q --strict-markers --strict-config"
testpaths = ["tests"]
markers = [
    "slow: marks tests as slow",
    "integration: marks tests as integration tests",
    "unit: marks tests as unit tests",
]

[tool.coverage.run]
source = ["src"]
omit = [
    "*/tests/*",
    "*/venv/*",
    "*/__pycache__/*",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
]
```

## Performance and Best Practices | 性能和最佳实践

### 1. Efficient Data Structures | 高效的数据结构

```python
from collections import defaultdict, deque, Counter
from typing import DefaultDict

# ✅ Good: Use appropriate data structures

# Use defaultdict to avoid key checks
def group_users_by_department(users: list[User]) -> DefaultDict[str, list[User]]:
    """Group users by their department."""
    groups: DefaultDict[str, list[User]] = defaultdict(list)
    for user in users:
        groups[user.department].append(user)
    return groups

# Use deque for efficient queue operations
class TaskQueue:
    """Efficient task queue using deque."""

    def __init__(self) -> None:
        self._queue: deque[Task] = deque()

    def add_task(self, task: Task) -> None:
        """Add task to the end of queue."""
        self._queue.append(task)

    def add_priority_task(self, task: Task) -> None:
        """Add high-priority task to the front."""
        self._queue.appendleft(task)

    def get_next_task(self) -> Task | None:
        """Get next task from queue."""
        try:
            return self._queue.popleft()
        except IndexError:
            return None

# Use Counter for counting operations
def analyze_text(text: str) -> dict[str, int]:
    """Analyze word frequency in text."""
    words = text.lower().split()
    return dict(Counter(words))

# ❌ Bad: Inefficient data structure usage
def group_users_bad(users):
    groups = {}
    for user in users:
        if user.department not in groups:  # Unnecessary key check
            groups[user.department] = []
        groups[user.department].append(user)
    return groups
```

### 2. Generator Functions and Memory Efficiency | 生成器函数和内存效率

```python
# ✅ Good: Use generators for memory efficiency

def read_large_file(filename: str) -> Generator[str, None, None]:
    """Read large file line by line using generator."""
    with open(filename, 'r', encoding='utf-8') as file:
        for line in file:
            yield line.strip()

def process_users_batch(users: list[User], batch_size: int = 100) -> Generator[list[User], None, None]:
    """Process users in batches to manage memory."""
    for i in range(0, len(users), batch_size):
        yield users[i:i + batch_size]

def fibonacci_sequence(n: int) -> Generator[int, None, None]:
    """Generate Fibonacci sequence up to n numbers."""
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

# Usage
for batch in process_users_batch(all_users, batch_size=50):
    process_batch(batch)

# ✅ Good: List comprehensions vs generator expressions
# Use list comprehension when you need the full list
squared_numbers = [x**2 for x in range(10)]

# Use generator expression for memory efficiency
sum_of_squares = sum(x**2 for x in range(1000000))  # Memory efficient

# ❌ Bad: Loading everything into memory
def read_large_file_bad(filename):
    with open(filename, 'r') as file:
        return file.readlines()  # Loads entire file into memory
```

## Code Quality Checklist | 代码质量检查清单

- [ ] All functions and classes have proper type hints
- [ ] Code follows PEP 8 naming conventions
- [ ] Line length is kept under 88 characters
- [ ] Imports are properly organized (stdlib, third-party, local)
- [ ] Docstrings follow Google or NumPy style
- [ ] Error handling is comprehensive with custom exceptions
- [ ] Unit tests cover all critical functionality
- [ ] Code is formatted with Black and isort
- [ ] Type checking passes with mypy
- [ ] No unused imports or variables
- [ ] Appropriate data structures are used for performance
- [ ] Memory efficiency is considered for large data processing

## 代码质量检查清单

- [ ] 所有函数和类都有适当的类型提示
- [ ] 代码遵循 PEP 8 命名约定
- [ ] 行长度保持在 88 个字符以下
- [ ] 导入正确组织（标准库、第三方、本地）
- [ ] 文档字符串遵循 Google 或 NumPy 风格
- [ ] 使用自定义异常进行全面的错误处理
- [ ] 单元测试覆盖所有关键功能
- [ ] 代码使用 Black 和 isort 格式化
- [ ] 使用 mypy 通过类型检查
- [ ] 没有未使用的导入或变量
- [ ] 使用适当的数据结构以提高性能
- [ ] 考虑大数据处理的内存效率