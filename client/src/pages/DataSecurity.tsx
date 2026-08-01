import { PHNav } from "@/components/PHNav";
import { PHFooter } from "@/components/PHFooter";

export default function DataSecurity() {
  return (
    <div className="min-h-screen" style={{ background: "var(--lw-navy, #0a1628)", color: "rgba(255,255,255,0.85)" }}>
      <PHNav />

      <main className="max-w-3xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-12">
          <p
            className="mb-3 tracking-widest uppercase"
            style={{ fontSize: "0.72rem", color: "var(--gold)", letterSpacing: "0.15em" }}
          >
            Pennington Hennessy — Lifework Career Analysis
          </p>
          <h1
            className="mb-2 font-light tracking-wide"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: "#fff" }}
          >
            Data Security &amp; Privacy Policy
          </h1>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>Last updated: April 2026</p>
        </div>

        <div className="space-y-10" style={{ lineHeight: 1.85, fontSize: "0.92rem" }}>

          {/* Introduction */}
          <section>
            <p style={{ color: "rgba(255,255,255,0.7)" }}>
              Lifework is a structured career analysis programme that asks you to reflect on your life history, values,
              personality, and professional aspirations. We recognise that the information you share is personal,
              sensitive, and deserving of the highest standard of care. This document explains, in plain terms, how your
              data is stored, who can access it, what happens when it is processed by artificial intelligence, and what
              rights you hold over it.
            </p>
            <p className="mt-4" style={{ color: "rgba(255,255,255,0.7)" }}>
              We are committed not only to taking data security seriously, but to being transparent about every layer of
              the system so that you can make an informed decision about participating.
            </p>
          </section>

          <Divider />

          {/* 1. What data we collect */}
          <section>
            <SectionHeading number="1" title="What data we collect" />
            <p className="mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
              Lifework collects the following categories of information during the programme:
            </p>
            <PolicyTable
              rows={[
                ["Identity and contact", "Name, email address, login credentials"],
                ["Life history narrative", "Career timeline, formative experiences, background interview responses"],
                ["Psychometric responses", "VIA Character Strengths survey answers, IPIP personality inventory responses"],
                ["AI-generated analysis", "Career themes, strengths summaries, and coaching insights generated from your inputs"],
                ["Technical usage data", "Login timestamps, browser type, IP address (used for security purposes only)"],
              ]}
            />
            <p className="mt-6" style={{ color: "rgba(255,255,255,0.7)" }}>
              We do not collect payment card data, health records, or any information beyond what is directly relevant
              to the career analysis programme.
            </p>
          </section>

          <Divider />

          {/* 2. How your data is stored */}
          <section>
            <SectionHeading number="2" title="How your data is stored" />
            <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
              Your data is stored in a managed cloud database provided by <strong style={{ color: "#fff" }}>Manus</strong>{" "}
              (operated by Butterfly Effect Pte. Ltd., headquartered in Singapore). Manus is the platform on which
              Lifework is built and hosted.
            </p>
            <PolicyPoint title="Encryption">
              All data is transmitted over HTTPS (TLS 1.2 or higher), meaning it is encrypted in transit between your
              browser and our servers. Data at rest in the database is encrypted using industry-standard AES-256
              encryption.
            </PolicyPoint>
            <PolicyPoint title="Access controls">
              Your data is accessible only to you (via your authenticated account) and to Pennington Hennessy as the
              programme operator. No other party has routine access to your individual responses.
            </PolicyPoint>
            <PolicyPoint title="Data residency">
              Manus infrastructure may operate across multiple regions, including Singapore and the United States. Manus
              has appointed a Data Protection Officer and EU/UK GDPR representatives (EDPO, Brussels and London) to
              handle cross-border data transfer obligations.{" "}
              <Footnote href="https://manus.im/privacy" label="Manus Privacy Policy" />
            </PolicyPoint>
          </section>

          <Divider />

          {/* 3. AI and Anthropic */}
          <section>
            <SectionHeading number="3" title="How the AI component works — and what Anthropic does with your data" />
            <p className="mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
              Lifework uses AI (specifically, Anthropic's Claude model) to analyse your survey responses and generate
              personalised career insights. This is the part of the system that clients most often ask about, and the
              answer is unambiguous.
            </p>

            <h3 className="mb-3 font-medium" style={{ fontSize: "1rem", color: "var(--gold)" }}>
              Anthropic does not train its AI on your data
            </h3>
            <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
              Anthropic's Commercial Terms of Service state explicitly:
            </p>
            <blockquote
              className="my-4 pl-5 italic"
              style={{
                borderLeft: "3px solid var(--gold)",
                color: "rgba(255,255,255,0.65)",
                fontSize: "0.95rem",
              }}
            >
              "Anthropic may not train models on Customer Content from Services."
            </blockquote>
            <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
              This is a contractual commitment, not merely a policy preference. Because Lifework accesses Claude through
              the Anthropic commercial API, your inputs and the AI's outputs are classified as{" "}
              <strong style={{ color: "#fff" }}>Customer Content</strong> — and Anthropic is contractually prohibited
              from using that content to train or improve its models.{" "}
              <Footnote href="https://www.anthropic.com/legal/commercial-terms" label="Anthropic Commercial Terms" />
            </p>
            <p className="mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
              This is distinct from Anthropic's consumer products (Claude.ai Free, Pro, and Max plans), where users may
              choose whether to allow their conversations to be used for training. The commercial API — which is what
              Lifework uses — carries an unconditional no-training commitment regardless of any user preference
              settings.{" "}
              <Footnote
                href="https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training"
                label="Anthropic Privacy Center"
              />
            </p>

            <h3 className="mb-3 font-medium" style={{ fontSize: "1rem", color: "var(--gold)" }}>
              What Anthropic does do with your data
            </h3>
            <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
              When your responses are sent to the Anthropic API for analysis, Anthropic processes them as a data
              processor acting on Pennington Hennessy's behalf. In this role, Anthropic processes your inputs to
              generate AI responses and then discards the session data. It may retain data temporarily for security
              monitoring, abuse detection, and legal compliance, but does not combine your data with other users' data
              for any commercial purpose, and does not sell or share your data with third parties for advertising or
              marketing.
            </p>

            <h3 className="mb-3 font-medium" style={{ fontSize: "1rem", color: "var(--gold)" }}>
              How the AI analysis is used
            </h3>
            <p style={{ color: "rgba(255,255,255,0.7)" }}>
              The AI-generated insights produced from your survey responses are stored in the Lifework database and are
              visible to you and to your Pennington Hennessy coach. They are used solely for the purpose of the career
              analysis programme and are not shared with any third party, including prospective employers, without your
              explicit consent.
            </p>
          </section>

          <Divider />

          {/* 4. Manus platform security */}
          <section>
            <SectionHeading number="4" title="Manus platform security" />
            <PolicyPoint title="Technical safeguards">
              Manus employs technical, organisational, and physical safeguards designed to protect personal information.
              These include encrypted data transmission, access-controlled infrastructure, and regular security
              procedures.
            </PolicyPoint>
            <PolicyPoint title="GDPR compliance">
              Manus has appointed a Data Protection Officer and has designated EDPO as its EU and UK GDPR
              representative. For users in the United Kingdom and European Economic Area, Manus processes personal data
              in accordance with the UK GDPR and EU GDPR respectively, relying on contractual necessity and legitimate
              interests as its legal bases.
            </PolicyPoint>
            <PolicyPoint title="Data subject rights">
              You may contact Manus directly at{" "}
              <a href="mailto:privacy@manus.im" style={{ color: "var(--gold)" }}>
                privacy@manus.im
              </a>{" "}
              to exercise your rights of access, correction, deletion, or portability in respect of data held on the
              platform.
            </PolicyPoint>
          </section>

          <Divider />

          {/* 5. Your rights */}
          <section>
            <SectionHeading number="5" title="Your rights" />
            <p className="mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
              As a Lifework participant, you hold the following rights over your personal data:
            </p>
            <PolicyTable
              rows={[
                ["Access", "You may request a copy of all personal data we hold about you"],
                ["Correction", "You may ask us to correct any inaccurate information"],
                ["Deletion", "You may request that your account and all associated data be deleted"],
                ["Portability", "You may request your data in a machine-readable format"],
                ["Objection", "You may object to any processing you believe is not justified"],
                ["Withdrawal of consent", "You may withdraw from the programme at any time"],
              ]}
            />
            <p className="mt-6" style={{ color: "rgba(255,255,255,0.7)" }}>
              To exercise any of these rights, contact Pennington Hennessy directly at the email address provided in
              your programme welcome communication. We will respond within 30 days.
            </p>
            <p className="mt-4" style={{ color: "rgba(255,255,255,0.7)" }}>
              If you are located in the United Kingdom, you also have the right to lodge a complaint with the{" "}
              <strong style={{ color: "#fff" }}>Information Commissioner's Office (ICO)</strong> at{" "}
              <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>
                ico.org.uk
              </a>
              .
            </p>
          </section>

          <Divider />

          {/* 6. Data retention */}
          <section>
            <SectionHeading number="6" title="Data retention" />
            <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
              We retain your Lifework data for the duration of your engagement with Pennington Hennessy and for a period
              of <strong style={{ color: "#fff" }}>two years</strong> thereafter, to allow for follow-up coaching
              conversations and longitudinal career reflection. At the end of this period, or upon your written request,
              all personal data will be permanently deleted from the database.
            </p>
            <p style={{ color: "rgba(255,255,255,0.7)" }}>
              AI session data processed by Anthropic is not retained by Anthropic beyond the immediate processing
              session (except where required for security or legal compliance, as described above).
            </p>
          </section>

          <Divider />

          {/* 7. What we do not do */}
          <section>
            <SectionHeading number="7" title="What we do not do" />
            <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
              To be explicit about the boundaries of our data use:
            </p>
            <ul className="space-y-2" style={{ color: "rgba(255,255,255,0.7)" }}>
              {[
                "We do not sell your data to any third party.",
                "We do not share your data with prospective employers or recruitment firms without your explicit written consent.",
                "We do not use your data for advertising or marketing purposes.",
                "We do not allow Anthropic or Manus to use your data to train AI models.",
                "We do not store your data outside of the Manus platform infrastructure described in this document.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span style={{ color: "var(--gold)", flexShrink: 0 }}>—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <Divider />

          {/* 8. Contact */}
          <section>
            <SectionHeading number="8" title="Questions and contact" />
            <p className="mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
              If you have any questions about this policy, or wish to exercise your data rights, please contact:
            </p>
            <div className="space-y-4">
              <ContactBlock
                title="Pennington Hennessy"
                lines={[
                  { label: "Email", value: "jamie@penningtonhennessy.com", href: "mailto:jamie@penningtonhennessy.com" },
                  { label: "Website", value: "penningtonhennessy.com", href: "https://www.penningtonhennessy.com" },
                ]}
              />
              <ContactBlock
                title="Manus (Butterfly Effect Pte. Ltd.) — platform enquiries"
                lines={[{ label: "Email", value: "privacy@manus.im", href: "mailto:privacy@manus.im" }]}
              />
              <ContactBlock
                title="Anthropic — AI processing enquiries"
                lines={[{ label: "Email", value: "privacy@anthropic.com", href: "mailto:privacy@anthropic.com" }]}
              />
            </div>
          </section>

          <Divider />

          {/* References */}
          <section>
            <h2 className="mb-4 font-light tracking-wide" style={{ fontSize: "1.1rem", color: "#fff" }}>
              References
            </h2>
            <ol className="space-y-2" style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)" }}>
              <li>
                Manus Privacy Policy (Butterfly Effect Pte. Ltd.) —{" "}
                <a href="https://manus.im/privacy" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>
                  manus.im/privacy
                </a>
              </li>
              <li>
                Anthropic Commercial Terms of Service (effective June 17, 2025) —{" "}
                <a href="https://www.anthropic.com/legal/commercial-terms" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>
                  anthropic.com/legal/commercial-terms
                </a>
              </li>
              <li>
                Anthropic Privacy Center — "Is my data used for model training?" —{" "}
                <a
                  href="https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--gold)" }}
                >
                  privacy.claude.com
                </a>
              </li>
            </ol>
          </section>
        </div>
      </main>

      <PHFooter />
    </div>
  );
}

