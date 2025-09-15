import sequelize from "../config/database";

// Import all models
import User from "./User";
import Role from "./Role";
import Level from "./Level";
import Resource from "./Resource";
import Action from "./Action";
import Permission from "./Permission";
import RolePermission from "./RolePermission";
import Content from "./Content";
import ContentMediaFile from "./ContentMediaFile";
import ContentReaction from "./ContentReaction";
import ContentTagAssignment from "./ContentTagAssignment";
import PostTag from "./PostTag";
import BestPracticeContent from "./BestPracticeContent";
import BestPracticeTag from "./BestPracticeTag";
import BestPracticeRead from "./BestPracticeRead";
import Quiz from "./Quiz";
import QuizQuestion from "./QuizQuestion";
import QuizQuestionOption from "./QuizQuestionOption";
import QuizAttempt from "./QuizAttempt";
import QuizAttemptAnswer from "./QuizAttemptAnswer";
import QuizTagAssignment from "./QuizTagAssignment";
import { PasswordResetToken } from "./PasswordResetToken";
// Discussions system models
import DiscussionPost from "./DiscussionPost";
import DiscussionReply from "./DiscussionReply";
import PostMedia from "./PostMedia";
import Tag from "./Tag";
import UserVote from "./UserVote";
import ContentReport from "./ContentReport";
// Enhanced moderation models
import PostSnapshot from "./PostSnapshot";
import ReportRateLimit from "./ReportRateLimit";
import Notification from "./Notification";
import ScoreEvent from "./ScoreEvent";
import UserScoreTotal from "./UserScoreTotal";
import ReplyAncestry from "./ReplyAncestry";

// ***** USER MANAGEMENT RELATIONSHIPS *****

// User belongs to Role and Level
User.belongsTo(Role, { foreignKey: "role_id", as: "role" });
Role.hasMany(User, { foreignKey: "role_id", as: "users" });

User.belongsTo(Level, { foreignKey: "level_id", as: "level" });
Level.hasMany(User, { foreignKey: "level_id", as: "users" });

// ***** PASSWORD RESET TOKEN RELATIONSHIPS *****

// PasswordResetToken belongs to User
PasswordResetToken.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(PasswordResetToken, {
  foreignKey: "userId",
  as: "passwordResetTokens",
});

// ***** PERMISSION SYSTEM RELATIONSHIPS *****

// Permission belongs to Resource and Action
Permission.belongsTo(Resource, { foreignKey: "resource_id", as: "resource" });
Resource.hasMany(Permission, { foreignKey: "resource_id", as: "permissions" });

Permission.belongsTo(Action, { foreignKey: "action_id", as: "action" });
Action.hasMany(Permission, { foreignKey: "action_id", as: "permissions" });

// Many-to-Many: Role and Permission through RolePermission
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: "role_id",
  otherKey: "permission_id",
  as: "permissions",
});

Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: "permission_id",
  otherKey: "role_id",
  as: "roles",
});

// Direct associations for RolePermission
RolePermission.belongsTo(Role, { foreignKey: "role_id", as: "role" });
RolePermission.belongsTo(Permission, {
  foreignKey: "permission_id",
  as: "permission",
});

// ***** CONTENT MANAGEMENT RELATIONSHIPS *****

// User creates Content
User.hasMany(Content, { foreignKey: "user_id", as: "contents" });
Content.belongsTo(User, { foreignKey: "user_id", as: "user" });

// Self-referencing relationship for Content (replies/comments)
Content.hasMany(Content, {
  foreignKey: "parent_id",
  as: "replies",
  onDelete: "CASCADE",
});
Content.belongsTo(Content, {
  foreignKey: "parent_id",
  as: "parent",
});

// Content has Media Files
Content.hasMany(ContentMediaFile, {
  foreignKey: "content_id",
  as: "mediaFiles",
  onDelete: "CASCADE",
});
ContentMediaFile.belongsTo(Content, {
  foreignKey: "content_id",
  as: "content",
});

// Content Reactions
Content.hasMany(ContentReaction, {
  foreignKey: "content_id",
  as: "reactions",
  onDelete: "CASCADE",
});
ContentReaction.belongsTo(Content, {
  foreignKey: "content_id",
  as: "content",
});

User.hasMany(ContentReaction, {
  foreignKey: "user_id",
  as: "reactions",
});
ContentReaction.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// ***** CONTENT TAGGING RELATIONSHIPS *****

// Many-to-Many: Content and PostTag through ContentTagAssignment
Content.belongsToMany(PostTag, {
  through: ContentTagAssignment,
  foreignKey: "content_id",
  otherKey: "tag_id",
  as: "tags",
});

