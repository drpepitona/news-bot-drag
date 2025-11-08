import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface NewsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const NewsSearchBar = ({ value, onChange }: NewsSearchBarProps) => {
  return (
    <div className="relative w-full max-w-2xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Buscar noticias por título o palabra clave..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 h-12 bg-black-elevated border-gold-dark/30 focus:border-gold-light transition-colors"
      />
    </div>
  );
};