"use client"

import {
  DollarSign,
  Save,
  ShieldAlert,
  ShieldCheck,
  Tag,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"

type CoachPlanDiscount = {
  enabled: boolean
  amount: number
}

type GlobalDiscount = {
  enabled: boolean
  amount: number
}

type AdminPricingPanelProps = {
  ok: string
  error: string
  isSuperAdmin: boolean
  canManagePricing: boolean
  monthlyPlanPrice: number
  monthlyPlanLabel: string
  yearlyPlanPrice: number
  yearlyPlanLabel: string
  globalDiscount: GlobalDiscount
  monthlyPlanDiscount: CoachPlanDiscount
  yearlyPlanDiscount: CoachPlanDiscount
}

export default function AdminPricingPanel(props: AdminPricingPanelProps) {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Fiyatlandirma Yonetimi
        </h1>
        <p className="text-sm text-muted-foreground">
          Plan fiyatlari ve kampanya kurallari bu modulde ayrica yonetilir.
        </p>
      </div>

      {/* Role Warning */}
      {!props.isSuperAdmin && (
        <Card size="sm" className="border-orange-300/60 bg-orange-50/80">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-orange-700">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Bu sayfada yalnizca goruntuleme yetkiniz var. Fiyat degisikligi
              super admin gerektirir.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Success/Error */}
      {props.ok && (
        <Card size="sm" className="border-emerald-300/60 bg-emerald-50/80">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-emerald-800">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Ayarlar basariyla kaydedildi.</span>
          </CardContent>
        </Card>
      )}
      {props.error && (
        <Card size="sm" className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{props.error}</span>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/coaches"}>
          Egitmenler
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin"}>
          Admin Ozet
        </Button>
      </div>

      {/* Global Discount */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="size-4" />
            Global Egitmen Abonelik Indirimi
          </CardTitle>
          <CardDescription>
            Landing ve egitmen odeme ekraninda gorunen ana indirim.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Mevcut durum:{" "}
              <span
                className={`ml-1 font-semibold ${
                  props.globalDiscount.enabled && props.globalDiscount.amount > 0
                    ? "text-emerald-600"
                    : "text-foreground"
                }`}
              >
                {props.globalDiscount.enabled && props.globalDiscount.amount > 0
                  ? `Aktif (-%${props.globalDiscount.amount})`
                  : "Pasif"}
              </span>
            </p>
          </div>

          <form method="POST" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="hidden" name="action" value="save_global_discount" />
            <div className="space-y-2">
              <Label htmlFor="global-amount">Indirim Orani (%)</Label>
              <input
                id="global-amount"
                type="number"
                name="amount"
                min={0}
                step={1}
                defaultValue={props.globalDiscount.amount}
                required
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="global-enabled">Durum</Label>
              <select
                id="global-enabled"
                name="enabled"
                required
                defaultValue={props.globalDiscount.enabled ? "true" : "false"}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={!props.canManagePricing}
                className="w-full justify-center gap-1.5"
              >
                <Save className="size-3.5" />
                Global Indirimi Kaydet
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="size-4" />
            Egitmen Abonelik Plan Fiyatlari
          </CardTitle>
          <CardDescription>
            Aylik ve yillik plan fiyatlarinin yonetimi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="POST" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="hidden" name="action" value="save_subscription_plans" />
            <div className="space-y-2">
              <Label htmlFor="monthly-price">Aylik Plan Fiyati (TL)</Label>
              <input
                id="monthly-price"
                type="number"
                name="monthlyPrice"
                min={1}
                step={1}
                defaultValue={props.monthlyPlanPrice}
                required
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <p className="text-xs text-muted-foreground">
                Mevcut: {props.monthlyPlanLabel}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearly-price">Yillik Plan Fiyati (TL)</Label>
              <input
                id="yearly-price"
                type="number"
                name="yearlyPrice"
                min={1}
                step={1}
                defaultValue={props.yearlyPlanPrice}
                required
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <p className="text-xs text-muted-foreground">
                Mevcut: {props.yearlyPlanLabel}
              </p>
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={!props.canManagePricing}
                className="w-full justify-center gap-1.5"
              >
                <Save className="size-3.5" />
                Plan Fiyatlarini Kaydet
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Plan Discounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="size-4" />
            Plan Bazli Kampanya Kurallari
          </CardTitle>
          <CardDescription>
            Aylik ve yillik planlar icin farkli kampanya tanimlayin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="POST" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="hidden" name="action" value="save_subscription_plan_discounts" />

            {/* Monthly Discount */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">Aylik Plan Kampanyasi</p>
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    name="monthlyEnabled"
                    defaultChecked={props.monthlyPlanDiscount.enabled}
                    className="accent-primary"
                  />
                  Aktif
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly-discount-amount">
                  Aylik Plan Indirim Orani (%)
                </Label>
                <input
                  id="monthly-discount-amount"
                  type="number"
                  min={0}
                  step={1}
                  name="monthlyAmount"
                  defaultValue={props.monthlyPlanDiscount.amount}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            {/* Yearly Discount */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">Yillik Plan Kampanyasi</p>
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    name="yearlyEnabled"
                    defaultChecked={props.yearlyPlanDiscount.enabled}
                    className="accent-primary"
                  />
                  Aktif
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearly-discount-amount">
                  Yillik Plan Indirim Orani (%)
                </Label>
                <input
                  id="yearly-discount-amount"
                  type="number"
                  min={0}
                  step={1}
                  name="yearlyAmount"
                  defaultValue={props.yearlyPlanDiscount.amount}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={!props.canManagePricing}
                className="gap-1.5"
              >
                <Save className="size-3.5" />
                Plan Kampanyalarini Kaydet
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
