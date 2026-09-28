export const metadata = {
  title: "AI Assistant | Learnova",
};

import AiChat from "@/components/ai/AiChat";

export default function SpecialistAiPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <AiChat role="specialist" />
    </div>
  );
}
