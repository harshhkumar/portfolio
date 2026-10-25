/* Single source of truth for the whole workbook.
   Everything on the site (KPIs, chart, experience rows, SQL tables) is derived from here. */

const PROFILE = {
  name: 'Harsh Kumar',
  email: 'harshvidyarthi312@gmail.com',
  phone: '+91-8449368456',
  linkedin: 'https://www.linkedin.com/in/kumarharshh',
  github: 'https://github.com/harshhkumar',
  kaggle: 'https://www.kaggle.com/okayharsh',
  resume: 'assets/docs/Harsh_Kumar_Resume.pdf',
};

const COMPANIES = {
  trivas:   { name: 'Trivas.ai',   title: 'Data Analyst',             start: '2025-08', end: null,      color: 'c1' },
  viome:    { name: 'Viome',       title: 'Data Analyst',             start: '2024-10', end: '2025-08', color: 'c2' },
  datagets: { name: 'Datagets.ai', title: 'Software Engineer Intern', start: '2024-05', end: '2024-10', color: 'c3' },
};

/* Experience bullets. **double asterisks** mark the numbers/skills that get highlighted. */
const BULLETS = [
  { id: 't1', co: 'trivas', text: 'Designed and analyzed **A/B tests** and cohort-level experiments for Promo Analysis, applying **statistical significance testing** to validate results, driving a **15%** lift in promo-driven conversion.', tags: ['A/B Testing', 'Significance Testing', 'Cohorts'] },
  { id: 't2', co: 'trivas', text: 'Built a **decision-tree** based refund-classification model for AI Analyst, validating classification thresholds against historical refund data through **hypothesis testing**, eliminating manual review and cutting refund resolution time by **40%**.', tags: ['Decision Tree', 'Hypothesis Testing', 'Python'] },
  { id: 't3', co: 'trivas', text: 'Engineered client-specific data models and statistical business rules for Wingman, an AI analytics tool, cutting onboarding-to-insight time by **50%** across every newly onboarded account.', tags: ['Data Modeling', 'Business Rules', 'AI Analytics'] },
  { id: 't4', co: 'trivas', text: 'Own client-facing analytics for enterprise brands, including a **$200M+** revenue wellness brand, running **A/B tests**, **cohort analyses**, and **significance testing** on platform audits, informing business recommendations across managed accounts.', tags: ['Client Analytics', 'A/B Testing', 'Cohorts', 'Audits'] },
  { id: 't5', co: 'trivas', text: 'Designed the underlying data model powering fully isolated, client-specific reporting across **15+** source integrations spanning sales, ads, email, traffic, CS, reviews, subscriptions, and seller platforms, cutting new-client onboarding time by **35%** while supporting **6** distinct sub-brands.', tags: ['Multi-Tenant', 'Data Modeling', 'Integrations'] },
  { id: 't6', co: 'trivas', text: 'Validated and reconciled source-level data across every connected platform through **SQL**-based ETL checks and **variance analysis**, powering **100%** of accurate client reporting while cutting data-refresh latency by **40%**.', tags: ['SQL', 'ETL', 'Data Quality', 'Data Validation'] },
  { id: 't7', co: 'trivas', text: 'Direct a **3-person** analytics team, setting day-to-day priorities across client integrations, audits, and reporting deliverables, lifting on-time delivery of reporting commitments to **95%**.', tags: ['Leadership', 'Delivery'] },

  { id: 'v1', co: 'viome', text: 'Built dashboards from scratch across **8** business domains (Sales, Ads, Traffic, Retention, Subscriptions, Finance, Operations, CX), enabling self-serve reporting for a **500K+** customer base validated to **99+%** accuracy against source data.', tags: ['Tableau', 'Dashboards', 'Self-Serve BI'] },
  { id: 'v2', co: 'viome', text: 'Applied **cohort, funnel, and attribution modeling** (Linear, Time Decay) across Sales, Ads, Retention, and Subscription funnels, driving a **12%** increase in subscription revenue through data-backed retention and upsell recommendations that helped scale the business.', tags: ['Cohorts', 'Funnels', 'Attribution'] },
  { id: 'v3', co: 'viome', text: 'Presented insights across **80+** WBR/MBR sessions directly to Viome stakeholders, translating analysis into strategic recommendations that shaped quarterly planning.', tags: ['Stakeholders', 'WBR/MBR', 'Storytelling'] },
  { id: 'v4', co: 'viome', text: 'Led a **4-person** migration of **Tableau** reporting from **Redshift** to **PostgreSQL**, delivering on schedule with **zero** reporting downtime across all live dashboards.', tags: ['Migration', 'Redshift', 'PostgreSQL', 'Leadership'] },
  { id: 'v5', co: 'viome', text: 'Optimized **SQL** queries and automated recurring reporting workflows, cutting manual reporting time by **25%** while running platform audits that kept monthly financial close on schedule.', tags: ['SQL', 'Automation', 'Finance'] },

  { id: 'd1', co: 'datagets', text: 'Built **Next Best Product**, related-product, and cross-sell/upsell recommendation logic for D2C brands, replacing generic one-size-fits-all suggestions and lifting recommendation click-through by **18%** without added acquisition spend.', tags: ['Recommendations', 'D2C', 'Python'] },
  { id: 'd2', co: 'datagets', text: 'Partnered with the product team to define **CTR** and conversion-lift metrics for the recommendation engine, driving a **12%** conversion lift across live storefronts through iterative tuning.', tags: ['Product Metrics', 'Experimentation'] },
  { id: 'd3', co: 'datagets', text: 'Integrated **Shopify** data via **GraphQL APIs** to design **ML-ready datasets** for predictive modeling, expanding analytics coverage to **10+** additional merchant accounts.', tags: ['Shopify', 'GraphQL', 'ML Datasets'] },
  { id: 'd4', co: 'datagets', text: 'Presented recommendation performance and adoption insights to engineering and product stakeholders, influencing prioritization of **3** roadmap features for the next release cycle.', tags: ['Stakeholders', 'Roadmap'] },
];

