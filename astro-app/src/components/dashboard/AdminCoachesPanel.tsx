"use client"

import {
  CheckCircle,
  Crown,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserMinus,
  Users,
  XCircle,
  Zap,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type CoachRow = {
  id: string
  name: string | null
  email: string | null
  active: boolean
  referralCode: string | null
  subscriptionStatus: string | null
  subscriptionEnd: string | null
  createdAt: string
  studentCount: number
}

type CoachDiscount = {
  enabled: boolean
  amount: number
  updatedAt: string | null
  updatedBy: string | null
}

type AdminCoachesPanelProps = {
  ok: string
  error: string
  isSuperAdmin: boolean
  canManageSensitive: boolean
  canManageCoachActivation: boolean
  totalCoaches: number
  activeCoaches: number
  passiveCoaches: number
  coachesWithStudents: number
  coaches: CoachRow[]
  coachDiscountById: Record<string, CoachDiscount>
}

export default function AdminCoachesPanel(props: AdminCoachesPanelProps) {
  const stats = [
    {
      label: "Toplam Egitmen",
      value: props.totalCoaches,
      icon: Users,
      color: "text-foreground",
    },
    {
      label: "Aktif Hesap",
      value: props.activeCoaches,
      icon: UserCheck,
      color: "text-emerald-600",
    },
    {
      label: "Pasif Hesap",
      value: props.passiveCoaches,
      icon: UserMinus,
      color: "text-destructive",
    },
    {
      label: "Ogrencisi Olan",
      value: props.coachesWithStudents,
      icon: Crown,
      color: "text-foreground",
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Egitmen Yonetimi</h1>
        <p className="text-sm text-muted-foreground">
          Egitmen hesaplari, ucretsiz aktivasyon ve egitmene ozel indirim yonetimi.
        </p>
      </div>

      {/* Role Warning */}
      {!props.isSuperAdmin && (
        <Card size="sm" className="border-orange-300/60 bg-orange-50/80">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-orange-700">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Ucretsiz aktivasyon islemleri admin rolunde de acik. Hesap
              aktif/pasif ve indirim duzenleme islemleri super admin gerektirir.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Success/Error */}
      {props.ok && (
        <Card size="sm" className="border-emerald-300/60 bg-emerald-50/80">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-emerald-800">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Islem basariyla tamamlandi.</span>
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
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/users"}>
          Kullanicilar
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/pricing"}>
          Fiyatlandirma
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin"}>
          Admin Ozet
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coach Table */}
      <Card>
        <CardHeader>
          <CardTitle>Egitmen Listesi ve Islem Paneli</CardTitle>
          <CardDescription>
            Her egitmen icin abonelik, indirim ve hesap durumu yonetimi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.coaches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Egitmen</TableHead>
                  <TableHead>Abonelik</TableHead>
                  <TableHead>Aktivasyon Bitisi</TableHead>
                  <TableHead>Ogrenci</TableHead>
                  <TableHead>Referral</TableHead>
                  <TableHead>Ucretsiz Aktivasyon</TableHead>
                  <TableHead>Paket Indirimi</TableHead>
                  <TableHead>Hesap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.coaches.map((coach) => {
                  const discount = props.coachDiscountById[coach.id] || {
                    enabled: false,
                    amount: 0,
                    updatedAt: null,
                    updatedBy: null,
                  }
                  const hasEnd = Boolean(coach.subscriptionEnd)
                  const expired =
                    hasEnd && new Date(coach.subscriptionEnd!) <= new Date()

                  return (
                    <TableRow key={coach.id} className="align-top">
                      <TableCell>
                        <p className="font-medium">{coach.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {coach.email}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {coach.subscriptionStatus || "pending"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {coach.subscriptionStatus === "active"
                            ? "Odeme istenmez"
                            : "Odeme adimi gerekli olabilir"}
                        </p>
                      </TableCell>
                      <TableCell>
                        {hasEnd ? (
                          <div>
                            <p className="text-sm">
                              {new Date(coach.subscriptionEnd!).toLocaleDateString("tr-TR")}
                            </p>
                            <p className={`text-xs mt-0.5 ${expired ? "text-destructive" : "text-emerald-600"}`}>
                              {expired ? "Suresi dolmus" : "Aktif donem"}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p>Suresiz</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Manuel aktivasyon
                            </p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {coach.studentCount}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {coach.referralCode || "-"}
                      </TableCell>
                      <TableCell>
                        <form method="POST" className="space-y-2">
                          <input type="hidden" name="action" value="grant_free_coach_access" />
                          <input type="hidden" name="coachId" value={coach.id} />
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              name="months"
                              min={1}
                              max={36}
                              defaultValue={1}
                              className="h-7 w-14 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                            />
                            <Button
                              type="submit"
                              size="xs"
                              disabled={!props.canManageCoachActivation}
                            >
                              <Zap className="size-3" />
                              Aktif Et
                            </Button>
                          </div>
                          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              name="permanent"
                              value="true"
                              className="accent-primary"
                            />
                            Suresiz aktif et
                          </label>
                        </form>
                      </TableCell>
                      <TableCell>
                        <form method="POST" className="space-y-2">
                          <input type="hidden" name="action" value="save_coach_discount" />
                          <input type="hidden" name="coachId" value={coach.id} />
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              name="amount"
                              min={0}
                              step={1}
                              defaultValue={discount.amount}
                              required
                              className="h-7 w-16 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                            />
                            <select
                              name="enabled"
                              required
                              className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                              defaultValue={discount.enabled ? "true" : "false"}
                            >
                              <option value="true">Aktif</option>
                              <option value="false">Pasif</option>
                            </select>
                          </div>
                          <Button
                            type="submit"
                            size="xs"
                            variant="outline"
                            disabled={!props.canManageSensitive}
                          >
                            Indirimi Kaydet
                          </Button>
                        </form>
                      </TableCell>
                      <TableCell>
                        <form method="POST">
                          <input type="hidden" name="action" value="toggle_user_active" />
                          <input type="hidden" name="userId" value={coach.id} />
                          <input type="hidden" name="nextState" value={coach.active ? "0" : "1"} />
                          <Button
                            type="submit"
                            size="xs"
                            variant={coach.active ? "destructive" : "default"}
                            disabled={!props.canManageSensitive}
                            className={coach.active ? "" : "bg-emerald-600 text-white hover:bg-emerald-700"}
                          >
                            {coach.active ? (
                              <>
                                <XCircle className="size-3" />
                                Pasif Yap
                              </>
                            ) : (
                              <>
                                <CheckCircle className="size-3" />
                                Aktif Yap
                              </>
                            )}
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Egitmen kaydi bulunamadi.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
