# MediTrans — توثيق المرحلة 0 : الأساسيات (Stage 01 — Foundations)

> **التاريخ :** أبريل 2026  
> **الحالة :** ✅ مكتملة بالكامل — جاهزة للمرحلة 02 (Design System)

---

## 1. ما هي المرحلة 0؟

المرحلة 0 هي مرحلة **إعداد البنية التحتية الكاملة** للمشروع قبل البدء في أي واجهة مستخدم أو منطق عمل.
الهدف هو أن يكون الفريق قادراً على البدء في أي مرحلة لاحقة دون الحاجة للعودة وإصلاح الأساسيات.

---

## 2. ما تم بناؤه

### 2.1 إعداد المشروع

| العنصر | التفاصيل |
|---|---|
| **Framework** | Next.js 14 — App Router — TypeScript strict |
| **مدير الحزم** | npm |
| **Code style** | ESLint + Prettier + `.gitattributes` (LF) |
| **Path alias** | `@/*` → `src/*` |
| **Font** | Inter (Google Fonts) — متغير CSS: `--font-inter` |

---

### 2.2 قاعدة البيانات

- **PostgreSQL 15** محلياً على المنفذ 5432
- **قاعدة البيانات:** `meditrans`
- **Migration:** `20260414_init` — طُبِّقت بنجاح، كل الجداول أنشئت

#### الجداول المُنشأة (11 جدول)

| الجدول | الوصف |
|---|---|
| `users` | المستخدمون (admin / assistant) |
| `clients` | العملاء (أفراد، شركات، مؤمِّنون) |
| `patients` | المرضى المنقولون أو المعالَجون |
| `service_catalog` | كتالوج الخدمات المتاحة |
| `pricing_rules` | قواعد التسعير حسب الكتالوج والسياق |
| `pricing_modifiers` | معدِّلات الأسعار (إضافات، مضاعفات) |
| `pricing_distance_rates` | أسعار التنقل بالكيلومتر |
| `services` | السجل التشغيلي لكل خدمة منفَّذة |
| `pricing_snapshots` | لقطة السعر عند إنشاء الخدمة (غير قابلة للتغيير) |
| `invoices` | الفواتير (تجمع عدة خدمات) |
| `invoice_lines` | أسطر الفاتورة (service + snapshot) |
| `payments` | المدفوعات المسجَّلة على الفواتير |
| `system_config` | إعدادات النظام (TVA، ساعات الليل، ...) |

---

### 2.3 بيانات البذر (Seed)

تم ملء قاعدة البيانات بالبيانات المرجعية التالية:

#### `system_config` — 3 مدخلات
```
DEFAULT_TVA_RATE  = 0.10   (10%)
NIGHT_START_HOUR = 21
NIGHT_END_HOUR   = 7
```

#### `service_catalog` — 22 خدمة

| الفئة | الخدمات |
|---|---|
| **transport** | Transport simple, urgent, médicalisé, réanimation |
| **disposition** | Infirmier/Médecin/Réanimateur × 12h et 24h |
| **soins** | Injection, Perfusion, Pansement, Suture (350 MAD), Sondage, ECG, Glycémie, Tension, Oxygène |
| **consultation** | Consultation à domicile |
| **kine** | Séance kinésithérapie |

#### `pricing_rules` — 26 قاعدة

أمثلة مختارة:

| الخدمة | السياق | السعر الأساسي |
|---|---|---|
| Transport simple | Normal | 150 MAD |
| Transport simple | Urgent | 250 MAD |
| Transport réanimation | — | 1 200 MAD |
| Disposition infirmier 24h | — | 900 MAD |
| Disposition médecin 24h | — | 1 800 MAD |
| Disposition réanimateur 24h | — | 2 800 MAD |
| Suture | — | 350 MAD |
| ECG | — | 200 MAD |

#### `pricing_modifiers` — 3 معدِّلات

| الكود | الاسم | النوع | القيمة |
|---|---|---|---|
| `NIGHT_SURCHARGE` | Supplément nuit | flat_add | +100 MAD (اختيار يدوي بالمشغّل) |
| `VIP_SURCHARGE` | Supplément VIP | multiplier | ×1.0 (غير مفعَّل) |
| `HOLIDAY_SURCHARGE` | Jour férié | multiplier | ×1.20 (غير مفعَّل) |

#### `pricing_distance_rates` — 1 سعر
```
7.50 MAD/km  (Zone: hors_centre_ville)
```

