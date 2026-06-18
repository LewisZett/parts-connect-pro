import { useEffect, useRef } from "react";
import { usePiAuth } from "@/hooks/usePiAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import { ButtonProps } from "@/components/ui/button";

interface PiSignInButtonProps {
  autoTrigger?: boolean;
  className?: string;
  size?: ButtonProps["size"];
}

export function PiSignInButton({ autoTrigger = false, className, size }: PiSignInButtonProps) {
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
    <Button
      onClick={handleClick}
      disabled={loading}
      className={`bg-purple-600 text-white border-purple-600 hover:bg-purple-700 hover:text-white hover:border-purple-700 ${className || ""}`}
      size={size}
    >
      {loading ? "Connecting…" : session ? `Pi: ${session.username}` : "Sign in with Pi"}
    </Button>
  );
}
