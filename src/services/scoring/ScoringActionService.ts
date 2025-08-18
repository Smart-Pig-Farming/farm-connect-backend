import scoringService, { ScoreEventInput } from "./ScoringService";
import { Points, toScaled } from "./ScoreTypes";
import ReplyAncestry from "../../models/ReplyAncestry";
import DiscussionReply from "../../models/DiscussionReply";
import DiscussionPost from "../../models/DiscussionPost";
import {
  DummySemanticClassificationService,
  ISemanticClassificationService,
} from "./SemanticClassificationService";
import ScoreEvent from "../../models/ScoreEvent";
import UserModerationStat from "../../models/UserModerationStat";

let classifier: ISemanticClassificationService =
  new DummySemanticClassificationService();
export function setSemanticClassifier(c: ISemanticClassificationService) {
  classifier = c;
}

interface PostVoteParams {
  actorId: number;
  post: DiscussionPost;
  previousVote: "upvote" | "downvote" | null; // vote state BEFORE change
  newVote: "upvote" | "downvote" | null; // state AFTER change
}

interface ReplyVoteParams extends PostVoteParams {
  reply: DiscussionReply;
}

class ScoringActionService {
  // Creation
  async awardPostCreated(postId: string, authorId: number) {
    const events: ScoreEventInput[] = [
      {
        userId: authorId,
        actorUserId: authorId,
        type: "POST_CREATED",
        deltaPoints: Points.POST_CREATED,
        refType: "post",
        refId: postId,
      },
    ];
    return scoringService.recordEvents(events);
  }

  async awardReplyCreated(
    reply: DiscussionReply,
    post: DiscussionPost,
    parentReply?: DiscussionReply | null
  ) {
    const batch: ScoreEventInput[] = [
      {
        userId: reply.author_id,
        actorUserId: reply.author_id,
        type: "REPLY_CREATED",
        deltaPoints: Points.REPLY_CREATED_REPLIER,
        refType: "reply",
        refId: reply.id,
      },
    ];
    if (parentReply && parentReply.author_id !== reply.author_id) {
      batch.push({
        userId: parentReply.author_id,
        actorUserId: reply.author_id,
        type: "REPLY_CREATED",
        deltaPoints: Points.REPLY_CREATED_PARENT,
        refType: "reply",
        refId: reply.id,
        meta: { role: "parent_author" },
      });
    }

    // Persist ancestry (idempotent safe create)
    await ReplyAncestry.findOrCreate({
      where: { reply_id: reply.id },
      defaults: {
        reply_id: reply.id,
        parent_id: parentReply ? parentReply.id : null,
        grandparent_id: parentReply?.parent_reply_id || null,
        root_post_id: post.id,
      },
    });

    return scoringService.recordEvents(batch);
  }

  // Post voting (no trickle)
  async handlePostVote({
    actorId,
    post,
    previousVote,
    newVote,
  }: PostVoteParams) {
    const events: ScoreEventInput[] = [];
    const authorId = (post as any).author_id || (post as any).author?.id;

    // Vote removal
    if (previousVote && !newVote) {
      const delta = previousVote === "upvote" ? -1 : 1; // reverse prior effect
      events.push({
        userId: authorId,
        actorUserId: actorId,
        type: "REACTION_REMOVED",
        deltaPoints: delta,
        refType: "post",
        refId: post.id,
        meta: { previous: previousVote },
      });
    }

    // New vote added
    if (!previousVote && newVote) {
      const delta = newVote === "upvote" ? 1 : -1;
      events.push({
        userId: authorId,
        actorUserId: actorId,
        type: "REACTION_RECEIVED",
        deltaPoints: delta,
        refType: "post",
        refId: post.id,
        meta: { vote: newVote },
      });
      // Engagement reward (first reaction by this actor on this post)
      const existing = await ScoreEvent.findOne({
        where: {
          actor_user_id: actorId,
          ref_type: "post",
          ref_id: post.id,
          event_type: "REACTION_ENGAGEMENT",
        },
      });
      if (!existing) {
        events.push({
          userId: actorId,
          actorUserId: actorId,
          type: "REACTION_ENGAGEMENT",
          deltaPoints: 1,
          refType: "post",
          refId: post.id,
        });
      }
    }

    // Vote switch
    if (previousVote && newVote && previousVote !== newVote) {
      // removal
      events.push({
        userId: authorId,
        actorUserId: actorId,
        type: "REACTION_REMOVED",
        deltaPoints: previousVote === "upvote" ? -1 : 1,
        refType: "post",
        refId: post.id,
        meta: { previous: previousVote, switched: true },
      });
      // new
      events.push({
        userId: authorId,
        actorUserId: actorId,
        type: "REACTION_RECEIVED",
        deltaPoints: newVote === "upvote" ? 1 : -1,
        refType: "post",
        refId: post.id,
        meta: { vote: newVote, switched: true },
      });
    }

    if (!events.length) return { events: [] } as any;
    return scoringService.recordEvents(events);
  }

