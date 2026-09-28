import Link from "next/link";

export default function Landing() {
  return (
    <main>
      <header className="landingNav">
        <Link className="brand" href="/">
          <span className="brandMark">L</span>Learnova
        </Link>
        <nav>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#about">About us</a>
        </nav>
        <div>
          <Link className="loginButton" href="/login">Log in</Link>
          <Link className="primaryButton small" href="/register">Get Started</Link>
        </div>
      </header>

      <section className="landingHero">
        <div>
          <span className="eyebrow">✦ AI-Assisted Platform</span>
          <h1><span>AI-Assisted</span> Guidance,<br/>Human Expertise,<br/>Real Impact.</h1>
          <p>
            Learnova connects you with verified specialists across multiple domains. Our AI assistant helps you discover the right guidance, specialists, and resources — while real experts provide the counselling and support you need.
          </p>
          <div className="heroActions">
            <Link className="primaryButton" href="/register">Get Started →</Link>
            <Link className="secondaryButton" href="/login">Explore Specialists</Link>
            <a className="demoLink" href="#how">▶ &nbsp; Watch Demo</a>
          </div>
          <div className="landingStats">
            <Stat n="500+" t="Verified Specialists" />
            <Stat n="10K+" t="Learners" />
            <Stat n="300+" t="Workshops" />
            <Stat n="98%" t="Satisfaction Rate" />
          </div>
        </div>
        <div className="landingArt">
          <div className="blob"></div>
          <div className="personArtBg"></div>
          <div className="aiBubble">
            <b>✦ AI Assistant</b>
            <strong>I recommend these<br/><span>specialists</span> for you</strong>
            <div>👩🏾 👨🏾 👩🏽 👨🏿 <small>+5</small></div>
          </div>
          <div className="artPill p1">◉ <b>Personalized</b><small>Recommendations</small></div>
          <div className="artPill p2">♙ <b>Verified</b><small>Specialists</small></div>
          <div className="artPill p3">□ <b>Book Appointments</b><small>Easily</small></div>
          <div className="artPill p4">▣ <b>Chat & Video</b><small>Consultations</small></div>
        </div>
      </section>

      <section className="landingFeatures" id="features">
        <Info
          icon="✦"
          title="AI-Assisted Recommendations"
          text="Our AI analyzes your interests and goals to recommend the best specialists, workshops, and resources."
        />
        <Info
          icon="♙"
          title="Human Experts Provide Guidance"
          text="Connect with verified specialists who provide real counselling through appointments, chats, and video sessions."
        />
        <Info
          icon="◇"
          title="Safe, Secure & Reliable"
          text="Your data is protected. We ensure quality through strict document verification, reviews, and secure sessions."
        />
      </section>

      <section className="simpleSection" id="how">
        <span>HOW LEARNOVA WORKS</span>
        <h2>AI assists. Specialists guide.</h2>
        <p>Tell us what you need → discover suitable specialists → book from the specialist profile → receive professional guidance.</p>
      </section>

      {/* ABOUT US SECTION */}
      <section className="aboutSection" id="about">
        <div className="aboutHeader">
          <span className="eyebrow">About Learnova</span>
          <h2>Empowering Growth Through Intelligence & Expertise</h2>
          <p className="aboutSub">
            Learnova was founded on a simple yet transformative premise: combining intelligent AI discovery with authenticated human mastery to deliver personalized, accessible counselling worldwide.
          </p>
        </div>

        <div className="aboutGrid">
          <div className="aboutCard">
            <div className="aboutIcon">🎯</div>
            <h3>Our Mission</h3>
            <p>
              To democratize access to high-caliber professional guidance, academic counselling, career mentorship, and life coaching by connecting learners with vetted specialists.
            </p>
          </div>
          <div className="aboutCard">
            <div className="aboutIcon">🛡️</div>
            <h3>Strict Document Verification</h3>
            <p>
              Every specialist on Learnova submits accredited certificates, diplomas, and licenses. Our admin team manually audits each document before granting verified status.
            </p>
          </div>
          <div className="aboutCard">
            <div className="aboutIcon">⚡</div>
            <h3>AI-Augmented Matching</h3>
            <p>
              Our recommendation algorithms analyze goals and learning patterns to pinpoint the most effective mentor, eliminating hours of searching.
            </p>
          </div>
        </div>

        <div className="aboutStory">
          <div>
            <h3>Built for Trust and Real Results</h3>
            <p>
              Whether you are a student choosing your academic direction, an entrepreneur launching a business, or an individual seeking mental wellbeing and personal development, Learnova provides the safe, verified space you deserve.
            </p>
            <div className="aboutPills">
              <span>✓ 100% Manual Document Audits</span>
              <span>✓ Private & Encrypted Consultations</span>
              <span>✓ Multi-Domain Support</span>
              <span>✓ Seamless Appointment Booking</span>
            </div>
          </div>
          <div className="aboutHighlightBox">
            <strong>100%</strong>
            <p>Admin-validated specialist credentials</p>
            <div className="divider" style={{ margin: "14px 0", opacity: 0.2 }}></div>
            <strong>24/7</strong>
            <p>AI discovery and smart scheduling</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footerGrid">
          <div>
            <div className="brand" style={{ color: "#ffffff", marginBottom: "12px" }}>
              <span className="brandMark">L</span>Learnova
            </div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", maxWidth: "300px" }}>
              AI-assisted platform connecting ambitious learners with verified human specialists for career, academic, and personal growth.
            </p>
          </div>
          <div>
            <h3>Platform</h3>
            <a href="#features">Features</a>
            <a href="#how">How it Works</a>
            <a href="#about">About Us</a>
            <Link href="/login">Login</Link>
          </div>
          <div>
            <h3>Domains</h3>
            <a href="#about">Career Guidance</a>
            <a href="#about">Academic Counselling</a>
            <a href="#about">Entrepreneurship</a>
            <a href="#about">Personal Development</a>
          </div>
          <div>
            <h3>Security & Trust</h3>
            <a href="#about">Specialist Verification</a>
            <a href="#about">Privacy Policy</a>
            <a href="#about">Terms of Service</a>
            <a href="#about">Admin Portal</a>
          </div>
        </div>
        <div className="container footerBottom">
          <p>© 2026 Learnova Platform. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

function Stat({ n, t }: { n: string; t: string }) {
  return (
    <div>
      <strong>{n}</strong>
      <small>{t}</small>
    </div>
  );
}

function Info({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <article>
      <i>{icon}</i>
      <div>
        <b>{title}</b>
        <p>{text}</p>
      </div>
    </article>
  );
}

