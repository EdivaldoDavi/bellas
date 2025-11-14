import {
  Home,
  CalendarDays,
  Users,
  Scissors,
  UserCheck,
  FileBarChart,
  Wallet,
  Percent,
  Building,
} from "lucide-react";

export const menuConfig: Record<string, { label: string; path: string; icon: any }[]> = {
  // Superusuário (dono do sistema)
  superuser: [
    { label: "Dashboard", path: "/dashboard", icon: Home },
    { label: "Salões", path: "/tenants", icon: Building },
    { label: "Assinaturas", path: "/subscriptions", icon: Wallet },
    { label: "Meu Perfil", path: "/profile", icon: UserCheck },
  ],

  // Gerente de salão
manager: [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Agenda", path: "/agenda", icon: CalendarDays },

  // 👉 ADICIONANDO MENU DE CADASTROS
  { label: "Cadastros", path: "#cadastros", icon: Users },

  { label: "Clientes", path: "/clients", icon: Users },
  { label: "Serviços", path: "/services", icon: Scissors },
  { label: "Profissionais", path: "/professionals", icon: UserCheck },

  { label: "Relatórios", path: "/reports", icon: FileBarChart },
  { label: "Caixa", path: "/cash", icon: Wallet },
  { label: "Comissões", path: "/commissions", icon: Percent },
  { label: "Assinatura", path: "/subscription", icon: Wallet },
  { label: "Meu Perfil", path: "/profile", icon: UserCheck },
],


  // Profissional
  professional: [
    { label: "Dashboard", path: "/dashboard", icon: Home },
    { label: "Agenda", path: "/agenda", icon: CalendarDays },
    { label: "Minhas Comissões", path: "/commissions", icon: Percent },
    { label: "Meu Perfil", path: "/profile", icon: UserCheck },
  ],
};
