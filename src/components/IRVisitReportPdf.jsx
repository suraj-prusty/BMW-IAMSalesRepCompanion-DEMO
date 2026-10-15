import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import bmwLogo from '../assets/bmw-logo.svg';

const BLUE = '#1c69d4';

const S = StyleSheet.create({
  page: {
    paddingTop: 30, paddingBottom: 30, paddingLeft: 30, paddingRight: 30,
    fontFamily: 'Helvetica', fontSize: 8.5, color: '#1a1a1a', lineHeight: 1.5,
  },

  // ── Letterhead ────────────────────────────────────────────────────────────
  letterhead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomWidth: 2, borderBottomColor: '#1a1a1a', borderBottomStyle: 'solid',
    marginBottom: 14, paddingBottom: 10,
  },
  letterheadTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  letterheadSub: { fontSize: 7, color: '#555', marginTop: 2, letterSpacing: 0.5 },
  logo: { width: 36, height: 36 },

  // ── Section ───────────────────────────────────────────────────────────────
  section: { marginBottom: 12 },
  sectionBar: {
    backgroundColor: '#f5f5f5',
    paddingTop: 3, paddingBottom: 3, paddingLeft: 6, paddingRight: 6,
    marginBottom: 7,
    borderLeftWidth: 3, borderLeftColor: BLUE, borderLeftStyle: 'solid',
  },
  sectionBarText: {
    fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: '#1a1a1a',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // ── Visit info grid ───────────────────────────────────────────────────────
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoCell: { width: '50%', flexDirection: 'row' },
  infoLabel: { color: '#777', width: 82, flexShrink: 0 },
  infoValue: { fontFamily: 'Helvetica-Bold', flex: 1 },

  // ── Topic chips ───────────────────────────────────────────────────────────
  topicsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  topicChip: {
    backgroundColor: '#eef2ff', borderRadius: 10,
    paddingTop: 2, paddingBottom: 2, paddingLeft: 7, paddingRight: 7,
    borderWidth: 1, borderColor: '#c7d2fe', borderStyle: 'solid',
    marginRight: 4, marginBottom: 4,
  },
  topicChipText: { fontSize: 7.5, color: '#3b46a0', fontFamily: 'Helvetica-Bold' },

  // ── Pill / badge ──────────────────────────────────────────────────────────
  pill: { borderRadius: 4, paddingTop: 2, paddingBottom: 2, paddingLeft: 8, paddingRight: 8, alignSelf: 'flex-start' },
  pillText: { fontFamily: 'Helvetica-Bold', fontSize: 8 },

  // ── Table ─────────────────────────────────────────────────────────────────
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1, borderTopColor: '#ccc', borderTopStyle: 'solid',
    borderBottomWidth: 1, borderBottomColor: '#ccc', borderBottomStyle: 'solid',
    borderLeftWidth: 1, borderLeftColor: '#ccc', borderLeftStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: '#ccc', borderBottomStyle: 'solid',
    borderLeftWidth: 1, borderLeftColor: '#ccc', borderLeftStyle: 'solid',
  },
  tableCell: {
    paddingTop: 3, paddingBottom: 3, paddingLeft: 5, paddingRight: 5,
    borderRightWidth: 1, borderRightColor: '#ccc', borderRightStyle: 'solid',
    fontSize: 7.5,
  },
  tableCellBold: { fontFamily: 'Helvetica-Bold' },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    borderTopWidth: 1, borderTopColor: '#ccc', borderTopStyle: 'solid',
    paddingTop: 8, marginTop: 6,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { color: '#555', fontSize: 7.5 },
  footerConfidential: { textAlign: 'center', color: '#aaa', fontSize: 6.5, marginTop: 6, fontStyle: 'italic' },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionBar({ title }) {
  return (
    <View style={S.sectionBar}>
      <Text style={S.sectionBarText}>{title}</Text>
    </View>
  );
}

function InfoGrid({ rows }) {
  const pairs = [];
  for (let i = 0; i < rows.length; i += 2) {
    pairs.push([rows[i], rows[i + 1] || null]);
  }
  return (
    <View>
      {pairs.map(([left, right], i) => (
        <View key={i} style={S.infoRow}>
          <View style={S.infoCell}>
            <Text style={S.infoLabel}>{left[0]}</Text>
            <Text style={S.infoValue}>{left[1] || '—'}</Text>
          </View>
          {right && (
            <View style={S.infoCell}>
              <Text style={S.infoLabel}>{right[0]}</Text>
              <Text style={S.infoValue}>{right[1] || '—'}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function Pill({ label, bg, color }) {
  return (
    <View style={[S.pill, { backgroundColor: bg }]}>
      <Text style={[S.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Main PDF component ────────────────────────────────────────────────────────
export function IRVisitReportPdf({
  irName, irCode, irCategory, iamStatus, servicingDealer,
  visitType, contactMet,
  topics, visitNotes, buyingBehaviour,
  competitorMode, competitor, categoryLost, competitorReason, competitorPhoto,
  saleAchieved, saleRows, totalOrderValue,
  actions, visitOutcome, newIRsIdentified,
  userName,
}) {
  const today = new Date();
  const visitDateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const visitTimeStr = today.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const outcomeBg =
    visitOutcome === 'Order Generated'       ? '#dcfce7' :
    visitOutcome === 'Opportunity Identified' ? '#fef9c3' :
    visitOutcome === 'No Progress'            ? '#fee2e2' : '#f5f5f5';
  const outcomeColor =
    visitOutcome === 'Order Generated'       ? '#16a34a' :
    visitOutcome === 'Opportunity Identified' ? '#d97706' :
    visitOutcome === 'No Progress'            ? '#dc2626' : '#999';

  const filteredActions  = (actions  || []).filter((a) => a.action);
  const filteredSaleRows = (saleRows || []).filter((r) => r.product);

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Letterhead ── */}
        <View style={S.letterhead}>
          <View>
            <Text style={S.letterheadTitle}>BMW &amp; MINI</Text>
            <Text style={S.letterheadSub}>IAM INDEPENDENT REPAIRER VISIT REPORT</Text>
          </View>
          <Image src={bmwLogo} style={S.logo} />
        </View>

        {/* ── 1. Visit Information ── */}
        <View style={S.section}>
          <SectionBar title="1. Visit Information" />
          <InfoGrid rows={[
            ['IR Name',          irName],
            ['Visit Type',       visitType || 'Sales Call'],
            ['Customer Code',    irCode],
            ['Visit Date',       visitDateStr],
            ['IR Category',      irCategory],
            ['Visit Time',       visitTimeStr],
            ['IAM Status',       iamStatus],
            ['Contact Met',      contactMet || '—'],
            ['Servicing Dealer', servicingDealer],
            ['Representative',   userName],
          ]} />
        </View>

        {/* ── 2. Sales Conversation Topics ── */}
        <View style={S.section}>
          <SectionBar title="2. Sales Conversation Topics" />
          {topics && topics.length > 0 ? (
            <View style={S.topicsRow}>
              {topics.map((t, i) => (
                <View key={i} style={S.topicChip}>
                  <Text style={S.topicChipText}>{t}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: '#999', fontStyle: 'italic' }}>No topics selected</Text>
          )}
        </View>

        {/* ── 3. Visit Notes ── */}
        <View style={S.section}>
          <SectionBar title="3. Visit Notes" />
          <Text style={{ color: '#333', lineHeight: 1.6 }}>{visitNotes || '—'}</Text>
        </View>

        {/* ── 4. Buying Behaviour ── */}
        <View style={S.section}>
          <SectionBar title="4. Buying Behaviour" />
          <Text style={{
            color: '#333',
            fontFamily: buyingBehaviour ? 'Helvetica-Bold' : 'Helvetica',
            fontStyle: buyingBehaviour ? 'normal' : 'italic',
          }}>
            {buyingBehaviour || 'Not recorded'}
          </Text>
        </View>

        {/* ── 5. Competitor / Lost Business Insight ── */}
        <View style={S.section}>
          <SectionBar title="5. Competitor / Lost Business Insight" />
          <Pill
            label={competitorMode}
            bg={competitorMode === 'Observed' ? '#fee2e2' : '#dcfce7'}
            color={competitorMode === 'Observed' ? '#dc2626' : '#16a34a'}
          />
          {competitorMode === 'Observed' && (
            <View style={{ marginTop: 8 }}>
              {/* Competitor table */}
              <View style={S.tableHeaderRow}>
                {['Competitor', 'Category Lost', 'Reason'].map((h) => (
                  <Text key={h} style={[S.tableCell, S.tableCellBold, { flex: 1 }]}>{h}</Text>
                ))}
              </View>
              <View style={S.tableRow}>
                <Text style={[S.tableCell, { flex: 1 }]}>{competitor || '—'}</Text>
                <Text style={[S.tableCell, { flex: 1 }]}>{categoryLost || '—'}</Text>
                <Text style={[S.tableCell, { flex: 1 }]}>{competitorReason || '—'}</Text>
              </View>
              {competitorPhoto ? (
                <View style={{ marginTop: 6 }}>
                  <Text style={{ fontSize: 7, color: '#777', marginBottom: 3 }}>Evidence Photo</Text>
                  <Image src={competitorPhoto} style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 4 }} />
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* ── 6. Direct Sale Generated ── */}
        <View style={S.section}>
          <SectionBar title="6. Direct Sale Generated" />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
            <Text style={{ color: '#777' }}>Sale Achieved:</Text>
            <Pill
              label={saleAchieved ? 'Yes' : 'No'}
              bg={saleAchieved ? '#dcfce7' : '#f5f5f5'}
              color={saleAchieved ? '#16a34a' : '#999'}
            />
          </View>
          {filteredSaleRows.length > 0 ? (
            <View>
              <View style={S.tableHeaderRow}>
                {[['Product / Part Description', 3], ['Qty', 1], ['Unit Price', 1], ['Total Value', 1], ['Invoice / Ref No.', 1]].map(([h, flex]) => (
                  <Text key={h} style={[S.tableCell, S.tableCellBold, { flex }]}>{h}</Text>
                ))}
              </View>
              {filteredSaleRows.map((r, i) => (
                <View key={i} style={S.tableRow}>
                  <Text style={[S.tableCell, { flex: 3 }]}>{r.product}</Text>
                  <Text style={[S.tableCell, { flex: 1, textAlign: 'right' }]}>{r.qty}</Text>
                  <Text style={[S.tableCell, { flex: 1, textAlign: 'right' }]}>€{parseFloat(r.unitPrice || 0).toFixed(2)}</Text>
                  <Text style={[S.tableCell, { flex: 1, textAlign: 'right' }]}>€{parseFloat(r.totalValue || 0).toFixed(2)}</Text>
                  <Text style={[S.tableCell, { flex: 1 }]}>{r.invoiceRef || '—'}</Text>
                </View>
              ))}
              <View style={{ borderTopWidth: 2, borderTopColor: BLUE, borderTopStyle: 'solid', paddingTop: 4, marginTop: 2, alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: BLUE }}>
                  TOTAL ORDER VALUE   €{(totalOrderValue || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={{ color: '#999', fontStyle: 'italic' }}>No products recorded</Text>
          )}
        </View>

        {/* ── 7. Actions & Next Visit Planning ── */}
        <View style={S.section}>
          <SectionBar title="7. Actions & Next Visit Planning" />
          {filteredActions.length > 0 ? (
            <View>
              <View style={S.tableHeaderRow}>
                {[['#', 0.5], ['Action Required', 3], ['Responsible', 1], ['Due Date', 1], ['Priority', 1], ['Status', 1]].map(([h, flex]) => (
                  <Text key={h} style={[S.tableCell, S.tableCellBold, { flex }]}>{h}</Text>
                ))}
              </View>
              {filteredActions.map((a, i) => (
                <View key={i} style={S.tableRow}>
                  <Text style={[S.tableCell, { flex: 0.5, color: '#777' }]}>{i + 1}</Text>
                  <Text style={[S.tableCell, { flex: 3 }]}>{a.action}</Text>
                  <Text style={[S.tableCell, { flex: 1 }]}>{a.responsible || '—'}</Text>
                  <Text style={[S.tableCell, { flex: 1 }]}>
                    {a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </Text>
                  <Text style={[S.tableCell, { flex: 1,
                    color: a.priority === 'High' ? '#dc2626' : a.priority === 'Medium' ? '#d97706' : a.priority === 'Low' ? '#16a34a' : '#555',
                    fontFamily: a.priority ? 'Helvetica-Bold' : 'Helvetica',
                  }]}>{a.priority || '—'}</Text>
                  <Text style={[S.tableCell, { flex: 1, color: '#555' }]}>{a.status || '—'}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: '#999', fontStyle: 'italic' }}>No actions agreed</Text>
          )}
        </View>

        {/* ── 8. Visit Outcome ── */}
        <View style={S.section}>
          <SectionBar title="8. Visit Outcome" />
          <Pill label={visitOutcome || 'Not set'} bg={outcomeBg} color={outcomeColor} />
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 7.5, color: '#777', marginBottom: 3 }}>New IRs Identified in Area</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5 }}>{newIRsIdentified || 'No'}</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={S.footer}>
          <View style={S.footerRow}>
            <Text style={S.footerText}>Prepared by: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{userName}</Text></Text>
            <Text style={S.footerText}>Date: {visitDateStr}</Text>
          </View>
          <Text style={S.footerConfidential}>
            CONFIDENTIAL – For authorised BMW &amp; MINI field representatives only.
          </Text>
        </View>

      </Page>
    </Document>
  );
}
