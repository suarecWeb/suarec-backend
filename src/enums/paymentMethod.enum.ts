export enum PaymentMethod {
  Credit_card = "CREDIT_CARD",
  Transfer = "TRANSFER",
  Wompi = "WOMPI",
  Cash = "CASH",
  Bank_transfer = "BANK_TRANSFER",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FINISHED = "FINISHED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export enum WompiPaymentType {
  CARD = "CARD",
  NEQUI = "NEQUI",
  BANCOLOMBIA_TRANSFER = "BANCOLOMBIA_TRANSFER",
  DAVIPLATA = "DAVIPLATA",
}
