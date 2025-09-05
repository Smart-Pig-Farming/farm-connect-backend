"use strict";

/**
 * Migration 036: Create best_practice_contents table (idempotent) with JSON columns
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "best_practice_contents";

    // Create table if it doesn't exist
    const tableExists = await queryInterface.sequelize.query(
      `SELECT to_regclass('public.${tableName}') as exists;`
    );
    const exists = tableExists[0][0].exists !== null;
    if (!exists) {
      await queryInterface.createTable(tableName, {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        title: { type: Sequelize.STRING(255), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: false },
        steps_json: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        benefits_json: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        categories: {
          type: Sequelize.ARRAY(Sequelize.TEXT),
          allowNull: false,
          defaultValue: [],
        },
        media: { type: Sequelize.JSONB, allowNull: true },
        language: {
          type: Sequelize.STRING(10),
          allowNull: false,
          defaultValue: "en",
        },
        is_published: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        is_deleted: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        read_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        created_by: { type: Sequelize.INTEGER, allowNull: false },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
    }

    // Ensure columns exist (idempotent safety if table pre-created elsewhere)
    const ensureColumn = async (col, spec) => {
      const colInfo = await queryInterface
        .describeTable(tableName)
        .catch(() => ({}));
      if (!colInfo[col]) {
        await queryInterface.addColumn(tableName, col, spec);
      }
    };

    await ensureColumn("steps_json", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
    await ensureColumn("benefits_json", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
    await ensureColumn("categories", {
      type: Sequelize.ARRAY(Sequelize.TEXT),
      allowNull: false,
      defaultValue: [],
    });
    await ensureColumn("media", { type: Sequelize.JSONB, allowNull: true });
    await ensureColumn("is_deleted", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await ensureColumn("read_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // Indexes
    const indexes = await queryInterface.showIndex(tableName);
    const hasIndex = (name) => indexes.some((i) => i.name === name);
    if (!hasIndex("bp_contents_created_by_idx")) {
      await queryInterface.addIndex(tableName, ["created_by"], {
        name: "bp_contents_created_by_idx",
      });
    }
    if (!hasIndex("bp_contents_published_idx")) {
      await queryInterface.addIndex(tableName, ["is_published"], {
        name: "bp_contents_published_idx",
      });
    }
    if (!hasIndex("bp_contents_deleted_idx")) {
      await queryInterface.addIndex(tableName, ["is_deleted"], {
        name: "bp_contents_deleted_idx",
      });
    }
    if (!hasIndex("bp_contents_created_at_idx")) {
      await queryInterface.addIndex(tableName, ["created_at"], {
        name: "bp_contents_created_at_idx",
      });
    }
  },
  async down(queryInterface) {
    // Non-destructive: just drop table
    await queryInterface.dropTable("best_practice_contents").catch(() => {});
  },
};
