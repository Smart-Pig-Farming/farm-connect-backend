"use strict";

// Migration 031: Add (if missing) indexes for discussion & reporting tables.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`DO $$
    BEGIN
      -- discussion_posts
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='discussion_posts_author_id') THEN
        EXECUTE 'CREATE INDEX discussion_posts_author_id ON discussion_posts (author_id)'; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='discussion_posts_is_deleted_is_approved') THEN
        EXECUTE 'CREATE INDEX discussion_posts_is_deleted_is_approved ON discussion_posts (is_deleted, is_approved)'; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='discussion_posts_created_at') THEN
        EXECUTE 'CREATE INDEX discussion_posts_created_at ON discussion_posts (created_at)'; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='discussion_posts_is_market_post') THEN
        EXECUTE 'CREATE INDEX discussion_posts_is_market_post ON discussion_posts (is_market_post)'; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='discussion_posts_upvotes_downvotes') THEN
        EXECUTE 'CREATE INDEX discussion_posts_upvotes_downvotes ON discussion_posts (upvotes, downvotes)'; END IF;

      -- discussion_replies
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='discussion_replies_post_id') THEN
        EXECUTE 'CREATE INDEX discussion_replies_post_id ON discussion_replies (post_id)'; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='discussion_replies_author_id') THEN
        EXECUTE 'CREATE INDEX discussion_replies_author_id ON discussion_replies (author_id)'; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='discussion_replies_parent_reply_id') THEN
        EXECUTE 'CREATE INDEX discussion_replies_parent_reply_id ON discussion_replies (parent_reply_id)'; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='discussion_replies_created_at') THEN
        EXECUTE 'CREATE INDEX discussion_replies_created_at ON discussion_replies (created_at)'; END IF;

      -- post_tags (support legacy tag_name schema or current tag_id schema)
      -- Three possible schemas observed for table name "post_tags":
      --  1) Legacy (008): columns post_id (UUID), tag_name (string)
      --  2) Junction (011+): columns post_id (UUID), tag_id (UUID)
      --  3) Taxonomy variant (current model): columns name, description, is_active (NO post_id / tag_*); acts like a tag catalogue
      -- Handle each defensively without assuming presence of post_id for composite indexes.
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='post_tags' AND column_name='post_id') THEN
        -- We have a junction table (legacy or current). Add single-column post_id index first.
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='post_tags_post_id') THEN
          EXECUTE 'CREATE INDEX post_tags_post_id ON post_tags (post_id)'; END IF;
        -- Branch on tag_name vs tag_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='post_tags' AND column_name='tag_name') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='post_tags_tag_name') THEN
            EXECUTE 'CREATE INDEX post_tags_tag_name ON post_tags (tag_name)'; END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='post_tags_post_id_tag_name') THEN
            EXECUTE 'CREATE UNIQUE INDEX post_tags_post_id_tag_name ON post_tags (post_id, tag_name)'; END IF;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='post_tags' AND column_name='tag_id') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='post_tags_tag_id') THEN
            EXECUTE 'CREATE INDEX post_tags_tag_id ON post_tags (tag_id)'; END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='post_tags_post_id_tag_id') THEN
            EXECUTE 'CREATE UNIQUE INDEX post_tags_post_id_tag_id ON post_tags (post_id, tag_id)'; END IF;
        END IF;
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='post_tags' AND column_name='name') THEN
        -- Taxonomy variant: add useful indexes on name & is_active if they exist.
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='post_tags_name') THEN
          EXECUTE 'CREATE INDEX post_tags_name ON post_tags (name)'; END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='post_tags' AND column_name='is_active') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='post_tags_is_active') THEN
            EXECUTE 'CREATE INDEX post_tags_is_active ON post_tags (is_active)'; END IF;
        END IF;
      END IF;

      -- user_votes (two schema variants)
      -- Legacy variant (008): columns post_id, reply_id
      -- Restructured variant (011+): columns target_type, target_id (polymorphic)
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_votes' AND column_name='post_id') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='user_votes_user_id') THEN
          EXECUTE 'CREATE INDEX user_votes_user_id ON user_votes (user_id)'; END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_votes' AND column_name='post_id') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='user_votes_post_id') THEN
            EXECUTE 'CREATE INDEX user_votes_post_id ON user_votes (post_id)'; END IF; END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_votes' AND column_name='reply_id') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='user_votes_reply_id') THEN
            EXECUTE 'CREATE INDEX user_votes_reply_id ON user_votes (reply_id)'; END IF; END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_votes' AND column_name='post_id') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='user_votes_user_id_post_id') THEN
            EXECUTE 'CREATE UNIQUE INDEX user_votes_user_id_post_id ON user_votes (user_id, post_id)'; END IF; END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_votes' AND column_name='reply_id') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='user_votes_user_id_reply_id') THEN
            EXECUTE 'CREATE UNIQUE INDEX user_votes_user_id_reply_id ON user_votes (user_id, reply_id)'; END IF; END IF;
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_votes' AND column_name='target_type') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='user_votes_user_id') THEN
          EXECUTE 'CREATE INDEX user_votes_user_id ON user_votes (user_id)'; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='user_votes_target_type_target_id') THEN
          EXECUTE 'CREATE INDEX user_votes_target_type_target_id ON user_votes (target_type, target_id)'; END IF;
        -- Unique combination (may already exist as constraint unique_user_vote)
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='user_votes_user_id_target_type_target_id') THEN
          BEGIN
            EXECUTE 'CREATE UNIQUE INDEX user_votes_user_id_target_type_target_id ON user_votes (user_id, target_type, target_id)';
          EXCEPTION WHEN duplicate_table THEN
            -- ignore
          WHEN duplicate_object THEN
            -- ignore
          END;
        END IF;
      END IF;

      -- content_reports
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='content_reports_content_id_content_type') THEN
        EXECUTE 'CREATE INDEX content_reports_content_id_content_type ON content_reports (content_id, content_type)'; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='content_reports_reporter_id') THEN
        EXECUTE 'CREATE INDEX content_reports_reporter_id ON content_reports (reporter_id)'; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='content_reports_status') THEN
        EXECUTE 'CREATE INDEX content_reports_status ON content_reports (status)'; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='content_reports_content_id_content_type_reporter_id') THEN
        EXECUTE 'CREATE UNIQUE INDEX content_reports_content_id_content_type_reporter_id ON content_reports (content_id, content_type, reporter_id)'; END IF;
    END$$;`);
  },
  async down(queryInterface) {
    // Down: drop only non-unique simple indexes; keep unique for data integrity
    const drops = [
      "discussion_posts_author_id",
      "discussion_posts_is_deleted_is_approved",
      "discussion_posts_created_at",
      "discussion_posts_is_market_post",
      "discussion_posts_upvotes_downvotes",
      "discussion_replies_post_id",
      "discussion_replies_author_id",
      "discussion_replies_parent_reply_id",
      "discussion_replies_created_at",
      "post_tags_post_id",
      "post_tags_tag_name",
      "user_votes_user_id",
      "user_votes_post_id",
      "user_votes_reply_id",
      "content_reports_content_id_content_type",
      "content_reports_reporter_id",
      "content_reports_status",
    ];
    for (const idx of drops) {
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${idx}`);
    }
  },
};
