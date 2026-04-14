# MediTrans Core

> **Plateforme de gestion opérationnelle pour le transport médical et les soins à domicile — Maroc**

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38BDF8?logo=tailwindcss)
![Phase](https://img.shields.io/badge/Phase-0%20%E2%80%94%20Foundations-orange)

---

## Vue d'ensemble

MediTrans Core est une plateforme opérationnelle complète pour la gestion d'une entreprise de transport médical et de soins à domicile au Maroc. Elle couvre l'ensemble du cycle de vie opérationnel : enregistrement des clients et patients, planification et tarification automatique des services, génération de factures et suivi des paiements.

### Entités principales

| Entité | Rôle |
|---|---|
| **Client** | L'entité payante (particulier, entreprise, assureur) |
| **Patient** | La personne transportée ou soignée |
| **Service** | Le cœur opérationnel — tout part d'un service |
| **PricingSnapshot** | Tarif immuable calculé à la création du service |
| **Invoice** | Document légal regroupant plusieurs services |
| **Payment** | Paiement réel enregistré contre une facture |

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 14 — App Router |
| Langage | TypeScript strict (no `any`) |
| Base de données | PostgreSQL 15 |
| ORM | Prisma 5 |
| Validation | Zod |
| UI | TailwindCSS 3 + design tokens |
| Auth | NextAuth.js v4 |
| Hashage | bcryptjs |

---

## Démarrage rapide

```bash
# 1. Cloner le dépôt
git clone https://github.com/<your-org>/meditrans-core.git
cd meditrans-core

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# → Éditer .env avec vos identifiants PostgreSQL

# 4. Créer et migrer la base de données
npm run db:migrate

# 5. Peupler les données de référence (tarifs, catalogue, admin)
npm run db:seed

# 6. Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## Commandes disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement (port 3000) |
| `npm run build` | Build de production |
| `npm run lint` | Vérification ESLint |
| `npm run format` | Formatage Prettier |
| `npm run db:migrate` | Appliquer les migrations Prisma |
| `npm run db:seed` | Peupler les données initiales |
| `npm run db:studio` | Interface visuelle Prisma Studio |
| `npm run db:reset` | Réinitialiser la base de données |

---

## Architecture

```
src/
├── app/                        # App Router — pages thin (< 30 lignes)
│   └── dashboard/
│       ├── services/
│       ├── clients/
│       ├── patients/
│       ├── invoices/
│       ├── payments/
│       └── admin/pricing/
│
├── modules/                    # Logique métier — 1 module par domaine
│   ├── users/                  # Auth, rôles (admin / assistant)
│   ├── clients/                # Entités payantes
│   ├── patients/               # Personnes transportées
│   ├── services/               # Cœur opérationnel
│   ├── pricing/                # Moteur de tarification (critique)
│   │   ├── pricing.engine.ts   # Algorithme 7 étapes
│   │   ├── pricing.errors.ts   # Erreurs typées
│   │   └── pricing.utils.ts    # isNightTime, computeSpecificity
│   ├── invoices/               # Documents de facturation
│   └── payments/               # Paiements et suivi
│
├── components/                 # UI atoms / layout / features
├── lib/                        # db.ts · config.ts · constants.ts · utils.ts
└── styles/
    └── tokens.css
```

### Couches par module

```
*.types.ts      Types TypeScript — aucune dépendance
*.schema.ts     Validation Zod
*.repository.ts CRUD Prisma uniquement
*.service.ts    Logique métier et orchestration
*.actions.ts    Next.js Server Actions — point d'entrée UI
```

---

## Moteur de tarification

Le moteur est **déterministe, sans état, piloté par la base de données**. Aucun prix n'est codé en dur.

```
Input:  { catalogCode, scheduledAt, isUrgent, distanceKm,
          staffType, durationHours, selectedModifiers[], manualOverride? }

Étapes: 1. Résolution catalogue
        2. Résolution règle tarifaire (spécificité maximale)
        3. Frais de déplacement (distanceKm × 7.50 MAD/km)
        4. Modificateurs sélectionnés (NIGHT_SURCHARGE +100 MAD, etc.)
        5. TVA (10% par défaut, configurable par catégorie)
        6. Dérogation manuelle (admin uniquement, raison obligatoire)
        7. Persistance snapshot immuable et versionné

Output: { basePrice, distanceFee, modifiers[], subtotalHt,
          tvaAmount, totalTtc, breakdown[], snapshotId }
```

**Règles non-négociables :**
- Prix zéro interdit → `PricingRuleNotFoundError`
- Snapshots append-only versionnés `(service_id, version)`
- Dérogation manuelle = admin + raison + audit complet

---

## Données de référence (seed)

| Table | Contenu |
|---|---|
| `system_config` | TVA=10%, Nuit=21h–7h |
| `service_catalog` | 22 types de services |
| `pricing_rules` | 26 règles tarifaires |
| `pricing_modifiers` | NIGHT_SURCHARGE · ROUND_TRIP · VIP · HOLIDAY |
| `pricing_distance_rates` | 7.50 MAD/km |
| `users` | Admin par défaut |

> ⚠️ **Ne pas utiliser les identifiants du seed en production.** Changer le mot de passe admin immédiatement après le déploiement.

---

## Feuille de route

| Stage | Contenu | Statut |
|---|---|---|
| **01 — Foundations** | Next.js · Prisma · DB · Seeds · Modules skeleton | ✅ **Terminé** |
| **02 — Design System** | Button · Input · Table · StatusPill · Sidebar | 🔜 |
| **03 — Clients & Patients** | CRUD complet + list avec recherche | 🔜 |
| **04 — Pricing Engine** | Tests unitaires + previewPrice + override | 🔜 |
| **05 — Services** | ServiceForm + PricingPreview panel | 🔜 |
| **06 — Invoices** | InvoiceBuilder + PDF | 🔜 |
| **07 — Payments** | Enregistrement + statut auto | 🔜 |
| **08 — Admin** | Gestion tarifs + system_config | 🔜 |
| **09 — Auth & Dashboard** | NextAuth · KPIs · Recharts | 🔜 |

---

## Variables d'environnement

Voir `.env.example` pour la liste complète.

| Variable | Description |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `NEXTAUTH_SECRET` | Secret JWT pour NextAuth (min. 32 chars) |
| `NEXTAUTH_URL` | URL de base de l'application |

---

## Référence architecturale

> Ce projet est implémenté conformément au **MediTrans Architecture Blueprint v5.0** — document interne d'ingénierie, source de vérité unique pour toutes les décisions de conception.
