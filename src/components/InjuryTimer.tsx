'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

interface TimeDisplay {
  days: number
  hours: number
  minutes: number
  seconds: number
}

interface InjuryTimerProps {
  showResetButton?: boolean
}

export default function InjuryTimer({ showResetButton = false }: InjuryTimerProps) {
  const { t } = useTranslation('common');
  const [timeDisplay, setTimeDisplay] = useState<TimeDisplay>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [lastResetTime, setLastResetTime] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const calculateTimeElapsed = (startTime: Date): TimeDisplay => {
    const now = new Date()
    const diff = now.getTime() - startTime.getTime()
    
    const seconds = Math.floor(diff / 1000) % 60
    const minutes = Math.floor(diff / (1000 * 60)) % 60
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    return { days, hours, minutes, seconds }
  }

  const fetchTimerData = async () => {
    try {
      const response = await fetch('/api/injury-timer')
      if (response.ok) {
        const data = await response.json()
        const resetTime = new Date(data.lastResetTime)
        setLastResetTime(resetTime)
        setTimeDisplay(calculateTimeElapsed(resetTime))
      }
    } catch (error) {
      console.error('Failed to fetch timer data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetTimer = async () => {
    try {
      const response = await fetch('/api/injury-timer/reset', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        const resetTime = new Date(data.lastResetTime)
        setLastResetTime(resetTime)
        setTimeDisplay({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    } catch (error) {
      console.error('Failed to reset timer:', error)
    }
  }

  useEffect(() => {
    fetchTimerData()
  }, [])

  useEffect(() => {
    if (!lastResetTime) return

    const interval = setInterval(() => {
      setTimeDisplay(calculateTimeElapsed(lastResetTime))
    }, 1000)

    return () => clearInterval(interval)
  }, [lastResetTime])

  if (isLoading) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground text-center">{t('safety.daysWithoutInjury')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center space-x-6 mb-4">
            <div className="text-center">
              <Skeleton className="h-8 w-12 mb-2 mx-auto" />
              <Skeleton className="h-4 w-8 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-8 w-12 mb-2 mx-auto" />
              <Skeleton className="h-4 w-10 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-8 w-12 mb-2 mx-auto" />
              <Skeleton className="h-4 w-14 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-8 w-12 mb-2 mx-auto" />
              <Skeleton className="h-4 w-14 mx-auto" />
            </div>
          </div>
          {showResetButton && (
            <div className="text-center">
              <Skeleton className="h-9 w-24 mx-auto" />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-card-foreground text-center">{t('safety.daysWithoutInjury')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center items-center space-x-6 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-card-foreground">{timeDisplay.days}</div>
            <div className="text-sm text-card-foreground">{t('timeLabels.days')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-card-foreground">{timeDisplay.hours}</div>
            <div className="text-sm text-card-foreground">{t('timeLabels.hours')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-card-foreground">{timeDisplay.minutes}</div>
            <div className="text-sm text-card-foreground">{t('timeLabels.minutes')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-card-foreground">{timeDisplay.seconds}</div>
            <div className="text-sm text-card-foreground">{t('timeLabels.seconds')}</div>
          </div>
        </div>
        
        {showResetButton && (
          <div className="text-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
{t('safety.resetTimer')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('safety.resetInjuryTimer')}</AlertDialogTitle>
                  <AlertDialogDescription>
{t('safety.resetTimerConfirm')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={resetTimer}>{t('safety.resetTimer')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  )
}