"use strict";

/**
 * Migration 040: Augment quiz system
 * - Add metadata & soft delete columns to quiz_questions / quiz_question_options
 * - Create quiz_attempts and quiz_attempt_answers tables
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Extend quiz_questions
      await queryInterface.addColumn(
        "quiz_questions",
        "type",
        {
          type: Sequelize.ENUM("mcq", "multi", "truefalse"),
          allowNull: false,
          defaultValue: "mcq",
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "quiz_questions",
        "difficulty",
        {
          type: Sequelize.ENUM("easy", "medium", "hard"),
          allowNull: false,
          defaultValue: "medium",
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "quiz_questions",
        "is_active",
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        { transaction }
      );
      await queryInterface.addColumn(
        "quiz_questions",
        "is_deleted",
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        { transaction }
      );
      await queryInterface.addColumn(
        "quiz_questions",
        "deleted_at",
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        "quiz_questions",
        "deleted_by",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "id" },
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "quiz_questions",
        "media_url",
        { type: Sequelize.TEXT, allowNull: true },
        { transaction }
      );

      // 2. Extend quiz_question_options
      await queryInterface.addColumn(
        "quiz_question_options",
        "is_deleted",
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        { transaction }
      );
      await queryInterface.addColumn(
        "quiz_question_options",
        "deleted_at",
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        "quiz_question_options",
        "deleted_by",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "id" },
        },
        { transaction }
      );

      // 3. Create quiz_attempts
      await queryInterface.createTable(
        "quiz_attempts",
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          quiz_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "quizzes", key: "id" },
            onDelete: "CASCADE",
          },
          user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
          },
          started_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
          submitted_at: { type: Sequelize.DATE, allowNull: true },
          duration_seconds_snapshot: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          score_raw: { type: Sequelize.INTEGER, allowNull: true },
          score_percent: { type: Sequelize.INTEGER, allowNull: true },
          passed: { type: Sequelize.BOOLEAN, allowNull: true },
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
        },
        { transaction }
      );

      // 4. Create quiz_attempt_answers
      await queryInterface.createTable(
        "quiz_attempt_answers",
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          attempt_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "quiz_attempts", key: "id" },
            onDelete: "CASCADE",
          },
          question_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "quiz_questions", key: "id" },
          },
          option_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "quiz_question_options", key: "id" },
          },
          is_correct_snapshot: { type: Sequelize.BOOLEAN, allowNull: false },
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
        },
        { transaction }
      );

      // 5. Indexes (idempotent raw SQL for partial/compound indexes)
      const sqlStatements = [
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quiz_questions_active_idx') THEN
            CREATE INDEX quiz_questions_active_idx ON quiz_questions (quiz_id, order_index) WHERE is_active = true AND is_deleted = false;
          END IF; END $$;`,
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quiz_questions_type_idx') THEN
            CREATE INDEX quiz_questions_type_idx ON quiz_questions (type);
          END IF; END $$;`,
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quiz_questions_difficulty_idx') THEN
            CREATE INDEX quiz_questions_difficulty_idx ON quiz_questions (difficulty);
          END IF; END $$;`,
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quiz_attempts_quiz_user_idx') THEN
            CREATE INDEX quiz_attempts_quiz_user_idx ON quiz_attempts (quiz_id, user_id, started_at DESC);
          END IF; END $$;`,
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quiz_attempt_answers_attempt_idx') THEN
            CREATE INDEX quiz_attempt_answers_attempt_idx ON quiz_attempt_answers (attempt_id);
          END IF; END $$;`,
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quiz_attempt_answers_question_idx') THEN
            CREATE INDEX quiz_attempt_answers_question_idx ON quiz_attempt_answers (question_id);
          END IF; END $$;`,
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quiz_attempt_answers_unique_attempt_question') THEN
            CREATE UNIQUE INDEX quiz_attempt_answers_unique_attempt_question ON quiz_attempt_answers (attempt_id, question_id);
          END IF; END $$;`,
      ];
      for (const stmt of sqlStatements) {
        await queryInterface.sequelize.query(stmt, { transaction });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Drop attempt answer table first due to FK
      await queryInterface.dropTable("quiz_attempt_answers", { transaction });
      await queryInterface.dropTable("quiz_attempts", { transaction });

      // Remove added columns from quiz_questions
      const removeColumnsQQ = [
        "media_url",
        "deleted_by",
        "deleted_at",
        "is_deleted",
        "is_active",
        "difficulty",
        "type",
      ];
      for (const col of removeColumnsQQ) {
        try {
          await queryInterface.removeColumn("quiz_questions", col, {
            transaction,
          });
        } catch {}
      }
      // Remove added columns from quiz_question_options
      const removeColumnsQO = ["deleted_by", "deleted_at", "is_deleted"];
      for (const col of removeColumnsQO) {
        try {
          await queryInterface.removeColumn("quiz_question_options", col, {
            transaction,
          });
        } catch {}
      }
      // Drop ENUM types explicitly (order: dependent columns removed already)
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_quiz_questions_type";',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_quiz_questions_difficulty";',
        { transaction }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
