"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Insert streak rows for users who lack them
    await queryInterface.sequelize.query(`
      INSERT INTO user_streaks (user_id, current_length, best_length, last_day, created_at, updated_at)
      SELECT u.id, 0, 0, NULL, NOW(), NOW()
      FROM users u
      LEFT JOIN user_streaks s ON s.user_id = u.id
      WHERE s.user_id IS NULL;
    `);
  },
  async down() {
    // No down migration (data only)
  },
};
