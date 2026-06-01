"use client"

import {
  CheckCircle,
  Copy,
  Link2,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
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
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type BackofficeUser = {
  id: string
  name: string | null
  email: string | null
  role: string
  active: boolean
  createdAt: string
}

type InviteRow = {
  id: string
  email: string
  role: string
  invitedByUserId: string
  invitedByEmail: string | null
  acceptedByUserId: string | null
  acceptedAt: string | null
  expiresAt: string
  createdAt: string
}

type AdminSecurityPanelProps = {
  isSuperAdmin: boolean
  canManageSecurity: boolean
  infoMessage: string
  errorMessage: string
  generatedInviteLink: string
  generatedInviteEmail: string
  backofficeUsers: BackofficeUser[]
  pendingInvites: InviteRow[]
  acceptedInvites: InviteRow[]
  defaultTtlHours: number
}

function formatRoleLabel(role: string): string {
  if (role === "super_admin") return "Super Admin"
  if (role === "admin") return "Admin"
  if (role === "coach") return "Egitmen"
  return "Ogrenci"
}

export default function AdminSecurityPanel(props: AdminSecurityPanelProps) {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Admin Guvenlik ve Yetki
        </h1>
        <p className="text-sm text-muted-foreground">
          Backoffice hesaplar, davet akisi ve yetki dagitimi burada yonetilir.
        </p>
      </div>

      {/* Role Warning */}
      {!props.isSuperAdmin && (
        <Card size="sm" className="border-orange-300/60 bg-orange-50/80">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-orange-700">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Bu sayfada yalnizca goruntuleme yetkiniz var. Davet olusturma ve
              iptal islemleri super admin gerektirir.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Success/Error */}
      {props.infoMessage && (
        <Card size="sm" className="border-emerald-300/60 bg-emerald-50/80">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-emerald-800">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{props.infoMessage}</span>
          </CardContent>
        </Card>
      )}
      {props.errorMessage && (
        <Card size="sm" className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{props.errorMessage}</span>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin"}>
          Admin Ozet
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/users"}>
          Kullanicilar
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/coaches"}>
          Egitmenler
        </Button>
      </div>

      {/* Generated Invite Link */}
      {props.generatedInviteLink && (
        <Card className="border-emerald-300/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-4" />
              Yeni Davet Linki
            </CardTitle>
            <CardDescription>
              Hedef hesap:{" "}
              <span className="font-semibold text-foreground">
                {props.generatedInviteEmail}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs break-all font-mono">
              {props.generatedInviteLink}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backoffice Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-4" />
            Backoffice Kullanicilari
          </CardTitle>
          <CardDescription>
            Admin ve super admin rollerinin mevcut dagilimi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.backofficeUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanici</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Kayit Tarihi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.backofficeUsers.map((item) => (
                  <TableRow key={item.id} className="align-top">
                    <TableCell>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.role === "super_admin" ? "default" : "secondary"
                        }
                      >
                        {formatRoleLabel(item.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.active ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700"
                        >
                          <CheckCircle className="size-3" />
                          Aktif
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="gap-1 border-gray-300 bg-gray-50 text-gray-600"
                        >
                          Pasif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("tr-TR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Henuz tanimli backoffice hesabi bulunmuyor.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create Admin Invite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-4" />
            Admin Daveti Olustur
          </CardTitle>
          <CardDescription>
            Yalnizca mevcut kayitli hesaplara davet gonderilir. Kendi kendine rol
            yukseltme kapatilidir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="POST" className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="hidden" name="action" value="create_admin_invite" />

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="invite-email">Kullanici E-postasi</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  id="invite-email"
                  type="email"
                  name="email"
                  placeholder="kullanici@ornek.com"
                  required
                  disabled={!props.canManageSecurity}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent pl-8 pr-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Rol</Label>
              <select
                id="invite-role"
                name="role"
                required
                disabled={!props.canManageSecurity}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-ttl">Sure (Saat)</Label>
              <input
                id="invite-ttl"
                type="number"
                name="ttlHours"
                min={1}
                max={168}
                defaultValue={props.defaultTtlHours}
                required
                disabled={!props.canManageSecurity}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              />
            </div>

            <div className="md:col-span-4 flex justify-end">
              <Button type="submit" disabled={!props.canManageSecurity} className="gap-1.5">
                <UserPlus className="size-3.5" />
                Admin Daveti Olustur
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      <Card>
        <CardHeader>
          <CardTitle>Bekleyen Davetler</CardTitle>
          <CardDescription>
            Suresi dolmamis ve henuz kabul edilmemis davetler.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.pendingInvites.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Olusturan</TableHead>
                  <TableHead>Olusturma</TableHead>
                  <TableHead>Bitis</TableHead>
                  <TableHead>Aksiyon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.pendingInvites.map((invite) => (
                  <TableRow key={invite.id} className="align-top">
                    <TableCell className="font-medium">
                      {invite.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatRoleLabel(invite.role || "admin")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invite.invitedByEmail || invite.invitedByUserId}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invite.createdAt).toLocaleString("tr-TR")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleString("tr-TR")}
                    </TableCell>
                    <TableCell>
                      <form method="POST">
                        <input type="hidden" name="action" value="revoke_admin_invite" />
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <Button
                          type="submit"
                          size="xs"
                          variant="destructive"
                          disabled={!props.canManageSecurity}
                        >
                          <XCircle className="size-3" />
                          Iptal Et
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Bekleyen admin daveti bulunmuyor.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Accepted Invites */}
      <Card>
        <CardHeader>
          <CardTitle>Son Kabul Edilen Davetler</CardTitle>
        </CardHeader>
        <CardContent>
          {props.acceptedInvites.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Kabul Eden</TableHead>
                  <TableHead>Kabul Tarihi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.acceptedInvites.map((invite) => (
                  <TableRow key={invite.id} className="align-top">
                    <TableCell className="font-medium">
                      {invite.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatRoleLabel(invite.role || "admin")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invite.acceptedByUserId || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invite.acceptedAt
                        ? new Date(invite.acceptedAt).toLocaleString("tr-TR")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Henuz kabul edilen admin daveti bulunmuyor.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
