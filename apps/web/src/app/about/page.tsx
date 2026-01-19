'use client'

import { useState } from 'react'
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  PageLayout,
  Container,
  Button,
  Stack,
  Heading,
  Text,
  Flex,
  Card
} from "@/components/ui"

const useCases = [
  {
    id: 'nonprofit',
    label: 'Non Profit Organizations',
    title: 'Band It: Infrastructure for Nonprofit Organizations',
    content: `Nonprofits exist to serve missions larger than any individual—whether addressing social, environmental, cultural, or humanitarian needs. Their success depends on trust: trust from donors, from volunteers, from beneficiaries, and from the public.

Yet many nonprofits struggle not because they lack commitment or expertise, but because their internal systems cannot keep pace with their mission.

Band It is designed to help nonprofits organize their work transparently, govern responsibly, and convert good intentions into sustained, verifiable impact.

**Clear structure without centralized control**

Nonprofits operate through boards, staff, volunteers, committees, and partners—each with different responsibilities and authority. When roles are unclear or decisions are opaque, accountability suffers.

Band It provides a shared organizational container—a Band—where nonprofits can clearly define:
• Their mission and guiding principles
• Governance structures and decision rights
• Roles for board members, staff, and volunteers
• Committees and working groups

This structure supports compliance and oversight without concentrating power in a single individual.

**From strategy to execution**

Nonprofits often excel at vision, but struggle with execution due to limited capacity and fragmented tools.

In Band It:
• Ideas become proposals with clear goals, scope, and expected outcomes
• Approved proposals become projects
• Projects are broken into tasks with defined ownership and timelines

This creates a visible line from strategy to action, helping organizations stay focused while adapting to real-world constraints.

**Transparency as a foundation for trust**

Trust is not assumed in Band It—it is built through transparency.

Key activities are recorded and visible:
• Decisions and approvals
• Project progress
• Volunteer contributions
• Financial inflows and outflows

This makes it easier for nonprofits to:
• Demonstrate responsible stewardship
• Communicate impact to donors and funders
• Maintain continuity through leadership changes
• Reduce internal friction and suspicion

Transparency protects both the organization and the people who support it.

**Financial clarity and accountability**

Nonprofits manage complex financial flows:
• Donations and grants
• Fundraising campaigns
• Restricted and unrestricted funds
• Program expenses and reimbursements

Band It tracks these flows in a way that aligns with nonprofit accountability needs, providing clear records that support reporting, audits, and donor confidence—without turning the organization into a financial bureaucracy.

**Values that guide decisions**

Nonprofits are values-driven by nature, but values can erode under pressure.

Band It allows organizations to define values—such as equity, environmental responsibility, or community accountability—and apply them consistently:
• Evaluating proposals and partnerships
• Reviewing funding sources
• Guiding program design
• Informing difficult tradeoffs

Values become operational, not just aspirational.

**Supporting volunteers without burning them out**

Volunteers are the lifeblood of many nonprofits, yet volunteer management is often informal and uneven.

Band It helps make volunteer work visible and meaningful by:
• Clarifying expectations
• Tracking contributions
• Coordinating tasks and schedules
• Reducing reliance on informal channels that exclude or overwhelm

This supports retention and fairness without imposing rigid management structures.

**Preparing for growth, transition, and scrutiny**

Nonprofits evolve. Leadership changes. Programs expand or contract. External scrutiny increases.

Band It helps organizations maintain continuity by preserving institutional memory, documenting decisions, and making organizational processes legible to new leaders, partners, and funders.

For nonprofits seeking to operate with integrity, clarity, and resilience—while earning and maintaining public trust—Band It provides infrastructure that supports accountability without undermining mission or autonomy.`
  },
  {
    id: 'schools',
    label: 'School Clubs and Student Organizations',
    title: 'Band It: Infrastructure for School Clubs and Student Organizations',
    content: `School clubs—such as orchestras, bands, debate teams, robotics clubs, and arts organizations—are built around shared effort, limited time, and constant change. Every year, students graduate, parents rotate in and out, officers change, and hard-earned knowledge risks being lost.

Most school clubs struggle not because of lack of enthusiasm, but because structure resets every year.

Band It is designed to help school clubs operate smoothly across transitions, preserve institutional memory, and turn good intentions into reliable action.

**Continuity in a high-turnover environment**

By definition, school clubs experience constant turnover:
• Students join for a few years, then leave
• Parent volunteers rotate annually
• Leadership roles change frequently
• New members often don't know how things actually work

Band It provides a shared container—a Band—that holds the club's mission, rules, and history in one place. This allows each new group of students and parents to step into an existing structure instead of starting from scratch.

**Clear roles, shared responsibility**

Within Band It, clubs define:
• Student leadership roles
• Advisor and faculty oversight
• Parent and volunteer involvement
• Committees (fundraising, events, equipment, travel)

This clarity reduces confusion about who is responsible for what, while keeping authority distributed and transparent.

**From ideas to execution**

School clubs are full of ideas:
• Concerts and performances
• Competitions and trips
• Fundraisers and events
• Equipment purchases and maintenance

Band It helps turn these ideas into action.

Discussions lead to proposals, which outline plans clearly and transparently. Approved proposals become projects, and projects are broken into tasks—assignable, trackable actions with owners and timelines.

This makes it easier to:
• Coordinate rehearsals and events
• Manage logistics for trips and competitions
• Track equipment needs and repairs
• Ensure follow-through without micromanagement

**Managing money responsibly**

School clubs often manage shared funds:
• Membership dues
• Donations
• Fundraising proceeds
• School or district allocations

Band It tracks income and expenses clearly, so students, parents, and advisors can see:
• Where money comes from
• What it is spent on
• How decisions were made

This transparency builds trust and simplifies transitions between parent treasurers and student leaders.

**Values and expectations, clearly stated**

Every club has expectations:
• Respectful behavior
• Commitment to attendance
• Fair access to opportunities
• Appropriate communication

Band It allows clubs to define these values explicitly and apply them consistently. Proposals, activities, and decisions can be checked against agreed-upon standards, reducing conflict and misunderstandings.

**Events, equipment, and logistics in one place**

Band It supports:
• Scheduling rehearsals, concerts, and trips
• Tracking attendance
• Managing equipment inventories
• Storing documents, permissions, and plans
• Keeping records for future leadership

This reduces reliance on personal email chains, spreadsheets, and institutional memory that disappears each year.

**Support for advisors and parents, without overload**

Band It does not replace faculty advisors or parent volunteers—it supports them.

By making plans, decisions, and responsibilities visible, the system reduces burnout and prevents a small number of adults from carrying the entire organizational load.

**A system that grows with the club**

As clubs evolve—growing, shrinking, changing focus—Band It adapts. New students can onboard quickly, outgoing leaders can hand off responsibilities cleanly, and the club retains a clear sense of identity year after year.

For school clubs seeking stability, fairness, and continuity in an environment defined by change, Band It provides infrastructure that helps students focus on what matters: learning, collaboration, and shared achievement.`
  },
  { id: 'other', label: '...', title: '...', content: 'Use Your Imagination; What\'s your fancy' },
  {
    id: 'political',
    label: 'Collective Political Action',
    title: 'Band It: Infrastructure for Collective Political Action',
    content: `Political change has never been the work of individuals alone. It emerges when people come together around a shared purpose, organize their efforts, and act in coordinated, sustained ways. Yet many political groups struggle not because of lack of passion, but because of lack of structure. Meetings dissolve into talk. Decisions feel opaque. Trust erodes. Good ideas fail to turn into action.

Band It exists to solve this problem.

Band It is a system designed to help people organize collectively around a cause—clearly, transparently, and effectively—without centralizing power or diluting values.

**From shared purpose to shared action**

A political group using Band It begins by forming a Band: a collective space where members articulate their mission, vision, and agenda. This is not just a slogan or manifesto—it is a living foundation that guides every decision the group makes.

Within a Band, members can:
• Hold structured discussions about goals and strategy
• Debate priorities without silencing dissent
• Clarify what the group stands for—and what it refuses to become

Discussion alone, however, is not enough. Band It is built to move groups from conversation to action.

**Turning ideas into proposals, projects, and tasks**

In Band It, ideas are formalized as proposals. A proposal lays out what the group wants to do, why it matters, how it will be executed, and what success looks like. Proposals are visible to members, reviewed openly, and approved through transparent decision processes chosen by the group itself.

Once approved, proposals become projects, and projects are broken into tasks—clear, assignable, verifiable actions. This creates accountability without hierarchy: people know what they are committing to, and others can see progress without relying on trust alone.

**Trust through transparency, not personalities**

Political movements often fracture because trust is assumed rather than earned. Band It takes a different approach: everything important is tracked.
• Who proposed what
• How decisions were made
• Who committed to which tasks
• What work was completed
• How funds were raised and spent

This creates institutional memory and protects the group from misinformation, internal conflict, and bad actors—without requiring blind faith in leaders.

**Values are not slogans—they are enforceable**

Every Band begins with a value system. These values are not decorative. They are operational.

For example, a group may adopt values such as:
• No personal attacks
• Commitment to free expression
• Nonviolent action
• Accountability to the community

Band It uses these values as checkpoints throughout the system. Proposals, actions, financial decisions, and partnerships can be flagged or reviewed if they conflict with stated values. This helps groups remain aligned with their principles even under pressure.

**Growing, funding, and sustaining the movement**

Band It supports the real-world needs of political organizing:
• Recruiting and onboarding new members
• Collecting member dues or donations
• Running fundraising campaigns
• Applying for grants
• Selling merchandise to support actions

Financial activity is tracked transparently, reducing suspicion and increasing donor confidence. Members and supporters can see that resources are being used responsibly and in line with the group's mission.

**A tool for movements, not control**

Band It does not dictate ideology, strategy, or outcomes. It provides infrastructure—rails that help groups govern themselves without chaos, coercion, or opacity.

For political organizers seeking to build movements that are principled, resilient, and capable of sustained action, Band It offers a way to turn shared belief into coordinated impact, while preserving trust, transparency, and collective ownership.`
  },
  {
    id: 'communities',
    label: 'Intentional Communities',
    title: 'Band It: Infrastructure for Intentional Communities',
    content: `Intentional communities form when people choose to live, work, or organize together around shared values rather than convenience or hierarchy. These communities often arise from a desire for deeper connection, shared responsibility, sustainability, mutual aid, spiritual alignment, or alternative economic and social models.

They are built on trust.

And that trust is often tested.

**The promise — and the challenge — of intentional community**

Most intentional communities begin with strong alignment:
• A shared vision for how to live together
• A desire to distribute responsibility fairly
• A commitment to values such as sustainability, care, autonomy, or consensus

Over time, however, common challenges emerge:
• Decision-making becomes slow, informal, or unclear
• Responsibilities concentrate in a few people
• Conflicts are handled inconsistently or avoided
• Institutional memory is lost as people come and go
• Money, labor, and expectations blur together
• New members don't fully understand how things actually work

These issues rarely stem from bad intent. They arise from lack of structure, not lack of care.

Band It is designed to support intentional communities by providing structure without undermining autonomy, values, or human relationships.

**A shared container for governance and care**

In Band It, an intentional community forms a Band—a shared container where the community defines:
• Its mission and purpose
• Its values and boundaries
• How decisions are made
• How responsibilities are shared
• How conflicts and changes are handled

This creates clarity without imposing hierarchy. The system does not decide for the community; it helps the community decide together and remember those decisions.

**From discussion to action, without burnout**

Intentional communities often hold many discussions but struggle to translate them into sustained action. Band It helps bridge this gap.

Community ideas become proposals, which are reviewed and refined collectively. Approved proposals become projects, and projects are broken into tasks—clearly defined, assignable, and trackable actions.

This makes invisible labor visible:
• Who committed to what
• What work is ongoing
• What has been completed
• What still needs care

Recurring tasks—like maintenance, facilitation, cooking, childcare, or land stewardship—can be tracked without turning the community into a workplace.

**Values that guide, not just inspire**

Intentional communities often articulate strong values, but struggle to apply them consistently.

Band It allows communities to define values such as:
• Nonviolent communication
• Shared responsibility
• Ecological stewardship
• Consent-based decision-making
• Respect for diversity and autonomy

These values are then used as living constraints:
• Proposals can be reviewed for value alignment
• Projects can be flagged when actions drift from principles
• Vendors, partnerships, or funding sources can be evaluated against community ethics

This helps communities stay aligned over time, even as membership changes.

**Trust built through transparency, not surveillance**

Band It emphasizes transparency without policing.

Key actions—decisions, task commitments, financial flows—are recorded so the community can:
• Build trust based on shared facts
• Avoid misunderstandings and resentment
• Address issues early, before they harden into conflict

Transparency supports care. It does not replace it.

**Shared resources, handled responsibly**

Many intentional communities manage shared resources:
• Dues or contributions
• Donations
• Grants
• Shared expenses
• Collective assets

Band It helps track these flows clearly, so money supports the community rather than becoming a source of tension. No one person controls resources without accountability to the group.

**Supporting growth, change, and transition**

Communities are living systems. People join, leave, form subgroups, or reorganize responsibilities.

Band It supports:
• Onboarding new members with clarity
• Creating committees or working groups
• Spinning up or dissolving projects
• Maintaining continuity during transitions

The system helps the community remember who it is, even as it evolves.

**Technology in service of human relationships**

Band It does not automate care, values, or judgment.

It does not replace meetings, trust, or difficult conversations.

It provides structure so those human processes can happen with less confusion, less burnout, and more fairness.

For intentional communities seeking to live their values over the long term—not just at the beginning—Band It offers a way to combine autonomy with accountability, and vision with sustainable action.`
  },
]

