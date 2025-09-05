import leaderboardAggregationService from "../services/scoring/LeaderboardAggregationService";
import sequelize from "../config/database";

async function main() {
  const periods: ("daily" | "weekly" | "monthly" | "all")[] = [
    "daily",
    "weekly",
    "monthly",
    "all",
  ];
  const sampleLimit = 20;
  for (const p of periods) {
    const top = await leaderboardAggregationService.get(p, sampleLimit);
    const inconsistencies: any[] = [];
    for (const row of top) {
      const { rank, points } =
        await leaderboardAggregationService.getUserRankAndPoints(
          p,
          row.user_id
        );
      if (rank !== row.rank) {
        inconsistencies.push({
          user_id: row.user_id,
          leaderboardRank: row.rank,
          userRankQuery: rank,
          pointsFromTop: row.points,
          pointsFromUser: points,
        });
      }
    }
    if (inconsistencies.length) {
      console.log(
        `Period ${p}: FOUND ${inconsistencies.length} inconsistencies`
      );
      console.table(inconsistencies);
    } else {
      console.log(`Period ${p}: OK (no rank mismatches in top ${sampleLimit})`);
    }
  }
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
