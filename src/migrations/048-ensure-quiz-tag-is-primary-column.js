"use strict";
/**
 * Safety migration to ensure quiz_tag_assignments.is_primary exists and constraints are applied.
 * Idempotent: adds column if missing, backfills, and creates partial unique index.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add column if missing
    const [cols] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='quiz_tag_assignments' AND column_name='is_primary';
    `);
    if (cols.length === 0) {
      await queryInterface.addColumn("quiz_tag_assignments", "is_primary", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    // 2. Backfill a primary per quiz if none marked
    await queryInterface.sequelize.query(`
      WITH ranked AS (
        SELECT id, quiz_id,
               ROW_NUMBER() OVER (PARTITION BY quiz_id ORDER BY id) AS rn
        FROM quiz_tag_assignments
      )
      UPDATE quiz_tag_assignments q
      SET is_primary = true
      FROM ranked r
      WHERE q.id = r.id AND r.rn = 1 AND q.is_primary = false
        AND NOT EXISTS (
          SELECT 1 FROM quiz_tag_assignments q2
          WHERE q2.quiz_id = q.quiz_id AND q2.is_primary = true
        );
    `);
    // 3. Create partial unique index if missing
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname='quiz_tag_assignments_one_primary_per_quiz'
        ) THEN
          CREATE UNIQUE INDEX quiz_tag_assignments_one_primary_per_quiz
            ON quiz_tag_assignments(quiz_id) WHERE is_primary = true;
        END IF;
      END $$;
    `);
  },
  async down(queryInterface /*, Sequelize */) {
    // Non-destructive: just drop the partial index if present (leave column)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname='quiz_tag_assignments_one_primary_per_quiz'
        ) THEN
          DROP INDEX quiz_tag_assignments_one_primary_per_quiz;
        END IF;
      END $$;
    `);
  },
};
