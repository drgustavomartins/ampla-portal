/**
 * Auto-classify lesson content type based on keywords in title/description.
 * Priority: case_study > practical > theoretical (default).
 */

const PRACTICAL_KEYWORDS = [
  "aplicação", "aplicacao", "aplicando", "aplicar",
  "procedimento", "procedimentos",
  "passo a passo", "passo-a-passo",
  "demonstração", "demonstracao", "demonstrativa", "demonstrativo",
  "ao vivo", "live",
  "na paciente", "em paciente", "com paciente",
  "atendimento", "atendendo",
  "técnica prática", "tecnica pratica", "prática", "pratica",
  "hands-on", "hands on",
  "mãos na massa", "maos na massa",
  "execução", "execucao", "executando",
  "injeção", "injecao", "injetando",
  "infiltração", "infiltracao", "infiltrando",
  "aplicação clínica", "caso prático",
];

const CASE_STUDY_KEYWORDS = [
  "caso clínico", "caso clinico",
  "case", "cases",
  "antes e depois", "antes/depois",
  "estudo de caso",
  "paciente real",
  "before after", "before and after",
  "resultado", "resultados",
];

export function classifyLesson(
  title: string,
  description?: string | null,
): "theoretical" | "practical" | "case_study" {
  const text = `${title} ${description || ""}`.toLowerCase();
  if (CASE_STUDY_KEYWORDS.some((k) => text.includes(k))) return "case_study";
  if (PRACTICAL_KEYWORDS.some((k) => text.includes(k))) return "practical";
  return "theoretical";
}
