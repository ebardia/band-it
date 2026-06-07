'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { AuthEditionBody } from '@/components/newspaper/AuthEditionBody'
import { AuthEditionIllustration } from '@/components/newspaper/AuthEditionIllustration'
import { EditorialNeonMasthead } from '@/components/newspaper/EditorialNeonMasthead'
import { REGISTER_CLERK_IMAGE } from '@/components/newspaper/newspaperPlaceholders'

// Current version of community guidelines - increment when guidelines change
const COMMUNITY_GUIDELINES_VERSION = 1
// Current version of Terms of Service & Privacy Policy - increment when they change
const TOS_VERSION = 1

/** Survives full page navigations so register still sends token after verify-email prep */
const PENDING_INVITE_TOKEN_KEY = 'bandIt_pendingInviteToken'

const HOUSE_RULES = [
  'No illegal activity or speech',
  'No spam, unsolicited marketing, or scams',
  'No violent, threatening, or harassing language',
  'No hate speech or discrimination',
  'Minors may take part — keep it appropriate for all ages',
  'Keep all content fit for a general audience',
]

function formatPaperDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const inviteFromUrl = searchParams.get('invite')

  const [showInviteBanner, setShowInviteBanner] = useState(false)

  useEffect(() => {
    if (inviteFromUrl) {
      try {
        localStorage.setItem(PENDING_INVITE_TOKEN_KEY, inviteFromUrl)
      } catch {
        /* ignore quota / private mode */
      }
    }
    try {
      setShowInviteBanner(
        Boolean(inviteFromUrl || localStorage.getItem(PENDING_INVITE_TOKEN_KEY)),
      )
    } catch {
      setShowInviteBanner(Boolean(inviteFromUrl))
    }
  }, [inviteFromUrl])

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false)
  const [tosAccepted, setTosAccepted] = useState(false)

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('userEmail', formData.email)
      try {
        localStorage.removeItem(PENDING_INVITE_TOKEN_KEY)
      } catch {
        /* ignore */
      }

      const hasInvites = data.bandsInvited && data.bandsInvited.length > 0

      // Show bands invited message if any
      if (hasInvites) {
        const bandNames = data.bandsInvited.map((b: { name: string }) => b.name).join(', ')
        showToast(`You've been invited to: ${bandNames}. Review and accept on the next page.`, 'info')
      }

      // Check if email is already verified (SKIP_EMAIL_VERIFICATION mode)
      // Use replace so register page isn't in browser history
      if (data.user.emailVerified) {
        if (!hasInvites) {
          showToast('Account created — you\u2019re on the list!', 'success')
        }
        // New users land in the waiting room until they're approved.
        router.replace(data.user.accessApproved ? '/daily' : '/waiting-room')
      } else {
        if (!hasInvites) {
          showToast('Account created! Please check your email.', 'success')
        }
        router.replace('/verify-email')
      }
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guidelinesAccepted) {
      showToast('Please accept the community guidelines to continue', 'error')
      return
    }
    if (!tosAccepted) {
      showToast('Please accept the Terms of Service and Privacy Policy to continue', 'error')
      return
    }
    let storedToken: string | undefined
    try {
      storedToken = localStorage.getItem(PENDING_INVITE_TOKEN_KEY) || undefined
    } catch {
      storedToken = undefined
    }
    registerMutation.mutate({
      ...formData,
      inviteToken: inviteFromUrl || storedToken || undefined,
      guidelinesVersion: COMMUNITY_GUIDELINES_VERSION,
      tosVersion: TOS_VERSION,
    })
  }

  return (
    <EditorialSurface>
      <div className="np-shell np-landing-page">
        <header className="np-landing-masthead np-register-masthead">
          <p className="np-cat">Adopt A Cat Bot</p>
          <EditorialNeonMasthead
            arcLabel="The"
            actionLabel="Register"
            ariaLabel="The Register"
          />
          <p className="np-register-tagline">Sign the book and claim your seat at the table.</p>
          <hr className="np-rule" />
          <div className="np-masthead-meta py-3 md:py-3.5">
            <span suppressHydrationWarning>{formatPaperDate(new Date())}</span>
            <span className="text-right">Charter Edition</span>
          </div>
          <p className="np-register-steps">Step 1 of 3 — Register · Verify · Daily</p>
        </header>

        <AuthEditionBody
          variant="register"
          sidebar={
            <>
              <AuthEditionIllustration
                src={REGISTER_CLERK_IMAGE}
                alt="A vintage cat robot clerk behind a wood counter with an open guest register and fountain pen."
                caption="The adoption desk — sign here; the cat robot clerk has been expecting you since 1952."
                size="large"
              />
              <aside className="np-auth-edition-rules" aria-labelledby="register-rules-heading">
                <p className="np-cat np-cat-left">House rules</p>
                <h2 id="register-rules-heading" className="np-picks-header">
                  Before you sign
                </h2>
                <p className="np-excerpt">
                  Cat Bot Adoption agency is a family-friendly room where people of all ages collaborate.
                  Breaking these may cost you your spot.
                </p>
                <ul className="np-fineprint-list">
                  {HOUSE_RULES.map((rule) => (
                    <li key={rule} className="np-fineprint-item">
                      {rule}
                    </li>
                  ))}
                </ul>
                <p className="np-byline np-byline-left">Already a subscriber?</p>
                <Link href="/login" className="np-action np-action-left">
                  Sign in →
                </Link>
              </aside>
            </>
          }
        >
          <section className="np-welcome-lead" aria-labelledby="register-heading">
            <p className="np-cat np-cat-left">Subscriptions desk</p>
            <h1 id="register-heading" className="np-welcome-headline">
              Put your name on the list
            </h1>
            <p className="np-welcome-dek">
              A free account is your press pass to adoption. Tell us who you are, agree to keep the
              room friendly, and we&apos;ll start your edition on Adopt A Cat Bot.
            </p>
          </section>

          {showInviteBanner && (
            <div className="np-register-alert" role="status">
              You&apos;ve been invited to join a band. Create your account to review and accept the
              invitation on the next page.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <p className="np-cat np-cat-left">Your details</p>
            <h2 className="np-picks-header np-picks-header-left">For the record</h2>

            <div className="np-register-form">
                <div>
                  <label className="np-label" htmlFor="register-name">Full name</label>
                  <input
                    id="register-name"
                    className="np-field"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Jane Q. Public"
                  />
                </div>

                <div>
                  <label className="np-label" htmlFor="register-email">Email address</label>
                  <input
                    id="register-email"
                    className="np-field"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@example.com"
                  />
                </div>

                <div>
                  <div className="np-field-labelrow">
                    <label className="np-label" htmlFor="register-password">Password</label>
                    <button
                      type="button"
                      className="np-field-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    id="register-password"
                    className="np-field"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="At least 8 characters"
                  />
                  <p className="np-field-hint">Must be at least 8 characters.</p>
                </div>

                <div className="np-consent">
                  <label className="np-consent-row">
                    <input
                      type="checkbox"
                      checked={guidelinesAccepted}
                      onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                    />
                    <span>
                      I have read and agree to follow the{' '}
                      <a href="/community-guidelines" target="_blank" rel="noopener noreferrer" className="np-consent-link">
                        community guidelines
                      </a>
                      .
                    </span>
                  </label>

                  <label className="np-consent-row">
                    <input
                      type="checkbox"
                      checked={tosAccepted}
                      onChange={(e) => setTosAccepted(e.target.checked)}
                    />
                    <span>
                      I agree to the{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="np-consent-link">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="np-consent-link">
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="np-profile-btn np-profile-btn-primary np-register-submit"
                  disabled={registerMutation.isPending || !guidelinesAccepted || !tosAccepted}
                >
                  {registerMutation.isPending ? 'Setting the type…' : 'Sign the register'}
                </button>
            </div>
          </form>
        </AuthEditionBody>
      </div>
    </EditorialSurface>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <EditorialSurface>
          <div className="np-shell np-landing-page">
            <p className="np-quiet">Setting today&apos;s edition…</p>
          </div>
        </EditorialSurface>
      }
    >
      <RegisterContent />
    </Suspense>
  )
}
