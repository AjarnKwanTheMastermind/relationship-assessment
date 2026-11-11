import Quiz from "@/components/Quiz";
import { getPublicQuestionSet } from "@/lib/settings";

// Built as a static page. Saving a new version of the questions clears the settings cache and revalidates it.
export default async function QuizPage() {
  const { version, questions } = await getPublicQuestionSet();
  return <Quiz version={version} questions={questions} />;
}
