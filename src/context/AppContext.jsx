import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { LISTINGS, DOCUMENT_CHECKLIST, PROCESS_STAGES } from '../data/seed'

const STORAGE_KEY = 'sellsmart-mock-state-v1'

export function freshState() {
  return {
    role: null, // 'seller' | 'buyer', null until the visitor picks one on arrival
    roleChosen: false,
    account: null,
    selectedPackageId: null,
    draftListing: null,
    listings: LISTINGS,
    myListingId: 'l1', // demo seller's own listing
    enquiries: [],
    viewings: [],
    otp: null,
    documents: DOCUMENT_CHECKLIST.map((d) => ({ ...d, status: 'pending' })),
    selectedConveyancerId: null,
    processStageIndex: 0,
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw)
    const base = freshState()
    // Always use the current catalog from seed.js rather than whatever was
    // cached in localStorage — otherwise edits to seed data (e.g. images)
    // stay invisible to returning visitors forever.
    return { ...base, ...parsed, listings: base.listings }
  } catch {
    return freshState()
  }
}

function bumpStage(state, minIndex) {
  return Math.max(state.processStageIndex, minIndex)
}

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, role: action.role, roleChosen: true }

    case 'CREATE_ACCOUNT':
      return { ...state, account: action.account }

    case 'SELECT_PACKAGE':
      return { ...state, selectedPackageId: action.packageId }

    case 'SET_DRAFT_LISTING':
      return { ...state, draftListing: { ...state.draftListing, ...action.patch } }

    case 'PUBLISH_LISTING': {
      const id = 'l1' // overwrite the demo listing so the rest of the app has data to react to
      const published = {
        ...state.listings.find((l) => l.id === id),
        ...state.draftListing,
        id,
        images:
          state.draftListing?.images?.length > 0
            ? state.draftListing.images
            : state.listings.find((l) => l.id === id)?.images ?? [],
        seller: state.account
          ? { name: state.account.name, email: state.account.email, phone: state.account.phone }
          : state.listings.find((l) => l.id === id)?.seller,
      }
      return {
        ...state,
        listings: state.listings.map((l) => (l.id === id ? published : l)),
        myListingId: id,
        processStageIndex: bumpStage(state, 0),
      }
    }

    case 'ADD_ENQUIRY':
      return { ...state, enquiries: [action.enquiry, ...state.enquiries] }

    case 'ADD_VIEWING':
      return { ...state, viewings: [action.viewing, ...state.viewings] }

    case 'UPDATE_VIEWING_STATUS':
      return {
        ...state,
        viewings: state.viewings.map((v) =>
          v.id === action.id ? { ...v, status: action.status, proposedDate: action.proposedDate, proposedTime: action.proposedTime } : v,
        ),
      }

    case 'SUBMIT_OTP':
      return {
        ...state,
        otp: {
          ...action.otp,
          status: 'submitted',
          signedByBuyer: false,
          signedBySeller: false,
          history: [{ event: 'Offer submitted', by: 'buyer', amount: action.otp.offerPrice }],
        },
        processStageIndex: bumpStage(state, 1),
      }

    case 'SELLER_RESPOND_OFFER': {
      if (!state.otp) return state
      if (action.decision === 'accept') {
        return {
          ...state,
          otp: {
            ...state.otp,
            status: 'accepted',
            history: [...state.otp.history, { event: 'Offer accepted', by: 'seller' }],
          },
          processStageIndex: bumpStage(state, 2),
        }
      }
      if (action.decision === 'reject') {
        return {
          ...state,
          otp: {
            ...state.otp,
            status: 'rejected',
            history: [...state.otp.history, { event: 'Offer rejected', by: 'seller' }],
          },
        }
      }
      if (action.decision === 'counter') {
        return {
          ...state,
          otp: {
            ...state.otp,
            status: 'countered',
            counterPrice: action.counterPrice,
            history: [
              ...state.otp.history,
              { event: 'Counter-offer sent', by: 'seller', amount: action.counterPrice },
            ],
          },
        }
      }
      return state
    }

    case 'BUYER_ACCEPT_COUNTER':
      if (!state.otp) return state
      return {
        ...state,
        otp: {
          ...state.otp,
          status: 'accepted',
          offerPrice: state.otp.counterPrice,
          history: [...state.otp.history, { event: 'Counter-offer accepted', by: 'buyer' }],
        },
        processStageIndex: bumpStage(state, 2),
      }

    case 'SIGN_OTP': {
      if (!state.otp) return state
      const updated = {
        ...state.otp,
        signedByBuyer: action.party === 'buyer' ? true : state.otp.signedByBuyer,
        signedBySeller: action.party === 'seller' ? true : state.otp.signedBySeller,
        history: [...state.otp.history, { event: `Signed by ${action.party}`, by: action.party }],
      }
      return { ...state, otp: updated }
    }

    case 'UPLOAD_DOCUMENT': {
      const documents = state.documents.map((d) =>
        d.id === action.id ? { ...d, status: 'uploaded' } : d,
      )
      const allUploaded = documents.every((d) => d.status === 'uploaded')
      return {
        ...state,
        documents,
        processStageIndex: allUploaded ? bumpStage(state, 4) : state.processStageIndex,
      }
    }

    case 'SELECT_CONVEYANCER':
      return { ...state, selectedConveyancerId: action.providerId }

    case 'SEND_TO_CONVEYANCER':
      return { ...state, processStageIndex: bumpStage(state, 5) }

    case 'ADVANCE_STAGE':
      return {
        ...state,
        processStageIndex: Math.min(state.processStageIndex + 1, PROCESS_STAGES.length - 1),
      }

    case 'RESET_DEMO':
      localStorage.removeItem(STORAGE_KEY)
      return freshState()

    default:
      return state
  }
}

const AppStateContext = createContext(null)
const AppDispatchContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}

export function useAppDispatch() {
  const ctx = useContext(AppDispatchContext)
  if (!ctx) throw new Error('useAppDispatch must be used within AppProvider')
  return ctx
}

export function useMyListing() {
  const state = useAppState()
  return useMemo(
    () => state.listings.find((l) => l.id === state.myListingId),
    [state.listings, state.myListingId],
  )
}
