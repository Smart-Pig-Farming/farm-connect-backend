"use strict";

/**
 * Migration 030: Make earlier index creations idempotent & add missing leaderboard query indexes.
 * - Adds IF NOT EXISTS guarded indexes for score_events (created_at,user_id) ordering variant.
 * - Ensures password_reset_tokens indexes exist without throwing if already present.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // password_reset_tokens: recreate indexes with IF NOT EXISTS (Postgres) only if columns exist
    await queryInterface.sequelize.query(`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_reset_tokens' AND column_name='email') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS password_reset_tokens_email ON password_reset_tokens (email)';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_reset_tokens' AND column_name='otp') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS password_reset_tokens_otp ON password_reset_tokens (otp)';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_reset_tokens' AND column_name='expires_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at ON password_reset_tokens (expires_at)';
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_reset_tokens' AND column_name='expiresAt') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at ON password_reset_tokens ("expiresAt")';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_reset_tokens' AND column_name='user_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id ON password_reset_tokens (user_id)';
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_reset_tokens' AND column_name='userId') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id ON password_reset_tokens ("userId")';
      END IF;
    END$$;`);

    // score_events: performance for period windows
    await queryInterface.sequelize.query(
      "CREATE INDEX IF NOT EXISTS idx_score_events_period ON score_events (created_at, user_id)"
    );
    await queryInterface.sequelize.query(
      "CREATE INDEX IF NOT EXISTS idx_score_events_user ON score_events (user_id)"
    );
  },
  async down(queryInterface, Sequelize) {
    // Safe to drop (IF EXISTS) to revert
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS idx_score_events_period"
    );
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS idx_score_events_user"
    );
  },
};