/* Every number worth quoting, one row each. dir: up | down | held | level | count */
const METRICS = [
  { id: 'm1',  co: 'trivas',   b: 't1', area: 'Experimentation', metric: 'promo-driven conversion',        value: 15,     unit: '%',         dir: 'up' },
  { id: 'm2',  co: 'trivas',   b: 't2', area: 'AI Analyst',      metric: 'refund resolution time',         value: 40,     unit: '%',         dir: 'down' },
  { id: 'm3',  co: 'trivas',   b: 't3', area: 'Wingman',         metric: 'onboarding-to-insight time',     value: 50,     unit: '%',         dir: 'down' },
  { id: 'm4',  co: 'trivas',   b: 't4', area: 'Client Analytics', metric: 'revenue of the flagship brand I support', value: 200,    unit: '$M',        dir: 'count' },
  { id: 'm5',  co: 'trivas',   b: 't5', area: 'Data Modeling',   metric: 'new-client onboarding time',     value: 35,     unit: '%',         dir: 'down' },
  { id: 'm6',  co: 'trivas',   b: 't5', area: 'Data Modeling',   metric: 'source integrations modeled',    value: 15,     unit: 'sources',   dir: 'count' },
  { id: 'm7',  co: 'trivas',   b: 't5', area: 'Data Modeling',   metric: 'sub-brands supported',           value: 6,      unit: 'brands',    dir: 'count' },
  { id: 'm8',  co: 'trivas',   b: 't6', area: 'Data Quality',    metric: 'data-refresh latency',           value: 40,     unit: '%',         dir: 'down' },
  { id: 'm9',  co: 'trivas',   b: 't7', area: 'Leadership',      metric: 'on-time reporting delivery',     value: 95,     unit: '%',         dir: 'level' },
  { id: 'm10', co: 'trivas',   b: 't7', area: 'Leadership',      metric: 'analysts led',                   value: 3,      unit: 'people',    dir: 'count' },
  { id: 'm11', co: 'viome',    b: 'v1', area: 'Dashboards',      metric: 'customers served by self-serve BI', value: 500000, unit: 'customers', dir: 'count' },
  { id: 'm12', co: 'viome',    b: 'v1', area: 'Dashboards',      metric: 'accuracy vs source data',        value: 99,     unit: '%',         dir: 'level' },
  { id: 'm13', co: 'viome',    b: 'v2', area: 'Growth',          metric: 'subscription revenue',           value: 12,     unit: '%',         dir: 'up' },
  { id: 'm14', co: 'viome',    b: 'v3', area: 'Stakeholders',    metric: 'WBR/MBR sessions presented',     value: 80,     unit: 'sessions',  dir: 'count' },
  { id: 'm15', co: 'viome',    b: 'v4', area: 'Migration',       metric: 'analysts led in migration',      value: 4,      unit: 'people',    dir: 'count' },
  { id: 'm16', co: 'viome',    b: 'v5', area: 'Automation',      metric: 'manual reporting time',          value: 25,     unit: '%',         dir: 'down' },
  { id: 'm17', co: 'datagets', b: 'd1', area: 'Recommendations', metric: 'recommendation click-through',   value: 18,     unit: '%',         dir: 'up' },
  { id: 'm18', co: 'datagets', b: 'd2', area: 'Recommendations', metric: 'storefront conversion',          value: 12,     unit: '%',         dir: 'up' },
  { id: 'm19', co: 'datagets', b: 'd3', area: 'Data',            metric: 'merchant accounts added',        value: 10,     unit: 'accounts',  dir: 'count' },
  { id: 'm20', co: 'datagets', b: 'd4', area: 'Product',         metric: 'roadmap features influenced',    value: 3,      unit: 'features',  dir: 'count' },
];

