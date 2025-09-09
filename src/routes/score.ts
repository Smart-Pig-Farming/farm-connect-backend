/**
 * @swagger
 * components:
 *   schemas:
 *     UserScore:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         totalPoints:
 *           type: integer
 *           example: 1250
 *           description: "Total lifetime points earned"
 *         currentLevel:
 *           type: integer
 *           example: 3
 *           description: "Current user level (1-10)"
 *         levelName:
 *           type: string
 *           example: "Experienced Farmer"
 *           description: "Human-readable level name"
 *         pointsToNextLevel:
 *           type: integer
 *           example: 250
 *           description: "Points needed to reach next level"
 *         weeklyPoints:
 *           type: integer
 *           example: 150
 *           description: "Points earned this week"
 *         monthlyPoints:
 *           type: integer
 *           example: 450
 *           description: "Points earned this month"
 *         currentStreak:
 *           type: integer
 *           example: 7
 *           description: "Current daily activity streak"
 *         longestStreak:
 *           type: integer
 *           example: 21
 *           description: "Longest daily activity streak achieved"
 *         rank:
 *           type: integer
 *           example: 15
 *           description: "Current ranking among all users"
 *         badges:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserBadge'
 *           description: "Earned badges and achievements"
 *         lastActivity:
 *           type: string
 *           format: date-time
 *           example: "2023-12-01T10:30:00Z"
 *
 *     UserBadge:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "discussion_starter"
 *         name:
 *           type: string
 *           example: "Discussion Starter"
 *         description:
 *           type: string
 *           example: "Started 10 meaningful discussions"
 *         icon:
 *           type: string
 *           example: "💬"
 *         category:
 *           type: string
 *           enum: [participation, achievement, milestone, special]
 *           example: "participation"
 *         earnedAt:
 *           type: string
 *           format: date-time
 *           example: "2023-11-15T14:20:00Z"
 *         rarity:
 *           type: string
 *           enum: [common, rare, epic, legendary]
 *           example: "rare"
 *
 *     ScoreEvent:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         eventType:
 *           type: string
 *           enum: [
 *             post_created, reply_created, post_liked, reply_liked,
 *             quiz_completed, quiz_passed, best_practice_read,
 *             daily_login, streak_bonus, level_up, badge_earned,
 *             admin_adjustment, moderation_action
 *           ]
 *           example: "quiz_passed"
 *         points:
 *           type: integer
 *           example: 50
 *           description: "Points awarded for this event"
 *         description:
 *           type: string
 *           example: "Passed quiz: Pig Nutrition Basics"
 *         metadata:
 *           type: object
 *           properties:
 *             relatedId:
 *               type: string
 *               description: "ID of related content (quiz, post, etc.)"
 *             category:
 *               type: string
 *               description: "Category of the related content"
 *             bonus:
 *               type: boolean
 *               description: "Whether this was a bonus point event"
 *           example:
 *             relatedId: "quiz_123"
 *             category: "health"
 *             bonus: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2023-12-01T09:15:00Z"
 *
 *     LeaderboardEntry:
 *       type: object
 *       properties:
 *         rank:
 *           type: integer
 *           example: 1
 *         userId:
 *           type: string
 *           format: uuid
 *         user:
 *           type: object
 *           properties:
 *             firstname:
 *               type: string
 *               example: "John"
 *             lastname:
 *               type: string
 *               example: "Doe"
 *             province:
 *               type: string
 *               example: "Kigali"
 *             avatarUrl:
 *               type: string
 *               format: uri
 *               nullable: true
 *         totalPoints:
 *           type: integer
 *           example: 2850
 *         currentLevel:
 *           type: integer
 *           example: 5
 *         levelName:
 *           type: string
 *           example: "Expert Farmer"
 *         weeklyPoints:
 *           type: integer
 *           example: 275
 *         monthlyPoints:
 *           type: integer
 *           example: 890
 *         currentStreak:
 *           type: integer
 *           example: 14
 *         badgeCount:
 *           type: integer
 *           example: 8
 *         recentBadges:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserBadge'
 *           maxItems: 3
 *           description: "Most recently earned badges"
 *
 *     DailyStats:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           example: "2023-12-01"
 *         pointsEarned:
 *           type: integer
 *           example: 85
 *         eventsCount:
 *           type: integer
 *           example: 12
 *         activities:
 *           type: object
 *           properties:
 *             postsCreated:
 *               type: integer
 *               example: 2
 *             repliesCreated:
 *               type: integer
 *               example: 5
 *             likesGiven:
 *               type: integer
 *               example: 8
 *             quizzesCompleted:
 *               type: integer
 *               example: 1
 *             practicesRead:
 *               type: integer
 *               example: 3
 *         streakMaintained:
 *           type: boolean
 *           example: true
 *         bonusesEarned:
 *           type: array
 *           items:
 *             type: string
 *           example: ["daily_login", "streak_bonus"]
 *
 *     AdminScoreAdjustment:
 *       type: object
 *       required: [userId, points, reason]
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         points:
 *           type: integer
 *           example: 100
 *           description: "Points to add (positive) or subtract (negative)"
 *         reason:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *           example: "Exceptional contribution to community discussion about sustainable farming practices"
 *         category:
 *           type: string
 *           enum: [bonus, penalty, correction, special_event]
 *           default: bonus
 *           example: "bonus"
 *         notifyUser:
 *           type: boolean
 *           default: true
 *           description: "Whether to send notification to the user"
 *
 *     ModeratorPromotion:
 *       type: object
 *       required: [userId]
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         reason:
 *           type: string
 *           maxLength: 500
 *           example: "Consistent high-quality contributions and community leadership"
 *         skipNotification:
 *           type: boolean
 *           default: false
 *           description: "Whether to skip sending promotion notification"
 */

