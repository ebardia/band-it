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
      {/* Fixed close button */}
      <button
        onClick={() => router.back()}
        className="fixed top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Main content */}
      <main className="flex-1">
        <Container size="md" className="py-12">
          <Card>
          <Stack spacing="lg">
            <div>
              <Heading level={1}>BAND IT — TERMS OF SERVICE</Heading>
              <Text color="muted" className="mt-2">Last updated: January 20, 2026</Text>
            </div>

            <Text>
              Welcome to BAND IT ("Band It", "the Platform", "we", "us").
            </Text>
            <Text>
              BAND IT provides infrastructure for people to organize, coordinate, and execute work together transparently. By accessing or using BAND IT, you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Platform.
            </Text>

            <section>
              <Heading level={2} className="mb-3">1. Acceptance of These Terms</Heading>
              <Text className="mb-2">
                By creating an account, joining a band, or otherwise using BAND IT, you agree to be bound by these Terms.
              </Text>
              <Text className="mb-2">You represent that you are either:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700">
                <li>at least 18 years old and legally able to enter into this agreement, or</li>
                <li>a minor using the Platform with the consent and supervision of a parent or legal guardian who agrees to be bound by these Terms on your behalf.</li>
              </ul>
              <Text className="mt-2">
                If you are using BAND IT on behalf of an organization or group, you represent that you have the authority to bind that entity to these Terms.
              </Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">2. What BAND IT Is — and Is Not</Heading>

              <Heading level={3} className="mb-2">What BAND IT Is</Heading>
              <Text className="mb-2">BAND IT is an infrastructure platform that provides tools for:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-4">
                <li>group organization and governance,</li>
                <li>discussion, proposals, projects, and task coordination,</li>
                <li>transparency through audit logs and records,</li>
                <li>fundraising and financial tracking at the band level.</li>
              </ul>

              <Heading level={3} className="mb-2">What BAND IT Is Not</Heading>
              <Text className="mb-2">BAND IT does not:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>run or manage bands,</li>
                <li>control or approve band decisions,</li>
                <li>verify the truth or accuracy of band claims,</li>
                <li>endorse any mission, agenda, or outcome.</li>
              </ul>
              <Text>Each band operates independently. Responsibility for actions rests with the people involved.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">3. Accounts & Identity</Heading>
              <Text className="mb-2">To use BAND IT, you must:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>provide accurate and truthful information,</li>
                <li>maintain the security of your account,</li>
                <li>use only one account per individual unless explicitly authorized.</li>
              </ul>
              <Text className="mb-2">Certain features may require identity verification. Failure to verify may restrict access.</Text>
              <Text className="mb-2">Parents or legal guardians who permit a minor to use BAND IT accept responsibility for the minor's activity on the Platform.</Text>
              <Text>You are responsible for all actions taken under your account.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">4. Minors & Family Participation</Heading>
              <Text className="mb-2">BAND IT is designed to support family-friendly, educational, and community-based participation.</Text>
              <Text className="mb-2">Minors may participate in bands or activities only with the consent of a parent or legal guardian. By allowing a minor to use BAND IT, the parent or legal guardian:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>agrees to these Terms on the minor's behalf,</li>
                <li>accepts responsibility for the minor's activity, and</li>
                <li>acknowledges that BAND IT does not provide supervision, monitoring, or oversight.</li>
              </ul>
              <Text>BAND IT does not knowingly collect personal data from minors beyond what is necessary to operate the Platform.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">5. Bands & Governance Disclaimer</Heading>
              <Text className="mb-2">Bands are created, governed, and operated by their members.</Text>
              <Text className="mb-2">BAND IT:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700">
                <li>does not participate in band governance,</li>
                <li>does not resolve internal disputes,</li>
                <li>does not override band decisions.</li>
              </ul>
              <Text className="mt-2">Governance outcomes reflect human decisions made within each band.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">6. Content & Conduct</Heading>
              <Text className="mb-2">Users are responsible for all content they post or share.</Text>
              <Text className="mb-2">You agree not to:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>engage in illegal activity,</li>
                <li>post deceptive, abusive, or harmful content,</li>
                <li>impersonate others or misrepresent affiliations,</li>
                <li>use the Platform for scams, spam, or manipulation.</li>
              </ul>
              <Text>BAND IT may remove content or restrict access to protect the Platform and its users.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">7. Financial Disclaimer</Heading>
              <Text className="mb-2">BAND IT is not a financial institution.</Text>
              <Text className="mb-2">BAND IT is not responsible for:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>fundraising activities,</li>
                <li>donations or dues,</li>
                <li>sale of goods or merchandise,</li>
                <li>reimbursements or compensation,</li>
                <li>financial mismanagement or fraud.</li>
              </ul>
              <Text>All financial activity occurs between bands, members, donors, and vendors. Participation is at your own risk.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">8. Vendors & Third Parties</Heading>
              <Text className="mb-2">Vendors engaged through BAND IT are independent third parties.</Text>
              <Text className="mb-2">BAND IT:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700">
                <li>does not guarantee vendor performance,</li>
                <li>is not liable for vendor actions or failures,</li>
                <li>does not mediate disputes unless explicitly stated.</li>
              </ul>
            </section>

            <section>
              <Heading level={2} className="mb-3">9. AI Disclaimer</Heading>
              <Text className="mb-2">BAND IT may provide AI-assisted tools to support users.</Text>
              <Text className="mb-2">AI tools:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>provide advisory assistance only,</li>
                <li>do not make decisions,</li>
                <li>do not approve actions or funds,</li>
                <li>do not replace human judgment.</li>
              </ul>
              <Text>BAND IT is not responsible for actions taken based on AI suggestions.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">10. Transparency & Audit Limits</Heading>
              <Text className="mb-2">Audit logs and records:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>reflect recorded activity,</li>
                <li>do not verify intent or truth,</li>
                <li>do not imply endorsement.</li>
              </ul>
              <Text>Transparency does not equal validation.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">11. Suspension & Termination</Heading>
              <Text className="mb-2">BAND IT may suspend or terminate access:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>for violations of these Terms,</li>
                <li>for illegal or harmful conduct,</li>
                <li>to protect platform integrity.</li>
              </ul>
              <Text>Termination may result in loss of access to content and participation rights.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">12. Limitation of Liability</Heading>
              <Text className="mb-2">BAND IT is provided "as is" and "as available."</Text>
              <Text className="mb-2">To the maximum extent permitted by law:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700">
                <li>all warranties are disclaimed,</li>
                <li>BAND IT is not liable for indirect or consequential damages,</li>
                <li>total liability is limited to amounts paid to BAND IT in the prior 12 months, if any.</li>
              </ul>
            </section>

            <section>
              <Heading level={2} className="mb-3">13. Indemnification</Heading>
              <Text className="mb-2">You agree to indemnify and hold harmless BAND IT from claims arising out of:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700">
                <li>your use of the Platform,</li>
                <li>band activities you participate in,</li>
                <li>financial or contractual disputes,</li>
                <li>violations of law or third-party rights.</li>
              </ul>
            </section>

            <section>
              <Heading level={2} className="mb-3">14. Governing Law & Jurisdiction</Heading>
              <Text className="mb-2">These Terms are governed by the laws of the Commonwealth of Virginia, USA, without regard to conflict-of-law principles.</Text>
              <Text>Any disputes shall be resolved in state or federal courts located in Virginia.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">15. Legal Notices</Heading>
              <Text className="mb-2">Legal notices regarding these Terms may be sent to:</Text>
              <Text className="font-medium mb-2">legal@banditeco.com</Text>
              <Text>This address is intended for formal legal communications only. Submission of a message does not create any obligation to respond.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">16. Changes to These Terms</Heading>
              <Text className="mb-2">We may update these Terms from time to time.</Text>
              <Text>Continued use of BAND IT after changes take effect constitutes acceptance of the revised Terms.</Text>
            </section>
          </Stack>
        </Card>
        </Container>
      </main>
    </div>
  )
}
