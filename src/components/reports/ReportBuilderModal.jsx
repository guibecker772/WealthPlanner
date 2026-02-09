// src/components/reports/ReportBuilderModal.jsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  X,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  Check,
  Loader2,
  User,
  Calendar,
  Briefcase,
  AlertCircle,
  Info,
  Crown,
  ClipboardList,
  Mail,
  Phone,
  Link,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";

import {
  REPORT_SECTIONS,
  SUCCESSION_SUB_BLOCKS,
  getOrderedSections,
  getSuccessionSubBlocks,
  getDefaultSectionState,
  getDefaultSuccessionSubBlockState,
  getDefaultReportMeta,
} from "../../constants/reportSections";
import ModularReportPDF from "../../reports/ModularReportPDF";
import ReportV2Document from "../../reports/v2/ReportV2Document";
import FinancialEngine from "../../engine/FinancialEngine";

// ─── Per-scenario notes persistence ───
function getNotesKey(advisorEmail, scenarioId) {
  const email = (advisorEmail || "default").trim().toLowerCase();
  const sid = scenarioId || "base";
  return `reportNotes:v2:${email}:${sid}`;
}
function loadPersistedNotes(advisorEmail, scenarioId) {
  try {
    return localStorage.getItem(getNotesKey(advisorEmail, scenarioId)) || "";
  } catch { return ""; }
}
function persistNotes(advisorEmail, scenarioId, notes) {
  try {
    const key = getNotesKey(advisorEmail, scenarioId);
    if (notes) localStorage.setItem(key, notes);
    else localStorage.removeItem(key);
  } catch { /* ignore */ }
}

/**
 * Modal para construção do relatório PDF modular
 * Supports V1 (modular) and V2 (Premium Executivo)
 */
