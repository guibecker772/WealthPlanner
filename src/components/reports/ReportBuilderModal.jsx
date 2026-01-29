// src/components/reports/ReportBuilderModal.jsx
import React, { useState, useCallback, useMemo } from "react";
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
import FinancialEngine from "../../engine/FinancialEngine";

/**
 * Modal para construção do relatório PDF modular
 */
export default function ReportBuilderModal({
  isOpen,
  onClose,
  clientData,
  kpis,
}) {
  // Metadados do relatório
  const [reportMeta, setReportMeta] = useState(() => getDefaultReportMeta(clientData));

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
      const doc = (
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

      const a = document.createElement("a");
      a.href = url;
      a.download = `Relatorio_${clientName}_${dateStr}.pdf`;
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
  }, [clientData, kpis, successionInfo, reportMeta, selectedSections, successionSubBlocks, engineOutput, onClose]);

  // Verificar se alguma seção está selecionada
  const hasAnySectionSelected = useMemo(() => {
    return Object.values(selectedSections).some((v) => v);
  }, [selectedSections]);

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
                        // Se é sucessão, também expande/colapsa os sub-blocos
                        if (!selectedSections[section.id]) {
                          toggleSection(section.id);
                          setIsSuccessionExpanded(true);
                        } else {
                          // Apenas toggle expand quando já está selecionado
                          setIsSuccessionExpanded(!isSuccessionExpanded);
                        }
                      } else {
                        toggleSection(section.id);
                      }
                    }}
                  >
                    {/* Checkbox */}
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

                    {/* Info */}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">
                        {section.title}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {section.description}
                      </div>
                    </div>

                    {/* Expand arrow for Succession */}
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

                  {/* Sub-blocos de Sucessão */}
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
            disabled={isGenerating || !hasAnySectionSelected}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
              isGenerating || !hasAnySectionSelected
                ? "bg-surface text-text-muted cursor-not-allowed"
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
                <Download size={16} />
                Gerar e Baixar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
