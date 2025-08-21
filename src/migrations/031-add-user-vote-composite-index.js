"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Create composite index including vote_type for faster filtered scans
    await queryInterface.sequelize.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='user_votes_target_type_target_id_vote_type'
      ) THEN
        EXECUTE 'CREATE INDEX user_votes_target_type_target_id_vote_type ON user_votes(target_type, target_id, vote_type)';
      END IF;
    END$$;`);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='user_votes_target_type_target_id_vote_type'
      ) THEN
        EXECUTE 'DROP INDEX user_votes_target_type_target_id_vote_type';
      END IF;
    END$$;`);
  },
};
