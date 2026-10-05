import { AccountSettingsCards, ChangePasswordCard, DeleteAccountCard } from "@daveyplate/better-auth-ui"
import { SketchUnderline } from "@/shared/components/ui/HandDrawn"
import AuthUIScope from "@/features/auth/components/AuthUIScope"

const Settings = () => {
  return (
    <AuthUIScope>
    <div className="w-full p-4 flex justify-center items-center min-h-[90vh]
    flex-col gap-6 py-12 text-foreground">
      <div className="w-full max-w-xl mx-auto text-center mb-2">
        <h1 className="font-display text-[32px] md:text-[42px] font-bold tracking-tight text-foreground">
          Your{' '}
          <span className="relative inline-block whitespace-nowrap text-primary">
            account
            <SketchUnderline className="text-clay" />
          </span>
        </h1>
        <p className="text-muted-foreground text-[15px] mt-3">Profile, password, and everything in between.</p>
      </div>
      <AccountSettingsCards
      classNames={{
        card: {
          base: 'bg-card ring-1 ring-border max-w-xl mx-auto',
          footer: 'bg-card ring-1 ring-border'
        }
      }}/>
       <div className="w-full">
            <ChangePasswordCard classNames={{
               base: 'bg-card ring-1 ring-border max-w-xl mx-auto',
               footer: 'bg-card ring-1 ring-border'
            }}/>
        </div>
        <div className="w-full">
            <DeleteAccountCard classNames={{
               base: 'bg-card ring-1 ring-border max-w-xl mx-auto'
            }}/>
        </div>
    </div>
    </AuthUIScope>
  )
}

export default Settings