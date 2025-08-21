"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(64)");
  },
  async down(queryInterface, Sequelize) {
    // No-op (don't drop if present; reversible not required)
  }
};
