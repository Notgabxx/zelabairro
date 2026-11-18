/* ==========================================================
   app.js
   Lógica da página "Relatar problema":
   1. Armazenamento: lê e salva as ocorrências no localStorage
   2. Operações: adicionar, listar, editar e remover
   3. Formulário: leitura, validação e mensagens na tela
   4. Eventos e inicialização
   Usa funções de validacao.js e registro.js (carregados antes).
   ========================================================== */

"use strict";

// ---------- Estado da aplicação ----------
const CHAVE_ARMAZENAMENTO = "zelabairro.ocorrencias";
let ocorrencias = [];   // lista de ocorrências em memória
let idEmEdicao = null;  // id da ocorrência sendo editada (null = criando uma nova)

// ---------- Elementos da página ----------
const formulario = document.getElementById("form-ocorrencia");
const tituloFormulario = document.getElementById("titulo-formulario");
const botaoEnviar = document.getElementById("botao-enviar");
const botaoCancelar = document.getElementById("botao-cancelar");
const campoStatus = document.getElementById("campo-status");
const mensagemFormulario = document.getElementById("mensagem-formulario");
const contadorDescricao = document.getElementById("contador-descricao");
const listaOcorrencias = document.getElementById("lista-ocorrencias");
const listaVazia = document.getElementById("lista-vazia");
const contadorOcorrencias = document.getElementById("contador-ocorrencias");
const alertaSistema = document.getElementById("alerta-sistema");

/* ==========================================================
   1. ARMAZENAMENTO (localStorage)
   ========================================================== */

/**
 * Lê as ocorrências salvas no navegador.
 * @returns {Array|null} a lista salva, [] no primeiro acesso, ou null se falhar
 */
function carregarOcorrencias() {
  try {
    const texto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (texto === null) {
      return [];                         // primeiro acesso: nada salvo ainda
    }
    const dados = JSON.parse(texto);     // falha se o texto não for JSON válido
    if (!Array.isArray(dados)) {
      throw new Error("Formato inesperado no localStorage");
    }
    // Mantém só os itens com formato válido (descarta dados adulterados)
    const validas = dados.filter(ocorrenciaSalvaEhValida);
    if (validas.length < dados.length) {
      registrarAtividade("Listar", `${dados.length - validas.length} item(ns) inválido(s) ignorado(s)`, "aviso");
    }
    return validas;
  } catch (erro) {
    console.error("Erro ao carregar ocorrências:", erro); // detalhe técnico só no console
    mostrarAlerta("Não foi possível carregar os dados. Tente novamente.");
    return null;
  }
}

/**
 * Salva a lista atual no navegador.
 * @returns {boolean} true se salvou
 */
function salvarOcorrencias() {
  try {
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(ocorrencias));
    return true;
  } catch (erro) {
    console.error("Erro ao salvar ocorrências:", erro);
    mostrarAlerta("Não foi possível salvar os dados. Tente novamente.");
    registrarAtividade("Salvar", "falha ao salvar no navegador", "erro");
    return false;
  }
}

