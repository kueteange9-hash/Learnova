import LearnerShell from "@/components/learner/LearnerShell";

export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return <LearnerShell>{children}</LearnerShell>;
}
