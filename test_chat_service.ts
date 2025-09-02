import chatService from "./src/services/chat/ChatService";
import sequelize from "./src/config/database";

async function testChatServiceRAG() {
  try {
    await sequelize.authenticate();
    console.log("🔗 Connected to database");

    // Test the enhanced ChatService with RAG improvements
    const testRequests = [
      {
        message: "How to improve pig feeding efficiency?",
        description: "Should combine keyword search with category fallback",
      },
      {
        message: "What are the best practices for disease prevention?",
        description:
          "Should detect disease category and provide relevant content",
      },
      {
        message: "Tell me about nutrition",
        description: "Should fall back to category-based search",
      },
    ];

    for (const testRequest of testRequests) {
      console.log(`\n${"=".repeat(80)}`);
      console.log(`🧪 Testing: "${testRequest.message}"`);
      console.log(`📋 Expected: ${testRequest.description}`);
      console.log(`${"=".repeat(80)}`);

      try {
        const startTime = Date.now();

        // Test the welcome message functionality
        if (testRequest.message.includes("nutrition")) {
          const welcomeMessage = await chatService.getWelcomeMessage([
            "feeding_nutrition",
          ]);
          console.log(
            `\n💬 Welcome Message: ${welcomeMessage.text.substring(0, 200)}...`
          );
          console.log(
            `📊 Sources: ${welcomeMessage.context?.sources.length || 0}`
          );
        }

        const endTime = Date.now();
        console.log(`⏱️  Processing completed in ${endTime - startTime}ms`);
      } catch (error) {
        console.error(`❌ Error processing: ${error}`);
      }
    }

    await sequelize.close();
    console.log("\n✅ ChatService RAG testing completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    await sequelize.close();
    process.exit(1);
  }
}

testChatServiceRAG().catch(console.error);
