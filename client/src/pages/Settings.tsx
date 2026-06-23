import { AccountSettingsCards, ChangePasswordCard, DeleteAccountCard } from "@daveyplate/better-auth-ui"

const Settings = () => {
  return (
    <div className="w-full p-4 flex justify-center items-center min-h-[90vh]
    flex-col gap-6 py-12 text-white">
      <div className="w-full max-w-xl mx-auto text-center mb-2">
        <h1 className="text-shimmer text-2xl font-semibold tracking-tight">Account settings</h1>
        <p className="text-shimmer text-sm mt-1.5">Manage your profile, password and account.</p>
      </div>
      <AccountSettingsCards
      classNames={{
        card: {
          base: 'bg-black/10 ring ring-indigo-950 max-w-xl mx-auto',
          footer: 'bg-black/10 ring ring-indigo-950'
        }
      }}/>
       <div className="w-full">
            <ChangePasswordCard classNames={{
               base: 'bg-black/10 ring ring-indigo-950 max-w-xl mx-auto',
               footer: 'bg-black/10 ring ring-indigo-950'
            }}/>
        </div>
        <div className="w-full">
            <DeleteAccountCard classNames={{
               base: 'bg-black/10 ring ring-indigo-950 max-w-xl mx-auto'
            }}/>
        </div>
    </div>
    
  )
}

export default Settings