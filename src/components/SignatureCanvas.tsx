'use client'

import { useRef, useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Trash2 } from 'lucide-react'

interface SignatureCanvasProps {
  onSignatureChange: (signature: string) => void
  className?: string
}

export default function SignatureCanvas({ onSignatureChange, className = "" }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    context.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Set drawing style
    context.strokeStyle = '#000000'
    context.lineWidth = 2
    context.lineCap = 'round'
    context.lineJoin = 'round'
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const context = canvas.getContext('2d')
    if (!context) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    context.beginPath()
    context.moveTo(
      clientX - rect.left,
      clientY - rect.top
    )
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const context = canvas.getContext('2d')
    if (!context) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    context.lineTo(
      clientX - rect.left,
      clientY - rect.top
    )
    context.stroke()

    if (!hasSignature) {
      setHasSignature(true)
    }
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    const canvas = canvasRef.current
    if (!canvas) return

    // Convert canvas to base64 and notify parent
    const signatureData = canvas.toDataURL('image/png')
    onSignatureChange(signatureData)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onSignatureChange('')
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Digital Signature</label>
            {hasSignature && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSignature}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
          
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair touch-none"
              style={{ width: '100%', height: '192px' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-gray-400 text-sm">Sign here</span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500">
            Draw your signature above using your mouse or finger
          </p>
        </div>
      </CardContent>
    </Card>
  )
}