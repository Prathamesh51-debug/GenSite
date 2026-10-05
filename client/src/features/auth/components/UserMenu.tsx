import { UserButton } from '@daveyplate/better-auth-ui'
import AuthUIScope from '@/features/auth/components/AuthUIScope'

export default function UserMenu() {
  return (
    <AuthUIScope>
      <UserButton size="icon" />
    </AuthUIScope>
  )
}
