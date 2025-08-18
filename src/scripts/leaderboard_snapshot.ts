import leaderboardAggregationService from "../services/scoring/LeaderboardAggregationService";
import sequelize from "../config/database";

(async () => {
  try {
    const counts = await leaderboardAggregationService.rebuildAll();
    console.log("Leaderboard aggregation complete", counts);
    await sequelize.close();
  } catch (e) {
    console.error("Leaderboard aggregation failed", e);
    process.exitCode = 1;
  }
})();