/** Gera um identificador único simples, ex.: "oc-mhx2k9a1-4f7qe". */
function gerarId() {
  return `oc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Procura uma ocorrência pelo id (devolve undefined se não achar). */
function buscarPorId(id) {
  return ocorrencias.find((item) => item.id === id);
}

/** Texto curto para identificar uma ocorrência, ex.: "Buraco na via em Centro". */
function resumoDe(ocorrencia) {
  return `${TIPOS[ocorrencia.tipo]} em ${ocorrencia.bairro}`;
}

/* ==========================================================
   2. OPERAÇÕES: ADICIONAR, LISTAR, EDITAR E REMOVER
   ========================================================== */

/** ADICIONAR: cria uma nova ocorrência com dados já validados. */
function adicionarOcorrencia(dados) {
  const nova = {
    id: gerarId(),
    tipo: dados.tipo,
    bairro: dados.bairro,
    local: dados.local,
    descricao: dados.descricao,
    gravidade: dados.gravidade,
    status: "aberto",                    // todo relato novo começa aberto
    criadoEm: new Date().toISOString(),
    atualizadoEm: null
  };
  ocorrencias.push(nova);
  salvarOcorrencias();
  renderizarLista();
  limparFormulario();
  mostrarMensagem("Relato registrado. Ele já aparece na lista.", "sucesso");
  registrarAtividade("Adicionar", `ocorrência adicionada com sucesso (${resumoDe(nova)})`);
}

/** LISTAR: desenha todas as ocorrências na tela (mais recentes primeiro). */
function renderizarLista() {
  listaOcorrencias.replaceChildren();
  const maisRecentesPrimeiro = ocorrencias.slice().reverse(); // copia e inverte
  maisRecentesPrimeiro.forEach((ocorrencia) => {
    listaOcorrencias.append(criarItemDaLista(ocorrencia));
  });
  listaVazia.hidden = ocorrencias.length > 0;
  contadorOcorrencias.textContent = ocorrencias.length;
}

/**
 * Monta o <li> de uma ocorrência com createElement + textContent.
 * O texto digitado nunca é tratado como HTML (proteção contra XSS).
 */
function criarItemDaLista(ocorrencia) {
  const item = document.createElement("li");
  item.className = `cartao ocorrencia borda-${ocorrencia.gravidade}`; // borda colorida pela gravidade

  const topo = document.createElement("div");
  topo.className = "ocorrencia-topo";
  const titulo = document.createElement("h3");
  titulo.textContent = TIPOS[ocorrencia.tipo];
  const textoGravidade = `Gravidade ${GRAVIDADES[ocorrencia.gravidade].toLowerCase()}`;
  topo.append(titulo, criarEtiqueta(textoGravidade, `gravidade-${ocorrencia.gravidade}`));

  const local = document.createElement("p");
  local.className = "ocorrencia-local";
  local.textContent = `${ocorrencia.bairro} · ${ocorrencia.local}`;

  const descricao = document.createElement("p");
  descricao.textContent = ocorrencia.descricao;

  const meta = document.createElement("p");
  meta.className = "ocorrencia-meta";
  let datas = `Registrado em ${formatarDataHora(new Date(ocorrencia.criadoEm))}`;
  if (ocorrencia.atualizadoEm) {
    datas += ` · editado em ${formatarDataHora(new Date(ocorrencia.atualizadoEm))}`;
  }
  meta.append(criarEtiqueta(STATUS[ocorrencia.status], `status-${ocorrencia.status}`), ` ${datas}`);

  const acoes = document.createElement("div");
  acoes.className = "ocorrencia-acoes";
  acoes.append(
    criarBotaoAcao("Editar", "editar", ocorrencia, "botao-secundario"),
    criarBotaoAcao("Remover", "remover", ocorrencia, "botao-perigo")
  );

  item.append(topo, local, descricao, meta, acoes);
  return item;
}

/** Cria uma etiqueta colorida (gravidade ou status). */
function criarEtiqueta(texto, classeCor) {
  const etiqueta = document.createElement("span");
  etiqueta.className = `etiqueta ${classeCor}`;
  etiqueta.textContent = texto;
  return etiqueta;
}

/** Cria o botão "Editar" ou "Remover" de um item da lista. */
function criarBotaoAcao(texto, acao, ocorrencia, classeExtra) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = `botao botao-pequeno ${classeExtra}`;
  botao.textContent = texto;
  botao.setAttribute("aria-label", `${texto}: ${resumoDe(ocorrencia)}`); // para leitores de tela
  botao.dataset.acao = acao;           // vira data-acao="editar" no HTML
  botao.dataset.id = ocorrencia.id;    // vira data-id="oc-..." no HTML
  return botao;
}

/** EDITAR (passo 1): carrega a ocorrência no formulário. */
function iniciarEdicao(id) {
  const ocorrencia = buscarPorId(id);
  if (!ocorrencia) {
    registrarAtividade("Editar", "falha: ocorrência não encontrada", "erro");
    return;
  }
  idEmEdicao = id;
  preencherFormulario(ocorrencia);
  tituloFormulario.textContent = "Editar relato";
  botaoEnviar.textContent = "Salvar alterações";
  botaoCancelar.hidden = false;
  campoStatus.hidden = false;
  limparErros();
  mostrarMensagem("", "");
  // Rolagem suave, a não ser que a pessoa tenha pedido menos movimento no sistema
  const menosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  tituloFormulario.scrollIntoView({ behavior: menosMovimento ? "auto" : "smooth", block: "start" });
  formulario.elements.tipo.focus({ preventScroll: true });
  registrarAtividade("Editar", `edição iniciada (${resumoDe(ocorrencia)})`, "aviso");
}

/** Coloca os dados de uma ocorrência nos campos do formulário. */
function preencherFormulario(ocorrencia) {
  formulario.elements.tipo.value = ocorrencia.tipo;
  formulario.elements.bairro.value = ocorrencia.bairro;
  formulario.elements.local.value = ocorrencia.local;
  formulario.elements.descricao.value = ocorrencia.descricao;
  formulario.elements.gravidade.value = ocorrencia.gravidade; // marca o radio certo
  formulario.elements.status.value = ocorrencia.status;
  atualizarContadorDescricao();
}

/** EDITAR (passo 2): grava as alterações já validadas. */
function salvarEdicao(dados) {
  const ocorrencia = buscarPorId(idEmEdicao);
  if (!ocorrencia) {
    sairDoModoEdicao();
    mostrarMensagem("Este relato não existe mais.", "erro");
    registrarAtividade("Editar", "falha: ocorrência não encontrada", "erro");
    return;
  }
  ocorrencia.tipo = dados.tipo;
  ocorrencia.bairro = dados.bairro;
  ocorrencia.local = dados.local;
  ocorrencia.descricao = dados.descricao;
  ocorrencia.gravidade = dados.gravidade;
  ocorrencia.status = dados.status;
  ocorrencia.atualizadoEm = new Date().toISOString();

  salvarOcorrencias();
  renderizarLista();
  sairDoModoEdicao();
  mostrarMensagem("Relato atualizado.", "sucesso");
  registrarAtividade("Editar", `ocorrência editada com sucesso (${resumoDe(ocorrencia)}, status: ${STATUS[ocorrencia.status]})`);
}

/** Volta o formulário para o modo "Novo relato". */
function sairDoModoEdicao() {
  idEmEdicao = null;
  tituloFormulario.textContent = "Novo relato";
  botaoEnviar.textContent = "Enviar relato";
  botaoCancelar.hidden = true;
  campoStatus.hidden = true;
  limparFormulario();
}

/** Botão "Cancelar edição". */
function cancelarEdicao() {
  sairDoModoEdicao();
  mostrarMensagem("", "");
  registrarAtividade("Editar", "edição cancelada pelo usuário", "aviso");
}

/** REMOVER: apaga a ocorrência depois de pedir confirmação. */
function removerOcorrencia(id) {
  const ocorrencia = buscarPorId(id);
  if (!ocorrencia) {
    registrarAtividade("Remover", "falha: ocorrência não encontrada", "erro");
    return;
  }
  const confirmou = window.confirm(`Remover o relato “${resumoDe(ocorrencia)}”?`);
  if (!confirmou) {
    registrarAtividade("Remover", "remoção cancelada pelo usuário", "aviso");
    return;
  }
  ocorrencias = ocorrencias.filter((item) => item.id !== id);
  if (idEmEdicao === id) {
    sairDoModoEdicao();
  }
  salvarOcorrencias();
  renderizarLista();
  registrarAtividade("Remover", `ocorrência removida com sucesso (${resumoDe(ocorrencia)})`);
}

/* ==========================================================
   3. FORMULÁRIO: LEITURA, VALIDAÇÃO E MENSAGENS
   ========================================================== */

/** Tira espaços do começo e do fim e troca espaços repetidos por um só. */
function limparTexto(valor) {
  return String(valor || "").trim().replace(/\s+/g, " ");
}

/** Lê os campos do formulário já limpando o texto. */
function lerFormulario() {
  const dados = new FormData(formulario);
  return {
    tipo: limparTexto(dados.get("tipo")),
    bairro: limparTexto(dados.get("bairro")),
    local: limparTexto(dados.get("local")),
    descricao: limparTexto(dados.get("descricao")),
    gravidade: limparTexto(dados.get("gravidade")),
    // o status só é escolhido na edição; relato novo é sempre "aberto"
    status: idEmEdicao ? limparTexto(dados.get("status")) : "aberto"
  };
}

/** Nome da operação atual, usado no registro de atividades. */
function nomeDaOperacao() {
  return idEmEdicao ? "Editar" : "Adicionar";
}

/** Envio do formulário: valida tudo e decide entre adicionar ou editar. */
function tratarEnvio(evento) {
  evento.preventDefault();               // não recarrega a página
  try {
    const dados = lerFormulario();
    const erros = validarOcorrencia(dados);
    mostrarErros(erros);

    const quantidadeErros = Object.keys(erros).length;
    if (quantidadeErros > 0) {
      mostrarMensagem("Confira os campos destacados.", "erro");
      registrarAtividade(nomeDaOperacao(), `falha na validação (${quantidadeErros} campo(s) inválido(s))`, "erro");
      focarPrimeiroErro(erros);
      return;
    }

    if (idEmEdicao) {
      salvarEdicao(dados);
    } else {
      adicionarOcorrencia(dados);
    }
  } catch (erro) {
    console.error("Erro inesperado ao enviar:", erro); // detalhe só no console
    mostrarMensagem("Não foi possível enviar o relato. Tente novamente.", "erro");
    registrarAtividade(nomeDaOperacao(), "erro inesperado ao enviar", "erro");
  }
}

/** Valida um único campo enquanto a pessoa preenche. */
function validarCampoNaTela(campo) {
  if (!campo.name || !CAMPOS_OCORRENCIA.includes(campo.name)) {
    return;                              // ignora botões e outros elementos
  }
  // elements[nome].value também funciona para o grupo de radios
  const valor = limparTexto(formulario.elements[campo.name].value);
  mostrarErroDoCampo(campo.name, validarCampo(campo.name, valor));
}

/** Mostra (ou apaga, se a mensagem for "") o erro de um campo. */
function mostrarErroDoCampo(nome, mensagem) {
  const paragrafoErro = document.getElementById(`erro-${nome}`);
  if (paragrafoErro) {
    paragrafoErro.textContent = mensagem;
  }
  formulario.querySelectorAll(`[name="${nome}"]`).forEach((campo) => {
    campo.classList.toggle("invalido", mensagem !== "");
    campo.setAttribute("aria-invalid", String(mensagem !== ""));
  });
}

/** Mostra os erros de todos os campos (campo sem erro fica limpo). */
function mostrarErros(erros) {
  CAMPOS_OCORRENCIA.forEach((nome) => mostrarErroDoCampo(nome, erros[nome] || ""));
}

function limparErros() {
  mostrarErros({});
}

/** Coloca o cursor no primeiro campo com erro. */
function focarPrimeiroErro(erros) {
  const primeiro = CAMPOS_OCORRENCIA.find((nome) => erros[nome]);
  const campo = formulario.querySelector(`[name="${primeiro}"]`);
  if (campo) {
    campo.focus();
  }
}

/** Mensagem geral do formulário. tipo: "sucesso", "erro" ou "" (limpa). */
function mostrarMensagem(texto, tipo) {
  mensagemFormulario.textContent = texto;
  mensagemFormulario.className = `mensagem ${tipo}`;
}

/** Alerta no topo da página (falhas de carregamento/salvamento). */
function mostrarAlerta(texto) {
  alertaSistema.textContent = texto;
  alertaSistema.hidden = false;
}

function limparFormulario() {
  formulario.reset();
  limparErros();
  atualizarContadorDescricao();
}

function atualizarContadorDescricao() {
  const tamanho = formulario.elements.descricao.value.length;
  contadorDescricao.textContent = `${tamanho}/${LIMITES.descricao.max} caracteres`;
}

/* ==========================================================
   4. EVENTOS E INICIALIZAÇÃO
   ========================================================== */

/**
 * Cliques em "Editar" e "Remover" de qualquer item.
 * Delegação de eventos: um único ouvinte na lista atende todos os botões.
 */
function tratarCliqueNaLista(evento) {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) {
    return;
  }
  if (botao.dataset.acao === "editar") {
    iniciarEdicao(botao.dataset.id);
  } else if (botao.dataset.acao === "remover") {
    removerOcorrencia(botao.dataset.id);
  }
}

/** Liga cada evento da página à função que o trata. */
function configurarEventos() {
  formulario.addEventListener("submit", tratarEnvio);
  botaoCancelar.addEventListener("click", cancelarEdicao);
  listaOcorrencias.addEventListener("click", tratarCliqueNaLista);

  // Ao sair de um campo: valida e mostra a mensagem embaixo dele
  formulario.addEventListener("focusout", (evento) => validarCampoNaTela(evento.target));

  // Enquanto digita: atualiza o contador e apaga o erro assim que o valor fica válido
  formulario.addEventListener("input", (evento) => {
    if (evento.target.name === "descricao") {
      atualizarContadorDescricao();
    }
    if (evento.target.classList.contains("invalido") || evento.target.type === "radio") {
      validarCampoNaTela(evento.target);
    }
  });

  // Quando a validação nativa do HTML5 barra o envio, o navegador dispara "invalid"
  // em cada campo com problema: aproveitamos para mostrar a mensagem na tela também.
  // O "true" é necessário porque o evento "invalid" não sobe até o formulário.
  formulario.addEventListener("invalid", (evento) => validarCampoNaTela(evento.target), true);

  // Registra no painel as tentativas de envio barradas pela validação nativa
  botaoEnviar.addEventListener("click", () => {
    if (!formulario.checkValidity()) {
      mostrarMensagem("Confira os campos destacados.", "erro");
      registrarAtividade(nomeDaOperacao(), "envio barrado pela validação do HTML5", "erro");
    }
  });
}

/** Ponto de partida da página: liga os eventos e LISTA as ocorrências salvas. */
function iniciar() {
  configurarEventos();
  const carregadas = carregarOcorrencias();
  ocorrencias = carregadas || [];
  renderizarLista();
  atualizarContadorDescricao();
  if (carregadas !== null) {
    registrarAtividade("Listar", `${ocorrencias.length} ocorrência(s) carregada(s)`);
  } else {
    registrarAtividade("Listar", "falha ao carregar os dados salvos", "erro");
  }
}

// Os scripts usam "defer": quando este código roda, o HTML já foi todo carregado
iniciar();
