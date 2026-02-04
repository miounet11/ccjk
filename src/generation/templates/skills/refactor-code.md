# Code Refactoring

Intelligently refactor code to improve quality, maintainability, and performance.

## Triggers

- **command**: `/refactor` - Trigger with slash command
- **pattern**: `refactor this code` - Natural language trigger
- **pattern**: `重构代码` - Chinese language trigger
- **pattern**: `improve this code` - Alternative trigger

## Actions

### Action 1: prompt

Analyze code for refactoring opportunities.

```
Analyze the code and identify refactoring opportunities:

1. **Code Smells**
   - Long methods/functions
   - Duplicate code
   - Large classes
   - Long parameter lists
   - Divergent change
   - Shotgun surgery

2. **Design Issues**
   - Tight coupling
   - Low cohesion
   - Missing abstractions
   - Violation of SOLID principles

3. **Performance Issues**
   - Inefficient algorithms
   - Unnecessary computations
   - Memory leaks
   - N+1 queries

4. **Maintainability Issues**
   - Poor naming
   - Missing types
   - Lack of documentation
   - Complex conditionals
```

### Action 2: prompt

Generate refactored code.

```
Refactor the code following these principles:

1. **Extract Method**
   - Break down long functions
   - Create single-responsibility functions
   - Improve naming

2. **Extract Class/Module**
   - Separate concerns
   - Create cohesive modules
   - Reduce coupling

3. **Simplify Conditionals**
   - Use guard clauses
   - Replace nested conditionals
   - Use polymorphism where appropriate

4. **Improve Types**
   - Add proper TypeScript types
   - Use generics for reusability
   - Leverage type inference

5. **Optimize Performance**
   - Reduce complexity
   - Cache expensive operations
   - Use efficient data structures

Provide:
- Refactored code
- Explanation of changes
- Before/after comparison
- Benefits of refactoring
```

### Action 3: prompt

Verify refactoring maintains functionality.

```
Verify that the refactored code:

1. Maintains the same functionality
2. Passes all existing tests
3. Improves code quality metrics
4. Doesn't introduce new bugs
5. Improves readability and maintainability

Suggest any additional tests needed to verify the refactoring.
```

## Requirements

- **context**: code-file - Must have code to refactor

---

**Category:** code-quality
**Priority:** 7
**Tags:** refactoring, code-quality, clean-code, maintainability
**Source:** smart-analysis
