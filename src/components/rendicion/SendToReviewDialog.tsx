'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SendToReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  module: string // 'anticipos' | 'asistencias' | 'mantenimiento'
  moduleLabel: string // 'Anticipos' | 'Asistencias' | 'Mantenimiento'
  itemId: string
  itemTitle: string
  submittedBy: string
  onSuccess?: () => void
}

export default function SendToReviewDialog({
  open, onOpenChange, module, moduleLabel, itemId, itemTitle, submittedBy, onSuccess,
}: SendToReviewDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAttachment(file)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setAttachmentUrl(data.url)
        setAttachmentName(file.name)
        toast({ title: 'Archivo subido', description: file.name })
      } else {
        toast({ title: 'Error', description: 'No se pudo subir el archivo', variant: 'destructive' })
        setAttachment(null)
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión al subir', variant: 'destructive' })
      setAttachment(null)
    } finally {
      setUploading(false)
    }
  }

  const handleSend = async () => {
    if (!attachmentUrl) {
      toast({ title: 'Adjunto obligatorio', description: 'Debe adjuntar un documento para enviar a revisión', variant: 'destructive' })
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/review-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module,
          itemId,
          itemTitle,
          submittedBy,
          attachmentUrl,
          attachmentName,
          notes,
        }),
      })

      if (res.ok) {
        toast({ title: 'Enviado a revisión', description: `"${itemTitle}" enviado al Administrador para revisión` })
        onOpenChange(false)
        setAttachment(null)
        setAttachmentUrl('')
        setAttachmentName('')
        setNotes('')
        onSuccess?.()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'No se pudo enviar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setAttachment(null)
      setAttachmentUrl('')
      setAttachmentName('')
      setNotes('')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" />
            Enviar a Revisión — {moduleLabel}
          </DialogTitle>
          <DialogDescription>
            Enviar &quot;{itemTitle}&quot; al Administrador para revisión. El adjunto es obligatorio.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Item info */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm font-medium">{itemTitle}</p>
            <p className="text-xs text-slate-500">Enviado por: {submittedBy}</p>
          </div>

          {/* Attachment — MANDATORY */}
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              Adjunto (OBLIGATORIO)
            </Label>
            {!attachmentUrl ? (
              <div className="mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-dashed border-2 h-12"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>Subiendo...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Seleccionar archivo (PDF, DOC, XLS, imagen)
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-700 flex-1 truncate">{attachmentName}</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setAttachment(null); setAttachmentUrl(''); setAttachmentName('') }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Comentarios para el Administrador..."
              rows={2}
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          <Button
            className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSend}
            disabled={!attachmentUrl || sending}
          >
            <Upload className="h-4 w-4" />
            {sending ? 'Enviando...' : 'Enviar a Revisión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
