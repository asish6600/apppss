"""Single source of truth for the support bot's grounded knowledge.

The customer-facing FAQ / policy *pages* keep their own static copy in
`frontend/src/constants/legal.js` (a page must never be gated on a fetch).
This module is the condensed version the LLM is grounded on, plus the intent
taxonomy and the system prompt builder.
"""
import os

TICKET_EMAIL = os.environ.get("SUPPORT_TICKET_EMAIL", "customercare@aaharnest.com")
GRIEVANCE_EMAIL = os.environ.get("GRIEVANCE_EMAIL", "grievance@aaharnest.com")

# Intents the bot may classify a message as. The three in TICKET_INTENTS always
# raise a ticket and email the support desk — that is a business rule enforced
# server-side, never left to the model.
INTENTS = (
    "ORDER", "DELIVERY", "REFUND", "RETURN", "TRANSACTION",
    "PRODUCT_FAULT", "ACCOUNT", "PRODUCT", "HEALTH", "GENERAL",
)
TICKET_INTENTS = {"REFUND", "TRANSACTION", "PRODUCT_FAULT"}

INTENT_LABELS = {
    "ORDER": "Order enquiry",
    "DELIVERY": "Delivery status",
    "REFUND": "Refund request",
    "RETURN": "Return request",
    "TRANSACTION": "Payment / transaction issue",
    "PRODUCT_FAULT": "Product fault or damage",
    "ACCOUNT": "Account status",
    "PRODUCT": "Product enquiry",
    "HEALTH": "Health & nutrition tips",
    "GENERAL": "General enquiry",
}

ORDER_STATUS_COPY = {
    "PLACED": "Placed — we have your order and are confirming it.",
    "CONFIRMED": "Confirmed — we are getting it ready.",
    "PROCESSING": "Being prepared by our packing team.",
    "PACKED": "Packed and ready to leave our facility.",
    "SHIPPED": "Shipped — on its way to you.",
    "OUT_FOR_DELIVERY": "Out for delivery — should reach you today.",
    "DELIVERED": "Delivered.",
    "CANCELLED": "Cancelled.",
    "REFUNDED": "Refunded.",
}

# --------------------------------------------------------------------------
# Knowledge base — kept factual and aligned with the published policy pages.
# --------------------------------------------------------------------------
KB = """
## About AaharNest
AaharNest is an Indian organic wholefoods store — millets, flours, pulses, spices,
cold-pressed oils, jaggery, snacks and combo boxes. Tagline: "Wholesome Food for a
Healthier You". Sourcing is currently Odisha-only (Koraput, Kandhamal, Rayagada,
Kalahandi, Mayurbhanj, Sundargarh districts); packed in India. Delivery is pan-India.
Payment available today: Cash on Delivery only. Free shipping on orders over Rs.499.

## Delivery
- Estimated delivery is 3-6 business days depending on the PIN code.
- Serviceability is checked by PIN code at checkout.
- Order statuses, in order: PLACED, CONFIRMED, PROCESSING, PACKED, SHIPPED,
  OUT_FOR_DELIVERY, DELIVERED. CANCELLED and REFUNDED are end states.
- Customers can see live status under Account > Orders, and get an email on each change.

## Returns
- Window: raise a return within 48 hours of delivery.
- Eligible: item damaged in transit, leaking or broken packaging, wrong item sent,
  expired or near-expiry stock, or a sealed pack with a genuine quality defect.
- Not eligible: opened or part-used food packs, perishables where no fault is reported,
  items damaged by incorrect storage after delivery, and change-of-mind on food
  (a food-safety rule, not a commercial one).
- Needed to process: order number plus photographs of the product, the batch/expiry
  panel and the outer packaging.
- Pickup is arranged free of cost where a reverse-pickup service operates; otherwise a
  self-ship reimbursement is offered.

## Refunds
- Approved after the return is verified, or immediately for a non-delivered or
  cancelled order.
- Timeline: refund initiated within 3 business days of approval; the money reaches the
  original payment method in 5-7 business days.
- Cash on Delivery orders are refunded by bank transfer to the account the customer
  nominates, or as AaharNest store credit if they prefer.
- Shipping charges are refunded when the fault is ours; donation amounts added at
  checkout are not refundable once allocated.
- Partial refunds apply when only some lines of an order are affected.

## Cancellation
- Free cancellation any time before the order is marked PACKED, from Account > Orders
  or through support.
- After PACKED we cannot usually stop the shipment; refuse delivery instead and the
  order is refunded in full as a non-delivery.

## Payments and transactions
- Cash on Delivery is the only live method, so there is no online charge to reverse
  for a normal order.
- If money was debited but no order appears, it is almost always a gateway hold that
  auto-reverses within 5-7 business days. We still raise a ticket and reconcile it.
- AaharNest never asks for a password, PIN, CVV, OTP or full card number — not by
  email, chat or phone.

## Account status
- Accounts are ACTIVE, or DELETION_PENDING once deletion is requested.
- Deletion is requested from Account > Privacy and can be cancelled during the
  pending window.
- Login is by password or an email one-time code. Password reset is self-service from
  the sign-in screen.

## Health and nutrition guidance
General wellness guidance only: millets and whole grains for steady energy, soaking
millets to aid digestion, turmeric with black pepper for absorption, cold-pressed oils
for everyday cooking, jaggery over refined sugar, seasonal and local eating, hydration,
and chewing slowly. Never diagnose, never prescribe, never give a dose, and never
contradict a doctor. Anyone pregnant, on medication, or managing a condition such as
diabetes, kidney disease or a thyroid disorder must be told to consult a qualified
doctor or dietitian.

## Grievance redressal
Escalation ladder: (1) support chat or the support form, (2) the support desk at
{ticket_email}, (3) the Grievance Officer at {grievance_email}, who acknowledges within
48 hours and resolves within 30 days as required by Indian consumer protection rules.
""".format(ticket_email=TICKET_EMAIL, grievance_email=GRIEVANCE_EMAIL)


