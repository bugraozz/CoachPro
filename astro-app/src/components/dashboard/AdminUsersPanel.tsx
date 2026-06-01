"use client"

import {
  CheckCircle,
  Clock,
  Gift,
  ShieldAlert,
  ShieldCheck,
  Timer,
  UserCheck,
  UserMinus,
  Users,
  XCircle,
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

type StudentRow = {
  id: string
  name: string | null
  email: string | null
  active: boolean
  createdAt: string
  studentPaymentStatus: string | null
  studentAccessEnd: string | null
  coach: { id: string; name: string | null } | null
}

type AdminUsersPanelProps = {
  ok: string
  error: string
  isSuperAdmin: boolean
  canManageSensitive: boolean
  canManageMembership: boolean
  totalStudents: number
  activeStudents: number
  passiveStudents: number
  paidStudents: number
  pendingStudents: number
  students: StudentRow[]
}

export default function AdminUsersPanel(props: AdminUsersPanelProps) {
  const stats = [
    {
      label: "Toplam Ogrenci",
      value: props.totalStudents,
      icon: Users,
      color: "text-foreground",
    },
    {
      label: "Aktif Hesap",
      value: props.activeStudents,
      icon: UserCheck,
      color: "text-emerald-600",
    },
    {
      label: "Pasif Hesap",
      value: props.passiveStudents,
      icon: UserMinus,
      color: "text-destructive",
    },
    {
      label: "Odeme Bekleyen",
      value: props.pendingStudents,
      icon: Clock,
      color: "text-orange-500",
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Kullanici Yonetimi</h1>
        <p className="text-sm text-muted-foreground">
          Bu modul sadece ogrenci hesaplari ve durum yonetimi icin ayrilmistir.
        </p>
      </div>

      {/* Role Warning */}
      {!props.isSuperAdmin && (
        <Card size="sm" className="border-orange-300/60 bg-orange-50/80">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-orange-700">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Hesap aktif/pasif islemleri super admin gerektirir. Uyelik uzatma
              ve ucretsiz uyelik islemleri admin rolunde de kullanilabilir.
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
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/coaches"}>
          Egitmenler
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/payments"}>
          Odemeler
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin"}>
          Admin Ozet
        </Button>
      </div>

      {/* Stats Cards */}
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

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ogrenci Kullanici Listesi</CardTitle>
          <CardDescription>
            Kullanici ve bagli egitmen gorunumu, hesap aktif/pasif kontrolu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.students.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ogrenci</TableHead>
                  <TableHead>Egitmen</TableHead>
                  <TableHead>Odeme</TableHead>
                  <TableHead>Uyelik Bitisi</TableHead>
                  <TableHead>Kayit</TableHead>
                  <TableHead>Uyelik Islemleri</TableHead>
                  <TableHead>Hesap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.students.map((student) => {
                  const accessEnd = student.studentAccessEnd
                    ? new Date(student.studentAccessEnd)
                    : null
                  const accessActive = accessEnd ? accessEnd > new Date() : false

                  return (
                    <TableRow key={student.id} className="align-top">
                      <TableCell>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.coach?.name || "-"}
                      </TableCell>
                      <TableCell>
                        {student.studentPaymentStatus === "paid" ? (
                          <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700">
                            <CheckCircle className="size-3" />
                            Odendi
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 border-orange-300 bg-orange-50 text-orange-700">
                            <Timer className="size-3" />
                            Bekliyor
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {accessEnd ? (
                          <div>
                            <p className="text-sm">
                              {accessEnd.toLocaleDateString("tr-TR")}
                            </p>
                            <p className={`text-xs mt-0.5 ${accessActive ? "text-emerald-600" : "text-destructive"}`}>
                              {accessActive ? "Aktif erisim" : "Suresi dolmus"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Belirlenmedi</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(student.createdAt).toLocaleDateString("tr-TR")}
                      </TableCell>
                      <TableCell>
                        <form method="POST" className="flex flex-wrap items-center gap-1.5">
                          <input type="hidden" name="action" value="update_student_membership" />
                          <input type="hidden" name="userId" value={student.id} />
                          <input
                            type="number"
                            name="days"
                            min={1}
                            max={36500}
                            defaultValue={30}
                            required
                            className="h-7 w-16 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                          />
                          <select
                            name="membershipType"
                            required
                            className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            <option value="extend">Uzat</option>
                            <option value="gift">Hediye Et</option>
                          </select>
                          <Button
                            type="submit"
                            size="xs"
                            disabled={!props.canManageMembership}
                          >
                            <Gift className="size-3" />
                            Uygula
                          </Button>
                        </form>
                      </TableCell>
                      <TableCell>
                        <form method="POST">
                          <input type="hidden" name="action" value="toggle_user_active" />
                          <input type="hidden" name="userId" value={student.id} />
                          <input type="hidden" name="nextState" value={student.active ? "0" : "1"} />
                          <Button
                            type="submit"
                            size="xs"
                            variant={student.active ? "destructive" : "default"}
                            disabled={!props.canManageSensitive}
                            className={student.active ? "" : "bg-emerald-600 text-white hover:bg-emerald-700"}
                          >
                            {student.active ? (
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
              Ogrenci kaydi bulunamadi.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
