const { sequelize } = require("./src/config/database");

async function checkImageDistribution() {
  try {
    await sequelize.authenticate();
    console.log("📊 Image Distribution by Category:\n");

    const results = await sequelize.query(
      `
      SELECT 
        categories->0 as category,
        media->0 as image_url,
        COUNT(*) as count
      FROM best_practice_contents 
      WHERE media IS NOT NULL 
      GROUP BY categories->0, media->0
      ORDER BY categories->0, media->0
    `,
      { type: sequelize.QueryTypes.SELECT }
    );

    results.forEach((row) => {
      console.log(
        `   ${row.category}: ${row.image_url} (used ${row.count} times)`
      );
    });

    console.log("\n🎯 Category-Image Mapping Summary:\n");
    const categoryStats = await sequelize.query(
      `
      SELECT 
        categories->0 as category,
        COUNT(DISTINCT media->0) as unique_images,
        COUNT(*) as total_practices
      FROM best_practice_contents 
      WHERE media IS NOT NULL 
      GROUP BY categories->0
      ORDER BY categories->0
    `,
      { type: sequelize.QueryTypes.SELECT }
    );

    categoryStats.forEach((row) => {
      console.log(
        `   ${row.category}: ${row.unique_images} unique images across ${row.total_practices} practices`
      );
    });

    await sequelize.close();
    console.log("\n✅ Analysis complete!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkImageDistribution();
