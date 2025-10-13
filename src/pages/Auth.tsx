import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Wrench } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters").optional(),
  tradeType: z.string().min(1, "Please select your trade").optional(),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [tradeType, setTradeType] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const validation = authSchema.pick({ email: true, password: true }).safeParse({ email, password });
        if (!validation.success) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: validation.error.errors[0].message,
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
      } else {
        const validation = authSchema.safeParse({ email, password, fullName, tradeType });
        if (!validation.success) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: validation.error.errors[0].message,
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              trade_type: tradeType,
            },
          },
        });
        
        if (error) throw error;
        
        toast({
          title: "Account created!",
          description: "Welcome to PartsMatch Pro.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "An error occurred during authentication",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-large">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Wrench className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isLogin ? "Welcome Back" : "Join PartsMatch Pro"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Sign in to connect with technicians"
              : "Create an account to find and list parts"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tradeType">Your Trade</Label>
                  <Select value={tradeType} onValueChange={setTradeType} required={!isLogin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your trade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone_repair">Phone Repair</SelectItem>
                      <SelectItem value="computer_tech">Computer Tech</SelectItem>
                      <SelectItem value="car_mechanic">Car Mechanic</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="appliance_repair">Appliance Repair</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="general">General/Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;