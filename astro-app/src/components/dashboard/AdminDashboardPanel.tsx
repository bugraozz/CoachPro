"use client"

import {
  ArrowUpRight,
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
  Wrench,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type SalesDataPoint = {
  month: string
  revenue: number
  transactions: number
}

type RegistrationDataPoint = {
  day: string
  total: number
  coaches: number
  students: number
}

type MaintenanceModeState = {
  enabled: boolean
  message: string
  updatedAt: string | null
}

type AdminDashboardPanelProps = {
  ok: string
  error: string
  totalUsers: number
  totalCoaches: number
  totalStudents: number
  monthRevenue: number
  averageMonthlyRevenue: number
  newUsersLast7Days: number
  registrationsLast14Days: number
  coachRegistrationsLast14Days: number
  studentRegistrationsLast14Days: number
  salesData: SalesDataPoint[]
  registrationData: RegistrationDataPoint[]
  maintenanceMode: MaintenanceModeState
  defaultMaintenanceMessage: string
}

const salesChartConfig = {
  revenue: {
    label: "Gelir (TL)",
    color: "var(--chart-1)",
  },
  transactions: {
    label: "Islem Adedi",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const registrationChartConfig = {
  coaches: {
    label: "Egitmen",
    color: "var(--chart-3)",
  },
  students: {
    label: "Ogrenci",
    color: "var(--chart-4)",
  },
  total: {
    label: "Toplam",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

function formatCurrency(value: number): string {
  return `TL ${value.toLocaleString("tr-TR")}`
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

function resolveSuccessMessage(ok: string): string | null {
  if (!ok) {
    return null
  }

  if (ok === "maintenance-enabled") {
    return "Bakim modu aktif edildi."
  }

  if (ok === "maintenance-disabled") {
    return "Bakim modu kapatildi."
  }

  return "Islem basariyla tamamlandi."
}

function goTo(path: string) {
  if (typeof window !== "undefined") {
    window.location.href = path
  }
}

export default function AdminDashboardPanel(props: AdminDashboardPanelProps) {
  const okMessage = resolveSuccessMessage(props.ok)

  const updatedAtLabel = props.maintenanceMode.updatedAt
    ? new Date(props.maintenanceMode.updatedAt).toLocaleString("tr-TR")
    : null

  const registrationRows = [...props.registrationData].slice(-7).reverse()

  const averageTransactionsPerMonth = props.salesData.length > 0
    ? Math.round(
      props.salesData.reduce((sum, point) => sum + point.transactions, 0)
      / props.salesData.length,
    )
    : 0

  const peakRevenuePoint = props.salesData.reduce<SalesDataPoint | null>((best, point) => {
    if (!best || point.revenue > best.revenue) {
      return point
    }
    return best
  }, null)

  const hasSalesData = props.salesData.some((point) => point.revenue > 0 || point.transactions > 0)
  const hasRegistrationData = props.registrationData.some((point) => point.total > 0 || point.coaches > 0 || point.students > 0)
  const defaultChartTab = hasSalesData ? "sales" : "registrations"

  const quickActions = [
    { label: "Kullanicilar", path: "/admin/users" },
    { label: "Egitmenler", path: "/admin/coaches" },
    { label: "Odemeler", path: "/admin/payments" },
    { label: "Fiyatlandirma", path: "/admin/pricing" },
    { label: "Guvenlik", path: "/admin/security" },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {okMessage ? (
        <Card size="sm" className="border-emerald-300/60 bg-emerald-50/80">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-emerald-800">
            <ShieldCheck className="h-4 w-4" />
            <span>{okMessage}</span>
          </CardContent>
        </Card>
      ) : null}

      {props.error ? (
        <Card size="sm" className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4" />
            <span>{props.error}</span>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kullanici Sayisi</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-bold">{props.totalUsers}</p>
            <p className="text-xs text-muted-foreground">Ogrenci: {props.totalStudents}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Egitmen Sayisi</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-bold">{props.totalCoaches}</p>
            <p className="text-xs text-muted-foreground">Backoffice disi aktif egitmen hesaplari</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aylik Ciro</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-bold">{formatCurrency(props.monthRevenue)}</p>
            <p className="text-xs text-muted-foreground">
              Ortalama aylik: {formatCurrency(props.averageMonthlyRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Son 7 Gun Kayit</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-bold">+{props.newUsersLast7Days}</p>
            <p className="text-xs text-muted-foreground">14 gun toplam: {props.registrationsLast14Days}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {quickActions.map((action) => (
          <Card key={action.path} size="sm" className="border-border/70">
            <CardContent className="py-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="w-full justify-between"
                onClick={() => goTo(action.path)}
              >
                {action.label}
                <ArrowUpRight className="size-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grafik Paneli</CardTitle>
          <CardDescription>
            Grafikler shadcn chart bilesenleri ve Recharts katmani ile cizilir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultChartTab} className="w-full">
            <TabsList variant="line" className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="sales">Gelir Trendi</TabsTrigger>
              <TabsTrigger value="registrations">Kayit Trendi</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="mt-4 space-y-4">
              {hasSalesData ? (
                <ChartContainer config={salesChartConfig} className="h-80 w-full">
                  <AreaChart data={props.salesData} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                      yAxisId="revenue"
                      tickFormatter={(value) => `TL ${formatCompact(Number(value ?? 0))}`}
                      width={72}
                    />
                    <YAxis
                      yAxisId="transactions"
                      orientation="right"
                      allowDecimals={false}
                      width={32}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => {
                            if (name === "revenue") {
                              return [
                                `TL ${Number(value ?? 0).toLocaleString("tr-TR")}`,
                                "Gelir",
                              ]
                            }
                            return [Number(value ?? 0).toLocaleString("tr-TR"), "Islem"]
                          }}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area
                      yAxisId="revenue"
                      dataKey="revenue"
                      type="monotone"
                      stroke="var(--color-revenue)"
                      fill="var(--color-revenue)"
                      fillOpacity={0.22}
                      strokeWidth={2.5}
                    />
                    <Line
                      yAxisId="transactions"
                      dataKey="transactions"
                      type="monotone"
                      stroke="var(--color-transactions)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Henuz odenmis islem bulunmadigi icin gelir trendi grafigi olusmadi.
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">En Yuksek Gelir Ayi</p>
                  <p className="mt-1 text-lg font-semibold">{peakRevenuePoint?.month || "-"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(peakRevenuePoint?.revenue || 0)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Aylik Ortalama Islem</p>
                  <p className="mt-1 text-lg font-semibold">{averageTransactionsPerMonth}</p>
                  <p className="text-xs text-muted-foreground">Son 6 ay verisi</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Aylik Ortalama Gelir</p>
                  <p className="mt-1 text-lg font-semibold">{formatCurrency(props.averageMonthlyRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Son 6 ay ortalamasi</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="registrations" className="mt-4 space-y-4">
              {hasRegistrationData ? (
                <ChartContainer config={registrationChartConfig} className="h-80 w-full">
                  <BarChart data={props.registrationData} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} width={32} />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => {
                            if (name === "coaches") {
                              return [Number(value ?? 0).toLocaleString("tr-TR"), "Egitmen"]
                            }
                            if (name === "students") {
                              return [Number(value ?? 0).toLocaleString("tr-TR"), "Ogrenci"]
                            }
                            return [Number(value ?? 0).toLocaleString("tr-TR"), "Toplam"]
                          }}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="students"
                      stackId="registration"
                      fill="var(--color-students)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={26}
                    />
                    <Bar
                      dataKey="coaches"
                      stackId="registration"
                      fill="var(--color-coaches)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={26}
                    />
                    <Line
                      dataKey="total"
                      type="monotone"
                      stroke="var(--color-total)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Son 14 gun icinde yeni kayit bulunmuyor.
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">14 Gun Toplam Kayit</p>
                  <p className="mt-1 text-lg font-semibold">{props.registrationsLast14Days}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Egitmen Kayitlari</p>
                  <p className="mt-1 text-lg font-semibold">{props.coachRegistrationsLast14Days}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Ogrenci Kayitlari</p>
                  <p className="mt-1 text-lg font-semibold">{props.studentRegistrationsLast14Days}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Son 7 Gun Kayit Tablosu</CardTitle>
          <CardDescription>Gun bazinda toplam, egitmen ve ogrenci dagilimi</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
                <TableHead className="text-right">Egitmen</TableHead>
                <TableHead className="text-right">Ogrenci</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrationRows.map((row) => (
                <TableRow key={row.day}>
                  <TableCell className="font-medium">{row.day}</TableCell>
                  <TableCell className="text-right">{row.total}</TableCell>
                  <TableCell className="text-right">{row.coaches}</TableCell>
                  <TableCell className="text-right">{row.students}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-4" />
              Bakim Modu
            </CardTitle>
            <CardDescription>
              Aktif oldugunda admin hesaplari disindaki tum kullanicilar bakim mesaji gorur.
            </CardDescription>
          </div>
          <Badge variant={props.maintenanceMode.enabled ? "destructive" : "secondary"}>
            {props.maintenanceMode.enabled ? "Aktif" : "Pasif"}
          </Badge>
        </CardHeader>
        <CardContent>
          <form method="POST" className="space-y-4">
            <input type="hidden" name="action" value="toggle_maintenance_mode" />
            <input
              type="hidden"
              name="enabled"
              value={props.maintenanceMode.enabled ? "false" : "true"}
            />

            <div className="space-y-2">
              <Label htmlFor="maintenance-message">Bakim Mesaji</Label>
              <Textarea
                id="maintenance-message"
                name="message"
                defaultValue={props.maintenanceMode.message || props.defaultMaintenanceMessage}
                maxLength={200}
                required
                className="min-h-24"
              />
              <p className="text-xs text-muted-foreground">Maksimum 200 karakter.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Buton mevcut durumu tersine cevirir ve mesaji kaydeder.
              </p>
              <Button
                type="submit"
                variant={props.maintenanceMode.enabled ? "destructive" : "default"}
                className="sm:min-w-52"
              >
                {props.maintenanceMode.enabled ? "Bakim Modunu Kapat" : "Bakim Modunu Ac"}
              </Button>
            </div>
          </form>
        </CardContent>
        {updatedAtLabel ? (
          <CardFooter className="text-xs text-muted-foreground">
            Son degisiklik: {updatedAtLabel}
          </CardFooter>
        ) : null}
      </Card>
    </div>
  )
}
