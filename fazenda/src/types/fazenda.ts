export interface Fazenda {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  logo_url: string | null;
  ativo: boolean;
  created_at: string;
}

export interface CreateFazendaDTO {
  nome: string;
  razao_social?: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
}

export interface UpdateFazendaDTO extends Partial<CreateFazendaDTO> {
  ativo?: boolean;
}
