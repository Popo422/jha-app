'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/lib/hooks'
import { loginSuccess } from '@/lib/features/auth/authSlice'
import { useLoginMutation } from '@/lib/features/auth/authApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { t, i18n } = useTranslation('common')
  const [contractorCode, setContractorCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [error, setError] = useState('')
  const dispatch = useAppDispatch()
  const [login, { isLoading }] = useLoginMutation()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const result = await login({ contractorCode }).unwrap()
      
      // Apply contractor's language preference immediately
      if (result.contractor?.language) {
        console.log(`🌐 Setting language to: ${result.contractor.language}`)
        await i18n.changeLanguage(result.contractor.language)
      }
      
      // Update Redux state with login data
      dispatch(loginSuccess(result))
      
      // Login successful, redirect to contractor forms page
      console.log('Login successful, redirecting to contractor forms...')
      router.push('/contractor-forms')
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.data?.error || 'Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card className="border rounded-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">{t('auth.contractorLogin')}</CardTitle>
            <CardDescription className="text-center">
              {t('auth.loginDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contractorCode">{t('auth.contractorCode')}</Label>
                <div className="relative">
                  <Input
                    id="contractorCode"
                    type={showCode ? 'text' : 'password'}
                    placeholder={t('placeholders.enterContractorCode')}
                    value={contractorCode}
                    onChange={(e) => setContractorCode(e.target.value)}
                    className={error ? 'border-destructive' : ''}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCode(!showCode)}
                  >
                    {showCode ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? t('common.loggingIn') : t('auth.login')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}