/* ==========================================================
   validacao.js
   Regras de validação do formulário de relato.
   Toda entrada do usuário passa por aqui ANTES de ser usada:
   campo vazio, tamanho, formato e tipo (lista de opções).
   ========================================================== */

"use strict";

// Opções aceitas nos campos de escolha (lista branca).
// A chave é o valor salvo; o texto é o que aparece na tela.
const TIPOS = {
  buraco: "Buraco na via",
  iluminacao: "Iluminação apagada",
  lixo: "Lixo ou entulho",
  calcada: "Calçada danificada",
  arvore: "Árvore com risco",
  outro: "Outro"
};

const GRAVIDADES = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta"
};

const STATUS = {
  aberto: "Aberto",
  andamento: "Em andamento",
  resolvido: "Resolvido"
};

// Campos que formam uma ocorrência (usado para validar e mostrar erros)
const CAMPOS_OCORRENCIA = ["tipo", "bairro", "local", "descricao", "gravidade", "status"];

// Limites de tamanho dos campos de texto (os mesmos do HTML)
const LIMITES = {
  bairro: { min: 3, max: 40, rotulo: "Bairro" },
  local: { min: 5, max: 100, rotulo: "Local do problema" },
  descricao: { min: 10, max: 300, rotulo: "Descrição" }
};

// Formato do bairro: só letras (com ou sem acento) e espaços
const FORMATO_BAIRRO = /^[A-Za-zÀ-ÿ ]+$/;

/**
 * Confere se o texto foi preenchido e respeita o tamanho mínimo e máximo.
 * @param {string} valor - texto digitado
 * @param {{min: number, max: number, rotulo: string}} limite
 * @returns {string} mensagem de erro, ou "" quando está tudo certo
 */
function validarTamanho(valor, limite) {
  if (typeof valor !== "string" || valor.trim() === "") {
    return `Preencha o campo ${limite.rotulo}.`;
  }
  const tamanho = valor.trim().length;
  if (tamanho < limite.min || tamanho > limite.max) {
    return `${limite.rotulo}: use de ${limite.min} a ${limite.max} caracteres (agora tem ${tamanho}).`;
  }
  return "";
}

/**
 * Confere se o valor está entre as opções permitidas. Protege contra
 * valores inventados (por exemplo, alterando o HTML pelo DevTools).
 * @returns {string} mensagem de erro, ou ""
 */
function validarOpcao(valor, opcoesPermitidas, mensagemErro) {
  return Object.keys(opcoesPermitidas).includes(valor) ? "" : mensagemErro;
}

/** Bairro: obrigatório, de 3 a 40 caracteres, só letras e espaços. */
function validarBairro(valor) {
  const erroTamanho = validarTamanho(valor, LIMITES.bairro);
  if (erroTamanho !== "") {
    return erroTamanho;
  }
  if (!FORMATO_BAIRRO.test(valor.trim())) {
    return "Bairro: use apenas letras e espaços.";
  }
  return "";
}

/**
 * Valida um campo pelo nome.
 * @returns {string} mensagem de erro, ou "" quando o valor é válido
 */
function validarCampo(nome, valor) {
  switch (nome) {
    case "tipo":
      return validarOpcao(valor, TIPOS, "Escolha o tipo de problema.");
    case "bairro":
      return validarBairro(valor);
    case "local":
      return validarTamanho(valor, LIMITES.local);
    case "descricao":
      return validarTamanho(valor, LIMITES.descricao);
    case "gravidade":
      return validarOpcao(valor, GRAVIDADES, "Escolha a gravidade.");
    case "status":
      return validarOpcao(valor, STATUS, "Escolha um status válido.");
    default:
      return "";
  }
}

/**
 * Valida todos os campos de uma ocorrência.
 * @returns {Object} erros encontrados, ex.: { bairro: "Preencha o campo Bairro." }
 *                   (objeto vazio = nenhum erro)
 */
function validarOcorrencia(dados) {
  const erros = {};
  CAMPOS_OCORRENCIA.forEach((nome) => {
    const mensagem = validarCampo(nome, dados[nome]);
    if (mensagem !== "") {
      erros[nome] = mensagem;
    }
  });
  return erros;
}

/**
 * Confere se um item lido do localStorage tem o formato esperado.
 * Dados corrompidos ou alterados à mão são descartados.
 */
function ocorrenciaSalvaEhValida(item) {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    typeof item.criadoEm === "string" &&
    !Number.isNaN(Date.parse(item.criadoEm)) &&
    Object.keys(validarOcorrencia(item)).length === 0
  );
}
