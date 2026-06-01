"use client"

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Percent,
  ShieldAlert,
  TrendingUp,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

type TransactionRow = {
  id: string
  type: string
  amount: number
  status: string
  paidAt: string | null
  failedAt: string | null
  createdAt: string
  payerName: string | null
  payerEmail: string | null
  coachName: string | null
  studentName: string | null
  packageName: string | null
  failureReason: string | null
}

type FailureReason = {
  reason: string
  count: number
}

type AdminPaymentsPanelProps = {
  totalTransactions: number
  paidTransactions: number
  pendingTransactions: number
  failedTransactions: number
  paymentSuccessRate: number
  failedRate: number
  totalRevenue: number
  monthRevenue: number
  recentPaid: TransactionRow[]
  recentPending: TransactionRow[]
  recentFailed: TransactionRow[]
  topFailureReasons: FailureReason[]
}

function formatCurrency(value: number): string {
  return `TL ${value.toLocaleString("tr-TR")}`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("tr-TR")
}

function txTypeLabel(type: string): string {
  return type === "coach_subscription" ? "Egitmen Kaydi" : "Ogrenci Paketi"
}

export default function AdminPaymentsPanel(props: AdminPaymentsPanelProps) {
  const stats = [
    {
      label: "Toplam Islem",
      value: String(props.totalTransactions),
      icon: CreditCard,
      color: "text-foreground",
    },
    {
      label: "Basarili",
      value: String(props.paidTransactions),
      icon: CheckCircle,
      color: "text-emerald-600",
    },
    {
      label: "Bekleyen",
      value: String(props.pendingTransactions),
      icon: Clock,
      color: "text-primary",
    },
    {
      label: "Basarisiz",
      value: String(props.failedTransactions),
      icon: XCircle,
      color: "text-destructive",
    },
    {
      label: "Basari Orani",
      value: `%${props.paymentSuccessRate}`,
      icon: Percent,
      sub: `Failed: %${props.failedRate}`,
      color: "text-foreground",
    },
  ]

  const defaultTab =
    props.recentPaid.length > 0
      ? "paid"
      : props.recentPending.length > 0
        ? "pending"
        : "failed"

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Odeme Yonetimi</h1>
        <p className="text-sm text-muted-foreground">
          Odeme operasyonlarini ayri bir modulde izleyin ve yonetin.
        </p>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/users"}>
          Kullanicilar
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/coaches"}>
          Egitmenler
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/pricing"}>
          Fiyatlandirma
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              {"sub" in stat && stat.sub && (
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue + Failure Summary */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4" />
              Gelir Ozeti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Toplam Ciro</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {formatCurrency(props.totalRevenue)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Bu Ay Ciro</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {formatCurrency(props.monthRevenue)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4" />
              En Sik Hata Nedenleri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {props.topFailureReasons.length > 0 ? (
              props.topFailureReasons.map((item) => (
                <div
                  key={item.reason}
                  className="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2"
                >
                  <p className="text-sm">{item.reason}</p>
                  <Badge variant="destructive" className="shrink-0">
                    {item.count}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Kayitli odeme hatasi bulunmuyor.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Tables */}
      <Card>
        <CardHeader>
          <CardTitle>Odeme Islem Detaylari</CardTitle>
          <CardDescription>
            Basarili, bekleyen ve basarisiz odemeler sekme bazinda listelenir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList variant="line" className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="paid">
                Basarili ({props.recentPaid.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Bekleyen ({props.recentPending.length})
              </TabsTrigger>
              <TabsTrigger value="failed">
                Basarisiz ({props.recentFailed.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paid" className="mt-4">
              {props.recentPaid.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tip</TableHead>
                      <TableHead>Odeme Yapan</TableHead>
                      <TableHead>Egitmen</TableHead>
                      <TableHead>Tutar</TableHead>
                      <TableHead>Tarih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {props.recentPaid.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              tx.type === "coach_subscription"
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-cyan-400/30 bg-cyan-50 text-cyan-700"
                            }
                          >
                            {txTypeLabel(tx.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p>{tx.payerName || "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {tx.payerEmail || "-"}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tx.coachName || "-"}
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-600">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(tx.paidAt || tx.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-6 text-sm text-muted-foreground text-center">
                  Basarili odeme kaydi yok.
                </p>
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              {props.recentPending.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tip</TableHead>
                      <TableHead>Kisi</TableHead>
                      <TableHead>Tutar</TableHead>
                      <TableHead>Olusma</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {props.recentPending.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground">
                          {txTypeLabel(tx.type)}
                        </TableCell>
                        <TableCell>{tx.payerName || "-"}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-6 text-sm text-muted-foreground text-center">
                  Bekleyen odeme bulunmuyor.
                </p>
              )}
            </TabsContent>

            <TabsContent value="failed" className="mt-4">
              {props.recentFailed.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tip</TableHead>
                      <TableHead>Kisi</TableHead>
                      <TableHead>Neden</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {props.recentFailed.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground">
                          {txTypeLabel(tx.type)}
                        </TableCell>
                        <TableCell>{tx.payerName || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-64 truncate">
                          {tx.failureReason || "Bilinmeyen hata"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-6 text-sm text-muted-foreground text-center">
                  Basarisiz odeme kaydi yok.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
