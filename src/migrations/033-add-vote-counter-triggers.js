"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create (or replace) trigger function - idempotent and simpler quoting
    await queryInterface.sequelize.query(`CREATE OR REPLACE FUNCTION apply_user_vote_changes() RETURNS TRIGGER AS $$
    BEGIN
      IF (TG_OP = 'INSERT') THEN
        IF (NEW.target_type = 'post') THEN
          UPDATE discussion_posts
            SET upvotes = upvotes + (CASE WHEN NEW.vote_type='upvote' THEN 1 ELSE 0 END),
                downvotes = downvotes + (CASE WHEN NEW.vote_type='downvote' THEN 1 ELSE 0 END)
          WHERE id = NEW.target_id;
        ELSIF (NEW.target_type = 'reply') THEN
          UPDATE discussion_replies
            SET upvotes = upvotes + (CASE WHEN NEW.vote_type='upvote' THEN 1 ELSE 0 END),
                downvotes = downvotes + (CASE WHEN NEW.vote_type='downvote' THEN 1 ELSE 0 END)
          WHERE id = NEW.target_id;
        END IF;
        RETURN NEW;
      ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.target_type = 'post') THEN
          UPDATE discussion_posts
            SET upvotes = upvotes - (CASE WHEN OLD.vote_type='upvote' THEN 1 ELSE 0 END),
                downvotes = downvotes - (CASE WHEN OLD.vote_type='downvote' THEN 1 ELSE 0 END)
          WHERE id = OLD.target_id;
        ELSIF (OLD.target_type = 'reply') THEN
          UPDATE discussion_replies
            SET upvotes = upvotes - (CASE WHEN OLD.vote_type='upvote' THEN 1 ELSE 0 END),
                downvotes = downvotes - (CASE WHEN OLD.vote_type='downvote' THEN 1 ELSE 0 END)
          WHERE id = OLD.target_id;
        END IF;
        RETURN OLD;
      ELSIF (TG_OP = 'UPDATE') THEN
        IF (NEW.vote_type <> OLD.vote_type) THEN
          IF (NEW.target_type = 'post') THEN
            UPDATE discussion_posts
              SET upvotes = upvotes - (CASE WHEN OLD.vote_type='upvote' THEN 1 ELSE 0 END) + (CASE WHEN NEW.vote_type='upvote' THEN 1 ELSE 0 END),
                  downvotes = downvotes - (CASE WHEN OLD.vote_type='downvote' THEN 1 ELSE 0 END) + (CASE WHEN NEW.vote_type='downvote' THEN 1 ELSE 0 END)
            WHERE id = NEW.target_id;
          ELSIF (NEW.target_type = 'reply') THEN
            UPDATE discussion_replies
              SET upvotes = upvotes - (CASE WHEN OLD.vote_type='upvote' THEN 1 ELSE 0 END) + (CASE WHEN NEW.vote_type='upvote' THEN 1 ELSE 0 END),
                  downvotes = downvotes - (CASE WHEN OLD.vote_type='downvote' THEN 1 ELSE 0 END) + (CASE WHEN NEW.vote_type='downvote' THEN 1 ELSE 0 END)
            WHERE id = NEW.target_id;
          END IF;
        END IF;
        RETURN NEW;
      END IF;
      RETURN NULL;
    END; $$ LANGUAGE plpgsql;`);

    // 2. Attach triggers (if not existing)
    const attach = async (name, when) => {
      await queryInterface.sequelize.query(`DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname='${name}'
        ) THEN
          EXECUTE 'CREATE TRIGGER ${name} ${when} ON user_votes FOR EACH ROW EXECUTE FUNCTION apply_user_vote_changes()';
        END IF;
      END$$;`);
    };
    await attach("user_votes_ai_trg", "AFTER INSERT");
    await attach("user_votes_au_trg", "AFTER UPDATE");
    await attach("user_votes_ad_trg", "AFTER DELETE");

    // 3. Backfill counts from user_votes (authoritative) to eliminate drift
    await queryInterface.sequelize.query(`UPDATE discussion_posts p SET
      upvotes = COALESCE(v.up,0),
      downvotes = COALESCE(v.down,0)
      FROM (
        SELECT target_id,
          SUM(CASE WHEN vote_type='upvote' THEN 1 ELSE 0 END) AS up,
          SUM(CASE WHEN vote_type='downvote' THEN 1 ELSE 0 END) AS down
        FROM user_votes WHERE target_type='post' GROUP BY target_id
      ) v WHERE p.id = v.target_id;`);

    await queryInterface.sequelize.query(`UPDATE discussion_replies r SET
      upvotes = COALESCE(v.up,0),
      downvotes = COALESCE(v.down,0)
      FROM (
        SELECT target_id,
          SUM(CASE WHEN vote_type='upvote' THEN 1 ELSE 0 END) AS up,
          SUM(CASE WHEN vote_type='downvote' THEN 1 ELSE 0 END) AS down
        FROM user_votes WHERE target_type='reply' GROUP BY target_id
      ) v WHERE r.id = v.target_id;`);
  },
  async down(queryInterface) {
    // Remove triggers only (leave backfilled counts in place)
    const drop = async (name) => {
      await queryInterface.sequelize.query(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='${name}') THEN
          EXECUTE 'DROP TRIGGER ${name} ON user_votes';
        END IF;
      END$$;`);
    };
    await drop("user_votes_ai_trg");
    await drop("user_votes_au_trg");
    await drop("user_votes_ad_trg");
    // (Optionally could drop function)
    await queryInterface.sequelize.query(`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='apply_user_vote_changes') THEN
        DROP FUNCTION apply_user_vote_changes();
      END IF;
    END$$;`);
  },
};
