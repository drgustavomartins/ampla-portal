import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4 border-border/40 bg-card/60">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Página não encontrada</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              A página que você procura não existe ou foi movida.
            </p>
          </div>
          <a
            href="#/"
            className="inline-block text-sm text-gold hover:text-gold/80 transition-colors font-medium"
          >
            Voltar ao início
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
