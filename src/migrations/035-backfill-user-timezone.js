"use strict";

/**
 * Backfill existing users with a default timezone if null.
 * We choose 'UTC' as safe default.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ensure column exists (defensive)
    await queryInterface.sequelize.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(64);"
    );
    await queryInterface.sequelize.query(
      "UPDATE users SET timezone='UTC' WHERE timezone IS NULL OR timezone = ''"
    );
  },
  async down(queryInterface, Sequelize) {
    // No-op rollback (leave data in place)
  },
};