PostTag.belongsToMany(Content, {
  through: ContentTagAssignment,
  foreignKey: "tag_id",
  otherKey: "content_id",
  as: "contents",
});

// Direct associations for ContentTagAssignment
ContentTagAssignment.belongsTo(Content, {
  foreignKey: "content_id",
  as: "content",
});
ContentTagAssignment.belongsTo(PostTag, { foreignKey: "tag_id", as: "tag" });
Content.hasMany(ContentTagAssignment, {
  foreignKey: "content_id",
  as: "tagAssignments",
});
PostTag.hasMany(ContentTagAssignment, {
  foreignKey: "tag_id",
  as: "contentAssignments",
});

// ***** BEST PRACTICE RELATIONSHIPS *****

// User creates Best Practice Content
User.hasMany(BestPracticeContent, {
  foreignKey: "created_by",
  as: "bestPractices",
});
BestPracticeContent.belongsTo(User, {
  foreignKey: "created_by",
  as: "creator",
});

// ***** QUIZ SYSTEM RELATIONSHIPS *****

// Quiz relationships
Quiz.belongsTo(User, { foreignKey: "created_by", as: "creator" });
User.hasMany(Quiz, { foreignKey: "created_by", as: "createdQuizzes" });

// Primary category (legacy one-to-many retained)
Quiz.belongsTo(BestPracticeTag, {
  foreignKey: "best_practice_tag_id",
  as: "bestPracticeTag",
});
BestPracticeTag.hasMany(Quiz, {
  foreignKey: "best_practice_tag_id",
  as: "quizzes",
});

// New many-to-many quiz <-> tags (additional categories)
Quiz.belongsToMany(BestPracticeTag, {
  through: QuizTagAssignment,
  foreignKey: "quiz_id",
  otherKey: "tag_id",
  as: "tags",
});
BestPracticeTag.belongsToMany(Quiz, {
  through: QuizTagAssignment,
  foreignKey: "tag_id",
  otherKey: "quiz_id",
  as: "taggedQuizzes",
});

// Quiz questions
Quiz.hasMany(QuizQuestion, {
  foreignKey: "quiz_id",
  as: "questions",
  onDelete: "CASCADE",
});
QuizQuestion.belongsTo(Quiz, { foreignKey: "quiz_id", as: "quiz" });

// Question options
QuizQuestion.hasMany(QuizQuestionOption, {
  foreignKey: "question_id",
  as: "options",
  onDelete: "CASCADE",
});
QuizQuestionOption.belongsTo(QuizQuestion, {
  foreignKey: "question_id",
  as: "question",
});

// Quiz attempts & answers
Quiz.hasMany(QuizAttempt, {
  foreignKey: "quiz_id",
  as: "attempts",
  onDelete: "CASCADE",
});
QuizAttempt.belongsTo(Quiz, { foreignKey: "quiz_id", as: "quiz" });
User.hasMany(QuizAttempt, {
  foreignKey: "user_id",
  as: "quizAttempts",
  onDelete: "CASCADE",
});
QuizAttempt.belongsTo(User, { foreignKey: "user_id", as: "user" });
QuizAttempt.hasMany(QuizAttemptAnswer, {
  foreignKey: "attempt_id",
  as: "answers",
  onDelete: "CASCADE",
});
QuizAttemptAnswer.belongsTo(QuizAttempt, {
  foreignKey: "attempt_id",
  as: "attempt",
});
QuizAttemptAnswer.belongsTo(QuizQuestion, {
  foreignKey: "question_id",
  as: "question",
});
QuizAttemptAnswer.belongsTo(QuizQuestionOption, {
  foreignKey: "option_id",
  as: "option",
});

// ***** DISCUSSION SYSTEM RELATIONSHIPS *****

// Post author
DiscussionPost.belongsTo(User, { foreignKey: "author_id", as: "author" });
User.hasMany(DiscussionPost, {
  foreignKey: "author_id",
  as: "discussionPosts",
});

// Post media
DiscussionPost.hasMany(PostMedia, {
  foreignKey: "post_id",
  as: "media",
  onDelete: "CASCADE",
});
PostMedia.belongsTo(DiscussionPost, { foreignKey: "post_id", as: "post" });

// Post tags (many-to-many through post_tags)
DiscussionPost.belongsToMany(Tag, {
  through: {
    model: "post_tags",
    unique: false,
  },
  foreignKey: "post_id",
  otherKey: "tag_id",
  as: "tags",
});
Tag.belongsToMany(DiscussionPost, {
  through: {
    model: "post_tags",
    unique: false,
  },
  foreignKey: "tag_id",
  otherKey: "post_id",
  as: "posts",
});