export default function ReportBuilderModal({
  isOpen,
  onClose,
  clientData,
  kpis,
  scenarioId,
}) {
  // ── Report version toggle ──
  const [reportVersion, setReportVersion] = useState("v2"); // "v1" | "v2"

  // Metadados do relatório
  const [reportMeta, setReportMeta] = useState(() => getDefaultReportMeta(clientData));

  // V2-specific fields
  const [advisorEmail, setAdvisorEmail] = useState("");
  const [advisorPhone, setAdvisorPhone] = useState("");
  const [advisorCompany, setAdvisorCompany] = useState("");
  const [advisorRegistry, setAdvisorRegistry] = useState("");
  const [bookingLink, setBookingLink] = useState("");
  const [advisorNotes, setAdvisorNotes] = useState("");
  const [includeAppendix, setIncludeAppendix] = useState(false);

  // Load persisted notes on open / email / scenario change
  useEffect(() => {
    if (isOpen && reportVersion === "v2") {
      const saved = loadPersistedNotes(advisorEmail, scenarioId);
      setAdvisorNotes(saved);
    }
  }, [isOpen, advisorEmail, scenarioId, reportVersion]);

  // Seções selecionadas
  const [selectedSections, setSelectedSections] = useState(() => getDefaultSectionState());

  // Sub-blocos de sucessão
  const [successionSubBlocks, setSuccessionSubBlocks] = useState(() => getDefaultSuccessionSubBlockState());

  // Estado UI
  const [isSuccessionExpanded, setIsSuccessionExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Atualiza metadados
  const updateMeta = useCallback((field, value) => {
    setReportMeta((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Toggle seção
  const toggleSection = useCallback((sectionId) => {
    setSelectedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  // Toggle sub-bloco de sucessão
  const toggleSuccessionSubBlock = useCallback((blockId) => {
    setSuccessionSubBlocks((prev) => ({
      ...prev,
      [blockId]: !prev[blockId],
    }));
  }, []);

  // Seções ordenadas
  const orderedSections = useMemo(() => getOrderedSections(), []);
  const successionBlocks = useMemo(() => getSuccessionSubBlocks(), []);

  // Calcular dados completos do engine (reutiliza o mesmo cálculo da UI)
  const engineOutput = useMemo(() => {
    const result = FinancialEngine.run(clientData || {});
    return result;
  }, [clientData]);

  // Calcular dados de sucessão
  const successionInfo = useMemo(() => {
    return FinancialEngine.calculateSuccession(clientData || {});
  }, [clientData]);

  // Gerar PDF
  const handleGeneratePDF = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      let doc;

      if (reportVersion === "v2") {
        // V2-HARDENING: compute engine fresh on every export (bypass stale useMemo)
        const freshEngine = FinancialEngine.run(clientData || {});

        // TEMP DEBUG — build instrumentation (remove after validation)
        const buildId = Date.now().toString(36);
        console.log(`[V2-PREMIUM:${buildId}]`, {
          reportVersion: "v2",
          hasMeta: !!(clientData?.monthlyCostRetirement || clientData?.monthlyIncomeRetirement || clientData?.desiredMonthlyIncome),
          assetsCount: (clientData?.assets || []).length,
          returnRate: clientData?.returnRateModerate ?? clientData?.rentMod ?? null,
          inflation: clientData?.inflation ?? null,
        });

        // Persist notes before generating
        persistNotes(advisorEmail, scenarioId, advisorNotes);

        doc = (
          <ReportV2Document
            clientData={clientData}
            engineOutput={freshEngine}
            reportMeta={{
              ...reportMeta,
              advisorEmail,
              advisorPhone,
              advisorCompany,
              advisorRegistry,
              bookingLink,
              buildId,
              generatedAt: new Date().toISOString(),
            }}
            advisorNotes={advisorNotes}
            includeAppendix={includeAppendix}
          />
        );
      } else {
        doc = (
          <ModularReportPDF
            clientData={clientData}
            kpis={kpis}
            succession={successionInfo}
            reportMeta={{
              ...reportMeta,
              generatedAt: new Date().toISOString(),
            }}
            selectedSections={selectedSections}
            successionSubBlocks={successionSubBlocks}
            engineOutput={engineOutput}
          />
        );
      }

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      // Preparar nome do arquivo
      const clientName = (reportMeta.clientName || "Cliente")
        .toString()
        .trim()
        .replace(/\s+/g, "_")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const dateStr = new Date().toISOString().split("T")[0];
      const prefix = reportVersion === "v2" ? "Premium" : "Relatorio";

      const a = document.createElement("a");
      a.href = url;
      a.download = `${prefix}_${clientName}_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      setError("Falha ao gerar o relatório. Por favor, tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  }, [clientData, kpis, successionInfo, reportMeta, selectedSections, successionSubBlocks, engineOutput, onClose, reportVersion, advisorEmail, advisorPhone, advisorCompany, advisorRegistry, bookingLink, advisorNotes, includeAppendix, scenarioId]);

  // Verificar se alguma seção está selecionada (V1) or always true (V2)
  const canGenerate = useMemo(() => {
    if (reportVersion === "v2") return true; // V2 always has all 10 pages
    return Object.values(selectedSections).some((v) => v);
  }, [selectedSections, reportVersion]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-surface border border-border shadow-elevated flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-highlight">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/10">
              <FileText size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-text-primary">
                Gerar Relatório PDF
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Selecione as seções e personalize o relatório
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface transition text-text-secondary hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Version toggle */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-highlight border border-border">
            <button
              onClick={() => setReportVersion("v2")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                reportVersion === "v2"
                  ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-500 border border-amber-500/30"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Crown size={14} />
              Premium Executivo
            </button>
            <button
              onClick={() => setReportVersion("v1")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                reportVersion === "v1"
                  ? "bg-accent/10 text-accent border border-accent/30"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <FileText size={14} />
              Modular (V1)
            </button>
          </div>

          {/* Metadados */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <User size={16} className="text-text-muted" />
              Informações do Relatório
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  value={reportMeta.clientName}
                  onChange={(e) => updateMeta("clientName", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  placeholder="Nome do cliente"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Nome do Assessor
                </label>
                <input
                  type="text"
                  value={reportMeta.advisorName}
                  onChange={(e) => updateMeta("advisorName", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Data de Referência
                </label>
                <input
                  type="date"
                  value={reportMeta.referenceDate}
                  onChange={(e) => updateMeta("referenceDate", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t border-border/50" />

          {/* ═══ V2 Premium fields ═══ */}
          {reportVersion === "v2" && (
            <>
              {/* Extra contact fields */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Mail size={16} className="text-text-muted" />
                  Contato do Assessor (opcional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={advisorEmail}
                      onChange={(e) => setAdvisorEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                      placeholder="assessor@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={advisorPhone}
                      onChange={(e) => setAdvisorPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Empresa / Escritório
                    </label>
                    <input
                      type="text"
                      value={advisorCompany}
                      onChange={(e) => setAdvisorCompany(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                      placeholder="Ex: XP Investimentos"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Registro (CVM/ANCORD)
                    </label>
                    <input
                      type="text"
                      value={advisorRegistry}
                      onChange={(e) => setAdvisorRegistry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                      placeholder="Ex: AAI-12345"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Link de Agendamento
                    </label>
                    <input
                      type="url"
                      value={bookingLink}
                      onChange={(e) => setBookingLink(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                      placeholder="https://calendly.com/..."
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50" />

              {/* Advisor notes */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <ClipboardList size={16} className="text-text-muted" />
                  Observações do Assessor
                </h3>
                <p className="text-xs text-text-secondary">
                  Texto livre exibido na última página. Persistido por cenário.
                </p>
                <textarea
                  value={advisorNotes}
                  onChange={(e) => setAdvisorNotes(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm resize-y focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  placeholder="Ex: Rebalancear posição em renda fixa após vencimento do CDB em março..."
                />
                <div className="text-right text-[10px] text-text-muted">
                  {advisorNotes.length}/2000
                </div>
              </div>

              <div className="border-t border-border/50" />

              {/* Appendix toggle */}
              <div
                className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  includeAppendix
                    ? "border-amber-500/50 bg-amber-500/5"
                    : "border-border bg-surface-highlight/50 hover:border-border/80"
                }`}
                onClick={() => setIncludeAppendix(!includeAppendix)}
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                    includeAppendix
                      ? "border-amber-500 bg-amber-500"
                      : "border-border"
                  }`}
                >
                  {includeAppendix && <Check size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">
                    Incluir Apêndice — Detalhe dos Ativos
                  </div>
                  <div className="text-xs text-text-secondary">
                    Tabela completa com todos os ativos, tipos e percentuais
                  </div>
                </div>
              </div>

              {/* V2 info box */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <Crown size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-text-secondary">
                  <span className="font-medium text-amber-500">Premium Executivo:</span>{" "}
                  10 páginas fixas (Capa, Sumário, Executivo, Plano de Ação, Projeção,
                  Renda, Patrimônio, Cenários, Sucessão, Premissas)
                  {includeAppendix ? " + Apêndice" : ""}.
                </div>
              </div>
            </>
          )}

          {/* ═══ V1 Modular fields ═══ */}
          {reportVersion === "v1" && (
            <>
              {/* Seções */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Briefcase size={16} className="text-text-muted" />
                  Seções do Relatório
                </h3>

                <div className="space-y-2">
                  {orderedSections.map((section) => (
                    <div key={section.id}>
                      <div
                        className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                          selectedSections[section.id]
                            ? "border-accent/50 bg-accent/5"
                            : "border-border bg-surface-highlight/50 hover:border-border/80"
                        }`}
                        onClick={() => {
                          if (section.hasSubBlocks) {
                            if (!selectedSections[section.id]) {
                              toggleSection(section.id);
                              setIsSuccessionExpanded(true);
                            } else {
                              setIsSuccessionExpanded(!isSuccessionExpanded);
                            }
                          } else {
                            toggleSection(section.id);
                          }
                        }}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                            selectedSections[section.id]
                              ? "border-accent bg-accent"
                              : "border-border"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSection(section.id);
                          }}
                        >
                          {selectedSections[section.id] && (
                            <Check size={14} className="text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text-primary">
                            {section.title}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {section.description}
                          </div>
                        </div>
                        {section.hasSubBlocks && selectedSections[section.id] && (
                          <div className="text-text-muted">
                            {isSuccessionExpanded ? (
                              <ChevronDown size={18} />
                            ) : (
                              <ChevronRight size={18} />
                            )}
                          </div>
                        )}
                      </div>

                      {section.hasSubBlocks &&
                        selectedSections[section.id] &&
                        isSuccessionExpanded && (
                          <div className="ml-8 mt-2 space-y-1.5 p-3 rounded-xl bg-surface-highlight/30 border border-border/50">
                            <div className="text-xs text-text-muted font-medium mb-2 flex items-center gap-1.5">
                              <Info size={12} />
                              Sub-blocos opcionais
                            </div>
                            {successionBlocks.map((block) => (
                              <div
                                key={block.id}
                                className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition ${
                                  successionSubBlocks[block.id]
                                    ? "bg-accent/10"
                                    : "hover:bg-surface-highlight"
                                }`}
                                onClick={() => toggleSuccessionSubBlock(block.id)}
                              >
                                <div
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                                    successionSubBlocks[block.id]
                                      ? "border-accent bg-accent"
                                      : "border-border"
                                  }`}
                                >
                                  {successionSubBlocks[block.id] && (
                                    <Check size={10} className="text-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <span className="text-xs font-medium text-text-primary">
                                    {block.title}
                                  </span>
                                  {block.id === "pgblEfficiency" && (
                                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-medium">
                                      opcional
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Aviso sobre Guia de Alocação */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-text-secondary">
                  <span className="font-medium text-blue-400">Nota:</span> O Guia de
                  Alocação não faz parte deste relatório por diretrizes internas.
                  Seções fixas (Capa, Índice e Disclaimers) são incluídas
                  automaticamente.
                </div>
              </div>
            </>
          )}

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-danger/5 border border-danger/20">
              <AlertCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />
              <div className="text-xs text-danger">{error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-highlight">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface transition"
          >
            Cancelar
          </button>

          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating || !canGenerate}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
              isGenerating || !canGenerate
                ? "bg-surface text-text-muted cursor-not-allowed"
                : reportVersion === "v2"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-500/90 hover:to-yellow-500/90"
                  : "bg-gradient-to-r from-accent to-blue-500 text-white hover:from-accent/90 hover:to-blue-500/90"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                {reportVersion === "v2" ? <Crown size={16} /> : <Download size={16} />}
                {reportVersion === "v2" ? "Gerar Premium PDF" : "Gerar e Baixar PDF"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