/* ── Sub-components ── */

function Divider() {
  return <hr style={{ borderColor: "rgba(201,151,58,0.15)" }} />;
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <h2 className="mb-5 font-light tracking-wide" style={{ fontSize: "1.25rem", color: "#fff" }}>
      <span style={{ color: "var(--gold)", marginRight: "0.5rem" }}>{number}.</span>
      {title}
    </h2>
  );
}

function PolicyPoint({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <span style={{ color: "#fff", fontWeight: 500 }}>{title}. </span>
      <span style={{ color: "rgba(255,255,255,0.7)" }}>{children}</span>
    </div>
  );
}

function PolicyTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="overflow-x-auto rounded" style={{ border: "1px solid rgba(201,151,58,0.15)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(201,151,58,0.1)" : "none" }}>
              <td
                style={{
                  padding: "0.75rem 1rem",
                  color: "#fff",
                  fontWeight: 500,
                  width: "35%",
                  verticalAlign: "top",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                {label}
              </td>
              <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.65)", verticalAlign: "top" }}>
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Footnote({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{ fontSize: "0.78rem", color: "var(--gold)", verticalAlign: "super" }}
      title={label}
    >
      ↗
    </a>
  );
}

function ContactBlock({
  title,
  lines,
}: {
  title: string;
  lines: { label: string; value: string; href: string }[];
}) {
  return (
    <div
      className="rounded p-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,151,58,0.12)" }}
    >
      <p className="mb-2 font-medium" style={{ color: "#fff", fontSize: "0.88rem" }}>
        {title}
      </p>
      {lines.map(({ label, value, href }) => (
        <p key={label} style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.55)" }}>
          {label}:{" "}
          <a href={href} style={{ color: "var(--gold)" }}>
            {value}
          </a>
        </p>
      ))}
    </div>
  );
}
