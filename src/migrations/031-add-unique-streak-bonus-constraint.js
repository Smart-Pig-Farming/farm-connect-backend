"use strict";

/** Adds a partial unique index to prevent duplicate STREAK_BONUS for same milestone per user. */
module.exports = {
  async up(queryInterface) {
    // Postgres partial index
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_streak_bonus_once') THEN
          EXECUTE 'CREATE UNIQUE INDEX uniq_streak_bonus_once ON score_events(user_id, event_type, ref_id) WHERE event_type = ''STREAK_BONUS''';
        END IF;
      END$$;`);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS uniq_streak_bonus_once"
    );
  },
};
