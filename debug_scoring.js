const { Sequelize, DataTypes } = require("sequelize");

// Database connection
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
  logging: console.log,
});

// ScoreEvent model
const ScoreEvent = sequelize.define(
  "ScoreEvent",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    actor_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    event_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ref_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ref_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    delta: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    meta: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "score_events",
    timestamps: true,
    underscored: true,
  }
);

// UserScoreTotal model
const UserScoreTotal = sequelize.define(
  "UserScoreTotal",
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    total_points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "user_score_totals",
    timestamps: true,
    underscored: true,
  }
);

async function debugScoring() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established.");

    // Find recent MOD_APPROVED_BONUS events
    const approvalEvents = await ScoreEvent.findAll({
      where: {
        event_type: "MOD_APPROVED_BONUS",
      },
      order: [["created_at", "DESC"]],
      limit: 10,
    });

    console.log("\n=== Recent MOD_APPROVED_BONUS Events ===");
    approvalEvents.forEach((event) => {
      console.log(
        `User: ${event.user_id}, Delta: ${event.delta}, PostID: ${event.ref_id}, Created: ${event.created_at}`
      );
    });

    // Find recent MOD_APPROVED_BONUS_REVERSAL events
    const reversalEvents = await ScoreEvent.findAll({
      where: {
        event_type: "MOD_APPROVED_BONUS_REVERSAL",
      },
      order: [["created_at", "DESC"]],
      limit: 10,
    });

    console.log("\n=== Recent MOD_APPROVED_BONUS_REVERSAL Events ===");
    reversalEvents.forEach((event) => {
      console.log(
        `User: ${event.user_id}, Delta: ${event.delta}, PostID: ${event.ref_id}, Created: ${event.created_at}`
      );
    });

    // Check if there are unbalanced approvals (approvals without reversals)
    const unbalanced = await sequelize.query(
      `
      SELECT 
        a.ref_id as post_id,
        a.user_id,
        COUNT(a.id) as approval_count,
        COUNT(r.id) as reversal_count,
        SUM(a.delta) as approval_delta,
        COALESCE(SUM(r.delta), 0) as reversal_delta,
        (SUM(a.delta) + COALESCE(SUM(r.delta), 0)) as net_delta
      FROM score_events a
      LEFT JOIN score_events r ON 
        a.user_id = r.user_id 
        AND a.ref_id = r.ref_id 
        AND r.event_type = 'MOD_APPROVED_BONUS_REVERSAL'
      WHERE a.event_type = 'MOD_APPROVED_BONUS'
      GROUP BY a.ref_id, a.user_id
      HAVING net_delta != 0
      ORDER BY a.created_at DESC
      LIMIT 10
    `,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log("\n=== Unbalanced Approvals (Net Delta != 0) ===");
    if (unbalanced.length === 0) {
      console.log("No unbalanced approvals found.");
    } else {
      unbalanced.forEach((item) => {
        console.log(
          `PostID: ${item.post_id}, User: ${item.user_id}, Approvals: ${item.approval_count}, Reversals: ${item.reversal_count}, Net Delta: ${item.net_delta}`
        );
      });
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sequelize.close();
  }
}

debugScoring();
