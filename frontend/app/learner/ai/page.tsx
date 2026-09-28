export const metadata = {
  title: "AI Assistant | Learnova",
};

import AiChat from "@/components/ai/AiChat";

export default function LearnerAiPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <AiChat role="learner" />
    </div>
  );
}
