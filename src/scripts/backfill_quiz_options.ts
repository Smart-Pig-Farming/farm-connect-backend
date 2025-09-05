import dotenv from "dotenv";
import sequelize from "../config/database";
import QuizQuestion from "../models/QuizQuestion";
import QuizQuestionOption from "../models/QuizQuestionOption";

/*
  Backfill script: for each quiz question without options, insert default options.
  - For mcq / truefalse: insert 4 (or 2) options with one correct.
  - For multi: insert 4 options, two correct.
  This is only for development/demo; adjust texts as needed.
*/

dotenv.config();

async function run() {
  await sequelize.authenticate();
  console.log("DB connected");
  const questions = await QuizQuestion.findAll({
    where: { is_deleted: false },
  });
  let createdTotal = 0;
  for (const q of questions) {
    const existing = await QuizQuestionOption.count({
      where: { question_id: q.id, is_deleted: false },
    });
    if (existing > 0) continue;
    const baseText = q.text.replace(/\?$/, "");
    const opts: { text: string; is_correct: boolean }[] = [];
    if (q.type === "truefalse") {
      opts.push({ text: "True", is_correct: true });
      opts.push({ text: "False", is_correct: false });
    } else if (q.type === "multi") {
      opts.push({ text: `${baseText} - Option A`, is_correct: true });
      opts.push({ text: `${baseText} - Option B`, is_correct: true });
      opts.push({ text: `${baseText} - Option C`, is_correct: false });
      opts.push({ text: `${baseText} - Option D`, is_correct: false });
    } else {
      // mcq
      opts.push({ text: `${baseText} - Option A`, is_correct: true });
      opts.push({ text: `${baseText} - Option B`, is_correct: false });
      opts.push({ text: `${baseText} - Option C`, is_correct: false });
      opts.push({ text: `${baseText} - Option D`, is_correct: false });
    }
    let order = 0;
    for (const o of opts) {
      await QuizQuestionOption.create({
        question_id: q.id,
        text: o.text,
        is_correct: o.is_correct,
        order_index: order++,
        is_deleted: false,
      });
      createdTotal++;
    }
    console.log(`Created ${opts.length} options for question ${q.id}`);
  }
  console.log(`Backfill complete: ${createdTotal} options created.`);
  await sequelize.close();
}

run().catch((err) => {
  console.error("Backfill failed", err);
  sequelize.close();
  process.exit(1);
});
