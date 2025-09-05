"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // score_events ledger
    await queryInterface.createTable("score_events", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      actor_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
      },
      event_type: { type: Sequelize.STRING(64), allowNull: false },
      ref_type: { type: Sequelize.STRING(32), allowNull: true },
      ref_id: { type: Sequelize.STRING(64), allowNull: true },
      delta: { type: Sequelize.INTEGER, allowNull: false }, // scaled *1000
      meta: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    const ensureIndex = async (name, sql) => {
      await queryInterface.sequelize.query(`DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='${name}') THEN
          EXECUTE '${sql.replace(/'/g, "''")}';
        END IF;
      END$$;`);
    };
    await ensureIndex(
      "score_events_user_id_created_at",
      "CREATE INDEX score_events_user_id_created_at ON score_events(user_id, created_at)"
    );
    await ensureIndex(
      "score_events_event_type",
      "CREATE INDEX score_events_event_type ON score_events(event_type)"
    );
    await ensureIndex(
      "score_events_ref_type_ref_id",
      "CREATE INDEX score_events_ref_type_ref_id ON score_events(ref_type, ref_id)"
    );

    // user_score_totals projection
    await queryInterface.createTable("user_score_totals", {
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: "users", key: "id" },
      },
      total_points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // reply_ancestry materialized chain
    await queryInterface.createTable("reply_ancestry", {
      reply_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: "discussion_replies", key: "id" },
      },
      parent_id: { type: Sequelize.UUID, allowNull: true },
      grandparent_id: { type: Sequelize.UUID, allowNull: true },
      root_post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "discussion_posts", key: "id" },
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await ensureIndex(
      "reply_ancestry_root_post_id",
      "CREATE INDEX reply_ancestry_root_post_id ON reply_ancestry(root_post_id)"
    );
    await ensureIndex(
      "reply_ancestry_parent_id",
      "CREATE INDEX reply_ancestry_parent_id ON reply_ancestry(parent_id)"
    );
    await ensureIndex(
      "reply_ancestry_grandparent_id",
      "CREATE INDEX reply_ancestry_grandparent_id ON reply_ancestry(grandparent_id)"
    );
  },
  async down(queryInterface) {
    await queryInterface.dropTable("reply_ancestry");
    await queryInterface.dropTable("user_score_totals");
    await queryInterface.dropTable("score_events");
  },
};
