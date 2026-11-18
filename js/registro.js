/* ==========================================================
   registro.js
   Painel "Registro de atividades": guarda e mostra na tela
   cada operação feita, com data/hora, ação e resultado.
   ========================================================== */

"use strict";

const LIMITE_ATIVIDADES = 50;   // o painel mostra as 50 mais recentes
const atividades = [];          // fica só em memória (zera ao recarregar)

/**
 * Formata uma data no padrão brasileiro: "17/11/2026 08:30".
 * @param {Date} data
 * @param {boolean} comSegundos - inclui os segundos ("08:30:15")
 */
function formatarDataHora(data, comSegundos = false) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) {
    return "data desconhecida";
  }
  const opcoesHora = { hour: "2-digit", minute: "2-digit" };
  if (comSegundos) {
    opcoesHora.second = "2-digit";
  }
  return `${data.toLocaleDateString("pt-BR")} ${data.toLocaleTimeString("pt-BR", opcoesHora)}`;
}

/**
 * Registra uma atividade e atualiza o painel.
 * @param {string} acao - ex.: "Adicionar", "Listar", "Editar", "Remover"
 * @param {string} resultado - o que aconteceu
 * @param {"sucesso"|"erro"|"aviso"} situacao - define a cor da linha
 */
function registrarAtividade(acao, resultado, situacao = "sucesso") {
  // unshift coloca no início: a atividade mais recente aparece no topo
  atividades.unshift({
    dataHora: new Date(),
    acao: acao,
    resultado: resultado,
    situacao: situacao
  });
  if (atividades.length > LIMITE_ATIVIDADES) {
    atividades.pop();           // descarta a mais antiga
  }
  renderizarRegistro();
}

/**
 * Desenha as atividades no painel da página.
 * Usa createElement + textContent (nunca innerHTML) para que nenhum
 * texto vire código HTML.
 */
function renderizarRegistro() {
  const lista = document.getElementById("lista-registro");
  if (!lista) {
    return;                     // página sem painel: nada a fazer
  }
  lista.replaceChildren();      // limpa o painel antes de redesenhar

  atividades.forEach((atividade) => {
    const item = document.createElement("li");
    item.className = `registro-${atividade.situacao}`;

    const quando = document.createElement("time");
    quando.dateTime = atividade.dataHora.toISOString();
    quando.textContent = formatarDataHora(atividade.dataHora, true);

    const acao = document.createElement("strong");
    acao.textContent = atividade.acao;

    item.append(quando, " · ", acao, `: ${atividade.resultado}`);
    lista.append(item);
  });
}
