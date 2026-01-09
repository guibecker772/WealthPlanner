// src/constants/stateTaxRules.js

export const UF_OPTIONS = [
  { value: "AC", label: "AC - Acre" },
  { value: "AL", label: "AL - Alagoas" },
  { value: "AP", label: "AP - Amapá" },
  { value: "AM", label: "AM - Amazonas" },
  { value: "BA", label: "BA - Bahia" },
  { value: "CE", label: "CE - Ceará" },
  { value: "DF", label: "DF - Distrito Federal" },
  { value: "ES", label: "ES - Espírito Santo" },
  { value: "GO", label: "GO - Goiás" },
  { value: "MA", label: "MA - Maranhão" },
  { value: "MT", label: "MT - Mato Grosso" },
  { value: "MS", label: "MS - Mato Grosso do Sul" },
  { value: "MG", label: "MG - Minas Gerais" },
  { value: "PA", label: "PA - Pará" },
  { value: "PB", label: "PB - Paraíba" },
  { value: "PR", label: "PR - Paraná" },
  { value: "PE", label: "PE - Pernambuco" },
  { value: "PI", label: "PI - Piauí" },
  { value: "RJ", label: "RJ - Rio de Janeiro" },
  { value: "RN", label: "RN - Rio Grande do Norte" },
  { value: "RS", label: "RS - Rio Grande do Sul" },
  { value: "RO", label: "RO - Rondônia" },
  { value: "RR", label: "RR - Roraima" },
  { value: "SC", label: "SC - Santa Catarina" },
  { value: "SP", label: "SP - São Paulo" },
  { value: "SE", label: "SE - Sergipe" },
  { value: "TO", label: "TO - Tocantins" },
];

// Defaults (ref.): 2% honorários + 1% custas
const DEFAULT_RULE = {
  itcmdMax: 0.06,
  honorariosRef: 0.02,
  custasRef: 0.01,
};

// Você pode customizar por UF aqui, se quiser.
const STATE_RULES = {
  RS: { ...DEFAULT_RULE, itcmdMax: 0.06 },
  SP: { ...DEFAULT_RULE, itcmdMax: 0.04 },
  RJ: { ...DEFAULT_RULE, itcmdMax: 0.08 },
  MG: { ...DEFAULT_RULE, itcmdMax: 0.05 },
  // ...demais estados ficam no default
};

export function getStateRule(uf) {
  return STATE_RULES[uf] || DEFAULT_RULE;
}
