"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ShieldCheck, Save } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UserAvatar } from "@/components/shared/user-avatar";

export function ProfileView() {
  const { user, isLoading } = useCurrentUser();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [nameInit, setNameInit] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-accent animate-pulse rounded-md" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 bg-accent animate-pulse rounded-xl" />
          <div className="h-72 bg-accent animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Initialize name once the user data loads (controlled input)
  const displayName = nameInit ? name : user.name;
  const nameChanged = nameInit && name.trim() !== "" && name.trim() !== user.name;

  async function saveName() {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Could not update profile");
        return;
      }
      toast.success("Profile updated");
      setNameInit(false);
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword() {
    if (newPw.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match");
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Could not change password");
        return;
      }
      toast.success("Password changed");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Account */}
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Your public details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <UserAvatar user={{ id: user.id, name: user.name, email: user.email }} size="lg" />
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <Badge
                  variant="outline"
                  className={`mt-1.5 ${user.role === "admin" ? "border-amber-500/40 text-amber-400" : "text-muted-foreground"}`}
                >
                  {user.role === "admin" && <ShieldCheck className="mr-1 h-3 w-3" />}
                  {user.role}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-name">Full name</Label>
              <Input
                id="pf-name"
                value={displayName}
                onChange={(e) => {
                  if (!nameInit) setNameInit(true);
                  setName(e.target.value);
                }}
              />
            </div>

            <Button onClick={saveName} disabled={savingName || !nameChanged}>
              {savingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Security</CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pf-current">Current password</Label>
              <Input
                id="pf-current"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-new">New password</Label>
              <div className="relative">
                <Input
                  id="pf-new"
                  type={showPw ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-confirm">Confirm new password</Label>
              <Input
                id="pf-confirm"
                type={showPw ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <Button
              onClick={savePassword}
              disabled={savingPw || !currentPw || !newPw || !confirmPw}
            >
              {savingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
