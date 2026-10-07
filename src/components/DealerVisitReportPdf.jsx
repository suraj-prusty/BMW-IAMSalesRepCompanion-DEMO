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

  // ── Challenge / Opportunity columns ───────────────────────────────────────
  splitRow: { flexDirection: 'row', marginBottom: 12 },
  splitCol: { width: '50%' },
  splitColLeft: { paddingRight: 7 },
  splitColRight: { paddingLeft: 7 },

  challengeBar: {
    backgroundColor: '#fff0f0',
    paddingTop: 3, paddingBottom: 3, paddingLeft: 6, paddingRight: 6,
    marginBottom: 6,
    borderLeftWidth: 3, borderLeftColor: '#EF4444', borderLeftStyle: 'solid',
  },
  challengeBarText: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: '#c0392b', textTransform: 'uppercase', letterSpacing: 0.5 },
  opportunityBar: {
    backgroundColor: '#f0fff4',
    paddingTop: 3, paddingBottom: 3, paddingLeft: 6, paddingRight: 6,
    marginBottom: 6,
    borderLeftWidth: 3, borderLeftColor: '#22C55E', borderLeftStyle: 'solid',
  },
  opportunityBarText: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5 },

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
function SectionBar({ title, style, textStyle }) {
  return (
    <View style={[S.sectionBar, style]}>
      <Text style={[S.sectionBarText, textStyle]}>{title}</Text>
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
export function DealerVisitReportPdf({
  dealerName, dealerCode, dealerLocation, contactDisplay,
  visitDateISO, topics, visitNotes,
  competitorMode, competitorComment, competitorPhoto,
  challenge, opportunity,
  actions, overallStatus, userName,
}) {
  const today = new Date();
  const visitDateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const visitTimeStr = today.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const outcomeBg =
    overallStatus === 'Good' ? '#dcfce7' :
    overallStatus === 'Monitor' ? '#fef9c3' :
    overallStatus === 'Needs Support' ? '#fee2e2' : '#f5f5f5';
  const outcomeColor =
    overallStatus === 'Good' ? '#16a34a' :
    overallStatus === 'Monitor' ? '#d97706' :
    overallStatus === 'Needs Support' ? '#dc2626' : '#999';

  const filteredActions = (actions || []).filter((a) => a.action);

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
            ['Dealer Name',      dealerName],
            ['Visit Type',       'Sales Call'],
            ['Customer Code',    dealerCode],
            ['Visit Date',       visitDateStr],
            ['Dealer Category',  dealerLocation !== '—' ? dealerLocation : 'A - Highest'],
            ['Visit Time',       visitTimeStr],
            ['IAM Status',       'Registered & Active'],
            ['Contact Met',      contactDisplay],
            ['Servicing Dealer', dealerName],
            ['Representative',   userName],
          ]} />
        </View>

        {/* ── 2. Topics Discussed ── */}
        <View style={S.section}>
          <SectionBar title="2. Topics Discussed" />
          <Text style={{ color: '#333' }}>
            {topics && topics.length > 0 ? topics.join('  ·  ') : '—'}
          </Text>
        </View>

        {/* ── 3. Visit Notes ── */}
        <View style={S.section}>
          <SectionBar title="3. Visit Notes" />
          <Text style={{ color: '#333', lineHeight: 1.6 }}>{visitNotes || '—'}</Text>
        </View>

        {/* ── 4. Competitor Activity ── */}
        <View style={S.section}>
          <SectionBar title="4. Competitor Activity" />
          <Pill
            label={competitorMode}
            bg={competitorMode === 'Observed' ? '#fee2e2' : '#dcfce7'}
            color={competitorMode === 'Observed' ? '#dc2626' : '#16a34a'}
          />
          {competitorMode === 'Observed' && competitorComment ? (
            <Text style={{ color: '#555', marginTop: 4 }}>— {competitorComment}</Text>
          ) : null}
          {competitorMode === 'Observed' && competitorPhoto ? (
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 7, color: '#777', marginBottom: 3 }}>Evidence Photo</Text>
              <Image src={competitorPhoto} style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 4 }} />
            </View>
          ) : null}
        </View>

        {/* ── 5 + 6. Challenge & Opportunity ── */}
        <View style={S.splitRow}>
          <View style={[S.splitCol, S.splitColLeft]}>
            <View style={S.challengeBar}>
              <Text style={S.challengeBarText}>5. Biggest Challenge</Text>
            </View>
            <Text style={{ color: '#EF4444', fontFamily: 'Helvetica-Bold' }}>
              {challenge || '—'}
            </Text>
          </View>
          <View style={[S.splitCol, S.splitColRight]}>
            <View style={S.opportunityBar}>
              <Text style={S.opportunityBarText}>6. Biggest Opportunity</Text>
            </View>
            <Text style={{ color: '#22C55E', fontFamily: 'Helvetica-Bold' }}>
              {opportunity || '—'}
            </Text>
          </View>
        </View>

        {/* ── 7. Actions Agreed ── */}
        <View style={S.section}>
          <SectionBar title="7. Actions Agreed" />
          {filteredActions.length > 0 ? (
            <View>
              {/* Header row */}
              <View style={S.tableHeaderRow}>
                {['#', 'Action', 'Owner', 'Due Date', 'Priority'].map((h, i) => (
                  <Text key={h} style={[S.tableCell, S.tableCellBold, i === 1 ? { flex: 3 } : { flex: 1 }]}>{h}</Text>
                ))}
              </View>
              {filteredActions.map((a, i) => (
                <View key={i} style={S.tableRow}>
                  <Text style={[S.tableCell, { flex: 1 }]}>{i + 1}</Text>
                  <Text style={[S.tableCell, { flex: 3 }]}>{a.action}</Text>
                  <Text style={[S.tableCell, { flex: 1 }]}>{a.owner || '—'}</Text>
                  <Text style={[S.tableCell, { flex: 1 }]}>
                    {a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </Text>
                  <Text style={[S.tableCell, { flex: 1,
                    color: a.priority === 'High' ? '#dc2626' : a.priority === 'Medium' ? '#d97706' : a.priority === 'Low' ? '#16a34a' : '#555',
                  }]}>{a.priority || '—'}</Text>
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
          <Pill label={overallStatus || 'Not set'} bg={outcomeBg} color={outcomeColor} />
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
