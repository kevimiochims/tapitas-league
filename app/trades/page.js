import { redirect } from 'next/navigation'

// A página foi renomeada para /transactions; links antigos continuam funcionando
export default function TradesRedirect() {
  redirect('/transactions')
}