  // Reply voting with trickle
  async handleReplyVote({
    actorId,
    reply,
    previousVote,
    newVote,
  }: ReplyVoteParams) {
    const events: ScoreEventInput[] = [];
    const replyAuthorId = reply.author_id;

    // Determine classification (only matters for upvote/downvote net effects where trickle applies)
    let classification: "supportive" | "contradictory" | null = null;
    if (newVote === "upvote" || newVote === "downvote" || previousVote) {
      const res = await classifier.classifyReply(
        reply.id,
        (reply as any).content || ""
      );
      classification = res.label;
    }

    // Helper to add trickle
    const loadChain = async () => {
      let ancestry = await ReplyAncestry.findOne({
        where: { reply_id: reply.id },
      });
      if (!ancestry) {
        ancestry = await ReplyAncestry.create({
          reply_id: reply.id,
          parent_id: reply.parent_reply_id || null,
          grandparent_id: null,
          root_post_id: reply.post_id,
        });
      }
      const { parent_id, grandparent_id, root_post_id } = ancestry as any;
      const parentReply = parent_id
        ? await DiscussionReply.findByPk(parent_id)
        : null;
      const grandparentReply = grandparent_id
        ? await DiscussionReply.findByPk(grandparent_id)
        : null;
      let rootAuthorId: number | null = null;
      if (root_post_id) {
        const rootPost = await DiscussionPost.findByPk(root_post_id);
        rootAuthorId = (rootPost as any)?.author_id || null;
      }
      return { parentReply, grandparentReply, rootAuthorId };
    };

    const addTrickle = async (
      baseDelta: number,
      context: { kind: string; classification: string; direction: string }
    ) => {
      // Ensure ancestry row exists
      const { parentReply, grandparentReply, rootAuthorId } = await loadChain();
      const parentAuthorId = parentReply?.author_id;
      if (!parentAuthorId) return; // top-level reply – no trickle

      // supportive upvote path
      if (
        context.classification === "supportive" &&
        context.direction === "up"
      ) {
        if (parentAuthorId && parentAuthorId !== replyAuthorId)
          events.push({
            userId: parentAuthorId,
            actorUserId: actorId,
            type: "TRICKLE_PARENT",
            deltaPoints: Points.TRICKLE_PARENT_SUPPORTIVE,
            refType: "reply",
            refId: reply.id,
            meta: { classification },
          });
        if (grandparentReply && grandparentReply.author_id !== replyAuthorId)
          events.push({
            userId: grandparentReply.author_id,
            actorUserId: actorId,
            type: "TRICKLE_GRANDPARENT",
            deltaPoints: Points.TRICKLE_GRANDPARENT_SUPPORTIVE,
            refType: "reply",
            refId: reply.id,
            meta: { classification },
          });
        if (rootAuthorId && rootAuthorId !== replyAuthorId)
          events.push({
            userId: rootAuthorId,
            actorUserId: actorId,
            type: "TRICKLE_ROOT",
            deltaPoints: Points.TRICKLE_ROOT_SUPPORTIVE,
            refType: "reply",
            refId: reply.id,
            meta: { classification },
          });
      }
      // contradictory upvote path (negative trickle to chain)
      if (
        context.classification === "contradictory" &&
        context.direction === "up"
      ) {
        if (parentAuthorId && parentAuthorId !== replyAuthorId)
          events.push({
            userId: parentAuthorId,
            actorUserId: actorId,
            type: "TRICKLE_PARENT",
            deltaPoints: Points.TRICKLE_PARENT_CONTRADICT_UPVOTE,
            refType: "reply",
            refId: reply.id,
            meta: { classification },
          });
        if (grandparentReply && grandparentReply.author_id !== replyAuthorId)
          events.push({
            userId: grandparentReply.author_id,
            actorUserId: actorId,
            type: "TRICKLE_GRANDPARENT",
            deltaPoints: Points.TRICKLE_GRANDPARENT_CONTRADICT_UPVOTE,
            refType: "reply",
            refId: reply.id,
            meta: { classification },
          });
        if (rootAuthorId && rootAuthorId !== replyAuthorId)
          events.push({
            userId: rootAuthorId,
            actorUserId: actorId,
            type: "TRICKLE_ROOT",
            deltaPoints: Points.TRICKLE_ROOT_CONTRADICT_UPVOTE,
            refType: "reply",
            refId: reply.id,
            meta: { classification },
          });
      }
      // contradictory downvote path (reverse of above)
      if (
        context.classification === "contradictory" &&
        context.direction === "down"
      ) {
        if (parentAuthorId && parentAuthorId !== replyAuthorId)
          events.push({
            userId: parentAuthorId,
            actorUserId: actorId,
            type: "TRICKLE_PARENT",
            deltaPoints: Points.TRICKLE_PARENT_CONTRADICT_DOWNVOTE,
            refType: "reply",
            refId: reply.id,
            meta: { classification },
          });
        if (grandparentReply && grandparentReply.author_id !== replyAuthorId)
          events.push({
            userId: grandparentReply.author_id,
            actorUserId: actorId,
            type: "TRICKLE_GRANDPARENT",
            deltaPoints: Points.TRICKLE_GRANDPARENT_CONTRADICT_DOWNVOTE,
            refType: "reply",
            refId: reply.id,
            meta: { classification },
          });
        if (rootAuthorId && rootAuthorId !== replyAuthorId)
          events.push({
            userId: rootAuthorId,
            actorUserId: actorId,
            type: "TRICKLE_ROOT",
            deltaPoints: Points.TRICKLE_ROOT_CONTRADICT_DOWNVOTE,
            refType: "reply",
            refId: reply.id,
            meta: { classification },
          });
      }
    };

    const addInverseTrickleForPrevious = async () => {
      if (!previousVote) return;
      if (!classification) return;
      // Only cases that produced trickle originally:
      // supportive upvote, contradictory upvote, contradictory downvote
      const producedTrickle =
        (classification === "supportive" && previousVote === "upvote") ||
        (classification === "contradictory" && previousVote === "upvote") ||
        (classification === "contradictory" && previousVote === "downvote");
      if (!producedTrickle) return;
      const direction = previousVote === "upvote" ? "up" : "down";
      // Invert direction semantics for contradictory mapping when removing
      if (classification === "supportive" && direction === "up") {
        // previously gave +1/+0.5/+0.25 => now subtract
        await addTrickle(-1, {
          kind: "support_inverse",
          classification,
          direction: "up",
        });
      } else if (classification === "contradictory" && direction === "up") {
        // previously gave negatives => now add positives (use DownVote contradict mapping inverted?)
        // Add inverse of negative trickle -> use contradict_downvote values (positive)
        await addTrickle(1, {
          kind: "contradict_inverse_up",
          classification,
          direction: "down",
        });
      } else if (classification === "contradictory" && direction === "down") {
        // previously gave positives => now subtract positives
        await addTrickle(-1, {
          kind: "contradict_inverse_down",
          classification,
          direction: "down",
        });
      }
    };

    // removal
    if (previousVote && !newVote) {
      const delta = previousVote === "upvote" ? -1 : 1;
      events.push({
        userId: replyAuthorId,
        actorUserId: actorId,
        type: "REACTION_REMOVED",
        deltaPoints: delta,
        refType: "reply",
        refId: reply.id,
        meta: { previous: previousVote },
      });
      await addInverseTrickleForPrevious();
    }

    // new
    if (!previousVote && newVote) {
      const delta = newVote === "upvote" ? 1 : -1;
      events.push({
        userId: replyAuthorId,
        actorUserId: actorId,
        type: "REACTION_RECEIVED",
        deltaPoints: delta,
        refType: "reply",
        refId: reply.id,
        meta: { vote: newVote, classification },
      });
      if (newVote === "upvote") {
        if (classification === "supportive")
          await addTrickle(1, {
            kind: "support",
            classification,
            direction: "up",
          });
        else if (classification === "contradictory")
          await addTrickle(1, {
            kind: "contradict",
            classification,
            direction: "up",
          });
      } else if (newVote === "downvote" && classification === "contradictory") {
        await addTrickle(-1, {
          kind: "contradict",
          classification,
          direction: "down",
        });
      }
      // engagement
      const existing = await ScoreEvent.findOne({
        where: {
          actor_user_id: actorId,
          ref_type: "reply",
          ref_id: reply.id,
          event_type: "REACTION_ENGAGEMENT",
        },
      });
      if (!existing) {
        events.push({
          userId: actorId,
          actorUserId: actorId,
          type: "REACTION_ENGAGEMENT",
          deltaPoints: 1,
          refType: "reply",
          refId: reply.id,
        });
      }
    }

    // switch
    if (previousVote && newVote && previousVote !== newVote) {
      events.push({
        userId: replyAuthorId,
        actorUserId: actorId,
        type: "REACTION_REMOVED",
        deltaPoints: previousVote === "upvote" ? -1 : 1,
        refType: "reply",
        refId: reply.id,
        meta: { previous: previousVote, switched: true },
      });
      await addInverseTrickleForPrevious();
      events.push({
        userId: replyAuthorId,
        actorUserId: actorId,
        type: "REACTION_RECEIVED",
        deltaPoints: newVote === "upvote" ? 1 : -1,
        refType: "reply",
        refId: reply.id,
        meta: { vote: newVote, switched: true, classification },
      });
      if (newVote === "upvote") {
        if (classification === "supportive")
          await addTrickle(1, {
            kind: "support",
            classification,
            direction: "up",
          });
        else if (classification === "contradictory")
          await addTrickle(1, {
            kind: "contradict",
            classification,
            direction: "up",
          });
      } else if (newVote === "downvote" && classification === "contradictory") {
        await addTrickle(-1, {
          kind: "contradict",
          classification,
          direction: "down",
        });
      }
    }

    if (!events.length) return { events: [] } as any;
    return scoringService.recordEvents(events);
  }

