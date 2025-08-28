"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add is_primary column (default false) if not exists (idempotent guard via try/catch)
    try {
      await queryInterface.addColumn("quiz_tag_assignments", "is_primary", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    } catch (e) {
      // ignore if exists
      console.log("[047] is_primary column add skipped", e.message);
    }

    // 2. Backfill: mark the row whose tag_id matches quizzes.best_practice_tag_id as primary
    await queryInterface.sequelize.query(`
      UPDATE quiz_tag_assignments qta
      SET is_primary = true
      FROM quizzes q
      WHERE q.id = qta.quiz_id
        AND q.best_practice_tag_id = qta.tag_id
    `);

    // 3. Ensure exactly one primary per quiz: if none flagged (data anomaly), pick lowest tag_id
    await queryInterface.sequelize.query(`
      WITH quiz_has_primary AS (
        SELECT quiz_id FROM quiz_tag_assignments WHERE is_primary = true GROUP BY quiz_id
      )
      UPDATE quiz_tag_assignments qta SET is_primary = true
      WHERE qta.id IN (
        SELECT qta2.id FROM quiz_tag_assignments qta2
        LEFT JOIN quiz_has_primary hp ON hp.quiz_id = qta2.quiz_id
        WHERE hp.quiz_id IS NULL
        AND qta2.id IN (
          SELECT DISTINCT FIRST_VALUE(id) OVER (PARTITION BY quiz_id ORDER BY tag_id ASC)
          FROM quiz_tag_assignments
        )
      );
    `);

    // 4. Add a partial unique index to enforce only one is_primary per quiz
    try {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX quiz_tag_assignments_one_primary_per_quiz
        ON quiz_tag_assignments(quiz_id) WHERE is_primary = true;
      `);
    } catch (e) {
      console.log("[047] unique partial index creation skipped", e.message);
    }
  },
  async down(queryInterface) {
    // Drop partial unique index then column
    try {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS quiz_tag_assignments_one_primary_per_quiz;
      `);
    } catch {}
    try {
      await queryInterface.removeColumn("quiz_tag_assignments", "is_primary");
    } catch {}
  },
};
