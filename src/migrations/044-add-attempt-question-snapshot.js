"use strict";
/**
 * Migration 044: Add attempt_questions_snapshot to quiz_attempts
 * Stores an immutable snapshot of served questions (with options & correctness) for review.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn(
        "quiz_attempts",
        "attempt_questions_snapshot",
        {
          type: Sequelize.JSONB,
          allowNull: true,
        }
      );
    } catch (e) {
      // ignore if exists
    }
  },
  async down(queryInterface) {
    try {
      await queryInterface.removeColumn(
        "quiz_attempts",
        "attempt_questions_snapshot"
      );
    } catch {}
  },
};
