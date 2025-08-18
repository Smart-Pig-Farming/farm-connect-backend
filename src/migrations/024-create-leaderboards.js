"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ensure the uuid-ossp extension exists so uuid_generate_v4() is available (needed on fresh DBs)
    try {
      await queryInterface.sequelize.query(
        'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
      );
    } catch (err) {
      // Non-fatal: log but continue so migration does not abort if extension creation lacks perms
      // eslint-disable-next-line no-console
      console.warn(
        "Could not ensure uuid-ossp extension (proceeding):",
        err.message
      );
    }
    await queryInterface.createTable("leaderboard_snapshots", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.fn("uuid_generate_v4"),
        primaryKey: true,
      },
      period: { type: Sequelize.STRING(16), allowNull: false }, // daily, weekly, monthly
      period_start: { type: Sequelize.DATEONLY, allowNull: false },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      points: { type: Sequelize.INTEGER, allowNull: false }, // scaled
      rank: { type: Sequelize.INTEGER, allowNull: false },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
    await queryInterface.addIndex("leaderboard_snapshots", [
      "period",
      "period_start",
    ]);
    await queryInterface.addIndex("leaderboard_snapshots", [
      "user_id",
      "period",
      "period_start",
    ]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("leaderboard_snapshots");
  },
};
