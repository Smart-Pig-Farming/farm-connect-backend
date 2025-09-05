"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_score_leaderboards", {
      period: { type: Sequelize.STRING(16), allowNull: false },
      period_start: { type: Sequelize.DATEONLY, allowNull: false },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      points: { type: Sequelize.INTEGER, allowNull: false }, // scaled
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
    await queryInterface.addIndex(
      "user_score_leaderboards",
      ["period", "period_start", "user_id"],
      { unique: true, name: "user_score_lb_composite" }
    );
    await queryInterface.addIndex(
      "user_score_leaderboards",
      ["period", "period_start", "points"],
      { name: "user_score_lb_rank_idx" }
    );
    try {
      await queryInterface.addIndex(
        "score_events",
        ["ref_type", "ref_id", "actor_user_id"],
        { name: "score_events_ref_actor" }
      );
    } catch (e) {}
    try {
      await queryInterface.addIndex(
        "score_events",
        ["actor_user_id", "ref_type", "ref_id", "event_type"],
        { name: "score_events_actor_ref_event" }
      );
    } catch (e) {}
  },
  async down(queryInterface) {
    await queryInterface
      .removeIndex("score_events", "score_events_ref_actor")
      .catch(() => {});
    await queryInterface
      .removeIndex("score_events", "score_events_actor_ref_event")
      .catch(() => {});
    await queryInterface.dropTable("user_score_leaderboards");
  },
};