  // Moderator approval (stamp)
  async awardModeratorApproval(post: DiscussionPost, moderatorId: number) {
    const authorId = (post as any).author_id || (post as any).author?.id;
    if (!authorId) return { events: [] } as any;
    const result = await scoringService.recordEvents([
      {
        userId: authorId,
        actorUserId: moderatorId,
        type: "MOD_APPROVED_BONUS",
        deltaPoints: Points.MOD_APPROVED_BONUS,
        refType: "post",
        refId: post.id,
      },
    ]);
    // upsert moderation stats
    const existing = await UserModerationStat.findByPk(authorId);
    if (existing) {
      existing.mod_approvals += 1;
      await existing.save();
    } else {
      await UserModerationStat.create({ user_id: authorId, mod_approvals: 1 });
    }
    return result;
  }

  // Moderator approval reversal (on un-approve / reject after approval)
  async reverseModeratorApproval(post: DiscussionPost, moderatorId: number) {
    const authorId = (post as any).author_id || (post as any).author?.id;
    if (!authorId) return { events: [] } as any;
    // Ensure an approval bonus existed and hasn't already been reversed.
    // RACE NOTE: Approve & Reject can be clicked in rapid succession.
    // If reversal runs before the approval event is committed, we previously bailed out.
    // Add a short bounded retry to mitigate (not infinite; keeps request fast).
    let approvalsCount = 0;
    // Try a bit longer (progressively increasing delay) before giving up.
    for (let attempt = 0; attempt < 8; attempt++) {
      approvalsCount = await ScoreEvent.count({
        where: {
          user_id: authorId,
          ref_type: "post",
          ref_id: post.id,
          event_type: "MOD_APPROVED_BONUS",
        },
      });
      if (approvalsCount > 0) break;
      await new Promise((r) => setTimeout(r, 40 + attempt * 20));
    }
    if (!approvalsCount) {
      // Still not found; schedule a deferred attempt (non-blocking) to catch late commit.
      console.warn(
        `[scoring] reversal: approval event not found immediately for post ${post.id}, scheduling deferred check`
      );
      setTimeout(async () => {
        try {
          const lateApprovals = await ScoreEvent.count({
            where: {
              user_id: authorId,
              ref_type: "post",
              ref_id: post.id,
              event_type: "MOD_APPROVED_BONUS",
            },
          });
          if (!lateApprovals) return; // still nothing; give up silently
          const lateReversals = await ScoreEvent.count({
            where: {
              user_id: authorId,
              ref_type: "post",
              ref_id: post.id,
              event_type: "MOD_APPROVED_BONUS_REVERSAL",
            },
          });
          if (lateReversals >= lateApprovals) return; // already balanced
          console.log(
            `[scoring] reversal: late approval detected for post ${post.id}, applying deferred reversal`
          );
          await scoringService.recordEvents([
            {
              userId: authorId,
              actorUserId: moderatorId,
              type: "MOD_APPROVED_BONUS_REVERSAL",
              deltaPoints: -Points.MOD_APPROVED_BONUS,
              refType: "post",
              refId: post.id,
              meta: {
                reason: "approval_revoked_deferred",
                sequence: lateReversals + 1,
              },
            },
          ]);
          const statsLate = await UserModerationStat.findByPk(authorId);
          if (statsLate && statsLate.mod_approvals > 0) {
            statsLate.mod_approvals -= 1;
            await statsLate.save();
          }
        } catch (err) {
          console.error(
            `[scoring] reversal: deferred reversal failed for post ${post.id}`,
            err
          );
        }
      }, 600); // run once after 600ms
      return { events: [] } as any;
    }
    // Balance approvals vs reversals: if counts equal, nothing to do; else add one reversal.
    const reversalsCount = await ScoreEvent.count({
      where: {
        user_id: authorId,
        ref_type: "post",
        ref_id: post.id,
        event_type: "MOD_APPROVED_BONUS_REVERSAL",
      },
    });
    if (reversalsCount >= approvalsCount) return { events: [] } as any; // already balanced

    const result = await scoringService.recordEvents([
      {
        userId: authorId,
        actorUserId: moderatorId,
        type: "MOD_APPROVED_BONUS_REVERSAL",
        deltaPoints: -Points.MOD_APPROVED_BONUS,
        refType: "post",
        refId: post.id,
        meta: { reason: "approval_revoked", sequence: reversalsCount + 1 },
      },
    ]);

    // decrement moderation approvals count
    const stats = await UserModerationStat.findByPk(authorId);
    if (stats && stats.mod_approvals > 0) {
      stats.mod_approvals -= 1;
      await stats.save();
    }
    return result;
  }