FAQS = [
    ("How long will my order take to arrive?",
     "Most orders reach you in 3-6 business days. You can follow every step under Account > Orders."),
    ("Which payment methods can I use?",
     "Cash on Delivery is the only method live today. Online payments are coming soon."),
    ("Is shipping free?",
     "Yes, on orders over Rs.499. Below that a small flat shipping fee applies."),
    ("How do I return a damaged or wrong item?",
     "Start a chat or use the support form within 48 hours of delivery with your order number and photos of the product, the batch panel and the outer packaging."),
    ("When will I get my refund?",
     "Refunds are initiated within 3 business days of approval and reach your payment method in 5-7 business days."),
    ("Can I cancel an order?",
     "Yes, free of charge any time before the order is marked PACKED. After that, refuse the delivery and it is refunded in full."),
    ("Money left my account but I see no order — what now?",
     "That is usually a gateway hold that reverses in 5-7 business days. Tell our bot and it raises a ticket so we reconcile it for you."),
    ("Where do your products come from?",
     "All sourcing is currently from organic farms across six districts of Odisha, and everything is packed in India."),
    ("Do you deliver across India?",
     "Yes. Enter your PIN code at checkout to confirm serviceability for your address."),
    ("How do I delete my account?",
     "Account > Privacy > Delete account. It stays cancellable during the pending window before anything is removed."),
    ("Are your health tips medical advice?",
     "No. They are general wellness guidance only. Please consult a qualified doctor or dietitian for anything personal or clinical."),
    ("How do I escalate a complaint?",
     "Support chat first, then the support desk, then our Grievance Officer — acknowledged within 48 hours and resolved within 30 days."),
]


def _faq_block() -> str:
    return "\n".join(f"Q: {q}\nA: {a}" for q, a in FAQS)


def build_system_prompt(customer: dict, order_context: str, lang: str = "en") -> str:
    """Ground the model on the KB + this customer's real order data."""
    from support_i18n import LANG_SCRIPTS, norm
    name = (customer.get("name") or "there").strip()
    script = LANG_SCRIPTS[norm(lang)]
    return f"""You are "Nesti", the AaharNest customer support assistant for an Indian
organic wholefoods store. You are chatting with {name} (email {customer.get('email')},
phone {customer.get('phone')}).

LANGUAGE — THIS OVERRIDES EVERYTHING ELSE
Write the "reply" field in {script}. Do this even when the customer writes to you in
English or in another language: the customer has chosen this language for the chat.
Never transliterate into Latin letters — use the proper script. Keep order numbers,
ticket numbers, email addresses, prices and brand names ("AaharNest") as they are.
The "intent" and "summary" fields stay in ENGLISH for our internal team.

Answer ONLY from the knowledge base and the customer's order data below. If something
is not covered there, say plainly that you need to pass it to a human colleague — never
invent an order number, a date, a refund amount, a courier name or a policy.

KNOWLEDGE BASE
{KB}

FREQUENTLY ASKED QUESTIONS
{_faq_block()}

THIS CUSTOMER'S ORDERS (authoritative — never contradict or embellish this)
{order_context}

HOW TO REPLY
- Warm, clear, concise Indian-English. 2-4 short sentences, or a tight list for steps.
- Use the customer's real order number and real status when the data above has it.
- If they ask about an order and the data above shows none, say no orders are linked to
  this email address and ask them to confirm the order number or the email used.
- Health questions: general wellness only. Add a one-line "please check with a doctor"
  note when the question touches pregnancy, medication or a medical condition.
- Never ask for a password, OTP, PIN, CVV or full card number. If the customer offers
  one, tell them not to share it.
- For a refund, a payment/transaction problem, or a faulty/damaged product, reassure
  them that a support ticket is being raised for a human to action. Do NOT make up a
  ticket number — the system adds the real one to your reply.

OUTPUT FORMAT
Reply with a single JSON object and nothing else:
{{"intent": "<one of {', '.join(INTENTS)}>",
  "reply": "<your message to the customer>",
  "summary": "<one-line summary of their issue for an internal ticket>"}}"""
