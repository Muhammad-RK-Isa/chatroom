# Testing Guide

This guide covers testing practices and conventions for the Chatroom project.

## Running Tests

### All Tests

Run all tests across the monorepo:

```bash
bun run test
```

### Watch Mode

Run tests in watch mode for active development:

```bash
bun run test:watch
```

### Coverage

Run tests with coverage reports:

```bash
bun run test:coverage
```

### Workspace-Specific Tests

Run tests for a specific workspace:

```bash
# Web application tests
bun run test --filter=web

# Server tests
bun run test --filter=server

# Native application tests
bun run test --filter=native
```

## Writing Tests

### File Naming

- Place test files next to the code they test
- Use `.test.ts` for TypeScript files
- Use `.test.tsx` for React components

### Test Structure

Write clear, focused tests that follow these principles:

```typescript
import { describe, it, expect } from 'bun:test'

describe('ComponentName or FunctionName', () => {
  it('should describe expected behavior', () => {
    // Arrange: Set up test data
    const input = 'test'
    
    // Act: Execute the code being tested
    const result = myFunction(input)
    
    // Assert: Verify the outcome
    expect(result).toBe('expected')
  })
})
```

### Async Tests

Use `async/await` for asynchronous tests:

```typescript
it('should handle async operations', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})
```

### Best Practices

- **Write assertions inside `it()` or `test()` blocks** - Don't place assertions outside test blocks
- **Use descriptive test names** - Test names should clearly describe what is being tested
- **Test one thing per test** - Keep tests focused and atomic
- **Avoid `.only` and `.skip` in committed code** - These should only be used during development
- **Use `async/await` instead of done callbacks** - More readable and easier to debug
- **Keep test suites reasonably flat** - Avoid excessive `describe` nesting
- **Handle edge cases** - Test boundary conditions and error states
- **Mock external dependencies** - Isolate the code under test

### What to Test

Focus your testing efforts on:

1. **Business logic correctness** - Core functionality and algorithms
2. **Edge cases** - Boundary conditions, null/undefined values, empty arrays, etc.
3. **Error handling** - How your code responds to failures
4. **Integration points** - API calls, database queries, external services
5. **User interactions** - Click handlers, form submissions, navigation
6. **Accessibility** - ARIA attributes, keyboard navigation, screen reader support

### React Component Testing

```typescript
import { describe, it, expect } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'

describe('Button', () => {
  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    await userEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### API Testing

```typescript
import { describe, it, expect } from 'bun:test'

describe('API: /users', () => {
  it('should return user data', async () => {
    const response = await fetch('http://localhost:3000/api/users/1')
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('name')
  })
  
  it('should return 404 for non-existent user', async () => {
    const response = await fetch('http://localhost:3000/api/users/999999')
    
    expect(response.status).toBe(404)
  })
})
```

## Test Organization

```
apps/
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   └── Button.test.tsx
│   │   ├── utils/
│   │   │   ├── format.ts
│   │   │   └── format.test.ts
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── users.ts
│   │   │   └── users.test.ts
```

## Continuous Integration

Tests run automatically on:
- Every pull request
- Every push to main branch
- Before deployment

Ensure all tests pass before merging code.

## Troubleshooting

### Tests timing out

Increase timeout for long-running tests:

```typescript
it('should handle long operation', async () => {
  // Test code
}, { timeout: 10000 }) // 10 seconds
```

### Flaky tests

- Avoid testing implementation details
- Use `waitFor` for async UI updates
- Mock time-dependent code
- Ensure proper cleanup between tests

## Resources

- [Bun Test Runner Documentation](https://bun.sh/docs/cli/test)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
- [React Testing Guide](https://react.dev/learn/testing)
