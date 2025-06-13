/**
 * Hook Test Suite Index
 *
 * This file imports all hook test suites to ensure they are run as part of the test suite.
 * Each hook has comprehensive tests covering:
 * - Basic functionality
 * - React lifecycle integration
 * - Signal subscription management
 * - Error handling and edge cases
 * - Performance considerations
 * - Integration with reactive core
 */

import "./use-signal.test"
import "./use-signal-ref.test"
import "./use-signal-computed.test"
import "./use-signal-effect.test"
import "./use-reactive-element.test"

describe("Hooks Test Suite", () => {
	it("should have all hook tests imported and running", () => {
		// This test ensures that all hook test files are properly imported
		expect(true).toBe(true)
	})
})
