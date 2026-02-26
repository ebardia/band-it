'use client'

import { useRouter } from 'next/navigation'
import {
  Container,
  Card,
  Heading,
  Text,
  Stack,
} from '@/components/ui'

export default function PrivacyPage() {
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
              <Heading level={1}>BAND IT — PRIVACY POLICY</Heading>
              <Text color="muted" className="mt-2">Last updated: January 20, 2026</Text>
            </div>

            <Text>
              BAND IT ("BAND IT", "the Platform", "we", "us") is built around transparency, accountability, and restraint. This Privacy Policy explains what information we collect, how we use it, and the limits we place on ourselves.
            </Text>
            <Text>
              If you use BAND IT, you agree to this Privacy Policy.
            </Text>

            <section>
              <Heading level={2} className="mb-3">1. Guiding Principles</Heading>
              <Text className="mb-2">BAND IT is designed to:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>collect the minimum data necessary to operate,</li>
                <li>never sell personal data,</li>
                <li>never use personal data for advertising,</li>
                <li>never obscure how data is used.</li>
              </ul>
              <Text>Transparency applies not only to bands, but to the platform itself.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">2. Information We Collect</Heading>

              <Heading level={3} className="mb-2">2.1 Information You Provide</Heading>
              <Text className="mb-2">We may collect information you choose to provide, including:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-4">
                <li>name or display name,</li>
                <li>email address,</li>
                <li>account credentials,</li>
                <li>band participation details,</li>
                <li>content you submit (messages, posts, documents).</li>
              </ul>
              <Text className="mb-4">Certain features may require identity verification. In such cases, verification data is used only to confirm identity and eligibility.</Text>

              <Heading level={3} className="mb-2">2.2 Automatically Collected Information</Heading>
              <Text className="mb-2">We may collect limited technical information necessary to operate the platform, such as:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>IP address,</li>
                <li>device and browser type,</li>
                <li>timestamps and usage events.</li>
              </ul>
              <Text className="mb-2">This data is used for:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>security,</li>
                <li>reliability,</li>
                <li>auditability,</li>
                <li>abuse prevention.</li>
              </ul>
              <Text>We do not use tracking cookies for advertising or profiling.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">3. Minors' Information</Heading>
              <Text className="mb-2">BAND IT supports family-friendly and educational participation.</Text>
              <Text className="mb-2">Minors may use the Platform only with the consent of a parent or legal guardian.</Text>
              <Text>We do not knowingly collect personal data from minors beyond what is required to operate the Platform. Parents or guardians remain responsible for a minor's participation and activity.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">4. How We Use Information</Heading>
              <Text className="mb-2">We use collected information to:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-4">
                <li>operate and maintain the Platform,</li>
                <li>enable band participation and governance,</li>
                <li>maintain audit logs and transparency,</li>
                <li>detect abuse or fraud,</li>
                <li>provide system-level support and improvements.</li>
              </ul>
              <Text className="mb-2">We do not:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700">
                <li>sell personal data,</li>
                <li>rent personal data,</li>
                <li>use personal data for targeted advertising,</li>
                <li>infer private beliefs or intentions.</li>
              </ul>
            </section>

            <section>
              <Heading level={2} className="mb-3">5. Transparency, Audit Logs, and Visibility</Heading>
              <Text className="mb-2">Certain actions on BAND IT are intentionally visible to support transparency, including:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>band membership changes,</li>
                <li>governance decisions,</li>
                <li>project and task activity,</li>
                <li>financial summaries at the band level.</li>
              </ul>
              <Text>Audit logs reflect actions taken on the Platform. They do not imply endorsement or validation.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">6. Financial Information</Heading>
              <Text className="mb-2">BAND IT is not a financial institution.</Text>
              <Text className="mb-2">Any financial data displayed on the Platform:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>is entered or generated by bands and their participants,</li>
                <li>is used for transparency and tracking,</li>
                <li>remains the responsibility of the band.</li>
              </ul>
              <Text>BAND IT does not process or store payment card details directly unless explicitly stated.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">7. AI Usage</Heading>
              <Text className="mb-2">BAND IT may use AI-assisted tools to:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-4">
                <li>analyze patterns,</li>
                <li>provide suggestions,</li>
                <li>highlight risks or inconsistencies.</li>
              </ul>
              <Text className="mb-2">AI tools do not:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>make decisions,</li>
                <li>act autonomously,</li>
                <li>access personal data beyond what is necessary to provide assistance.</li>
              </ul>
              <Text>AI usage may be logged for transparency and accountability.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">8. Data Sharing</Heading>
              <Text className="mb-2">We do not share personal data with third parties except:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>when required by law,</li>
                <li>to comply with legal process,</li>
                <li>to protect the security or integrity of the Platform,</li>
                <li>when explicitly authorized by the user.</li>
              </ul>
              <Text>BAND IT does not participate in data brokerage or advertising networks.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">9. Data Retention</Heading>
              <Text className="mb-2">We retain information only as long as necessary to:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>operate the Platform,</li>
                <li>maintain audit integrity,</li>
                <li>meet legal or compliance obligations.</li>
              </ul>
              <Text>Some audit and governance records may be retained for transparency even after account closure, with personal identifiers minimized where appropriate.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">10. Data Security</Heading>
              <Text className="mb-2">We take reasonable technical and organizational measures to protect information, including:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>access controls,</li>
                <li>encryption where appropriate,</li>
                <li>monitoring for unauthorized access.</li>
              </ul>
              <Text>No system is perfectly secure. Use of BAND IT is at your own risk.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">11. Your Rights</Heading>
              <Text className="mb-2">Depending on your jurisdiction, you may have the right to:</Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                <li>access your personal data,</li>
                <li>request correction,</li>
                <li>request deletion where appropriate,</li>
                <li>restrict certain uses.</li>
              </ul>
              <Text>Requests may be limited where data is required for transparency, auditability, or legal obligations.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">12. International Use</Heading>
              <Text className="mb-2">BAND IT operates globally. Your information may be processed in jurisdictions different from your own.</Text>
              <Text>By using the Platform, you consent to such processing consistent with this Privacy Policy.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">13. Changes to This Policy</Heading>
              <Text className="mb-2">We may update this Privacy Policy from time to time.</Text>
              <Text>Continued use of BAND IT after changes take effect constitutes acceptance of the revised policy.</Text>
            </section>

            <section>
              <Heading level={2} className="mb-3">14. Legal Notices</Heading>
              <Text className="mb-2">Formal privacy-related legal notices may be sent to:</Text>
              <Text className="font-medium mb-2">legal@banditeco.com</Text>
              <Text>This address is intended for legal communications only. Submission of a message does not create any obligation to respond.</Text>
            </section>
          </Stack>
        </Card>
        </Container>
      </main>
    </div>
  )
}