#### `users` — مستخدم admin افتراضي
```
Email    : admin@meditrans.ma
Password : Admin@MediTrans2025
Role     : admin
```
> ⚠️ يجب تغيير كلمة المرور عند النشر الإنتاجي.

---

### 2.4 هيكل `src/` الكامل

```
src/
├── app/
│   ├── layout.tsx                        ← RootLayout: Inter, lang=fr, metadata
│   ├── page.tsx                          ← صفحة الاستقبال مع Roadmap
│   └── dashboard/
│       ├── layout.tsx
│       ├── page.tsx                      ← Tableau de bord
│       ├── services/page.tsx + [id]/
│       ├── clients/page.tsx + [id]/
│       ├── patients/page.tsx
│       ├── invoices/page.tsx + [id]/
│       ├── payments/page.tsx
│       └── admin/pricing/page.tsx
│
├── lib/
│   ├── db.ts           ← PrismaClient singleton (global pattern)
│   ├── config.ts       ← getSystemConfig() من قاعدة البيانات
│   ├── constants.ts    ← أنواع TypeScript + labels فرنسية
│   └── utils.ts        ← cn(), formatCurrency(), formatDate()
│
├── modules/
│   ├── users/          ← types · schema · repository · service · actions
│   ├── clients/        ← types · schema · repository · service · actions
│   ├── patients/       ← types · schema · repository · service · actions
│   ├── services/       ← types · schema · repository · service · actions · utils
│   ├── pricing/        ← types · schema · repository · engine · errors · utils · actions
│   ├── invoices/       ← types · schema · repository · service · actions · utils
│   └── payments/       ← types · repository · service · actions
│
├── components/         ← (فارغ — Stage 02)
└── styles/
    └── tokens.css
```

---

### 2.5 محرك التسعير `pricing.engine.ts`

الملف الأكثر أهمية في المشروع. خوارزمية **7 خطوات ثابتة، لا سعر مشفَّر**:

```
الخطوة 1 → findCatalogEntry()     : التحقق من وجود الخدمة في الكتالوج
الخطوة 2 → findPricingRules()     : إيجاد أفضل قاعدة تسعير (أعلى خصوصية)
الخطوة 3 → findActiveDistanceRate(): حساب رسوم المسافة (distanceKm × 7.50)
الخطوة 4 → findActiveModifiers()  : تطبيق المعدِّلات المختارة يدوياً
                                    (NIGHT_SURCHARGE: +100 MAD — اختيار يدوي دائماً)
الخطوة 5 → TVA                    : 10% (أو 0 إذا catalog.tvaExempt=true)
الخطوة 6 → manualOverride         : تجاوز يدوي (admin فقط، سبب إلزامي)
الخطوة 7 → createSnapshot()       : حفظ لقطة سعر مرقَّمة غير قابلة للتغيير
```

> **قواعد اللية:** لا يوجد كشف تلقائي لساعات الليل في محرك التسعير. الليل = اختيار يدوي بالمشغّل عبر `NIGHT_SURCHARGE`. قيم `NIGHT_START_HOUR` و`NIGHT_END_HOUR` محفوظة في `system_config` للمعلومات فقط.

**الأخطاء المصنَّفة:**
```typescript
PricingRuleNotFoundError    // ← السعر صفر ممنوع
PricingCatalogNotFoundError // ← كتالوج غير موجود
PricingValidationError      // ← خطأ في المدخلات أو الصلاحيات
```

**القرارات النهائية للأعمال:**
- ❌ لا `isRoundTrip` — كل رحلة خدمة مستقلة: 500 + 500 = 1000 MAD
- ❌ لا كشف تلقائي للية — `NIGHT_SURCHARGE` اختيار يدوي دائماً
- ✅ TVA 10% ثابتة — قابلة للتعديل عبر `system_config.DEFAULT_TVA_RATE`

**نتيجة الحساب `PricingResult`:**
```typescript
{
  basePrice, distanceFee, modifiersApplied[],
  subtotalHt, tvaRate, tvaAmount, totalTtc,
  breakdown[],     // ← قائمة تفصيلية لكل سطر
  matchedRuleIds,  // ← للأرشيف والتدقيق
  isOverridden,    // ← هل تم تجاوز السعر يدوياً؟
  snapshotId       // ← ID اللقطة المحفوظة
}
```

---

### 2.6 قواعد العمل المُطبَّقة

