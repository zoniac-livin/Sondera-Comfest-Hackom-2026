import { ArrowRight, FileSearch, LockKeyhole, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Stepper, type JourneyStep } from "@/components/ui/stepper";

const steps: JourneyStep[] = [
  { name: "Submit", detail: "Share a message or claim" },
  { name: "Inspect", detail: "Review observed indicators" },
  { name: "Investigate", detail: "Look for missing proof" },
  { name: "Decide & document", detail: "Record your reasoning" },
];

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#home" aria-label="Sondera home">SONDERA<span className="wordmark-mark">/</span></a>
        <div className="case-ref"><span className="status-dot" /> PRIVATE WORKSPACE <span className="case-number">CASE 0001</span></div>
      </header>

      <main id="home">
        <section className="intro" aria-labelledby="page-title">
          <div className="eyebrow"><span className="eyebrow-rule" /> A CLEARER WAY TO CHECK</div>
          <h1 id="page-title">Know what you know.<br /><span>Find what you don’t.</span></h1>
          <p className="intro-copy">Examine a message or online claim with clear, local checks. See what was observed, what remains unknown, and what to check next.</p>
        </section>

        <section className="workspace" aria-label="Investigation workspace">
          <div className="workspace-heading">
            <div><span className="section-kicker">INVESTIGATION FILE</span><h2>Start with what you have</h2></div>
            <span className="file-tag">NO. 0001 <FileSearch size={15} /></span>
          </div>
          <Stepper steps={steps} activeIndex={activeStep} />
          <div className="panel-placeholder">
            <span className="panel-icon"><ShieldAlert size={20} /></span>
            <div className="panel-content">
              <div className="panel-kicker">STEP 0{activeStep + 1} / 04</div>
              <h3>{steps[activeStep].name}</h3>
              <p>{activeStep === 0 ? "Paste a message, link, or claim to begin a private investigation." : "This part of the investigation will be available in a later build phase."}</p>
              {activeStep === 0 && <button className="primary-button" onClick={() => setActiveStep(1)}>Open investigation <ArrowRight size={17} /></button>}
              {activeStep > 0 && <button className="text-button" onClick={() => setActiveStep(0)}>Back to submit</button>}
            </div>
          </div>
          <div className="privacy-line"><LockKeyhole size={15} /><span>Your content stays in your browser. Sondera does not send it anywhere.</span></div>
        </section>

        <aside className="limitation" aria-label="Important limitation">
          <span className="limitation-marker">!</span>
          <p><strong>A note on these checks</strong><br />Automated checks can miss threats and can flag legitimate content. Findings are indicators to consider, not a verdict.</p>
        </aside>
      </main>

      <footer className="footer"><span>SONDERA / HACKCOM ’26</span><span>LOCAL BY DESIGN <span className="footer-dot">·</span> EXPLAINABLE BY DEFAULT</span></footer>
    </div>
  );
}
