/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>קישור כניסה ל-{siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>קישור כניסה 🔗</Heading>
        <Text style={text}>
          לחצ/י על הכפתור כדי להיכנס ל-{siteName}. הקישור יפוג בקרוב.
        </Text>
        <Button style={button} href={confirmationUrl}>
          כניסה
        </Button>
        <Text style={footer}>
          אם לא ביקשת קישור זה, ניתן להתעלם מהודעה זו.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Assistant, Arial, sans-serif' }
const container = { padding: '30px 25px', direction: 'rtl' as const, textAlign: 'right' as const }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1a3a6b',
  margin: '0 0 20px',
}
const text = {
  fontSize: '16px',
  color: '#333333',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: '#1a3a6b',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  borderRadius: '16px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'right' as const }
