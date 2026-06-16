'use client'

import { useRouter } from 'next/navigation'
import {
  Container,
  Card,
  Heading,
  Text,
  Stack,
} from '@/components/ui'

export default function TermsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      <button
        onClick={() => router.back()}
        className="fixed top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <main className="flex-1">
        <Container size="md" className="py-12">
          <Card>
            <Stack spacing="lg">
              <div>
                <Heading level={1}>CAT BOT ADOPTION AGENCY — TERMS OF SERVICE</Heading>
                <Text color="muted" className="mt-2">Last updated: June 1, 2026</Text>
              </div>

              <Text>
                Welcome to Cat Bot Adoption Agency (&quot;Cat Bot Adoption Agency&quot;, &quot;the Platform&quot;, &quot;the Service&quot;, &quot;we&quot;, &quot;us&quot;). Cat Bot Adoption Agency provides software agents that gather and organize publicly available business intelligence to help agencies and other organizations identify and understand prospective clients. By accessing or using Cat Bot Adoption Agency, you agree to these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the Platform.
              </Text>

              <section>
                <Heading level={2} className="mb-3">1. Acceptance of These Terms</Heading>
                <Text className="mb-2">
                  By creating an account, joining an Agency workspace, or otherwise using Cat Bot Adoption Agency, you agree to be bound by these Terms. You represent that you are at least 18 years old, legally able to enter into this agreement, and using the Service for business or professional purposes. If you are using Cat Bot Adoption Agency on behalf of an organization, you represent that you have authority to bind that organization to these Terms, and &quot;you&quot; refers to that organization.
                </Text>
                <Text>
                  Cat Bot Adoption Agency is a business-to-business service and is not intended for personal, household, or minor use. We do not knowingly permit use by anyone under 18 years of age.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">2. What Cat Bot Adoption Agency Is — and Is Not</Heading>

                <Heading level={3} className="mb-2">What Cat Bot Adoption Agency Is</Heading>
                <Text className="mb-2">A software platform that provides tools to:</Text>
                <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-4">
                  <li>deploy automated agents (&quot;cats&quot;) that gather publicly available information about businesses and organizations,</li>
                  <li>organize that information into findings (&quot;catches&quot;),</li>
                  <li>configure, tune, and train agents to an Agency&apos;s preferences and subject-matter knowledge,</li>
                  <li>manage client workspaces, reporting, and feedback.</li>
                </ul>

                <Heading level={3} className="mb-2">What Cat Bot Adoption Agency Is Not</Heading>
                <Text className="mb-2">Cat Bot Adoption Agency does not:</Text>
                <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                  <li>guarantee the accuracy, completeness, or currency of any information surfaced,</li>
                  <li>verify the truth of third-party data sources,</li>
                  <li>make business, hiring, lending, leasing, or other decisions on your behalf,</li>
                  <li>provide legal, financial, or professional advice,</li>
                  <li>act as a &quot;consumer reporting agency&quot; or provide &quot;consumer reports&quot; as those terms are defined under the Fair Credit Reporting Act (FCRA) or any similar federal, state, or local law.</li>
                </ul>
                <Text>
                  Each Agency operates the Service independently. Responsibility for how the Service and its outputs are used rests with the people and organizations using it.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">3. Accounts & Identity</Heading>
                <Text className="mb-2">To use Cat Bot Adoption Agency, you must:</Text>
                <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                  <li>provide accurate and truthful information,</li>
                  <li>maintain the security of your account,</li>
                  <li>use only one account per individual unless explicitly authorized.</li>
                </ul>
                <Text>
                  Access is organized by Agency (the customer and billing entity) and Client (workspaces within an Agency). You are responsible for all activity under your account, for the users you invite into your Agency workspace, and for managing those users&apos; roles and access. Certain features may require identity or business verification; failure to verify may restrict access.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">4. Acceptable Use of the Service and Its Outputs</Heading>
                <Text className="mb-2">
                  This Section is a condition of use, not a formality. You agree that you will not use Cat Bot Adoption Agency, or any catch, finding, or data it produces:
                </Text>
                <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                  <li>to make or influence decisions about any individual&apos;s eligibility for credit, insurance, employment, housing, or any other purpose governed by the FCRA or equivalent laws;</li>
                  <li>to harass, stalk, surveil, intimidate, or harm any individual;</li>
                  <li>to violate any person&apos;s privacy or publicity rights, or any applicable data-protection law;</li>
                  <li>to access or attempt to access non-public, login-walled, or otherwise restricted sources, or in violation of any third-party website&apos;s or data source&apos;s terms of use;</li>
                  <li>to build a competing intelligence dataset or product, or to resell, sublicense, or redistribute raw data outside the scope expressly permitted by your subscription;</li>
                  <li>for any unlawful, deceptive, discriminatory, or abusive purpose.</li>
                </ul>
                <Text>
                  You are solely responsible for how you use the information the Service provides, including all outreach, communications, decisions, and actions you take based on it.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">5. Data, Sources & Third Parties</Heading>
                <Text className="mb-2">
                  Cat Bot Adoption Agency gathers information from publicly available sources. We do not represent or warrant that any information is accurate, current, complete, or lawfully usable for your particular purpose, and you are responsible for independently verifying any finding before relying on it.
                </Text>
                <Text>
                  Information about third parties — including businesses and individuals associated with them — surfaced through the Service is provided for your internal business use only, subject to the limits in Section 4. Your collection, storage, and use of that information must comply with all applicable laws, including privacy and data-protection laws. We may, at our discretion, remove, restrict, or decline to surface information from any source.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">6. Your Configuration and Trained Agents</Heading>
                <Text className="mb-2">
                  Cat Bot Adoption Agency allows you to configure and train agents using your own preferences, feedback, and subject-matter knowledge (&quot;Your Configuration&quot;). As between you and us, Your Configuration and the specific findings delivered to your workspace remain associated with your account and are not shared with other customers.
                </Text>
                <Text>
                  We may use aggregated, anonymized, and de-identified learnings to improve the Service generally, provided such learnings do not identify you, your clients, or your specific findings.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">7. Exclusivity (Where Applicable)</Heading>
                <Text className="mb-2">
                  Where your subscription includes exclusivity — for example, that a finding delivered to you will not be delivered to another customer, or that a defined territory is reserved to you — the scope and terms of that exclusivity are as stated in your order or subscription plan.
                </Text>
                <Text>
                  Exclusivity applies to delivery by us. It does not mean that information ceases to exist in public sources, that we restrict what public sources contain, or that other parties cannot independently discover the same information.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">8. Fees & Subscription</Heading>
                <Text>
                  Cat Bot Adoption Agency is provided on a subscription basis. Fees, billing cycle, and plan limits are as stated at the time of purchase. Subscriptions renew automatically unless cancelled in accordance with the applicable plan terms. Failure to pay may result in suspension or termination of access.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">9. AI & Automation Disclaimer</Heading>
                <Text className="mb-2">Cat Bot Adoption Agency uses automated agents and AI-assisted tools. These tools:</Text>
                <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                  <li>surface and organize publicly available information,</li>
                  <li>provide advisory assistance only,</li>
                  <li>do not make decisions, approve actions, or verify truth,</li>
                  <li>do not replace human judgment.</li>
                </ul>
                <Text>
                  You are responsible for reviewing and verifying any output before acting on it. We are not responsible for actions taken based on the Service&apos;s output.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">10. Content & Conduct</Heading>
                <Text className="mb-2">You are responsible for all content you upload and all actions you take through the Service. You agree not to:</Text>
                <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                  <li>engage in illegal activity,</li>
                  <li>post deceptive, abusive, or harmful content,</li>
                  <li>impersonate others or misrepresent affiliations,</li>
                  <li>attempt to circumvent access controls, tenant boundaries, or security measures,</li>
                  <li>use the Service for scams, spam, surveillance, or manipulation.</li>
                </ul>
                <Text>We may remove content or restrict access to protect the Platform and its users.</Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">11. Suspension & Termination</Heading>
                <Text className="mb-2">We may suspend or terminate access:</Text>
                <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                  <li>for violations of these Terms, including Section 4,</li>
                  <li>for illegal or harmful conduct,</li>
                  <li>to protect the integrity of the Platform.</li>
                </ul>
                <Text>
                  Termination may result in loss of access to your workspace, Your Configuration, content, and findings.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">12. Limitation of Liability</Heading>
                <Text className="mb-2">
                  Cat Bot Adoption Agency is provided &quot;as is&quot; and &quot;as available.&quot;
                </Text>
                <Text className="mb-2">To the maximum extent permitted by law:</Text>
                <ul className="list-disc ml-6 space-y-1 text-gray-700">
                  <li>all warranties, express or implied, are disclaimed,</li>
                  <li>we are not liable for indirect, incidental, special, or consequential damages,</li>
                  <li>our total liability is limited to the amounts you paid us in the twelve (12) months preceding the claim, if any.</li>
                </ul>
              </section>

              <section>
                <Heading level={2} className="mb-3">13. Indemnification</Heading>
                <Text className="mb-2">You agree to indemnify and hold harmless Cat Bot Adoption Agency from and against any claims arising out of:</Text>
                <ul className="list-disc ml-6 space-y-1 text-gray-700">
                  <li>your use of the Platform,</li>
                  <li>your use of any information the Service provides,</li>
                  <li>your outreach, communications, decisions, or actions,</li>
                  <li>your violation of Section 4,</li>
                  <li>your violation of any law or third-party right.</li>
                </ul>
              </section>

              <section>
                <Heading level={2} className="mb-3">14. Governing Law & Jurisdiction</Heading>
                <Text>
                  These Terms are governed by the laws of the Commonwealth of Virginia, USA, without regard to conflict-of-law principles. Any disputes shall be resolved in the state or federal courts located in Virginia.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">15. Legal Notices</Heading>
                <Text className="mb-2">Legal notices regarding these Terms may be sent to:</Text>
                <Text className="font-medium mb-2">legal@adoptacatbot.com</Text>
                <Text>
                  This address is intended for formal legal communications only. Submission of a message does not create any obligation to respond.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">16. Changes to These Terms</Heading>
                <Text>
                  We may update these Terms from time to time. Continued use of Cat Bot Adoption Agency after changes take effect constitutes acceptance of the revised Terms.
                </Text>
              </section>
            </Stack>
          </Card>
        </Container>
      </main>
    </div>
  )
}
