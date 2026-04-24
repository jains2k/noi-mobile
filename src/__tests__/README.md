# Automated Test Suite

## Overview
This test suite verifies critical functionality of the noi mobile app to prevent regressions and ensure features work as expected.

## Test Files

### `api.test.js`
Tests the `apiFetch` helper function that handles all API communication:
- ✅ Includes credentials for cookie-based authentication
- ✅ Sets proper Content-Type headers
- ✅ Handles POST/PUT/DELETE requests correctly
- ✅ Gracefully handles network errors
- ✅ Allows custom header overrides

### `integration.test.js`
End-to-end tests for user flows:
- ✅ Theme switching updates UI colors and persists
- ✅ Task creation, completion, and filtering
- ✅ Settings persistence (notifications, fonts)
- ✅ Authentication state management
- ✅ Mood tracking with 3-hour cooldown
- ✅ AI features (magic sort, journal reflection)

## Running Tests

```bash
# Run all tests
cd apps/mobile
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test api.test.js

# Run in watch mode
npm test -- --watch
```

## Test Coverage Goals
- API layer: 100%
- Critical user flows: 80%+
- UI components: 60%+

## What These Tests Catch
1. **Authentication Issues**: Ensures API calls include proper credentials
2. **Theme Bugs**: Verifies theme changes actually update UI
3. **Data Persistence**: Confirms settings and data are saved correctly
4. **Error Handling**: Ensures app doesn't crash on API failures
5. **Business Logic**: Validates rules like mood logging cooldown
6. **Integration Issues**: Catches problems between different parts of the app

## Known Issues Fixed by Recent Changes
- ✅ Fixed: API calls missing `credentials: "include"` causing 401 errors
- ✅ Fixed: Theme provider using stale data (staleTime: Infinity)
- ✅ Fixed: Queries running before authentication ready
- ✅ Fixed: Missing error handling causing crashes

## Manual Testing Checklist
After code changes, manually verify on a real device:
- [ ] Can sign in/sign up successfully
- [ ] Theme changes take effect immediately
- [ ] Tasks can be created and marked complete
- [ ] Settings toggle switches work
- [ ] Mood logging respects 3-hour cooldown
- [ ] Brain dump magic sort creates tasks
- [ ] Journal entries save with AI reflection

## Debugging Failed Tests
1. Check console output for specific error messages
2. Verify mock data matches expected format
3. Ensure API endpoints return correct status codes
4. Check that authentication state is properly mocked
5. Review network requests in test output

## Adding New Tests
When adding a new feature:
1. Add unit tests for new API calls in `api.test.js`
2. Add integration test for the user flow in `integration.test.js`
3. Update this README with the new test coverage
4. Run tests locally before committing

## CI/CD Integration
These tests should run automatically on:
- Every pull request
- Before merging to main
- Before building production releases
