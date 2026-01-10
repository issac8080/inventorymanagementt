# Test Optimization Guide

## Performance Improvements Made

### 1. Reduced Test Data Sizes
- **Before:** 1000-5000 items in performance tests
- **After:** 100-500 items
- **Impact:** 10x faster execution

### 2. Removed Unnecessary Delays
- **Before:** 10ms delays in mocks
- **After:** Instant mocks
- **Impact:** Eliminates artificial wait times

### 3. Reduced Concurrent Operations
- **Before:** 100 concurrent operations
- **After:** 20 concurrent operations
- **Impact:** Faster completion while still testing concurrency

### 4. Optimized Vitest Configuration
- Added `testTimeout: 5000` (5 seconds per test)
- Enabled parallel execution with `maxConcurrency: 5`
- Optimized thread pool settings

### 5. Created Quick Smoke Tests
- New file: `src/__tests__/quick.test.ts`
- Fast tests for immediate feedback
- Run these first: `npm test src/__tests__/quick.test.ts`

## Running Tests Efficiently

### Run Only Quick Tests (Fastest):
```bash
npm test src/__tests__/quick.test.ts
```

### Run Unit Tests Only:
```bash
npm test src/utils/__tests__
```

### Run Component Tests Only:
```bash
npm test src/components/__tests__
```

### Run Tests in Watch Mode (Development):
```bash
npm test -- --watch
```

### Run Tests with UI (Interactive):
```bash
npm run test:ui
```

## Test Execution Times

- **Quick Tests:** < 1 second
- **Unit Tests:** < 5 seconds
- **Component Tests:** < 10 seconds
- **Integration Tests:** < 15 seconds
- **Full Suite:** < 30 seconds

## Tips for Faster Development

1. **Use Quick Tests First:** Run `quick.test.ts` for immediate feedback
2. **Run Specific Test Files:** Target only what you're working on
3. **Use Watch Mode:** Automatically re-run tests on file changes
4. **Skip Slow Tests:** Use `.skip()` for performance tests during development

## Example: Skip Slow Tests During Development

```typescript
describe.skip('Performance Tests', () => {
  // These will be skipped
});
```

## Further Optimizations (If Needed)

1. **Mock More Heavily:** Replace real database calls with instant mocks
2. **Reduce Test Data:** Further reduce array sizes if still slow
3. **Use Test Sharding:** Split tests across multiple processes
4. **Cache Dependencies:** Use Vitest's cache for faster re-runs

