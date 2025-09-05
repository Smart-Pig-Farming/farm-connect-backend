"use strict";

// Migration 032: Enforce rule that is_available implies is_market_post.
//  - Data correction: set is_available=false where is_market_post=false.
//  - Add CHECK constraint (idempotent) ensuring NOT is_available OR is_market_post.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "UPDATE discussion_posts SET is_available=false WHERE is_market_post=false AND is_available=true"
    );
    await queryInterface.sequelize.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_discussion_posts_available_requires_market'
      ) THEN
        ALTER TABLE discussion_posts
          ADD CONSTRAINT chk_discussion_posts_available_requires_market
          CHECK (NOT is_available OR is_market_post);
      END IF;
    END$$;`);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE discussion_posts DROP CONSTRAINT IF EXISTS chk_discussion_posts_available_requires_market"
    );
  },
};
