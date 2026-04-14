import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ---------------------------------------------------------------------------
  // system_config
  // ---------------------------------------------------------------------------
  await prisma.systemConfig.upsert({
    where: { key: "DEFAULT_TVA_RATE" },
    update: {},
    create: { key: "DEFAULT_TVA_RATE", value: "0.10" },
  });
  await prisma.systemConfig.upsert({
    where: { key: "NIGHT_START_HOUR" },
    update: {},
    create: { key: "NIGHT_START_HOUR", value: "21" },
  });
  await prisma.systemConfig.upsert({
    where: { key: "NIGHT_END_HOUR" },
    update: {},
    create: { key: "NIGHT_END_HOUR", value: "7" },
  });
  console.log("  ✓ system_config");

  // ---------------------------------------------------------------------------
  // pricing_distance_rates
  // ---------------------------------------------------------------------------
  await prisma.pricingDistanceRate.upsert({
    where: { id: 1 },
    update: {},
    create: {
      zoneName: "hors_centre_ville",
      minKm: 0,
      maxKm: null,
      pricePerKm: 7.5,
      isActive: true,
      notes:
        "Tarif confirmé — 7.50 MAD/km. Modifiable via l'interface d'administration.",
    },
  });
  console.log("  ✓ pricing_distance_rates");

  // ---------------------------------------------------------------------------
  // pricing_modifiers
  // ---------------------------------------------------------------------------
  // Remove ROUND_TRIP — each transport is an independent service (final business decision)
  await prisma.pricingModifier.deleteMany({ where: { code: "ROUND_TRIP" } });

  const modifiers = [
    {
      code: "NIGHT_SURCHARGE",
      nameFr: "Supplément nuit",
      type: "flat_add",
      value: 100.0,
      isActive: true,
      notes:
        "Supplément forfaitaire +100 MAD. Sélection manuelle par l'opérateur — jamais automatique.",
    },
    {
      code: "VIP_SURCHARGE",
      nameFr: "Supplément VIP",
      type: "multiplier",
      value: 1.0,
      isActive: false,
      notes: "Réservé — non actif en Phase 1.",
    },
    {
      code: "HOLIDAY_SURCHARGE",
      nameFr: "Supplément jour férié",
      type: "multiplier",
      value: 1.2,
      isActive: false,
      notes: "Réservé — non actif en Phase 1.",
    },
  ];

  for (const mod of modifiers) {
    await prisma.pricingModifier.upsert({
      where: { code: mod.code },
      update: {},
      create: mod,
    });
  }
  console.log("  ✓ pricing_modifiers");

  // ---------------------------------------------------------------------------
  // service_catalog
  // ---------------------------------------------------------------------------
  const catalog = [
    // Transport
    { code: "TRANSPORT_SIMPLE", nameFr: "Transport simple", category: "transport", requiresDistance: true, requiresStaffType: false, tvaExempt: false },
    { code: "TRANSPORT_URGENT", nameFr: "Transport urgent", category: "transport", requiresDistance: true, requiresStaffType: false, tvaExempt: false },
    { code: "TRANSPORT_MEDICAL", nameFr: "Transport médicalisé", category: "transport", requiresDistance: true, requiresStaffType: true, tvaExempt: false },
    { code: "TRANSPORT_REANIMATION", nameFr: "Transport réanimation", category: "transport", requiresDistance: true, requiresStaffType: true, tvaExempt: false },
    // Disposition de personnel
    { code: "DISPO_INFIRMIER_12H", nameFr: "Disposition infirmier 12h", category: "disposition", requiresDistance: false, requiresStaffType: true, tvaExempt: false },
    { code: "DISPO_INFIRMIER_24H", nameFr: "Disposition infirmier 24h", category: "disposition", requiresDistance: false, requiresStaffType: true, tvaExempt: false },
    { code: "DISPO_MEDECIN_12H", nameFr: "Disposition médecin 12h", category: "disposition", requiresDistance: false, requiresStaffType: true, tvaExempt: false },
    { code: "DISPO_MEDECIN_24H", nameFr: "Disposition médecin 24h", category: "disposition", requiresDistance: false, requiresStaffType: true, tvaExempt: false },
    { code: "DISPO_REANIMATEUR_12H", nameFr: "Disposition réanimateur 12h", category: "disposition", requiresDistance: false, requiresStaffType: true, tvaExempt: false },
    { code: "DISPO_REANIMATEUR_24H", nameFr: "Disposition réanimateur 24h", category: "disposition", requiresDistance: false, requiresStaffType: true, tvaExempt: false },
    // Actes médicaux à domicile
    { code: "SOINS_INFIRMIERS", nameFr: "Soins infirmiers à domicile", category: "soins", requiresDistance: false, requiresStaffType: false, tvaExempt: false },
    { code: "INJECTION", nameFr: "Injection", category: "soins", requiresDistance: false, requiresStaffType: false, tvaExempt: false },
    { code: "PERFUSION", nameFr: "Perfusion", category: "soins", requiresDistance: false, requiresStaffType: false, tvaExempt: false },
    { code: "PANSEMENT", nameFr: "Pansement", category: "soins", requiresDistance: false, requiresStaffType: false, tvaExempt: false },
    { code: "SUTURE", nameFr: "Suture", category: "soins", requiresDistance: false, requiresStaffType: false, tvaExempt: false },
    { code: "SONDAGE", nameFr: "Sondage urinaire", category: "soins", requiresDistance: false, requiresStaffType: false, tvaExempt: false },
    { code: "ECG", nameFr: "ECG à domicile", category: "soins", requiresDistance: false, requiresStaffType: false, tvaExempt: false },
    { code: "GLYCEMIE", nameFr: "Glycémie", category: "soins", requiresDistance: false, requiresStaffType: false, tvaExempt: false },
    { code: "TENSION", nameFr: "Tension artérielle", category: "soins", requiresDistance: false, requiresStaffType: false, tvaExempt: false },
    { code: "CONSULTATION_DOM", nameFr: "Consultation à domicile", category: "consultation", requiresDistance: false, requiresStaffType: true, tvaExempt: false },
    { code: "KINE_SEANCE", nameFr: "Séance kinésithérapie", category: "kine", requiresDistance: false, requiresStaffType: false, tvaExempt: false },
    { code: "OXYGENE", nameFr: "Oxygénothérapie", category: "soins", requiresDistance: false, requiresStaffType: false, tvaExempt: false },
  ];

  for (const entry of catalog) {
    await prisma.serviceCatalog.upsert({
      where: { code: entry.code },
      update: {},
      create: { ...entry, isActive: true },
    });
  }
  console.log("  ✓ service_catalog");

  // ---------------------------------------------------------------------------
  // pricing_rules
  // ---------------------------------------------------------------------------
  const rules = [
    // Transport
    { catalogCode: "TRANSPORT_SIMPLE",      isUrgent: false, staffType: null, durationHours: null, basePrice: 150 },
    { catalogCode: "TRANSPORT_SIMPLE",      isUrgent: true,  staffType: null, durationHours: null, basePrice: 250 },
    { catalogCode: "TRANSPORT_URGENT",      isUrgent: null,  staffType: null, durationHours: null, basePrice: 300 },
    { catalogCode: "TRANSPORT_MEDICAL",     isUrgent: false, staffType: "nurse",       durationHours: null, basePrice: 350 },
    { catalogCode: "TRANSPORT_MEDICAL",     isUrgent: false, staffType: "doctor",      durationHours: null, basePrice: 500 },
    { catalogCode: "TRANSPORT_MEDICAL",     isUrgent: true,  staffType: "nurse",       durationHours: null, basePrice: 500 },
    { catalogCode: "TRANSPORT_MEDICAL",     isUrgent: true,  staffType: "doctor",      durationHours: null, basePrice: 700 },
    { catalogCode: "TRANSPORT_REANIMATION", isUrgent: null,  staffType: "reanimator",  durationHours: null, basePrice: 1200 },
    // Disposition infirmier
    { catalogCode: "DISPO_INFIRMIER_12H",   isUrgent: null, staffType: "nurse",      durationHours: 12, basePrice: 500 },
    { catalogCode: "DISPO_INFIRMIER_24H",   isUrgent: null, staffType: "nurse",      durationHours: 24, basePrice: 900 },
    // Disposition médecin
    { catalogCode: "DISPO_MEDECIN_12H",     isUrgent: null, staffType: "doctor",     durationHours: 12, basePrice: 1000 },
    { catalogCode: "DISPO_MEDECIN_24H",     isUrgent: null, staffType: "doctor",     durationHours: 24, basePrice: 1800 },
    // Disposition réanimateur
    { catalogCode: "DISPO_REANIMATEUR_12H", isUrgent: null, staffType: "reanimator", durationHours: 12, basePrice: 1500 },
    { catalogCode: "DISPO_REANIMATEUR_24H", isUrgent: null, staffType: "reanimator", durationHours: 24, basePrice: 2800 },
    // Actes médicaux
    { catalogCode: "SOINS_INFIRMIERS",  isUrgent: null, staffType: null, durationHours: null, basePrice: 150 },
    { catalogCode: "INJECTION",         isUrgent: null, staffType: null, durationHours: null, basePrice: 80 },
    { catalogCode: "PERFUSION",         isUrgent: null, staffType: null, durationHours: null, basePrice: 200 },
    { catalogCode: "PANSEMENT",         isUrgent: null, staffType: null, durationHours: null, basePrice: 120 },
    { catalogCode: "SUTURE",            isUrgent: null, staffType: null, durationHours: null, basePrice: 350, notes: "Tarif médian (250–500 MAD). Dérogation admin possible." },
    { catalogCode: "SONDAGE",           isUrgent: null, staffType: null, durationHours: null, basePrice: 180 },
    { catalogCode: "ECG",               isUrgent: null, staffType: null, durationHours: null, basePrice: 200 },
    { catalogCode: "GLYCEMIE",          isUrgent: null, staffType: null, durationHours: null, basePrice: 60 },
    { catalogCode: "TENSION",           isUrgent: null, staffType: null, durationHours: null, basePrice: 50 },
    { catalogCode: "CONSULTATION_DOM",  isUrgent: null, staffType: "doctor", durationHours: null, basePrice: 400 },
    { catalogCode: "KINE_SEANCE",       isUrgent: null, staffType: null, durationHours: null, basePrice: 200 },
    { catalogCode: "OXYGENE",           isUrgent: null, staffType: null, durationHours: null, basePrice: 300 },
  ];

  for (const rule of rules) {
    await prisma.pricingRule.create({
      data: {
        catalogCode:   rule.catalogCode,
        isUrgent:      rule.isUrgent ?? null,
        staffType:     rule.staffType ?? null,
        durationHours: rule.durationHours ?? null,
        basePrice:     rule.basePrice,
        currency:      "MAD",
        notes:         (rule as { notes?: string }).notes ?? null,
      },
    });
  }
  console.log("  ✓ pricing_rules");

  // ---------------------------------------------------------------------------
  // Admin user
  // ---------------------------------------------------------------------------
  const adminPassword = await bcrypt.hash("Admin@MediTrans2025", 12);
  await prisma.user.upsert({
    where: { email: "admin@meditrans.ma" },
    update: {},
    create: {
      email: "admin@meditrans.ma",
      passwordHash: adminPassword,
      role: "admin",
      name: "Administrateur",
      isActive: true,
    },
  });
  console.log("  ✓ admin user (admin@meditrans.ma / Admin@MediTrans2025)");

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
