import sequelize from "../config/database";
import App from "../app";
import User from "../models/User";
import Role from "../models/Role";
import Level from "../models/Level";
import DiscussionPost from "../models/DiscussionPost";
import DiscussionReply from "../models/DiscussionReply";
import {
  scoringActionService,
  setSemanticClassifier,
} from "../services/scoring/ScoringActionService";
import UserScoreTotal from "../models/UserScoreTotal";

class StubClassifier {
  constructor(private label: "supportive" | "contradictory") {}
  async classifyReply() {
    return { label: this.label, confidence: 0.9, source: "stub" };
  }
}

function fromScaled(v: number) {
  return v / 1000;
}

describe("Trickle voting", () => {
  beforeAll(async () => {
    new App();
  });
  afterAll(async () => {
    await sequelize.close();
  });

  async function baseSetup() {
    const role =
      (await Role.findOne({ where: { name: "farmer" } })) ||
      (await Role.create({ name: "farmer", description: "farmer" }));
    const level =
      (await Level.findOne({ where: { name: "Level 1" } })) ||
      (await Level.create({
        name: "Level 1",
        description: "lvl",
        min_points: 0,
        max_points: 1000,
      }));
    const makeUser = (i: string) =>
      User.create({
        firstname: "U",
        lastname: i,
        email: `trickle_${i}_${Date.now()}@ex.com`,
        username: `trickle_${i}_${Date.now()}`,
        password: "x",
        level_id: level.id,
        role_id: role.id,
      });
    const authorA = await makeUser("A");
    const authorB = await makeUser("B");
    const authorC = await makeUser("C");
    const voter = await makeUser("V");
    const post = await DiscussionPost.create({
      title: "Test Post Title",
      content: "Test post content long enough",
      author_id: authorA.id,
      is_market_post: false,
      is_available: true,
      is_approved: true,
      is_deleted: false,
      upvotes: 0,
      downvotes: 0,
      replies_count: 0,
    });
    const reply1 = await DiscussionReply.create({
      content: "Reply 1 content",
      post_id: post.id,
      author_id: authorB.id,
      upvotes: 0,
      downvotes: 0,
      depth: 0,
      is_deleted: false,
    });
    const reply2 = await DiscussionReply.create({
      content: "Reply 2 content",
      post_id: post.id,
      parent_reply_id: reply1.id,
      author_id: authorC.id,
      upvotes: 0,
      downvotes: 0,
      depth: 1,
      is_deleted: false,
    });
    return { authorA, authorB, authorC, voter, post, reply1, reply2 };
  }

  test("Supportive upvote produces positive trickle", async () => {
    const { authorA, authorB, authorC, voter, reply2, post } =
      await baseSetup();
    setSemanticClassifier(new StubClassifier("supportive"));
    await scoringActionService.handleReplyVote({
      actorId: voter.id,
      reply: reply2 as any,
      post: post as any,
      previousVote: null,
      newVote: "upvote",
    });
    const a = await UserScoreTotal.findByPk(authorA.id); // root
    const b = await UserScoreTotal.findByPk(authorB.id); // parent
    const c = await UserScoreTotal.findByPk(authorC.id); // replier
    expect(fromScaled(c?.total_points || 0)).toBeCloseTo(1, 5);
    expect(fromScaled(b?.total_points || 0)).toBeCloseTo(1, 5);
    // root gets 0.25
    expect(fromScaled(a?.total_points || 0)).toBeCloseTo(0.25, 5);
  });

  test("Contradictory downvote produces positive trickle to chain", async () => {
    const { authorA, authorB, authorC, voter, reply2, post } =
      await baseSetup();
    // reply2 is replier (authorC)
    setSemanticClassifier(new StubClassifier("contradictory"));
    await scoringActionService.handleReplyVote({
      actorId: voter.id,
      reply: reply2 as any,
      post: post as any,
      previousVote: null,
      newVote: "downvote",
    });
    const a = await UserScoreTotal.findByPk(authorA.id); // root should +0.25
    const b = await UserScoreTotal.findByPk(authorB.id); // parent +1
    const c = await UserScoreTotal.findByPk(authorC.id); // replier -1
    expect(fromScaled(c?.total_points || 0)).toBeCloseTo(-1, 5);
    expect(fromScaled(b?.total_points || 0)).toBeCloseTo(1, 5);
    expect(fromScaled(a?.total_points || 0)).toBeCloseTo(0.25, 5);
  });
});
