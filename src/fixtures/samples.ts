import type { InputType } from "../types";

export interface MessageSample {
  id: string;
  label: string;
  kind: "scam" | "benign" | "ambiguous";
  inputType: InputType;
  text: string;
}

// "Benign" samples are examples, not ground truth: local rules can still flag
// legitimate content. They help demonstrate limitations honestly.
export const MESSAGE_SAMPLES: MessageSample[] = [
  { id: "bank-kyc", label: "Bank KYC request", kind: "scam", inputType: "message", text: "URGENT: Your account will be blocked today. Please share your OTP at https://paypa1.com/kyc" },
  { id: "delivery-fee", label: "Unexpected delivery fee", kind: "scam", inputType: "message", text: "This is your courier support. Pay a delivery fee now to release your parcel: bit.ly/parcel-check" },
  { id: "prize", label: "Surprise prize", kind: "scam", inputType: "message", text: "You have won a free gift. Claim your prize now at https://example.xyz/claim" },
  { id: "job", label: "Unsolicited earning offer", kind: "scam", inputType: "message", text: "Work from home and earn ₹8,000 per day. Like and earn; message us on Telegram." },
  { id: "secrecy", label: "Secret payment request", kind: "scam", inputType: "message", text: "Do not tell anyone. Transfer ₹20,000 now or legal action will follow." },
  { id: "short-link", label: "Shortened account link", kind: "ambiguous", inputType: "url", text: "https://bit.ly/account-check" },
  { id: "forward", label: "Unverified forwarded claim", kind: "ambiguous", inputType: "message", text: "Forward this to 10 people: a new rule takes effect tomorrow. Source not included." },
  { id: "newsletter", label: "Monthly newsletter", kind: "benign", inputType: "message", text: "This month's newsletter is here. Read the new issue and share feedback when you have time." },
  { id: "delivery-normal", label: "Delivery completed", kind: "benign", inputType: "message", text: "Your parcel was delivered at 3 PM. Thank you for choosing us." },
  { id: "dinner", label: "Dinner repayment chat", kind: "benign", inputType: "message", text: "Hey, can you pay me back for dinner whenever? No rush." },
  { id: "lunch", label: "Lunch plans", kind: "benign", inputType: "message", text: "Lunch at 1? I'll bring the notes." },
  { id: "meeting", label: "Meeting reminder", kind: "benign", inputType: "message", text: "Reminder: our planning meeting is Saturday at 10 AM in room 4." },
  { id: "weather", label: "Weather chat", kind: "benign", inputType: "message", text: "It may rain this evening. Bring an umbrella if you walk home." },
  { id: "office", label: "Work-from-home update", kind: "benign", inputType: "message", text: "I'm working from home this Friday, so let's catch up next week." },
];
