"use strict";

/**
 * Migration 043: Augment quiz attempts for LiveQuiz functionality
 * Adds snapshot + lifecycle columns and loosens answer uniqueness.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Add new columns to quiz_attempts if not existing
      const addCol = async (table, col, spec) => {
        try {
          await queryInterface.addColumn(table, col, spec, { transaction });
        } catch (e) {
          // ignore if already exists
        }
      };

      await addCol("quiz_attempts", "served_question_ids", {
        type: Sequelize.JSONB,
        allowNull: true,
      });
      await addCol("quiz_attempts", "total_questions", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await addCol("quiz_attempts", "question_order", {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        allowNull: true,
      });
      await addCol("quiz_attempts", "passing_score_snapshot", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await addCol("quiz_attempts", "expires_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
      // status enum
      try {
        await queryInterface.sequelize.query(
          "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_quiz_attempts_status') THEN CREATE TYPE enum_quiz_attempts_status AS ENUM ('in_progress','completed','expired'); END IF; END $$;",
          { transaction }
        );
      } catch {}
      await addCol("quiz_attempts", "status", {
        type: Sequelize.ENUM("in_progress", "completed", "expired"),
        allowNull: false,
        defaultValue: "in_progress",
      });

      // Drop unique index on (attempt_id, question_id) for multi-select support
      try {
        await queryInterface.sequelize.query(
          "DROP INDEX IF EXISTS quiz_attempt_answers_unique_attempt_question;",
          { transaction }
        );
      } catch {}
      // Optional new composite (attempt_id, question_id, option_id)
      try {
        await queryInterface.sequelize.query(
          "CREATE INDEX IF NOT EXISTS quiz_attempt_answers_attempt_question_option_idx ON quiz_attempt_answers (attempt_id, question_id, option_id);",
          { transaction }
        );
      } catch {}

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const dropCol = async (table, col) => {
        try {
          await queryInterface.removeColumn(table, col, { transaction });
        } catch {}
      };
      await dropCol("quiz_attempts", "served_question_ids");
      await dropCol("quiz_attempts", "total_questions");
      await dropCol("quiz_attempts", "question_order");
      await dropCol("quiz_attempts", "passing_score_snapshot");
      await dropCol("quiz_attempts", "expires_at");
      await dropCol("quiz_attempts", "status");
      // Drop enum type explicitly
      await queryInterface.sequelize.query(
        "DROP TYPE IF EXISTS enum_quiz_attempts_status;",
        { transaction }
      );
      // Cannot easily restore previous unique index automatically.
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