// Replies
DiscussionPost.hasMany(DiscussionReply, {
  foreignKey: "post_id",
  as: "replies",
  onDelete: "CASCADE",
});
DiscussionReply.belongsTo(DiscussionPost, {
  foreignKey: "post_id",
  as: "post",
});

// Reply author and hierarchy
DiscussionReply.belongsTo(User, { foreignKey: "author_id", as: "author" });
User.hasMany(DiscussionReply, {
  foreignKey: "author_id",
  as: "discussionReplies",
});
DiscussionReply.hasMany(DiscussionReply, {
  foreignKey: "parent_reply_id",
  as: "childReplies",
});
DiscussionReply.belongsTo(DiscussionReply, {
  foreignKey: "parent_reply_id",
  as: "parentReply",
});

// Votes (polymorphic-style by scope on target_type)
User.hasMany(UserVote, { foreignKey: "user_id", as: "votes" });
UserVote.belongsTo(User, { foreignKey: "user_id", as: "user" });
DiscussionPost.hasMany(UserVote, {
  foreignKey: "target_id",
  constraints: false,
  scope: { target_type: "post" },
  as: "votes",
});
UserVote.belongsTo(DiscussionPost, {
  foreignKey: "target_id",
  constraints: false,
  as: "post",
});
DiscussionReply.hasMany(UserVote, {
  foreignKey: "target_id",
  constraints: false,
  scope: { target_type: "reply" },
  as: "votes",
});
UserVote.belongsTo(DiscussionReply, {
  foreignKey: "target_id",
  constraints: false,
  as: "reply",
});

// ***** MODERATION / REPORTS RELATIONSHIPS *****

// Reporter and moderator associations
ContentReport.belongsTo(User, { foreignKey: "reporter_id", as: "reporter" });
User.hasMany(ContentReport, { foreignKey: "reporter_id", as: "reports" });

ContentReport.belongsTo(User, { foreignKey: "moderator_id", as: "moderator" });
User.hasMany(ContentReport, {
  foreignKey: "moderator_id",
  as: "moderatedReports",
});

// Polymorphic-style: link to post or reply via content_id without constraints
ContentReport.belongsTo(DiscussionPost, {
  foreignKey: "content_id",
  constraints: false,
  as: "post",
});
DiscussionPost.hasMany(ContentReport, {
  foreignKey: "content_id",
  constraints: false,
  as: "contentReports",
});

ContentReport.belongsTo(DiscussionReply, {
  foreignKey: "content_id",
  constraints: false,
  as: "reply",
});
DiscussionReply.hasMany(ContentReport, {
  foreignKey: "content_id",
  constraints: false,
  as: "contentReports",
});

// ***** POST SNAPSHOT RELATIONSHIPS *****

// PostSnapshot belongs to ContentReport and DiscussionPost
PostSnapshot.belongsTo(ContentReport, {
  foreignKey: "content_report_id",
  as: "contentReport",
});
ContentReport.hasOne(PostSnapshot, {
  foreignKey: "content_report_id",
  as: "postSnapshot",
});

PostSnapshot.belongsTo(DiscussionPost, {
  foreignKey: "post_id",
  as: "post",
});
DiscussionPost.hasMany(PostSnapshot, {
  foreignKey: "post_id",
  as: "snapshots",
});

// ***** REPORT RATE LIMIT RELATIONSHIPS *****

// ReportRateLimit belongs to User
ReportRateLimit.belongsTo(User, { foreignKey: "reporter_id", as: "reporter" });
User.hasMany(ReportRateLimit, {
  foreignKey: "reporter_id",
  as: "reportRateLimits",
});

// ***** DATABASE SYNC FUNCTION *****

export const syncDatabase = async (force = false): Promise<void> => {
  try {
    await sequelize.sync({ force });
    console.log(" Database synced successfully");
  } catch (error) {
    console.error(" Database sync failed:", error);
    throw error;
  }
};

// ***** EXPORT ALL MODELS *****

export {
  sequelize,
  User,
  Role,
  Level,
  Resource,
  Action,
  Permission,
  RolePermission,
  Content,
  ContentMediaFile,
  ContentReaction,
  ContentTagAssignment,
  PostTag,
  BestPracticeContent,
  BestPracticeTag,
  BestPracticeRead,
  Quiz,
  QuizQuestion,
  QuizQuestionOption,
  QuizAttempt,
  QuizAttemptAnswer,
  PasswordResetToken,
  DiscussionPost,
  DiscussionReply,
  PostMedia,
  Tag,
  UserVote,
  ContentReport,
  PostSnapshot,
  ReportRateLimit,
  Notification,
  ScoreEvent,
  UserScoreTotal,
  ReplyAncestry,
  QuizTagAssignment,
};

// Export the sequelize instance as default
export default sequelize;
