"use strict";

// Migration 029: Remove obsolete leaderboard snapshot & aggregate tables (now computed dynamically)
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "DROP TABLE IF EXISTS leaderboard_snapshots CASCADE"
    );
    await queryInterface.sequelize.query(
      "DROP TABLE IF EXISTS user_score_leaderboards CASCADE"
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.createTable("leaderboard_snapshots", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      period: { type: Sequelize.STRING(16), allowNull: false },
      period_start: { type: Sequelize.DATEONLY, allowNull: false },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      points: { type: Sequelize.INTEGER, allowNull: false },
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
    await queryInterface.addIndex("leaderboard_snapshots", ["user_id"]);

    await queryInterface.createTable("user_score_leaderboards", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      period: { type: Sequelize.STRING(16), allowNull: false },
      period_start: { type: Sequelize.DATEONLY, allowNull: false },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      points: { type: Sequelize.INTEGER, allowNull: false },
      rank: { type: Sequelize.INTEGER },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
    await queryInterface.addIndex("user_score_leaderboards", [
      "period",
      "period_start",
    ]);
    await queryInterface.addIndex("user_score_leaderboards", ["user_id"]);
  },
};
