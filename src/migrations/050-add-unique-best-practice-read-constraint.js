"use strict";

/**
 * Adds a UNIQUE constraint on (best_practice_id, user_id) to enforce single read row per user/practice.
 * Also de-duplicates any existing duplicates by keeping the earliest first_read_at and max read_count.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Deduplicate existing rows (in transaction for safety)
    await queryInterface.sequelize.transaction(async (t) => {
      // Create a temp table with consolidated rows
      await queryInterface.sequelize.query(
        `
        CREATE TEMP TABLE bp_reads_dedup AS
        SELECT MIN(id) AS keep_id,
               best_practice_id,
               user_id,
               MIN(first_read_at) AS first_read_at,
               MAX(last_read_at) AS last_read_at,
               MAX(read_count) AS read_count
        FROM best_practice_reads
        GROUP BY best_practice_id, user_id;`,
        { transaction: t }
      );
      // Delete all originals that have duplicates (except ones we keep)
      await queryInterface.sequelize.query(
        `
        DELETE FROM best_practice_reads bpr
        USING bp_reads_dedup d
        WHERE bpr.best_practice_id = d.best_practice_id
          AND bpr.user_id = d.user_id
          AND bpr.id <> d.keep_id;`,
        { transaction: t }
      );
      // Update the kept rows with consolidated values
      await queryInterface.sequelize.query(
        `
        UPDATE best_practice_reads bpr
        SET first_read_at = d.first_read_at,
            last_read_at = d.last_read_at,
            read_count = d.read_count
        FROM bp_reads_dedup d
        WHERE bpr.id = d.keep_id;`,
        { transaction: t }
      );
    });
    // 2. Add unique constraint idempotently
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_class t ON c.conrelid = t.oid
          WHERE t.relname = 'best_practice_reads' AND c.conname = 'uniq_bp_read_user'
        ) THEN
          ALTER TABLE best_practice_reads
            ADD CONSTRAINT uniq_bp_read_user UNIQUE (best_practice_id, user_id);
        END IF;
      END $$;`);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_class t ON c.conrelid = t.oid
          WHERE t.relname = 'best_practice_reads' AND c.conname = 'uniq_bp_read_user'
        ) THEN
          ALTER TABLE best_practice_reads DROP CONSTRAINT uniq_bp_read_user;
        END IF;
      END $$;`);
  },
};
