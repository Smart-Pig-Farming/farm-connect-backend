"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // New join table allowing quizzes to have multiple best practice tags
    await queryInterface.createTable("quiz_tag_assignments", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      quiz_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "quizzes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      tag_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "best_practice_tags", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    // Unique composite so a quiz cannot have the same tag twice
    await queryInterface.addConstraint("quiz_tag_assignments", {
      fields: ["quiz_id", "tag_id"],
      type: "unique",
      name: "quiz_tag_assignments_quiz_id_tag_id_unique",
    });

    // Backfill existing single-category relationships into the join table
    await queryInterface.sequelize
      .query(`INSERT INTO quiz_tag_assignments (quiz_id, tag_id, assigned_at)
      SELECT id as quiz_id, best_practice_tag_id as tag_id, NOW()
      FROM quizzes
      WHERE NOT EXISTS (
        SELECT 1 FROM quiz_tag_assignments qta
         WHERE qta.quiz_id = quizzes.id AND qta.tag_id = quizzes.best_practice_tag_id
      )`);

    // (Optional future) We intentionally KEEP quizzes.best_practice_tag_id as the primary tag
    // to avoid breaking existing code & stats queries. Later migration can drop / refactor.
  },
  async down(queryInterface) {
    await queryInterface.dropTable("quiz_tag_assignments");
  },
};
