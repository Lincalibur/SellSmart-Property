import { describe, expect, it } from 'vitest'
import { freshState, reducer } from './AppContext'

describe('reducer', () => {
  it('SET_ROLE marks a role chosen', () => {
    const state = reducer(freshState(), { type: 'SET_ROLE', role: 'buyer' })
    expect(state.role).toBe('buyer')
    expect(state.roleChosen).toBe(true)
  })

  it('PUBLISH_LISTING merges the draft onto listing l1 and advances the tracker', () => {
    const base = {
      ...freshState(),
      draftListing: { title: 'My New Home', price: 999000 },
      account: { name: 'Jo Seller', email: 'jo@example.com', phone: '0821234567' },
    }
    const state = reducer(base, { type: 'PUBLISH_LISTING' })
    const published = state.listings.find((l) => l.id === 'l1')

    expect(published.title).toBe('My New Home')
    expect(published.price).toBe(999000)
    expect(published.seller).toEqual({ name: 'Jo Seller', email: 'jo@example.com', phone: '0821234567' })
    expect(state.myListingId).toBe('l1')
    expect(state.processStageIndex).toBe(0)
  })

  it('PUBLISH_LISTING keeps the original images when the draft has none', () => {
    const base = { ...freshState(), draftListing: { title: 'No images yet' } }
    const original = base.listings.find((l) => l.id === 'l1')
    const state = reducer(base, { type: 'PUBLISH_LISTING' })
    const published = state.listings.find((l) => l.id === 'l1')
    expect(published.images).toEqual(original.images)
  })

  it('SUBMIT_OTP records a fresh offer and bumps the stage to at least 1', () => {
    const state = reducer(freshState(), {
      type: 'SUBMIT_OTP',
      otp: { id: 'otp-1', offerPrice: 1000000 },
    })
    expect(state.otp.status).toBe('submitted')
    expect(state.otp.signedByBuyer).toBe(false)
    expect(state.otp.signedBySeller).toBe(false)
    expect(state.otp.history).toEqual([{ event: 'Offer submitted', by: 'buyer', amount: 1000000 }])
    expect(state.processStageIndex).toBe(1)
  })

  it('SUBMIT_OTP never lowers a stage that is already further along', () => {
    const base = { ...freshState(), processStageIndex: 3 }
    const state = reducer(base, { type: 'SUBMIT_OTP', otp: { id: 'otp-1', offerPrice: 1 } })
    expect(state.processStageIndex).toBe(3)
  })

  describe('SELLER_RESPOND_OFFER', () => {
    const withOtp = {
      ...freshState(),
      otp: { id: 'otp-1', status: 'submitted', history: [] },
    }

    it('is a no-op when there is no active offer', () => {
      const state = reducer(freshState(), { type: 'SELLER_RESPOND_OFFER', decision: 'accept' })
      expect(state.otp).toBeNull()
    })

    it('accept moves status to accepted and bumps stage to at least 2', () => {
      const state = reducer(withOtp, { type: 'SELLER_RESPOND_OFFER', decision: 'accept' })
      expect(state.otp.status).toBe('accepted')
      expect(state.otp.history).toEqual([{ event: 'Offer accepted', by: 'seller' }])
      expect(state.processStageIndex).toBe(2)
    })

    it('reject moves status to rejected without touching the stage', () => {
      const state = reducer(withOtp, { type: 'SELLER_RESPOND_OFFER', decision: 'reject' })
      expect(state.otp.status).toBe('rejected')
      expect(state.processStageIndex).toBe(withOtp.processStageIndex)
    })

    it('counter records the counter price', () => {
      const state = reducer(withOtp, { type: 'SELLER_RESPOND_OFFER', decision: 'counter', counterPrice: 1200000 })
      expect(state.otp.status).toBe('countered')
      expect(state.otp.counterPrice).toBe(1200000)
      expect(state.otp.history).toEqual([
        { event: 'Counter-offer sent', by: 'seller', amount: 1200000 },
      ])
    })
  })

  it('BUYER_ACCEPT_COUNTER promotes the counter price to the offer price', () => {
    const base = {
      ...freshState(),
      otp: { id: 'otp-1', status: 'countered', counterPrice: 1200000, history: [] },
    }
    const state = reducer(base, { type: 'BUYER_ACCEPT_COUNTER' })
    expect(state.otp.status).toBe('accepted')
    expect(state.otp.offerPrice).toBe(1200000)
    expect(state.processStageIndex).toBe(2)
  })

  it('SIGN_OTP flags only the signing party', () => {
    const base = {
      ...freshState(),
      otp: { id: 'otp-1', signedByBuyer: false, signedBySeller: false, history: [] },
    }
    const buyerSigned = reducer(base, { type: 'SIGN_OTP', party: 'buyer' })
    expect(buyerSigned.otp.signedByBuyer).toBe(true)
    expect(buyerSigned.otp.signedBySeller).toBe(false)
  })

  describe('UPLOAD_DOCUMENT', () => {
    it('marks a single document uploaded without advancing the stage when others remain pending', () => {
      const base = freshState()
      const [first] = base.documents
      const state = reducer(base, { type: 'UPLOAD_DOCUMENT', id: first.id })
      expect(state.documents.find((d) => d.id === first.id).status).toBe('uploaded')
      expect(state.processStageIndex).toBe(base.processStageIndex)
    })

    it('advances the stage to at least 4 once every document is uploaded', () => {
      const base = {
        ...freshState(),
        documents: [{ id: 'd1', status: 'pending' }],
      }
      const state = reducer(base, { type: 'UPLOAD_DOCUMENT', id: 'd1' })
      expect(state.documents[0].status).toBe('uploaded')
      expect(state.processStageIndex).toBe(4)
    })
  })

  it('ADVANCE_STAGE never exceeds the last stage', () => {
    const base = { ...freshState(), processStageIndex: 999 }
    const state = reducer(base, { type: 'ADVANCE_STAGE' })
    expect(state.processStageIndex).toBeLessThan(999)
  })

  it('an unknown action returns the same state unchanged', () => {
    const base = freshState()
    const state = reducer(base, { type: 'NOT_A_REAL_ACTION' })
    expect(state).toBe(base)
  })
})
