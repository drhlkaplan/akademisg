/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface LeadNotificationProps {
  source?: 'contact' | 'corporate'
  name?: string
  email?: string
  phone?: string | null
  companyName?: string | null
  employeeCount?: string | null
  subjectLabel?: string | null
  message?: string | null
  submittedAt?: string
  adminUrl?: string
}

const SITE_NAME = 'İSG Akademi'

const typeLabel = (source?: string) =>
  source === 'corporate' ? 'Kurumsal teklif talebi' : 'İletişim formu mesajı'

const LeadNotificationEmail = ({
  source,
  name,
  email,
  phone,
  companyName,
  employeeCount,
  subjectLabel,
  message,
  submittedAt,
  adminUrl = 'https://gratisakademi.com/admin/leads',
}: LeadNotificationProps) => {
  const rows: Array<[string, React.ReactNode]> = []
  if (companyName) rows.push(['Firma', companyName])
  rows.push(['Ad Soyad', name || '—'])
  rows.push([
    'E-posta',
    email ? (
      <Link href={`mailto:${email}`} style={link}>
        {email}
      </Link>
    ) : (
      '—'
    ),
  ])
  if (phone) {
    rows.push([
      'Telefon',
      <Link href={`tel:${phone.replace(/[^+\d]/g, '')}`} style={link}>
        {phone}
      </Link>,
    ])
  }
  if (employeeCount) rows.push(['Çalışan sayısı', employeeCount])
  if (subjectLabel) rows.push(['Konu', subjectLabel])
  if (submittedAt) rows.push(['Gönderim zamanı', submittedAt])

  return (
    <Html lang="tr" dir="ltr">
      <Head />
      <Preview>
        {typeLabel(source)}: {companyName || name || 'yeni talep'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brand}>{SITE_NAME}</Text>
          </Section>
          <Heading style={h1}>Yeni {typeLabel(source).toLocaleLowerCase('tr-TR')}</Heading>
          <Text style={lead}>
            Sitenizdeki {source === 'corporate' ? 'kurumsal teklif formundan' : 'iletişim formundan'} yeni bir talep
            geldi. Talep, yönetim panelindeki Gelen Talepler sayfasına da kaydedildi.
          </Text>

          <Section style={card}>
            {rows.map(([label, value]) => (
              <Text key={label} style={row}>
                <span style={rowLabel}>{label}</span>
                <br />
                <span style={rowValue}>{value}</span>
              </Text>
            ))}
            {message ? (
              <>
                <Hr style={hr} />
                <Text style={rowLabel}>Mesaj</Text>
                <Text style={messageText}>{message}</Text>
              </>
            ) : null}
          </Section>

          <Button style={button} href={adminUrl}>
            Gelen Talepleri Aç
          </Button>

          {email ? (
            <Text style={note}>Bu e-postayı yanıtladığınızda yanıtınız doğrudan {email} adresine gider.</Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: LeadNotificationEmail,
  subject: (data: Record<string, any>) =>
    data.source === 'corporate'
      ? `Yeni kurumsal teklif talebi: ${data.companyName || data.name || 'Firma'}`
      : `Yeni iletişim mesajı: ${data.name || 'Ziyaretçi'}`,
  displayName: 'Form talebi bildirimi (yönetici)',
  previewData: {
    source: 'corporate',
    name: 'Ayşe Yılmaz',
    email: 'ayse@ornekfirma.com',
    phone: '0532 000 00 00',
    companyName: 'Örnek Lojistik A.Ş.',
    employeeCount: '120',
    message: 'Merhaba, 120 çalışanımız için temel İSG eğitimi teklifi almak istiyoruz.',
    submittedAt: '4 Kasım 2026 12:30',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", margin: '0', padding: '0' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const brandBar = { borderBottom: '3px solid #F97415', marginBottom: '20px' }
const brand = {
  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
  fontSize: '18px',
  fontWeight: 'bold' as const,
  color: '#0F2557',
  margin: '0 0 10px',
}
const h1 = {
  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0F2557',
  margin: '0 0 12px',
}
const lead = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px' }
const card = {
  backgroundColor: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '0 0 24px',
}
const row = { margin: '0 0 12px', lineHeight: '1.4' }
const rowLabel = {
  fontSize: '12px',
  fontWeight: 'bold' as const,
  color: '#64748B',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  margin: '0',
}
const rowValue = { fontSize: '15px', color: '#0F172A' }
const messageText = {
  fontSize: '15px',
  color: '#0F172A',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap' as const,
  margin: '6px 0 0',
}
const hr = { borderColor: '#E2E8F0', margin: '8px 0 12px' }
const link = { color: '#0F2557', textDecoration: 'underline' }
const button = {
  backgroundColor: '#F97415',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '12px 22px',
  textDecoration: 'none',
}
const note = { fontSize: '12px', color: '#94A3B8', lineHeight: '1.5', margin: '20px 0 0' }
