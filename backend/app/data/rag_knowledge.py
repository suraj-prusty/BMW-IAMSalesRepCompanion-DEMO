"""
BMW IAM Field Intelligence — RAG Knowledge Base.

Extracted from: BMW IAM 2026+ Offer Documentation & BWIR Tender Document.
Injected as system-prompt context for the Azure OpenAI chatbot.
Now server-side — never exposed to the browser.
"""

RAG_KNOWLEDGE = """
=== BMW IAM PROGRAM DOCUMENTATION — FIELD INTELLIGENCE KNOWLEDGE BASE ===

--- HEALTH CHECK: DEFINITION AND PROCESS ---

A Health Check is a structured on-site assessment conducted by a BMW/Accenture field executive at an IAM (Independent Aftermarket) dealer to evaluate performance, readiness, and maturity across key dimensions of the BMW Integrated Retail (IR) program.

What a Health Check assesses:
1. IR Customer Journey Review
   - How the dealer acquires, onboards, and retains Independent Repair (IR) customers
   - Quality and completeness of IR account data in PL24 and NSC systems
   - Frequency and recency of IR contact — are IR relationships active and managed?

2. Performance KPI Review
   - IAM turnover trend vs. target (Sales vs Target %)
   - Portfolio coverage — family codes sold vs. available BMW IAM portfolio
   - PL24 digital adoption rate (target: 75%+)
   - AOS (Automated Order Suggestion) basket adoption (target: 85%+)
   - DB Margin (Dealer Contribution Margin) — target 22%+

3. Digital Tool Adoption Audit
   - Verify PL24 login credentials are active for all counter staff
   - Check AOS basket is configured and reflects current IR ordering patterns
   - Review order-channel split: digital vs. phone/fax
   - Identify staff who default to manual channels and reasons why

4. Training Gap Analysis
   - Identify staff who need PL24 refresher training
   - Assess awareness of AOS workflow and order suggestion acceptance rate
   - Check if an internal digital champion has been designated
   - Evaluate whether training scheduled in NSC system is completed on time

5. Service Maturity Check
   - Response time to IR queries and order fulfilment speed
   - Competitive benchmarking: how does the dealer compare to non-BMW suppliers?
   - IR satisfaction feedback — are IRs choosing the dealer as primary supplier?
   - Delivery reliability and back-order management

6. Action Backlog Review
   - Open actions from previous visits — are they completed?
   - Owner accountability — has the agreed action owner taken responsibility?
   - Pattern analysis — recurring open actions indicate systemic issues

Health Check Outcomes:
- A Health Check score is uploaded to the NSC (National Sales Company) system
- Results inform dealer priority classification: HIGH / MED / LOW
- Feeds into the next visit plan and coaching agenda
- Triggers escalation flags if critical KPIs are below threshold for 2+ visits

--- PL24: WHAT IT IS ---

PL24 is BMW's digital parts ordering platform for the Independent Aftermarket.
- Allows IR customers and dealers to place parts orders digitally (24/7)
- Replaces phone and fax ordering workflows
- Includes AOS (Automated Order Suggestion) — AI-driven basket pre-population based on IR purchase history
- Provides order tracking, invoice history, and parts availability data
- Adoption target: 75% of orders placed through PL24 (not phone/fax)

--- HOW TO RUN A PL24 COACHING SESSION ON-SITE ---

Step 1 — Pre-visit preparation
- Check dealer's current PL24 adoption % from NSC system (target: 75%+)
- Review last 30 days of order-channel split (PL24 vs phone/fax)
- Note any IRs who have PL24 credentials but are not using the system
- Identify the AOS basket acceptance rate and flag low-acceptance IRs

Step 2 — Business readiness check (with dealer principal)
- Confirm PL24 logins are active for all parts counter staff
- Check if a designated internal PL24 champion exists
- Review whether staff have received PL24 certification in the last 12 months
- Identify the top 3 reasons staff still use phone/fax (habit, trust, AOS errors)

Step 3 — Live system walkthrough (with parts counter staff)
- Log into PL24 with the staff member present
- Walk through the AOS order suggestion workflow — show how to accept/modify basket
- Demonstrate the order tracking and delivery status features
- Show invoice history and how to use it for IR customer queries

Step 4 — AOS basket alignment
- Review the current AOS basket for the dealer's top 5 IRs
- Identify family codes missing from the basket that the IR typically orders
- Add missing family codes and set appropriate stock levels
- Confirm the basket reflects the IR's actual repair workshop profile

Step 5 — IR onboarding support
- Identify any active IRs who do NOT have PL24 accounts
- Register new IR credentials on-site or schedule registration within 3 days
- Walk the IR (by phone or in person) through their first PL24 order
- Confirm first digital order is placed before leaving or within agreed SLA

Step 6 — Discount matrix verification
- Confirm the dealer's discount matrix for IRs is correctly configured in PL24
- Ensure IRs see accurate pricing that is competitive vs. non-BMW IAM suppliers
- Flag any pricing anomalies that may be deterring digital adoption

Step 7 — Coaching close and action capture
- Agree 1-2 concrete actions with the dealer (e.g. "Anna to complete AOS training by [date]")
- Set a 2-week follow-up checkpoint in the NSC system
- Document the session in the visit notes with adoption % before and expected after
- Upload results to NSC Health Check module

--- AOS (AUTOMATED ORDER SUGGESTION) ---

AOS is the AI-powered basket pre-population feature within PL24.
- Analyses each IR's historical purchase pattern to suggest likely orders
- Reduces manual ordering effort for parts counter staff
- Improves order accuracy and reduces back-orders
- Adoption target: 85%+ of suggested baskets accepted or modified (not ignored)
- Common issue: staff distrust AOS suggestions if basket has wrong family codes → fix by updating the IR profile

--- IAM PROGRAM STRUCTURE (BMW IAM 2026+) ---

The BMW Integrated Aftermarket (IAM) 2026+ program is structured around 5 key work packages (clusters):

1. IR CUSTOMER ACQUISITION & RETENTION
   - Identify and onboard new Independent Repair workshops
   - Target: increase active IR count per dealer by 10% YoY
   - Tools: IR prospecting list in NSC, PL24 IR account creation, onboarding journey map

2. DIGITAL CHANNEL ACTIVATION (PL24 / AOS)
   - Drive order migration from analogue (phone/fax) to digital (PL24)
   - Target: 75% PL24 adoption, 85% AOS acceptance
   - KPI: order-channel split tracked monthly in NSC dashboard

3. PORTFOLIO EXPANSION
   - Increase breadth of BMW IAM family codes ordered by each IR
   - Target: 80%+ family code coverage per active IR account
   - Activity: range reviews, special campaign promotions, AOS basket enrichment

4. TRAINING & CAPABILITY
   - Dealer staff PL24 and AOS certification
   - IR technical training and product knowledge sessions
   - Field executive coaching visits (Health Checks, PL24 on-site sessions)

5. PERFORMANCE MANAGEMENT
   - Monthly KPI reporting: Sales vs Target, PL24 Adoption, AOS Adoption, DB Margin
   - Health Check scoring uploaded to NSC
   - Priority classification: HIGH (immediate attention), MED (monitoring), LOW (stable)
   - Escalation triggers: 2+ consecutive visits below KPI threshold

--- DEALER MATURITY MODEL ---

BMW IAM dealers are assessed on a 4-stage maturity scale:

Stage 1 — FOUNDATION
- PL24 accounts exist but adoption <40%
- Limited IR relationships (<10 active accounts)
- No designated digital champion
- Actions: credential activation, staff training, AOS setup

Stage 2 — DEVELOPING
- PL24 adoption 40–65%
- Growing IR base (10–25 active accounts)
- AOS basket partially configured
- Actions: adoption push, basket alignment, first champion identified

Stage 3 — PERFORMING
- PL24 adoption 65–80%, AOS acceptance 75%+
- Stable IR base with repeat orders
- Regular Health Checks completed
- Actions: portfolio expansion, margin improvement, IR upsell

Stage 4 — LEADING
- PL24 adoption 80%+, AOS acceptance 85%+
- High IR retention, active prospecting for new IRs
- Health Check scores consistently green
- Actions: best-practice sharing, advanced portfolio, loyalty programs

--- KEY KPIs AND THRESHOLDS ---

| KPI              | Red (Critical) | Amber (Monitor) | Green (Target) |
|------------------|---------------|-----------------|----------------|
| Sales vs Target  | < 75%         | 75–85%          | > 85%          |
| PL24 Adoption    | < 65%         | 65–75%          | > 75%          |
| AOS Adoption     | < 75%         | 75–85%          | > 85%          |
| DB Margin        | < 19%         | 19–22%          | > 22%          |

--- IR (INDEPENDENT REPAIR) CONCEPTS ---

IR = Independent Repair workshop — a non-franchised car repair/service business that purchases parts from BMW IAM dealers.

IRs choose suppliers based on:
1. Speed — fast order fulfilment and delivery
2. Price — competitive vs. generic/alternative brand parts
3. Convenience — easy digital ordering, 24/7 access, accurate basket
4. Reliability — correct parts first time, low back-order rate
5. Support — technical advice, warranty backing, returns process

BMW IAM value proposition to IRs:
- OEM-quality parts with BMW warranty backing
- PL24 digital ordering (24/7), faster than phone ordering
- AOS basket reduces ordering effort
- BMW technical hotline support
- Training and certification programs

Risk signals that indicate IR churn risk:
- Declining order frequency (fewer orders per month)
- Reducing basket size (fewer family codes per order)
- Slower response to dealer contact
- IR requesting price-match against non-BMW suppliers

--- BWIR TENDER / ACCENTURE ENGAGEMENT CONTEXT ---

The BMW Integrated Retail (BWIR) program is the overarching framework through which Accenture supports BMW's IAM field force across Europe. Key elements:
- Field executive support: visit planning, briefing preparation, visit capture, post-visit reporting
- Digital adoption acceleration: PL24 and AOS roll-out across dealer network
- Performance analytics: NSC dashboard, KPI tracking, territory benchmarking
- Training orchestration: dealer staff certification, IR onboarding
- AI-powered tools: Intelligent IAM Copilot (this application) — pre-visit briefings, on-site issue capture, AI-generated summaries and pitch content

Accenture role: Program management, field force enablement, digital tool deployment, data analytics, change management across C1 Europe territory.

=== END OF BMW IAM KNOWLEDGE BASE ===
"""
