import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, User, Share2, Lock, Mail, Trash2 } from "lucide-react";

const sections = [
  {
    icon: FileText,
    title: "Introduction",
    content: `PARTSPRO ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our smart spares marketplace platform.

By using PARTSPRO, you consent to the data practices described in this policy. If you do not agree with the terms of this Privacy Policy, please do not access the application.`
  },
  {
    icon: User,
    title: "Information We Collect",
    content: `We collect the following types of information:

• Personal Information: Name, email address, phone number, and trade/profession details provided during registration.
• Listing Information: Part descriptions, photos, prices, locations, and categories you submit when listing items.
• Usage Data: Information on how you interact with the platform, including search queries, matches, and messages.
• Device Information: IP address, browser type, device type, and operating system for security and analytics.`
  },
  {
    icon: Lock,
    title: "How We Use Your Information",
    content: `We use your information to:

• Provide and maintain the PARTSPRO marketplace services.
• Match buyers with sellers based on part requests and listings.
• Facilitate communication between matched users.
• Process payments and transactions securely.
• Send important notifications about your account, listings, and matches.
• Improve our AI matching algorithms and platform functionality.
• Detect and prevent fraud, abuse, and security incidents.`
  },
  {
    icon: Share2,
    title: "Information Sharing",
    content: `We do not sell your personal information. We may share your information only in the following circumstances:

• With Other Users: When a match is confirmed, your contact information (email/phone) is shared with the matched party to facilitate the transaction.
• Service Providers: With trusted third-party vendors who assist in operating our platform (e.g., payment processors, cloud hosting).
• Legal Requirements: When required by law, court order, or to protect our rights, property, or safety.
• Business Transfers: In connection with a merger, acquisition, or sale of assets.`
  },
  {
    icon: Shield,
    title: "Data Security",
    content: `We implement robust security measures to protect your data:

• All data is encrypted in transit (TLS) and at rest.
• Row-Level Security (RLS) restricts access so only authorized users can view sensitive data.
• Regular security audits and automated threat monitoring.
• Rate limiting on AI edge functions to prevent abuse.
• Secure authentication via email/password and Pi Network.`
  },
  {
    icon: Mail,
    title: "Your Rights",
    content: `You have the right to:

• Access, update, or delete your personal information through your Profile page.
• Request a copy of your data.
• Opt out of non-essential communications.
• Withdraw consent for data processing where applicable.

To exercise these rights, contact us at zengenilewis@gmail.com.`
  },
  {
    icon: Trash2,
    title: "Data Retention",
    content: `We retain your information for as long as your account is active or as needed to provide services. When you delete your account, we will remove your personal information within 30 days, except where retention is required for legal compliance, dispute resolution, or enforcing our agreements.`
  }
];

export default function PrivacyPolicy() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const content = (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 text-primary font-orbitron">PRIVACY POLICY</h1>
        <p className="text-muted-foreground font-rajdhani text-lg">Last updated: June 9, 2026</p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.title} className="bg-card/95 backdrop-blur-sm border-primary/10 shadow-medium">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <section.icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-xl text-primary font-orbitron">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-foreground/80 font-rajdhani text-base whitespace-pre-line leading-relaxed">
                {section.content}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground font-rajdhani">
          For questions about this Privacy Policy, contact{" "}
          <a href="mailto:zengenilewis@gmail.com" className="text-primary hover:underline">
            zengenilewis@gmail.com
          </a>
        </p>
      </div>
    </div>
  );

  return user ? <AppLayout user={user}>{content}</AppLayout> : content;
}
