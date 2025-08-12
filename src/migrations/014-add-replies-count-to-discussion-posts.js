"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add replies_count column if it doesn't exist and backfill from discussion_replies
    const tableInfo = await queryInterface.describeTable("discussion_posts");
    if (!tableInfo.replies_count) {
      await queryInterface.addColumn("discussion_posts", "replies_count", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }

    // Backfill counts based on existing replies (exclude deleted)
    await queryInterface.sequelize.query(`
      UPDATE discussion_posts p
      SET replies_count = sub.cnt
      FROM (
        SELECT post_id, COUNT(*)::int AS cnt
        FROM discussion_replies
        WHERE is_deleted = false
        GROUP BY post_id
      ) sub
      WHERE p.id = sub.post_id;
    `);
  },

  async down(queryInterface, _Sequelize) {
    // Remove the column on rollback
    const tableInfo = await queryInterface.describeTable("discussion_posts");
    if (tableInfo.replies_count) {
      await queryInterface.removeColumn("discussion_posts", "replies_count");
    }
  },
};
("use strict");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add replies_count to discussion_posts if missing, then backfill
    let table;
    try {
      table = await queryInterface.describeTable("discussion_posts");
    } catch (e) {
      // If table doesn't exist, nothing to do here
      return;
    }

    if (!table.replies_count) {
      await queryInterface.addColumn("discussion_posts", "replies_count", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });

      // Backfill counts using existing discussion_replies if table exists
      let repliesTableExists = true;
      try {
        await queryInterface.describeTable("discussion_replies");
      } catch (e) {
        repliesTableExists = false;
      }

      if (repliesTableExists) {
        await queryInterface.sequelize.query(`
          UPDATE discussion_posts p
          SET replies_count = COALESCE(rc.cnt, 0)
          FROM (
            SELECT post_id, COUNT(*)::int AS cnt
            FROM discussion_replies
            WHERE is_deleted = false
            GROUP BY post_id
          ) rc
          WHERE p.id = rc.post_id;
        `);
      }
    }
  },

  async down(queryInterface) {
    // Remove replies_count if it exists
    let table;
    try {
      table = await queryInterface.describeTable("discussion_posts");
    } catch (e) {
      return;
    }

    if (table.replies_count) {
      await queryInterface.removeColumn("discussion_posts", "replies_count");
    }
  },
};
