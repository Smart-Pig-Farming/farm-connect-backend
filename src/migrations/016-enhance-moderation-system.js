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

    // Add unique constraint for rate limiting (idempotent)
    await queryInterface.sequelize.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_reporter_content'
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='unique_reporter_content'
      ) THEN
        BEGIN
          ALTER TABLE report_rate_limits
          ADD CONSTRAINT unique_reporter_content UNIQUE (reporter_id, content_id, content_type);
        EXCEPTION WHEN duplicate_object THEN
          NULL; -- created concurrently
        END;
      END IF;
    END$$;`);

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
    // Helper to create index if missing
    const ensureIndex = async (indexName, createSql) => {
      await queryInterface.sequelize.query(`DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='${indexName}') THEN
          EXECUTE '${createSql.replace(/'/g, "''")}';
        END IF;
      END$$;`);
    };

    await ensureIndex(
      "idx_content_reports_type_status",
      "CREATE INDEX idx_content_reports_type_status ON content_reports(content_type, status)"
    );

    await ensureIndex(
      "idx_content_reports_reporter_created",
      "CREATE INDEX idx_content_reports_reporter_created ON content_reports(reporter_id, created_at)"
    );

    await ensureIndex(
      "idx_content_reports_resolved_at",
      "CREATE INDEX idx_content_reports_resolved_at ON content_reports(resolved_at) WHERE resolved_at IS NOT NULL"
    );

    await ensureIndex(
      "idx_post_snapshots_report_id",
      "CREATE INDEX idx_post_snapshots_report_id ON post_snapshots(content_report_id)"
    );

    await ensureIndex(
      "idx_post_snapshots_post_created",
      "CREATE INDEX idx_post_snapshots_post_created ON post_snapshots(post_id, created_at)"
    );

    await ensureIndex(
      "idx_report_rate_limits_reporter_time",
      "CREATE INDEX idx_report_rate_limits_reporter_time ON report_rate_limits(reporter_id, reported_at)"
    );

    await ensureIndex(
      "idx_report_rate_limits_content_time",
      "CREATE INDEX idx_report_rate_limits_content_time ON report_rate_limits(content_id, content_type, reported_at)"
    );

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
