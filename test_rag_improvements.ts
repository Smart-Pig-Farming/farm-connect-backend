import ragService from "./src/services/rag/RAGService";
import sequelize from "./src/config/database";

async function testRAGImprovements() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database successfully");

    // Test cases to validate our improvements
    const testQueries = [
      {
        query: "How to feed pigs properly",
        description: "Should prioritize feeding content with phrase matching",
      },
      {
        query: '"pig disease prevention"',
        description: "Should handle quoted phrases for exact matching",
      },
      {
        query: "best feeding practices for growth",
        description: "Should combine feeding + growth keywords",
      },
      {
        query: "nutrition",
        description: "Should fall back to category search",
      },
      {
        query: "hello there",
        description: "Should use general context for non-farming queries",
      },
      {
        query: "feed conversion ratio calculation methods",
        description: "Should handle complex multi-word phrases",
      },
    ];

    for (const testCase of testQueries) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`Testing: "${testCase.query}"`);
      console.log(`Expected: ${testCase.description}`);
      console.log(`${"=".repeat(60)}`);

      const startTime = Date.now();

      // Test topic extraction
      const topics = ragService.extractTopics(testCase.query);
      console.log(`\n📋 Topic Analysis:`);
      console.log(`  Keywords: [${topics.keywords.join(", ")}]`);
      console.log(`  Categories: [${topics.categories.join(", ")}]`);

      // Test search
      const results = await ragService.searchRelevantContent(testCase.query, 5);
      const searchTime = Date.now() - startTime;

      console.log(`\n🔍 Search Results (${searchTime}ms):`);
      console.log(`  Total found: ${results.totalResults}`);
      console.log(`  Returned: ${results.results.length}`);

      if (results.results.length > 0) {
        console.log(`\n📊 Top Results:`);
        results.results.slice(0, 3).forEach((result: any, index: number) => {
          console.log(
            `  ${index + 1}. [Score: ${result.relevanceScore.toFixed(2)}] ${
              result.title
            }`
          );
          console.log(`     Categories: [${result.categories.join(", ")}]`);
          console.log(
            `     Description: ${result.description.substring(0, 100)}...`
          );
        });
      } else {
        console.log(`  ⚠️  No results found`);
      }

      // Test category-based fallback
      if (topics.categories.length > 0) {
        const categoryResults = await ragService.getContentByCategory(
          topics.categories,
          3
        );
        console.log(
          `\n📂 Category Fallback: ${categoryResults.results.length} results`
        );
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("Testing phrase extraction...");
    console.log(`${"=".repeat(60)}`);

    // Test phrase extraction functionality
    const phraseTests = [
      'How to "feed pigs" effectively',
      '"disease prevention" and health management',
      'Best practices for "weight gain" in pigs',
    ];

    phraseTests.forEach((test: string) => {
      const topics = ragService.extractTopics(test);
      console.log(`Query: "${test}"`);
      console.log(`  Keywords: [${topics.keywords.join(", ")}]`);
      console.log("");
    });

    await sequelize.close();
    console.log("\n✅ RAG improvement testing completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    await sequelize.close();
    process.exit(1);
  }
}

testRAGImprovements().catch(console.error);
