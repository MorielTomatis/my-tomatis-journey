import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "My Tomatis Journey"

interface PhaseCompletionProps {
  clientName?: string
  previousPhase?: number
  newPhase?: number
  completionDate?: string
  isInactive?: boolean
}

const PhaseCompletionEmail = ({
  clientName = 'לקוח/ה',
  previousPhase = 1,
  newPhase = 2,
  completionDate = '',
  isInactive = false,
}: PhaseCompletionProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>✅ {clientName} השלים שלב {previousPhase}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ השלמת שלב</Heading>
        <Text style={text}>
          לקוח/ה <strong>{clientName}</strong> השלים/ה את שלב {previousPhase}
          {isInactive
            ? ' וסיים/ה את התוכנית.'
            : ` ועבר/ה לשלב ${newPhase}.`}
        </Text>
        <Text style={text}>
          תאריך: {completionDate}
        </Text>
        <Hr style={hr} />
        <Button style={button} href="https://app.tomatis-harish.com">
          כניסה לדשבורד
        </Button>
        <Text style={footer}>
          {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PhaseCompletionEmail,
  subject: (data: Record<string, any>) =>
    `✅ ${data.clientName || 'לקוח/ה'} השלים שלב ${data.previousPhase || '?'}`,
  displayName: 'Phase completion notification',
  to: 'info@tomatis-harish.com',
  previewData: {
    clientName: 'דנה כהן',
    previousPhase: 2,
    newPhase: 3,
    completionDate: '14/04/2026',
    isInactive: false,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Assistant, Arial, sans-serif' }
const container = { padding: '30px 25px', direction: 'rtl' as const, textAlign: 'right' as const }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a3a6b', margin: '0 0 20px' }
const text = { fontSize: '16px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const button = {
  backgroundColor: '#1a3a6b',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'right' as const }
