"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
  KeyRound,
  Users,
  Clock,
  Check,
  X,
} from "lucide-react";
import { useAdminUsers, useInvalidateUsers } from "@/hooks/use-users";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UserAvatar } from "@/components/shared/user-avatar";
import { CreateUserDrawer } from "@/components/users/create-user-drawer";
import { ResetPasswordDialog } from "@/components/users/reset-password-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { format, parseISO } from "date-fns";

const ALL = "__all__";

export default function TeamPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const { user: me } = useCurrentUser();
  const invalidate = useInvalidateUsers();

  const params = useMemo(
    () => ({
      q: q || undefined,
      role: role === ALL ? undefined : role,
      status: status === ALL ? undefined : status,
    }),
    [q, role, status]
  );

  const { data, isLoading } = useAdminUsers(params);
  const users = data?.users ?? [];

  // Always-visible queue of self-registered accounts waiting for approval.
  const { data: pendingData } = useAdminUsers({ approval: "pending" });
  const pendingUsers = pendingData?.users ?? [];

  function uid(u: { id?: string; _id?: string }): string {
    return u.id ?? u._id ?? "";
  }

  async function callRole(id: string, newRole: string) {
    try {
      const res = await fetch(`/api/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Action failed");
        return;
      }
      toast.success(newRole === "admin" ? "Promoted to admin" : "Demoted to member");
      invalidate();
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function callStatus(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Action failed");
        return;
      }
      toast.success(isActive ? "User reactivated" : "User deactivated");
      invalidate();
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function callApproval(id: string, action: "approve" | "reject") {
    try {
      const res = await fetch(`/api/users/${id}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Action failed");
        return;
      }
      toast.success(action === "approve" ? "User approved" : "User rejected");
      invalidate();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">Manage team members and roles</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add member
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email..."
            className="w-64 pl-8"
          />
        </div>
        <Select value={role} onValueChange={(v) => setRole(v ?? ALL)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v ?? ALL)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pendingUsers.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <h2 className="font-semibold">Pending approval</h2>
              <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                {pendingUsers.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {pendingUsers.map((u) => {
                const id = uid(u);
                return (
                  <div
                    key={id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-card/60 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar user={{ id, name: u.name, email: u.email, avatarColor: u.avatarColor }} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Signed up {u.createdAt ? format(parseISO(u.createdAt), "MMM d, yyyy") : "—"}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => callApproval(id, "reject")}>
                        <X className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                      <Button size="sm" onClick={() => callApproval(id, "approve")}>
                        <Check className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members found"
          description="Add a member or adjust your filters."
          action={<Button onClick={() => setDrawerOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add member</Button>}
        />
      ) : (
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Signed up</TableHead>
                  <TableHead className="hidden md:table-cell">Last login</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const id = uid(u);
                  const isSelf = id === me?.id;
                  return (
                    <TableRow key={id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar user={{ id, name: u.name, email: u.email, avatarColor: u.avatarColor }} />
                          <div>
                            <p className="font-medium">
                              {u.name}
                              {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            u.role === "admin"
                              ? "border-amber-500/40 text-amber-400"
                              : "text-muted-foreground"
                          }
                        >
                          {u.role === "admin" && <ShieldCheck className="mr-1 h-3 w-3" />}
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.approvalStatus === "pending" ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                            Pending approval
                          </Badge>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs ${u.isActive ? "text-emerald-400" : "text-red-400"}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {u.createdAt ? format(parseISO(u.createdAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {u.lastLoginAt
                          ? format(parseISO(u.lastLoginAt), "MMM d, yyyy HH:mm")
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSelf}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {u.role === "member" ? (
                              <DropdownMenuItem onClick={() => callRole(id, "admin")}>
                                <ShieldCheck className="mr-2 h-4 w-4" /> Promote to admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => callRole(id, "member")}>
                                <ShieldOff className="mr-2 h-4 w-4" /> Demote to member
                              </DropdownMenuItem>
                            )}
                            {u.isActive ? (
                              <DropdownMenuItem onClick={() => callStatus(id, false)}>
                                <UserX className="mr-2 h-4 w-4" /> Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => callStatus(id, true)}>
                                <UserCheck className="mr-2 h-4 w-4" /> Reactivate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setResetTarget({ id, name: u.name })}
                            >
                              <KeyRound className="mr-2 h-4 w-4" /> Reset password
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CreateUserDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      <ResetPasswordDialog
        userId={resetTarget?.id ?? null}
        userName={resetTarget?.name}
        open={!!resetTarget}
        onOpenChange={(o) => { if (!o) setResetTarget(null); }}
      />
    </div>
  );
}
