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
  Settings, // Added Settings icon
  MessageCircle, // Added MessageCircle icon
  ShieldCheck, // Added ShieldCheck icon
  UserPlus, // Added UserPlus icon
} from "lucide-react";

export const menuConfig: Record<string, { label: string; path: string; icon: any; isModal?: boolean }[]> = {
  // Superusuário (dono do sistema)
  superuser: [
    { label: "Dashboard", path: "/dashboard", icon: Home },
    { label: "Salões", path: "/saloes", icon: Building, isModal: false }, // Marked as modal
    { label: "Assinaturas", path: "/assinaturas", icon: Wallet, isModal: false }, // Marked as modal
    { label: "Gerenciar Acessos", path: "/gerenciar-acessos", icon: ShieldCheck, isModal: false }, // Marked as modal
    { label: "Meu Perfil", path: "/perfil", icon: UserCheck, isModal: false }, // Marked as modal
  ],

  // Gerente de salão
manager: [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Agenda", path: "/agenda", icon: CalendarDays },

  // 👉 ADICIONANDO MENU DE CADASTROS
  // { label: "Cadastros", path: "#cadastros", icon: Users }, // This is a conceptual grouping, not a route

  { label: "Clientes", path: "/clientes", icon: Users, isModal: false }, // Changed to isModal: false
  { label: "Serviços", path: "/servicos", icon: Scissors, isModal: false }, // Changed to isModal: false
  { label: "Profissionais", path: "/profissionais", icon: UserCheck, isModal: false }, // Changed to isModal: false
  { label: "Usuários", path: "/usuarios", icon: UserPlus, isModal: false }, // Changed to isModal: false

  { label: "Relatórios", path: "/reports", icon: FileBarChart, isModal: true }, // Marked as modal
  { label: "Caixa", path: "/cash", icon: Wallet, isModal: true }, // Marked as modal
  { label: "Comissões", path: "/commissions", icon: Percent, isModal: false }, // Changed to isModal: false
  { label: "Assinatura", path: "/assinaturas", icon: Wallet, isModal: false }, // Changed to isModal: false
  { label: "Gerenciar Acessos", path: "/gerenciar-acessos", icon: ShieldCheck, isModal: false }, // Changed to isModal: false
  { label: "Configurações", path: "/config", icon: Settings, isModal: false }, // Changed to isModal: false
  { label: "WhatsApp", path: "/integracoes/whatsapp", icon: MessageCircle, isModal: false }, // Changed to isModal: false
  { label: "Meu Perfil", path: "/perfil", icon: UserCheck, isModal: false }, // Changed to isModal: false
],


  // Profissional
  professional: [
    { label: "Dashboard", path: "/dashboard", icon: Home },
    { label: "Agenda", path: "/agenda", icon: CalendarDays },
    { label: "Minhas Comissões", path: "/commissions", icon: Percent, isModal: false }, // Marked as modal
    { label: "Meu Perfil", path: "/perfil", icon: UserCheck, isModal: false }, // Marked as modal
  ],
};