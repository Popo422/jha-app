'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
          <CardTitle className="text-card-foreground text-center">Days Without Injury</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-card-foreground text-center">Days Without Injury</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center items-center space-x-6 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-card-foreground">{timeDisplay.days}</div>
            <div className="text-sm text-card-foreground">Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-card-foreground">{timeDisplay.hours}</div>
            <div className="text-sm text-card-foreground">Hours</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-card-foreground">{timeDisplay.minutes}</div>
            <div className="text-sm text-card-foreground">Minutes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-card-foreground">{timeDisplay.seconds}</div>
            <div className="text-sm text-card-foreground">Seconds</div>
          </div>
        </div>
        
        {showResetButton && (
          <div className="text-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Reset Timer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Injury Timer</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to reset the injury timer? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={resetTimer}>Reset Timer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  )
}