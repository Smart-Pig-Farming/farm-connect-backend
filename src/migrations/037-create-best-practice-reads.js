"use strict";

/**
 * Migration 037: Create best_practice_reads table for per-user read receipts
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "best_practice_reads";
    const existsRes = await queryInterface.sequelize.query(
      `SELECT to_regclass('public.${tableName}') as exists;`
    );
    const exists = existsRes[0][0].exists !== null;
    if (!exists) {
      await queryInterface.createTable(tableName, {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        best_practice_id: { type: Sequelize.INTEGER, allowNull: false },
        user_id: { type: Sequelize.INTEGER, allowNull: false },
        first_read_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
        last_read_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
        read_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
      });
      await queryInterface.addConstraint(tableName, {
        fields: ["best_practice_id", "user_id"],
        type: "unique",
        name: "uniq_bp_read_user",
      });
    }
    const indexes = await queryInterface.showIndex(tableName);
    const hasIndex = (name) => indexes.some((i) => i.name === name);
    if (!hasIndex("bp_reads_bp_idx")) {
      await queryInterface.addIndex(tableName, ["best_practice_id"], {
        name: "bp_reads_bp_idx",
      });
    }
    if (!hasIndex("bp_reads_user_last_idx")) {
      await queryInterface.addIndex(tableName, ["user_id", "last_read_at"], {
        name: "bp_reads_user_last_idx",
      });
    }
  },
  async down(queryInterface) {
    await queryInterface.dropTable("best_practice_reads").catch(() => {});
  },
};
