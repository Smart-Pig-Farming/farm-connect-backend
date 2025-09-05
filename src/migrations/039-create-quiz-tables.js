"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // quizzes table
    await queryInterface.createTable("quizzes", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      duration: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      passing_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 70,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      best_practice_tag_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "best_practice_tags", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
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
    // Idempotent index creation
    async function ensureIndex(table, cols) {
      const idxName = `${table}_${cols.join("_")}`;
      await queryInterface.sequelize.query(`DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = '${idxName}') THEN
          CREATE INDEX ${idxName} ON "${table}" (${cols
        .map((c) => `"${c}"`)
        .join(",")});
        END IF; END $$;`);
    }
    await ensureIndex("quizzes", ["best_practice_tag_id"]);
    await ensureIndex("quizzes", ["created_by"]);
    await ensureIndex("quizzes", ["is_active"]);

    // quiz_questions
    await queryInterface.createTable("quiz_questions", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      quiz_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "quizzes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      text: { type: Sequelize.TEXT, allowNull: false },
      explanation: { type: Sequelize.TEXT },
      order_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
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
    await ensureIndex("quiz_questions", ["quiz_id"]);
    await ensureIndex("quiz_questions", ["order_index"]);

    // quiz_question_options
    await queryInterface.createTable("quiz_question_options", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "quiz_questions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      text: { type: Sequelize.TEXT, allowNull: false },
      is_correct: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      order_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
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
    await ensureIndex("quiz_question_options", ["question_id"]);
    await ensureIndex("quiz_question_options", ["order_index"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("quiz_question_options");
    await queryInterface.dropTable("quiz_questions");
    await queryInterface.dropTable("quizzes");
  },
};