export default function AboutPage() {
  const router = useRouter()
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null)

  return (
    <PageLayout>
      {/* Top navigation bar */}
      <div className="absolute top-0 left-0 right-0 p-4">
        <Flex justify="between" align="center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
          >
            Home
          </Button>
          <Flex gap="sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/register')}
            >
              Register
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/login')}
            >
              Sign In
            </Button>
          </Flex>
        </Flex>
      </div>

      {/* Main content */}
      <Container size="lg" className="pt-20 pb-12">
        <Stack spacing="xl">
          {/* Hero section */}
          <div className="text-center">
            <Stack spacing="md" className="items-center">
              <Image
                src="/logo.png"
                alt="Band IT Logo"
                width={200}
                height={200}
                priority
              />
              <Heading level={1}>About Band It</Heading>
            </Stack>
          </div>

          {/* Main content */}
          <div className="max-w-3xl mx-auto">
            <Stack spacing="lg">
              <Card>
                <Stack spacing="md">
                  <Text weight="bold">Question: How do we save the world?</Text>
                  <Text>Answer: The most obvious way — by imagining a better future and banding together to make it happen.</Text>
                </Stack>
              </Card>

              <Text className="text-lg">
                <strong>BAND IT</strong> is designed to help us do exactly that — in a structured, transparent, and accountable way.
              </Text>

              <Text>It is an ecosystem where one or a few people can:</Text>

              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>State a mission</li>
                <li>Recruit members and contributors</li>
                <li>Have discussions</li>
                <li>Make decisions</li>
                <li>Raise funds</li>
                <li>Execute projects</li>
              </ul>

              <Text weight="bold">All with complete transparency and accountability.</Text>

              <Text color="muted" variant="small" className="italic">
                (Fine print: with the help of a Capable Machine — CM. Not AI. CM.)
              </Text>

              <Card className="bg-gray-50">
                <Stack spacing="md">
                  <Text>
                    Humans have always tried to organize like this — and we've failed because of chaos, confusion, and ego.
                  </Text>
                  <Text>
                    What if a truly democratic and transparent system could guide us, support us, and help us succeed more often at doing things together?
                  </Text>
                </Stack>
              </Card>

              <Stack spacing="sm">
                <Text weight="bold">We also have the ability to limit harm:</Text>
                <Text>No lies.</Text>
                <Text>It's all transparent.</Text>
              </Stack>
            </Stack>
          </div>

          {/* Bucket List section */}
          <div className="max-w-4xl mx-auto">
            <Stack spacing="xl">
              <div className="text-center">
                <Stack spacing="md">
                  <Image
                    src="/bucket-list.png"
                    alt="Band It Bucket List - Ecosystem Overview"
                    width={800}
                    height={600}
                    className="mx-auto rounded-lg shadow-lg mb-8"
                  />
                  <Text weight="bold" className="text-xl mt-6">
                    Band It is not a single tool. It's an ecosystem made of distinct layers that work together to help groups organize, decide, act, and build trust over time.
                  </Text>
                </Stack>
              </div>

              {/* Foundational Layers */}
              <Card className="bg-amber-50">
                <Stack spacing="lg">
                  <div>
                    <Heading level={3}>Foundational Layers</Heading>
                    <Text color="muted" variant="small">(Everything else depends on these)</Text>
                  </div>

                  {/* 1. Band & Governance */}
                  <Stack spacing="md">
                    <Heading level={4}>1. Band & Governance</Heading>
                    <Text>The core container for all activity.</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Band identity: mission, description, public profile</li>
                      <li>Governance structure: governors, stewards, members</li>
                      <li>Committees and sub-groups (finance, operations, events, etc.)</li>
                      <li>Membership rules: joining, leaving, eligibility, thresholds</li>
                      <li>Decision rules: who approves what, voting thresholds, escalation</li>
                    </ul>
                    <Text weight="semibold">Band hierarchy:</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Big Bands (umbrella or regional)</li>
                      <li>Bands</li>
                      <li>Bandinos (committees or sub-bands)</li>
                    </ul>
                    <Text weight="semibold">Communication basics:</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Announcements and bulletins</li>
                      <li>Meetings and events (online/offline)</li>
                      <li>Scheduling and attendance tracking</li>
                      <li>Moderation and facilitation</li>
                    </ul>
                    <Card className="bg-white">
                      <Text weight="bold">Key idea:</Text>
                      <Text>Nothing exists outside a band context — no authority, no money, no action.</Text>
                    </Card>
                  </Stack>

                  {/* 2. People */}
                  <Stack spacing="md">
                    <Heading level={4}>2. People</Heading>
                    <Text>Real humans with real history.</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Verified identity</li>
                      <li>Skills, interests, and learning goals</li>
                      <li>Participation history across bands</li>
                      <li>Contribution signals and activity record</li>
                      <li>Messaging (1:1 and group)</li>
                    </ul>
                    <Text weight="semibold">Derived (non-authoritative):</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Reputation indicators</li>
                      <li>Suggested growth paths</li>
                    </ul>
                    <Text className="italic">People can belong to multiple bands.</Text>
                  </Stack>

                  {/* 3. Trust Network */}
                  <Stack spacing="md">
                    <Heading level={4}>3. Trust Network</Heading>
                    <Text>Shared trust across the ecosystem.</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Trust built from participation, completed work, and validation</li>
                      <li>Trust signals are visible but not owned by any single band</li>
                      <li>Trust carries across bands</li>
                    </ul>
                    <Text className="italic">Feeds governance confidence, vendor selection, and fraud detection.</Text>
                  </Stack>
                </Stack>
              </Card>

              {/* Core Domain Layers */}
              <Card className="bg-blue-50">
                <Stack spacing="lg">
                  <div>
                    <Heading level={3}>Core Domain Layers</Heading>
                    <Text color="muted" variant="small">(Where work, money, and values live)</Text>
                  </div>

                  {/* 4. Activity */}
                  <Stack spacing="md">
                    <Heading level={4}>4. Activity (Work & Conversation)</Heading>
                    <Text>Where things actually happen.</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Discussions, threads, comments</li>
                      <li>Proposals (internal and external)</li>
                      <li>Projects and task breakdowns</li>
                    </ul>
                    <Text weight="semibold">Tasks:</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>One-time or ongoing</li>
                      <li>Clear lifecycle states</li>
                      <li>Verification where required</li>
                    </ul>
                    <Text weight="semibold">Supporting materials:</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Documents</li>
                      <li>Images</li>
                      <li>Receipts</li>
                      <li>Links and attachments</li>
                      <li>On-the-ground verification when needed</li>
                    </ul>
                    <Text className="italic">Tasks cannot exist outside an approved process.</Text>
                  </Stack>

                  {/* 5. Proposals, RFPs & Grants */}
                  <Stack spacing="md">
                    <Heading level={4}>5. Proposals, RFPs & Grants</Heading>
                    <Text>How opportunities are formalized.</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Internal proposals (member-driven decisions)</li>
                      <li>External proposals (responses to RFPs)</li>
                      <li>RFP issuance by bands</li>
                      <li>Grant applications and awards</li>
                      <li>Review, approval, and tracking tied to governance rules</li>
                    </ul>
                    <Text className="italic">Externally facing, fully auditable.</Text>
                  </Stack>

                  {/* 6. Values */}
                  <Stack spacing="md">
                    <Heading level={4}>6. Values</Heading>
                    <Text>What a band stands for — enforced, not symbolic.</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Band-defined values (social, environmental, ethical, etc.)</li>
                      <li>Value policies and constraints</li>
                    </ul>
                    <Text weight="semibold">Applied to:</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Proposals</li>
                      <li>Projects</li>
                      <li>Tasks</li>
                      <li>Vendors</li>
                      <li>Financial decisions</li>
                      <li>AI advice</li>
                    </ul>
                    <Text className="italic">Values never execute actions. They constrain and annotate them.</Text>
                  </Stack>

                  {/* 7. Financials */}
                  <Stack spacing="md">
                    <Heading level={4}>7. Financials</Heading>
                    <Text>All money, fully traceable.</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Income: dues, donations, fundraising, sales</li>
                      <li>Expenses: vendors, reimbursements, project costs</li>
                    </ul>
                    <Text weight="semibold">Budgets:</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Per proposal</li>
                      <li>Per project</li>
                      <li>Per band</li>
                      <li>Fund allocation and tracking</li>
                      <li>Band-level commerce (digital or physical)</li>
                    </ul>
                    <Text className="italic">Money belongs to the band, not individuals.</Text>
                  </Stack>

                  {/* 8. Tokens */}
                  <Stack spacing="md">
                    <Heading level={4}>8. Tokens (Non-Monetary)</Heading>
                    <Text>Coordination without money.</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Fixed allocation at onboarding</li>
                    </ul>
                    <Text weight="semibold">Used for:</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Bartering work</li>
                      <li>Contribution signaling</li>
                    </ul>
                    <Text weight="semibold">Hard constraints:</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Cannot be purchased</li>
                      <li>Cannot convert to money</li>
                      <li>Caps on accumulation</li>
                    </ul>
                    <Text className="italic">Separate from financials. Used for coordination, not wealth.</Text>
                  </Stack>

                  {/* 9. Vendors */}
                  <Stack spacing="md">
                    <Heading level={4}>9. Vendors</Heading>
                    <Text>External entities held accountable.</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Band-level and global vendor lists</li>
                      <li>Vendor profiles with history and references</li>
                      <li>RFP participation</li>
                      <li>Value alignment and trust signals</li>
                      <li>Vendor-task-project relationships</li>
                    </ul>
                    <Text className="italic">Integrated with Financials, Values, and Trust.</Text>
                  </Stack>
                </Stack>
              </Card>

              {/* Intelligence & Oversight Layers */}
              <Card className="bg-purple-50">
                <Stack spacing="lg">
                  <div>
                    <Heading level={3}>Intelligence & Oversight Layers</Heading>
                    <Text color="muted" variant="small">(Watching, not ruling)</Text>
                  </div>

                  {/* 10. Audit & Event Log */}
                  <Stack spacing="md">
                    <Heading level={4}>10. Audit & Event Log</Heading>
                    <Text>A permanent record.</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Membership changes</li>
                      <li>Proposal edits and votes</li>
                      <li>Task state changes</li>
                      <li>Financial transactions</li>
                      <li>AI activity</li>
                      <li>Who did what, when, and why</li>
                    </ul>
                    <Text className="italic">Feeds transparency, fraud detection, and trust.</Text>
                  </Stack>

                  {/* 11. Fraud Detection */}
                  <Stack spacing="md">
                    <Heading level={4}>11. Fraud Detection & Management</Heading>
                    <Text>Detects abuse without replacing human judgment.</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Fraud signals and anomaly detection</li>
                      <li>Alerts, reviews, and investigations</li>
                      <li>Sanctions and safeguards</li>
                      <li>On-the-ground validation where required</li>
                    </ul>
                    <Text className="italic">Humans remain the final authority.</Text>
                  </Stack>

                  {/* 12. AI */}
                  <Stack spacing="md">
                    <Heading level={4}>12. AI (Advisory Only)</Heading>
                    <Text>AI assists — it never decides.</Text>
                    <Text weight="semibold">AI can:</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Help draft and validate proposals</li>
                      <li>Analyze scope, schedule, and budgets</li>
                      <li>Suggest tasks and resources</li>
                      <li>Assist with discovery and compliance</li>
                      <li>Flag risks and inconsistencies</li>
                    </ul>
                    <Text weight="semibold">AI cannot:</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Approve decisions</li>
                      <li>Move funds</li>
                      <li>Change rules or values</li>
                    </ul>
                  </Stack>

                  {/* 13. Blob Management */}
                  <Stack spacing="md">
                    <Heading level={4}>13. Blob Management</Heading>
                    <Text>How bands grow, merge, and adapt.</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Discovery of people, bands, skills, and resources</li>
                      <li>Collaboration across bands</li>
                      <li>Merging, splitting, and re-forming groups</li>
                    </ul>
                    <Text className="italic">Dynamic, adaptive, AI-assisted.</Text>
                  </Stack>

                  {/* 14. System Monitoring */}
                  <Stack spacing="md">
                    <Heading level={4}>14. System Monitoring & Risk</Heading>
                    <Text>Continuous health checks.</Text>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Project health</li>
                      <li>Process effectiveness</li>
                      <li>Budget and timeline risks</li>
                      <li>Burnout and overload signals</li>
                    </ul>
                    <Text className="italic">Read-only intelligence that informs governance.</Text>
                  </Stack>
                </Stack>
              </Card>

              {/* Platform & Product Layers */}
              <Card className="bg-green-50">
                <Stack spacing="lg">
                  <div>
                    <Heading level={3}>Platform & Product Layers</Heading>
                    <Text color="muted" variant="small">(Some apply at both Band It and Band level)</Text>
                  </div>

                  {/* 15. Security */}
                  <Stack spacing="md">
                    <Heading level={4}>15. Security & Verification</Heading>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Identity verification</li>
                      <li>Access control</li>
                      <li>Permissions and data protection</li>
                    </ul>
                  </Stack>

                  {/* 16. System Administration */}
                  <Stack spacing="md">
                    <Heading level={4}>16. System Administration</Heading>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Platform configuration</li>
                      <li>Role and permission management</li>
                      <li>Restricted overrides</li>
                    </ul>
                  </Stack>

                  {/* 17. Legal & Compliance */}
                  <Stack spacing="md">
                    <Heading level={4}>17. Legal & Compliance (Dual Scope)</Heading>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Band It platform compliance</li>
                      <li>Band-level regulatory or nonprofit compliance</li>
                      <li>Declarative compliance rules</li>
                      <li>Audit cooperation support</li>
                    </ul>
                  </Stack>

                  {/* 18. Support & Knowledge */}
                  <Stack spacing="md">
                    <Heading level={4}>18. Support & Knowledge (Dual Scope)</Heading>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Platform support and documentation</li>
                      <li>Band-level education and internal knowledge</li>
                      <li>Feedback loops</li>
                    </ul>
                  </Stack>

                  {/* 19. Quality & Reliability */}
                  <Stack spacing="md">
                    <Heading level={4}>19. Quality & Reliability</Heading>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Automated testing</li>
                      <li>Monitoring and uptime</li>
                      <li>Incident response</li>
                    </ul>
                  </Stack>

                  {/* 20. Marketing & Outreach */}
                  <Stack spacing="md">
                    <Heading level={4}>20. Marketing & Outreach (Dual Scope)</Heading>
                    <ul className="list-disc list-inside space-y-1 pl-4 text-gray-700">
                      <li>Band It markets the system</li>
                      <li>Bands market their work</li>
                    </ul>
                    <Text className="italic">All claims tied back to verifiable activity.</Text>
                  </Stack>
                </Stack>
              </Card>
            </Stack>
          </div>

          {/* Spacer */}
          <div className="h-32" />

          {/* All Their Own section */}
          <Stack spacing="lg">
            <Heading level={1} className="text-center text-4xl">To All Their Own</Heading>
            <Text variant="small" color="muted" className="text-center">Click on a circle to see more</Text>

            {/* Circular blob layout */}
            <div className="relative w-full max-w-2xl mx-auto aspect-square">
              {useCases.map((useCase, index) => {
                const angle = (index * 72 - 90) * (Math.PI / 180) // 72 degrees apart, starting from top
                const radius = 32 // percentage from center
                const x = 50 + radius * Math.cos(angle)
                const y = 50 + radius * Math.sin(angle)

                return (
                  <button
                    key={useCase.id}
                    onClick={() => setSelectedUseCase(useCase.id)}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-center p-4 hover:scale-110 transition-transform shadow-lg flex items-center justify-center text-sm"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    {useCase.label}
                  </button>
                )
              })}
            </div>
          </Stack>

          {/* Modal */}
          {selectedUseCase && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedUseCase(null)}
            >
              <div
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-8 max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <Flex justify="between" align="start" className="mb-6">
                  <Heading level={2}>
                    {useCases.find(u => u.id === selectedUseCase)?.title}
                  </Heading>
                  <button
                    onClick={() => setSelectedUseCase(null)}
                    className="text-gray-500 hover:text-gray-700 text-3xl leading-none ml-4"
                  >
                    &times;
                  </button>
                </Flex>
                <div className="prose prose-gray max-w-none">
                  {useCases.find(u => u.id === selectedUseCase)?.content.split('\n\n').map((paragraph, index) => {
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      return (
                        <h3 key={index} className="text-lg font-bold mt-6 mb-3">
                          {paragraph.replace(/\*\*/g, '')}
                        </h3>
                      )
                    }
                    if (paragraph.includes('•')) {
                      return (
                        <ul key={index} className="list-disc list-inside space-y-1 mb-4">
                          {paragraph.split('\n').map((line, i) => (
                            <li key={i}>{line.replace('• ', '')}</li>
                          ))}
                        </ul>
                      )
                    }
                    return (
                      <p key={index} className="mb-4 text-gray-700">
                        {paragraph}
                      </p>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CTA section */}
          <Card className="bg-blue-50 text-center">
            <Stack spacing="md" className="items-center py-8">
              <Heading level={2}>Ready to Join Band It?</Heading>
              <Text color="muted">
                Join Band It today and start collaborating with your team.
              </Text>
              <Flex gap="md" justify="center">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push('/register')}
                >
                  Register
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => router.push('/login')}
                >
                  Sign In
                </Button>
              </Flex>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </PageLayout>
  )
}
