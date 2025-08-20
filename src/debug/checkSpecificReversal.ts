import sequelize from "../config/database";
import ScoreEvent from "../models/ScoreEvent";
import UserScoreTotal from "../models/UserScoreTotal";
import { QueryTypes } from "sequelize";

async function debugSimpleApprovalReversal() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established.");

    // Look for a specific post that should have a net zero delta
    const balanceCheck = await sequelize.query(
      `
      SELECT 
        ref_id,
        user_id,
        SUM(CASE WHEN event_type = 'MOD_APPROVED_BONUS' THEN delta ELSE 0 END) as approval_total,
        SUM(CASE WHEN event_type = 'MOD_APPROVED_BONUS_REVERSAL' THEN delta ELSE 0 END) as reversal_total,
        SUM(delta) as net_total,
        COUNT(CASE WHEN event_type = 'MOD_APPROVED_BONUS' THEN 1 ELSE NULL END) as approval_count,
        COUNT(CASE WHEN event_type = 'MOD_APPROVED_BONUS_REVERSAL' THEN 1 ELSE NULL END) as reversal_count
      FROM score_events 
      WHERE event_type IN ('MOD_APPROVED_BONUS', 'MOD_APPROVED_BONUS_REVERSAL')
        AND ref_id = '018e0eb3-77ba-47b7-98b1-961e7118e63e'
      GROUP BY ref_id, user_id
    `,
      { type: QueryTypes.SELECT }
    );

    console.log("\n=== Balance Check for Specific Post ===");
    balanceCheck.forEach((item: any) => {
      console.log(`PostID: ${item.ref_id}`);
      console.log(`User: ${item.user_id}`);
      console.log(`Approval Total: ${item.approval_total}`);
      console.log(`Reversal Total: ${item.reversal_total}`);
      console.log(`Net Total: ${item.net_total}`);
      console.log(`Approval Count: ${item.approval_count}`);
      console.log(`Reversal Count: ${item.reversal_count}`);
      console.log("---");
    });

    // Check user's current total
    const userTotal = await UserScoreTotal.findByPk(166);
    console.log(
      `\nUser 166 Current Total: ${userTotal?.total_points || 0} (scaled), ${
        (userTotal?.total_points || 0) / 1000
      } (unscaled)`
    );

    // List all events for this user to see the pattern
    const userEvents = await ScoreEvent.findAll({
      where: { user_id: 166 },
      order: [["created_at", "ASC"]],
      limit: 20,
    });

    console.log("\n=== All Events for User 166 ===");
    userEvents.forEach((event: any) => {
      console.log(
        `Type: ${event.event_type}, Delta: ${event.delta}, RefID: ${event.ref_id}, Created: ${event.created_at}`
      );
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sequelize.close();
  }
}

debugSimpleApprovalReversal();
