"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create post_snapshots table for preserving content at decision time
    await queryInterface.createTable("post_snapshots", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      content_report_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "content_reports",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "discussion_posts",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      title: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      author_data: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: "Snapshot of author info: {id, name, location}",
      },
      media_data: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: "Snapshot of media: [{type, url, thumbnail_url}]",
      },
      tags_data: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: "Snapshot of tag names: [string]",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      snapshot_reason: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "moderation_decision",
      },
    });

    // Create report_rate_limits table for rate limiting
    await queryInterface.createTable("report_rate_limits", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      reporter_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      content_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      content_type: {
        type: Sequelize.ENUM("post", "reply"),
        allowNull: false,
      },
      reported_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint for rate limiting
    await queryInterface.addConstraint("report_rate_limits", {
      fields: ["reporter_id", "content_id", "content_type"],
      type: "unique",
      name: "unique_reporter_content",
    });

    // Add post_snapshot_id column to content_reports for linking
    await queryInterface.addColumn("content_reports", "post_snapshot_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "post_snapshots",
        key: "id",
      },
      onDelete: "SET NULL",
    });

    // Add performance indexes
    await queryInterface.addIndex("content_reports", {
      fields: ["content_type", "status"],
      name: "idx_content_reports_type_status",
    });

    await queryInterface.addIndex("content_reports", {
      fields: ["reporter_id", "created_at"],
      name: "idx_content_reports_reporter_created",
    });

    await queryInterface.addIndex("content_reports", {
      fields: ["resolved_at"],
      name: "idx_content_reports_resolved_at",
      where: {
        resolved_at: {
          [Sequelize.Op.ne]: null,
        },
      },
    });

    await queryInterface.addIndex("post_snapshots", {
      fields: ["content_report_id"],
      name: "idx_post_snapshots_report_id",
    });

    await queryInterface.addIndex("post_snapshots", {
      fields: ["post_id", "created_at"],
      name: "idx_post_snapshots_post_created",
    });

    await queryInterface.addIndex("report_rate_limits", {
      fields: ["reporter_id", "reported_at"],
      name: "idx_report_rate_limits_reporter_time",
    });

    await queryInterface.addIndex("report_rate_limits", {
      fields: ["content_id", "content_type", "reported_at"],
      name: "idx_report_rate_limits_content_time",
    });

    console.log("✅ Enhanced moderation system tables and indexes created");
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex(
      "report_rate_limits",
      "idx_report_rate_limits_content_time"
    );
    await queryInterface.removeIndex(
      "report_rate_limits",
      "idx_report_rate_limits_reporter_time"
    );
    await queryInterface.removeIndex(
      "post_snapshots",
      "idx_post_snapshots_post_created"
    );
    await queryInterface.removeIndex(
      "post_snapshots",
      "idx_post_snapshots_report_id"
    );
    await queryInterface.removeIndex(
      "content_reports",
      "idx_content_reports_resolved_at"
    );
    await queryInterface.removeIndex(
      "content_reports",
      "idx_content_reports_reporter_created"
    );
    await queryInterface.removeIndex(
      "content_reports",
      "idx_content_reports_type_status"
    );

    // Remove added column
    await queryInterface.removeColumn("content_reports", "post_snapshot_id");

    // Drop new tables
    await queryInterface.dropTable("report_rate_limits");
    await queryInterface.dropTable("post_snapshots");

    console.log("⏪ Enhanced moderation system changes reverted");
  },
};
