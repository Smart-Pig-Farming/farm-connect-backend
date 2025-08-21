"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("users");
    if (!table["timezone"]) {
      await queryInterface.addColumn("users", "timezone", {
        type: Sequelize.STRING(64),
        allowNull: true,
      });
      await queryInterface.addIndex("users", ["timezone"], { name: "users_timezone" });
    }
  },
  async down(queryInterface) {
    try {
      await queryInterface.removeIndex("users", "users_timezone");
    } catch {}
    try {
      await queryInterface.removeColumn("users", "timezone");
    } catch {}
  },
};
