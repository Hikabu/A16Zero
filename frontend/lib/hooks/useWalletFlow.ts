import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import bs58 from 'bs58'

export function useWalletFlow(
  challengeFn: () => Promise<{ message?: string, challenge?: string }>, 
  submitFn: (data: { signature: string, publicKey: string }) => Promise<any>
) {
  const wallet = useWallet()
  const [status, setStatus] = useState<'idle' | 'challenging' | 'signing' | 'submitting' | 'done' | 'error'>('idle')

  const trigger = async () => {
    if (!wallet.publicKey || !wallet.signMessage) {
      console.error("Wallet not connected or doesn't support signing")
      return
    }

    try {
      setStatus('challenging')
      const challengeRes = await challengeFn()
      const messageToSign = challengeRes.message || challengeRes.challenge
      if (!messageToSign) throw new Error("No challenge message received")
      
      setStatus('signing')
      const sig = await wallet.signMessage(new TextEncoder().encode(messageToSign))
      
      setStatus('submitting')
      await submitFn({ signature: bs58.encode(sig), publicKey: wallet.publicKey.toBase58() })
      
      setStatus('done')
    } catch (error) {
      console.error("Wallet flow error:", error)
      setStatus('error')
      // Reset after a short delay so they can try again
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return { trigger, status }
}
