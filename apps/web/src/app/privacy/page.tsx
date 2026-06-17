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

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      <button
        onClick={handleClose}
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
                <Heading level={1}>CAT BOT ADOPTION AGENCY — PRIVACY POLICY</Heading>
                <Text color="muted" className="mt-2">Last updated: June 1, 2026</Text>
              </div>

              <Text>
                Cat Bot Adoption Agency (&quot;Cat Bot Adoption Agency&quot;, &quot;the Platform&quot;, &quot;the Service&quot;, &quot;we&quot;, &quot;us&quot;) provides software agents that gather and organize publicly available business intelligence. This Privacy Policy explains what information we collect, how we use it, and the limits we place on ourselves.
              </Text>

              <Text>
                This Policy addresses two distinct categories of information, which are treated differently:
              </Text>
              <ul className="list-disc ml-6 space-y-1 text-gray-700">
                <li>
                  <strong>Customer Information</strong> — information about the agencies, organizations, and individual users who hold accounts and use the Service.
                </li>
                <li>
                  <strong>Subject Information</strong> — information about third-party businesses and individuals associated with them that the Service gathers from publicly available sources on behalf of customers.
                </li>
              </ul>

              <Text>If you use Cat Bot Adoption Agency, you agree to this Privacy Policy.</Text>

              <section>
                <Heading level={2} className="mb-3">1. Guiding Principles</Heading>
                <Text className="mb-2">We aim to:</Text>
                <ul className="list-disc ml-6 space-y-1 text-gray-700">
                  <li>collect only what is necessary to operate the Service and deliver its function,</li>
                  <li>be transparent about how information is gathered and used,</li>
                  <li>gather Subject Information only from publicly available sources,</li>
                  <li>never use Customer Information for third-party advertising,</li>
                  <li>apply reasonable safeguards to all information we hold.</li>
                </ul>
              </section>

              <section>
                <Heading level={2} className="mb-3">2. Customer Information We Collect</Heading>

                <Heading level={3} className="mb-2">2.1 Information you provide</Heading>
                <Text className="mb-4">
                  Name or display name, email address, account credentials, organization and role details, billing information, and content or configuration you submit (preferences, feedback, subject-matter inputs used to train your agents).
                </Text>

                <Heading level={3} className="mb-2">2.2 Automatically collected information</Heading>
                <Text className="mb-4">
                  Limited technical information necessary to operate and secure the Service, such as IP address, device and browser type, timestamps, and usage events. Used for security, reliability, auditability, and abuse prevention. We do not use tracking cookies for third-party advertising or profiling.
                </Text>

                <Heading level={3} className="mb-2">2.3 Payment information</Heading>
                <Text>
                  Payment card details are processed by our third-party payment processor and are not stored directly by us unless explicitly stated.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">3. No Use by Minors</Heading>
                <Text>
                  Cat Bot Adoption Agency is a business-to-business service intended only for users aged 18 or older. We do not knowingly collect personal information from anyone under 18. If we learn that we have collected such information, we will delete it.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">4. Subject Information (Information About Third Parties)</Heading>
                <Text className="mb-2">
                  The Service gathers information about businesses and individuals associated with them from publicly available sources (for example, public records, business registries, permits and licenses, public web pages, and similar openly accessible sources). This information is organized into findings (&quot;catches&quot;) and made available to the customer for whom it was gathered.
                </Text>
                <Text className="mb-2">We commit to the following limits on Subject Information:</Text>
                <ul className="list-disc ml-6 space-y-1 text-gray-700 mb-2">
                  <li>it is gathered only from sources that are publicly available or otherwise lawful to access,</li>
                  <li>the Service does not access non-public, login-walled, or access-restricted sources,</li>
                  <li>it is provided to customers for internal business use, subject to the customer&apos;s obligations under our Terms of Service,</li>
                  <li>it is not used to build a general advertising or profiling product.</li>
                </ul>
                <Text>
                  We do not represent that Subject Information is accurate, complete, or current. Customers are responsible for verifying it and for using it lawfully.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">5. How We Use Information</Heading>
                <Text className="mb-2">
                  We use Customer Information to operate and maintain the Service, deliver and configure agents, process billing, provide support, detect abuse or fraud, and improve the Service.
                </Text>
                <Text className="mb-2">
                  We use Subject Information to deliver the Service&apos;s core function — gathering and organizing publicly available business intelligence and delivering findings to the customer for whom they were gathered.
                </Text>
                <Text className="mb-2">
                  We may use aggregated, anonymized, and de-identified information to improve the Service generally, provided it does not identify any customer, their clients, or their specific findings.
                </Text>
                <Text>
                  We do not use Customer Information for third-party advertising, and we do not participate in advertising networks.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">6. Data Sharing & Disclosure</Heading>
                <Text className="mb-2">We may disclose information:</Text>
                <ul className="list-disc ml-6 space-y-1 text-gray-700">
                  <li>to service providers who help us operate the Service (e.g., hosting, payment processing), under appropriate confidentiality obligations,</li>
                  <li>to deliver Subject Information to the customer for whom it was gathered (the core function of the Service),</li>
                  <li>when required by law or legal process,</li>
                  <li>to protect the security, rights, or integrity of the Service,</li>
                  <li>in connection with a merger, acquisition, or sale of assets, subject to this Policy.</li>
                </ul>
              </section>

              <section>
                <Heading level={2} className="mb-3">7. AI & Automation</Heading>
                <Text>
                  The Service uses automated agents and AI-assisted tools to gather, organize, and surface publicly available information. These tools provide advisory assistance only; they do not make decisions or act autonomously beyond gathering and organizing information as configured. AI usage may be logged for accountability.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">8. Rights Regarding Personal Information</Heading>

                <Heading level={3} className="mb-2">8.1 Customer rights</Heading>
                <Text className="mb-4">
                  Depending on your jurisdiction, you may have the right to access, correct, delete, or restrict certain uses of your Customer Information. Requests may be limited where information is required for security, billing, legal, or compliance obligations.
                </Text>

                <Heading level={3} className="mb-2">8.2 Rights of individuals appearing in Subject Information</Heading>
                <Text>
                  An individual who appears in Subject Information may have rights to access, correct, or request deletion of personal information about them, depending on applicable law. We will provide a mechanism to submit such requests and will respond as required by applicable law.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">9. Data-Broker & Privacy-Law Compliance</Heading>
                <Text>
                  Depending on how the Service operates and the jurisdictions of its data subjects, we may be subject to data-broker registration and related obligations, and to state and international privacy laws.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">10. Data Retention</Heading>
                <Text>
                  We retain Customer Information for as long as necessary to operate the Service and meet legal obligations. We retain Subject Information as necessary to provide the Service, subject to deletion requests under Section 8.2 and applicable law. Some records may be retained for security, audit, or legal-compliance purposes after account closure, with identifiers minimized where appropriate.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">11. Data Security</Heading>
                <Text>
                  We take reasonable technical and organizational measures to protect information, including access controls (including tenant isolation between customers), encryption where appropriate, and monitoring for unauthorized access. No system is perfectly secure; use of the Service is at your own risk.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">12. International Use</Heading>
                <Text>
                  The Service may process information in jurisdictions different from your own. By using the Service, you consent to such processing consistent with this Policy.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">13. Changes to This Policy</Heading>
                <Text>
                  We may update this Privacy Policy from time to time. Continued use of the Service after changes take effect constitutes acceptance of the revised Policy.
                </Text>
              </section>

              <section>
                <Heading level={2} className="mb-3">14. Legal Notices</Heading>
                <Text className="mb-2">Formal privacy-related legal notices may be sent to:</Text>
                <Text className="font-medium mb-2">legal@adoptacatbot.com</Text>
                <Text>
                  This address is intended for legal communications only. Submission of a message does not create any obligation to respond.
                </Text>
              </section>
            </Stack>
          </Card>
        </Container>
      </main>
    </div>
  )
}
