"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

interface Props {
  userId: string | null;
  userName?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ResetPasswordDialog({ userId, userName, open, onOpenChange }: Props) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!userId) return;
    if (pw.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: pw }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Could not reset password");
        return;
      }
      toast.success(`Password reset for ${userName ?? "user"}`);
      setPw("");
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {userName ?? "this user"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reset-pw">New password</Label>
          <div className="relative">
            <Input
              id="reset-pw"
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="At least 6 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Toggle password visibility"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reset password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
