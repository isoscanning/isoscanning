import { VisorShell } from "@/components/visor/shell"
import { LensHero } from "@/components/home/lens-hero"
import {
  FinalSection,
  FinanceSection,
  PlatformSection,
  ProblemSection,
  ProsSection,
  StepsSection,
  TrialSection,
} from "@/components/home/sections"

export default function HomePage() {
  return (
    <VisorShell>
      <LensHero />
      <ProblemSection />
      <PlatformSection />
      <FinanceSection />
      <ProsSection />
      <StepsSection />
      <TrialSection />
      <FinalSection />
    </VisorShell>
  )
}
