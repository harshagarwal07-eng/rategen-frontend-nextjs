import { ZodError } from "zod";
import {
  validateTravelAgentQuery,
  validateMCPCall,
  sanitizeQuery,
  sanitizeSearchText,
  createValidationMiddleware,
  TravelAgentQuerySchema,
} from "./travel-agent-validation";

/**
 * Test script to demonstrate input validation functionality
 */
async function testValidation() {
  console.log("✅ Testing Input Validation\n");

  // Test 1: Valid travel agent queries
  console.log("--- Test 1: Valid Travel Agent Queries ---");

  const validQueries = [
    {
      name: "Complete valid query",
      data: {
        query:
          "I want to visit Singapore for 3 nights from Dec 15-18, 2025 for 2 adults",
        dmc_id: "test-dmc-123",
        destinations: ["Singapore"],
        country_name: "singapore",
        dates: ["2025-12-15", "2025-12-18"],
        no_of_nights: 3,
        num_people: 2,
        request_type: "quote",
      },
    },
    {
      name: "Minimal valid query",
      data: {
        query: "Beach resort in Mauritius",
        country_name: "mauritius",
        num_people: 2,
      },
    },
    {
      name: "Family with children",
      data: {
        query: "Family trip to Bali with kids",
        country_name: "indonesia",
        num_people: 2,
        children: [{ age: 8 }, { age: 12 }],
        no_of_nights: 5,
        budget: "$2000-3000",
      },
    },
  ];

  validQueries.forEach((test) => {
    const result = validateTravelAgentQuery(test.data);
    if (result.success) {
      console.log(`✅ ${test.name}: PASSED`);
    } else {
      console.log(`❌ ${test.name}: FAILED - ${result.error.message}`);
    }
  });

  // Test 2: Invalid travel agent queries
  console.log(`\n--- Test 2: Invalid Travel Agent Queries ---`);

  const invalidQueries = [
    {
      name: "Empty query",
      data: { query: "" },
    },
    {
      name: "Past date",
      data: {
        query: "Visit Paris",
        dates: ["2020-01-01"],
        num_people: 2,
      },
    },
    {
      name: "Invalid date format",
      data: {
        query: "Visit London",
        dates: ["Jan 15 2025"],
        num_people: 2,
      },
    },
    {
      name: "End date before start date",
      data: {
        query: "Visit Tokyo",
        dates: ["2025-12-20", "2025-12-15"],
        num_people: 2,
      },
    },
    {
      name: "Too many people",
      data: {
        query: "Large group tour",
        num_people: 100,
        country_name: "singapore",
      },
    },
    {
      name: "Missing destination",
      data: {
        query: "I want to travel",
        num_people: 2,
      },
    },
    {
      name: "Invalid individual_rate request",
      data: {
        query: "Price for tour",
        request_type: "individual_rate",
        num_people: 2,
        country_name: "singapore",
        // Missing service_type and service_id
      },
    },
    {
      name: "Unrealistic age",
      data: {
        query: "Family trip",
        num_people: 2,
        children: [{ age: 150 }],
        country_name: "singapore",
      },
    },
    {
      name: "Invalid country name",
      data: {
        query: "Visit somewhere",
        country_name: "Country123!",
        num_people: 2,
      },
    },
    {
      name: "Query too long",
      data: {
        query: "a".repeat(3000),
        num_people: 2,
      },
    },
  ];

  invalidQueries.forEach((test) => {
    const result = validateTravelAgentQuery(test.data);
    if (!result.success) {
      console.log(
        `✅ ${test.name}: Correctly rejected - ${result.error.issues[0].message}`
      );
    } else {
      console.log(`❌ ${test.name}: Should have been rejected but passed`);
    }
  });

  // Test 3: MCP Tool Validation
  console.log(`\n--- Test 3: MCP Tool Validation ---`);

  const mcpTests = [
    {
      name: "Valid ToursList",
      tool: "ToursList",
      args: {
        dmc_id: "test-dmc-123",
        search_text: "city tour",
        country_name: "singapore",
      },
    },
    {
      name: "Invalid ToursList - empty search",
      tool: "ToursList",
      args: {
        dmc_id: "test-dmc-123",
        search_text: "",
        country_name: "singapore",
      },
    },
    {
      name: "Valid ServiceRates",
      tool: "ServiceRates",
      args: {
        dmc_id: "test-dmc-123",
        service_type: "tour",
        service_id: "city-tour-123",
        num_people: 4,
        date_from: "2025-12-15",
      },
    },
    {
      name: "Invalid ServiceRates - negative people",
      tool: "ServiceRates",
      args: {
        dmc_id: "test-dmc-123",
        service_type: "tour",
        service_id: "city-tour-123",
        num_people: -2,
      },
    },
    {
      name: "Valid ItineraryAgent",
      tool: "ItineraryAgent",
      args: {
        dmc_id: "test-dmc-123",
        country_name: "singapore",
        no_of_nights: "3",
      },
    },
  ];

  mcpTests.forEach((test) => {
    const result = validateMCPCall(test.tool, test.args);
    if (result.success) {
      console.log(`✅ ${test.name}: PASSED`);
    } else {
      console.log(
        `❌ ${test.name}: FAILED - ${
          (result.error as ZodError).issues[0].message
        }`
      );
    }
  });

  // Test 4: Sanitization
  console.log(`\n--- Test 4: Input Sanitization ---`);

  const sanitizationTests = [
    {
      name: "Remove HTML tags",
      input: "Visit <script>alert('xss')</script> Singapore",
      expected: "Visit alert('xss') Singapore",
    },
    {
      name: "Normalize whitespace",
      input: "Visit   Singapore    with   spaces",
      expected: "Visit Singapore with spaces",
    },
    {
      name: "Trim length",
      input: "a".repeat(2000),
      expected: "a".repeat(2000),
    },
  ];

  sanitizationTests.forEach((test) => {
    const sanitized = sanitizeQuery(test.input);
    const passed = sanitized === test.expected;
    console.log(
      `${passed ? "✅" : "❌"} ${test.name}: ${
        passed
          ? "PASSED"
          : `FAILED - Expected "${test.expected.substring(
              0,
              20
            )}...", got "${sanitized.substring(0, 20)}..."`
      }`
    );
  });

  // Test 5: Validation Middleware
  console.log(`\n--- Test 5: Validation Middleware ---`);

  const middleware = createValidationMiddleware(
    TravelAgentQuerySchema,
    "test-middleware"
  );

  const middlewareTests = [
    {
      name: "Valid middleware test",
      data: {
        query: "Visit Singapore",
        country_name: "singapore",
        num_people: 2,
      },
    },
    {
      name: "Invalid middleware test",
      data: {
        query: "",
        num_people: -1,
      },
    },
  ];

  middlewareTests.forEach((test) => {
    const result = middleware(test.data);
    if (result.data) {
      console.log(`✅ ${test.name}: PASSED`);
    } else {
      console.log(`❌ ${test.name}: FAILED - ${result.error}`);
    }
  });

  console.log(`\n🎉 Validation testing completed!`);
}

// Export for testing
export { testValidation };

// Run if called directly
if (require.main === module) {
  testValidation().catch(console.error);
}