import { Router } from "express";
import scoreController from "../controllers/scoreController";
import { authenticateWithCookies } from "../middleware/cookieAuth";
import { requirePermission } from "../middleware/permissions";
import {
  ACTIONS,
  RESOURCES,
  createPermissionString,
} from "../constants/permissions";

const router = Router();

/**
 * @swagger
 * /api/score/me:
 *   get:
 *     summary: Get my score and achievements
 *     description: |
 *       Get comprehensive scoring information for the authenticated user including:
 *       - Total points and current level
 *       - Weekly/monthly points
 *       - Current streak and achievements
 *       - Badges earned and progress to next level
 *       - Current ranking
 *     tags: [Scoring]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User score information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         score:
 *                           $ref: '#/components/schemas/UserScore'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/me", authenticateWithCookies, scoreController.getMyScore);

/**
 * @swagger
 * /api/score/events:
 *   get:
 *     summary: Get my score events history
 *     description: |
 *       Get a paginated list of all scoring events for the authenticated user.
 *       Shows how points were earned including posts, quizzes, achievements, etc.
 *     tags: [Scoring]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *           enum: [
 *             post_created, reply_created, post_liked, reply_liked,
 *             quiz_completed, quiz_passed, best_practice_read,
 *             daily_login, streak_bonus, level_up, badge_earned,
 *             admin_adjustment, moderation_action
 *           ]
 *         description: Filter by specific event type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter events from this date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter events to this date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Score events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ScoreEvent'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         total:
 *                           type: integer
 *                           example: 156
 *                         pages:
 *                           type: integer
 *                           example: 8
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalPoints:
 *                           type: integer
 *                           example: 1250
 *                         eventCount:
 *                           type: integer
 *                           example: 156
 *                         averagePerEvent:
 *                           type: number
 *                           format: float
 *                           example: 8.01
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/events", authenticateWithCookies, scoreController.getMyEvents);

/**
 * @swagger
 * /api/score/me/stats:
 *   get:
 *     summary: Get my daily statistics
 *     description: |
 *       Get detailed daily activity statistics for the authenticated user.
 *       Shows daily point breakdown, activities performed, and streak information.
 *     tags: [Scoring]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *           default: "UTC"
 *         description: Timezone for daily stats calculation (e.g., "Africa/Kigali")
 *         example: "Africa/Kigali"
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 90
 *           default: 7
 *         description: Number of days to include in statistics
 *     responses:
 *       200:
 *         description: Daily statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     dailyStats:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DailyStats'
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalPoints:
 *                           type: integer
 *                           example: 485
 *                         averageDaily:
 *                           type: number
 *                           format: float
 *                           example: 69.3
 *                         bestDay:
 *                           type: object
 *                           properties:
 *                             date:
 *                               type: string
 *                               format: date
 *                             points:
 *                               type: integer
 *                           example:
 *                             date: "2023-11-28"
 *                             points: 125
 *                         currentStreak:
 *                           type: integer
 *                           example: 7
 *                         streakBonuses:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/me/stats",
  authenticateWithCookies,
  scoreController.getMyDailyStats
);

/**
 * @swagger
 * /api/score/users/{userId}:
 *   get:
 *     summary: Get public score for a user
 *     description: |
 *       Get public scoring information for any user.
 *       Shows limited information compared to the authenticated user's own score.
 *     tags: [Scoring]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID to get score information for
 *     responses:
 *       200:
 *         description: Public user score retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             firstname:
 *                               type: string
 *                               example: "John"
 *                             lastname:
 *                               type: string
 *                               example: "Doe"
 *                             province:
 *                               type: string
 *                               example: "Kigali"
 *                         publicScore:
 *                           type: object
 *                           properties:
 *                             totalPoints:
 *                               type: integer
 *                               example: 1250
 *                             currentLevel:
 *                               type: integer
 *                               example: 3
 *                             levelName:
 *                               type: string
 *                               example: "Experienced Farmer"
 *                             rank:
 *                               type: integer
 *                               example: 15
 *                             publicBadges:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/UserBadge'
 *                               description: "Only publicly visible badges"
 *                             joinedAt:
 *                               type: string
 *                               format: date-time
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/users/:userId", scoreController.getUserPublicScore);

/**
 * @swagger
 * /api/score/leaderboard:
 *   get:
 *     summary: Get leaderboard rankings
 *     description: |
 *       Get the leaderboard showing top users by various metrics.
 *       Supports different time periods and filtering options.
 *     tags: [Scoring]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [all_time, monthly, weekly, daily]
 *           default: all_time
 *         description: Time period for leaderboard calculation
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 10
 *           maximum: 100
 *           default: 20
 *         description: Number of top users to return
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *         description: Filter by province for regional leaderboards
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *         description: Filter by user level
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     leaderboard:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LeaderboardEntry'
 *                     period:
 *                       type: string
 *                       example: "all_time"
 *                     filters:
 *                       type: object
 *                       properties:
 *                         province:
 *                           type: string
 *                           nullable: true
 *                         level:
 *                           type: integer
 *                           nullable: true
 *                     totalUsers:
 *                       type: integer
 *                       example: 1547
 *                       description: "Total users matching filter criteria"
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                       description: "When the leaderboard was last calculated"
 */