| الرمز | القاعدة | مكان التطبيق |
|---|---|---|
| CR-01 | السعر صفر ممنوع | `pricing.engine.ts` → `PricingRuleNotFoundError` |
| CR-02 | اللقطات append-only | `pricing.engine.ts` → isCurrent=false قبل إنشاء جديدة |
| CR-03 | التجاوز اليدوي: admin فقط + سبب | `pricing.engine.ts` + `pricing.actions.ts` |
| CR-04 | التجاوز يُنشئ snapshot جديد | `applyOverrideAction` transactional |
| CR-05 | التجاوز يُحدِّث InvoiceLine تلقائياً | `applyOverrideAction` |
| CR-12 | إلغاء الفاتورة محظور إذا وجدت مدفوعات | `invoice.service.ts` → `cancelInvoice()` |
| CR-13 | الخدمة الملغاة لا تُفوتَر | `invoice.service.ts` → `createInvoice()` |
| CR-14 | الخدمة المفوتَرة لا تُفوتَر مرة ثانية | `invoice.service.ts` → فحص `invoiceLine` |

---

### 2.7 نمط الطبقات لكل module

```
*.types.ts      ← واجهات TypeScript فقط، صفر تبعيات
*.schema.ts     ← صيغ Zod للتحقق من المدخلات
*.repository.ts ← Prisma فقط، لا منطق أعمال
*.service.ts    ← منطق الأعمال، يستدعي repository
*.actions.ts    ← "use server"، نقطة دخول الواجهة
```

---

## 3. الملفات الأساسية بالمسارات

| الملف | الدور |
|---|---|
| `prisma/schema.prisma` | مصدر الحقيقة لبنية قاعدة البيانات |
| `prisma/seed.ts` | بيانات البذر الكاملة |
| `prisma/migrations/20260414_init/` | Migration الأولى |
| `src/lib/db.ts` | PrismaClient singleton |
| `src/lib/config.ts` | `getSystemConfig()` — قراءة system_config |
| `src/lib/constants.ts` | أنواع + labels فرنسية لكل enum |
| `src/modules/pricing/pricing.engine.ts` | قلب المشروع — محرك التسعير |
| `src/modules/pricing/pricing.errors.ts` | أخطاء مسماة typed |
| `src/modules/invoices/invoice.service.ts` | منطق الفوترة + CR-12/13/14 |
| `tailwind.config.ts` | نظام التصميم الكامل (tokens §9.1) |

---

## 4. سكريبتات npm

```bash
npm run dev          # سيرفر التطوير — http://localhost:3000
npm run build        # بناء الإنتاج
npm run lint         # فحص ESLint
npm run format       # Prettier

npm run db:migrate   # تطبيق migrations جديدة
npm run db:seed      # ملء بيانات البذر
npm run db:studio    # Prisma Studio (واجهة مرئية)
npm run db:reset     # إعادة تعيين كاملة
```

---

## 5. ما تبقى (المراحل القادمة)

| المرحلة | المحتوى | الأولوية |
|---|---|---|
| **02 — Design System** | Button, Input, Select, Table, Badge, StatusPill, Modal, Card, Sidebar, Header | عالية |
| **03 — Clients & Patients** | CRUD كامل + صفحات قائمة مع بحث | عالية |
| **04 — Pricing Engine Tests** | Unit tests للمحرك (Jest/Vitest) — 15+ سيناريو | حرجة |
| **05 — Services** | ServiceForm + PricingPreview panel | عالية |
| **06 — Invoices** | InvoiceBuilder + PDF (react-pdf) | عالية |
| **07 — Payments** | تسجيل المدفوعات + تحديث حالة الفاتورة | عالية |
| **08 — Admin Pricing** | إدارة pricing_rules + modifiers + system_config | متوسطة |
| **09 — Auth & Dashboard** | NextAuth.js + KPIs + Recharts | متوسطة |

---

## 6. كيفية استئناف العمل

```bash
# 1. استنساخ المشروع
git clone https://github.com/<your-org>/meditrans-core.git

# 2. تثبيت التبعيات
npm install

# 3. نسخ متغيرات البيئة
cp .env.example .env
# ثم تعديل DATABASE_URL

# 4. تطبيق migration
npm run db:migrate

# 5. ملء البيانات
npm run db:seed

# 6. تشغيل التطوير
npm run dev
```

---

> **المرجع الأساسي:** `MediTrans-Architecture-Blueprint.md` v5.0  
> كل قرار معماري موثَّق في هذا الملف.
