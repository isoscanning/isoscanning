import { sendGAEvent } from '@next/third-parties/google'

type EventName = 
  | 'login'
  | 'sign_up'
  | 'sign_out'
  | 'view_job_offer'
  | 'apply_to_job'
  | 'update_profile'
  | 'contact_professional'
  | 'view_professional'
  | 'review_professional'
  | 'view_equipment'
  | 'contact_seller'
  | 'negotiate_equipment_click'
  | 'submit_proposal'
  | 'search'
  | 'filter'
  | 'tab_change'
  | 'open_lightbox'
  | 'click_social'
  | 'click_cta'
  | 'click_nav'

interface AnalyticsEvent {
  action: EventName
  category?: string
  label?: string
  value?: number
  [key: string]: any
}

export const trackEvent = ({ action, category, label, value, ...params }: AnalyticsEvent) => {
  try {
    sendGAEvent('event', action, {
      category,
      label,
      value,
      debug_mode: true,
      ...params,
    })
    console.log(`[Analytics] Event sent: ${action}`, params)
  } catch (error) {
    console.error('[Analytics] Failed to send event:', error)
  }
}
