CREATE DATABASE fazenda_gado CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fazenda_gado;

-- =============================================================================
-- SISTEMA DE GERENCIAMENTO DE GADO
-- Schema MySQL completo — versão 1.1
-- Encoding: utf8mb4 | Engine: InnoDB
-- Unidade de peso: ARROBA (@) — conversao para kg gerada automaticamente
--   1 @ = 15 kg  |  peso_kg = ROUND(peso_arroba * 15, 2)
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- =============================================================================
-- 1. CATEGORIAS FINANCEIRAS (seed incluso)
-- =============================================================================

CREATE TABLE categoria_financeira (
  id          CHAR(36)      NOT NULL DEFAULT (UUID()),
  nome        VARCHAR(100)  NOT NULL,
  tipo        ENUM('receita','despesa') NOT NULL,
  descricao   TEXT,
  is_sistema  TINYINT(1)    NOT NULL DEFAULT 0 COMMENT 'Categorias do sistema nao podem ser excluidas',
  ativo       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categoria_nome_tipo (nome, tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed: receitas
INSERT INTO categoria_financeira (id, nome, tipo, descricao, is_sistema) VALUES
  (UUID(), 'Venda de boi gordo',      'receita', 'Venda de animais para frigorifico ou mercado',         1),
  (UUID(), 'Venda de bezerro',        'receita', 'Venda de bezerros para recria ou terceiros',           1),
  (UUID(), 'Venda de descarte',       'receita', 'Venda de vacas, touros e animais de descarte',        1),
  (UUID(), 'Arrendamento',            'receita', 'Receita de arrendamento de pastagens ou areas',        1),
  (UUID(), 'Outras receitas',         'receita', 'Receitas nao categorizadas',                           1);

-- Seed: despesas
INSERT INTO categoria_financeira (id, nome, tipo, descricao, is_sistema) VALUES
  (UUID(), 'Compra de animais',       'despesa', 'Aquisicao de bovinos para o rebanho',                 1),
  (UUID(), 'Racao e suplemento',      'despesa', 'Sal mineral, racao, proteinado e volumoso',            1),
  (UUID(), 'Medicamentos e sanidade', 'despesa', 'Vacinas, vermifugos e medicamentos em geral',          1),
  (UUID(), 'Mao de obra',             'despesa', 'Salarios, diaristas e servicos de terceiros',          1),
  (UUID(), 'Transporte e frete',      'despesa', 'Frete de animais e insumos',                           1),
  (UUID(), 'GTA e taxas',             'despesa', 'Guia de Transito Animal e taxas governamentais',       1),
  (UUID(), 'Manutencao de pastagem',  'despesa', 'Calcario, sementes, herbicidas e servicos de pasto',  1),
  (UUID(), 'Manutencao geral',        'despesa', 'Reparos de cerca, equipamentos e infraestrutura',      1),
  (UUID(), 'Combustivel',             'despesa', 'Combustivel e lubrificantes',                          1),
  (UUID(), 'Outras despesas',         'despesa', 'Despesas nao categorizadas',                           1);

-- =============================================================================
-- 2. PASTO
-- =============================================================================

CREATE TABLE pasto (
  id               CHAR(36)      NOT NULL DEFAULT (UUID()),
  nome             VARCHAR(100)  NOT NULL,
  area_hectares    DECIMAL(8,2)  NOT NULL,
  tipo_capim       VARCHAR(100),
  capacidade_ua    DECIMAL(8,2)  COMMENT 'Unidades Animal suportadas',
  ativo            TINYINT(1)    NOT NULL DEFAULT 1,
  observacao       TEXT,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. LOTE
-- =============================================================================

CREATE TABLE lote (
  id                  CHAR(36)      NOT NULL DEFAULT (UUID()),
  nome                VARCHAR(100)  NOT NULL,
  categoria_principal ENUM('bezerros','bezerra','novilhas','vacas','bois','touros','misto') NOT NULL,
  pasto_atual_id      CHAR(36),
  quantidade_atual    INT           NOT NULL DEFAULT 0,
  peso_medio_arroba   DECIMAL(7,3)  COMMENT 'Media das ultimas pesagens dos animais do lote (atualizado pela aplicacao)',
  peso_medio_kg       DECIMAL(7,2)  GENERATED ALWAYS AS (ROUND(peso_medio_arroba * 15, 2)) STORED
                                    COMMENT 'Convertido automaticamente: @ * 15',
  peso_total_arroba   DECIMAL(10,3) GENERATED ALWAYS AS (ROUND(peso_medio_arroba * quantidade_atual, 3)) STORED
                                    COMMENT 'Estimativa total do lote em @',
  data_ultima_pesagem DATE          COMMENT 'Data de referencia do peso_medio_arroba',
  ativo               TINYINT(1)    NOT NULL DEFAULT 1,
  observacao          TEXT,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_lote_pasto FOREIGN KEY (pasto_atual_id) REFERENCES pasto (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. ANIMAL
-- =============================================================================

CREATE TABLE animal (
  id               CHAR(36)     NOT NULL DEFAULT (UUID()),
  brinco           VARCHAR(30)  NOT NULL,
  nome             VARCHAR(100),
  raca             VARCHAR(80)  NOT NULL,
  sexo             ENUM('M','F') NOT NULL,
  categoria        ENUM('bezerro','bezerra','novilha','vaca','boi','touro') NOT NULL,
  data_nascimento  DATE,
  mae_id           CHAR(36)     COMMENT 'Auto-referencia para matriz',
  pai_id           CHAR(36)     COMMENT 'Auto-referencia para reprodutor',
  lote_id              CHAR(36),
  peso_entrada_arroba  DECIMAL(7,3) COMMENT 'Peso de entrada em arrobas (@)',
  peso_entrada_kg      DECIMAL(7,2) GENERATED ALWAYS AS (ROUND(peso_entrada_arroba * 15, 2)) STORED COMMENT 'Convertido automaticamente: @ * 15',
  ativo                TINYINT(1)   NOT NULL DEFAULT 1,
  observacao       TEXT,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_animal_brinco (brinco),
  CONSTRAINT fk_animal_mae  FOREIGN KEY (mae_id)  REFERENCES animal (id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_animal_pai  FOREIGN KEY (pai_id)  REFERENCES animal (id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_animal_lote FOREIGN KEY (lote_id) REFERENCES lote   (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. PESAGEM
-- =============================================================================

CREATE TABLE pesagem (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  animal_id     CHAR(36)     NOT NULL,
  data          DATE         NOT NULL,
  peso_arroba   DECIMAL(7,3) NOT NULL              COMMENT 'Peso informado em arrobas (@)',
  peso_kg       DECIMAL(7,2) GENERATED ALWAYS AS (ROUND(peso_arroba * 15, 2)) STORED
                                                   COMMENT 'Convertido automaticamente: @ * 15',
  gmd_arroba    DECIMAL(6,4) COMMENT 'Ganho medio diario em @ (calculado pela aplicacao)',
  responsavel   VARCHAR(100),
  observacao    TEXT,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_pesagem_animal FOREIGN KEY (animal_id) REFERENCES animal (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. LANCAMENTO FINANCEIRO
-- =============================================================================

CREATE TABLE lancamento_financeiro (
  id                    CHAR(36)      NOT NULL DEFAULT (UUID()),
  data                  DATE          NOT NULL,
  tipo                  ENUM('receita','despesa') NOT NULL,
  categoria_id          CHAR(36)      NOT NULL,
  status                ENUM('pendente','confirmado','cancelado') NOT NULL DEFAULT 'confirmado',
  valor_estimado        DECIMAL(12,2) COMMENT 'Previsao no momento da saida (venda frigorifico)',
  valor_final           DECIMAL(12,2) COMMENT 'Valor real apos confirmacao',
  descricao             VARCHAR(255)  NOT NULL,
  forma_pagamento       ENUM('avista','prazo','parcelas','boleto','pix','transferencia','outro'),
  pago                  TINYINT(1)    NOT NULL DEFAULT 0,
  data_vencimento       DATE,
  data_pagamento        DATE,
  pasto_id              CHAR(36)      COMMENT 'Custo vinculado a um pasto especifico',
  observacao            TEXT,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_lanc_categoria FOREIGN KEY (categoria_id) REFERENCES categoria_financeira (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_lanc_pasto     FOREIGN KEY (pasto_id)     REFERENCES pasto (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. MOVIMENTACAO
-- =============================================================================

CREATE TABLE movimentacao (
  id                        CHAR(36)    NOT NULL DEFAULT (UUID()),
  animal_id                 CHAR(36)    NOT NULL,
  tipo                      ENUM('compra','venda','nascimento','obito','abate','transferencia','doacao','outros') NOT NULL,
  direcao                   ENUM('entrada','saida') NOT NULL,
  data                      DATE        NOT NULL,
  pasto_destino_id          CHAR(36)    COMMENT 'Pasto de destino na transferencia',
  lote_destino_id           CHAR(36)    COMMENT 'Lote de destino',
  origem_destino            VARCHAR(200) COMMENT 'Nome do vendedor, comprador, frigorifico, etc.',
  causa_obito               VARCHAR(200) COMMENT 'Preenchido apenas em obitos',
  lancamento_financeiro_id  CHAR(36)    COMMENT 'Lancamento gerado automaticamente',
  numero_gta                VARCHAR(50)  COMMENT 'Guia de Transito Animal',
  observacao                TEXT,
  created_at                DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_mov_animal    FOREIGN KEY (animal_id)                REFERENCES animal              (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_mov_pasto     FOREIGN KEY (pasto_destino_id)         REFERENCES pasto               (id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_mov_lote      FOREIGN KEY (lote_destino_id)          REFERENCES lote                (id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_mov_lanc      FOREIGN KEY (lancamento_financeiro_id) REFERENCES lancamento_financeiro(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. BOLETIM DE ABATE (etapa 2 da venda ao frigorifico)
-- =============================================================================

CREATE TABLE boletim_abate (
  id                      CHAR(36)      NOT NULL DEFAULT (UUID()),
  lancamento_financeiro_id CHAR(36)     NOT NULL,
  frigorifico             VARCHAR(200)  NOT NULL,
  data_abate              DATE          NOT NULL,
  data_boletim            DATE          NOT NULL,
  quantidade_animais      INT           NOT NULL,
  peso_vivo_total_arroba  DECIMAL(10,3) COMMENT 'Peso vivo total em @ (opcional)',
  peso_vivo_total_kg      DECIMAL(10,2) GENERATED ALWAYS AS (ROUND(peso_vivo_total_arroba * 15, 2)) STORED,
  peso_carcaca_total_arroba DECIMAL(10,3) NOT NULL COMMENT 'Peso de carcaca em @ informado pelo frigorifico',
  peso_carcaca_total_kg   DECIMAL(10,2) GENERATED ALWAYS AS (ROUND(peso_carcaca_total_arroba * 15, 2)) STORED,
  rendimento_percent      DECIMAL(5,2)  NOT NULL COMMENT 'Ex: 54.30 para 54,3%',
  valor_arroba            DECIMAL(10,2) NOT NULL COMMENT 'R$ por arroba (@)',
  bonificacoes            DECIMAL(10,2) NOT NULL DEFAULT 0,
  descontos               DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_calculado         DECIMAL(12,2) GENERATED ALWAYS AS (
                            ROUND(peso_carcaca_total_arroba * valor_arroba + bonificacoes - descontos, 2)
                          ) STORED COMMENT 'peso_carcaca_arroba * R$/@ + bonif - desc',
  numero_gta              VARCHAR(50),
  numero_nfe              VARCHAR(60),
  arquivo_boletim         VARCHAR(500)  COMMENT 'Path ou URL do PDF do frigorifico',
  confirmado_em           DATETIME,
  confirmado_por          VARCHAR(100),
  created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_boletim_lanc FOREIGN KEY (lancamento_financeiro_id) REFERENCES lancamento_financeiro (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. OCUPACAO DE PASTO (historico de rotacao)
-- =============================================================================

CREATE TABLE ocupacao_pasto (
  id                  CHAR(36)    NOT NULL DEFAULT (UUID()),
  pasto_id            CHAR(36)    NOT NULL,
  lote_id             CHAR(36)    NOT NULL,
  data_entrada        DATE        NOT NULL,
  data_saida          DATE        COMMENT 'NULL = ocupacao atual',
  quantidade_animais  INT         NOT NULL,
  lotacao_ua          DECIMAL(8,2) COMMENT 'Unidades Animal no periodo',
  observacao          TEXT,
  created_at          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ocup_pasto FOREIGN KEY (pasto_id) REFERENCES pasto (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_ocup_lote  FOREIGN KEY (lote_id)  REFERENCES lote  (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 10. ABASTECIMENTO DE COCHO
-- =============================================================================

CREATE TABLE abastecimento_cocho (
  id                     CHAR(36)     NOT NULL DEFAULT (UUID()),
  pasto_id               CHAR(36)     NOT NULL,
  data                   DATE         NOT NULL,
  tipo                   ENUM('sal_mineral','racao','proteinado','volumoso','outro') NOT NULL,
  quantidade_kg          DECIMAL(8,2) NOT NULL,
  custo_total            DECIMAL(10,2),
  fornecedor             VARCHAR(200),
  lancamento_financeiro_id CHAR(36)   COMMENT 'Despesa gerada automaticamente',
  observacao             TEXT,
  created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_cocho_pasto FOREIGN KEY (pasto_id)               REFERENCES pasto               (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_cocho_lanc  FOREIGN KEY (lancamento_financeiro_id) REFERENCES lancamento_financeiro(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 11. SAUDE EVENTO
-- =============================================================================

CREATE TABLE saude_evento (
  id                        CHAR(36)     NOT NULL DEFAULT (UUID()),
  escopo                    ENUM('individual','lote','todos') NOT NULL,
  lote_id                   CHAR(36)     COMMENT 'Preenchido quando escopo=lote',
  tipo                      ENUM('vacina','vermifugo','medicamento','exame','cirurgia','outro') NOT NULL,
  produto                   VARCHAR(200) NOT NULL,
  fabricante                VARCHAR(200),
  lote_produto              VARCHAR(100) COMMENT 'Numero do lote do produto veterinario',
  data_aplicacao            DATE         NOT NULL,
  data_proxima              DATE         COMMENT 'Proximo reforco ou repeticao',
  dose_ml_por_animal        DECIMAL(7,2),
  quantidade_animais        INT          NOT NULL DEFAULT 1,
  custo_total               DECIMAL(10,2),
  lancamento_financeiro_id  CHAR(36),
  responsavel               VARCHAR(100),
  observacao                TEXT,
  created_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_saude_lote FOREIGN KEY (lote_id)                  REFERENCES lote                (id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_saude_lanc FOREIGN KEY (lancamento_financeiro_id) REFERENCES lancamento_financeiro(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 12. SAUDE EVENTO ANIMAL (vinculo individual)
-- =============================================================================

CREATE TABLE saude_evento_animal (
  id                    CHAR(36)    NOT NULL DEFAULT (UUID()),
  saude_evento_id       CHAR(36)    NOT NULL,
  animal_id             CHAR(36)    NOT NULL,
  dose_aplicada_ml      DECIMAL(7,2),
  observacao_individual TEXT,
  created_at            DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_evento_animal (saude_evento_id, animal_id),
  CONSTRAINT fk_sea_evento FOREIGN KEY (saude_evento_id) REFERENCES saude_evento (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sea_animal FOREIGN KEY (animal_id)       REFERENCES animal        (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- INDICES DE PERFORMANCE
-- =============================================================================

-- Consultas frequentes por animal
CREATE INDEX idx_movimentacao_animal    ON movimentacao         (animal_id, data);
CREATE INDEX idx_movimentacao_tipo      ON movimentacao         (tipo, direcao, data);
CREATE INDEX idx_pesagem_animal         ON pesagem              (animal_id, data);
CREATE INDEX idx_saude_evento_animal_id ON saude_evento_animal  (animal_id);
CREATE INDEX idx_saude_evento_data      ON saude_evento         (data_aplicacao);
CREATE INDEX idx_saude_evento_proxima   ON saude_evento         (data_proxima);

-- Consultas financeiras
CREATE INDEX idx_lanc_data_tipo         ON lancamento_financeiro (data, tipo);
CREATE INDEX idx_lanc_status            ON lancamento_financeiro (status);
CREATE INDEX idx_lanc_vencimento        ON lancamento_financeiro (data_vencimento, pago);

-- Consultas de rebanho/pasto
CREATE INDEX idx_animal_lote            ON animal               (lote_id, ativo);
CREATE INDEX idx_animal_categoria       ON animal               (categoria, ativo);
CREATE INDEX idx_ocupacao_pasto_data    ON ocupacao_pasto       (pasto_id, data_entrada, data_saida);
CREATE INDEX idx_abast_pasto_data       ON abastecimento_cocho  (pasto_id, data);

SET FOREIGN_KEY_CHECKS = 1;
-- =============================================================================
-- FIM DO SCHEMA
-- =============================================================================

CREATE TABLE IF NOT EXISTS parametro_recategorizacao (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  categoria_de ENUM('bezerro','bezerra','novilha','vaca','boi','touro') NOT NULL,
  categoria_para ENUM('bezerro','bezerra','novilha','vaca','boi','touro') NOT NULL,
  meses_minimos INT NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  observacao VARCHAR(200),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_param_de_para (categoria_de, categoria_para)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO parametro_recategorizacao (id, categoria_de, categoria_para, meses_minimos, observacao) VALUES
  (UUID(), 'bezerro', 'boi',     12, 'Bezerro macho apos desmama'),
  (UUID(), 'bezerra', 'novilha', 12, 'Bezerra femea apos desmama'),
  (UUID(), 'novilha', 'vaca',    24, 'Novilha apos idade adulta');

CREATE TABLE IF NOT EXISTS historico_recategorizacao (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  animal_id CHAR(36) NOT NULL,
  categoria_de VARCHAR(20) NOT NULL,
  categoria_para VARCHAR(20) NOT NULL,
  data DATE NOT NULL,
  responsavel VARCHAR(100),
  observacao TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_hrec_animal FOREIGN KEY (animal_id) REFERENCES animal(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuario (
  id           CHAR(36)     NOT NULL DEFAULT (UUID()),
  nome         VARCHAR(100) NOT NULL,
  email        VARCHAR(150) NOT NULL,
  senha_hash   VARCHAR(255) NOT NULL,
  perfil       ENUM('admin','caseiro') NOT NULL DEFAULT 'caseiro',
  ativo        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_email (email)
)

ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE usuario ADD COLUMN senha_temporaria TINYINT(1) NOT NULL DEFAULT 1;
UPDATE usuario SET senha_temporaria = 1;

CREATE TABLE IF NOT EXISTS fazenda (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  nome          VARCHAR(150) NOT NULL,
  razao_social  VARCHAR(200),
  cnpj          VARCHAR(20),
  endereco      VARCHAR(300),
  telefone      VARCHAR(30),
  email         VARCHAR(150),
  logo_url      VARCHAR(500),
  ativo         TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE usuario MODIFY COLUMN perfil ENUM('owner','super_admin','admin','caseiro') NOT NULL DEFAULT 'caseiro';

ALTER TABLE usuario ADD COLUMN fazenda_id CHAR(36) NULL AFTER perfil;

ALTER TABLE animal       ADD COLUMN fazenda_id CHAR(36) NOT NULL DEFAULT '' AFTER id;
ALTER TABLE lote         ADD COLUMN fazenda_id CHAR(36) NOT NULL DEFAULT '' AFTER id;
ALTER TABLE pasto        ADD COLUMN fazenda_id CHAR(36) NOT NULL DEFAULT '' AFTER id;
ALTER TABLE pesagem      ADD COLUMN fazenda_id CHAR(36) NOT NULL DEFAULT '' AFTER id;
ALTER TABLE movimentacao ADD COLUMN fazenda_id CHAR(36) NOT NULL DEFAULT '' AFTER id;
ALTER TABLE lancamento_financeiro    ADD COLUMN fazenda_id CHAR(36) NOT NULL DEFAULT '' AFTER id;
ALTER TABLE saude_evento             ADD COLUMN fazenda_id CHAR(36) NOT NULL DEFAULT '' AFTER id;
ALTER TABLE parametro_recategorizacao ADD COLUMN fazenda_id CHAR(36) NOT NULL DEFAULT '' AFTER id;
ALTER TABLE historico_recategorizacao ADD COLUMN fazenda_id CHAR(36) NOT NULL DEFAULT '' AFTER id;
ALTER TABLE ocupacao_pasto           ADD COLUMN fazenda_id CHAR(36) NOT NULL DEFAULT '' AFTER id;
ALTER TABLE abastecimento_cocho      ADD COLUMN fazenda_id CHAR(36) NOT NULL DEFAULT '' AFTER id;
ALTER TABLE boletim_abate            ADD COLUMN fazenda_id CHAR(36) NOT NULL DEFAULT '' AFTER id;

CREATE TABLE IF NOT EXISTS raca_bovina (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  nome       VARCHAR(100) NOT NULL,
  origem     VARCHAR(100),
  ativo      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_raca_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO raca_bovina (nome, origem) VALUES
('Nelore','Brasil'),('Angus','Escócia'),('Brahman','EUA'),('Hereford','Inglaterra'),
('Simmental','Suíça'),('Charolês','França'),('Limousin','França'),('Senepol','Ilhas Virgens'),
('Brangus','EUA'),('Canchim','Brasil'),('Tabapuã','Brasil'),('Gir','Índia'),
('Guzerá','Índia'),('Indubrasil','Brasil'),('Girolanda','Brasil'),('Caracu','Brasil'),
('Pantaneiro','Brasil'),('Aberdeen Angus','Escócia'),('Red Angus','EUA'),('Wagyu','Japão'),
('Shorthorn','Inglaterra'),('Devon','Inglaterra'),('Santa Gertrudis','EUA'),('Beefmaster','EUA'),
('Braford','Austrália'),('Simbrasil','Brasil'),('Nelore Mocho','Brasil'),('Misto','Brasil'),
('Não definida','Brasil');

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE boletim_abate;
TRUNCATE TABLE historico_recategorizacao;
TRUNCATE TABLE parametro_recategorizacao;
TRUNCATE TABLE saude_evento;
TRUNCATE TABLE abastecimento_cocho;
TRUNCATE TABLE ocupacao_pasto;
TRUNCATE TABLE lancamento_financeiro;
TRUNCATE TABLE movimentacao;
TRUNCATE TABLE pesagem;
TRUNCATE TABLE animal;
TRUNCATE TABLE lote;
TRUNCATE TABLE pasto;
TRUNCATE TABLE usuario;
TRUNCATE TABLE fazenda;

SET FOREIGN_KEY_CHECKS = 1;
