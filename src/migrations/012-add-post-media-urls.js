"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("post_media", "url", {
      type: Sequelize.STRING(1000),
      allowNull: true,
    });
    await queryInterface.addColumn("post_media", "thumbnail_url", {
      type: Sequelize.STRING(1000),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("post_media", "thumbnail_url");
    await queryInterface.removeColumn("post_media", "url");
  },
};