/* Hero tiles on the Summary sheet. `m` links to METRICS (for the inspector). */
const KPIS = [
  { m: 'm1',  val: 15,     prefix: '+', suffix: '%', label: 'Promo-driven conversion', note: 'A/B tests and cohort experiments', formula: '=(Promo[Variant_CVR] - Promo[Control_CVR]) / Promo[Control_CVR]' },
  { m: 'm6',  val: 15,     suffix: '+',  label: 'Source integrations modeled', note: 'One isolated, multi-tenant data model',   formula: '=COUNTA(Integrations[Source])' },
  { m: 'm11', val: 500,    suffix: 'K+', label: 'Customers on self-serve BI',  note: 'Dashboards built from scratch, 8 domains', formula: '=SUM(Dashboards[Customers_Covered])' },
  { m: 'm13', val: 12,     prefix: '+', suffix: '%', label: 'Subscription revenue', note: 'Retention and upsell recommendations', formula: '=(Revenue[After] - Revenue[Before]) / Revenue[Before]' },
  { m: 'm2',  val: 40,     suffix: '%', label: 'Faster refund resolution', note: 'Decision-tree refund classifier', formula: '=1 - AVERAGE(Refunds[Days_After]) / AVERAGE(Refunds[Days_Before])' },
  { m: 'm14', val: 80,     suffix: '+',  label: 'WBR / MBR sessions presented', note: 'Straight to stakeholders',               formula: '=COUNTA(Reviews[Session])' },
];

const SKILLS = [
  { cat: 'Languages',                    items: ['SQL', 'Python'] },
  { cat: 'Data Analytics',               items: ['A/B Testing', 'Statistical Significance Testing', 'Hypothesis Testing', 'Cohort & Funnel Analysis', 'Attribution Modeling', 'Variance Analysis', 'Data Validation', 'Decision-Tree Modeling', 'Product Metrics (CTR, lift)'] },
  { cat: 'Product & Business Analytics', items: ['Product Analytics', 'Self-Serve BI', 'Business Reviews (WBR/MBR)', 'PRD Writing'] },
  { cat: 'BI & Visualization',           items: ['Tableau (VizQL, LOD)', 'Power BI', 'Omni Analytics', 'Sisense', 'Matplotlib'] },
  { cat: 'Data Platforms',               items: ['Snowflake', 'Amazon Redshift', 'PostgreSQL', 'BigQuery', 'GCP', 'AWS', 'Azure'] },
  { cat: 'Data Engineering',             items: ['dbt', 'ETL Pipelines', 'Multi-Tenant Architecture', 'Airflow', 'Meridian Architecture', 'Data Modeling'] },
  { cat: 'APIs & Tools',                 items: ['REST APIs', 'GraphQL', 'ShopifyQL', 'Postman', 'Git/GitHub'] },
  { cat: 'Soft Skills',                  items: ['Cross-Functional Collaboration', 'Stakeholder Management', 'Problem Solving'] },
];

const CERTIFICATES = [
  { name: 'Foundations: Data, Data, Everywhere', issuer: 'Google' },
  { name: 'Data Visualisation: Empowering Business with Effective Insights (Job Simulation)', issuer: 'Tata Group' },
  { name: 'Power BI (Job Simulation)', issuer: 'PwC Switzerland' },
];

const EDUCATION = [
  { degree: 'B.Tech, Computer Science & Engineering (Data Science and Analytics)', institution: 'Dehradun Institute of Technology, Dehradun', start_year: 2020, end_year: 2024, cgpa: 7.43 },
];

const HOBBIES = [
  { hobby: 'Chess', note: 'Probably checkmating someone on the chessboard' },
  { hobby: 'Snooker', note: 'Played open tournaments across Bangalore and North India' },
];
