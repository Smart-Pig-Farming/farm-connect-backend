"use strict";

// Migration 041: Add score_points (decimal) to quiz_attempts for partial scoring support

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("quiz_attempts", "score_points", {
      type: Sequelize.DECIMAL(8, 3),
      allowNull: true,
    });
  },
  async down(queryInterface) {
    try {
      await queryInterface.removeColumn("quiz_attempts", "score_points");
    } catch {}
  },
};
