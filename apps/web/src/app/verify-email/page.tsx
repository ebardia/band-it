'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { jwtDecode } from 'jwt-decode'
import { useToast } from '@/components/ui'
import { EditorialSurface } from '@/components/editorial/EditorialSurface'
import { AuthEditionBody } from '@/components/newspaper/AuthEditionBody'
import { AuthEditionIllustration } from '@/components/newspaper/AuthEditionIllustration'
import { EditorialNeonMasthead } from '@/components/newspaper/EditorialNeonMasthead'
import { PROOF_PIGEONS_IMAGE } from '@/components/newspaper/newspaperPlaceholders'

const PROOF_ILLUSTRATION = (
  <AuthEditionIllustration
    src={PROOF_PIGEONS_IMAGE}
    alt="Two carrier pigeons chatting beside a water cooler in a mailroom corridor."
    caption="The mail room — gossip travels faster than the afternoon edition."
  />
)

const MAILROOM_STEPS = [
  'Open your inbox (and peek at spam — we hide there sometimes).',
  'Click the verification link — one tap, no crossword required.',
  'Come back here; we\'ll whisk you to the next chapter.',
]

function formatPaperDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

function VerifyEmailShell({
  children,
  sidebarBelowImage,
}: {
  children: React.ReactNode
  sidebarBelowImage?: React.ReactNode
}) {
  return (
    <EditorialSurface>
      <div className="np-shell np-landing-page">
        <header className="np-landing-masthead np-register-masthead">
          <p className="np-cat">Band It</p>
          <EditorialNeonMasthead
            arcLabel="The Proof"
            actionLabel="Desk"
            ariaLabel="The Proof Desk"
          />
          <p className="np-register-tagline">
            Where the carrier pigeon lands before your edition goes to press.
          </p>
          <hr className="np-rule" />
          <div className="np-masthead-meta py-3 md:py-3.5">
            <span suppressHydrationWarning>{formatPaperDate(new Date())}</span>
            <span className="text-right">Carrier Edition</span>
          </div>
          <p className="np-register-steps">Step 2 of 3 — Register · Verify · Daily</p>
        </header>

        <AuthEditionBody
          sidebar={
            <>
              {PROOF_ILLUSTRATION}
              {sidebarBelowImage}
            </>
          }
        >
          {children}
        </AuthEditionBody>
      </div>
    </EditorialSurface>
  )
}

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const token = searchParams.get('token')
  const [email, setEmail] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [verifying, setVerifying] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const hasVerified = useRef(false)

  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail') || ''
    setEmail(storedEmail)

    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      try {
        const decoded = jwtDecode<{ userId: string }>(accessToken)
        setUserId(decoded.userId)
      } catch (error) {
        console.error('Invalid token:', error)
      }
    }
  }, [])

  const { data: profileData, refetch: refetchProfile } = trpc.auth.getProfile.useQuery(
    { userId },
    {
      enabled: !!userId && !token && !hasVerified.current,
      refetchInterval: 5000,
    },
  )

  useEffect(() => {
    if (profileData?.user?.emailVerified && !hasVerified.current) {
      hasVerified.current = true
      showToast('Email verified! Redirecting...', 'success')
      setTimeout(() => {
        router.replace('/daily')
      }, 1500)
    }
  }, [profileData, router, showToast])

  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setVerifying(false)
      if (!hasVerified.current) {
        hasVerified.current = true
        showToast('Email verified successfully!', 'success')
        setTimeout(() => {
          router.replace('/daily')
        }, 2000)
      }
    },
    onError: (error) => {
      setVerifying(false)
      showToast(error.message, 'error')
    },
  })

  const resendMutation = trpc.auth.resendVerification.useMutation({
    onSuccess: () => {
      showToast('Verification email sent! Check your inbox.', 'success')
    },
    onError: (error) => {
      showToast(error.message, 'error')
    },
  })

  useEffect(() => {
    if (token && !verifying && !hasVerified.current) {
      setVerifying(true)
      verifyEmailMutation.mutate({ token })
    }
    // Token link should fire once on mount; mutation identity is unstable in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleResend = () => {
    if (userId) {
      resendMutation.mutate({ userId })
    }
  }

  const handleCheckStatus = () => {
    setCheckingStatus(true)
    refetchProfile().then((result) => {
      setCheckingStatus(false)
      if (result.data?.user?.emailVerified) {
        hasVerified.current = true
        showToast('Email verified! Redirecting...', 'success')
        setTimeout(() => router.replace('/daily'), 1500)
      } else {
        showToast('Not verified yet — the pigeon is still in transit.', 'info')
      }
    })
  }

  if (token) {
    return (
      <VerifyEmailShell>
        <section className="np-welcome-lead np-auth-edition-lead" aria-live="polite">
          {verifying && !verifyEmailMutation.isError ? (
            <>
              <p className="np-cat np-cat-left">Hot off the wire</p>
              <h1 className="np-welcome-headline">Checking your proof…</h1>
              <p className="np-welcome-dek np-quiet-left">
                Hold the front page — we&apos;re confirming that link right now.
              </p>
            </>
          ) : verifyEmailMutation.isSuccess ? (
            <>
              <p className="np-cat np-cat-left">Cleared for press</p>
              <h1 className="np-welcome-headline">Proof approved</h1>
              <p className="np-welcome-dek">
                Your address is verified. Rolling the presses and taking you to your Daily…
              </p>
            </>
          ) : verifyEmailMutation.isError ? (
            <>
              <p className="np-cat np-cat-left">Hold the presses</p>
              <h1 className="np-welcome-headline">That link didn&apos;t stick</h1>
              <p className="np-welcome-dek">
                The verification link may have expired or already been used. Ask the mail room
                to send another.
              </p>
              <div className="np-daily-spread-actions" style={{ marginTop: '1.25rem' }}>
                {userId ? (
                  <button
                    type="button"
                    className="np-profile-btn np-profile-btn-primary"
                    onClick={handleResend}
                    disabled={resendMutation.isPending}
                  >
                    {resendMutation.isPending ? 'Calling the pigeon…' : 'Send another proof'}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="np-action np-action-left"
                  onClick={() => router.replace('/verify-email')}
                >
                  Back to the mail room →
                </button>
              </div>
            </>
          ) : null}
        </section>
      </VerifyEmailShell>
    )
  }

  return (
    <VerifyEmailShell
      sidebarBelowImage={
        <aside className="np-auth-edition-rules" aria-labelledby="verify-rail-heading">
          <p className="np-cat np-cat-left">Pigeon notes</p>
          <h2 id="verify-rail-heading" className="np-picks-header">
            Nothing yet?
          </h2>
          <p className="np-excerpt">
            Carriers get lost. Spam folders eat good mail. Give it a minute, then try again.
          </p>
          <p className="np-byline np-byline-left">Still waiting?</p>
          <button
            type="button"
            className="np-action np-action-left"
            onClick={handleResend}
            disabled={resendMutation.isPending || !userId}
          >
            {resendMutation.isPending ? 'Sending…' : 'Resend the proof →'}
          </button>
          <p className="np-field-hint" style={{ marginTop: '1.25rem' }}>
            Wrong address? You&apos;ll need to register again with the correct email.
          </p>
        </aside>
      }
    >
      <section className="np-welcome-lead np-auth-edition-lead" aria-labelledby="verify-heading">
        <p className="np-cat np-cat-left">Mail room</p>
        <h1 id="verify-heading" className="np-welcome-headline">
          Your proof is in the mail
        </h1>
        <p className="np-welcome-dek">
          We sent a verification link to{' '}
          <strong>{email || 'your inbox'}</strong>. One click and you&apos;re cleared for the
          next edition of Band It — work, play, causes, and whatever else you band together for.
        </p>
      </section>

      <div aria-labelledby="verify-steps-heading">
        <p className="np-cat np-cat-left">Reader&apos;s guide</p>
        <h2 id="verify-steps-heading" className="np-picks-header np-picks-header-left">
          What to do next
        </h2>
        <ol className="np-fineprint-list" style={{ listStyle: 'none', counterReset: 'step' }}>
          {MAILROOM_STEPS.map((step, i) => (
            <li key={step} className="np-fineprint-item">
              <span className="np-daily-index-num" style={{ marginRight: '0.5rem' }}>
                {i + 1}.
              </span>
              {step}
            </li>
          ))}
        </ol>

        <div className="np-daily-spread-actions" style={{ marginTop: '1.5rem' }}>
          <button
            type="button"
            className="np-profile-btn np-profile-btn-primary"
            onClick={handleCheckStatus}
            disabled={checkingStatus || !userId}
          >
            {checkingStatus ? 'Checking the wire…' : 'Already verified elsewhere?'}
          </button>
        </div>
      </div>
    </VerifyEmailShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <VerifyEmailShell>
          <p className="np-quiet">Opening the mail room…</p>
        </VerifyEmailShell>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
