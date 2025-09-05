import { DataTypes, Model, Optional, Association, Op } from "sequelize";
import sequelize from "../config/database";
import User from "./User";

// ReportRateLimit attributes interface
export interface ReportRateLimitAttributes {
  id: string;
  reporter_id: number;
  content_id: string;
  content_type: "post" | "reply";
  reported_at: Date;
}

// Creation attributes
interface ReportRateLimitCreationAttributes
  extends Optional<ReportRateLimitAttributes, "id" | "reported_at"> {}

// ReportRateLimit model class
class ReportRateLimit
  extends Model<ReportRateLimitAttributes, ReportRateLimitCreationAttributes>
  implements ReportRateLimitAttributes
{
  public id!: string;
  public reporter_id!: number;
  public content_id!: string;
  public content_type!: "post" | "reply";
  public readonly reported_at!: Date;

  // Association declarations
  public static associations: {
    reporter: Association<ReportRateLimit, User>;
  };

  // Static methods for rate limiting logic
  public static async checkRateLimit(
    reporterId: number,
    contentId?: string,
    contentType?: "post" | "reply"
  ): Promise<{
    allowed: boolean;
    retryAfter?: number;
    reason?: string;
  }> {
    const now = new Date();

    // Check general rate limit (reports per hour)
    const perHourLimit = parseInt(
      process.env.MODERATION_RATE_LIMIT_PER_HOUR || "10",
      10
    );
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentReportsCount = await ReportRateLimit.count({
      where: {
        reporter_id: reporterId,
        reported_at: {
          [Op.gte]: hourAgo,
        },
      },
    });

    if (recentReportsCount >= perHourLimit) {
      const oldestRecentReport = await ReportRateLimit.findOne({
        where: {
          reporter_id: reporterId,
          reported_at: {
            [Op.gte]: hourAgo,
          },
        },
        order: [["reported_at", "ASC"]],
      });

      const retryAfter = oldestRecentReport
        ? Math.ceil(
            (oldestRecentReport.reported_at.getTime() +
              60 * 60 * 1000 -
              now.getTime()) /
              1000
          )
        : 3600;

      return {
        allowed: false,
        retryAfter: Math.max(retryAfter, 0),
        reason: "hourly_limit_exceeded",
      };
    }

    // Check same content cooldown if content specified
    if (contentId && contentType) {
      const cooldownHours = parseInt(
        process.env.MODERATION_RATE_LIMIT_SAME_CONTENT_HOURS || "72",
        10
      );
      const cooldownAgo = new Date(
        now.getTime() - cooldownHours * 60 * 60 * 1000
      );

      const sameContentReport = await ReportRateLimit.findOne({
        where: {
          reporter_id: reporterId,
          content_id: contentId,
          content_type: contentType,
          reported_at: {
            [Op.gte]: cooldownAgo,
          },
        },
        order: [["reported_at", "DESC"]],
      });

      if (sameContentReport) {
        const retryAfter = Math.ceil(
          (sameContentReport.reported_at.getTime() +
            cooldownHours * 60 * 60 * 1000 -
            now.getTime()) /
            1000
        );

        return {
          allowed: false,
          retryAfter: Math.max(retryAfter, 0),
          reason: "content_cooldown",
        };
      }
    }

    return { allowed: true };
  }

  public static async recordReport(
    reporterId: number,
    contentId: string,
    contentType: "post" | "reply"
  ): Promise<ReportRateLimit> {
    return await ReportRateLimit.create({
      reporter_id: reporterId,
      content_id: contentId,
      content_type: contentType,
    });
  }

  public static async cleanupOldRecords(
    olderThanDays: number = 30
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const deletedCount = await ReportRateLimit.destroy({
      where: {
        reported_at: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    return deletedCount;
  }
}

ReportRateLimit.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reporter_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    content_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    content_type: {
      type: DataTypes.ENUM("post", "reply"),
      allowNull: false,
    },
    reported_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "report_rate_limits",
    timestamps: false, // We handle reported_at manually
    indexes: [
      {
        fields: ["reporter_id", "reported_at"],
      },
      {
        fields: ["content_id", "content_type", "reported_at"],
      },
      {
        fields: ["reported_at"],
      },
      {
        unique: true,
        fields: ["reporter_id", "content_id", "content_type"],
        name: "unique_reporter_content",
      },
    ],
  }
);

export default ReportRateLimit;
