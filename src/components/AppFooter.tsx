import { Github, Globe, Mail, User, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const developerInfo = {
  name: "Lewis Zengeni",
  email: "zengenilewis@gmail.com",
  website: "https://parts-connect-pro.lovable.app",
  repository: null as string | null,
  privacyPolicy: "/privacy",
};

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-card/80 backdrop-blur-sm py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground font-rajdhani">
            <span className="font-semibold text-foreground">PARTSPRO</span> — Smart Spares Marketplace
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2" title="Developer Name">
              <User className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-foreground">{developerInfo.name}</span>
            </div>

            <a
              href={`mailto:${developerInfo.email}`}
              className="flex items-center gap-2 hover:text-primary transition-colors"
              title="Contact Developer"
            >
              <Mail className="h-3.5 w-3.5 text-primary" />
              <span>{developerInfo.email}</span>
            </a>

            {developerInfo.website ? (
              <a
                href={developerInfo.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-colors"
                title={developerInfo.website}
              >
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span>Website</span>
              </a>
            ) : (
              <div className="flex items-center gap-2 opacity-50" title="Website not available">
                <Globe className="h-3.5 w-3.5" />
                <span>Website: Not Available</span>
              </div>
            )}

            {developerInfo.repository ? (
              <a
                href={developerInfo.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Github className="h-3.5 w-3.5 text-primary" />
                <span>Repository</span>
              </a>
            ) : (
              <div className="flex items-center gap-2 opacity-50" title="Repository not available">
                <Github className="h-3.5 w-3.5" />
                <span>Repository: Not Available</span>
              </div>
            )}

            {developerInfo.privacyPolicy ? (
              <Link
                to={developerInfo.privacyPolicy}
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Privacy Policy</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2 opacity-50" title="Privacy policy not available">
                <FileText className="h-3.5 w-3.5" />
                <span>Privacy Policy: Not Available</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
