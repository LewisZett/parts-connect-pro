import { useEffect, useRef } from "react";
import { usePiAuth } from "@/hooks/usePiAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PiSignInButtonProps {
  autoTrigger?: boolean;
  className?: string;
}

export function PiSignInButton({ autoTrigger = false, className }: PiSignInButtonProps) {
  const { session, loading, signIn, signOut } = usePiAuth();
  const { toast } = useToast();
  const autoTriedRef = useRef(false);

  useEffect(() => {
    if (!autoTrigger || autoTriedRef.current || session) return;
    autoTriedRef.current = true;
    (async () => {
      const result = await signIn();
      if (result) {
        toast({ title: "Pi Network", description: `Signed in as ${result.username}` });
      }
    })();
  }, [autoTrigger, session, signIn, toast]);

  const handleClick = async () => {
    if (session) {
      signOut();
      toast({ title: "Pi Network", description: "Signed out" });
      return;
    }
    const result = await signIn();
    if (result) {
      toast({ title: "Pi Network", description: `Signed in as ${result.username}` });
    } else {
      toast({
        variant: "destructive",
        title: "Pi sign-in failed",
        description: "Open this app inside the Pi Browser and try again.",
      });
    }
  };

  return (
    <Button onClick={handleClick} disabled={loading} className={className} variant="outline">
      {loading ? "Connecting…" : session ? `Pi: ${session.username}` : "Sign in with Pi"}
    </Button>
  );
}
