import { Link } from "react-router-dom";

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-card/80 backdrop-blur-sm py-4 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <div className="text-sm text-muted-foreground font-rajdhani">
          <span className="font-semibold text-foreground">PARTSPRO</span> — Smart Spares Marketplace
        </div>
      </div>
    </footer>
  );
}
