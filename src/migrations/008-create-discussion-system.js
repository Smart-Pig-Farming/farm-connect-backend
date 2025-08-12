"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create discussion_posts table
    await queryInterface.createTable("discussion_posts", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      author_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      upvotes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      downvotes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      replies_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      is_market_post: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      is_available: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      is_approved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      moderator_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Create discussion_replies table
    await queryInterface.createTable("discussion_replies", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "discussion_posts",
          key: "id",
        },
      },
      parent_reply_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "discussion_replies",
          key: "id",
        },
      },
      author_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      upvotes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      downvotes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      depth: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Create post_media table
    await queryInterface.createTable("post_media", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "discussion_posts",
          key: "id",
        },
      },
      media_type: {
        type: Sequelize.ENUM("image", "video"),
        allowNull: false,
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      file_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      thumbnail_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      preview_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      provider_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      provider_file_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      processing_status: {
        type: Sequelize.ENUM("uploading", "processing", "ready", "failed"),
        defaultValue: "uploading",
        allowNull: false,
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      height: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      uploaded_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Create post_tags table
    await queryInterface.createTable("post_tags", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "discussion_posts",
          key: "id",
        },
      },
      tag_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Create user_votes table
    await queryInterface.createTable("user_votes", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      post_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "discussion_posts",
          key: "id",
        },
      },
      reply_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "discussion_replies",
          key: "id",
        },
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      vote_type: {
        type: Sequelize.ENUM("upvote", "downvote"),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Create content_reports table
    await queryInterface.createTable("content_reports", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      content_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      content_type: {
        type: Sequelize.ENUM("post", "reply"),
        allowNull: false,
      },
      reporter_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      reason: {
        type: Sequelize.ENUM(
          "inappropriate",
          "spam",
          "fraudulent",
          "misinformation",
          "technical",
          "other"
        ),
        allowNull: false,
      },
      details: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("pending", "resolved", "dismissed"),
        defaultValue: "pending",
        allowNull: false,
      },
      moderator_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      resolution_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex("discussion_posts", ["author_id"]);
    await queryInterface.addIndex("discussion_posts", [
      "is_deleted",
      "is_approved",
    ]);
    await queryInterface.addIndex("discussion_posts", ["created_at"]);
    await queryInterface.addIndex("discussion_posts", ["is_market_post"]);
    await queryInterface.addIndex("discussion_posts", ["upvotes", "downvotes"]);

    await queryInterface.addIndex("discussion_replies", ["post_id"]);
    await queryInterface.addIndex("discussion_replies", ["author_id"]);
    await queryInterface.addIndex("discussion_replies", ["parent_reply_id"]);
    await queryInterface.addIndex("discussion_replies", ["created_at"]);

    await queryInterface.addIndex("post_tags", ["post_id"]);
    await queryInterface.addIndex("post_tags", ["tag_name"]);
    await queryInterface.addIndex("post_tags", ["post_id", "tag_name"], {
      unique: true,
    });

    await queryInterface.addIndex("user_votes", ["user_id"]);
    await queryInterface.addIndex("user_votes", ["post_id"]);
    await queryInterface.addIndex("user_votes", ["reply_id"]);
    await queryInterface.addIndex("user_votes", ["user_id", "post_id"], {
      unique: true,
    });
    await queryInterface.addIndex("user_votes", ["user_id", "reply_id"], {
      unique: true,
    });

    await queryInterface.addIndex("content_reports", [
      "content_id",
      "content_type",
    ]);
    await queryInterface.addIndex("content_reports", ["reporter_id"]);
    await queryInterface.addIndex("content_reports", ["status"]);
    await queryInterface.addIndex(
      "content_reports",
      ["content_id", "content_type", "reporter_id"],
      { unique: true }
    );
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order to avoid foreign key constraints
    await queryInterface.dropTable("content_reports");
    await queryInterface.dropTable("user_votes");
    await queryInterface.dropTable("post_tags");
    await queryInterface.dropTable("post_media");
    await queryInterface.dropTable("discussion_replies");
    await queryInterface.dropTable("discussion_posts");
  },
};
