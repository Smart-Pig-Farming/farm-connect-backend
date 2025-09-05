"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_prestige", {
      user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      is_moderator: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
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
  },
  async down(queryInterface) {
    await queryInterface.dropTable("user_prestige");
  },
};
