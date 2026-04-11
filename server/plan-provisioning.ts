// ─── Plan Provisioning Map ──────────────────────────────────────────────────
// Extracted from stripe-routes.ts webhook handler.
// Defines which modules, materials, support months, and mentorship months
// each plan gets when activated.

export type ModuleAccess = { moduleId: number; enabled: boolean };
export type PlanProvisioning = {
  modules: ModuleAccess[];
  materials: string[];
  mentorshipMonths: number;
  supportMonths: number;
};

// Module IDs from the database
const MODULE_BOAS_VINDAS = 6;
const MODULE_TOXINA = 2;
const MODULE_PREENCHEDORES = 3;
const MODULE_BIOESTIMULADORES = 5;
const MODULE_MODULADORES = 7;
const MODULE_NATURALUP = 4;

const MODULES_4_CORE = [MODULE_BOAS_VINDAS, MODULE_TOXINA, MODULE_PREENCHEDORES, MODULE_BIOESTIMULADORES, MODULE_MODULADORES];
const MODULES_COMPLETO = [...MODULES_4_CORE, MODULE_NATURALUP];

// Material category titles
const MAT_TOXINA        = "Toxina Botulínica";
const MAT_PREENCHEDORES = "Preenchedores Faciais";
const MAT_BIOESTIM      = "Bioestimuladores de Colágeno";
const MAT_MODULADORES   = "Moduladores de Matriz Extracelular";
const MAT_NATURALUP     = "Método NaturalUp®";
const MATS_4_CORE = [MAT_TOXINA, MAT_PREENCHEDORES, MAT_BIOESTIM, MAT_MODULADORES];
const MATS_COMPLETO = [...MATS_4_CORE, MAT_NATURALUP];

export const PLAN_PROVISIONING: Record<string, PlanProvisioning> = {
  modulo_avulso: {
    modules: [MODULE_BOAS_VINDAS].map(id => ({ moduleId: id, enabled: true })),
    materials: [],   // acesso a 1 módulo à escolha — admin confirma qual
    mentorshipMonths: 0,
    supportMonths: 0,
  },
  pacote_completo: {
    modules: MODULES_4_CORE.map(id => ({ moduleId: id, enabled: true })),
    materials: MATS_4_CORE,
    mentorshipMonths: 0,
    supportMonths: 0,
  },
  observador_essencial: {
    modules: MODULES_4_CORE.map(id => ({ moduleId: id, enabled: true })),
    materials: MATS_4_CORE,
    mentorshipMonths: 0,
    supportMonths: 6,
  },
  observador_avancado: {
    modules: MODULES_4_CORE.map(id => ({ moduleId: id, enabled: true })),
    materials: MATS_4_CORE,
    mentorshipMonths: 0,
    supportMonths: 6,
  },
  observador_intensivo: {
    modules: MODULES_4_CORE.map(id => ({ moduleId: id, enabled: true })),
    materials: MATS_4_CORE,
    mentorshipMonths: 0,
    supportMonths: 6,
  },
  imersao: {
    modules: MODULES_4_CORE.map(id => ({ moduleId: id, enabled: true })),
    materials: MATS_4_CORE,
    mentorshipMonths: 3,
    supportMonths: 3,
  },
  vip_online: {
    modules: MODULES_COMPLETO.map(id => ({ moduleId: id, enabled: true })),
    materials: MATS_COMPLETO,
    mentorshipMonths: 6,
    supportMonths: 6,
  },
  vip_presencial: {
    modules: MODULES_COMPLETO.map(id => ({ moduleId: id, enabled: true })),
    materials: MATS_COMPLETO,
    mentorshipMonths: 3,
    supportMonths: 3,
  },
  vip_completo: {
    modules: MODULES_COMPLETO.map(id => ({ moduleId: id, enabled: true })),
    materials: MATS_COMPLETO,
    mentorshipMonths: 6,
    supportMonths: 6,
  },
};
