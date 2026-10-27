"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useInvalidateUsers } from "@/hooks/use-users";
import type { Role } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CreateUserDrawer({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <CreateUserForm onOpenChange={onOpenChange} />
      </SheetContent>
    </Sheet>
  );
}

function CreateUserForm({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const invalidate = useInvalidateUsers();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || password.length < 6) {
      toast.error("Please fill in name, email and a password of at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Could not create user");
        return;
      }
      toast.success(`${name} added to the team`);
      invalidate();
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SheetHeader className="border-b border-border/50 px-5 py-4">
        <SheetTitle>Add member</SheetTitle>
        <SheetDescription>Create a new account for a team member.</SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="u-name">Full name</Label>
          <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="u-email">Email</Label>
          <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="u-pw">Temporary password</Label>
          <div className="relative">
            <Input
              id="u-pw"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="pr-10"
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
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole((v ?? "member") as Role)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t border-border/50 px-5 py-3 flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add member
        </Button>
      </div>
    </>
  );
}
