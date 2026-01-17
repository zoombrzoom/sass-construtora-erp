import { Timestamp } from 'firebase/firestore'

export function toDate(date: Date | Timestamp): Date {
  return date instanceof Date ? date : date.toDate()
}
