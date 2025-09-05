import sequelize from "./src/config/database";

async function checkMediaData() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database");

    const result = await sequelize.query(`
      SELECT title, categories, media 
      FROM best_practice_contents 
      LIMIT 3;
    `);

    console.log("\n📸 Media data check:");
    (result[0] as any[]).forEach((row: any, i: number) => {
      console.log(`${i + 1}. ${row.title}`);
      console.log(`   Categories: ${JSON.stringify(row.categories)}`);
      console.log(`   Media: ${JSON.stringify(row.media)}`);
      console.log("");
    });

    await sequelize.close();
    console.log("✅ Check completed");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    await sequelize.close();
  }
}

checkMediaData();
