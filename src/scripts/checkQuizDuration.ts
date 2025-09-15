import sequelize from "../config/database";
import Quiz from "../models/Quiz";

async function checkQuizDuration() {
  try {
    await sequelize.authenticate();

    const quiz = await Quiz.findOne({
      where: { title: "Comprehensive Pig Farming Quiz" },
    });

    if (quiz) {
      console.log("📋 CURRENT QUIZ SETTINGS:");
      console.log("══════════════════════════════════════════════════");
      console.log(`Title: ${quiz.title}`);
      console.log(`Duration: ${quiz.duration} minutes`);
      console.log(`Passing Score: ${quiz.passing_score}%`);
      console.log(`Description: ${quiz.description}`);
      console.log(`Created At: ${quiz.created_at}`);
    } else {
      console.log("❌ Quiz not found!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

checkQuizDuration();
