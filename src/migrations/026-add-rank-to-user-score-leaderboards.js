"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("user_score_leaderboards", "rank", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    try {
      await queryInterface.addIndex(
        "user_score_leaderboards",
        ["period", "period_start", "rank"],
        { name: "user_score_lb_rank_order" }
      );
    } catch (e) {}
  },
  async down(queryInterface) {
    await queryInterface
      .removeIndex("user_score_leaderboards", "user_score_lb_rank_order")
      .catch(() => {});
    await queryInterface.removeColumn("user_score_leaderboards", "rank");
  },
};