  // Report resolution scoring
  async applyReportResolution(params: {
    decision: "retained" | "deleted" | "warned";
    post: DiscussionPost;
    moderatorId: number;
    reporterIds: number[];
  }) {
    const { decision, post, moderatorId, reporterIds } = params;
    const authorId = (post as any).author_id || (post as any).author?.id;
    const events: ScoreEventInput[] = [];

    const violation = decision === "deleted" || decision === "warned";

    if (violation && authorId) {
      events.push({
        userId: authorId,
        actorUserId: moderatorId,
        type: "REPORT_CONFIRMED_PENALTY",
        deltaPoints: Points.REPORT_CONFIRMED_PENALTY,
        refType: "post",
        refId: post.id,
        meta: { decision },
      });
    }

    for (const rid of reporterIds) {
      events.push({
        userId: rid,
        actorUserId: moderatorId,
        type: violation
          ? "REPORT_CONFIRMED_REPORTER_REWARD"
          : "REPORT_REJECTED_REPORTER_REWARD",
        deltaPoints: violation
          ? Points.REPORT_CONFIRMED_REPORTER_REWARD
          : Points.REPORT_REJECTED_REPORTER_REWARD,
        refType: "post",
        refId: post.id,
        meta: { decision },
      });
    }

    if (!events.length) return { events: [] } as any;
    return scoringService.recordEvents(events);
  }

  // Admin manual adjustment
  async adminAdjust(params: {
    targetUserId: number;
    adminUserId: number;
    deltaPoints: number;
    reason?: string;
  }) {
    const { targetUserId, adminUserId, deltaPoints, reason } = params;
    if (!deltaPoints || deltaPoints === 0) return { events: [] } as any;
    return scoringService.recordEvents([
      {
        userId: targetUserId,
        actorUserId: adminUserId,
        type: "ADMIN_ADJUST",
        deltaPoints,
        refType: "system",
        refId: `admin-adjust-${Date.now()}`,
        meta: { reason },
      },
    ]);
  }
}

export const scoringActionService = new ScoringActionService();
export default scoringActionService;
