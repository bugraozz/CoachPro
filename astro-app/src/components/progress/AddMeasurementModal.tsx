"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

interface Props {
  clientId?: string
  onSuccess?: () => void
}

export function AddMeasurementModal({ clientId, onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [weight, setWeight] = useState("")
  
  const [measurements, setMeasurements] = useState({
    chest: "",
    waist: "",
    hip: "",
    armLeft: "",
    armRight: "",
    legLeft: "",
    legRight: "",
    bodyFat: "",
    neck: "",
    shoulders: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!weight && !Object.values(measurements).some(v => v !== "")) {
        toast.error('Lütfen en az bir değer giriniz.')
        return
    }

    setLoading(true)

    try {
      // 1. Kilo kaydı
      if (weight) {
        const weightRes = await fetch('/api/weight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, weight })
        })
        if (!weightRes.ok) throw new Error('Kilo kaydedilemedi')
      }

      // 2. Ölçüm kaydı (en az bir ölçüm varsa)
      const hasMeasurements = Object.values(measurements).some(v => v !== "")
      if (hasMeasurements) {
        const measRes = await fetch('/api/measurements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            ...Object.fromEntries(
              Object.entries(measurements)
                .filter(([_, v]) => v !== "")
                .map(([k, v]) => [k, parseFloat(v)])
            )
          })
        })
        if (!measRes.ok) throw new Error('Ölçümler kaydedilemedi')
      }

      toast.success('Kayıt başarıyla eklendi')
      setOpen(false)
      
      // Reset form
      setWeight("")
      setMeasurements({
        chest: "", waist: "", hip: "", armLeft: "", armRight: "",
        legLeft: "", legRight: "", bodyFat: "", neck: "", shoulders: ""
      })

      if (onSuccess) onSuccess()
      else {
        // Astro sayfasını yenile
        window.location.reload()
      }
    } catch (err: any) {
      toast.error(err.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button className="gap-1.5 h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
          <PlusIcon className="size-4" />
          <span className="hidden sm:inline">Yeni Ölçüm Ekle</span>
          <span className="sm:hidden">Ekle</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Yeni Ölçüm & Kilo Ekle</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Kilo (kg)</Label>
              <Input 
                id="weight" 
                type="number" 
                step="0.1" 
                value={weight} 
                onChange={e => setWeight(e.target.value)} 
                placeholder="00.0"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bodyFat">Vücut Yağı (%)</Label>
              <Input 
                id="bodyFat" 
                type="number" 
                step="0.1" 
                value={measurements.bodyFat} 
                onChange={e => setMeasurements({...measurements, bodyFat: e.target.value})} 
                placeholder="0.0"
                className="h-10"
              />
            </div>
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="bg-popover px-2 text-muted-foreground">Vücut Ölçüleri (cm)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {[
              { id: 'chest', label: 'Göğüs' },
              { id: 'waist', label: 'Bel' },
              { id: 'hip', label: 'Kalça' },
              { id: 'neck', label: 'Boyun' },
              { id: 'shoulders', label: 'Omuz' },
              { id: 'armLeft', label: 'Sol Kol' },
              { id: 'armRight', label: 'Sağ Kol' },
              { id: 'legLeft', label: 'Sol Bacak' },
              { id: 'legRight', label: 'Sağ Bacak' },
            ].map(field => (
              <div key={field.id} className="space-y-1.5">
                <Label htmlFor={field.id} className="text-xs text-muted-foreground uppercase font-semibold">{field.label}</Label>
                <Input 
                  id={field.id} 
                  type="number" 
                  step="0.1" 
                  value={measurements[field.id as keyof typeof measurements]} 
                  onChange={e => setMeasurements({...measurements, [field.id]: e.target.value})} 
                  placeholder="0.0"
                  className="h-9"
                />
              </div>
            ))}
          </div>

          <DialogFooter className="pt-6">
            <Button type="submit" disabled={loading} className="w-full h-11 text-base">
              {loading ? (
                <>
                  <Loader2Icon className="mr-2 size-5 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'Kaydı Tamamla'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
