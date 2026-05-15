'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { Dropdown, DropdownItem, useToast } from '@/components/ui'
import { trpc } from '@/lib/trpc'

type Props = {
  inverted?: boolean
  active?: boolean
}

export function EditorialAccountMenu({ inverted = false, active = false }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const decoded: { userId: string } = jwtDecode(token)
        setUserId(decoded.userId)
      } catch {
        /* ignore */
      }
    }
  }, [])

  const { data: myBandsData } = trpc.band.getMyBands.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  )

  const isFounder =
    myBandsData?.bands?.some((band: { members?: { userId: string; role: string }[] }) =>
      band.members?.some((m) => m.userId === userId && m.role === 'FOUNDER')
    ) ?? false

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userEmail')
    showToast('Logged out successfully', 'success')
    router.push('/')
  }

  const go = (path: string) => router.push(path)

  const segmentClass = [
    'np-ed-primary-segment',
    'np-ed-primary-account',
    inverted ? 'np-ed-primary-segment--light' : 'np-ed-primary-segment--dark',
    active ? 'np-ed-primary-segment--neon' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={segmentClass}>
      <Dropdown trigger={<span className="np-ed-account-trigger">Account ▾</span>}>
        <DropdownItem onClick={() => go('/user-dashboard/profile')}>Profile</DropdownItem>
        {isFounder && (
          <DropdownItem onClick={() => go('/user-dashboard/subscription')}>Subscription</DropdownItem>
        )}
        <DropdownItem onClick={() => go('/user-dashboard/settings')}>Settings</DropdownItem>
        <DropdownItem onClick={handleLogout}>Logout</DropdownItem>
      </Dropdown>
    </div>
  )
}