router.get("/leaderboard", scoreController.getLeaderboard);

/**
 * @swagger
 * /api/score/timezones:
 *   get:
 *     summary: Get supported timezones
 *     description: |
 *       Get a list of supported timezones for daily statistics calculation.
 *       Useful for frontend timezone selection.
 *     tags: [Scoring]
 *     responses:
 *       200:
 *         description: Supported timezones retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     timezones:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "Africa/Kigali"
 *                           name:
 *                             type: string
 *                             example: "Central Africa Time"
 *                           offset:
 *                             type: string
 *                             example: "+02:00"
 *                           country:
 *                             type: string
 *                             example: "Rwanda"
 *                     default:
 *                       type: string
 *                       example: "Africa/Kigali"
 *                       description: "Default timezone for the application"
 */
router.get("/timezones", scoreController.getSupportedTimezones);

/**
 * @swagger
 * /api/score/admin/adjust:
 *   post:
 *     summary: Admin score adjustment
 *     description: |
 *       Manually adjust a user's score for administrative reasons.
 *       Requires MANAGE:POINTS permission.
 *
 *       **Use Cases:**
 *       - Reward exceptional community contributions
 *       - Apply penalties for rule violations
 *       - Correct scoring errors
 *       - Special event bonuses
 *     tags: [Scoring]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminScoreAdjustment'
 *     responses:
 *       200:
 *         description: Score adjustment applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         adjustment:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             userId:
 *                               type: string
 *                               format: uuid
 *                             points:
 *                               type: integer
 *                               example: 100
 *                             reason:
 *                               type: string
 *                               example: "Exceptional contribution to community"
 *                             category:
 *                               type: string
 *                               example: "bonus"
 *                             appliedBy:
 *                               type: string
 *                               format: uuid
 *                               description: "Admin user ID who applied the adjustment"
 *                             appliedAt:
 *                               type: string
 *                               format: date-time
 *                         userScore:
 *                           type: object
 *                           properties:
 *                             previousTotal:
 *                               type: integer
 *                               example: 1250
 *                             newTotal:
 *                               type: integer
 *                               example: 1350
 *                             levelChanged:
 *                               type: boolean
 *                               example: false
 *                         notification:
 *                           type: object
 *                           properties:
 *                             sent:
 *                               type: boolean
 *                               example: true
 *                             message:
 *                               type: string
 *                               example: "You received 100 bonus points for exceptional community contribution!"
 *       400:
 *         description: Validation error or invalid adjustment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions (requires MANAGE:POINTS)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/admin/adjust",
  authenticateWithCookies,
  requirePermission(createPermissionString(ACTIONS.MANAGE, RESOURCES.POINTS)),
  scoreController.adminAdjust
);

/**
 * @swagger
 * /api/score/admin/promote-moderator:
 *   post:
 *     summary: Promote user to moderator
 *     description: |
 *       Promote a user to moderator role based on their contributions and scoring.
 *       Requires MANAGE:POINTS permission.
 *
 *       **Promotion Criteria (typically):**
 *       - High total points (usually 1000+)
 *       - Consistent positive contributions
 *       - Good community standing
 *       - No recent violations
 *
 *       **Effects of Promotion:**
 *       - Role changed to 'moderator'
 *       - Additional permissions granted
 *       - Special badge awarded
 *       - Notification sent to user
 *     tags: [Scoring]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModeratorPromotion'
 *     responses:
 *       200:
 *         description: User promoted to moderator successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         promotion:
 *                           type: object
 *                           properties:
 *                             userId:
 *                               type: string
 *                               format: uuid
 *                             previousRole:
 *                               type: string
 *                               example: "farmer"
 *                             newRole:
 *                               type: string
 *                               example: "moderator"
 *                             reason:
 *                               type: string
 *                               example: "Consistent high-quality contributions"
 *                             promotedBy:
 *                               type: string
 *                               format: uuid
 *                             promotedAt:
 *                               type: string
 *                               format: date-time
 *                         rewards:
 *                           type: object
 *                           properties:
 *                             badgeAwarded:
 *                               $ref: '#/components/schemas/UserBadge'
 *                             bonusPoints:
 *                               type: integer
 *                               example: 200
 *                               description: "Bonus points awarded for promotion"
 *                             newPermissions:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["MANAGE:REPORTS", "UPDATE:DISCUSSIONS"]
 *                         notification:
 *                           type: object
 *                           properties:
 *                             sent:
 *                               type: boolean
 *                               example: true
 *                             title:
 *                               type: string
 *                               example: "Congratulations! You've been promoted to Moderator"
 *                             message:
 *                               type: string
 *                               example: "Thank you for your valuable contributions to the community!"
 *       400:
 *         description: User not eligible for promotion or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               alreadyModerator:
 *                 value:
 *                   success: false
 *                   error: "User is already a moderator"
 *                   code: "ALREADY_MODERATOR"
 *               notEligible:
 *                 value:
 *                   success: false
 *                   error: "User does not meet promotion criteria"
 *                   code: "NOT_ELIGIBLE_FOR_PROMOTION"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions (requires MANAGE:POINTS)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/admin/promote-moderator",
  authenticateWithCookies,
  requirePermission(createPermissionString(ACTIONS.MANAGE, RESOURCES.POINTS)),
  scoreController.promoteModerator
);

export default router;
