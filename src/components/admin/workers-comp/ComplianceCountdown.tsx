"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface ComplianceCountdownProps {
  createdAt: string;
}

export default function ComplianceCountdown({ createdAt }: ComplianceCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Calculate countdown from 8 days after submission down to zero
  useEffect(() => {
    const calculateTimeLeft = () => {
      const submissionDate = new Date(createdAt);
      const now = new Date();
      const timeSinceSubmission = now.getTime() - submissionDate.getTime();
      
      // 8 days in milliseconds
      const eightDaysInMs = 8 * 24 * 60 * 60 * 1000;
      
      // Calculate remaining time (8 days minus time elapsed)
      const remainingTime = eightDaysInMs - timeSinceSubmission;

      if (remainingTime > 0) {
        const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
        
        return { days, hours, minutes, seconds };
      } else {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [createdAt]);

  return (
    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-medium text-blue-900 dark:text-blue-100">Compliance Countdown</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white dark:bg-gray-800 rounded p-2 border">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{timeLeft.days.toString().padStart(2, '0')}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Days</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded p-2 border">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{timeLeft.minutes.toString().padStart(2, '0')}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Minutes</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded p-2 border">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{timeLeft.seconds.toString().padStart(2, '0')}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Seconds</div>
        </div>
      </div>
    </div>
  );
}