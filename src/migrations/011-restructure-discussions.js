"use strict";

const { DataTypes } = require("sequelize");

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Drop existing tables if they exist (in reverse dependency order)
      console.log("Dropping existing discussion tables...");
      await queryInterface.dropTable("post_tags", {
        transaction,
        cascade: true,
      });
      await queryInterface.dropTable("post_media", {
        transaction,
        cascade: true,
      });
      await queryInterface.dropTable("user_votes", {
        transaction,
        cascade: true,
      });
      await queryInterface.dropTable("discussion_replies", {
        transaction,
        cascade: true,
      });
      await queryInterface.dropTable("discussion_posts", {
        transaction,
        cascade: true,
      });
      await queryInterface.dropTable("tags", { transaction, cascade: true });

      // Create tags table first
      await queryInterface.createTable(
        "tags",
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
          },
          color: {
            type: DataTypes.STRING(20),
            defaultValue: "blue",
          },
          created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction }
      );

      // Create discussion_posts table
      await queryInterface.createTable(
        "discussion_posts",
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          title: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          content: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          author_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: "users",
              key: "id",
            },
          },
          upvotes: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
          },
          downvotes: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
          },
          is_market_post: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
          },
          is_available: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
          },
          is_approved: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
          },
          is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
          },
          approved_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          moderator_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
              model: "users",
              key: "id",
            },
          },
          created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction }
      );

      // Create post_media table
      await queryInterface.createTable(
        "post_media",
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          post_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
              model: "discussion_posts",
              key: "id",
            },
            onDelete: "CASCADE",
          },
          media_type: {
            type: DataTypes.ENUM("image", "video"),
            allowNull: false,
          },
          storage_key: {
            type: DataTypes.STRING(500),
            allowNull: false,
          },
          file_name: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          file_size: {
            type: DataTypes.BIGINT,
            allowNull: false,
          },
          mime_type: {
            type: DataTypes.STRING(100),
            allowNull: false,
          },
          display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
          },
          status: {
            type: DataTypes.ENUM("uploading", "ready", "failed"),
            defaultValue: "uploading",
          },
          created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction }
      );

      // Create post_tags junction table
      await queryInterface.createTable(
        "post_tags",
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          post_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
              model: "discussion_posts",
              key: "id",
            },
            onDelete: "CASCADE",
          },
          tag_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
              model: "tags",
              key: "id",
            },
          },
          created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction }
      );

      // Create discussion_replies table
      await queryInterface.createTable(
        "discussion_replies",
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          content: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          post_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
              model: "discussion_posts",
              key: "id",
            },
            onDelete: "CASCADE",
          },
          parent_reply_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
              model: "discussion_replies",
              key: "id",
            },
          },
          author_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: "users",
              key: "id",
            },
          },
          upvotes: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
          },
          downvotes: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
          },
          depth: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
          },
          is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
          },
          created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction }
      );

      // Create user_votes table
      await queryInterface.createTable(
        "user_votes",
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: "users",
              key: "id",
            },
          },
          target_type: {
            type: DataTypes.ENUM("post", "reply"),
            allowNull: false,
          },
          target_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          vote_type: {
            type: DataTypes.ENUM("upvote", "downvote"),
            allowNull: false,
          },
          created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
        },
        { transaction }
      );

      // Add indexes
      await queryInterface.addIndex(
        "discussion_posts",
        ["is_approved", "is_deleted", "created_at"],
        { transaction }
      );
      await queryInterface.addIndex("discussion_posts", ["author_id"], {
        transaction,
      });
      await queryInterface.addIndex(
        "post_media",
        ["post_id", "display_order"],
        { transaction }
      );
      await queryInterface.addIndex("post_tags", ["post_id"], { transaction });
      await queryInterface.addIndex("post_tags", ["tag_id"], { transaction });
      await queryInterface.addIndex("discussion_replies", ["post_id"], {
        transaction,
      });
      await queryInterface.addIndex(
        "user_votes",
        ["target_type", "target_id"],
        { transaction }
      );
      await queryInterface.addIndex("user_votes", ["user_id"], { transaction });

      // Add unique constraints
      await queryInterface.addConstraint("post_tags", {
        fields: ["post_id", "tag_id"],
        type: "unique",
        name: "unique_post_tag",
        transaction,
      });

      await queryInterface.addConstraint("user_votes", {
        fields: ["user_id", "target_type", "target_id"],
        type: "unique",
        name: "unique_user_vote",
        transaction,
      });

      // Insert default tags
      await queryInterface.bulkInsert(
        "tags",
        [
          {
            id: "550e8400-e29b-41d4-a716-446655440001",
            name: "General",
            color: "blue",
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440002",
            name: "Market",
            color: "green",
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440003",
            name: "Health",
            color: "red",
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440004",
            name: "Feed",
            color: "yellow",
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440005",
            name: "Equipment",
            color: "purple",
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440006",
            name: "Breeding",
            color: "pink",
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440007",
            name: "Events",
            color: "orange",
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable("user_votes", { transaction });
      await queryInterface.dropTable("discussion_replies", { transaction });
      await queryInterface.dropTable("post_tags", { transaction });
      await queryInterface.dropTable("post_media", { transaction });
      await queryInterface.dropTable("discussion_posts", { transaction });
      await queryInterface.dropTable("tags", { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
